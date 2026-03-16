import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ErrorBoundary from './ErrorBoundary';

/* ─── TACTICAL UTILS ──────────────────────────────────────────────────────── */

const formatTime = (ts) => {
  try {
    const d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) return ts;
    const nyDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = monthNames[nyDate.getMonth()];
    const day = nyDate.getDate();
    let hours = nyDate.getHours();
    const minutes = nyDate.getMinutes().toString().padStart(2, '0');
    const seconds = nyDate.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes}:${seconds} ${ampm} ${month} ${day} ET`;
  } catch { return 'now'; }
};

/* ─── PRIORITY DETERMINATION ───────────────────── */
const determinePriority = (item) => {
  const title = (item.title || item.tweet || item.headline || '') + '';
  const description = (item.description || '') + '';
  const combined = (title + ' ' + description).toLowerCase();
  const titleOriginal = title;

  const isFinancialJuiceBreaking = item.account?.toLowerCase() === 'financialjuice' && titleOriginal.trim().startsWith('*');

  const fedCritical = [
    /\brate\s+cut/i, /\brate\s+hike/i, /\bemergency\s+meeting/i,
    /\bpowell/i, /\bfederal\s+reserve/i, /\bfomc/i,
    /\bbasis\s+points/i, /\bbps\b/i
  ];

  const geoCritical = [
    /\bwar\b/i, /\binvasion/i, /\bmissiles/i, /\btroops/i,
    /\bsanctions/i, /\bblockade/i, /\bstrait/i, /\biran\b/i,
    /\bchina\s+(tariff|sanctions|invasion|military|attack|taiwan)\b/i,
    /\bpboc\s+rate/i,
    /\brussia\s+(sanctions|attack|invasion|ukraine|missiles|energy|default)\b/i,
    /\b(military|missile|terror|cyber)\s+attack/i,
    /\b(air|military|missile)\s+strike/i,
    /\btaiwan\b/i, /\bnorth\s+korea/i
  ];

  const marketCritical = [
    /\bcrash\b/i, /\bcircuit\s+breaker/i,
    /\b(trading|market)\s+halt/i, /\bdefault\b/i, /\bbankruptcy/i,
    /\b(market|bank|currency)\s+collapse/i, /\bcontagion/i, /\bbank\s+run/i
  ];

  const breakingCritical = [
    /\bbreaking\b/i, /\bjust\s+in\b/i, /\balert\b/i, /\burgent\b/i
  ];

  const isTier1Critical = isFinancialJuiceBreaking ||
    fedCritical.some(p => p.test(combined)) ||
    geoCritical.some(p => p.test(combined)) ||
    marketCritical.some(p => p.test(combined)) ||
    breakingCritical.some(p => p.test(combined));

  const importantPatterns = [
    /\btariff/i, /\binflation/i, /\bcpi\b/i, /\bgdp\b/i,
    /\bjobs\s+report/i, /\bnfp\b/i, /\bearnings/i, /\bguidance/i,
    /\bsec\b/i, /\binvestigation/i, /\blawsuit/i,
    /\bacquisition/i, /\bmerger/i, /\bipo\b/i, /\bbuyback/i,
    /\bdividend\s+cut/i, /\bchina\b/i, /\brussia\b/i
  ];

  const priceMilestones = [
    /\$100\b/i, /\brecord\s+high/i, /\brecord\s+low/i,
    /\ball-time/i, /\b52-week/i
  ];

  const allCapsWords = titleOriginal.trim().split(/\s+/).filter(w => w.length > 0);
  const isAllCaps = allCapsWords.length > 5 &&
    allCapsWords.every(word => word === word.toUpperCase() && /[A-Z]/.test(word));

  const isTier2Important = isAllCaps ||
    importantPatterns.some(p => p.test(combined)) ||
    priceMilestones.some(p => p.test(combined));

  if (isTier1Critical) return { level: 'CRITICAL', color: '#ff0000', bgColor: 'rgba(255,0,0,0.15)', tier: 1 };
  if (isTier2Important) return { level: 'IMPORTANT', color: '#ffaa00', bgColor: 'rgba(255,170,0,0.1)', tier: 2 };
  return { level: 'MONITORING', color: '#00ffff', bgColor: 'transparent', tier: 3 };
};

/* ─── PANEL SCROLL AREA WRAPPER ──────────────────────────────────────────── */
const PanelScrollArea = ({ children, scrollKey, className = '', style = {} }) => {
  const scrollRef = useRef(null);
  const prevScrollKeyRef = useRef(scrollKey);
  const scrollPositionRef = useRef(0);

  const setScrollRef = (node) => {
    if (node && prevScrollKeyRef.current !== scrollKey) {
      scrollPositionRef.current = node.scrollTop;
    }
    scrollRef.current = node;
  };

  useEffect(() => {
    if (scrollRef.current && prevScrollKeyRef.current !== scrollKey) {
      scrollPositionRef.current = scrollRef.current.scrollTop;
    }
    prevScrollKeyRef.current = scrollKey;
  }, [scrollKey]);

  useEffect(() => {
    if (scrollRef.current && scrollPositionRef.current > 0) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollPositionRef.current;
      });
    }
  }, [scrollKey]);

  return (
    <div ref={setScrollRef} className={className} style={style}>
      {children}
    </div>
  );
};

/* ─── TACTICAL DOT ITEM ──────────────────────────────────────────────────── */
const DotItem = React.memo(({ item, color = '#00C2FF' }) => {
  const priority = determinePriority(item);
  const isCritical = priority.level === 'CRITICAL';
  const isImportant = priority.level === 'IMPORTANT';
  const dotColor = isCritical ? '#ff0000' : isImportant ? '#ffaa00' : color;
  const bgColor = priority.bgColor;
  const borderLeft = isCritical ? '4px solid #ff0000' : isImportant ? '4px solid #ffaa00' : '4px solid #00ff00';

  return (
    <div
      onClick={() => (item.url || item.link) && window.open(item.url || item.link, '_blank')}
      style={{
        padding: '8px 10px', borderBottom: '1px solid #111', borderLeft, backgroundColor: bgColor,
        cursor: (item.url || item.link) ? 'pointer' : 'default',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
        transition: 'background 0.2s', margin: '2px 0'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isCritical ? 'rgba(255,0,0,0.2)' : isImportant ? 'rgba(255,170,0,0.15)' : '#080808';
      }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = bgColor; }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor,
        marginTop: 5, flexShrink: 0,
        boxShadow: isCritical ? '0 0 10px #ff0000' : isImportant ? '0 0 6px #ffaa00' : 'none',
        animation: isCritical ? 'pulse-error 1s infinite' : 'none'
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '11px', color: '#fff', margin: 0, marginBottom: '2px', lineHeight: 1.3,
          fontFamily: "'Roboto Mono', monospace", fontWeight: isCritical ? 'bold' : 'normal'
        }}>
          {item.title || item.tweet || item.headline}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', opacity: 0.6 }}>
          <span>({formatTime(item.timestamp || item.datetime || item.pubDate)})</span>
          <span style={{ color: priority.color, background: priority.bgColor, padding: '0 4px', borderRadius: 2, fontFamily: "'Courier New', monospace", fontSize: '8px', fontWeight: 'bold' }}>
            {priority.level}
          </span>
          {item.label && <span style={{ color: '#0FF0FC', background: 'rgba(15,240,252,0.1)', padding: '0 4px', borderRadius: 2 }}>{item.label}</span>}
          {item.source && <span style={{ color: '#BC13FE' }}>{item.source}</span>}
          {item.account && <span style={{ color: '#0FF0FC' }}>{item.account}</span>}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  const prevId = prev.item?.id || prev.item?.url || prev.item?.link || prev.item?.timestamp;
  const nextId = next.item?.id || next.item?.url || next.item?.link || next.item?.timestamp;
  if (prev.color !== next.color) return false;
  return prevId === nextId;
});

/* ─── PANEL COMPONENTS ───────────────────────────────────────────────────── */

const PoliticsBankingPanel = React.memo(({ data, sources }) => {
  const sortedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].sort((a, b) =>
      new Date(b.timestamp || b.datetime || b.pubDate || 0) - new Date(a.timestamp || a.datetime || a.pubDate || 0)
    );
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-black border-2 border-fluorescent-green overflow-hidden">
      <div className="h-8 bg-black border-b border-fluorescent-green flex items-center px-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-fluorescent-green uppercase">POLITICS & BANKING</span>
          <span className="text-[8px] text-gray-500">Federal Reserve | Banking Regulation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-fluorescent-green font-bold">LIVE</span>
          <span className="text-[8px] text-gray-500">| {sources?.length || 0} {sources?.length === 1 ? 'source' : 'sources'}</span>
        </div>
      </div>
      <PanelScrollArea
        scrollKey={sortedData.map(item => item.id || item.url || item.timestamp || '').join('|')}
        className="flex-1 overflow-y-auto custom-scrollbar p-1"
      >
        {sortedData.map((item, i) => (
          <DotItem key={`pol-${item.id || item.url || item.timestamp || i}`} item={item} color="#BC13FE" />
        ))}
        {(!sortedData || sortedData.length === 0) && (
          <div className="text-center text-gray-500 text-[10px] p-4">Loading politics & banking news...</div>
        )}
      </PanelScrollArea>
    </div>
  );
}, (prev, next) => prev.data === next.data && prev.sources === next.sources);

// 0x News Ticker Component with Keyword Highlighting
const OxNewsTicker = React.memo(({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="h-10 bg-black border-t border-fluorescent-green flex items-center px-2">
        <span className="text-[8px] text-gray-600" style={{ fontFamily: 'monospace' }}>0x News: Loading...</span>
      </div>
    );
  }
  
  const highlightKeywords = (text) => {
    if (!text) return text;
    const keywords = ['Whale', 'WTI', 'Oil'];
    let highlighted = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => 
        `<span style="color: #ffbf00; font-weight: 700;">${match}</span>`
      );
    });
    return highlighted;
  };
  
  return (
    <div className="h-10 bg-black border-t border-fluorescent-green overflow-hidden">
      <div 
        className="h-full flex items-center px-2 gap-2 overflow-x-auto"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          fontFamily: "'Roboto Mono', 'Courier New', monospace"
        }}
      >
        <style>{`
          .ox-ticker::-webkit-scrollbar { display: none; }
        `}</style>
        {items.map((item, i) => (
          <a
            key={`0x-${item.id || i}`}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[8px] text-gray-400 hover:text-fluorescent-green transition-colors whitespace-nowrap"
            style={{ fontFamily: 'monospace', lineHeight: '1.2' }}
          >
            <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.title || '') }} />
            <span className="text-gray-700 mx-1.5">•</span>
          </a>
        ))}
      </div>
    </div>
  );
}, (prev, next) => prev.items === next.items);

const PhysicalPipelineFlowPanel = React.memo(({ data, sources, oxNewsData }) => {
  const sortedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].sort((a, b) =>
      new Date(b.timestamp || b.datetime || b.pubDate || 0) - new Date(a.timestamp || a.datetime || a.pubDate || 0)
    );
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-black border-2 border-fluorescent-green overflow-hidden">
      <div className="h-8 bg-black border-b border-fluorescent-green flex items-center px-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-fluorescent-green uppercase">PHYSICAL PIPELINE FLOW</span>
          <span className="text-[8px] text-gray-500">Energy | Physical Commodities</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-fluorescent-green font-bold">LIVE</span>
          <span className="text-[8px] text-gray-500">| {sources?.length || 0} {sources?.length === 1 ? 'source' : 'sources'}</span>
        </div>
      </div>
      <PanelScrollArea
        scrollKey={sortedData.map(item => item.id || item.url || item.timestamp || '').join('|')}
        className="flex-1 overflow-y-auto custom-scrollbar p-1"
      >
        {sortedData.map((item, i) => (
          <DotItem key={`physical-${item.id || item.url || item.timestamp || i}`} item={item} color="#00ff88" />
        ))}
        {(!sortedData || sortedData.length === 0) && (
          <div className="text-center text-gray-500 text-[10px] p-4">Loading Physical Pipeline Flow...</div>
        )}
      </PanelScrollArea>
      <OxNewsTicker items={oxNewsData || []} />
    </div>
  );
}, (prev, next) => prev.data === next.data && prev.sources === next.sources && prev.oxNewsData === next.oxNewsData);

const SquawkBoxPanel = React.memo(({ data, sources, meta }) => {
  const activeSourcesCount = React.useMemo(() => {
    if (meta?.activeSources !== undefined) return meta.activeSources;
    if (!data || !Array.isArray(data)) return 0;
    const accounts = new Set();
    data.forEach(item => {
      if (item.account) accounts.add(item.account);
      else if (item.source) { const m = item.source.match(/@(\w+)/); if (m) accounts.add(m[1]); }
    });
    return accounts.size;
  }, [data, meta]);

  const totalSourcesCount = meta?.totalSources || sources?.length || 10;

  const sortedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].sort((a, b) =>
      new Date(b.timestamp || b.datetime || b.pubDate || 0) - new Date(a.timestamp || a.datetime || a.pubDate || 0)
    );
  }, [data]);

  const priorityCounts = React.useMemo(() => {
    let critical = 0, important = 0, monitoring = 0;
    sortedData.forEach(item => {
      const p = determinePriority(item);
      if (p.level === 'CRITICAL') critical++;
      else if (p.level === 'IMPORTANT') important++;
      else monitoring++;
    });
    return { critical, important, monitoring };
  }, [sortedData]);

  const getItemColor = (item) => {
    const source = (item.source || '').toLowerCase();
    const account = (item.account || '').toLowerCase();
    const url = (item.url || item.link || '').toLowerCase();
    if (source.includes('financialjuice') || account.includes('financialjuice') || url.includes('financialjuice')) return '#ffff00';
    if (source.includes('nicktimiraos') || account.includes('nicktimiraos') || url.includes('nicktimiraos')) return '#00ff88';
    return '#00C2FF';
  };

  return (
    <div className="flex flex-col h-full bg-black border-2 border-fluorescent-green overflow-hidden">
      <div className="h-8 bg-black border-b border-fluorescent-green flex items-center px-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-fluorescent-green uppercase">SQUAWK BOX | FINANCIALJUICE + NICKTIMIRAOS + ES FLOW</span>
          <span className="text-[8px] text-gray-500">Market Squawks | Fed Policy | ES Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-fluorescent-green font-bold">LIVE</span>
          <span className="text-[8px] text-gray-500">| {activeSourcesCount} active / {totalSourcesCount} sources</span>
          <span className="text-[8px] text-gray-500">|</span>
          <span className="text-[8px] text-red-500 font-bold">🔴 {priorityCounts.critical}</span>
          <span className="text-[8px] text-amber-500 font-bold">🟡 {priorityCounts.important}</span>
          <span className="text-[8px] text-gray-400 font-bold">⚪ {priorityCounts.monitoring}</span>
        </div>
      </div>
      <PanelScrollArea
        scrollKey={sortedData.map(item => item.id || item.url || item.timestamp || '').join('|')}
        className="flex-1 overflow-y-auto custom-scrollbar p-1"
      >
        {sortedData.map((item, i) => (
          <DotItem key={`squawk-${item.id || item.url || item.timestamp || i}`} item={item} color={getItemColor(item)} />
        ))}
        {(!sortedData || sortedData.length === 0) && (
          <div className="text-center text-gray-500 text-[10px] p-4">Loading Squawk Box...</div>
        )}
      </PanelScrollArea>
    </div>
  );
}, (prev, next) => prev.data === next.data && prev.sources === next.sources && prev.meta === next.meta);

const IBNoisePanel = React.memo(({ data, sources }) => {
  const sortedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].sort((a, b) =>
      new Date(b.timestamp || b.datetime || b.pubDate || 0) - new Date(a.timestamp || a.datetime || a.pubDate || 0)
    );
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-black border-2 border-fluorescent-green overflow-hidden">
      <div className="h-8 bg-black border-b border-fluorescent-green flex items-center px-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-fluorescent-green uppercase">IB & M&A NOISE</span>
          <span className="text-[8px] text-gray-500">M&A | Investment Banking | Deals</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-fluorescent-green font-bold">LIVE</span>
          <span className="text-[8px] text-gray-500">| {sources?.length || 0} {sources?.length === 1 ? 'source' : 'sources'}</span>
        </div>
      </div>
      <PanelScrollArea
        scrollKey={sortedData.map(item => item.id || item.url || item.timestamp || '').join('|')}
        className="flex-1 overflow-y-auto custom-scrollbar p-1"
      >
        {sortedData.map((item, i) => (
          <DotItem key={`ib-${item.id || item.url || item.timestamp || i}`} item={item} color="#00C2FF" />
        ))}
        {(!sortedData || sortedData.length === 0) && (
          <div className="text-center text-gray-500 text-[10px] p-4">Loading IB & M&A news...</div>
        )}
      </PanelScrollArea>
    </div>
  );
}, (prev, next) => prev.data === next.data && prev.sources === next.sources);

/* ─── FEED STORE (SINGLETON) ──────────────────────────────────────────────── */
const feedStore = {
  politics: [],
  commodity: [],
  ib: [],
  physical: [],
  squawk: [],
  squawkMeta: null,
  oxNews: [],
  calendar: [],
  listeners: new Set(),
  notify() { this.listeners.forEach(fn => fn()); }
};

const fetchPoliticsData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/politics');
    if (res.data?.status === 'success') feedStore.politics = res.data.data || [];
  } catch (err) { console.error('❌ Politics Feed Error:', err.message); }
};

const fetchCommodityData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/commodity');
    if (res.data?.status === 'success') feedStore.commodity = res.data.data || [];
  } catch (err) { console.error('❌ Commodity Feed Error:', err.message); }
};

const fetchIBData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/ib');
    if (res.data?.status === 'success') feedStore.ib = res.data.data || [];
  } catch (err) { console.error('❌ IB Feed Error:', err.message); }
};

const fetchPhysicalData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/physical');
    if (res.data?.status === 'success') feedStore.physical = res.data.data || [];
  } catch (err) { console.error('❌ Physical Pipeline Flow Error:', err.message); }
};

const fetchSquawkData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/squawk');
    if (res.data?.status === 'success') {
      const data = res.data.data || [];
      const meta = res.data.meta || null;
      feedStore.squawk = data;
      feedStore.squawkMeta = meta;
      const accounts = new Set();
      data.forEach(item => {
        if (item.account) accounts.add(item.account);
        else if (item.source) { const m = item.source.match(/@(\w+)/); if (m) accounts.add(m[1]); }
      });
      console.log('[SQUAWK] Frontend received data:', {
        totalItems: data.length,
        uniqueAccounts: Array.from(accounts),
        accountCount: accounts.size,
        meta
      });
    }
  } catch (err) { console.error('❌ Squawk Box Error:', err.message); }
};

const fetch0xNewsData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/0xnews');
    if (res.data?.status === 'success') {
      feedStore.oxNews = res.data.data || [];
      console.log('✅ 0x News RSS:', feedStore.oxNews.length, 'items');
    } else {
      console.error('❌ 0x News RSS: Invalid response', res.data);
    }
  } catch (err) { 
    console.error('❌ 0x News RSS Error:', err.message);
    feedStore.oxNews = [];
  }
};

const fetchCalendarData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/macro-feed/calendar');
    if (res.data?.status === 'success') {
      feedStore.calendar = res.data.data || [];
      console.log('✅ Economic Calendar:', feedStore.calendar.length, 'items');
    } else {
      console.error('❌ Economic Calendar: Invalid response', res.data);
    }
  } catch (err) { 
    console.error('❌ Economic Calendar Error:', err.message);
    feedStore.calendar = [];
  }
};

const fetchAll = async () => {
  await Promise.all([
    fetchPoliticsData(),
    fetchCommodityData(),
    fetchIBData(),
    fetchPhysicalData(),
    fetchSquawkData(),
    fetch0xNewsData(),
    fetchCalendarData(),
  ]);
  feedStore.notify();
};

fetchAll();

setInterval(async () => { await fetchSquawkData(); feedStore.notify(); }, 20000);
setInterval(async () => { await fetch0xNewsData(); feedStore.notify(); }, 30000);
setInterval(async () => { await fetchCalendarData(); feedStore.notify(); }, 300000); // 5 minutes
setInterval(async () => { await Promise.all([fetchPoliticsData(), fetchCommodityData(), fetchIBData(), fetchPhysicalData()]); feedStore.notify(); }, 60000);

/* ─── CRITICAL ALERT SYSTEM ──────────────────────────────────────────────── */
const playTerminalChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = [0, 0.15, 0.3];
    const freqs = [880, 1100, 1320];
    times.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.12);
    });
  } catch (e) { console.warn('Chime failed:', e); }
};

const useCriticalAlerts = () => {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    const check = () => {
      const allItems = [
        ...feedStore.politics,
        ...feedStore.squawk,
        ...feedStore.physical,
        ...feedStore.ib,
      ];
      const newCriticals = allItems.filter(item => {
        const p = determinePriority(item);
        const id = item.id || item.url || item.timestamp || item.title;
        if (p.level !== 'CRITICAL') return false;
        if (seenIdsRef.current.has(id)) return false;
        seenIdsRef.current.add(id);
        return true;
      });

      if (newCriticals.length > 0) {
        playTerminalChime();
        const alerts = newCriticals.map(item => ({
          id: item.id || item.url || item.timestamp || Math.random().toString(36),
          title: item.title || item.tweet || item.headline,
          source: item.source || item.account || '',
          timestamp: item.timestamp || item.datetime || item.pubDate,
          panel: item._panel || 'FEED',
        }));
        setActiveAlerts(prev => [...prev, ...alerts]);
        alerts.forEach(alert => {
          setTimeout(() => {
            setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
          }, 8000);
        });
      }
    };

    feedStore.listeners.add(check);
    return () => feedStore.listeners.delete(check);
  }, []);

  return activeAlerts;
};

const CriticalAlertBanner = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: '48px', left: 0, right: 0,
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '2px',
      pointerEvents: 'none',
    }}>
      {alerts.map((alert, i) => (
        <div key={alert.id} style={{
          background: 'rgba(0,0,0,0.97)',
          border: '2px solid #ff0000',
          borderLeft: '6px solid #ff0000',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'criticalSlideIn 0.2s ease-out',
          fontFamily: "'Roboto Mono', monospace",
          boxShadow: '0 0 20px rgba(255,0,0,0.4)',
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#ff0000',
            animation: 'pulse-error 0.6s infinite',
            flexShrink: 0,
          }} />
          <span style={{ color: '#ff0000', fontSize: '10px', fontWeight: 'bold', flexShrink: 0 }}>
            ⚠ CRITICAL
          </span>
          <span style={{ color: '#ffffff', fontSize: '10px', flex: 1 }}>
            {alert.title}
          </span>
          {alert.source && (
            <span style={{ color: '#ff6666', fontSize: '9px', flexShrink: 0 }}>
              {alert.source}
            </span>
          )}
          <span style={{ color: '#ff4444', fontSize: '9px', flexShrink: 0 }}>
            {formatTime(alert.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── CALENDAR STRIP ──────────────────────────────────────────────────────── */
const CalendarStrip = React.memo(({ inline = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState([]);

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update events from feedStore
  useEffect(() => {
    const updateEvents = () => {
      const calendarData = feedStore.calendar || [];
      const parsedEvents = calendarData.map(item => {
        const title = item.title || '';
        
        // Parse event name, time, and impact from title
        // Common patterns: "CPI YoY 8:30 AM ET", "FOMC Minutes 2:00 PM ET", etc.
        let eventName = title;
        let eventTime = null;
        let impact = 'low'; // default to low (white)
        
        // Try to extract time patterns (8:30 AM ET, 2:00 PM ET, etc.)
        const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*ET/i;
        const timeMatch = title.match(timePattern);
        
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          let hour24 = hours;
          if (ampm === 'PM' && hours !== 12) hour24 = hours + 12;
          if (ampm === 'AM' && hours === 12) hour24 = 0;
          
          // Get today's date in ET timezone
          const now = new Date();
          const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          eventTime = new Date(nyTime);
          eventTime.setHours(hour24, minutes, 0, 0);
          
          // If time has passed today, set to tomorrow
          if (eventTime < nyTime) {
            eventTime.setDate(eventTime.getDate() + 1);
          }
          
          // Remove time from event name
          eventName = title.replace(timePattern, '').trim();
        } else {
          // Try to parse from pubDate/timestamp if no time in title
          const itemDate = new Date(item.timestamp || item.datetime || item.pubDate || 0);
          if (!isNaN(itemDate.getTime())) {
            eventTime = itemDate;
          }
        }
        
        // Determine impact level from keywords
        const titleLower = title.toLowerCase();
        if (titleLower.includes('cpi') || titleLower.includes('nfp') || titleLower.includes('fomc') || 
            titleLower.includes('fed') || titleLower.includes('rate') || titleLower.includes('employment') ||
            titleLower.includes('gdp') || titleLower.includes('inflation')) {
          impact = 'high'; // red
        } else if (titleLower.includes('claims') || titleLower.includes('retail') || 
                   titleLower.includes('manufacturing') || titleLower.includes('pmi')) {
          impact = 'medium'; // yellow
        }
        
        return {
          id: item.id || Math.random().toString(36),
          name: eventName || title,
          time: eventTime,
          impact,
          url: item.url || item.link || '#'
        };
      }).filter(event => event.time !== null); // Only include events with valid times
      
      setEvents(parsedEvents);
    };
    
    updateEvents();
    feedStore.listeners.add(updateEvents);
    return () => feedStore.listeners.delete(updateEvents);
  }, []);

  const formatCountdown = (eventTime) => {
    if (!eventTime) return 'RELEASED';
    
    const now = new Date();
    const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Convert eventTime to ET timezone for comparison
    const eventTimeStr = eventTime.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyEventTime = new Date(eventTimeStr);
    
    const diff = nyEventTime.getTime() - nyNow.getTime();
    
    if (diff <= 0) return 'RELEASED';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatEventTime = (eventTime) => {
    if (!eventTime) return '';
    const nyTime = new Date(eventTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    let hours = nyTime.getHours();
    const minutes = nyTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes}${ampm}`;
  };

  const getImpactColor = (impact, isReleased) => {
    if (isReleased) return '#666666'; // gray for released
    if (impact === 'high') return '#ff0000'; // red
    if (impact === 'medium') return '#ffaa00'; // yellow
    return '#ffffff'; // white for low
  };

  const getImpactEmoji = (impact) => {
    if (impact === 'high') return '🔴';
    if (impact === 'medium') return '🟡';
    return '⚪';
  };

  // Inline version for header
  if (inline) {
    return (
      <div 
        className="flex items-center gap-1 overflow-x-auto overflow-y-hidden w-full min-w-0" 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          fontFamily: "'Roboto Mono', monospace"
        }}
      >
        <style>{`
          .calendar-strip-inline::-webkit-scrollbar { display: none; }
        `}</style>
        {events.length === 0 ? (
          <span className="text-[9px] text-gray-500 whitespace-nowrap flex-shrink-0">Loading Calendar...</span>
        ) : (
          events.slice(0, 10).map((event, index) => {
            const now = new Date();
            const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const eventTimeStr = event.time ? event.time.toLocaleString('en-US', { timeZone: 'America/New_York' }) : '';
            const nyEventTime = eventTimeStr ? new Date(eventTimeStr) : null;
            const isReleased = !nyEventTime || nyEventTime < nyNow;
            const countdown = formatCountdown(event.time);
            const eventTimeDisplay = formatEventTime(event.time);
            const color = getImpactColor(event.impact, isReleased);
            const emoji = getImpactEmoji(event.impact);
            
            return (
              <React.Fragment key={event.id}>
                {index > 0 && <span className="text-gray-600 mx-1 flex-shrink-0">|</span>}
                <span
                  onClick={() => event.url && event.url !== '#' && window.open(event.url, '_blank')}
                  className="flex-shrink-0 text-[9px] cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap"
                  style={{ color }}
                >
                  <span>{emoji}</span>
                  <span className="mx-0.5">{event.name}</span>
                  {eventTimeDisplay && <span className="mx-0.5">{eventTimeDisplay}</span>}
                  <span className="mx-0.5">•</span>
                  <span style={{ color: isReleased ? '#666666' : color }}>{countdown}</span>
                </span>
              </React.Fragment>
            );
          })
        )}
      </div>
    );
  }

  // Standalone version (original)
  return (
    <div className="h-8 bg-black border-2 border-fluorescent-green overflow-x-auto overflow-y-hidden flex items-center gap-2 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style>{`
        .calendar-strip::-webkit-scrollbar { display: none; }
      `}</style>
      {events.length === 0 ? (
        <span className="text-[10px] text-gray-500" style={{ fontFamily: 'monospace' }}>Loading Economic Calendar...</span>
      ) : (
        events.map((event) => {
          const now = new Date();
          const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const eventTimeStr = event.time ? event.time.toLocaleString('en-US', { timeZone: 'America/New_York' }) : '';
          const nyEventTime = eventTimeStr ? new Date(eventTimeStr) : null;
          const isReleased = !nyEventTime || nyEventTime < nyNow;
          const countdown = formatCountdown(event.time);
          const eventTimeDisplay = formatEventTime(event.time);
          const color = getImpactColor(event.impact, isReleased);
          const emoji = getImpactEmoji(event.impact);
          
          return (
            <div
              key={event.id}
              onClick={() => event.url && event.url !== '#' && window.open(event.url, '_blank')}
              className="flex-shrink-0 px-3 py-1 rounded-full border text-[9px] font-mono cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                borderColor: color,
                color: color,
                backgroundColor: isReleased ? 'rgba(102, 102, 102, 0.1)' : 'transparent',
                fontFamily: "'Roboto Mono', monospace",
                whiteSpace: 'nowrap'
              }}
            >
              <span>{emoji}</span>
              <span className="mx-1">{event.name}</span>
              {eventTimeDisplay && <span className="mx-1">—</span>}
              {eventTimeDisplay && <span>{eventTimeDisplay}</span>}
              <span className="mx-1">—</span>
              <span style={{ color: isReleased ? '#666666' : color }}>{countdown}</span>
            </div>
          );
        })
      )}
    </div>
  );
});

/* ─── LIVE CLOCK ──────────────────────────────────────────────────────────── */
const LiveClock = React.memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in New York timezone
  const formatClockTime = () => {
    try {
      const now = currentTime;
      // Convert to NY timezone
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      let hours = nyTime.getHours();
      const minutes = nyTime.getMinutes().toString().padStart(2, '0');
      const seconds = nyTime.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      
      return `${hours}:${minutes}:${seconds} ${ampm} ET`;
    } catch (error) {
      console.error('LiveClock error:', error);
      // Fallback: use current time directly
      const now = currentTime;
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes}:${seconds} ${ampm} ET`;
    }
  };

  return (
    <div style={{ color: '#00ffff', fontFamily: 'monospace', fontSize: '12px', minWidth: '140px', textAlign: 'right', flexShrink: 0 }}>
      {formatClockTime()}
    </div>
  );
});

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
const GlobalMacroPulse = ({ refreshTrigger = 0 }) => {
  const [tick, setTick] = useState(0);
  const [initialLoading, setInitialLoading] = useState(false);
  const hasNotifiedOnceRef = useRef(false);
  const criticalAlerts = useCriticalAlerts();
  const anyActive = criticalAlerts.length > 0;

  useEffect(() => {
    const trigger = () => {
      setTick(t => t + 1);
      if (!hasNotifiedOnceRef.current) {
        hasNotifiedOnceRef.current = true;
        setInitialLoading(false);
      }
    };
    feedStore.listeners.add(trigger);
    return () => feedStore.listeners.delete(trigger);
  }, []);

  if (initialLoading) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center font-mono">
        <div className="text-xl text-fluorescent-green tracking-[0.5em] animate-pulse">MACRO_PULSE_INIT...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black p-2 flex flex-col gap-2 font-mono overflow-hidden relative">
      <CriticalAlertBanner alerts={criticalAlerts} />
      {/* GLOBAL HEADER */}
      <div className="h-10 bg-black border-2 border-fluorescent-green flex items-center px-4 gap-3" style={{ minHeight: '40px' }}>
        <span className="text-sm font-bold text-fluorescent-green uppercase flex-shrink-0 whitespace-nowrap">
          GLOBAL MACRO PULSE [{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).toUpperCase()}]
        </span>
        <div className="flex-1 min-w-0 flex items-center overflow-hidden">
          <CalendarStrip inline={true} />
        </div>
        <LiveClock />
      </div>

      {/* 2X2 GRID */}
      <div
        className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 overflow-hidden"
        style={{
          outline: anyActive ? '2px solid #ff0000' : 'none',
          boxShadow: anyActive ? '0 0 24px rgba(255,0,0,0.5)' : 'none',
          animation: anyActive ? 'borderFlash 0.5s infinite' : 'none',
          transition: 'box-shadow 0.3s',
        }}
      >
        <PoliticsBankingPanel data={feedStore.politics} sources={['POTUS', 'SecWar', 'Austan_Goolsbee', 'stlouisfed', 'elerianm', 'MacroAlf']} />
        <SquawkBoxPanel
          data={feedStore.squawk}
          sources={['financialjuice','NickTimiraos','RiskReversal','ritholtz','conorsen','SpotGamma','unusual_whales','MacroAlf','zerohedge','markets']}
          meta={feedStore.squawkMeta}
        />
        <PhysicalPipelineFlowPanel 
          data={feedStore.physical} 
          sources={['JavierBlas', 'GoldmanSachs', 'PIMCO', 'kitjuckes', 'mark_dow', 'lisaabramowicz1', '0xzxcom']} 
          oxNewsData={feedStore.oxNews || []} 
        />
        <IBNoisePanel data={feedStore.ib} sources={['dealertAI', 'CitronResearch', 'davidein', 'DougKass']} />
      </div>

      {/* BOTTOM LEFT LINK */}
      <div className="absolute bottom-2 left-2">
        <a href="https://nitter.poast.org/0xzxcom#:~:text=0xzx%2Ecom%2Fen" target="_blank" rel="noopener noreferrer" className="text-[8px] text-fluorescent-green hover:underline">https://nitter.poast.org/0xzxcom#:~:text=0xzx%2Ecom%2Fen</a>
      </div>

      <style>{`
        @keyframes pulse-error { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes criticalSlideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes borderFlash {
          0%, 100% { box-shadow: 0 0 24px rgba(255,0,0,0.5); }
          50%       { box-shadow: 0 0 40px rgba(255,0,0,0.9); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 1px; }
      `}</style>
    </div>
  );
};

export default function GlobalMacroPulseWithErrorBoundary({ refreshTrigger }) {
  return (
    <ErrorBoundary>
      <GlobalMacroPulse refreshTrigger={refreshTrigger} />
    </ErrorBoundary>
  );
}
