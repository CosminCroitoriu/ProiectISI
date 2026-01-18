// Statistics Page JavaScript
const API_URL = 'http://localhost:5000/api';

// Chart color schemes (only ACCIDENT and POLICE)
const COLORS = {
    ACCIDENT: { bg: 'rgba(239, 83, 80, 0.8)', border: '#ef5350' },
    POLICE: { bg: 'rgba(66, 165, 245, 0.8)', border: '#42a5f5' }
};

// Types to include in statistics
const INCLUDED_TYPES = ['ACCIDENT', 'POLICE'];

const CHART_COLORS = [
    'rgba(30, 136, 229, 0.8)',
    'rgba(21, 101, 192, 0.8)',
    'rgba(239, 83, 80, 0.8)',
    'rgba(66, 165, 245, 0.8)',
    'rgba(13, 71, 161, 0.8)',
    'rgba(100, 181, 246, 0.8)'
];

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
});

// Fetch and display statistics
async function loadStatistics() {
    if (!checkAuth()) return;
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    try {
        const response = await fetch(`${API_URL}/statistics`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load statistics');
        }
        
        const stats = data.statistics;
        
        // Update summary cards
        document.getElementById('totalReports').textContent = stats.summary.total_reports.toLocaleString();
        document.getElementById('activeReports').textContent = stats.summary.active_reports.toLocaleString();
        document.getElementById('totalUsers').textContent = stats.summary.total_users.toLocaleString();
        document.getElementById('totalVotes').textContent = stats.summary.total_votes.toLocaleString();
        
        // Update extra stats
        document.getElementById('peakHour').textContent = formatHour(stats.summary.peak_hour);
        document.getElementById('avgReports').textContent = stats.summary.avg_reports_per_user;
        
        // Create charts
        createReportsByTypeChart(stats.reports_by_type);
        createReportsPerDayChart(stats.reports_per_day);
        createReportsByTypeDailyChart(stats.reports_by_type_daily);
        createReportsByHourChart(stats.reports_by_hour);
        createReportsPerMonthChart(stats.reports_per_month);
        
        // Populate leaderboard
        populateLeaderboard(stats.top_reporters);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        alert('Failed to load statistics. Please try again.');
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Format hour for display
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

// Chart: Reports by Type (Doughnut)
function createReportsByTypeChart(data) {
    const ctx = document.getElementById('reportsByTypeChart').getContext('2d');
    
    // Filter to only include ACCIDENT and POLICE
    const filteredData = data.filter(d => INCLUDED_TYPES.includes(d.type));
    
    const labels = filteredData.map(d => formatTypeName(d.type));
    const values = filteredData.map(d => d.count);
    const colors = filteredData.map(d => COLORS[d.type]?.bg || CHART_COLORS[0]);
    const borderColors = filteredData.map(d => COLORS[d.type]?.border || '#fff');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

// Chart: Reports Per Day (Line)
function createReportsPerDayChart(data) {
    const ctx = document.getElementById('reportsPerDayChart').getContext('2d');
    
    const labels = data.map(d => formatDate(d.date));
    const values = data.map(d => d.count);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reports',
                data: values,
                borderColor: '#1e88e5',
                backgroundColor: 'rgba(30, 136, 229, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.6)', maxTicksLimit: 10 },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Chart: Reports by Type Daily (Stacked Bar)
function createReportsByTypeDailyChart(data) {
    const ctx = document.getElementById('reportsByTypeDailyChart').getContext('2d');
    
    const labels = data.map(d => formatDate(d.date));
    
    // Only include ACCIDENT and POLICE
    const datasets = [
        {
            label: 'Accidents',
            data: data.map(d => d.ACCIDENT || 0),
            backgroundColor: COLORS.ACCIDENT.bg,
            borderColor: COLORS.ACCIDENT.border,
            borderWidth: 1
        },
        {
            label: 'Police',
            data: data.map(d => d.POLICE || 0),
            backgroundColor: COLORS.POLICE.bg,
            borderColor: COLORS.POLICE.border,
            borderWidth: 1
        }
    ];
    
    new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 15,
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Chart: Reports by Hour (Bar)
function createReportsByHourChart(data) {
    const ctx = document.getElementById('reportsByHourChart').getContext('2d');
    
    // Fill in missing hours with 0
    const hourData = Array(24).fill(0);
    data.forEach(d => {
        hourData[d.hour] = d.count;
    });
    
    const labels = Array.from({ length: 24 }, (_, i) => formatHour(i));
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reports',
                data: hourData,
                backgroundColor: 'rgba(30, 136, 229, 0.7)',
                borderColor: '#1e88e5',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.6)',
                        maxRotation: 45,
                        font: { size: 10 }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Chart: Reports Per Month (Line)
function createReportsPerMonthChart(data) {
    const ctx = document.getElementById('reportsPerMonthChart').getContext('2d');
    
    const labels = data.map(d => formatMonth(d.month));
    const values = data.map(d => d.count);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reports',
                data: values,
                borderColor: '#1565c0',
                backgroundColor: 'rgba(21, 101, 192, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: '#1565c0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Populate leaderboard
function populateLeaderboard(reporters) {
    const leaderboard = document.getElementById('leaderboard');
    
    if (!reporters || reporters.length === 0) {
        leaderboard.innerHTML = '<p style="color: rgba(255,255,255,0.6);">No data yet</p>';
        return;
    }
    
    const rankClasses = ['gold', 'silver', 'bronze', '', ''];
    
    leaderboard.innerHTML = reporters.map((reporter, index) => `
        <div class="leader-card">
            <span class="leader-rank ${rankClasses[index]}">#${index + 1}</span>
            <div class="leader-info">
                <div class="leader-name">${escapeHtml(reporter.username)}</div>
                <div class="leader-stats">${reporter.reports} reports | ${reporter.reputation} reputation</div>
            </div>
        </div>
    `).join('');
}

// Helper: Format type name
function formatTypeName(type) {
    const names = {
        'ACCIDENT': 'Accident',
        'POLICE': 'Police'
    };
    return names[type] || type;
}

// Helper: Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper: Format month
function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', loadStatistics);
