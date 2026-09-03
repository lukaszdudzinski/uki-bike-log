import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Auto reload on chunk load errors
    if (
      error.name === 'ChunkLoadError' ||
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Failed to fetch dynamically imported module')
    ) {
      const reloaded = sessionStorage.getItem('chunk_failed_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_failed_reload', 'true');
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#fff', marginTop: '40px' }}>
          <h3 style={{ color: 'var(--color-primary)' }}>Aktualizacja w tle 🚀</h3>
          <p style={{ margin: '12px 0 24px 0', fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>
            Pobrano nową wersję modułu. Odśwież aplikację, by kontynuować.
          </p>
          <button 
            className="btn-primary"
            style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold' }}
            onClick={() => {
              sessionStorage.removeItem('chunk_failed_reload');
              window.location.reload();
            }}
          >
            Odśwież aplikację
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
