// API Configuration
const URL_TEMPLATE = "https://ttp.cbp.dhs.gov/schedulerapi/locations/{locationId}/slots?startTimestamp={start}&endTimestamp={end}";
const SCHEDULING_URL = "https://ttp.dhs.gov/schedulerui/schedule-interview/location?lang=en&vo=true&returnUrl=ttp-external&service=nh";

// DOM Elements
const locationSelect = document.getElementById('location-select');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const minHourInput = document.getElementById('min-hour');
const maxHourInput = document.getElementById('max-hour');
const weekendToggle = document.getElementById('weekend-toggle');
const refreshBtn = document.getElementById('refresh-btn');
const resultsContainer = document.getElementById('results-container');
const gridWrapper = document.getElementById('grid-wrapper');
const emptyState = document.getElementById('empty-state');
const summaryCards = document.getElementById('summary-cards');
const totalSlotsEl = document.getElementById('total-slots');
const totalDaysEl = document.getElementById('total-days');

// State
let isChecking = false;

// Initialize Dates
function init() {
    const now = new Date();
    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(now.getMonth() + 6);

    startDateInput.value = now.toISOString().split('T')[0];
    endDateInput.value = sixMonthsLater.toISOString().split('T')[0];

    refreshBtn.addEventListener('click', handleCheck);
}

async function handleCheck() {
    if (isChecking) return;

    const locationId = locationSelect.value;
    const startTs = `${startDateInput.value}T00:00:00`;
    const endTs = `${endDateInput.value}T23:59:59`;
    const minHour = parseInt(minHourInput.value);
    const maxHour = parseInt(maxHourInput.value);
    const checkWeekends = weekendToggle.checked;

    setLoading(true);

    try {
        const slots = await fetchSlots(locationId, startTs, endTs);
        renderResults(slots, minHour, maxHour, checkWeekends);
    } catch (error) {
        console.error(error);
        alert("Failed to fetch appointments. Please try again later.");
    } finally {
        setLoading(false);
    }
}

async function fetchSlots(locationId, start, end) {
    const url = URL_TEMPLATE.replace("{locationId}", locationId)
        .replace("{start}", start)
        .replace("{end}", end);

    const response = await fetch(url);
    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();
    return data.filter(slot => slot.active > 0);
}

function setLoading(loading) {
    isChecking = loading;
    const btnText = refreshBtn.querySelector('.btn-text');
    const loader = refreshBtn.querySelector('.loader');

    if (loading) {
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        refreshBtn.disabled = true;
    } else {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
        refreshBtn.disabled = false;
    }
}

function renderResults(slots, minHour, maxHour, checkWeekends) {
    emptyState.classList.add('hidden');
    gridWrapper.classList.remove('hidden');
    summaryCards.classList.remove('hidden');
    gridWrapper.innerHTML = '';

    let filteredSlots = slots;
    if (checkWeekends) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        filteredSlots = slots.filter(slot => {
            const date = new Date(slot.timestamp);
            const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
            return (day === 0 || day === 6) && date <= thirtyDaysFromNow;
        });
    }

    // Group by Month then Date
    const grouped = {};
    filteredSlots.forEach(slot => {
        const dateObj = new Date(slot.timestamp);
        const monthKey = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        const dateKey = slot.timestamp.split('T')[0];

        if (!grouped[monthKey]) grouped[monthKey] = {};
        if (!grouped[monthKey][dateKey]) grouped[monthKey][dateKey] = [];
        grouped[monthKey][dateKey].push(slot);
    });

    const months = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    let totalDays = 0;

    months.forEach(month => {
        const monthSection = document.createElement('div');
        monthSection.className = 'month-block';
        monthSection.innerHTML = `<h2>${month}</h2>`;

        const table = document.createElement('table');
        table.className = 'grid-table';

        // Header
        const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour);
        const headerRow = `
            <tr>
                <th class="date-cell">Date</th>
                ${hours.map(h => `<th>${h.toString().padStart(2, '0')}</th>`).join('')}
                <th>Total</th>
            </tr>
        `;

        let rowsHtml = '';
        const dates = Object.keys(grouped[month]).sort();
        totalDays += dates.length;

        dates.forEach(date => {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
            const dayNum = dateObj.getUTCDate().toString().padStart(2, '0');

            // Calculate color class
            const now = new Date();
            const diffTime = dateObj.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let colorClass = 'red';
            if (diffDays < 28) colorClass = 'green';
            else if (diffDays <= 56) colorClass = 'yellow';

            const daySlots = grouped[month][date];
            const countsByHour = new Array(hours.length).fill(0);

            daySlots.forEach(slot => {
                const h = new Date(slot.timestamp).getHours();
                if (h >= minHour && h <= maxHour) {
                    countsByHour[h - minHour]++;
                }
            });

            rowsHtml += `
                <tr>
                    <td class="date-cell ${colorClass}">${dayNum} (${dayName})</td>
                    ${countsByHour.map(c => `
                        <td>
                            <span class="slot-dot ${c > 0 ? 'available ' + colorClass : 'empty'}">
                                ${c > 0 ? c : '.'}
                            </span>
                        </td>
                    `).join('')}
                    <td><strong>${daySlots.length}</strong></td>
                </tr>
            `;
        });

        table.innerHTML = `<thead>${headerRow}</thead><tbody>${rowsHtml}</tbody>`;
        monthSection.appendChild(table);
        gridWrapper.appendChild(monthSection);
    });

    totalSlotsEl.textContent = filteredSlots.length;
    totalDaysEl.textContent = totalDays;
}

init();
