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
                backgroundColor: '#ef4444' // Danger red
            }, {
                label: 'Free',
                data: [
                    data.filter(r => r.type === 'HALL' && !r.occupied).length,
                    data.filter(r => r.type === 'CLASSROOM' && !r.occupied).length,
                    data.filter(r => r.type === 'LAB' && !r.occupied).length
                ],
                backgroundColor: '#10b981' // Emerald green
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#64748b' }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(14, 165, 233, 0.05)' },
                    ticks: { color: '#64748b' }
                }
            },
            plugins: {
                legend: { labels: { color: '#0f172a', font: { weight: 'bold' } } }
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
                backgroundColor: ['#0ea5e9', '#06b6d4', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#0f172a', font: { weight: 'bold' } } }
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
                ${r.current_semester ? `<div><span class="material-icons" style="font-size: 16px;">groups</span> ${r.current_semester}</div>` : ''}
                ${r.current_subject ? `<div><span class="material-icons" style="font-size: 16px;">book</span> ${r.current_subject}</div>` : ''}
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
            purpose: document.getElementById('booking-purpose').value,
            semester: document.getElementById('booking-semester').value,
            subject: document.getElementById('booking-subject').value
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

// --- NEW FEATURES: Availability & Timetable ---

async function loadAvailabilityGrid() {
    const dateInput = document.getElementById('avail-date');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const date = dateInput.value;
    const grid = document.getElementById('availability-grid');
    if (!grid) return;

    try {
        grid.innerHTML = '<p style="padding: 20px;">Loading availability data...</p>';
        console.log(`Fetching availability for date: ${date}`);
        
        const response = await fetch(`${API_URL}/availability?date=${date}`, {
            headers: Auth.getAuthHeader()
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const resources = await response.json();
        console.log('Resources fetched:', resources);
        
        grid.innerHTML = '';
        if (resources.length === 0) {
            grid.innerHTML = '<p style="padding: 20px; color: var(--text-muted);">No resources found in database.</p>';
            return;
        }

        resources.forEach(r => {
            const card = document.createElement('div');
            card.className = 'card avail-card';
            
            let bookingInfo = '<p class="status-empty" style="margin-top:10px;">Available all day</p>';
            if (r.bookings && r.bookings.length > 0) {
                bookingInfo = r.bookings.map(b => {
                    const start = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const end = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const statusClass = b.status === 'BLOCKED' ? 'status-cancel' : 'status-occupied';
                    return `
                        <div class="avail-slot ${statusClass}" style="margin-top:10px;">
                            <strong>${start} - ${end}</strong><br>
                            ${b.subject || b.status} ${b.semester ? `(${b.semester})` : ''}<br>
                            <small>${b.username || 'System'}</small>
                        </div>
                    `;
                }).join('');
            }

            card.innerHTML = `
                <h4>${r.name}</h4>
                <div class="avail-slots-container">${bookingInfo}</div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading availability:', error);
        grid.innerHTML = `<p style="padding: 20px; color: var(--danger);">Failed to load data: ${error.message}</p>`;
    }
}

async function blockRoom() {
    const resource_id = document.getElementById('block-resource').value;
    const date = document.getElementById('block-date').value;
    const start_time = document.getElementById('block-start').value;
    const end_time = document.getElementById('block-end').value;
    const purpose = document.getElementById('block-purpose').value;

    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);

    try {
        const response = await fetch(`${API_URL}/admin/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeader() },
            body: JSON.stringify({
                resource_id,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                purpose
            })
        });

        if (response.ok) {
            alert('Room blocked successfully!');
            loadAvailabilityGrid();
        } else {
            const err = await response.json();
            alert(`Error: ${err.error}`);
        }
    } catch (error) {
        console.error('Blocking failed:', error);
    }
}

async function insertTimetableEntry() {
    const data = {
        resource_id: document.getElementById('tt-resource').value,
        day_of_week: parseInt(document.getElementById('tt-day').value),
        start_time: document.getElementById('tt-start').value,
        end_time: document.getElementById('tt-end').value,
        semester: document.getElementById('tt-semester').value,
        subject: document.getElementById('tt-subject').value
    };

    try {
        const response = await fetch(`${API_URL}/admin/timetable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeader() },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Timetable entry added!');
        } else {
            alert('Failed to add timetable entry');
        }
    } catch (error) {
        console.error('Timetable insertion failed:', error);
    }
}

async function syncTimetable() {
    const startDate = document.getElementById('sync-start').value;
    const endDate = document.getElementById('sync-end').value;

    if (!startDate || !endDate) return alert('Select date range');

    try {
        const response = await fetch(`${API_URL}/admin/timetable/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeader() },
            body: JSON.stringify({ startDate, endDate })
        });
        const result = await response.json();
        alert(result.message || result.error);
        loadAvailabilityGrid();
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

async function processTimetableImage() {
    const fileInput = document.getElementById('tt-image-input');
    const status = document.getElementById('ocr-status');
    const btn = document.getElementById('ocr-btn');

    if (!fileInput.files || fileInput.files.length === 0) {
        return alert('Please select an image first.');
    }

    try {
        btn.disabled = true;
        status.style.color = 'var(--primary-color)';
        status.innerHTML = '<span class="material-icons" style="font-size:12px; vertical-align:middle; animation: spin 2s linear infinite;">sync</span> Preparing OCR engine...';
        
        // Ensure Tesseract is loaded
        if (typeof Tesseract === 'undefined') {
            throw new Error('OCR Library (Tesseract) not yet loaded. Please wait 5 seconds and try again.');
        }

        const { data: { text } } = await Tesseract.recognize(fileInput.files[0], 'eng', {
            logger: m => {
                if(m.status === 'recognizing text') {
                    status.innerText = `Scanning image: ${Math.round(m.progress * 100)}%`;
                }
            }
        });

        status.innerText = 'Analyzing results...';
        console.log('Full OCR Text:', text);

        // Simple Heuristic Extraction
        // Looking for patterns like "10:00-11:00", "Classroom 101", etc.
        const lines = text.split('\n').filter(l => l.trim().length > 5);
        let foundCount = 0;

        // Try to find rooms we have in the system
        const resResponse = await fetch(`${API_URL}/resources`, { headers: Auth.getAuthHeader() });
        const systemResources = await resResponse.json();

        for (const line of lines) {
            // Regex for time e.g. 10:30 - 12:30
            const timeMatch = line.match(/(\d{1,2}[:.]\d{2})\s*[-–to]\s*(\d{1,2}[:.]\d{2})/i);
            if (timeMatch) {
                const start = timeMatch[1].replace('.', ':');
                const end = timeMatch[2].replace('.', ':');

                // Try to find a resource name in this line or nearby
                const resource = systemResources.find(r => line.toLowerCase().includes(r.name.toLowerCase()));
                
                if (resource) {
                    // Auto-fill the manual form with the first match found to help the user
                    document.getElementById('tt-resource').value = resource.id;
                    document.getElementById('tt-start').value = start.padStart(5, '0');
                    document.getElementById('tt-end').value = end.padStart(5, '0');
                    
                    // Try to guess subject (rest of the line minus times and room)
                    let subject = line.replace(timeMatch[0], '').replace(resource.name, '').trim();
                    if (subject) document.getElementById('tt-subject').value = subject;
                    
                    foundCount++;
                    break; // Just fill the form once for now to let user confirm
                }
            }
        }

        if (foundCount > 0) {
            status.style.color = 'var(--success)';
            status.innerHTML = `<span class="material-icons" style="font-size:14px;">check_circle</span> Detected entry found! Form auto-filled.`;
        } else {
            status.style.color = 'var(--warning)';
            status.innerText = 'Could not clearly identify room/time. Try again with a clearer image.';
        }

    } catch (error) {
        console.error('OCR Error:', error);
        status.innerText = 'Error processing image.';
    } finally {
        btn.disabled = false;
    }
}
