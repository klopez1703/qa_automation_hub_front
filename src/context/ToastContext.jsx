import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import "../styles/ToastNotifications.css";

const ToastContext = createContext(null);

function inferToastType(message = "") {
  const lower = String(message).toLowerCase();
  if (
    lower.includes("error") ||
    lower.includes("no se pudo") ||
    lower.includes("no responde") ||
    lower.includes("no pertenece") ||
    lower.includes("falló") ||
    lower.includes("inválid")
  ) {
    return "error";
  }
  if (
    lower.includes("✅") ||
    lower.includes("éxito") ||
    lower.includes("exitosamente") ||
    lower.includes("vinculado") ||
    lower.includes("verificada") ||
    lower.includes("actualizada")
  ) {
    return "success";
  }
  if (
    lower.includes("⚠️") ||
    lower.includes("por favor") ||
    lower.includes("debe ") ||
    lower.includes("aviso") ||
    lower.includes("aún no") ||
    lower.includes("no tienes")
  ) {
    return "warning";
  }
  return "info";
}

const DEFAULT_TITLES = {
  success: "Operación completada",
  error: "Error de validación / servicio",
  warning: "Atención requerida",
  info: "Información del sistema",
};

const ICONS = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration }) => {
      const cleanMessage = String(message || "")
        .replace(/^[✅⚠️❌🔒]\s*/, "")
        .trim();
      const resolvedType = type || inferToastType(message);
      const resolvedTitle = title || DEFAULT_TITLES[resolvedType];
      const resolvedDuration =
        duration ?? (resolvedType === "error" ? 6500 : 4200);

      const id = ++idCounter.current;
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: resolvedType,
          title: resolvedTitle,
          message: cleanMessage,
          duration: resolvedDuration,
        },
      ]);

      if (resolvedDuration > 0) {
        setTimeout(() => removeToast(id), resolvedDuration);
      }
      return id;
    },
    [removeToast]
  );

  // Interceptar window.alert globalmente para eliminar "localhost:5173 dice"
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      addToast({ message: msg });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [addToast]);

  const toastApi = {
    show: addToast,
    success: (message, title = "Operación completada") =>
      addToast({ type: "success", title, message }),
    error: (message, title = "Error detectado") =>
      addToast({ type: "error", title, message }),
    warning: (message, title = "Atención requerida") =>
      addToast({ type: "warning", title, message }),
    info: (message, title = "Portal QA Automation") =>
      addToast({ type: "info", title, message }),
  };

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div className="qa-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`qa-toast qa-toast--${t.type}`}>
            <div className="qa-toast__icon">{ICONS[t.type]}</div>
            <div className="qa-toast__body">
              <div className="qa-toast__title">{t.title}</div>
              <div className="qa-toast__message">{t.message}</div>
            </div>
            <button
              type="button"
              className="qa-toast__close"
              onClick={() => removeToast(t.id)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
            <div
              className="qa-toast__progress"
              style={{ animationDuration: `${t.duration}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}