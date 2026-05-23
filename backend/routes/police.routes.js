const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendFineEmail } = require('../controllers/emailController');

const { approveAppeal, rejectAppeal } = require('../controllers/policecontroller');
// Add these two lines with your existing routes
router.post('/appeal/approve/:appealId', approveAppeal);
router.post('/appeal/reject/:appealId', rejectAppeal);
// 🔍 VEHICLE LOOKUP - Get owner info by license plate
router.get('/lookup/:licensePlate', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT 
                v.vehicle_id,
                v.license_plate,
                v.vehicle_make,
                v.vehicle_model,
                v.vehicle_color,
                v.impound_status,
                o.owner_id,
                o.full_name,
                o.email,
                o.phone_number,
                o.address
            FROM vehicles v
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            WHERE v.license_plate = ?
        `, [req.params.licensePlate]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📋 GET ALL OFFENSE TYPES
router.get('/offenses', async (req, res) => {
    try {
        const [offenses] = await db.query('SELECT * FROM offense_catalog ORDER BY offense_name');
        res.json(offenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✍️ ISSUE NEW CITATION
router.post('/issue-fine', async (req, res) => {
    const {
        license_plate,
        officer_name,
        offense_id,
        violation_date,
        violation_time,
        location,
        incident_notes
    } = req.body;

    try {
        // Get vehicle and owner info
        const [vehicleData] = await db.query(`
            SELECT v.vehicle_id, v.owner_id, o.email, o.full_name
            FROM vehicles v
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            WHERE v.license_plate = ?
        `, [license_plate]);

        if (vehicleData.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found in system' });
        }

        const vehicle = vehicleData[0];

        // Get offense details
        const [offenseData] = await db.query(
            'SELECT offense_name, fine_amount FROM offense_catalog WHERE offense_id = ?',
            [offense_id]
        );

        const offense = offenseData[0];

        // Generate unique ticket number
        const ticket_number = `TKT${Date.now()}`;

        // Insert citation
        const [citation] = await db.query(`
            INSERT INTO traffic_citations 
            (ticket_number, vehicle_id, officer_name, offense_id, violation_date, 
             violation_time, location, incident_notes, fine_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ticket_number,
            vehicle.vehicle_id,
            officer_name,
            offense_id,
            violation_date,
            violation_time,
            location,
            incident_notes,
            offense.fine_amount
        ]);

        // Send email notification
        const emailSent = await sendFineEmail({
            citation_id: citation.insertId,
            ticket_number,
            recipient_email: vehicle.email,
            recipient_name: vehicle.full_name,
            license_plate,
            offense_name: offense.offense_name,
            fine_amount: offense.fine_amount,
            location,
            violation_date,
            violation_time
        });

        res.json({
            success: true,
            citation_id: citation.insertId,
            ticket_number,
            email_sent: emailSent
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📬 GET APPEAL QUEUE
router.get('/appeals', async (req, res) => {
    try {
        const [appeals] = await db.query(`
            SELECT 
                a.appeal_id,
                a.appeal_reason,
                a.submitted_at,
                a.review_status,
                tc.ticket_number,
                tc.offense_id,
                tc.location,
                tc.violation_date,
                v.license_plate,
                o.full_name,
                o.email,
                oc.offense_name,
                tc.fine_amount
            FROM appeals a
            JOIN traffic_citations tc ON a.citation_id = tc.citation_id
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE a.review_status = 'Pending'
            ORDER BY a.submitted_at DESC
        `);
        res.json(appeals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ APPROVE APPEAL
router.post('/appeal/approve/:appealId', async (req, res) => {
    const { officer_response } = req.body;
    
    try {
        await db.query('START TRANSACTION');

        // Get citation_id from appeal
        const [appealData] = await db.query(
            'SELECT citation_id FROM appeals WHERE appeal_id = ?',
            [req.params.appealId]
        );

        // Update appeal status
        await db.query(`
            UPDATE appeals 
            SET review_status = 'Approved', 
                officer_response = ?,
                reviewed_at = NOW()
            WHERE appeal_id = ?
        `, [officer_response, req.params.appealId]);

        // Update citation status to Dismissed
        await db.query(
            'UPDATE traffic_citations SET status = "Dismissed" WHERE citation_id = ?',
            [appealData[0].citation_id]
        );

        await db.query('COMMIT');
        res.json({ success: true, message: 'Appeal approved and fine dismissed' });

    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

// ❌ REJECT APPEAL
router.post('/appeal/reject/:appealId', async (req, res) => {
    const { officer_response } = req.body;
    
    try {
        await db.query(`
            UPDATE appeals 
            SET review_status = 'Rejected',
                officer_response = ?,
                reviewed_at = NOW()
            WHERE appeal_id = ?
        `, [officer_response, req.params.appealId]);

        res.json({ success: true, message: 'Appeal rejected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🚨 GET IMPOUND LIST
router.get('/impound-list', async (req, res) => {
    try {
        const [vehicles] = await db.query(`
            SELECT 
                v.license_plate,
                v.vehicle_make,
                v.vehicle_model,
                v.vehicle_color,
                o.full_name,
                o.phone_number,
                COUNT(tc.citation_id) as unpaid_fines,
                SUM(tc.fine_amount) as total_owed
            FROM vehicles v
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            LEFT JOIN traffic_citations tc ON v.vehicle_id = tc.vehicle_id 
                AND tc.status IN ('Unpaid', 'Flagged for Impound')
            WHERE v.impound_status = 'Impounded'
            GROUP BY v.vehicle_id
        `);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;