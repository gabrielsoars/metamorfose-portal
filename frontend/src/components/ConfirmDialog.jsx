// Modal de confirmação centralizado (mobile e desktop). Usado antes de ações destrutivas.
export function ConfirmDialog({ title, message, confirmLabel = 'Excluir', busy = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h2 id="confirm-title" className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 min-h-12 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 min-h-12 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busy ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
