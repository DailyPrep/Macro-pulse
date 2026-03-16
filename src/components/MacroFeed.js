import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const MacroFeed = () => {
  const [pipelineData, setPipelineData] = useState([]);
  const [whaleData, setWhaleData] = useState([]);
  const [panelSizes, setPanelSizes] = useState({ left: 33, center: 34, right: 33 });
  const [isResizing, setIsResizing] = useState(null);
  const containerRef = useRef(null);

  // Fetch data from backend API (simplified - only essential data)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const pipelineRes = await axios.get('/api/strategic-pipeline').catch(() => null);
        if (pipelineRes?.data?.data?.strategicTickers) {
          setPipelineData(pipelineRes.data.data.strategicTickers);
        }

        const whaleRes = await axios.get('/api/whale-radar').catch(() => null);
        if (whaleRes?.data?.data) {
          setWhaleData(whaleRes.data.data.slice(0, 10));
        }
      } catch (error) {
        // Silent fail - use public widgets
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Panel resizing functionality (Bloomberg-style)
  const handleMouseDown = (panel) => {
    setIsResizing(panel);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;

      if (isResizing === 'left') {
        const newLeft = Math.max(20, Math.min(60, percentage));
        const newCenter = 100 - newLeft - panelSizes.right;
        setPanelSizes({ left: newLeft, center: newCenter, right: panelSizes.right });
      } else if (isResizing === 'center') {
        const newCenter = Math.max(20, Math.min(60, percentage - panelSizes.left));
        const newRight = 100 - panelSizes.left - newCenter;
        setPanelSizes({ left: panelSizes.left, center: newCenter, right: newRight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, panelSizes]);

  return (
    <div ref={containerRef} className="h-full w-full bg-tactical-black font-mono relative">
      {/* Bloomberg-style Top Bar */}
      <div className="h-8 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2 text-xs">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-fluorescent-green font-bold">MACRO FEED</span>
          <span className="text-gray-500">|</span>
          <span className="text-cyan-accent">LIVE</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">ES1! | US10Y | DXY</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-0.5 border border-fluorescent-green hover:bg-[rgba(0,255,0,0.1)] text-xs">
            RESET LAYOUT
          </button>
        </div>
      </div>

      {/* Main Grid with Resizable Panels */}
      <div className="h-[calc(100%-2rem)] flex gap-0.5 p-0.5">
        {/* Left Panel - ES1! Chart & Pipeline */}
        <div 
          className="flex flex-col gap-0.5"
          style={{ width: `${panelSizes.left}%` }}
        >
          {/* ES1! Chart - Bloomberg Terminal Style */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden flex flex-col relative">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2 flex-shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono font-bold text-fluorescent-green">ES1!</span>
                <span className="text-xs font-mono text-gray-400">CME_MINI:ES1!</span>
              </div>
              <div className="flex items-center gap-2">
                <select className="bg-black border border-fluorescent-green text-fluorescent-green text-xs px-1 py-0.5">
                  <option>5m</option>
                  <option>15m</option>
                  <option>1H</option>
                  <option>4H</option>
                  <option>1D</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src="https://www.tradingview.com/widgetembed/?symbol=CME_MINI:ES1!&interval=5&theme=dark&style=1&locale=en&toolbar_bg=000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=true&save_image=false"
                width="100%"
                height="100%"
                frameBorder="0"
                className="w-full h-full"
                title="ES1! Chart"
              />
            </div>
          </div>

          {/* Global Strategic Pipeline - Bloomberg Watchlist Style */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2">
              <span className="text-xs font-mono font-bold text-safety-orange uppercase">STRATEGIC PIPELINE</span>
            </div>
            <div className="h-full overflow-y-auto">
              <div className="p-1 space-y-0">
                {pipelineData.length > 0 ? (
                  pipelineData.map((ticker, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center px-2 py-1 hover:bg-[rgba(0,255,0,0.05)] transition-colors border-b border-[rgba(0,255,0,0.1)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-fluorescent-green font-bold w-12">
                          {ticker.symbol || '--'}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {ticker.symbol === 'US10Y' ? '10Y' : ticker.symbol === 'DXY' ? 'DXY' : 'ES1!'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-300 w-16 text-right">
                          {ticker.price 
                            ? ticker.symbol === 'US10Y' 
                              ? `${ticker.price.toFixed(3)}%`
                              : ticker.symbol === 'DXY'
                              ? ticker.price.toFixed(2)
                              : `$${ticker.price.toFixed(2)}`
                            : '--'}
                        </span>
                        <span
                          className={`text-xs font-mono font-bold w-12 text-right ${
                            ticker.change >= 0
                              ? 'text-fluorescent-green'
                              : 'text-emergency-red'
                          }`}
                        >
                          {ticker.change !== undefined
                            ? `${ticker.change >= 0 ? '+' : ''}${ticker.change.toFixed(2)}%`
                            : '--'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono text-gray-500 p-2">
                    Loading pipeline data...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          className="w-1 bg-[rgba(0,255,0,0.3)] hover:bg-fluorescent-green cursor-col-resize transition-colors"
          onMouseDown={() => handleMouseDown('left')}
        />

        {/* Center Panel - Market Overview & News */}
        <div 
          className="flex flex-col gap-0.5"
          style={{ width: `${panelSizes.center}%` }}
        >
          {/* Market Overview - Bloomberg Multi-Asset View */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden flex flex-col">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2">
              <span className="text-xs font-mono font-bold text-safety-orange uppercase">MARKET OVERVIEW</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src="https://www.tradingview.com/widgetembed/?symbols=SPX,SPY,QQQ,DIA&theme=dark&style=1&locale=en&toolbar_bg=000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=true&save_image=false"
                width="100%"
                height="100%"
                frameBorder="0"
                className="w-full h-full"
                title="Market Overview"
              />
            </div>
          </div>

          {/* FinancialJuice News Feed - Bloomberg Terminal News Style */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden flex flex-col">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2">
              <span className="text-xs font-mono font-bold text-safety-orange uppercase">NEWS FEED</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src="https://www.financialjuice.com/widgets/newswidget.aspx?theme=dark&font=monospace"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="yes"
                className="w-full h-full"
                title="FinancialJuice News Feed"
              />
            </div>
          </div>

          {/* Economic Calendar */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden flex flex-col">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2">
              <span className="text-xs font-mono font-bold text-safety-orange uppercase">ECONOMIC CALENDAR</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src="https://www.financialjuice.com/widgets/economiccalendarwidget.aspx?theme=dark&font=monospace"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="yes"
                className="w-full h-full"
                title="FinancialJuice Economic Calendar"
              />
            </div>
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          className="w-1 bg-[rgba(0,255,0,0.3)] hover:bg-fluorescent-green cursor-col-resize transition-colors"
          onMouseDown={() => handleMouseDown('center')}
        />

        {/* Right Panel - Heatmap & Whale Radar */}
        <div 
          className="flex flex-col gap-0.5"
          style={{ width: `${panelSizes.right}%` }}
        >
          {/* S&P 500 Heatmap - Bloomberg Heatmap Style */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden flex flex-col">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2">
              <span className="text-xs font-mono font-bold text-safety-orange uppercase">S&P 500 HEATMAP</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src="https://www.tradingview.com/widgetembed/?symbols=SPX&theme=dark&style=1&locale=en&toolbar_bg=000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=true&save_image=false"
                width="100%"
                height="100%"
                frameBorder="0"
                className="w-full h-full"
                title="S&P 500 Heatmap"
              />
            </div>
          </div>

          {/* Global Whale Radar - Bloomberg Tape Style */}
          <div className="flex-1 border border-fluorescent-green bg-tactical-black overflow-hidden">
            <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2">
              <span className="text-xs font-mono font-bold text-safety-orange uppercase">WHALE RADAR</span>
            </div>
            <div className="h-full overflow-y-auto">
              <div className="p-1 space-y-0">
                {whaleData.length > 0 ? (
                  whaleData.map((whale, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center px-2 py-1 hover:bg-[rgba(0,255,0,0.05)] transition-colors border-b border-[rgba(0,255,0,0.1)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold w-8 ${
                          whale.type === 'Buy' ? 'text-fluorescent-green' : 'text-emergency-red'
                        }`}>
                          {whale.type === 'Buy' ? '↑' : '↓'}
                        </span>
                        <span className="text-xs font-mono text-fluorescent-green font-bold">
                          {whale.symbol || 'ES1!'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-300">
                          ${(whale.tradeValue / 1000000).toFixed(2)}M
                        </span>
                        <span className="text-xs font-mono text-cyan-accent w-16 text-right">
                          {(() => {
                            const nyTime = new Date(new Date(whale.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }));
                            let hours = nyTime.getHours();
                            const minutes = nyTime.getMinutes().toString().padStart(2, '0');
                            const seconds = nyTime.getSeconds().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            return `${hours}:${minutes}:${seconds} ${ampm} ET`;
                          })()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono text-gray-500 p-2">
                    Monitoring large trades...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroFeed;
