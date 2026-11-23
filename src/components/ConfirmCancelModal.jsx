import "../styles/ConfirmCancelModal.css";

export default function ConfirmCancelModal({
  isOpen,
  onClose,
  onConfirm,
  isCanceling,
}) {
  if (!isOpen) return null;

  return (
    <div className="ccm-overlay" onClick={onClose}>
      <div
        className="ccm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ccm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ccm-icon">⚠️</div>

        <h3 id="ccm-modal-title" className="ccm-title">
          ¿Deseas cancelar la automatización?
        </h3>

        <p className="ccm-description">
          Esta acción detendrá las pruebas en el POS, liberará los procesos del
          servidor y no actualizará la matriz.
        </p>

        <div className="ccm-actions">
          <button
            type="button"
            className="ccm-btn ccm-btn--secondary"
            onClick={onClose}
            disabled={isCanceling}
          >
            No, continuar
          </button>

          <button
            type="button"
            className="ccm-btn ccm-btn--danger"
            onClick={onConfirm}
            disabled={isCanceling}
          >
            {isCanceling ? "Cancelando..." : "Sí, cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}