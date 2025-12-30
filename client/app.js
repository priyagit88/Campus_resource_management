const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    fetchResources();
    fetchStats();
});

async function fetchStats() {
    // In a real app, this would be a dedicated stats endpoint
    // For now, calculating from resources
    try {
        const response = await fetch(`${API_URL}/resources`);
        const data = await response.json();

        const total = data.length;
        const occupied = data.filter(r => r.occupied).length;
        const halls = data.filter(r => r.type === 'HALL' && !r.occupied).length;
        const labs = data.filter(r => r.type === 'LAB' && !r.occupied).length;

        document.getElementById('total-resources').textContent = total;
        document.getElementById('occupied-count').textContent = occupied;
        document.getElementById('free-halls').textContent = halls;
        document.getElementById('free-labs').textContent = labs;

        renderCharts(data);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchResources() {
    try {
        const response = await fetch(`${API_URL}/resources`);
        const resources = await response.json();
        const tbody = document.getElementById('resource-table-body');

        tbody.innerHTML = '';

        resources.forEach(resource => {
            const row = document.createElement('tr');
            const statusClass = resource.occupied ? 'status-occupied' : 'status-empty';
            const statusText = resource.occupied ? 'Occupied' : 'Empty';

            row.innerHTML = `
                <td>${resource.name}</td>
                <td>${resource.type}</td>
                <td>${resource.capacity}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td style="color: var(--text-muted); font-size: 0.9em;">${resource.features || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
    }
}

function renderCharts(data) {
    const ctxUtil = document.getElementById('utilizationChart').getContext('2d');
    const ctxType = document.getElementById('typeChart').getContext('2d');

    const typeCounts = {
        'HALL': 0,
        'CLASSROOM': 0,
        'LAB': 0
    };

    data.forEach(r => {
        if (typeCounts[r.type] !== undefined) typeCounts[r.type]++;
    });

    // Utilization Chart
    new Chart(ctxUtil, {
        type: 'bar',
        data: {
            labels: ['Halls', 'Classrooms', 'Labs'],
            datasets: [{
                label: 'Occupied',
                data: [
                    data.filter(r => r.type === 'HALL' && r.occupied).length,
                    data.filter(r => r.type === 'CLASSROOM' && r.occupied).length,
                    data.filter(r => r.type === 'LAB' && r.occupied).length
                ],
                backgroundColor: '#fd5d93'
            }, {
                label: 'Free',
                data: [
                    data.filter(r => r.type === 'HALL' && !r.occupied).length,
                    data.filter(r => r.type === 'CLASSROOM' && !r.occupied).length,
                    data.filter(r => r.type === 'LAB' && !r.occupied).length
                ],
                backgroundColor: '#00f2c3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true }
            },
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });

    // Type Chart
    new Chart(ctxType, {
        type: 'doughnut',
        data: {
            labels: ['Halls', 'Classrooms', 'Labs'],
            datasets: [{
                data: [typeCounts.HALL, typeCounts.CLASSROOM, typeCounts.LAB],
                backgroundColor: ['#4a90e2', '#50e3c2', '#ff8d72'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: 'white' } }
            }
        }
    });
}
