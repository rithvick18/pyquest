import React, { useState, useCallback } from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface FallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

// Error Boundary using class (required for componentDidCatch)
class ErrorBoundaryClass extends React.Component<
    ErrorBoundaryProps & { onError?: (error: Error, errorInfo: React.ErrorInfo) => void },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: ErrorBoundaryProps & { onError?: (error: Error, errorInfo: React.ErrorInfo) => void }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <DefaultErrorFallback
                    error={this.state.error!}
                    resetErrorBoundary={this.reset}
                />
            );
        }

        return this.props.children;
    }
}

// Default error UI component
function DefaultErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-8">
            <div className="max-w-md w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 text-center shadow-2xl">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500"></i>
                </div>

                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Something went wrong
                </h2>

                <p className="text-[var(--text-secondary)] text-sm mb-6">
                    We encountered an unexpected error. This has been logged and we'll look into it.
                </p>

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-6 text-left">
                    <code className="text-xs text-red-400 font-mono break-all">
                        {error?.message || 'Unknown error'}
                    </code>
                </div>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={resetErrorBoundary}
                        className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-colors"
                    >
                        <i className="fa-solid fa-rotate-right mr-2"></i>
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        </div>
    );
}

// Export the class component as default
export default ErrorBoundaryClass;
