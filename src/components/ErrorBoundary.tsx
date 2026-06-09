import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6 border border-red-500/20 shadow-lg shadow-red-500/5">
            ⚠️
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-wide">Algo salió mal</h1>
          <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
            La aplicación experimentó un error inesperado. Puedes intentar recargar la página o volver al inicio.
          </p>
          {this.state.error && (
            <div className="w-full max-w-md bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 text-left overflow-auto font-mono text-[10px] text-red-400 max-h-[150px] custom-scrollbar">
              {this.state.error.toString()}
            </div>
          )}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition cursor-pointer text-xs uppercase tracking-wider"
            >
              Recargar página
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl transition cursor-pointer text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
