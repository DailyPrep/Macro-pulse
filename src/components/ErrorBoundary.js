import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-tactical-black text-fluorescent-green font-mono overflow-hidden flex flex-col">
          <div className="h-8 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2 text-xs flex-shrink-0">
            <span className="text-fluorescent-green font-bold">🛰️ GOVERNMENT RADAR</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div style={{ textAlign: 'center', color: '#ff0000', padding: '20px' }}>
              <div style={{ fontSize: '14px', marginBottom: '10px' }}>⚠️ Component Error</div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '20px' }}>
                {this.state.error?.message || 'An error occurred'}
              </div>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00ff00',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                Reload Component
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
