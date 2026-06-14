import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('crm_token');
            const savedUser = localStorage.getItem('crm_user');
            
            if (token && savedUser) {
                setUser(JSON.parse(savedUser));
                // Optionally verify with server
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                    localStorage.setItem('crm_user', JSON.stringify(res.data));
                } catch (err) {
                    console.error("Auth verification failed", err);
                    logout();
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        const { token, user: newUser } = res.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(newUser));
        setUser(newUser);
        return newUser;
    };

    const register = async (username, password) => {
        const res = await api.post('/auth/register', { username, password });
        const { token, user: newUser } = res.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(newUser));
        setUser(newUser);
        return newUser;
    };

    const logout = () => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
