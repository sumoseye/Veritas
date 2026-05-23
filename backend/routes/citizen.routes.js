const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 🔍 LOOKUP FINES BY LICENSE PLATE
router.get('/my-fines/:licensePlate', async (req, res) => {
    try {
        const [citations] = await db.query(`
            SELECT 
                tc.citation_id,
                tc.ticket_number,
                tc.violation_date,
                tc.violation_time,
                tc.location,
                tc.fine_amount,
                tc.status,
                tc.incident_notes,
                oc.offense_name,
                oc.description
            FROM traffic_citations tc
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE v.license_plate = ?
            ORDER BY tc.violation_date DESC
        `, [req.params.licensePlate]);

        res.json(citations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📝 SUBMIT APPEAL
router.post('/appeal', async (req, res) => {
    const { citation_id, appeal_reason } = req.body;

    try {
        // Check if citation exists and is unpaid
        const [citation] = await db.query(
            'SELECT status FROM traffic_citations WHERE citation_id = ?',
            [citation_id]
        );

        if (citation.length === 0) {
            return res.status(404).json({ error: 'Citation not found' });
        }

        if (citation[0].status !== 'Unpaid') {
            return res.status(400).json({ error: 'Can only appeal unpaid citations' });
        }

        // Insert appeal
        await db.query(
            'INSERT INTO appeals (citation_id, appeal_reason) VALUES (?, ?)',
            [citation_id, appeal_reason]
        );

        // Update citation status
        await db.query(
            'UPDATE traffic_citations SET status = "Under Appeal" WHERE citation_id = ?',
            [citation_id]
        );

        res.json({ success: true, message: 'Appeal submitted successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 💳 MOCK PAYMENT
router.post('/pay', async (req, res) => {
    const { citation_id, payment_method, transaction_id } = req.body;

    try {
        // Get fine amount
        const [citation] = await db.query(
            'SELECT fine_amount, status FROM traffic_citations WHERE citation_id = ?',
            [citation_id]
        );

        if (citation.length === 0) {
            return res.status(404).json({ error: 'Citation not found' });
        }

        if (citation[0].status === 'Paid') {
            return res.status(400).json({ error: 'Citation already paid' });
        }

        // Record payment
        await db.query(`
            INSERT INTO payments (citation_id, payment_amount, payment_method, transaction_id)
            VALUES (?, ?, ?, ?)
        `, [citation_id, citation[0].fine_amount, payment_method, transaction_id]);

        // Update citation status
        await db.query(
            'UPDATE traffic_citations SET status = "Paid" WHERE citation_id = ?',
            [citation_id]
        );

        res.json({ 
            success: true, 
            message: 'Payment processed successfully',
            amount_paid: citation[0].fine_amount
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;