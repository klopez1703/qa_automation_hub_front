import { useState, useEffect } from "react";
import "../styles/ExecutionChecklist.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const SUCCESS_STATUSES = ["EXITO", "COMPLETED"];
const FAIL_STATUSES = ["FALLO", "FAILED"];

export default function ExecutionChecklist({
  pasosEscenario = [],
  logs = "",
  isFinished = false,
  executionStatus = "EN_PROGRESO",
  evidenceUrl = null,
}) {
  const [modalState, setModalState] = useState({ open: true, type: "START" });
  const [pasosEstado, setPasosEstado] = useState([]);

  // Cargar lista de pasos al montar o cambiar escenario
  useEffect(() => {
    if (pasosEscenario && pasosEscenario.length > 0) {
      setPasosEstado(
        pasosEscenario.map((p, idx) => ({
          id: idx + 1,
          descripcion:
            p.descripcionDeLaPrueba || p.descripcion || `Paso ${idx + 1}`,
          tipo: p.tipoPaso || "P",
          status: idx === 0 ? "RUNNING" : "PENDING",
        }))
      );
    } else {
      setPasosEstado([]);
    }
  }, [pasosEscenario]);

  // Actualizar lista en tiempo real analizando el stream de logs
  useEffect(() => {
    if (!logs || pasosEstado.length === 0) return;

    const logLower = logs.toLowerCase();

    setPasosEstado((prevPasos) => {
      const evPCMatches = (logLower.match(/evidencia de pc guardada/g) || [])
        .length;
      const evPOSMatches = (logLower.match(/evidencia de pos guardada/g) || [])
        .length;

      let pcCount = 0;
      let posCount = 0;

      return prevPasos
        .map((paso) => {
          let isDone = false;

          if (paso.tipo === "P") {
            pcCount++;
            if (pcCount <= evPCMatches) isDone = true;
          } else {
            posCount++;
            if (posCount <= evPOSMatches) isDone = true;
          }

          return isDone ? { ...paso, status: "COMPLETED" } : paso;
        })
        .map((paso, idx, arr) => {
          if (paso.status !== "COMPLETED") {
            const prevIsDone =
              idx === 0 || arr[idx - 1].status === "COMPLETED";
            if (prevIsDone) return { ...paso, status: "RUNNING" };
          }
          return paso;
        });
    });
  }, [logs, pasosEstado.length]);

  // Cambiar modal automáticamente según el resultado final de la ejecución
  useEffect(() => {
    if (!isFinished) return;

    if (SUCCESS_STATUSES.includes(executionStatus)) {
      setPasosEstado((prev) =>
        prev.map((p) => ({ ...p, status: "COMPLETED" }))
      );
      setModalState({ open: true, type: "EXITO" });
    } else if (FAIL_STATUSES.includes(executionStatus)) {
      setModalState({ open: true, type: "FALLO" });
    }
  }, [isFinished, executionStatus]);

  const handleCloseModal = () => {
    setModalState({ open: false, type: "" });
  };

  const handleDownload = () => {
    if (evidenceUrl) {
      const downloadLink = evidenceUrl.startsWith("http")
        ? evidenceUrl
        : `${API_BASE_URL}${evidenceUrl}`;
      window.open(downloadLink, "_blank");
    } else {
      alert("La matriz de pruebas aún no está lista para descargar.");
    }
  };

  const isSuccess = SUCCESS_STATUSES.includes(executionStatus);
  const badgeVariant = isFinished
    ? isSuccess
      ? "success"
      : "fail"
    : "progress";

  return (
    <div className="ec-card">
      <div className="ec-header">
        <h3 className="ec-title">⚡ Progreso del Escenario</h3>
        <span className={`ec-status-badge ec-status-badge--${badgeVariant}`}>
          {isFinished ? `EJECUCIÓN: ${executionStatus}` : "EN PROGRESO..."}
        </span>
      </div>

      {/* Checklist de pasos */}
      <div className="ec-steps-list">
        {pasosEstado.map((paso) => {
          const statusKey = paso.status.toLowerCase();

          return (
            <div
              key={paso.id}
              className={`ec-step-item ec-step-item--${statusKey}`}
            >
              <div className="ec-step-left">
                <span className="ec-step-number">#{paso.id}</span>
                <span className={`ec-step-desc ec-step-desc--${statusKey}`}>
                  {paso.descripcion}
                </span>
              </div>

              <div className={`ec-step-state ec-step-state--${statusKey}`}>
                {paso.status === "COMPLETED" && "☑️ Completado"}
                {paso.status === "RUNNING" && "⏳ Ejecutando..."}
                {paso.status === "PENDING" && "En espera"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal dinámico (Inicio / Éxito / Fallo) */}
      {modalState.open && (
        <div className="ec-modal-overlay">
          <div className="ec-modal-box">
            {modalState.type === "START" && (
              <>
                <div className="ec-modal-icon">🚀</div>
                <h2 className="ec-modal-title">Ejecución Iniciada</h2>
                <p className="ec-modal-text">
                  El proceso de automatización ha comenzado. Puedes dar
                  seguimiento a cada paso en tiempo real en la lista.
                </p>
                <button
                  type="button"
                  className="ec-btn ec-btn--primary"
                  onClick={handleCloseModal}
                >
                  Entendido, Ver Progreso
                </button>
              </>
            )}

            {modalState.type === "EXITO" && (
              <>
                <div className="ec-modal-icon">🎉</div>
                <h2 className="ec-modal-title">Escenario Finalizado</h2>
                <p className="ec-modal-text">
                  La automatización completó los pasos y generó la Matriz de
                  Pruebas.
                </p>
                <div className="ec-modal-actions">
                  <button
                    type="button"
                    className="ec-btn ec-btn--primary"
                    onClick={handleDownload}
                  >
                    📥 Descargar Matriz de Pruebas (Excel)
                  </button>
                  <button
                    type="button"
                    className="ec-btn ec-btn--secondary"
                    onClick={handleCloseModal}
                  >
                    Cerrar Ventana
                  </button>
                </div>
              </>
            )}

            {modalState.type === "FALLO" && (
              <>
                <div className="ec-modal-icon">⚠️</div>
                <h2 className="ec-modal-title ec-modal-title--danger">
                  Error en la Ejecución
                </h2>
                <p className="ec-modal-text">
                  La automatización encontró una falla o excepción durante la
                  prueba. La matriz parcial se ha generado.
                </p>
                <div className="ec-modal-actions">
                  {evidenceUrl && (
                    <button
                      type="button"
                      className="ec-btn ec-btn--danger"
                      onClick={handleDownload}
                    >
                      📥 Descargar Evidencias Parciales
                    </button>
                  )}
                  <button
                    type="button"
                    className="ec-btn ec-btn--secondary"
                    onClick={handleCloseModal}
                  >
                    Cerrar Ventana
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}