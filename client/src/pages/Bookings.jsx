import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Bookings = () => {
    const [bookings, setBookings] = useState([]);
    const [resources, setResources] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const { user } = useAuth();
    
    // Form state
    const [formData, setFormData] = useState({
        resource_id: '',
        start_time: '',
        end_time: '',
        purpose: '',
        semester: '',
        subject: ''
    });

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(res.data);
        } catch (err) {
            console.error("Error fetching bookings", err);
        }
    };

    const fetchResources = async () => {
        try {
            const res = await api.get('/resources');
            setResources(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, resource_id: res.data[0].id }));
            }
        } catch (err) {
            console.error("Error fetching resources", err);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleOpenModal = () => {
        fetchResources();
        setShowModal(true);
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        try {
            const bookingData = {
                ...formData,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString()
            };
            await api.post('/bookings', bookingData);
            alert('Booking created successfully!');
            setShowModal(false);
            fetchBookings();
        } catch (err) {
            alert(`Error: ${err.response?.data?.error || 'Booking failed'}`);
        }
    };

    const handleCancelRequest = async (id) => {
        if (!confirm('Request cancellation?')) return;
        try {
            await api.post(`/bookings/${id}/cancel`);
            alert('Cancellation request sent.');
            fetchBookings();
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (dateStr) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        }).format(new Date(dateStr));
    };

    const getStatusBadge = (b) => {
        const now = new Date();
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);

        if (b.status === 'PENDING') return <span className="status-badge status-pending">Requested</span>;
        if (b.status === 'CANCEL_REQUESTED') return <span className="status-badge status-cancel">Cancellation Pending</span>;
        if (b.status === 'CANCELLED') return <span className="status-badge" style={{ background: 'rgba(0,0,0,0.1)', color: '#999' }}>Cancelled</span>;
        if (b.status === 'REJECTED') return <span className="status-badge status-rejected">Rejected</span>;
        
        if (now >= start && now < end) return <span className="status-badge status-occupied">Active</span>;
        if (now >= end) return <span className="status-badge" style={{ background: 'rgba(0,0,0,0.05)', color: '#666' }}>Completed</span>;
        return <span className="status-badge" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary-color)' }}>Confirmed</span>;
    };

    return (
        <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Room Bookings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your reservations and view schedules</p>
                </div>
                <button className="cta-btn" onClick={handleOpenModal}>
                    <span className="material-icons">add</span> New Booking
                </button>
            </header>

            <div className="card">
                <h3>My Current Bookings</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Purpose</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.filter(b => b.is_mine).map(b => (
                            <tr key={b.id}>
                                <td>{b.resource_name}</td>
                                <td>{formatDate(b.start_time)}</td>
                                <td>{formatDate(b.end_time)}</td>
                                <td>{b.purpose}</td>
                                <td>{getStatusBadge(b)}</td>
                                <td>
                                    {(b.status === 'PENDING' || (b.status === 'APPROVED' && new Date() < new Date(b.end_time))) && b.status !== 'CANCEL_REQUESTED' && (
                                        <button className="cancel-btn" onClick={() => handleCancelRequest(b.id)}>
                                            {b.status === 'PENDING' ? 'Cancel Request' : 'Finish Early'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="card" style={{ marginTop: '30px' }}>
                <h3>Other Resource Schedules</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th>User</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Purpose</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.filter(b => !b.is_mine && b.status !== 'CANCELLED' && b.status !== 'REJECTED' && new Date() < new Date(b.end_time)).map(b => (
                            <tr key={b.id}>
                                <td>{b.resource_name}</td>
                                <td>{b.requester}</td>
                                <td>{formatDate(b.start_time)}</td>
                                <td>{formatDate(b.end_time)}</td>
                                <td>{b.purpose}</td>
                                <td>{getStatusBadge(b)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
                        <h3>Reserve Resource</h3>
                        <form onSubmit={handleBookingSubmit} style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label>Select Resource</label>
                                <select 
                                    value={formData.resource_id} 
                                    onChange={e => setFormData({ ...formData, resource_id: e.target.value })}
                                    required
                                >
                                    {resources.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Purpose / Event</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., Guest Lecture, Club Meeting"
                                    value={formData.purpose}
                                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="cta-btn" style={{ width: '100%', justifyContent: 'center' }}>
                                Confirm Reservation
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Bookings;
