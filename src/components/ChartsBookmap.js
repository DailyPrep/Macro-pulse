import React from 'react';

/**
 * TAB 3: CHARTS/BOOKMAP (The Tape)
 * 4-Pane Grid using TradingView Public Widgets: [ES1!, NQ1!, US10Y, DXY]
 */
const ChartsBookmap = () => {
  return (
    <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-2 p-2 bg-black" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      {/* Top Left: ES1! */}
      <div className="border border-fluorescent-green bg-black relative overflow-hidden flex flex-col">
        <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2 flex-shrink-0 z-10">
          <h3 className="text-xs font-mono font-bold text-fluorescent-green uppercase">
            ES1!
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src="https://www.tradingview.com/widgetembed/?symbol=CME_MINI:ES1!&interval=5&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 'none' }}
            title="ES1! Chart"
          />
        </div>
      </div>

      {/* Top Right: NQ1! */}
      <div className="border border-fluorescent-green bg-black relative flex flex-col">
        <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2 flex-shrink-0 z-10">
          <h3 className="text-xs font-mono font-bold text-fluorescent-green uppercase">
            NQ1!
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src="https://www.tradingview.com/widgetembed/?symbol=CME_MINI:NQ1!&interval=5&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 'none' }}
            title="NQ1! Chart"
          />
        </div>
      </div>

      {/* Bottom Left: US10Y */}
      <div className="border border-fluorescent-green bg-black relative flex flex-col">
        <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2 flex-shrink-0 z-10">
          <h3 className="text-xs font-mono font-bold text-fluorescent-green uppercase">
            US10Y
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src="https://www.tradingview.com/widgetembed/?symbol=FRED:DGS10&interval=D&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 'none' }}
            title="US10Y Chart"
          />
        </div>
      </div>

      {/* Bottom Right: DXY */}
      <div className="border border-fluorescent-green bg-black relative flex flex-col">
        <div className="h-6 bg-black border-b border-fluorescent-green flex items-center px-2 flex-shrink-0 z-10">
          <h3 className="text-xs font-mono font-bold text-fluorescent-green uppercase">
            DXY
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src="https://www.tradingview.com/widgetembed/?symbol=FRED:DTWEXBGS&interval=D&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 'none' }}
            title="DXY Chart"
          />
        </div>
      </div>
    </div>
  );
};

export default ChartsBookmap;
