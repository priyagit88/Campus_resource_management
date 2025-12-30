const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const path = window.location.pathname;
    if (path.includes('resources.html')) {
        loadResourcesPage();
    } else if (path.includes('bookings.html')) {
        loadBookingsPage();
    } else {
        // Dashboard by default
        fetchResources();
        fetchStats();
    }
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

// Resources Page Logic
let allResources = [];

async function loadResourcesPage() {
    try {
        const response = await fetch(`${API_URL}/resources`);
        allResources = await response.json();

        const grid = document.getElementById('resources-grid');
        const searchInput = document.getElementById('resource-search');
        const filters = document.querySelectorAll('.filter-btn');

        // Initial Render
        renderResourceGrid(allResources);

        // Search Listener
        searchInput.addEventListener('input', (e) => {
            filterResources(e.target.value, document.querySelector('.filter-btn.active').dataset.filter);
        });

        // Filter Listeners
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterResources(searchInput.value, btn.dataset.filter);
            });
        });

    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

function renderResourceGrid(resources) {
    const grid = document.getElementById('resources-grid');
    grid.innerHTML = '';

    resources.forEach(r => {
        const statusClass = r.occupied ? 'status-occupied' : 'status-empty';
        const statusText = r.occupied ? 'Occupied' : 'Available';
        const until = r.occupied ? `<br><small>Until: ${new Date(r.occupied_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>` : '';

        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
            <div class="rc-header">
                <div>
                    <div class="rc-title">${r.name}</div>
                    <div class="rc-type">${r.type}</div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}${until}</span>
            </div>
            <div class="rc-details">
                <div><span class="material-icons" style="font-size: 16px;">people</span> Capacity: ${r.capacity}</div>
                ${r.current_purpose ? `<div><span class="material-icons" style="font-size: 16px;">event</span> ${r.current_purpose}</div>` : ''}
            </div>
            <div class="rc-features">
                ${r.features || 'No specific features'}
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterResources(searchTerm, category) {
    const term = searchTerm.toLowerCase();
    const filtered = allResources.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(term) || (r.features && r.features.toLowerCase().includes(term));
        const matchesCategory = category === 'ALL' || r.type === category;
        return matchesSearch && matchesCategory;
    });
    renderResourceGrid(filtered);
    renderResourceGrid(filtered);
}

// Bookings Page Logic
async function loadBookingsPage() {
    const modal = document.getElementById('booking-modal');
    const newBtn = document.getElementById('new-booking-btn');
    const closeBtn = document.querySelector('.close-modal');
    const form = document.getElementById('booking-form');

    // Fetch and render bookings
    fetchBookings();

    // Setup Modal
    newBtn.onclick = async () => {
        await populateResourceSelect();
        modal.style.display = "block";
    }
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    // Handle Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const startVal = document.getElementById('booking-start').value;
        const endVal = document.getElementById('booking-end').value;

        // Convert to ISO UTC Strings to ensure consistency server-side
        const startDate = new Date(startVal);
        const endDate = new Date(endVal);

        const bookingData = {
            resource_id: document.getElementById('booking-resource').value,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            purpose: document.getElementById('booking-purpose').value
        };

        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            if (response.ok) {
                alert('Booking created successfully!');
                modal.style.display = "none";
                form.reset();
                fetchBookings(); // Refresh list
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (err) {
            console.error('Booking failed:', err);
            alert('Failed to connect to server.');
        }
    });
}

async function fetchBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const bookings = await response.json();
        const tbody = document.getElementById('bookings-table-body');

        tbody.innerHTML = '';

        bookings.forEach(b => {
            const now = new Date();
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);

            let statusBadge = '<span class="status-badge" style="background:rgba(255,255,255,0.1); color:#ccc;">Upcoming</span>';
            if (now >= start && now < end) {
                statusBadge = '<span class="status-badge status-occupied">Active</span>';
            } else if (now >= end) {
                statusBadge = '<span class="status-badge" style="background:rgba(255,255,255,0.05); color:#666;">Completed</span>';
            }

            const formatDate = (date) => {
                return new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }).format(date);
            };

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${b.resource_name}</td>
                <td>${b.resource_type}</td>
                <td>${formatDate(start)}</td>
                <td>${formatDate(end)}</td>
                <td>${b.purpose}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

async function populateResourceSelect() {
    try {
        const response = await fetch(`${API_URL}/resources`);
        const resources = await response.json();
        const select = document.getElementById('booking-resource');

        select.innerHTML = '';
        resources.forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            // E.g. "Seminar Hall A (HALL)"
            option.textContent = `${r.name} (${r.type})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching resources for select:', error);
    }
}
