import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Admin = () => {
    const [bookings, setBookings] = useState([]);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/bookings/${id}/status`, { status });
            alert(`Action: ${status} performed.`);
            fetchBookings();
        } catch (err) {
            alert("Action failed");
        }
    };

    const formatDate = (dateStr) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        }).format(new Date(dateStr));
    };

    const pendingRequests = bookings.filter(b => b.status === 'PENDING' || b.status === 'CANCEL_REQUESTED');

    return (
        <>
            <header>
                <h2>Admin Management</h2>
                <p style={{ color: 'var(--text-muted)' }}>Approve bookings and manage resource exceptions</p>
            </header>

            <div className="card">
                <h3>Pending Approval Requests</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Resource</th>
                            <th>Requester</th>
                            <th>Time Slot</th>
                            <th>Purpose</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRequests.map(b => (
                            <tr key={b.id}>
                                <td>
                                    <span className={`status-badge ${b.status === 'PENDING' ? 'status-pending' : 'status-cancel'}`}>
                                        {b.status === 'PENDING' ? 'New Request' : 'Cancellation'}
                                    </span>
                                </td>
                                <td>{b.resource_name}</td>
                                <td>{b.requester}</td>
                                <td>{formatDate(b.start_time)} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td>{b.purpose}</td>
                                <td>
                                    {b.status === 'PENDING' ? (
                                        <>
                                            <button className="cta-btn" style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', marginRight: '5px' }} onClick={() => handleStatusUpdate(b.id, 'APPROVED')}>Approve</button>
                                            <button className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => handleStatusUpdate(b.id, 'REJECTED')}>Reject</button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="cta-btn" style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', marginRight: '5px' }} onClick={() => handleStatusUpdate(b.id, 'CANCEL_APPROVED')}>Approve Cancel</button>
                                            <button className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => handleStatusUpdate(b.id, 'CANCEL_REJECTED')}>Keep Booking</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {pendingRequests.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pending requests</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="stats-grid" style={{ marginTop: '30px' }}>
                <div className="card">
                    <h4>Admin Actions</h4>
                    <div style={{ marginTop: '15px' }}>
                        <button className="filter-btn" style={{ width: '100%', marginBottom: '10px' }}>Manage Timetable</button>
                        <button className="filter-btn" style={{ width: '100%' }}>Block Resources</button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Admin;
