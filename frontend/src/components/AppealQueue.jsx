import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AppealQueue.css';

const API_URL = 'http://localhost:5001/api';

function AppealQueue() {
    const [appeals, setAppeals] = useState([]);
    const [reviewForm, setReviewForm] = useState({ appeal_id: null, response: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAppeals();
    }, []);

    const loadAppeals = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/police/appeals`);
            setAppeals(res.data);
        } catch (error) {
            setMessage('Error loading appeals');
        } finally {
            setLoading(false);
        }
    };

    const approveAppeal = async (appealId) => {
        if (!reviewForm.response.trim()) {
            setMessage('Please provide a response before approving');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/police/appeal/approve/${appealId}`, {
                officer_response: reviewForm.response
            });
            setMessage('Appeal approved - Fine dismissed and email sent to citizen');
            setReviewForm({ appeal_id: null, response: '' });
            loadAppeals();
        } catch (error) {
            setMessage('Error approving appeal');
        } finally {
            setLoading(false);
        }
    };

    const rejectAppeal = async (appealId) => {
        if (!reviewForm.response.trim()) {
            setMessage('Please provide a response before rejecting');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/police/appeal/reject/${appealId}`, {
                officer_response: reviewForm.response
            });
            setMessage('Appeal rejected - Fine upheld and email sent to citizen');
            setReviewForm({ appeal_id: null, response: '' });
            loadAppeals();
        } catch (error) {
            setMessage('Error rejecting appeal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="appeal-queue">
            <div className="queue-header">
                <h1>Appeal Review Queue</h1>
                <p>Review and respond to citizen appeals</p>
            </div>

            {message && (
                <div className={`message ${message.includes('approved') || message.includes('successfully') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="stats-card">
                <div className="stat">
                    <div className="stat-value">{appeals.length}</div>
                    <div className="stat-label">Pending Appeals</div>
                </div>
            </div>

            {loading && appeals.length === 0 ? (
                <div className="loading">Loading appeals...</div>
            ) : appeals.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">OK</div>
                    <h3>No Pending Appeals</h3>
                    <p>All appeals have been reviewed</p>
                </div>
            ) : (
                <div className="appeals-list">
                    {appeals.map(appeal => (
                        <div key={appeal.appeal_id} className="appeal-card">
                            <div className="appeal-header">
                                <div>
                                    <h3>Ticket #{appeal.ticket_number}</h3>
                                    <p className="submitted-date">
                                        Submitted: {new Date(appeal.submitted_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="fine-badge">Rs. {appeal.fine_amount}</div>
                            </div>

                            <div className="appeal-details">
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="label">Driver:</span>
                                        <span className="value">{appeal.full_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Email:</span>
                                        <span className="value">{appeal.email}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Plate:</span>
                                        <span className="value">{appeal.license_plate}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Offense:</span>
                                        <span className="value">{appeal.offense_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Location:</span>
                                        <span className="value">{appeal.location}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Date:</span>
                                        <span className="value">{appeal.violation_date}</span>
                                    </div>
                                </div>

                                <div className="citizen-appeal">
                                    <h4>Citizen's Appeal Reason:</h4>
                                    <div className="appeal-text">{appeal.appeal_reason}</div>
                                </div>
                            </div>

                            {reviewForm.appeal_id === appeal.appeal_id ? (
                                <div className="review-form">
                                    <h4>Your Response to Citizen:</h4>
                                    <textarea
                                        placeholder="Provide a detailed response explaining your decision..."
                                        value={reviewForm.response}
                                        onChange={(e) => setReviewForm({...reviewForm, response: e.target.value})}
                                        rows="4"
                                        className="input-field"
                                        autoFocus
                                    />
                                    <div className="review-actions">
                                        <button 
                                            onClick={() => approveAppeal(appeal.appeal_id)}
                                            className="btn btn-success"
                                            disabled={loading}
                                        >
                                            Approve and Dismiss Fine
                                        </button>
                                        <button 
                                            onClick={() => rejectAppeal(appeal.appeal_id)}
                                            className="btn btn-danger"
                                            disabled={loading}
                                        >
                                            Reject Appeal
                                        </button>
                                        <button 
                                            onClick={() => setReviewForm({ appeal_id: null, response: '' })}
                                            className="btn btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="appeal-actions">
                                    <button 
                                        onClick={() => setReviewForm({ appeal_id: appeal.appeal_id, response: '' })}
                                        className="btn btn-primary"
                                    >
                                        Review This Appeal
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AppealQueue;