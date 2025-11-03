import Plot from 'react-plotly.js';

function PriceChart({ symbol, data, timeframe, apiBase }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">💹 Price Chart - {symbol?.toUpperCase()}</h3>
        <div className="loading">No data available</div>
      </div>
    );
  }

  // Prepare data for candlestick chart
  const timestamps = data.map(d => d.ts);
  const opens = data.map(d => d.open);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  const candlestickTrace = {
    x: timestamps,
    open: opens,
    high: highs,
    low: lows,
    close: closes,
    type: 'candlestick',
    name: symbol?.toUpperCase(),
    increasing: { line: { color: '#26a69a' } },
    decreasing: { line: { color: '#ef5350' } },
    xaxis: 'x',
    yaxis: 'y'
  };

  const volumeTrace = {
    x: timestamps,
    y: volumes,
    type: 'bar',
    name: 'Volume',
    marker: {
      color: volumes.map((v, i) => 
        i > 0 && closes[i] > closes[i-1] ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      )
    },
    xaxis: 'x',
    yaxis: 'y2'
  };

  const layout = {
    title: {
      text: `${symbol?.toUpperCase()} - ${timeframe} Timeframe`,
      font: { color: '#d0d0d0', size: 16 }
    },
    xaxis: {
      title: 'Time',
      rangeslider: { visible: false },
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      color: '#b0b0b0'
    },
    yaxis: {
      title: 'Price',
      domain: [0.3, 1],
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      color: '#b0b0b0'
    },
    yaxis2: {
      title: 'Volume',
      domain: [0, 0.2],
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      color: '#b0b0b0'
    },
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0.4)',
    font: { color: '#d0d0d0' },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      x: 0,
      y: 1,
      bgcolor: 'rgba(0, 0, 0, 0.5)',
      bordercolor: 'rgba(255, 255, 255, 0.2)',
      borderwidth: 1
    },
    dragmode: 'zoom',
    height: 500
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'eraseshape'],
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  };

  return (
    <div className="chart-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="chart-title">💹 Price Chart - {symbol?.toUpperCase()}</h3>
        <button
          className="button secondary"
          onClick={() => {
            if (!symbol) return;
            const url = `${apiBase}/export/${symbol}?timeframe=${encodeURIComponent(timeframe)}`;
            window.open(url, '_blank');
          }}
        >
          ⬇️ Download CSV
        </button>
      </div>
      <Plot
        data={[candlestickTrace, volumeTrace]}
        layout={layout}
        config={config}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}

export default PriceChart;
