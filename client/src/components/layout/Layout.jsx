import React from 'react';
import Sidebar from './Sidebar';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;

    return (
        <>
            <Sidebar />
            <div className="main-content">
                {children}
            </div>
        </>
    );
};

export default Layout;
