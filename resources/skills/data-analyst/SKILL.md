---
name: data-analyst
description: "Data Analyst Lite: read and analyze CSV and Excel files, perform data cleaning, statistical analysis, and generate visualizations including line charts, bar charts, histograms, and scatter plots. Use when: the user wants to analyze a spreadsheet or CSV file, get statistics on data, clean messy data, find patterns or trends, create charts, summarize a dataset, or perform exploratory data analysis."
metadata: { "openclaw": { "emoji": "📊" } }
---

## Setup
```bash
pip install pandas matplotlib openpyxl seaborn
# or with uv:
uv tool install pandas matplotlib openpyxl seaborn
```

## Core Workflow

### 1. Load Data
```python
import pandas as pd

# CSV
df = pd.read_csv('/path/to/file.csv')

# Excel
df = pd.read_excel('/path/to/file.xlsx', sheet_name='Sheet1')
```

### 2. Explore Dataset
```python
# Overview
print(df.shape)          # rows, columns
print(df.dtypes)         # column types
print(df.head(10))       # first 10 rows
print(df.describe())     # statistical summary
print(df.isnull().sum()) # missing values per column
```

### 3. Data Cleaning
```python
# Remove duplicates
df = df.drop_duplicates()

# Fill missing values
df['column'].fillna(df['column'].mean(), inplace=True)

# Remove rows with any null
df = df.dropna()

# Convert column types
df['date_col'] = pd.to_datetime(df['date_col'])
df['num_col'] = pd.to_numeric(df['num_col'], errors='coerce')
```

### 4. Statistical Analysis
```python
# Group and aggregate
summary = df.groupby('category')['value'].agg(['mean', 'sum', 'count'])

# Correlation matrix
corr = df.corr()

# Value counts
df['column'].value_counts()
```

### 5. Generate Charts
```python
import matplotlib.pyplot as plt
import seaborn as sns

# Line chart
df.plot(x='date', y='value', kind='line')
plt.savefig('/tmp/chart.png', dpi=150, bbox_inches='tight')

# Bar chart
df.groupby('category')['value'].sum().plot(kind='bar')
plt.savefig('/tmp/bar_chart.png', dpi=150, bbox_inches='tight')

# Histogram
df['value'].hist(bins=20)
plt.savefig('/tmp/histogram.png', dpi=150, bbox_inches='tight')
```

## Workflow with User
1. Ask user to provide file path (or drag & drop)
2. Load and show basic info (shape, column names, dtypes)
3. Ask what analysis is needed
4. Run analysis with Python, save charts to /tmp/
5. Present findings in a clear summary
6. Offer to export results to CSV/Excel
