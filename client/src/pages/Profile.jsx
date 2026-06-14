import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { user } = useAuth();

    if (!user) return null;

    const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <>
            <header>
                <h2>User Profile</h2>
                <p style={{ color: 'var(--text-muted)' }}>Manage your account settings</p>
            </header>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
                        <span className="material-icons" style={{ fontSize: '60px' }}>account_circle</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem' }}>{user.username}</h3>
                    <span className="status-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}>{user.role}</span>
                </div>

                <div className="profile-details" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>User ID</span>
                        <strong>#{user.id}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Role</span>
                        <strong>{user.role}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Joined Date</span>
                        <strong>{joinedDate}</strong>
                    </div>
                </div>

                <button className="filter-btn" style={{ width: '100%', marginTop: '20px' }}>Update Password</button>
            </div>
        </>
    );
};

export default Profile;
