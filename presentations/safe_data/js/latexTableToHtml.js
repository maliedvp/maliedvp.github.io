function convertLatexTableToHTML(latex) {
    // Remove LaTeX table environment wrappers and split into rows
    const rows = latex.replace(/\\begin{tabular}{.*?}|\\end{tabular}/g, '')
                      .trim()
                      .split(/\\\\/).map(row => row.trim());

    let html = '<table>';

    rows.forEach(row => {
        let htmlRow = '<tr>';
        // Split row into cells
        const cells = row.split('&').map(cell => cell.trim());
        cells.forEach(cell => {
            htmlRow += `<td>${cell}</td>`;
        });
        htmlRow += '</tr>';
        html += htmlRow;
    });

    html += '</table>';
    return html;
}