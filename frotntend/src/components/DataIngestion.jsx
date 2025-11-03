import { useState } from 'react';
import axios from 'axios';

function DataIngestion({ apiBase, onSymbolsUpdate }) {
  const [wsSymbols, setWsSymbols] = useState('btcusdt,ethusdt');
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState('');

  const handleStartWebSocket = async () => {
    if (!wsSymbols.trim()) {
      setMessage('❌ Please enter at least one symbol');
      return;
    }

    setIngesting(true);
    setMessage('');
    
    try {
      const symbols = wsSymbols.split(',').map(s => s.trim()).filter(Boolean);
      const response = await axios.post(`${apiBase}/ingest/start`, {
        mode: 'ws',
        symbols
      });

      if (response.data.status === 'ok') {
        setMessage(`✅ Successfully started WebSocket ingestion for: ${symbols.join(', ')}`);
        setTimeout(() => onSymbolsUpdate(), 2000); // Refresh symbols after 2 seconds
      } else {
        setMessage(`❌ Error: ${response.data.msg}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="ingestion-panel">
      <h2 style={{ marginBottom: '2rem', color: '#8b7ab8' }}>📥 Data Ingestion (WebSocket Only)</h2>

      {message && (
        <div 
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: message.startsWith('✅') 
              ? 'rgba(38, 166, 154, 0.2)' 
              : 'rgba(239, 83, 80, 0.2)',
            border: `1px solid ${message.startsWith('✅') 
              ? 'rgba(38, 166, 154, 0.5)' 
              : 'rgba(239, 83, 80, 0.5)'}`
          }}
        >
          {message}
        </div>
      )}

      {/* WebSocket Ingestion */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#d0d0d0' }}>🌐 Live WebSocket Ingestion</h3>
        <p style={{ color: '#808080', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Start real-time data ingestion from Binance WebSocket streams. Enter symbol pairs separated by commas.
        </p>
        
        <div className="control-group">
          <div className="control-item">
            <label>Symbol Pairs (comma-separated)</label>
            <input
              type="text"
              value={wsSymbols}
              onChange={(e) => setWsSymbols(e.target.value)}
              placeholder="e.g., btcusdt,ethusdt,bnbusdt"
              style={{ textTransform: 'lowercase' }}
            />
            <small style={{ color: '#aaa', fontSize: '0.85rem' }}>
              Examples: btcusdt, ethusdt, bnbusdt, adausdt, solusdt
            </small>
          </div>
        </div>

        <button
          className="button"
          onClick={handleStartWebSocket}
          disabled={ingesting}
          style={{ marginTop: '1rem' }}
        >
          {ingesting ? '⏳ Starting...' : '🚀 Start WebSocket Ingestion'}
        </button>
      </div>
    </div>
  );
}

export default DataIngestion;
