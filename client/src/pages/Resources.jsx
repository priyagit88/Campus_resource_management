import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Resources = () => {
    const [resources, setResources] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const res = await api.get('/resources');
                setResources(res.data);
            } catch (err) {
                console.error("Error fetching resources", err);
            }
        };
        fetchResources();
    }, []);

    const filteredResources = resources.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (r.features && r.features.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filter === 'ALL' || r.type === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <>
            <header>
                <h2>Campus Resources</h2>
                <p style={{ color: 'var(--text-muted)' }}>Search and filter available facilities</p>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        placeholder="Search by name or features..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    {['ALL', 'HALL', 'CLASSROOM', 'LAB'].map(type => (
                        <button 
                            key={type}
                            className={`filter-btn ${filter === type ? 'active' : ''}`}
                            onClick={() => setFilter(type)}
                        >
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="resources-grid">
                {filteredResources.map(r => (
                    <div className="resource-card" key={r.id}>
                        <div className="rc-header">
                            <div>
                                <div className="rc-title">{r.name}</div>
                                <div className="rc-type">{r.type}</div>
                            </div>
                            <span className={`status-badge ${r.occupied ? 'status-occupied' : 'status-empty'}`}>
                                {r.occupied ? 'Occupied' : 'Available'}
                                {r.occupied && r.occupied_until && (
                                    <>
                                        <br/>
                                        <small>Until: {new Date(r.occupied_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                    </>
                                )}
                            </span>
                        </div>
                        <div className="rc-details">
                            <div><span className="material-icons" style={{ fontSize: '16px' }}>people</span> Capacity: {r.capacity}</div>
                            {r.current_purpose && <div><span className="material-icons" style={{ fontSize: '16px' }}>event</span> {r.current_purpose}</div>}
                            {r.current_semester && <div><span className="material-icons" style={{ fontSize: '16px' }}>groups</span> {r.current_semester}</div>}
                            {r.current_subject && <div><span className="material-icons" style={{ fontSize: '16px' }}>book</span> {r.current_subject}</div>}
                        </div>
                        <div className="rc-features">
                            {r.features || 'No specific features listed'}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default Resources;
