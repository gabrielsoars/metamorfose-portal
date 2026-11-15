import { useSyncExternalStore } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { fecharAviso, inscreverAvisos, lerAvisos } from './avisosEstado.js';

// Avisos de erro no canto da tela, no lugar do window.alert. Fica montado uma vez no App;
// as telas disparam os avisos com `mostrarErro` (avisosEstado.js).
export function Avisos() {
  const lista = useSyncExternalStore(inscreverAvisos, lerAvisos);

  // Celular: embaixo e centralizado, acima da barra de navegação inferior (h-16).
  // Desktop: canto inferior direito. z-[60] fica acima do AppShell (30), Sheet (40) e ConfirmDialog (50).
  return (
    <div
      aria-live="assertive"
      className="fixed z-[60] inset-x-4 bottom-20 flex flex-col items-center gap-2 pointer-events-none md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
    >
      {lista.map((aviso) => (
        <div
          key={aviso.id}
          className="pointer-events-auto w-full max-w-sm bg-white border border-red-200 border-l-4 border-l-red-500 rounded-xl shadow-lg p-3 flex items-start gap-3"
        >
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-medium text-gray-800">{aviso.mensagem}</p>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => fecharAviso(aviso.id)}
            className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
