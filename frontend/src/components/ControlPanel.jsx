function ControlPanel({
  symbols,
  selectedSymbols,
  onSymbolSelect,
  timeframe,
  onTimeframeChange,
  rollWindow,
  onRollWindowChange,
  minVolume,
  onMinVolumeChange,
  onRefresh,
  loading
}) {
  return (
    <div className="control-panel">
      <h2 style={{ marginBottom: '1rem', color: '#8b7ab8' }}>Control Panel</h2>
      
      <div className="control-group">
        {/* Symbol Selection */}
        <div className="control-item">
          <label>Select Symbols</label>
          <select 
            multiple 
            value={selectedSymbols}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              selected.forEach(sym => {
                if (!selectedSymbols.includes(sym)) {
                  onSymbolSelect(sym);
                }
              });
            }}
            style={{ minHeight: '100px' }}
          >
            {symbols.map(symbol => (
              <option key={symbol} value={symbol}>
                {symbol.toUpperCase()} {selectedSymbols.includes(symbol) ? '✓' : ''}
              </option>
            ))}
          </select>
          <small style={{ color: '#aaa', fontSize: '0.8rem' }}>
            Hold Ctrl/Cmd to select multiple
          </small>
        </div>

        {/* Timeframe Selection (restricted) */}
        <div className="control-item">
          <label>Timeframe</label>
          <select value={timeframe} onChange={(e) => onTimeframeChange(e.target.value)}>
            <option value="1s">1 second</option>
            <option value="1min">1 minute</option>
            <option value="5min">5 minutes</option>
          </select>
        </div>

        {/* Rolling Window */}
        <div className="control-item">
          <label>Rolling Window (periods)</label>
          <input
            type="number"
            value={rollWindow}
            onChange={(e) => onRollWindowChange(parseInt(e.target.value) || 60)}
            min="10"
            max="500"
          />
          <small style={{ color: '#aaa', fontSize: '0.8rem' }}>
            For Z-Score & Correlation
          </small>
        </div>

        {/* Min Volume Filter */}
        <div className="control-item">
          <label>Min Volume (liquidity filter)</label>
          <input
            type="number"
            value={minVolume}
            onChange={(e) => onMinVolumeChange(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.0001"
          />
          <small style={{ color: '#aaa', fontSize: '0.8rem' }}>
            Filter bars below this volume
          </small>
        </div>

        {/* Refresh Button */}
        <div className="control-item" style={{ justifyContent: 'flex-end' }}>
          <button 
            className="button" 
            onClick={onRefresh}
            disabled={loading}
            style={{ marginTop: 'auto' }}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Selected Symbols Display */}
      {selectedSymbols.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <small style={{ color: '#aaa' }}>Selected: </small>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {selectedSymbols.map(symbol => (
              <span
                key={symbol}
                style={{
                  background: 'rgba(107, 91, 149, 0.2)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(107, 91, 149, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {symbol.toUpperCase()}
                <button
                  onClick={() => onSymbolSelect(symbol)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0',
                    lineHeight: '1'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
