// Fallback static data (sample CSV parsed as array for API failures)
const fallbackData = [ // Example: [[timestamp, price], ...] for last 30 days
    [Date.now() - 30*24*60*60*1000, 0.5], [Date.now() - 29*24*60*60*1000, 0.52], /* Add ~30 sample points */
    // Populate with real sample data or leave as placeholder
];

async function fetchXRPData(days) {
    const cacheKey = `xrp_data_${days}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached); // Cache for rate limits
    }
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/ripple/market_chart?vs_currency=usd&days=${days}`);
        const data = await response.json();
        const sampledPrices = sampleData(data.prices, 30); // Limit to ~30 points for performance
        localStorage.setItem(cacheKey, JSON.stringify(sampledPrices));
        return sampledPrices;
    } catch (error) {
        console.error('API Error:', error);
        return fallbackData; // Fallback on error
    }
}

function sampleData(prices, maxPoints) {
    if (prices.length <= maxPoints) return prices;
    const step = Math.floor(prices.length / maxPoints);
    return prices.filter((_, i) => i % step === 0);
}

function renderChart(prices, invert) {
    const labels = prices.map(p => new Date(p[0]).toLocaleDateString());
    const values = prices.map(p => invert ? (1 / p[1]) : p[1]); // Invert for USD/XRP
    const ctx = document.getElementById('xrpChart').getContext('2d');
    if (window.myChart) window.myChart.destroy(); // Clear old chart
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: invert ? 'USD/XRP (Falling = USD Decline)' : 'XRP/USD (Rising = USD Decline)',
                data: values,
                borderColor: '#00ff99', // Green theme
                backgroundColor: 'rgba(0, 255, 153, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true, // Mobile-friendly
            scales: { y: { beginAtZero: false } },
            plugins: {
                title: { display: true, text: 'XRP Performance vs. USD', color: '#fff' },
                annotation: {
                    annotations: { // Visual polish: Example annotation
                        line1: { type: 'line', yMin: values[0], yMax: values[0], borderColor: 'red', borderWidth: 2, label: { content: 'Start', display: true } }
                    }
                }
            }
        }
    });
}

async function loadChart() {
    document.getElementById('loading').style.display = 'block';
    const days = document.getElementById('timeRange').value;
    const invert = document.getElementById('invert').checked;
    const prices = await fetchXRPData(days);
    renderChart(prices, invert);
    document.getElementById('loading').style.display = 'none';
}

document.getElementById('refresh').addEventListener('click', loadChart);
document.getElementById('timeRange').addEventListener('change', loadChart);
document.getElementById('invert').addEventListener('change', loadChart);
loadChart(); // Initial load
