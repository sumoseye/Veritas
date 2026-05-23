import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/PoliceDashboard.css';

const API_URL = 'http://localhost:5001/api';

function PoliceDashboard() {
    const [licensePlate, setLicensePlate] = useState('');
    const [vehicleData, setVehicleData] = useState(null);
    const [offenses, setOffenses] = useState([]);
    const [formData, setFormData] = useState({
        officer_name: '',
        offense_id: '',
        violation_date: new Date().toISOString().split('T')[0],
        violation_time: new Date().toTimeString().slice(0, 5),
        location: '',
        incident_notes: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOffenses();
    }, []);

    const loadOffenses = async () => {
        try {
            const res = await axios.get(`${API_URL}/police/offenses`);
            setOffenses(res.data);
        } catch (error) {
            console.error('Error loading offenses:', error);
        }
    };

    const searchVehicle = async () => {
        if (!licensePlate.trim()) {
            setMessage('Please enter a license plate');
            return;
        }

        setLoading(true);
        setMessage('');
        try {
            const res = await axios.get(`${API_URL}/police/lookup/${licensePlate}`);
            setVehicleData(res.data);
            setMessage('Vehicle found in system');
        } catch (error) {
            setMessage('Vehicle not found in system');
            setVehicleData(null);
        } finally {
            setLoading(false);
        }
    };

    const issueFine = async (e) => {
        e.preventDefault();
        
        if (!formData.officer_name || !formData.offense_id || !formData.location) {
            setMessage('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/police/issue-fine`, {
                license_plate: licensePlate,
                ...formData
            });

            if (res.data.email_sent) {
                setMessage(`Citation ${res.data.ticket_number} issued successfully! Email sent to ${vehicleData.email}`);
            } else {
                setMessage(`Citation ${res.data.ticket_number} issued. Email send pending.`);
            }

            setFormData({
                officer_name: '',
                offense_id: '',
                violation_date: new Date().toISOString().split('T')[0],
                violation_time: new Date().toTimeString().slice(0, 5),
                location: '',
                incident_notes: ''
            });
            setVehicleData(null);
            setLicensePlate('');

        } catch (error) {
            setMessage('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="police-dashboard">
            <div className="dashboard-header">
                <h1>Police Dashboard</h1>
                <p>Issue Traffic Citations with Email Notifications</p>
            </div>

            {message && (
                <div className={`message ${message.includes('found') || message.includes('successfully') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="card">
                <h2>Vehicle Lookup</h2>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Enter License Plate (e.g., 7ABC123)"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && searchVehicle()}
                        className="input-field"
                    />
                    <button 
                        onClick={searchVehicle} 
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Searching...' : 'Search Vehicle'}
                    </button>
                </div>

                {vehicleData && (
                    <div className="vehicle-info">
                        <h3>Vehicle Owner Information</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="label">Owner:</span>
                                <span className="value">{vehicleData.full_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Email:</span>
                                <span className="value">{vehicleData.email}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Phone:</span>
                                <span className="value">{vehicleData.phone_number}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Vehicle:</span>
                                <span className="value">
                                    {vehicleData.vehicle_color} {vehicleData.vehicle_make} {vehicleData.vehicle_model}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="label">Status:</span>
                                <span className={`value badge ${vehicleData.impound_status === 'Impounded' ? 'danger' : 'success'}`}>
                                    {vehicleData.impound_status}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {vehicleData && (
                <div className="card">
                    <h2>Issue Traffic Citation</h2>
                    <form onSubmit={issueFine} className="citation-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Officer Name *</label>
                                <input
                                    type="text"
                                    value={formData.officer_name}
                                    onChange={(e) => setFormData({...formData, officer_name: e.target.value})}
                                    required
                                    className="input-field"
                                    placeholder="Officer Name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Offense Type *</label>
                                <select
                                    value={formData.offense_id}
                                    onChange={(e) => setFormData({...formData, offense_id: e.target.value})}
                                    required
                                    className="input-field"
                                >
                                    <option value="">-- Select Offense --</option>
                                    {offenses.map(offense => (
                                        <option key={offense.offense_id} value={offense.offense_id}>
                                            {offense.offense_name} (Rs. {offense.fine_amount})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Violation Date *</label>
                                <input
                                    type="date"
                                    value={formData.violation_date}
                                    onChange={(e) => setFormData({...formData, violation_date: e.target.value})}
                                    required
                                    className="input-field"
                                />
                            </div>

                            <div className="form-group">
                                <label>Violation Time *</label>
                                <input
                                    type="time"
                                    value={formData.violation_time}
                                    onChange={(e) => setFormData({...formData, violation_time: e.target.value})}
                                    required
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Location *</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                required
                                placeholder="e.g., Main Street & 5th Avenue"
                                className="input-field"
                            />
                        </div>

                        <div className="form-group">
                            <label>Incident Notes (Optional)</label>
                            <textarea
                                value={formData.incident_notes}
                                onChange={(e) => setFormData({...formData, incident_notes: e.target.value})}
                                rows="4"
                                className="input-field"
                                placeholder="Additional details about the violation..."
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-danger btn-large"
                            disabled={loading}
                        >
                            {loading ? 'Issuing Citation...' : 'Issue Citation & Send Email'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default PoliceDashboard;