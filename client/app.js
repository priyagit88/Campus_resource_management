const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (typeof Auth !== 'undefined') {
        Auth.checkAuth();
    }

    // Determine which page we are on
    const path = window.location.pathname;
    if (path.includes('resources.html')) {
        loadResourcesPage();
    } else if (path.includes('bookings.html')) {
        loadBookingsPage();
    } else if (path.includes('profile.html')) {
        // Handled by inline script or could move here
        // loadProfilePage(); 
    } else if (path.includes('index.html') || path === '/') {
        // Dashboard by default
        fetchResources();
        fetchStats();
    }
});

async function fetchStats() {
    // In a real app, this would be a dedicated stats endpoint
    // For now, calculating from resources
    try {
        const response = await fetch(`${API_URL}/resources`, {
            headers: Auth.getAuthHeader()
        });
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
        const response = await fetch(`${API_URL}/resources`, {
            headers: Auth.getAuthHeader()
        });
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
        const response = await fetch(`${API_URL}/resources`, {
            headers: Auth.getAuthHeader()
        });
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
                headers: {
                    'Content-Type': 'application/json',
                    ...Auth.getAuthHeader()
                },
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
        const response = await fetch(`${API_URL}/bookings`, {
            headers: Auth.getAuthHeader()
        });
        const bookings = await response.json();

        const myTbody = document.getElementById('my-bookings-table-body');
        const historyTbody = document.getElementById('my-history-table-body');
        const globalHistoryTbody = document.getElementById('global-history-table-body');
        const otherTbody = document.getElementById('other-bookings-table-body');

        if (!myTbody || !otherTbody) return; // Not on bookings page

        myTbody.innerHTML = '';
        if (historyTbody) historyTbody.innerHTML = '';
        if (globalHistoryTbody) globalHistoryTbody.innerHTML = '';
        otherTbody.innerHTML = '';

        bookings.forEach(b => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            const now = new Date();

            let statusBadge = '';
            if (b.status === 'PENDING') {
                statusBadge = '<span class="status-badge status-pending">Requested</span>';
            } else if (b.status === 'CANCEL_REQUESTED') {
                statusBadge = '<span class="status-badge status-cancel">Cancellation Pending</span>';
            } else if (b.status === 'CANCELLED') {
                statusBadge = '<span class="status-badge" style="background:rgba(0,0,0,0.2); color:#999;">Cancelled</span>';
            } else if (b.status === 'REJECTED') {
                statusBadge = '<span class="status-badge status-rejected">Rejected</span>';
            } else {
                if (now >= start && now < end) {
                    statusBadge = '<span class="status-badge status-occupied">Active</span>';
                } else if (now >= end) {
                    statusBadge = '<span class="status-badge" style="background:rgba(255,255,255,0.05); color:#666;">Completed</span>';
                } else {
                    statusBadge = '<span class="status-badge" style="background:rgba(255,255,255,0.1); color:#ccc;">Confirmed</span>';
                }
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
            if (b.is_mine) {
                const isHistory = b.status === 'CANCELLED' || b.status === 'REJECTED' || now >= end;

                if (isHistory && historyTbody) {
                    row.innerHTML = `
                        <td>${b.resource_name}</td>
                        <td>${b.resource_type}</td>
                        <td>${formatDate(start)} - ${new Date(b.end_time).toLocaleTimeString()}</td>
                        <td>${b.purpose}</td>
                        <td>${statusBadge}</td>
                    `;
                    historyTbody.appendChild(row);
                } else {
                    row.innerHTML = `
                        <td>${b.resource_name}</td>
                        <td>${b.resource_type}</td>
                        <td>${formatDate(start)}</td>
                        <td>${formatDate(end)}</td>
                        <td>${b.purpose}</td>
                        <td>${statusBadge}</td>
                    `;
                    myTbody.appendChild(row);

                    // Add cancel/finish-early button logic
                    let showButton = false;
                    let btnText = 'Request Cancel';

                    if (b.status === 'PENDING') {
                        showButton = true;
                        btnText = 'Cancel Request';
                    } else if (b.status === 'APPROVED') {
                        if (now < end) {
                            showButton = true;
                            if (now >= start) {
                                btnText = 'Finish Early';
                            }
                        }
                    }

                    const cancelCol = document.createElement('td');
                    if (showButton && b.status !== 'CANCEL_REQUESTED') {
                        const cancelBtn = document.createElement('button');
                        cancelBtn.innerText = btnText;
                        cancelBtn.className = 'cancel-btn';
                        cancelBtn.onclick = () => requestCancellation(b.id);
                        cancelCol.appendChild(cancelBtn);
                    }
                    row.appendChild(cancelCol);
                }
            } else {
                const isHistory = b.status === 'CANCELLED' || b.status === 'REJECTED' || now >= end;

                if (isHistory) {
                    if (globalHistoryTbody) {
                        row.innerHTML = `
                            <td>${b.resource_name}</td>
                            <td>${b.resource_type}</td>
                            <td>${b.requester}</td>
                            <td>${formatDate(start)} - ${new Date(b.end_time).toLocaleTimeString()}</td>
                            <td>${b.purpose}</td>
                            <td>${statusBadge}</td>
                        `;
                        globalHistoryTbody.appendChild(row);
                    }
                } else {
                    // Only show active/upcoming occupancy
                    row.innerHTML = `
                        <td>${b.resource_name}</td>
                        <td>${b.resource_type}</td>
                        <td>${b.requester}</td>
                        <td>${formatDate(start)}</td>
                        <td>${formatDate(end)}</td>
                        <td>${b.purpose}</td>
                        <td>${statusBadge}</td>
                    `;
                    otherTbody.appendChild(row);
                }
            }
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
    }
}

async function requestCancellation(id) {
    if (!confirm('Are you sure you want to request cancellation for this booking? This requires admin approval.')) return;
    try {
        const response = await fetch(`${API_URL}/bookings/${id}/cancel`, {
            method: 'POST',
            headers: Auth.getAuthHeader()
        });
        if (response.ok) {
            alert('Cancellation request sent to admin.');
            fetchBookings();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (err) {
        console.error('Cancel request failed:', err);
    }
}

async function populateResourceSelect() {
    try {
        const response = await fetch(`${API_URL}/resources`, {
            headers: Auth.getAuthHeader()
        });
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

async function loadProfilePage() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: Auth.getAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }

        const user = await response.json();

        // Populate UI
        document.getElementById('profile-username-header').textContent = user.username;
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-id').textContent = `#${user.id}`;
        document.getElementById('profile-role').textContent = user.role;
        document.getElementById('profile-role-badge').textContent = user.role;

        const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        document.getElementById('profile-joined').textContent = joinedDate;

    } catch (error) {
        console.error('Error loading profile page:', error);
        alert('Could not load profile information.');
    }
}
