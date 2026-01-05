import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { broadcastNotification } from '../slices/adminSlice';
import './AdminBroadcast.css';

const AdminBroadcast = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [alertType, setAlertType] = useState('info');
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(broadcastNotification({ message, alertType }));

        if(result.type === "admin/broadcastNotification/fulfilled"){
            setSuccess(`Notification sent to ${result.payload.count} users`);
            setMessage('');
            setTimeout(() => setSuccess(null), 5000);
        }
    };

    return (
        <div className="admin-broadcast">
            <div className="admin-header">
                <button onClick={() => navigate('/admin')}>← Back to Dashboard</button>
                <h1>Broadcast Notification</h1>
            </div>

            <div className="broadcast-form-container">
                <form onSubmit={handleSubmit} className="broadcast-form">
                    <div className="form-group">
                        <label>Alert Type</label>
                        <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="barking">Barking</option>
                            <option value="motion">Motion</option>
                            <option value="unusual_activity">Unusual Activity</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Message</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter notification message..."
                            rows="6"
                            required
                        />
                    </div>

                    {success && <div className="success-message">{success}</div>}

                    <button type="submit" className="btn-broadcast">
                        📢 Send Broadcast to All Active Users
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminBroadcast;