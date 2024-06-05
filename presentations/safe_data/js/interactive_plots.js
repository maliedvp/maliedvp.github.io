let isWelfareEnabled = false; // Control highlighting of integrals
let isEquilibriumLinesVisible = false; // New variable to control visibility of equilibrium lines

function plotDemandSupply(a = 200, c = 0, b = 5, d = 5) {
    let traceDemand = {
        x: [],
        y: [],
        name: 'Demand',
        type: 'scatter',
        mode: 'lines',
        line: {color: 'blue'},
    };

    let traceSupply = {
        x: [],
        y: [],
        name: 'Supply',
        type: 'scatter',
        mode: 'lines',
        line: {color: 'red'},
    };

    // Calculate points for the curves based on inverse functions
    for (let Q = 0; Q <= 300; Q += 10) {
        let pDemand = (a - Q) / b;
        let pSupply = (Q - c) / d;
        traceDemand.x.push(Q);
        traceDemand.y.push(pDemand);
        traceSupply.x.push(Q);
        traceSupply.y.push(pSupply);
    }

    let pEquilibrium = (a-c) / (d+b); 
    let QEquilibrium = a - b*pEquilibrium;

    // Additional traces for shaded areas
    let demandShade = {
        x: [0, QEquilibrium],
        y: [(a - 0) / b, pEquilibrium],
        fill: 'tonexty',
        type: 'scatter',
        mode: 'none',
        fillcolor: 'rgba(0,255,0,0.2)', // soft green
        name: 'Consumer Surplus'
    };

    let supplyShade = {
        x: [0, QEquilibrium],
        y: [0, pEquilibrium],
        fill: 'tonexty',
        type: 'scatter',
        mode: 'none',
        fillcolor: 'rgba(255,165,0,0.2)', // soft orange
        name: 'Producer Surplus'
    };

    let plots = [traceDemand, traceSupply];

    // Add shaded areas if isWelfareEnabled is true
    if (isWelfareEnabled) {
        // Adjust supplyShade to start from the supply curve
        supplyShade.x = [];
        supplyShade.y = [];
        for (let Q = 0; Q <= QEquilibrium; Q += 10) {
            let pSupply = (Q - c) / d;
            supplyShade.x.push(Q);
            supplyShade.y.push(pSupply);
        }
        plots.push(supplyShade, demandShade);
    }

    plots.push({
        x: [QEquilibrium],
        y: [pEquilibrium],
        mode: 'markers',
        marker: {size: 10, color: 'black'},
        name: 'Equilibrium',
        text: [`Equilibrium: Q=${QEquilibrium.toFixed(2)}, P=${pEquilibrium.toFixed(2)}`],
        hoverinfo: 'text+name'
    });

    // Optionally include equilibrium lines based on isEquilibriumLinesVisible
    if (isEquilibriumLinesVisible) {
        plots.push({
            x: [0, QEquilibrium],
            y: [pEquilibrium, pEquilibrium],
            mode: 'lines',
            type: 'scatter',
            line: {color: 'gray', dash: 'dot'},
            name: 'Equilibrium Price'
        },{
            x: [QEquilibrium, QEquilibrium],
            y: [0, pEquilibrium],
            mode: 'lines',
            type: 'scatter',
            line: {color: 'gray', dash: 'dot'},
            name: 'Equilibrium Quantity'
        });
    }

    let layout = {
        xaxis: {title: 'Quantity', range: [0, 220], fixedrange: true},
        yaxis: {title: 'Price', range: [0, 55], fixedrange: true},
        showlegend: false,
        autosize: false,
        width: 1000,
        height: 700,
        font: {
            family: 'Open Sans',
            size: 30,
            color: '#001626'
        }
    };

    Plotly.newPlot('plot', plots, layout);
}

plotDemandSupply();

// slider
document.getElementById('a-slider').addEventListener('input', function() {
    document.getElementById('a-value').textContent = this.value;
    plotDemandSupply(
        parseFloat(this.value), // 'a' slider value
        parseFloat(document.getElementById('c-slider').value),
        parseFloat(document.getElementById('b-slider').value),
        parseFloat(document.getElementById('d-slider').value)
    );
});

document.getElementById('b-slider').addEventListener('input', function() {
    document.getElementById('b-value').textContent = this.value;
    plotDemandSupply(
        parseFloat(document.getElementById('a-slider').value),
        parseFloat(document.getElementById('c-slider').value),
        parseFloat(this.value), // 'b' slider value
        parseFloat(document.getElementById('d-slider').value)
    );
});

document.getElementById('c-slider').addEventListener('input', function() {
    document.getElementById('c-value').textContent = this.value;
    plotDemandSupply(
        parseFloat(document.getElementById('a-slider').value),
        parseFloat(this.value), // 'c' slider value
        parseFloat(document.getElementById('b-slider').value),
        parseFloat(document.getElementById('d-slider').value)
    );
});

document.getElementById('d-slider').addEventListener('input', function() {
    document.getElementById('d-value').textContent = this.value;
    plotDemandSupply(
        parseFloat(document.getElementById('a-slider').value),
        parseFloat(document.getElementById('c-slider').value),
        parseFloat(document.getElementById('b-slider').value),
        parseFloat(this.value), // 'd' slider value
    );
});

// buttons
// PR & KR
document.getElementById('welfare').addEventListener('click', function() {
    isWelfareEnabled = !isWelfareEnabled;
    plotDemandSupply(
        parseFloat(document.getElementById('a-slider').value),
        parseFloat(document.getElementById('c-slider').value),
        parseFloat(document.getElementById('b-slider').value),
        parseFloat(document.getElementById('d-slider').value)
    );
});

// Equlibrium Lines
document.getElementById('toggle-equilibrium-lines').addEventListener('click', function() {
    isEquilibriumLinesVisible = !isEquilibriumLinesVisible;
    plotDemandSupply(
        parseFloat(document.getElementById('a-slider').value),
        parseFloat(document.getElementById('c-slider').value),
        parseFloat(document.getElementById('b-slider').value),
        parseFloat(document.getElementById('d-slider').value)
    );
});