const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const { sendCitationEmail, sendAppealResponseEmail } = require('./services/emailService');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'running' });
});

// Vehicle lookup
app.get('/api/police/lookup/:licensePlate', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT v.*, o.*
            FROM vehicles v
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            WHERE v.license_plate = ?
        `, [req.params.licensePlate.toUpperCase()]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get offenses
app.get('/api/police/offenses', async (req, res) => {
    try {
        const [offenses] = await db.query('SELECT * FROM offense_catalog');
        res.json(offenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Issue citation
app.post('/api/police/issue-fine', async (req, res) => {
    const { license_plate, officer_name, offense_id, violation_date, violation_time, location, incident_notes } = req.body;

    try {
        const [vehicle] = await db.query(`
            SELECT v.vehicle_id, o.email, o.full_name
            FROM vehicles v
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            WHERE v.license_plate = ?
        `, [license_plate.toUpperCase()]);

        const [offense] = await db.query('SELECT * FROM offense_catalog WHERE offense_id = ?', [offense_id]);
        
        const ticket_number = `TKT${Date.now()}`;

        const [citation] = await db.query(`
            INSERT INTO traffic_citations 
            (ticket_number, vehicle_id, officer_name, offense_id, violation_date, violation_time, location, incident_notes, fine_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [ticket_number, vehicle[0].vehicle_id, officer_name, offense_id, violation_date, violation_time, location, incident_notes, offense[0].fine_amount]);

        const emailResult = await sendCitationEmail({
            citation_id: citation.insertId,
            ticket_number,
            recipient_email: vehicle[0].email,
            recipient_name: vehicle[0].full_name,
            offense_name: offense[0].offense_name,
            fine_amount: offense[0].fine_amount,
            location
        });

        res.json({ success: true, ticket_number, email_sent: emailResult.success });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get citizen fines
app.get('/api/citizen/my-fines/:licensePlate', async (req, res) => {
    try {
        const [citations] = await db.query(`
            SELECT tc.*, oc.offense_name
            FROM traffic_citations tc
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE v.license_plate = ?
        `, [req.params.licensePlate.toUpperCase()]);
        res.json(citations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit appeal
app.post('/api/citizen/appeal', async (req, res) => {
    const { citation_id, appeal_reason } = req.body;
    try {
        await db.query('INSERT INTO appeals (citation_id, appeal_reason) VALUES (?, ?)', [citation_id, appeal_reason]);
        await db.query('UPDATE traffic_citations SET status = "Under Appeal" WHERE citation_id = ?', [citation_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get appeals
app.get('/api/police/appeals', async (req, res) => {
    try {
        const [appeals] = await db.query(`
            SELECT a.*, tc.ticket_number, o.full_name, o.email, oc.offense_name, tc.fine_amount
            FROM appeals a
            JOIN traffic_citations tc ON a.citation_id = tc.citation_id
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE a.review_status = 'Pending'
        `);
        res.json(appeals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve appeal
app.post('/api/police/appeal/approve/:appealId', async (req, res) => {
    const { officer_response } = req.body;
    try {
        const [appeal] = await db.query(`
            SELECT tc.citation_id, o.email, o.full_name, tc.ticket_number, oc.offense_name, tc.fine_amount
            FROM appeals a
            JOIN traffic_citations tc ON a.citation_id = tc.citation_id
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN vehicle_owners o ON v.owner_id = o.owner_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE a.appeal_id = ?
        `, [req.params.appealId]);

        await db.query('UPDATE appeals SET review_status = "Approved", officer_response = ? WHERE appeal_id = ?', [officer_response, req.params.appealId]);
        await db.query('UPDATE traffic_citations SET status = "Dismissed" WHERE citation_id = ?', [appeal[0].citation_id]);

        await sendAppealResponseEmail({
            recipient_email: appeal[0].email,
            recipient_name: appeal[0].full_name,
            ticket_number: appeal[0].ticket_number,
            appeal_status: 'Approved',
            officer_response
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`\n🚔 Server running on http://localhost:${PORT}\n`);
});