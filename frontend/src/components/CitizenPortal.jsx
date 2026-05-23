import { useState } from 'react';
import axios from 'axios';
import '../styles/CitizenPortal.css';

const API_URL = 'http://localhost:5001/api';

function CitizenPortal() {
    const [licensePlate, setLicensePlate] = useState('');
    const [citations, setCitations] = useState([]);
    const [appealForm, setAppealForm] = useState({ citation_id: null, reason: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const searchFines = async () => {
        if (!licensePlate.trim()) {
            setMessage('Please enter your license plate');
            return;
        }

        setLoading(true);
        setMessage('');
        try {
            const res = await axios.get(`${API_URL}/citizen/my-fines/${licensePlate}`);
            setCitations(res.data);
            if (res.data.length === 0) {
                setMessage('No citations found for this vehicle');
            }
        } catch (error) {
            setMessage('Error loading citations');
            setCitations([]);
        } finally {
            setLoading(false);
        }
    };

    const submitAppeal = async () => {
        if (!appealForm.reason.trim()) {
            setMessage('Please provide a reason for your appeal');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/citizen/appeal`, {
                citation_id: appealForm.citation_id,
                appeal_reason: appealForm.reason
            });
            setMessage('Appeal submitted successfully! An officer will review and respond via email.');
            setAppealForm({ citation_id: null, reason: '' });
            searchFines();
        } catch (error) {
            setMessage('Error: ' + (error.response?.data?.error || 'Failed to submit appeal'));
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Unpaid': '#dc3545',
            'Paid': '#28a745',
            'Under Appeal': '#ffc107',
            'Dismissed': '#6c757d'
        };
        return colors[status] || '#000';
    };

    return (
        <div className="citizen-portal">
            <div className="portal-header">
                <h1>Citizen Portal</h1>
                <p>View and Appeal Your Traffic Citations</p>
            </div>

            {message && (
                <div className={`message ${message.includes('successfully') || message.includes('found') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="card">
                <h2>Lookup My Citations</h2>
                <p style={{ marginBottom: '15px', color: '#666' }}>
                    Enter your license plate to view all citations
                </p>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Enter Your License Plate (e.g., 7ABC123)"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && searchFines()}
                        className="input-field"
                    />
                    <button 
                        onClick={searchFines} 
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Search My Fines'}
                    </button>
                </div>
            </div>

            {citations.length > 0 && (
                <div className="citations-grid">
                    {citations.map(citation => (
                        <div key={citation.citation_id} className="citation-card">
                            <div className="citation-header">
                                <div>
                                    <h3>{citation.offense_name}</h3>
                                    <p className="ticket-number">#{citation.ticket_number}</p>
                                </div>
                                <div className="fine-amount">Rs. {citation.fine_amount}</div>
                            </div>

                            <div className="citation-body">
                                <div className="detail">
                                    <span className="icon">D</span>
                                    <div>
                                        <strong>Date & Time</strong>
                                        <p>{citation.violation_date} at {citation.violation_time}</p>
                                    </div>
                                </div>
                                <div className="detail">
                                    <span className="icon">L</span>
                                    <div>
                                        <strong>Location</strong>
                                        <p>{citation.location}</p>
                                    </div>
                                </div>
                                <div className="detail">
                                    <span className="icon">O</span>
                                    <div>
                                        <strong>Officer</strong>
                                        <p>{citation.officer_name}</p>
                                    </div>
                                </div>
                                {citation.incident_notes && (
                                    <div className="detail full-width">
                                        <span className="icon">N</span>
                                        <div>
                                            <strong>Officer Notes</strong>
                                            <p>{citation.incident_notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="citation-footer">
                                <div 
                                    className="status-badge" 
                                    style={{ backgroundColor: getStatusColor(citation.status) }}
                                >
                                    {citation.status}
                                </div>

                                {citation.status === 'Unpaid' && (
                                    <button 
                                        onClick={() => setAppealForm({ citation_id: citation.citation_id, reason: '' })}
                                        className="btn btn-warning"
                                    >
                                        File Appeal
                                    </button>
                                )}

                                {citation.status === 'Under Appeal' && (
                                    <span className="appeal-status">Under Review</span>
                                )}

                                {citation.status === 'Dismissed' && (
                                    <span className="dismissed-status">No Payment Required</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {appealForm.citation_id && (
                <div className="modal-overlay" onClick={() => setAppealForm({ citation_id: null, reason: '' })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Submit Appeal</h2>
                        <p className="modal-description">
                            Explain why you believe this citation should be dismissed.
                        </p>
                        <textarea
                            placeholder="Provide details about your appeal..."
                            value={appealForm.reason}
                            onChange={(e) => setAppealForm({...appealForm, reason: e.target.value})}
                            rows="8"
                            className="input-field"
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button 
                                onClick={submitAppeal}
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Submit Appeal'}
                            </button>
                            <button 
                                onClick={() => setAppealForm({ citation_id: null, reason: '' })}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CitizenPortal;