import pandas as pd
import numpy as np
from bs4 import BeautifulSoup

def winsorize(series):

    bound_lower = series.quantile(0.02)
    bound_upper = series.quantile(0.98)

    series = np.where(
        series <= bound_lower,
        bound_lower,
        series
    )

    series = np.where(
        series >= bound_upper,
        bound_upper,
        series
    )

    return series


def format_thousands(x):
    if isinstance(x, (int, float)):
        return f"{x:,}"
    return x


# Load data
df = pd.read_csv('/Users/mariusliebald/Library/CloudStorage/Dropbox-LSWalz/Marius Karlsson/PhD/08_war_network/01_data/01_original/02_hdag/20240604_2234/companies.csv', low_memory=False)
df['count'] = 1

print('No Observations: {}'.format(len(df)))
print('No of balance sheet: {}'.format(len(df[df['bs_item_id'].notna()])))
print('Share of correct balance sheets: {}'.format(
        len(
            df[df['bs_sum_correct_2']==1]
        )
        /
        len(
            df[df['bs_item_id'].notna()]
        )
    )
)

df_count = df.groupby('year').agg({'count':'size'}).reset_index(drop=False)


















#########################################
#########################################
############## FINANCIALS ###############
#########################################
#########################################

df_fin = df[
    (df['bs_sum_correct_2']==1)
    &
    (df['pl_sum_correct_2']==1)
][['year', 'bs_sum','bs_cash_ratio','bs_ppe_ratio','bs_patent_ratio', 'bs_equity_ratio','fin_roa']]

for col in list(df_fin):
    if col != 'year':
        df_fin[col] = winsorize(df_fin[col])

df_fin = df_fin.groupby('year').agg(
    {
        'bs_sum':'mean', 
        'bs_cash_ratio':'mean',
        'bs_ppe_ratio': 'mean',
        'bs_patent_ratio':'mean',
        'bs_equity_ratio': 'mean',
        'fin_roa': 'mean',
    },
).reset_index(drop=False)

df_fin['year'] = df_fin['year'].astype(str).str.replace(r'\..*','')

df_fin = pd.concat(
    [df_fin, 
        pd.DataFrame({
        'year':['Mean'],
        'bs_sum': [df_fin['bs_sum'].mean()],
        'bs_cash_ratio':[df_fin['bs_cash_ratio'].mean()],
        'bs_ppe_ratio': [df_fin['bs_ppe_ratio'].mean()],
        'bs_patent_ratio': [df_fin['bs_patent_ratio'].mean()],
        'bs_equity_ratio': [df_fin['bs_equity_ratio'].mean()],
        'fin_roa': [df_fin['fin_roa'].mean()],
        })
    ], axis=0, ignore_index=True
)

# Export
## df_fin
### Convert DataFrame to HTML
html_table = df_fin.to_html(classes='styled-table', index=False)

# Define custom CSS classes for column alignment
css_styles = """
<style>
.styled-table {
    border-collapse: collapse;
    margin: 25px 0;
    font-size: 22px;
    font-family: sans-serif;
    min-width: 200px;
    border: none;
}
.styled-table th, .styled-table td {
    border: none;
    padding: 5px 15px;
}
.styled-table thead th {
    border-top: 2px solid #000000;
    border-bottom: 2px solid #000000;
}
.styled-table tbody tr:first-of-type td {
    border-top: 2px solid #000000;
}
.styled-table tbody tr:last-of-type td {
    border-bottom: 2px solid #000000;
}
.styled-table tbody tr:nth-last-of-type(2) td {
    border-bottom: 2px solid #000000;
}
.align-left {
    text-align: left;
}
.align-center {
    text-align: center;
}
.align-right {
    text-align: right;
}
</style>
"""

# Parse the HTML table with BeautifulSoup
soup = BeautifulSoup(html_table, 'html.parser')

# Apply alignment classes to specific columns
for th in soup.find_all('th'):
    th['class'] = 'align-center'

for row in soup.find_all('tr'):
    cells = row.find_all('td')
    if cells:
        cells[0]['class'] = 'align-left'   # First column
        cells[1]['class'] = 'align-left' # Second column
        cells[2]['class'] = 'align-right'  # Third column
        cells[2]['class'] = 'align-right'  # Third column

# Convert the modified soup back to HTML
html_table = str(soup)

# Combine CSS and HTML
html = f"""
<html>
<head>
{css_styles}
</head>
<body>
<div style="display: flex; justify-content: center;">
{html_table}
</div>
</body>
</html>
"""

# Write to an HTML file
with open('df_fin.html', 'w') as file:
    file.write(html)





























#########################################
#########################################
##############  INDUSTRY  ###############
#########################################
#########################################

df_ind = df.groupby('industry_nace').agg({'count':'size'}).reset_index(drop=False)
df_ind_sum = df_ind['count'].sum()
df_ind['share'] = df_ind['count']/df_ind_sum
df_ind = df_ind.sort_values('share', ascending=False).reset_index(drop=True)
nace_dict = {
    'A':'Agriculture, Forestry and Fishing',
    'B':'Mining and Quarrying',
    'C':'Manufacturing',
    'D':'Electricity, Gas, Steam and Air Conditioning Supply',
    'E':'Water Supply; Sewerage, Waste Management and Remediation Activities',
    'F':'Construction',
    'G':'Wholesale and Retail Trade; Repair of Motor Vehicles and Motorcycles',
    'H':'Transportation and Storage',
    'I':'Accommodation and Food Service Activities',
    'J':'Information and Communication',
    'K':'Financial and Insurance Activities',
    'L':'Real Estate Activities',
    'M':'Professional, Scientific and Technical Activities',
    'O':'Public Administration and Defence; Compulsory Social Security',
    'Q':'Human Health and Social Work Activities',
    'R':'Arts, Entertainment and Recreation',
    'S': 'Other Service Activities'
}
df_ind.insert(1, 'industry_nace_name', df_ind['industry_nace'].map(nace_dict))
df_ind = pd.concat(
    [df_ind, 
        pd.DataFrame({
        'industry_nace':['Total'],
        'industry_nace_name':[''],
        'share': [df_ind['share'].sum()],
        'count': [df_ind['count'].sum()],
        })
    ], axis=0, ignore_index=True
)


# Apply formatting to the DataFrame using map
df_ind['count'] = df_ind['count'].map(format_thousands)

# Export
## df_fin
### Convert DataFrame to HTML
html_table = df_ind.to_html(classes='styled-table', index=False)

# Define custom CSS classes for column alignment
css_styles = """
<style>
.styled-table {
    border-collapse: collapse;
    margin: 25px 0;
    font-size: 22px;
    font-family: sans-serif;
    min-width: 200px;
    border: none;
}
.styled-table th, .styled-table td {
    border: none;
    padding: 5px 15px;
}
.styled-table thead th {
    border-top: 2px solid #000000;
    border-bottom: 2px solid #000000;
}
.styled-table tbody tr:first-of-type td {
    border-top: 2px solid #000000;
}
.styled-table tbody tr:last-of-type td {
    border-bottom: 2px solid #000000;
}
.styled-table tbody tr:nth-last-of-type(2) td {
    border-bottom: 2px solid #000000;
}
.align-left {
    text-align: left;
}
.align-center {
    text-align: center;
}
.align-right {
    text-align: right;
}
</style>
"""

# Parse the HTML table with BeautifulSoup
soup = BeautifulSoup(html_table, 'html.parser')

# Apply alignment classes to specific columns
for th in soup.find_all('th'):
    th['class'] = 'align-center'

for row in soup.find_all('tr'):
    cells = row.find_all('td')
    if cells:
        cells[0]['class'] = 'align-left'   # First column
        cells[1]['class'] = 'align-left' # Second column
        cells[2]['class'] = 'align-right'  # Third column
        cells[2]['class'] = 'align-right'  # Third column

# Convert the modified soup back to HTML
html_table = str(soup)

# Combine CSS and HTML
html = f"""
<html>
<head>
{css_styles}
</head>
<body>
<div style="display: flex; justify-content: center;">
{html_table}
</div>
</body>
</html>
"""

# Write to an HTML file
with open('df_ind.html', 'w') as file:
    file.write(html)
