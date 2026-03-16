import React, { startTransition } from 'react';

const Header = ({ tabs, activeTab, setActiveTab, currentTime, nyTime }) => {
  const handleTabClick = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };
  
  return (
    <div className="h-8 bg-black border-b border-fluorescent-green flex items-center" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      {/* Navigation Tabs */}
      <div className="flex flex-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`
              flex-1 px-4 text-xs font-mono font-semibold uppercase
              border-r border-fluorescent-green last:border-r-0
              transition-all duration-200
              ${
                activeTab === tab
                  ? 'bg-black text-fluorescent-green border-b-2 border-fluorescent-green shadow-[0_0_8px_rgba(0,255,0,0.3)]'
                  : 'bg-black text-gray-500 hover:bg-black hover:text-fluorescent-green'
              }
            `}
            style={{ fontFamily: "'Roboto Mono', monospace" }}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Regime Indicator Bar with Clock on Right */}
      <div className="px-4 border-l border-fluorescent-green h-full flex items-center">
        <span className="text-cyan-accent text-xs font-mono">
          {nyTime}
        </span>
      </div>
    </div>
  );
};

export default Header;

