import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ModuleDataForm from "../components/ModuleDataForm";
import ScenarioSelector from "../components/ScenarioSelector";
import TestSummary from "../components/TestSummary";
import MatrizGeneratorPage from "./MatrixGeneratorPage";
import DeviceSetup from "../components/DeviceSetup";
import ExecutionChecklist from "../components/ExecutionChecklist";
import ConfirmCancelModal from "../components/ConfirmCancelModal";
import "../styles/ExecuteScenarioPage.css";

const FINAL_EXECUTION_STATUSES = [
  "EXITO",
  "COMPLETED",
  "FALLO",
  "FAILED",
  "CANCELADO",
];

function getInitialConnection() {
  const savedMode = localStorage.getItem("pos_conn_mode") || "ADB";
  if (savedMode === "WIFI") {
    return {
      ip: localStorage.getItem("pos_device_ip") || "",
      port: localStorage.getItem("pos_device_port") || "5000",
    };
  }
  return { ip: "127.0.0.1", port: "5000" };
}

const INITIAL_FORM_DATA = {
  connection: getInitialConnection(),
  parameters: {},
  history: {
    nombreHistoria: "",
    codigoHistoria: "",
    tribu: "",
    squad: "",
    pais: "",
    productOwner: "",
    scrumMaster: "",
    fechaElaboracion: "",
    elaboradoPor: "",
  },
};

export default function ExecuteScenarioPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  // Sincronización en vivo con qa-hub-auth (cuando se aprueban o revocan tickets)
  const [savedAuth, setSavedAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncAuth = () => {
      try {
        setSavedAuth(JSON.parse(localStorage.getItem("qa-hub-auth") || "null"));
      } catch {
        setSavedAuth(null);
      }
    };
    window.addEventListener("qa-auth-updated", syncAuth);
    return () => window.removeEventListener("qa-auth-updated", syncAuth);
  }, []);

  const token = savedAuth?.token || auth?.token || "";
  const currentUser = savedAuth?.user || auth?.user || {};
  const rawRole =
    typeof currentUser?.role === "string"
      ? currentUser.role
      : currentUser?.role?.name || "";
  const isAdmin = rawRole.toUpperCase() === "ADMIN";
  const userPermissions = currentUser?.permissions || [];

  const can = (permission) =>
    isAdmin ||
    userPermissions.includes("*") ||
    userPermissions.includes(permission);

  // Modal para la matriz
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  // Datos de proyectos, módulos y submódulos
  const [allProjectsData, setAllProjectsData] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectId, setProjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [submoduleId, setSubmoduleId] = useState("");
  const [escenarios, setEscenarios] = useState([]);

  // Control de ejecución y modales
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Persistencia inicial desde localStorage para evitar perder el estado al cambiar de pantalla
  const [executionId, setExecutionId] = useState(
    () => localStorage.getItem("active_execution_id") || null
  );
  const [isExecuting, setIsExecuting] = useState(
    () => localStorage.getItem("is_executing") === "true"
  );
  const [executionData, setExecutionData] = useState(null);

  const [selectedScenarioIds, setSelectedScenarioIds] = useState(() => {
    try {
      const guardados = localStorage.getItem("selected_scenario_ids");
      return guardados ? JSON.parse(guardados) : [];
    } catch {
      return [];
    }
  });

  const [executionType, setExecutionType] = useState("Individual");

  // Estado de preparación del entorno POS (según canal ADB, Wi-Fi o Serial)
  const [isEnvReady, setIsEnvReady] = useState(
    () => localStorage.getItem("pos_env_ready") === "true"
  );
  const entornoDesbloqueado = isEnvReady || isExecuting;

  // Estado global del formulario
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Callbacks memorizados para DeviceSetup (evitan bucles de re-render)
  const handleEnvironmentReady = useCallback((ready) => {
    setIsEnvReady(ready);
    localStorage.setItem("pos_env_ready", ready ? "true" : "false");
  }, []);

  const handleConnectionChange = useCallback(({ mode, ip, port }) => {
    setFormData((prev) => {
      const nextIp = mode === "WIFI" ? ip || "" : ip;
      const nextPort = String(port || "5000");

      if (
        prev.connection?.ip === nextIp &&
        String(prev.connection?.port) === nextPort
      ) {
        return prev;
      }

      return {
        ...prev,
        connection: {
          ...prev.connection,
          ip: nextIp,
          port: nextPort,
        },
      };
    });
  }, []);

  // -------------------------------------------------------------------------
  // 1. SINCRONIZACIÓN CON LOCALSTORAGE
  // -------------------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem(
      "selected_scenario_ids",
      JSON.stringify(selectedScenarioIds)
    );
  }, [selectedScenarioIds]);

  useEffect(() => {
    if (executionId) {
      localStorage.setItem("active_execution_id", executionId);
    } else {
      localStorage.removeItem("active_execution_id");
    }
    localStorage.setItem("is_executing", isExecuting ? "true" : "false");
  }, [executionId, isExecuting]);

  useEffect(() => {
    localStorage.setItem("pos_env_ready", isEnvReady ? "true" : "false");
  }, [isEnvReady]);

  // -------------------------------------------------------------------------
  // 2. CARGA DE PROYECTOS / MÓDULOS INICIALES (Endpoint original /modules)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    setLoadingProjects(true);
    api
      .get("/modules", token)
      .then((projects) => {
        setAllProjectsData(Array.isArray(projects) ? projects : []);
      })
      .catch((err) => {
        console.error("Error cargando módulos iniciales:", err);
        setAllProjectsData([]);
      })
      .finally(() => setLoadingProjects(false));
  }, [token]);

  // Filtrado estricto: ADMIN ve todos los proyectos; demás usuarios solo los asignados
  const allowedProjectIds = useMemo(
    () => (currentUser?.projects || []).map((p) => Number(p.id)),
    [currentUser?.projects]
  );

  const projectsData = useMemo(() => {
    if (isAdmin) return allProjectsData;
    return allProjectsData.filter((p) =>
      allowedProjectIds.includes(Number(p.id))
    );
  }, [isAdmin, allProjectsData, allowedProjectIds]);

  // Mantener selección válida cuando cambia projectsData
  useEffect(() => {
    if (projectsData.length === 0) {
      setProjectId("");
      setModuleId("");
      setSubmoduleId("");
      return;
    }

    const currentProj =
      projectsData.find((p) => p.id.toString() === projectId) || projectsData[0];
    setProjectId(currentProj.id.toString());

    const mods = currentProj.modules || [];
    const currentMod =
      mods.find((m) => m.id.toString() === moduleId) || mods[0];
    setModuleId(currentMod ? currentMod.id.toString() : "");

    const submods = currentMod?.submodules || [];
    const currentSub =
      submods.find((sm) => sm.id.toString() === submoduleId) || submods[0];
    setSubmoduleId(currentSub ? currentSub.id.toString() : "");
  }, [projectsData, projectId, moduleId, submoduleId]);

  // -------------------------------------------------------------------------
  // 3. RECONEXIÓN AUTOMÁTICA AL NAVEGAR O VOLVER DE OTRA PANTALLA
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!executionId || !token) return;

    api
      .get(`/executions/${executionId}/status`, token)
      .then((res) => {
        const data = res.data || res;
        const status = data.status;

        setExecutionData(data);

        // Si la ejecución ya concluyó en backend, restaurar botón azul
        if (FINAL_EXECUTION_STATUSES.includes(status)) {
          setIsExecuting(false);
          setExecutionId(null);
          localStorage.removeItem("active_execution_id");
          localStorage.setItem("is_executing", "false");
        }
      })
      .catch((err) =>
        console.error("Error al reconectar con ejecución activa:", err)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // 4. POLLING EN SEGUNDO PLANO (Consulta periódica cada 2.5s)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!executionId || !isExecuting || !token) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(
          `/executions/${executionId}/status`,
          token
        );
        const data = response.data || response;
        const status = data.status;

        setExecutionData(data);

        if (FINAL_EXECUTION_STATUSES.includes(status)) {
          setIsExecuting(false);
          localStorage.setItem("is_executing", "false");

          clearInterval(interval);

          if (status === "EXITO" || status === "COMPLETED") {
            alert("✅ Escenario Finalizado con Éxito. Matriz actualizada.");
          } else if (status === "FALLO" || status === "FAILED") {
            alert("⚠️ El escenario falló durante la ejecución. Revisa los logs.");
          }
        }
      } catch (error) {
        console.error("Error consultando el estado de la ejecución:", error);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [executionId, isExecuting, token]);

  // -------------------------------------------------------------------------
  // 5. BLOQUEO DE NAVEGACIÓN O CIERRE ACCIDENTAL DE PESTAÑA (beforeunload)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isExecuting) {
        const msg =
          "⚠️ Hay una automatización en curso. Si recargas o cierras la pantalla, la ejecución podría cancelarse.";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isExecuting]);

  // -------------------------------------------------------------------------
  // SELECCIÓN ACTIVA DE PROYECTO / MÓDULO / SUBMÓDULO Y MÉTRICAS
  // -------------------------------------------------------------------------
  const currentProject = useMemo(
    () => projectsData.find((p) => p.id.toString() === projectId),
    [projectsData, projectId]
  );

  const currentModules = currentProject?.modules || [];

  const currentModule = useMemo(
    () => currentModules.find((m) => m.id.toString() === moduleId),
    [currentModules, moduleId]
  );

  const currentSubmodules = currentModule?.submodules || [];

  const currentSubmodule = useMemo(
    () => currentSubmodules.find((sm) => sm.id.toString() === submoduleId),
    [currentSubmodules, submoduleId]
  );

  const capturasTotales = useMemo(
    () =>
      escenarios
        .filter((esc) => selectedScenarioIds.includes(esc.id))
        .reduce((total, esc) => {
          const numCapturas =
            esc.capturas ||
            (esc.pasos
              ? esc.pasos.filter((p) => p.origen === "Automatizado").length
              : 0);
          return total + numCapturas;
        }, 0),
    [escenarios, selectedScenarioIds]
  );

  const escenariosTotalesSubmodulo = useMemo(
    () =>
      escenarios.filter(
        (s) =>
          s.modulo === currentModule?.name &&
          s.sub === currentSubmodule?.name
      ).length,
    [escenarios, currentModule?.name, currentSubmodule?.name]
  );

  const activeIndex = useMemo(() => {
    if (selectedScenarioIds.length === 0) return 0;

    let index = 0;
    if (executionData?.currentScenarioIndex !== undefined) {
      index = executionData.currentScenarioIndex;
    } else if (executionData?.resultados_parciales) {
      index = executionData.resultados_parciales.length;
    } else {
      const logs = executionData?.logOutput || "";
      selectedScenarioIds.forEach((id, idx) => {
        if (logs.includes(`Ejecutando ${id}`) || logs.includes(`Iniciando ${id}`)) {
          index = idx;
        }
      });
    }

    return index >= selectedScenarioIds.length
      ? selectedScenarioIds.length - 1
      : index;
  }, [executionData, selectedScenarioIds]);

  const activeScenarioId =
    selectedScenarioIds[activeIndex] || selectedScenarioIds[0];
  const escenarioActivo = escenarios.find((s) => s.id === activeScenarioId);
  const pasosEscenarioActual = escenarioActivo?.pasos || [];

  // -------------------------------------------------------------------------
  // HANDLERS DE CAMBIO DE PROYECTOS / MÓDULOS
  // -------------------------------------------------------------------------
  const handleProjectChange = (e) => {
    const newPid = e.target.value;
    setProjectId(newPid);
    const proj = projectsData.find((p) => p.id.toString() === newPid);
    const mods = proj?.modules || [];
    setModuleId(mods.length > 0 ? mods[0].id.toString() : "");
    setSubmoduleId(
      mods.length > 0 && mods[0].submodules.length > 0
        ? mods[0].submodules[0].id.toString()
        : ""
    );
    if (!isExecuting) {
      setExecutionId(null);
      setExecutionData(null);
    }
  };

  const handleModuleChange = (e) => {
    const newMid = e.target.value;
    setModuleId(newMid);
    const mods =
      projectsData.find((p) => p.id.toString() === projectId)?.modules || [];
    const submods =
      mods.find((m) => m.id.toString() === newMid)?.submodules || [];
    setSubmoduleId(submods.length > 0 ? submods[0].id.toString() : "");
    if (!isExecuting) {
      setExecutionId(null);
      setExecutionData(null);
    }
  };

  const handleSubmoduleChange = (e) => {
    setSubmoduleId(e.target.value);
    if (!isExecuting) {
      setExecutionId(null);
      setExecutionData(null);
    }
  };

  // -------------------------------------------------------------------------
  // INICIAR AUTOMATIZACIÓN
  // -------------------------------------------------------------------------
  const handleValidarYEjecutar = async () => {
    if (!can("PRUEBAS_EJECUTAR")) {
      alert(
        "No tienes el permiso PRUEBAS_EJECUTAR. Solicítalo desde Gestión de tickets."
      );
      return;
    }

    if (!formData.connection?.ip || !formData.connection?.port) {
      alert("Por favor complete los Parámetros de Conexión (IP y Puerto).");
      return;
    }

    if (
      !formData.history?.nombreHistoria ||
      !formData.history?.codigoHistoria ||
      !formData.history?.elaboradoPor
    ) {
      alert(
        "Debe ir a la pestaña 'Matriz' y completar la Información General de la Historia (Nombre, Código, Elaborado Por) para generar las evidencias."
      );
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(formData.parameters || {}, "monto") &&
      !formData.parameters?.monto
    ) {
      alert("Por favor ingrese el Monto de la Transacción.");
      return;
    }

    if (selectedScenarioIds.length === 0) {
      alert("Debe marcar al menos un escenario para ejecutar.");
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionData(null);

      const response = await api.post(
        "/executions",
        {
          projectId: Number(projectId),
          scenarioIds: selectedScenarioIds,
          executionType,
          connection: formData.connection,
          parameters: formData.parameters,
          history: formData.history,
          escenarios,
          moduleName: currentModule?.name,
          submoduleName: currentSubmodule?.name,
          rutaMatrizCargada: formData.rutaMatrizCargada || null,
        },
        token
      );

      const newId =
        response.executionId || response.id || response.data?.executionId;
      setExecutionId(newId);
      localStorage.setItem("active_execution_id", newId);
      localStorage.setItem("is_executing", "true");
    } catch (error) {
      setIsExecuting(false);
      localStorage.setItem("is_executing", "false");
      console.error("Error al iniciar ejecución:", error);
      alert(error?.message || "Hubo un error al iniciar la ejecución.");
    }
  };

  // -------------------------------------------------------------------------
  // GESTIÓN DE CANCELACIÓN CON MODAL
  // -------------------------------------------------------------------------
  const handleConfirmCancel = async () => {
    if (!executionId) {
      setIsExecuting(false);
      setExecutionId(null);
      localStorage.removeItem("active_execution_id");
      localStorage.setItem("is_executing", "false");
      setShowCancelModal(false);
      return;
    }

    setIsCanceling(true);
    try {
      await api.post(`/executions/${executionId}/cancel`, {}, token);

      setIsExecuting(false);
      setExecutionId(null);
      localStorage.removeItem("active_execution_id");
      localStorage.setItem("is_executing", "false");
    } catch (err) {
      console.error("Error al cancelar la ejecución:", err);
    } finally {
      setIsCanceling(false);
      setShowCancelModal(false);
    }
  };

  const executionStatus = executionData?.status || "EN_PROGRESO";
  const isExecutionFinished = FINAL_EXECUTION_STATUSES.includes(executionStatus);

  // Bloqueo exclusivo para usuarios no-admin sin ningún proyecto asignado
  const sinProyectosAsignados =
    !isAdmin && !loadingProjects && projectsData.length === 0;

  return (
    <>
      <div className="page-header">
        <h1>Ejecutar pruebas</h1>
        <p>
          Elige el módulo y submódulo: se listan los escenarios de la Matriz de
          pruebas que le corresponden. Marca cuáles ejecutar.
        </p>
      </div>

      {sinProyectosAsignados ? (
        <div
          className="cardProyect"
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "48px 24px",
            marginTop: "20px",
          }}
        >
          <div style={{ fontSize: "2.3rem", marginBottom: "10px" }}>🔒</div>
          <h2 style={{ marginBottom: "8px" }}>No tienes proyectos asignados</h2>
          <p style={{ maxWidth: "500px", margin: "0 auto 20px auto", opacity: 0.8 }}>
            Tu usuario aún no tiene acceso habilitado a ningún proyecto para
            ejecutar pruebas. Solicita acceso desde el módulo de Gestión de
            tickets.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/tickets")}
          >
            + Solicitar acceso a un proyecto
          </button>
        </div>
      ) : (
        <>
          {/* Selectores de Proyecto, Módulo y Submódulo */}
          <div className="cardProyect db-project-selectors">
            <div className="field db-field--no-margin">
              <select
                id="proyecto"
                className="input"
                value={projectId}
                onChange={handleProjectChange}
                disabled={projectsData.length === 0}
              >
                {projectsData.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field db-field--no-margin">
              <select
                id="module"
                className="input"
                value={moduleId}
                onChange={handleModuleChange}
                disabled={currentModules.length === 0}
              >
                {currentModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field db-field--no-margin">
              <select
                id="submodule"
                className="input"
                value={submoduleId}
                onChange={handleSubmoduleChange}
                disabled={currentSubmodules.length === 0}
              >
                {currentSubmodules.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preparación de Dispositivo / Entorno (protegido por DISPOSITIVO_GESTIONAR) */}
          {can("DISPOSITIVO_GESTIONAR") ? (
            <DeviceSetup
              onEnvironmentReady={handleEnvironmentReady}
              onConnectionChange={handleConnectionChange}
            />
          ) : (
            <div
              className="cardProyect"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                marginBottom: "16px",
              }}
            >
              <span>
                🔒 No tienes el permiso <strong>DISPOSITIVO_GESTIONAR</strong>{" "}
                para iniciar servicios (Appium/Gnirehtet) o enlazar dispositivos
                POS.
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate("/tickets")}
              >
                Solicitar permiso
              </button>
            </div>
          )}

          {/* Área Principal de Configuración y Ejecución */}
          {submoduleId && (
            <div
              className={`cont-principal db-workspace ${
                entornoDesbloqueado
                  ? "db-workspace--unlocked"
                  : "db-workspace--locked"
              }`}
            >
              {!isEnvReady && (
                <div className="db-lock-banner">
                  <span className="db-lock-pill">
                    🔒 Complete la preparación del entorno para desbloquear los
                    escenarios
                  </span>
                </div>
              )}

              <div>
                <ScenarioSelector
                  selectedModuleName={currentModule?.name}
                  selectedSubModuleName={currentSubmodule?.name}
                  escenarios={escenarios}
                  selectedScenarioIds={selectedScenarioIds}
                  setSelectedScenarioIds={setSelectedScenarioIds}
                  executionType={executionType}
                  setExecutionType={setExecutionType}
                  onOpenMatrixModal={() => {
                    if (!can("MATRIZ_VER")) {
                      alert(
                        "No tienes el permiso MATRIZ_VER. Solicítalo desde Gestión de tickets."
                      );
                      return;
                    }
                    setShowMatrixModal(true);
                  }}
                />

                <ModuleDataForm
                  selectedProject={currentProject?.name}
                  selectedModule={currentModule?.name}
                  selectedSubModule={currentSubmodule?.name}
                  formData={formData}
                  setFormData={setFormData}
                />
              </div>

              <div>
                <TestSummary
                  proyecto={currentProject?.name}
                  modulo={currentModule?.name}
                  submodulo={currentSubmodule?.name}
                  formData={formData}
                  escenariosTotales={escenariosTotalesSubmodulo}
                  escenariosSeleccionados={selectedScenarioIds.length}
                  capturasTotales={capturasTotales}
                  onExecute={handleValidarYEjecutar}
                  onCancel={() => setShowCancelModal(true)}
                  loading={isExecuting}
                  executionId={executionId}
                />

                <ConfirmCancelModal
                  isOpen={showCancelModal}
                  onClose={() => setShowCancelModal(false)}
                  onConfirm={handleConfirmCancel}
                  isCanceling={isCanceling}
                />

                {(executionId || executionData) && (
                  <div className="db-execution-panel">
                    <h3 className="db-execution-title">
                      ⚡ Ejecutando actual: {escenarioActivo?.id} -{" "}
                      {escenarioActivo?.casoPrueba?.replace(/_/g, " ")}
                      <span className="db-execution-counter">
                        (Escenario {activeIndex + 1} de{" "}
                        {selectedScenarioIds.length})
                      </span>
                    </h3>

                    <ExecutionChecklist
                      key={activeScenarioId}
                      pasosEscenario={pasosEscenarioActual}
                      logs={executionData?.logOutput || ""}
                      isFinished={isExecutionFinished}
                      executionStatus={executionStatus}
                      evidenceUrl={executionData?.evidenceUrl}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Gestor de Matriz de Pruebas */}
          {showMatrixModal && can("MATRIZ_VER") && (
            <div
              className="modalOverlayStyle"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowMatrixModal(false);
                }
              }}
            >
              <div className="modalContentStyle">
                <div className="modalHeaderStyle">
                  <h3 className="db-matrix-modal-title">
                    Gestor de Matriz de Pruebas
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMatrixModal(false)}
                    className="closeButtonStyle"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="db-matrix-modal-body">
                  <MatrizGeneratorPage
                    escenarios={escenarios}
                    setEscenarios={setEscenarios}
                    formData={formData}
                    setFormData={setFormData}
                    projectsData={projectsData}
                    projectId={projectId}
                    moduleId={moduleId}
                    submoduleId={submoduleId}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}