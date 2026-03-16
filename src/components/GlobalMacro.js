import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * TAB 1: GLOBAL MACRO (The Pulse)
 * Left: FinancialJuice Public News Widget (Full Height)
 * Center: FinancialJuice Economic Calendar
 * Right: FRED Macro Data (DXY, US10Y, Net Liquidity) via server.js API
 */
const GlobalMacro = () => {
  const [fredData, setFredData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder - FRED removed
    setLoading(false);
    setFredData(null); // FRED data unavailable
  }, []);

  return (
    <div className="h-full w-full bg-black text-fluorescent-green p-2 overflow-hidden" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      <div className="grid grid-cols-3 gap-2 h-full">
        {/* Left Column: FinancialJuice News Widget (Full Height) */}
        <div className="bg-black border border-fluorescent-green h-full overflow-hidden">
          <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2">
            <span className="text-xs font-mono font-bold text-fluorescent-green uppercase">FinancialJuice News</span>
          </div>
          <div className="h-[calc(100%-1.5rem)]">
            <iframe
              src="https://www.financialjuice.com/widgets/newswidget.aspx?theme=dark&font=monospace"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="yes"
              style={{ border: 'none' }}
              title="FinancialJuice News"
            />
          </div>
        </div>

        {/* Center Column: FinancialJuice Economic Calendar */}
        <div className="bg-black border border-fluorescent-green h-full overflow-hidden">
          <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2">
            <span className="text-xs font-mono font-bold text-fluorescent-green uppercase">Economic Calendar</span>
          </div>
          <div className="h-[calc(100%-1.5rem)]">
            <iframe
              src="https://www.financialjuice.com/widgets/economiccalendarwidget.aspx?theme=dark&font=monospace"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="yes"
              style={{ border: 'none' }}
              title="Economic Calendar"
            />
          </div>
        </div>

        {/* Right Column: FRED Macro Data */}
        <div className="bg-black border border-fluorescent-green h-full overflow-auto">
          <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2 sticky top-0 z-10">
            <span className="text-xs font-mono font-bold text-fluorescent-green uppercase">FRED Macro Data</span>
          </div>
          <div className="p-3 space-y-3">
            {loading ? (
              <div className="text-center text-fluorescent-green py-8 text-sm font-mono">
                Loading FRED data...
              </div>
            ) : fredData ? (
              <>
                {/* Net Liquidity */}
                {fredData.netLiquidity !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">Net Liquidity</div>
                    <div className="text-lg font-mono font-bold text-fluorescent-green">
                      ${(fredData.netLiquidity / 1000000000000).toFixed(2)}T
                    </div>
                    <div className="text-xs text-fluorescent-green mt-1 font-mono opacity-70">
                      WALCL - WTREGEN - RRPONTSYD
                    </div>
                  </div>
                )}

                {/* DXY */}
                {fredData.DXY !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">Dollar Index (DXY)</div>
                    <div className="text-lg font-mono font-bold text-fluorescent-green">
                      {fredData.DXY.toFixed(2)}
                    </div>
                    {fredData.DXYChange !== undefined && (
                      <div className={`text-xs mt-1 font-mono ${fredData.DXYChange >= 0 ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
                        {fredData.DXYChange >= 0 ? '+' : ''}{fredData.DXYChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}

                {/* US10Y */}
                {fredData.US10Y !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">10-Year Treasury</div>
                    <div className="text-lg font-mono font-bold text-fluorescent-green">
                      {fredData.US10Y.toFixed(2)}%
                    </div>
                    {fredData.US10YChange !== undefined && (
                      <div className={`text-xs mt-1 font-mono ${fredData.US10YChange >= 0 ? 'text-emergency-red' : 'text-fluorescent-green'}`}>
                        {fredData.US10YChange >= 0 ? '+' : ''}{fredData.US10YChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Stress Index */}
                {fredData.STLFSI4 !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">Financial Stress Index</div>
                    <div className={`text-lg font-mono font-bold ${fredData.STLFSI4 > 0 ? 'text-emergency-red' : 'text-fluorescent-green'}`}>
                      {fredData.STLFSI4.toFixed(2)}
                    </div>
                    <div className="text-xs text-fluorescent-green mt-1 font-mono opacity-70">
                      {fredData.STLFSI4 > 0 ? 'STRESS' : 'NORMAL'}
                    </div>
                  </div>
                )}

                {/* WALCL */}
                {fredData.WALCL !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">Fed Balance Sheet</div>
                    <div className="text-sm font-mono text-fluorescent-green">
                      ${(fredData.WALCL / 1000000000000).toFixed(2)}T
                    </div>
                  </div>
                )}

                {/* WTREGEN */}
                {fredData.WTREGEN !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">Treasury General Account</div>
                    <div className="text-sm font-mono text-fluorescent-green">
                      ${(fredData.WTREGEN / 1000000000).toFixed(2)}B
                    </div>
                  </div>
                )}

                {/* RRPONTSYD */}
                {fredData.RRPONTSYD !== undefined && (
                  <div className="bg-black border border-fluorescent-green rounded p-3">
                    <div className="text-xs text-fluorescent-green mb-1 font-mono uppercase">Reverse Repo</div>
                    <div className="text-sm font-mono text-fluorescent-green">
                      ${(fredData.RRPONTSYD / 1000000000).toFixed(2)}B
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                {fredData.timestamp && (
                  <div className="text-xs text-fluorescent-green opacity-50 font-mono pt-2 border-t border-fluorescent-green">
                    Updated: {(() => {
                      const nyTime = new Date(new Date(fredData.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }));
                      let hours = nyTime.getHours();
                      const minutes = nyTime.getMinutes().toString().padStart(2, '0');
                      const seconds = nyTime.getSeconds().toString().padStart(2, '0');
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      return `${hours}:${minutes}:${seconds} ${ampm} ET`;
                    })()}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-fluorescent-green py-8 text-sm font-mono">
                FRED data unavailable (FRED removed)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMacro;

