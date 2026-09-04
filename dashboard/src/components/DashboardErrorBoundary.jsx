import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Dashboard render error]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-6 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">This page could not be displayed</h2>
            <p className="mt-1 text-sm">Your session is safe. Reload this page to try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground"
            >
              <RefreshCw className="size-4" /> Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
