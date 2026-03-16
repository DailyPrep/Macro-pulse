import React, { useState, useEffect, useRef, startTransition } from 'react';
import Header from './components/Header';
import GlobalMacroPulse from './components/GlobalMacroPulse';
import StrategicPipeline from './components/StrategicPipeline';
import GlobalFlow from './components/GlobalFlow';

/**
 * Bloomberg Terminal-Style ES1! Command Center
 * Macro-Focused 5-Tab Architecture
 */
function App() {
  const [activeTab, setActiveTab] = useState('GLOBAL MACRO PULSE');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);
  
  // Refs to store refresh functions from components
  const refreshFunctionsRef = useRef({
    macroPulse: null,
    globalFlow: null
  });

  // Update timestamp every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global data refresh - synchronized refresh for all tabs
  // 24/7 Global Scope: All tabs use standard refresh rates
  useEffect(() => {
    // Initial refresh on mount
    setGlobalRefreshTrigger(prev => prev + 1);
    
    // Fast refresh interval for real-time WebSocket-like data (5 seconds for critical feeds)
    const fastRefreshInterval = setInterval(() => {
      setGlobalRefreshTrigger(prev => prev + 1);
    }, 5000); // 5 seconds for real-time data streams
    
    // Standard refresh interval for general data (60 seconds)
    const standardRefreshInterval = setInterval(() => {
      setGlobalRefreshTrigger(prev => prev + 1);
    }, 60000); // 60 seconds for general data

    return () => {
      clearInterval(fastRefreshInterval);
      clearInterval(standardRefreshInterval);
    };
  }, []);

  // 3 Pillars: PULSE, PIPELINE, FLOW (24/7 Global Scope)
  const tabs = ['GLOBAL MACRO PULSE', 'STRATEGIC PIPELINE', 'GLOBAL FLOW'];

  const renderContent = () => {
    switch (activeTab) {
      case 'GLOBAL MACRO PULSE':
        return <GlobalMacroPulse refreshTrigger={globalRefreshTrigger} />;
      case 'STRATEGIC PIPELINE':
        return <StrategicPipeline />;
      case 'GLOBAL FLOW':
        return <GlobalFlow refreshTrigger={globalRefreshTrigger} />;
      default:
        return <GlobalMacroPulse refreshTrigger={globalRefreshTrigger} />;
    }
  };

  // Format time in New York timezone (12-hour format, no leading zero on hours)
  const formatNYTime = () => {
    const nyTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    let hours = nyTime.getHours();
    const minutes = nyTime.getMinutes().toString().padStart(2, '0');
    const seconds = nyTime.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    // Ensure no leading zero - hours is already a number, not a string with padStart
    const timeString = `${hours}:${minutes}:${seconds} ${ampm} ET`;
    console.log('HEADER CLOCK:', hours, ampm, timeString);
    return timeString;
  };

  return (
    <div className="h-screen w-screen bg-black text-fluorescent-green overflow-hidden" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      {/* Navigation Tabs - Now at the very top */}
      <Header 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        currentTime={currentTime}
        nyTime={formatNYTime()}
      />
      
      {/* Main Content Area */}
      <div className="h-[calc(100vh-2rem)] overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;

