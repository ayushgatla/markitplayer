import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
            <img src="/blasync_icon.svg" alt="Blasync" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8 leading-relaxed">
            An unexpected error occurred while loading the application.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shadow-lg"
            >
              Refresh Page
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
            >
              Clear Cache & Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
