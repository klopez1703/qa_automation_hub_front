import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/ExecutionConsole.css";

const ACTIVE_STATUSES = ["PENDING", "RUNNING", "EN_PROGRESO"];

export default function ExecutionConsole({ executionId }) {
  const { auth } = useAuth();
  const [execution, setExecution] = useState(null);
  const [log, setLog] = useState("");
  const consoleRef = useRef(null);
  const hasDownloaded = useRef(false);

  useEffect(() => {
    if (!executionId) return;
    let cancelled = false;
    let timer;

    hasDownloaded.current = false;

    async function poll() {
      try {
        const [exec, logText] = await Promise.all([
          api.get(`/executions/${executionId}`, auth.token),
          fetch(
            `${import.meta.env.VITE_API_URL || "/api"}/executions/${executionId}/log`,
            {
              headers: { Authorization: `Bearer ${auth.token}` },
            }
          ).then((r) => (r.ok ? r.text() : "")),
        ]);

        if (cancelled) return;
        setExecution(exec);
        setLog(logText);

        if (ACTIVE_STATUSES.includes(exec.status)) {
          timer = setTimeout(poll, 2000);
        } else if (exec.downloadUrl && !hasDownloaded.current) {
          hasDownloaded.current = true;
          const baseURL =
            import.meta.env.VITE_API_URL || "http://localhost:4000";
          window.open(`${baseURL}${exec.downloadUrl}`, "_blank");
        }
      } catch {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [executionId, auth.token]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [log]);

  if (!executionId) return null;

  const status = execution?.status || "PENDING";
  const isActive = ACTIVE_STATUSES.includes(status);

  const idString = String(executionId);
  const displayId = idString.length > 8 ? idString.slice(0, 8) : idString;
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  return (
    <div className="card exc-card" id="cardExecutionConsole">
      <div className="exc-header">
        <h3 className="exc-title">Ejecución #{displayId}</h3>

        <div className="exc-actions">
          {execution?.downloadUrl && (
            <a
              href={`${baseURL}${execution.downloadUrl}`}
              target="_blank"
              rel="noreferrer"
              className="exc-download-link"
            >
              📥 Descargar Matriz
            </a>
          )}
          <span className={`badge badge-${status}`}>{status}</span>
        </div>
      </div>

      <div className="console exc-terminal" ref={consoleRef}>
        {log || "Esperando salida del motor de Python / ScreenPy…"}
        {isActive && <span className="console-cursor" />}
      </div>
    </div>
  );
}