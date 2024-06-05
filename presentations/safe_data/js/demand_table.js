document.addEventListener('DOMContentLoaded', function() {
    const API_KEY = 'AIzaSyBHDca3H6eZVUwVltRmHysDkt5AlTVtEJM';
    const SPREADSHEET_ID = '1W9qk58BUSwfbP-qUjD51tEhwCP2P0iXbBbueUBOqIZs';
    const RANGE = 'results'; // Adjust the range according to your needs

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`)
        .then(response => {
            console.log('HTTP Response:', response);
            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data); // This will log the data object
            if (!data.values || data.values.length === 0) {
                throw new Error('No data found in sheet.');
            }
            const rows = data.values;

            // Generate the first table and insert it
            const container = document.getElementById('data-container_demand_table');
            container.innerHTML = generateTableHTML(rows);
            adjustTableStyles('data-container_demand_table');

            // Generate the second table and insert it
            const thresholdContainer = document.getElementById('threshold-table-container');
            thresholdContainer.innerHTML = generateThresholdTable(rows);
            adjustTableStyles('threshold-table-container');
        })
        .catch(error => console.error('Error:', error));

    function generateTableHTML(rows) {
        // Adjust the header to reflect the new column order
        let headerHtml = '<tr><th>Name</th><th>Max Price (€)</th></tr>';
        
        // Continue extracting and transforming row data as before
        const rowData = rows.slice(1).map(row => ({
            name: row[2], // Adjust if necessary to match your data structure
            // Clean "Max Price (€)" to remove non-numeric characters and parse it as a float
            maxPrice: parseFloat(row[1].replace(/[^0-9.]/g, '')) || 0
        }));

        // Sorting rows by Max Price in descending order remains unchanged
        rowData.sort((a, b) => a.maxPrice - b.maxPrice);

        // Adjust the row construction to match the new column order
        let rowsHtml = rowData.map(row => `<tr><td>${row.name}</td><td>${row.maxPrice}</td></tr>`).join('');

        // Constructing the full table HTML with adjusted column order
        let html = `<table border="1">${headerHtml}${rowsHtml}</table>`;

        return html;
    }

    function generateThresholdTable(rows) {
        // Extracting unique max prices as thresholds
        const uniqueThresholds = [...new Set(rows.slice(1).map(row => parseFloat(row[1].replace(/[^0-9.]/g, ''))))].sort((a, b) => a - b);

        // Counting how many people exceed each threshold
        let thresholdCounts = uniqueThresholds.map(threshold => {
            return {
                threshold: threshold,
                count: rows.slice(1).filter(row => parseFloat(row[1].replace(/[^0-9.]/g, '')) >= threshold).length
            };
        });

        // Now that thresholdCounts is defined, call renderPriceQChart to plot the data
        renderPriceQChart(thresholdCounts); // Make sure this line is after thresholdCounts is fully populated


        // Generating the HTML for the second table
        let html = '<table border="1"><tr><th>Max Price (€)</th><th>Q</th></tr>';

        thresholdCounts.forEach(item => {
            html += `<tr><td>${item.threshold}</td><td>${item.count}</td></tr>`;
        });

        html += '</table>';
        return html;
    }
    function renderPriceQChart(thresholdCounts) {
        const ctx = document.getElementById('priceQChart').getContext('2d');

        // Determine the maximum y value (Price) for setting the y-axis limit
        const maxY = Math.max(...thresholdCounts.map(item => item.threshold)) + 100;

        // Ensure the chart is responsive to data updates
        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Q by Price',
                    data: thresholdCounts.map(item => ({
                        x: item.count,
                        y: item.threshold
                    })),
                    backgroundColor: 'blue',
                    borderColor: 'blue',
                    borderWidth: 2,
                    pointStyle: 'circle',
                    radius: 4,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        ticks: {
                            stepSize: 1,
                            precision: 0,
                            font: {
                                size: 18,
                                weight: 'bold'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Quantity',
                            font: {
                                size: 18,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: maxY, // Suggesting the maximum value for the y-axis
                        ticks: {
                            font: {
                                size: 18,
                                weight: 'bold'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Price',
                            font: {
                                size: 18,
                                weight: 'bold'
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        borderDash: []
                    }
                }
            }
        });
    }
    function adjustTableStyles(containerId) {
        const container = document.getElementById(containerId);
        const tds = container.getElementsByTagName('td');
        for (let td of tds) {
            td.style.padding = '0'; // Remove padding
        }
    }
});