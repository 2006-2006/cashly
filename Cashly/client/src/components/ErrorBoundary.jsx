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
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center font-mono">
                    <h1 className="text-3xl text-red-500 font-bold mb-4">Something went wrong.</h1>
                    <div className="bg-gray-900 p-6 rounded-xl border border-red-500/30 max-w-2xl overflow-auto w-full">
                        <p className="text-lg text-red-300 mb-2">{this.state.error && this.state.error.toString()}</p>
                        <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-8 px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-bold"
                    >
                        Return to Home
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
