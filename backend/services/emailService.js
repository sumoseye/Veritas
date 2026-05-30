const nodemailer = require('nodemailer');
const db = require('../config/db');
require('dotenv').config();

console.log('\n📧 Email Service Configuration:');
console.log('   Host:', process.env.EMAIL_HOST);
console.log('   Port:', process.env.EMAIL_PORT);
console.log('   User:', process.env.EMAIL_USER);
console.log('   Pass:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not Set');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    debug: true,
    logger: true
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('\n❌ Mailtrap Connection Failed:');
        console.log('   Error:', error.message);
        console.log('   Check your .env file EMAIL_USER and EMAIL_PASSWORD\n');
    } else {
        console.log('✅ Mailtrap Connection Successful!');
        console.log('📬 Emails will appear at: https://mailtrap.io/inboxes\n');
    }
});

async function sendCitationEmail(citationData) {
    const {
        citation_id,
        ticket_number,
        recipient_email,
        recipient_name,
        license_plate,
        offense_name,
        fine_amount,
        location,
        violation_date,
        violation_time,
        officer_name,
        incident_notes
    } = citationData;

    console.log('\nPREPARING EMAIL:');
    console.log('   Citation ID:', citation_id);
    console.log('   Ticket:', ticket_number);
    console.log('   To:', recipient_email);

    const subject = `Traffic Citation - Ticket #${ticket_number}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .detail-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #495057; }
        .value { color: #212529; }
        .fine-amount { font-size: 32px; font-weight: bold; color: #dc3545; text-align: center; padding: 20px; background: #fff; border-radius: 8px; margin: 20px 0; }
        .warning { background: #f8d7da; border: 2px solid #dc3545; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .footer { background: #2c3e50; color: white; padding: 25px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 TRAFFIC CITATION NOTICE</h1>
            <p>Official Violation Notice</p>
        </div>
        <div class="content">
            <p style="font-size: 18px;">Dear <strong>${recipient_name}</strong>,</p>
            <p>This is an official notification that a traffic citation has been issued for your registered vehicle.</p>
            <div class="detail-box">
                <h2 style="margin-top: 0; color: #dc3545;">Citation Information</h2>
                <div class="detail-row">
                    <span class="label">🎫 Ticket Number:</span>
                    <span class="value"><strong>${ticket_number}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="label">🚗 License Plate:</span>
                    <span class="value">${license_plate}</span>
                </div>
                <div class="detail-row">
                    <span class="label">⚠️ Violation:</span>
                    <span class="value"><strong>${offense_name}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="label">📍 Location:</span>
                    <span class="value">${location}</span>
                </div>
                <div class="detail-row">
                    <span class="label">📅 Date:</span>
                    <span class="value">${violation_date}</span>
                </div>
                <div class="detail-row">
                    <span class="label">🕐 Time:</span>
                    <span class="value">${violation_time}</span>
                </div>
                <div class="detail-row">
                    <span class="label">👮 Officer:</span>
                    <span class="value">${officer_name}</span>
                </div>
            </div>
            <div class="fine-amount">
                💰 Fine Amount: Rs.${fine_amount}
            </div>
            ${incident_notes ? `
            <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="margin-top: 0;">📝 Officer Notes:</h4>
                <p style="margin: 0;">${incident_notes}</p>
            </div>
            ` : ''}
            <div class="warning">
                <h3 style="margin: 0 0 10px 0;">⚠️ IMPORTANT WARNING</h3>
                <p style="margin: 0;">Accumulating <strong>3 or more unpaid citations</strong> will result in your vehicle being <strong>FLAGGED FOR IMPOUNDMENT</strong>.</p>
            </div>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <strong>What You Can Do:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Visit the citizen portal to view this citation</li>
                    <li>Submit an appeal if you believe this is unjust</li>
                    <li>Reply to this email with questions</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p><strong>🚦 Traffic Enforcement Department</strong></p>
            <p>Ticket: ${ticket_number} | ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
TRAFFIC CITATION NOTICE

Dear ${recipient_name},

A traffic citation has been issued for your vehicle.

Ticket Number: ${ticket_number}
License Plate: ${license_plate}
Violation: ${offense_name}
Fine Amount: Rs.${fine_amount}
Location: ${location}
Date & Time: ${violation_date} at ${violation_time}
Officer: ${officer_name}

${incident_notes ? `Notes: ${incident_notes}\n` : ''}

WARNING: 3+ unpaid citations = Vehicle Impoundment

Traffic Enforcement Department
    `;

    try {
        console.log('   ⏳ Sending email...');

        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: recipient_email,
            subject: subject,
            text: textContent,
            html: htmlContent
        });

        console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
        console.log('   Message ID:', info.messageId);
        console.log('   📬 View in Mailtrap: https://mailtrap.io/inboxes\n');

        await db.query(`
            INSERT INTO email_log (citation_id, email_type, recipient_email, subject, delivery_status, mailtrap_message_id)
            VALUES (?, 'Citation', ?, ?, 'Sent', ?)
        `, [citation_id, recipient_email, subject, info.messageId]);

        await db.query(
            'UPDATE traffic_citations SET email_sent = TRUE WHERE citation_id = ?',
            [citation_id]
        );

        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('\n❌ EMAIL SEND FAILED!');
        console.error('   Error:', error.message);

        await db.query(`
            INSERT INTO email_log (citation_id, email_type, recipient_email, subject, delivery_status, error_message)
            VALUES (?, 'Citation', ?, ?, 'Failed', ?)
        `, [citation_id, recipient_email, subject, error.message]);

        return { success: false, error: error.message };
    }
}

async function sendAppealResponseEmail(appealData) {
    const {
        appeal_id,
        recipient_email,
        recipient_name,
        ticket_number,
        offense_name,
        fine_amount,
        appeal_status,
        officer_response
    } = appealData;

    const isApproved = appeal_status === 'Approved';
    const subject = isApproved
        ? `✅ Appeal Approved - Ticket #${ticket_number}`
        : `❌ Appeal Rejected - Ticket #${ticket_number}`;

    console.log('\n📧 SENDING APPEAL RESPONSE:');
    console.log('   To:', recipient_email);
    console.log('   Decision:', appeal_status);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: ${isApproved ? '#28a745' : '#dc3545'}; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .decision { background: ${isApproved ? '#d4edda' : '#f8d7da'}; border: 2px solid ${isApproved ? '#28a745' : '#dc3545'}; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .response { background: #e9ecef; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 20px 0; }
        .footer { background: #2c3e50; color: white; padding: 25px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${isApproved ? '✅ APPEAL APPROVED' : '❌ APPEAL REJECTED'}</h1>
        </div>
        <div class="content">
            <p>Dear <strong>${recipient_name}</strong>,</p>
            <p>Your appeal for citation <strong>${ticket_number}</strong> has been reviewed.</p>
            <div class="decision">
                <h2>${isApproved ? '🎉 FINE DISMISSED' : '⚠️ FINE UPHELD'}</h2>
                <p><strong>Violation:</strong> ${offense_name}</p>
                <p><strong>Amount:</strong> Rs.${fine_amount}</p>
                <p><strong>Status:</strong> ${isApproved ? 'No payment required' : 'Payment still required'}</p>
            </div>
            <div class="response">
                <h4>👮 Officer Response:</h4>
                <p>"${officer_response}"</p>
            </div>
        </div>
        <div class="footer">
            <p>Traffic Enforcement Department</p>
            <p>Ticket: ${ticket_number}</p>
        </div>
    </div>
</body>
</html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: recipient_email,
            subject: subject,
            html: htmlContent
        });

        console.log('✅ Appeal response email sent!');
        console.log('   📬 View in Mailtrap: https://mailtrap.io/inboxes\n');

        await db.query(`
            INSERT INTO email_log (appeal_id, email_type, recipient_email, subject, delivery_status, mailtrap_message_id)
            VALUES (?, 'Appeal Response', ?, ?, 'Sent', ?)
        `, [appeal_id, recipient_email, subject, info.messageId]);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Appeal email failed:', error.message);

        await db.query(`
            INSERT INTO email_log (appeal_id, email_type, recipient_email, subject, delivery_status, error_message)
            VALUES (?, 'Appeal Response', ?, ?, 'Failed', ?)
        `, [appeal_id, recipient_email, subject, error.message]);

        return { success: false, error: error.message };
    }
}

module.exports = {
    sendCitationEmail,
    sendAppealResponseEmail
};