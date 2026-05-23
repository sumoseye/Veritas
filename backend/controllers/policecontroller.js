const db = require('../config/db');
const { sendAppealResponseEmail } = require('../services/emailService');
const approveAppeal = async (req, res) => {
    const { appealId } = req.params;
    const { officer_response } = req.body;

    try {
        // Get appeal + citation + owner details for email
        const [rows] = await db.query(`
            SELECT 
                a.appeal_id,
                a.citation_id,
                tc.ticket_number,
                tc.fine_amount,
                oc.offense_name,
                vo.email,
                vo.full_name
            FROM appeals a
            JOIN traffic_citations tc ON a.citation_id = tc.citation_id
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN vehicle_owners vo ON v.owner_id = vo.owner_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE a.appeal_id = ?
        `, [appealId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Appeal not found' });
        }

        const appeal = rows[0];

        // Update appeal status
        await db.query(
            `UPDATE appeals SET review_status = 'Approved', officer_response = ? WHERE appeal_id = ?`,
            [officer_response, appealId]
        );

        // Update citation status to Dismissed
        await db.query(
            `UPDATE traffic_citations SET status = 'Dismissed' WHERE citation_id = ?`,
            [appeal.citation_id]
        );

        // Send email
        await sendAppealResponseEmail({
            appeal_id: appeal.appeal_id,
            recipient_email: appeal.email,
            recipient_name: appeal.full_name,
            ticket_number: appeal.ticket_number,
            offense_name: appeal.offense_name,
            fine_amount: appeal.fine_amount,
            appeal_status: 'Approved',
            officer_response
        });

        res.json({ message: 'Appeal approved, fine dismissed, email sent' });

    } catch (error) {
        console.error('Approve appeal error:', error);
        res.status(500).json({ message: error.message });
    }
};

const rejectAppeal = async (req, res) => {
    const { appealId } = req.params;
    const { officer_response } = req.body;

    try {
        const [rows] = await db.query(`
            SELECT 
                a.appeal_id,
                a.citation_id,
                tc.ticket_number,
                tc.fine_amount,
                oc.offense_name,
                vo.email,
                vo.full_name
            FROM appeals a
            JOIN traffic_citations tc ON a.citation_id = tc.citation_id
            JOIN vehicles v ON tc.vehicle_id = v.vehicle_id
            JOIN vehicle_owners vo ON v.owner_id = vo.owner_id
            JOIN offense_catalog oc ON tc.offense_id = oc.offense_id
            WHERE a.appeal_id = ?
        `, [appealId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Appeal not found' });
        }

        const appeal = rows[0];

        // Update appeal status
        await db.query(
            `UPDATE appeals SET review_status = 'Rejected', officer_response = ? WHERE appeal_id = ?`,
            [officer_response, appealId]
        );

        // Citation stays Unpaid — just update back from Under Appeal
        await db.query(
            `UPDATE traffic_citations SET status = 'Unpaid' WHERE citation_id = ?`,
            [appeal.citation_id]
        );

        // Send email
        await sendAppealResponseEmail({
            appeal_id: appeal.appeal_id,
            recipient_email: appeal.email,
            recipient_name: appeal.full_name,
            ticket_number: appeal.ticket_number,
            offense_name: appeal.offense_name,
            fine_amount: appeal.fine_amount,
            appeal_status: 'Rejected',
            officer_response
        });

        res.json({ message: 'Appeal rejected, fine upheld, email sent' });

    } catch (error) {
        console.error('Reject appeal error:', error);
        res.status(500).json({ message: error.message });
    }
};