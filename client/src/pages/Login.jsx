import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary-color)' }}>school</span>
                    <h1>Login</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Welcome back to CRM</p>
                </div>
                {error && <div style={{ color: 'var(--danger)', marginBottom: '15px' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="cta-btn" style={{ width: '100%', justifyContent: 'center' }}>
                        Login
                    </button>
                    <div className="auth-footer">
                        Don't have an account? <Link to="/register">Register</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
