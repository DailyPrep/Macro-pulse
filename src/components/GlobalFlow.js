import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const SCOPE_CONFIG = {
  asia:   { label: 'ASIAN SCOPE',    color: '#00ff00', endpoint: '/api/regional-data/asia',   corridor: 'HKEX-to-LSE Corridor',        exchangeId: 'HKEX-TRF' },
  europe: { label: 'EUROPEAN SCOPE', color: '#ffaa00', endpoint: '/api/regional-data/europe', corridor: 'EU-to-MENA Energy Link',       exchangeId: 'LSE-TRF'  },
  mena:   { label: 'MENA SCOPE',     color: '#ff4444', endpoint: '/api/regional-data/mena',   corridor: 'Strait of Hormuz Bottleneck',  exchangeId: 'DFM-TRF'  },
  latam:  { label: 'LATAM SCOPE',    color: '#a855f7', endpoint: '/api/regional-data/latam',  corridor: 'LATAM-to-EU Energy Link',      exchangeId: 'B3-TRF'   },
};

const VIRTUAL_LIMIT = 15;
const REFRESH_MS = 300000;

const ArticleRow = React.memo(({ item, config, onHover, isHovered, scopeKey }) => {
  const url   = item.url || item.link || item.guid || '#';
  const title = item.title || item.headline || 'No title';
  const source = item.source || 'Unknown';
  const level = item.level || 'STANDARD';
  const ts    = item.timestamp || item.datetime || item.pubDate;

  const time = (() => {
    try {
      if (!ts) return 'now';
      const d = new Date(ts);
      const ny = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      let hours = ny.getHours();
      const minutes = ny.getMinutes().toString().padStart(2,'0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      return `${hours}:${minutes} ${ampm} ${months[ny.getMonth()]} ${ny.getDate()}`;
    } catch { return 'now'; }
  })();

  const isCritical  = level === 'CRITICAL';
  const isImportant = level === 'IMPORTANT';
  const dotColor   = isCritical ? '#ff0000' : isImportant ? '#ffbf00' : config.color;
  const borderLeft = isCritical ? '3px solid #ff0000' : isImportant ? '3px solid #ffbf00' : `2px solid ${config.color}22`;
  const bg         = isCritical ? 'rgba(255,0,0,0.05)' : isImportant ? 'rgba(255,191,0,0.05)' : 'transparent';

  return (
    <div
      onClick={() => url !== '#' && window.open(url, '_blank')}
      onMouseEnter={() => onHover(item)}
      onMouseLeave={() => onHover(null)}
      style={{ padding: '10px 12px', borderBottom: '1px solid #111', borderLeft, background: isHovered ? 'rgba(255,255,255,0.04)' : bg, cursor: url !== '#' ? 'pointer' : 'default', transition: 'background 0.15s', overflow: 'hidden', maxHeight: 80 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, marginTop: 4, flexShrink: 0, boxShadow: isCritical ? '0 0 8px #f00' : isImportant ? '0 0 6px #ffbf00' : 'none', animation: isCritical ? 'pulse-dot 1.5s infinite' : 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: 11, lineHeight: 1.4, margin: 0, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{title}</p>
          <div style={{ display: 'flex', gap: 8, fontSize: 9, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#666' }}>{time}</span>
            <span style={{ color: config.color, background: `${config.color}15`, padding: '1px 5px', borderRadius: 2 }}>{source}</span>
            {isCritical  && <span style={{ color: '#f00',    fontWeight: 700, fontSize: 8 }}>● CRITICAL</span>}
            {isImportant && <span style={{ color: '#ffbf00', fontWeight: 700, fontSize: 8 }}>● IMPORTANT</span>}
          </div>
        </div>
      </div>
      {isHovered && (
        <div style={{ marginTop: 6, padding: '5px 8px', background: 'rgba(0,0,0,0.7)', border: `1px solid ${config.color}44`, fontSize: 8.5, color: '#888', lineHeight: 1.4, fontFamily: 'monospace' }}>
          <span style={{ color: config.color }}>EXCHANGE:</span> {config.exchangeId} &nbsp;|&nbsp;
          <span style={{ color: config.color }}>CORRIDOR:</span> {config.corridor}
        </div>
      )}
    </div>
  );
});

const ScopePanel = React.memo(({ scopeKey, config, data, lastUpdate, onRefresh }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const articles   = data.articles || [];
  const visible    = useMemo(() => articles.slice(0, VIRTUAL_LIMIT), [articles]);
  const cacheCount = Math.max(0, articles.length - VIRTUAL_LIMIT);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${config.color}33`, background: '#000' }}>

      {/* PANEL HEADER — label + LIVE + refresh only */}
      <div style={{ height: 40, flexShrink: 0, background: '#050505', borderBottom: `1px solid ${config.color}33`, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: config.color, letterSpacing: 1, fontFamily: 'monospace' }}>
          {config.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!data.loading && articles.length > 0 && (
            <span style={{ fontSize: 8, fontWeight: 700, color: config.color, border: `1px solid ${config.color}`, padding: '2px 6px', letterSpacing: 1 }}>LIVE</span>
          )}
          <button onClick={onRefresh} disabled={data.loading} style={{ background: 'transparent', border: 'none', cursor: data.loading ? 'wait' : 'pointer', color: '#555', fontSize: 12, padding: '0 4px' }} title="Refresh">⟳</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="scope-scroller">
        {data.loading && articles.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#333', fontSize: 11, fontFamily: 'monospace' }}>SYNCHRONIZING {config.label}...</div>
        ) : data.error && articles.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#ff4444', fontSize: 11, fontFamily: 'monospace' }}>{data.error}</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#333', fontSize: 11, fontFamily: 'monospace' }}>AWAITING_FEED...</div>
        ) : visible.map((item, i) => (
          <ArticleRow key={item.url || item.link || `${scopeKey}-${i}`} item={item} scopeKey={scopeKey} config={config} onHover={setHoveredItem} isHovered={hoveredItem === item} />
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ height: 22, flexShrink: 0, background: '#050505', borderTop: '1px solid #111', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 8, color: '#444', fontFamily: 'monospace' }}>
        <span>{articles.length} articles{cacheCount > 0 ? ` (${cacheCount} cached, ${VIRTUAL_LIMIT} rendered)` : ''}</span>
        <span>Updated: {(() => {
          const nyTime = new Date(lastUpdate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          let hours = nyTime.getHours();
          const minutes = nyTime.getMinutes().toString().padStart(2, '0');
          const seconds = nyTime.getSeconds().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${hours}:${minutes}:${seconds} ${ampm} ET`;
        })()}</span>
      </div>
    </div>
  );
});

const GlobalFlow = ({ refreshTrigger = 0 }) => {
  const [scopeData, setScopeData] = useState({
    asia:   { articles: [], error: null, loading: true },
    europe: { articles: [], error: null, loading: true },
    mena:   { articles: [], error: null, loading: true },
    latam:  { articles: [], error: null, loading: true },
  });
  const [lastRefresh, setLastRefresh] = useState({
    asia: new Date(), europe: new Date(), mena: new Date(), latam: new Date()
  });

  const fetchScope = useCallback(async (key) => {
    const config = SCOPE_CONFIG[key];
    try {
      setScopeData(prev => ({ ...prev, [key]: { ...prev[key], loading: true } }));
      const res = await axios.get(config.endpoint, { timeout: 15000 });
      if (res.data?.status === 'success') {
        const arts = (res.data.data || []).sort((a, b) => new Date(b.timestamp || b.datetime || b.pubDate || 0) - new Date(a.timestamp || a.datetime || a.pubDate || 0));
        setScopeData(prev => ({ ...prev, [key]: { articles: arts, error: null, loading: false } }));
        setLastRefresh(prev => ({ ...prev, [key]: new Date() }));
      } else {
        setScopeData(prev => ({ ...prev, [key]: { ...prev[key], error: res.data?.message || 'No data', loading: false } }));
      }
    } catch (err) {
      setScopeData(prev => ({ ...prev, [key]: { ...prev[key], error: err.message || 'SIGNAL_INTERRUPTED', loading: false } }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all(Object.keys(SCOPE_CONFIG).map(k => fetchScope(k)));
  }, [fetchScope]);

  useEffect(() => { refreshAll(); }, []);
  useEffect(() => { if (refreshTrigger > 0) refreshAll(); }, [refreshTrigger]);
  useEffect(() => { const id = setInterval(refreshAll, REFRESH_MS); return () => clearInterval(id); }, [refreshAll]);

  return (
    <div style={{ height: '100vh', width: '100%', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Roboto Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .scope-scroller::-webkit-scrollbar { width: 4px; }
        .scope-scroller::-webkit-scrollbar-track { background: #000; }
        .scope-scroller::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .scope-scroller::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>

      {/* 4-PANEL GRID — fills entire viewport, no top bar */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, padding: 2, minHeight: 0, overflow: 'hidden' }}>
        {Object.entries(SCOPE_CONFIG).map(([key, config]) => (
          <div key={key} style={{ position: 'relative', overflow: 'hidden' }}>
            <ScopePanel scopeKey={key} config={config} data={scopeData[key]} lastUpdate={lastRefresh[key]} onRefresh={() => fetchScope(key)} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalFlow;
