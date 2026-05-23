const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 📊 ANALYTICS - Location Heatmap
router.get('/analytics/location-heatmap', async (req, res) => {
    try {
        const [data] = await db.query(`
            SELECT 
                location,
                COUNT(*) as citation_count,
                SUM(fine_amount) as total_fines_issued,
                AVG(fine_amount) as avg_fine_amount
            FROM traffic_citations
            GROUP BY location
            ORDER BY citation_count DESC
            LIMIT 10
        `);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📊 ANALYTICS - Offense Distribution
router.get('/analytics/offense-breakdown', async (req, res) => {
    try {
        const [data] = await db.query(`
            SELECT 
                oc.offense_name,
                COUNT(tc.citation_id) as violation_count,
                SUM(tc.fine_amount) as revenue_generated
            FROM traffic_citations tc
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            GROUP BY oc.offense_name
            ORDER BY violation_count DESC
        `);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📊 ANALYTICS - Revenue Dashboard
router.get('/analytics/revenue', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_citations,
                COUNT(CASE WHEN status = 'Unpaid' THEN 1 END) as unpaid_citations,
                SUM(CASE WHEN status = 'Paid' THEN fine_amount ELSE 0 END) as revenue_collected,
                SUM(CASE WHEN status = 'Unpaid' THEN fine_amount ELSE 0 END) as revenue_pending
            FROM traffic_citations
        `);
        res.json(stats[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;