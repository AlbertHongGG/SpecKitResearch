import React from 'react';

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; message?: string }
> {
    state = { hasError: false, message: undefined as string | undefined };

    static getDerivedStateFromError(err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { hasError: true, message };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 16 }}>
                    <h2>發生錯誤</h2>
                    <div style={{ marginBottom: 12, opacity: 0.8 }}>{this.state.message}</div>
                    <button onClick={() => window.location.reload()}>重新整理</button>
                </div>
            );
        }

        return this.props.children;
    }
}
