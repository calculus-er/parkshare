'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] p-6 text-center">
            <h2 className="text-white text-xl font-light mb-2">Something went wrong</h2>
            <p className="text-white/35 text-sm mb-5">Please refresh the page and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white hover:text-black transition-all"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
