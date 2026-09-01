import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PACELOG ErrorBoundary] Erro inesperado capturado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center p-6 text-white font-sans text-center">
          <div className="bg-[#0D1C2D] border border-[#FF6B35]/40 rounded-xl p-6 max-w-md w-full flex flex-col items-center gap-4 shadow-[0_0_40px_rgba(255,107,53,0.15)]">
            <div className="w-12 h-12 rounded-full bg-[#FF6B35]/15 border border-[#FF6B35]/30 flex items-center justify-center text-[#FF6B35]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide text-[#D4E4FA]">
                Instabilidade Detectada
              </h2>
              <p className="font-mono text-xs text-[#8F9380] leading-relaxed">
                Ocorreu uma falha inesperada na interface. Clique abaixo para reiniciar a navegação com segurança.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="w-full bg-[#161C24] p-3 rounded border border-[#1F2937] text-left">
                <p className="font-mono text-[11px] text-[#FFB4AB] break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-[#D4F684] text-[#051424] hover:bg-[#c8f060] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,246,132,0.25)] active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
