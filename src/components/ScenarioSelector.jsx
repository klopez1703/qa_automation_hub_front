import { useEffect, useMemo } from "react";
import "../styles/ScenarioSelector.css";

export default function ScenarioSelector({
  onOpenMatrixModal,
  selectedModuleName,
  selectedSubModuleName,
  escenarios,
  selectedScenarioIds,
  setSelectedScenarioIds,
  executionType,
  setExecutionType,
}) {
  const filteredScenarios = useMemo(
    () =>
      escenarios.filter((s) => {
        if (!s.modulo) return false;

        const moduloGuardado = s.modulo.toLowerCase();
        const moduloUI = (selectedModuleName || "").toLowerCase();
        const subModuloUI = (selectedSubModuleName || "").toLowerCase();

        return (
          moduloGuardado.includes(subModuloUI) ||
          subModuloUI.includes(moduloGuardado) ||
          moduloGuardado.includes(moduloUI) ||
          moduloUI.includes(moduloGuardado)
        );
      }),
    [escenarios, selectedModuleName, selectedSubModuleName]
  );

  useEffect(() => {
    setSelectedScenarioIds(filteredScenarios.map((s) => s.id));
  }, [filteredScenarios, setSelectedScenarioIds]);

  const handleToggleScenario = (id) => {
    setSelectedScenarioIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedScenarioIds.length === filteredScenarios.length) {
      setSelectedScenarioIds([]);
    } else {
      setSelectedScenarioIds(filteredScenarios.map((s) => s.id));
    }
  };

  return (
    <section className="card mt-4 ss-card" id="cardEscenarios">
      <div className="head ss-header">
        <span className="num ss-step-badge">1</span>

        <div className="grow ss-header-info">
          <h2 className="ss-title">Escenarios a ejecutar</h2>
          <p className="ss-subtitle">
            Vienen de la Matriz de pruebas, con su test de Python y sus pasos.
          </p>
        </div>

        {filteredScenarios.length > 0 && (
          <div className="ss-header-actions">
            <button
              type="button"
              className="ss-outline-btn ss-outline-btn--edit"
              onClick={onOpenMatrixModal}
            >
              Editar Matriz
            </button>

            <button
              type="button"
              className="btn ss-outline-btn"
              id="pickall"
              onClick={handleToggleAll}
            >
              {selectedScenarioIds.length === filteredScenarios.length
                ? "Quitar todos"
                : "Marcar todos"}
            </button>
          </div>
        )}
      </div>

      <div id="run-list">
        {filteredScenarios.length === 0 ? (
          <div className="empty ss-empty-state">
            <b className="ss-empty-title">
              No hay escenarios para {selectedModuleName} ›{" "}
              {selectedSubModuleName}
            </b>
            <span className="ss-empty-desc">
              Agrégalos en la Matriz de pruebas eligiendo este módulo y
              submódulo.
            </span>
            <button
              type="button"
              className="btn pri ss-primary-btn"
              onClick={onOpenMatrixModal}
            >
              Ir a la Matriz de pruebas
            </button>
          </div>
        ) : (
          filteredScenarios.map((s) => {
            const isSelected = selectedScenarioIds.includes(s.id);
            const totalPasos = s.pasos ? s.pasos.length : 0;
            const totalCapturas =
              s.capturas ||
              (s.pasos
                ? s.pasos.filter((p) => p.origen === "Automatizado").length
                : 0);

            return (
              <label
                key={s.id}
                className={`pick ss-pick-item ${
                  isSelected ? "ss-pick-item--selected" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="ss-checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleScenario(s.id)}
                />

                <div className="ss-scenario-info">
                  <b className="ss-scenario-name">
                    {s.nombre || s.nombreEscenario}
                  </b>
                  <small className="ss-scenario-meta">
                    {s.id} · {totalPasos} pasos · {totalCapturas} con captura
                  </small>
                </div>

                <span
                  className={`tag ss-priority-tag ${
                    s.prioridad ? s.prioridad.toLowerCase() : "alta"
                  }`}
                >
                  {s.prioridad || "Alta"}
                </span>
              </label>
            );
          })
        )}
      </div>

      <div className="field ss-exec-type-field">
        <label htmlFor="execType" className="ss-exec-type-label">
          Tipo de Ejecución
        </label>

        <div className="seg" role="radiogroup">
          <label>
            <input
              type="radio"
              name="tipo"
              value="Individual"
              checked={executionType === "Individual"}
              onChange={() => setExecutionType("Individual")}
            />
            <span>
              Individual<small>Una sola transacción</small>
            </span>
          </label>

          <label>
            <input
              type="radio"
              name="tipo"
              value="Lote"
              checked={executionType === "Lote"}
              onChange={() => setExecutionType("Lote")}
            />
            <span>
              Lote<small>Varias seguidas</small>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}