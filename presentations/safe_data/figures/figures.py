import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

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


#########################################
#########################################
##############    count   ###############
#########################################
#########################################
df_count = df.groupby('year').agg({'count':'size'}).reset_index(drop=False)


fig = px.bar(
    df_count, 
    x='year', 
    y='count',
    labels={
        'count':'Observations per Year',
        'year':'Year',
    },
    text_auto='.3s'
)

fig.update_layout(
    plot_bgcolor='#ffffff',
    # font_family="Courier New",
    font_color="#001626",
    font=dict(size=20)
)
fig.update_xaxes(
    mirror=True,
    ticks='outside',
    showline=False,
    linecolor='black',
    gridcolor=None
)
fig.update_yaxes(
    mirror=True,
    ticks='outside',
    showline=True,
    linecolor=None,
    gridcolor='lightgrey'
)

fig.update_traces(
    marker_color='#425f73', 
    marker_line_color='#001626',
    marker_line_width=1.5, 
    opacity=0.9
)


fig.write_html("counts.html")













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

df_fin['year'] = df_fin['year'].astype(int)


  
  
fig = go.Figure() 
  
fig.add_trace(
    go.Scatter( 
        name = 'Cash', 
        x = df_fin['year'], 
        y = df_fin['bs_cash_ratio'], 
        stackgroup='one',
        marker = {'color' : '#425f73'}
    )
) 
  
fig.add_trace(
    go.Scatter( 
        name = 'PPE', 
        x = df_fin['year'], 
        y = df_fin['bs_ppe_ratio'], 
        stackgroup='one',
        marker = {'color' : '#001626'}    
    )
)

fig.add_trace(
    go.Scatter( 
        name = 'Patents', 
        x = df_fin['year'], 
        y = df_fin['bs_patent_ratio'], 
        stackgroup='one',
        marker = {'color' : 'red'}
    ) 
) 

fig.update_layout(
    plot_bgcolor='#ffffff',
    # font_family="Courier New",
    font_color="#001626",
    font=dict(size=20),
    title=dict(text="Assets"),
    legend=dict(
        yanchor="top",
        y=0.935,
        xanchor="right",
        x=1
    ),
    yaxis=dict(title='Percentage of Total Assets')
)
fig.update_xaxes(
    mirror=True,
    ticks='outside',
    showline=False,
    linecolor='black',
    gridcolor=None
)
fig.update_yaxes(
    mirror=True,
    ticks='outside',
    showline=True,
    linecolor=None,
    gridcolor='lightgrey'
)

fig.update_traces(
    # marker_color='#425f73', 
    # marker_line_color='#001626',
    marker_line_width=1.5, 
    opacity=0.9
)

fig.write_html("bs_assets.html")





fig = go.Figure() 
  
fig.add_trace(
    go.Scatter( 
        name = 'Equity Ratio', 
        x = df_fin['year'], 
        y = df_fin['bs_equity_ratio'], 
        stackgroup='one',
        marker = {'color' : 'gold'}
    )
) 

fig.update_layout(
    plot_bgcolor='#ffffff',
    # font_family="Courier New",
    font_color="#001626",
    font=dict(size=20),
    title=dict(text="Equity")
)

fig.update_xaxes(
    mirror=True,
    ticks='outside',
    showline=False,
    linecolor='black',
    gridcolor=None
)

fig.update_yaxes(
    mirror=True,
    ticks='outside',
    showline=True,
    linecolor=None,
    gridcolor='lightgrey'
)

fig.update_traces(
    # marker_color='#425f73', 
    # marker_line_color='#001626',
    marker_line_width=1.5, 
    opacity=0.9
)

fig.write_html("bs_equity.html")
















def extract_first_digits(x):
    x_str = str(x)
    return int(x_str[:2]) if x >= 10 else int(x_str[:1])

# Apply the function to the 'integers' column
df['volume'] = df['volume'].apply(extract_first_digits)

df['id_merge_previous'] = np.where(df['company_id'] != df['company_id_harm'], 1, 0)

# Group and prepare data for plotting
dfp_help = df.groupby(by=['volume', 'id_merge_previous']).agg({'count': 'sum'}).reset_index()
mux = pd.MultiIndex.from_product(
    [
        df['volume'].unique(),
        df['id_merge_previous'].unique()
    ],
    names=['volume', 'id_merge_previous']
)


dfp = pd.DataFrame(index=mux).reset_index(drop=False)
dfp = pd.merge(dfp, dfp_help, on=['volume', 'id_merge_previous'], how='left')
dfp['count'] = dfp['count'].fillna(0)

# Create Plotly figure
fig = go.Figure()

# Add bars for 'no LINK to previous observations'
fig.add_trace(go.Bar(
    x=dfp[dfp['id_merge_previous'] == 0]['volume'],
    y=dfp[dfp['id_merge_previous'] == 0]['count'],
    name='No LINK to previous observations',
    marker_color='red'
))

# Add bars for 'LINK to previous observations'
fig.add_trace(go.Bar(
    x=dfp[dfp['id_merge_previous'] == 1]['volume'],
    y=dfp[dfp['id_merge_previous'] == 1]['count'],
    name='LINK to previous observations',
    marker_color='green'
))

# Update layout
fig.update_layout(
    barmode='stack',
    title='Observations Linked to Previous Volume',
    xaxis_title='Volume',
    yaxis_title='Count',
    legend=dict(
        yanchor="top",
        y=0.935,
        xanchor="left",
        x=.05
    ),
    plot_bgcolor='#ffffff',
    # font_family="Courier New",
    font_color="#001626",
    font=dict(size=20),
)

fig.update_xaxes(
    mirror=True,
    ticks='outside',
    showline=False,
    linecolor='black',
    gridcolor=None
)

fig.update_yaxes(
    mirror=True,
    ticks='outside',
    showline=True,
    linecolor=None,
    gridcolor='lightgrey'
)

fig.write_html("id_found.html")













# Aggregating the data
dfp = df.groupby('company_id_harm').agg(start=('volume', 'min'), end=('volume', 'max'))
dfp['duration'] = dfp['end'] - dfp['start']
dfp = dfp.sort_values(by=['start', 'duration'], ascending=[True, False]).reset_index(drop=False)

# Create lists to hold the line and point data
line_x = []
line_y = []
point_x = []
point_y = []

# Prepare data for plotting
for idx in dfp.index:
    if dfp.loc[idx, 'duration'] > 0:
        line_x.extend([dfp.loc[idx, 'start'], dfp.loc[idx, 'end'], None])  # None is to break the line between segments
        line_y.extend([idx + 1, idx + 1, None])
    else:
        point_x.append(dfp.loc[idx, 'start'])
        point_y.append(idx + 1)

# Create Plotly figure
fig = go.Figure()

# Add lines trace with Scattergl
fig.add_trace(go.Scattergl(
    x=line_x,
    y=line_y,
    mode='lines',
    line=dict(width=0.5, color='blue'),
    showlegend=False
))

# Add points trace with Scattergl
fig.add_trace(go.Scattergl(
    x=point_x,
    y=point_y,
    mode='markers',
    marker=dict(color='red', size=2),
    showlegend=False
))

# Update layout
fig.update_layout(
    title='"Duration" of Company IDs',
    xaxis_title='Volume',
    yaxis_title='Count',
    plot_bgcolor='#ffffff',
    font_color="#001626",
    font=dict(size=20),
)

fig.update_xaxes(
    mirror=True,
    ticks='outside',
    showline=False,
    linecolor='black',
    gridcolor=None
)

fig.update_yaxes(
    mirror=True,
    ticks='outside',
    showline=True,
    linecolor=None,
    gridcolor='lightgrey'
)

fig.write_html("id_duration.html")