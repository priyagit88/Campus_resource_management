import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
    const [resources, setResources] = useState([]);
    const [stats, setStats] = useState({ total: 0, occupied: 0, freeHalls: 0, freeLabs: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/resources');
                setResources(res.data);
                
                const total = res.data.length;
                const occupied = res.data.filter(r => r.occupied).length;
                const freeHalls = res.data.filter(r => r.type === 'HALL' && !r.occupied).length;
                const freeLabs = res.data.filter(r => r.type === 'LAB' && !r.occupied).length;
                
                setStats({ total, occupied, freeHalls, freeLabs });
            } catch (err) {
                console.error("Error fetching dashboard data", err);
            }
        };
        fetchData();
    }, []);

    const barData = {
        labels: ['Halls', 'Classrooms', 'Labs'],
        datasets: [
            {
                label: 'Occupied',
                data: [
                    resources.filter(r => r.type === 'HALL' && r.occupied).length,
                    resources.filter(r => r.type === 'CLASSROOM' && r.occupied).length,
                    resources.filter(r => r.type === 'LAB' && r.occupied).length
                ],
                backgroundColor: '#ef4444'
            },
            {
                label: 'Free',
                data: [
                    resources.filter(r => r.type === 'HALL' && !r.occupied).length,
                    resources.filter(r => r.type === 'CLASSROOM' && !r.occupied).length,
                    resources.filter(r => r.type === 'LAB' && !r.occupied).length
                ],
                backgroundColor: '#10b981'
            }
        ]
    };

    const donutData = {
        labels: ['Halls', 'Classrooms', 'Labs'],
        datasets: [{
            data: [
                resources.filter(r => r.type === 'HALL').length,
                resources.filter(r => r.type === 'CLASSROOM').length,
                resources.filter(r => r.type === 'LAB').length
            ],
            backgroundColor: ['#0ea5e9', '#06b6d4', '#f59e0b'],
            borderWidth: 0
        }]
    };

    return (
        <>
            <header>
                <h2>Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Overview of Campus Resources</p>
            </header>

            <div className="stats-grid">
                <div className="card stat-card">
                    <h3>Total Resources</h3>
                    <div className="value">{stats.total}</div>
                </div>
                <div className="card stat-card">
                    <h3>Currently Occupied</h3>
                    <div className="value" style={{ color: 'var(--warning)' }}>{stats.occupied}</div>
                </div>
                <div className="card stat-card">
                    <h3>Free Halls</h3>
                    <div className="value">{stats.freeHalls}</div>
                </div>
                <div className="card stat-card">
                    <h3>Labs Available</h3>
                    <div className="value">{stats.freeLabs}</div>
                </div>
            </div>

            <div className="charts-section">
                <div className="card">
                    <h3>Resource Utilization</h3>
                    <div className="chart-container" style={{ height: '300px' }}>
                        <Bar 
                            data={barData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: { x: { stacked: true }, y: { stacked: true } }
                            }} 
                        />
                    </div>
                </div>
                <div className="card">
                    <h3>Type Distribution</h3>
                    <div className="chart-container" style={{ height: '300px' }}>
                        <Doughnut 
                            data={donutData}
                            options={{ responsive: true, maintainAspectRatio: false }}
                        />
                    </div>
                </div>
            </div>

            <div className="card resources-list">
                <h3>Live Resource Status</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Status</th>
                            <th>Features</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resources.map(r => (
                            <tr key={r.id}>
                                <td>{r.name}</td>
                                <td>{r.type}</td>
                                <td>{r.capacity}</td>
                                <td>
                                    <span className={`status-badge ${r.occupied ? 'status-occupied' : 'status-empty'}`}>
                                        {r.occupied ? 'Occupied' : 'Empty'}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>{r.features || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Dashboard;
