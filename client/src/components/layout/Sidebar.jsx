import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();

    return (
        <div className="sidebar">
            <div className="brand">
                <span className="material-icons">school</span>
                CRM
            </div>
            <ul className="nav-links">
                <li>
                    <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">dashboard</span> Dashboard
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/resources" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">meeting_room</span> Resources
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/bookings" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">class</span> Bookings
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">person</span> Profile
                    </NavLink>
                </li>
                {user?.role === 'admin' && (
                    <li className="admin-only" style={{ display: 'block' }}>
                        <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="material-icons">admin_panel_settings</span> Requests
                        </NavLink>
                    </li>
                )}
                <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
                        <span className="material-icons">logout</span> Logout
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
