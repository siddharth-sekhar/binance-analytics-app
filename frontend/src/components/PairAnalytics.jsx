import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

function PairAnalytics({ symbolX, symbolY, apiBase, timeframe, rollWindow, minVolume = 0 }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regressionType, setRegressionType] = useState('ols');
  const [adfTrigger, setAdfTrigger] = useState(false);
  const [newAlert, setNewAlert] = useState({ metric: 'zscore', op: '>', threshold: 2 });

  const fetchAnalytics = useCallback(async () => {
    if (!symbolX || !symbolY) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiBase}/analytics/pair`, {
        params: {
          x: symbolX,
          y: symbolY,
          timeframe,
          roll_window: rollWindow,
          regression: regressionType,
          min_volume: minVolume
        }
      });
      
      if (response.data.error) {
        setError(response.data.error);
        setAnalytics(null);
      } else {
        setAnalytics(response.data);
      }
    } catch (err) {
      setError('Failed to fetch analytics: ' + err.message);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [symbolX, symbolY, apiBase, timeframe, rollWindow, regressionType, minVolume]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // Trigger ADF test
  const handleAdfTest = () => {
    setAdfTrigger(true);
    setTimeout(() => setAdfTrigger(false), 2000);
  };

  if (!symbolX || !symbolY) {
    return null;
  }

  if (loading && !analytics) {
    return (
      <div className="chart-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading pair analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="error">❌ {error}</div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare data for charts
  const spreadTimestamps = Object.keys(analytics.spread || {});
  // Backtest equity curve
  const equityTimestamps = Object.keys(analytics.backtest?.equity || {});
  const equityValues = Object.values(analytics.backtest?.equity || {});

  const spreadValues = Object.values(analytics.spread || {});
  const zscoreTimestamps = Object.keys(analytics.zscore || {});
  const zscoreValues = Object.values(analytics.zscore || {});
  const corrTimestamps = Object.keys(analytics.corr || {});
  const corrValues = Object.values(analytics.corr || {});

  // Spread Chart
  const spreadTrace = {
    x: spreadTimestamps,
    y: spreadValues,
    type: 'scatter',
    mode: 'lines',
    name: 'Spread',
    line: { color: '#4fc3f7', width: 2 },
    hovertemplate: 'Time: %{x}<br>Spread: %{y:.4f}<extra></extra>'
  };

  // Z-Score Chart
  const zscoreTrace = {
    x: zscoreTimestamps,
    y: zscoreValues,
    type: 'scatter',
    mode: 'lines',
    name: 'Z-Score',
    line: { color: '#ab47bc', width: 2 },
    hovertemplate: 'Time: %{x}<br>Z-Score: %{y:.4f}<extra></extra>'
  };

  // Upper and lower bands for z-score
  const zscoreUpperBand = {
    x: zscoreTimestamps,
    y: Array(zscoreTimestamps.length).fill(2),
    type: 'scatter',
    mode: 'lines',
    name: 'Upper Band (+2σ)',
    line: { color: 'rgba(239, 83, 80, 0.5)', width: 1, dash: 'dash' }
  };

  const zscoreLowerBand = {
    x: zscoreTimestamps,
    y: Array(zscoreTimestamps.length).fill(-2),
    type: 'scatter',
    mode: 'lines',
    name: 'Lower Band (-2σ)',
    line: { color: 'rgba(38, 166, 154, 0.5)', width: 1, dash: 'dash' }
  };

  const zscoreZeroLine = {
    x: zscoreTimestamps,
    y: Array(zscoreTimestamps.length).fill(0),
    type: 'scatter',
    mode: 'lines',
    name: 'Mean',
    line: { color: 'rgba(255, 255, 255, 0.3)', width: 1, dash: 'dot' }
  };

  // Correlation Chart
  const corrTrace = {
    x: corrTimestamps,
    y: corrValues,
    type: 'scatter',
    mode: 'lines',
    name: 'Rolling Correlation',
    line: { color: '#ffa726', width: 2 },
    fill: 'tozeroy',
    fillcolor: 'rgba(255, 167, 38, 0.2)',
    hovertemplate: 'Time: %{x}<br>Correlation: %{y:.4f}<extra></extra>'
  };

  const chartLayout = {
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0.4)',
    font: { color: '#d0d0d0' },
    xaxis: {
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      color: '#b0b0b0'
    },
    yaxis: {
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      color: '#b0b0b0'
    },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      x: 0,
      y: 1,
      bgcolor: 'rgba(0, 0, 0, 0.5)',
      bordercolor: 'rgba(255, 255, 255, 0.2)',
      borderwidth: 1
    },
    height: 350
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false
  };

  return (
    <div>
      <h2 style={{ color: '#8b7ab8', marginBottom: '1.5rem' }}>
        📈 Pair Analytics: {symbolX?.toUpperCase()} vs {symbolY?.toUpperCase()}
      </h2>

      {/* Hedge Ratio & ADF Stats */}
      <div className="summary-stats" style={{ marginBottom: '2rem' }}>
        <div className="stats-card">
          <h4>Hedge Ratio (β)</h4>
          <div className="value">{analytics.hedge?.beta?.toFixed(6) || 'N/A'}</div>
          <small style={{ color: '#aaa' }}>Regression: {regressionType.toUpperCase()}</small>
        </div>
        
        <div className="stats-card">
          <h4>Intercept (α)</h4>
          <div className="value">{analytics.hedge?.intercept?.toFixed(6) || 'N/A'}</div>
        </div>
        
        <div className="stats-card">
          <h4>R² (Fit Quality)</h4>
          <div className="value">{analytics.hedge?.rsq?.toFixed(4) || 'N/A'}</div>
          <small style={{ color: '#aaa' }}>Higher is better</small>
        </div>
        
        <div className="stats-card">
          <h4>ADF Statistic</h4>
          <div className="value" style={{ 
            color: analytics.adf?.pvalue < 0.05 ? '#26a69a' : '#ef5350' 
          }}>
            {analytics.adf?.stat?.toFixed(4) || 'N/A'}
          </div>
          <small style={{ color: '#aaa' }}>
            p-value: {analytics.adf?.pvalue?.toFixed(4) || 'N/A'}
          </small>
          <button 
            className="button secondary" 
            onClick={handleAdfTest}
            style={{ 
              marginTop: '0.5rem', 
              padding: '0.25rem 0.5rem', 
              fontSize: '0.8rem',
              background: adfTrigger ? '#26a69a' : undefined
            }}
          >
            {adfTrigger ? '✓ Tested' : '🔄 Run ADF Test'}
          </button>
        </div>
        
        <div className="stats-card">
          <h4>Regression</h4>
          <select
            value={regressionType}
            onChange={(e) => setRegressionType(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginTop: '0.5rem',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#d0d0d0',
              borderRadius: '6px'
            }}
          >
            <option value="ols">OLS</option>
            <option value="kalman">Kalman</option>
          </select>
          <button
            className="button secondary"
            style={{ marginTop: '0.5rem' }}
            onClick={() => {
              const url = `${apiBase}/analytics/pair_export?x=${encodeURIComponent(symbolX)}&y=${encodeURIComponent(symbolY)}&timeframe=${encodeURIComponent(timeframe)}&roll_window=${encodeURIComponent(rollWindow)}&regression=${encodeURIComponent(regressionType)}&min_volume=${encodeURIComponent(minVolume)}`;
              window.open(url, '_blank');
            }}
          >
            ⬇️ Download Analytics CSV
          </button>
        </div>
        
        <div className="stats-card">
          <h4>Stationarity</h4>
          <div className="value" style={{ 
            color: analytics.adf?.pvalue < 0.05 ? '#26a69a' : '#ef5350',
            fontSize: '1.2rem'
          }}>
            {analytics.adf?.pvalue < 0.05 ? '✓ Stationary' : '✗ Non-Stationary'}
          </div>
          <small style={{ color: '#aaa' }}>
            {analytics.adf?.pvalue < 0.05 
              ? 'Good for mean reversion'
              : 'May require differencing'}
          </small>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Spread Chart */}
        <div className="chart-container">
          <h3 className="chart-title">📉 Spread (Y - β*X - α)</h3>
          <Plot
            data={[spreadTrace]}
            layout={{
              ...chartLayout,
              title: { text: 'Spread Over Time', font: { color: '#d0d0d0', size: 14 } }
            }}
            config={config}
            style={{ width: '100%' }}
            useResizeHandler={true}
          />
        </div>

        {/* Z-Score Chart */}
        <div className="chart-container">
          <h3 className="chart-title">📊 Z-Score (Rolling {rollWindow} periods)</h3>
          <Plot
            data={[zscoreTrace, zscoreUpperBand, zscoreLowerBand, zscoreZeroLine]}
            layout={{
              ...chartLayout,
              title: { text: 'Z-Score with Bands', font: { color: '#d0d0d0', size: 14 } }
            }}
            config={config}
            style={{ width: '100%' }}
            useResizeHandler={true}
          />
        </div>

        {/* Correlation Chart */}
        <div className="chart-container">
          <h3 className="chart-title">🔗 Rolling Correlation</h3>
          <Plot
            data={[corrTrace]}
            layout={{
              ...chartLayout,
              title: { text: `Rolling Correlation (${rollWindow} periods)`, font: { color: '#d0d0d0', size: 14 } },
              yaxis: {
                ...chartLayout.yaxis,
                range: [-1, 1]
              }
            }}
            config={config}
            style={{ width: '100%' }}
            useResizeHandler={true}
          />
        </div>

        {/* Backtest Equity Curve */}
        <div className="chart-container">
          <h3 className="chart-title">💼 Backtest Equity (Z-Score MR)</h3>
          <Plot
            data={[{
              x: equityTimestamps,
              y: equityValues,
              type: 'scatter',
              mode: 'lines',
              name: 'Equity',
              line: { color: '#26a69a', width: 2 }
            }]}
            layout={{
              ...chartLayout,
              title: { text: 'Equity Curve', font: { color: '#d0d0d0', size: 14 } }
            }}
            config={config}
            style={{ width: '100%' }}
            useResizeHandler={true}
          />
        </div>
      </div>

      {/* Alerts UI */}
      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <div className="summary-stats">
          <div className="stats-card">
            <h4>Create Alert</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <select value={newAlert.metric} onChange={(e) => setNewAlert({ ...newAlert, metric: e.target.value })}>
                <option value="zscore">zscore</option>
                <option value="spread">spread</option>
              </select>
              <select value={newAlert.op} onChange={(e) => setNewAlert({ ...newAlert, op: e.target.value })}>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
              </select>
              <input type="number" value={newAlert.threshold} onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) || 0 })} />
              <button
                className="button"
                onClick={async () => {
                  try {
                    await axios.post(`${apiBase}/alerts`, {
                      symbol_x: symbolX,
                      symbol_y: symbolY,
                      metric: newAlert.metric,
                      op: newAlert.op,
                      threshold: newAlert.threshold
                    });
                    await fetchAnalytics();
                  } catch (e) {}
                }}
              >
                ➕ Add Alert
              </button>
            </div>
          </div>
          <div className="stats-card">
            <h4>Triggered (latest)</h4>
            <div style={{ fontSize: '0.9rem', color: '#b0b0b0' }}>
              {(analytics.alerts || []).length === 0 ? 'None' : (
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {analytics.alerts.map((a, idx) => (
                    <li key={idx}>{a.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#808080'
      }}>
        <strong>📝 Note:</strong> Z-Score bands at ±2σ indicate potential mean reversion opportunities. 
        ADF test p-value &lt; 0.05 suggests the spread is stationary (mean-reverting).
      </div>
    </div>
  );
}

export default PairAnalytics;
