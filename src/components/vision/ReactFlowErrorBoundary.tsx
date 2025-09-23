"use client";

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ReactFlowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log ReactFlow specific errors to avoid noise
    if (
      error.message.includes('deletedFiber.parentNode') ||
      error.message.includes('ReactFlow') ||
      error.stack?.includes('@xyflow')
    ) {
      console.warn('ReactFlow error caught by boundary:', error.message);
      // Don't log the full stack trace for known ReactFlow issues
      return;
    }
    
    // Log other errors normally
    console.error('Error caught by ReactFlow boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div className="w-full h-full flex items-center justify-center bg-background">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">Visualization temporarily unavailable</h3>
            <p className="text-muted-foreground mb-4">
              The canvas encountered an issue. Please refresh the page to reload the visualization.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}