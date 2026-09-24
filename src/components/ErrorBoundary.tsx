import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error in Omnisym:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.reload();
  };

  private handleCopyError = () => {
    const errorDetails = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack || 'No stack trace'}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'No component stack'}`;
    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-xl bg-slate-800/90 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Application Exception</h1>
                <p className="text-xs text-slate-400">Omnisym encountered a runtime rendering failure</p>
              </div>
            </div>

            <div className="my-5 p-4 bg-slate-950/80 rounded-xl border border-slate-700/60 font-mono text-xs text-red-300 overflow-x-auto max-h-48 whitespace-pre-wrap break-words leading-relaxed">
              <div className="font-semibold text-red-400 mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime error'}
              </div>
              {this.state.error?.stack && (
                <div className="text-slate-400 mt-2 text-[11px]">
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium border border-slate-600/60 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                Clear Storage & Reset
              </button>

              <button
                type="button"
                onClick={this.handleCopyError}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all ml-auto cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Details
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
