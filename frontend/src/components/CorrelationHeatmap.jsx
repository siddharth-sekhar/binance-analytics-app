import { useEffect, useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

function CorrelationHeatmap({ symbols, apiBase, timeframe = '1s', minVolume = 0 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbols || symbols.length < 2) return;
    const fetchCorr = async () => {
      try {
        const resp = await axios.get(`${apiBase}/analytics/corr_matrix`, {
          params: { symbols: symbols.join(','), timeframe, min_volume: minVolume }
        });
        setData(resp.data);
        setError(null);
      } catch (e) {
        setError(e.message);
      }
    };
    fetchCorr();
    const t = setInterval(fetchCorr, 10000);
    return () => clearInterval(t);
  }, [symbols, apiBase, timeframe, minVolume]);

  if (!symbols || symbols.length < 2) return null;
  if (error) return <div className="error">❌ {error}</div>;
  if (!data) return null;

  const z = data.matrix || [];
  const labels = data.symbols || symbols;

  return (
    <div className="chart-container">
      <h3 className="chart-title">🧊 Cross-Correlation Heatmap</h3>
      <Plot
        data={[{
          z,
          x: labels.map(s => s.toUpperCase()),
          y: labels.map(s => s.toUpperCase()),
          type: 'heatmap',
          colorscale: 'RdBu',
          zmin: -1,
          zmax: 1,
          reversescale: true
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0.4)',
          font: { color: '#d0d0d0' },
          height: 400
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}

export default CorrelationHeatmap;


