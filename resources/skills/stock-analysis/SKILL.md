---
name: stock-analysis
description: "Stock Analysis & Financial News: analyze stocks, ETFs, and cryptocurrencies using real-time market data from Yahoo Finance. Get price quotes, technical indicators, financial ratios, earnings data, and generate analysis reports. Use when: the user wants to check a stock price, analyze a company's financials, get investment research, understand a stock's performance, read an earnings report, get market news, compare multiple stocks, or analyze a portfolio."
metadata: { "openclaw": { "emoji": "📈" } }
---

## Setup
```bash
pip install yfinance pandas matplotlib
# or:
uv tool install yfinance pandas matplotlib
```

## Core Operations

### Get Stock Quote
```python
import yfinance as yf

ticker = yf.Ticker("AAPL")
info = ticker.info

print(f"Price: ${info['currentPrice']}")
print(f"Market Cap: ${info['marketCap']:,}")
print(f"P/E Ratio: {info.get('trailingPE', 'N/A')}")
print(f"52W High: ${info['fiftyTwoWeekHigh']}")
print(f"52W Low: ${info['fiftyTwoWeekLow']}")
```

### Historical Price Chart
```python
import matplotlib.pyplot as plt

hist = ticker.history(period="1y")  # 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
hist['Close'].plot(title=f"AAPL - 1 Year Price History", figsize=(12,6))
plt.savefig('/tmp/stock_chart.png', dpi=150, bbox_inches='tight')
```

### Financial Ratios
```python
info = ticker.info
metrics = {
    'Revenue': info.get('totalRevenue'),
    'Gross Margin': info.get('grossMargins'),
    'Net Margin': info.get('profitMargins'),
    'ROE': info.get('returnOnEquity'),
    'Debt/Equity': info.get('debtToEquity'),
    'EPS': info.get('trailingEps'),
    'Forward P/E': info.get('forwardPE'),
    'Dividend Yield': info.get('dividendYield'),
}
```

### Compare Multiple Stocks
```python
import pandas as pd

tickers = ["AAPL", "MSFT", "GOOGL"]
data = yf.download(tickers, period="1y")['Close']
data.plot(figsize=(12,6), title="Stock Comparison")
plt.savefig('/tmp/comparison_chart.png', dpi=150)
```

### Latest News
```python
news = ticker.news
for article in news[:5]:
    print(f"- {article['title']} ({article['publisher']})")
    print(f"  {article['link']}")
```

## Analysis Report Template
When the user asks for a stock analysis, produce:
```
## Stock Analysis: <TICKER>
**Current Price**: $X.XX  |  **Change**: +X.XX%

### Key Metrics
| Metric | Value |
|--------|-------|
| Market Cap | $XB |
| P/E Ratio | XX |
| ...

### Price Performance
[Chart image]

### Strengths
- ...

### Risks
- ...

### Summary
[2-3 sentence assessment]
```

## Disclaimer
Always include: "This analysis is for informational purposes only and does not constitute financial advice."
