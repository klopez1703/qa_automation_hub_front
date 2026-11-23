import { useState, useEffect, useMemo } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/MatrixGeneratorPage.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const formatScenarioLabel = (raw) =>
  String(raw || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const createEmptyStep = () => ({
  tipoPaso: "P",
  origen: "Manual",
  descripcionDeLaPrueba: "",
  datosParaLaPrueba: "N/A",
  pasosParaRealizarLaPruebaFuncional: "",
  resultadoFuncionalEsperado: "",
});

const INITIAL_FORM_VALUES = {
  tipoPrueba: "Solo Funcional",
  casoPrueba: "",
  script: "",
  escenarioPython: "",
  modulo: "",
  descripcion: "",
  precondiciones: "",
  postcondiciones: "N/A",
  prioridad: "Alta",
  isPythonLocal: false,
  isPythonTemplate: false,
  scriptFullPath: "",
  pasos: [createEmptyStep()],
};

export default function MatrixGeneratorPage({
  escenarios: propsEscenarios,
  setEscenarios: propsSetEscenarios,
  formData: propsFormData,
  setFormData: propsSetFormData,
  projectsData: propsProjectsData = [],
  projectId: propsProjectId,
  moduleId: propsModuleId,
  submoduleId: propsSubmoduleId,
}) {
  const { auth } = useAuth();

  const [localProjects, setLocalProjects] = useState([]);
  const [localProjectId, setLocalProjectId] = useState("");
  const [localModuleId, setLocalModuleId] = useState("");
  const [localSubmoduleId, setLocalSubmoduleId] = useState("");
  const [localEscenarios, setLocalEscenarios] = useState([]);
  const [localFormData, setLocalFormData] = useState({
    connection: { ip: "127.0.0.1", port: "5000" },
    parameters: { monto: "1.00", moneda: "0340", impuesto: "0" },
    history: {
      nombreHistoria: "",
      codigoHistoria: "",
      tribu: "Empresas",
      squad: "Adquirencias",
      pais: "Honduras",
      productOwner: "Julia Milagros Zuniga Cruz",
      scrumMaster: "Dorian Yamal Mazariegos Chavez",
      fechaElaboracion: new Date().toISOString().split("T")[0],
      elaboradoPor:
        auth?.user?.nombre ||
        auth?.user?.name ||
        "Kevin Agustin López Hernández",
    },
  });

  const escenarios = Array.isArray(propsEscenarios)
    ? propsEscenarios
    : localEscenarios;
  const setEscenarios =
    typeof propsSetEscenarios === "function"
      ? propsSetEscenarios
      : setLocalEscenarios;

  const formData = propsFormData || localFormData;
  const setFormData =
    typeof propsSetFormData === "function"
      ? propsSetFormData
      : setLocalFormData;

  const projectsData =
    propsProjectsData && propsProjectsData.length > 0
      ? propsProjectsData
      : localProjects;
  const projectId = propsProjectId || localProjectId;
  const moduleId = propsModuleId || localModuleId;
  const submoduleId = propsSubmoduleId || localSubmoduleId;

  const [loading, setLoading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [escenariosPython, setEscenariosPython] = useState([]);
  const [cargandoEscenarios, setCargandoEscenarios] = useState(false);
  const [modoCargaExterna, setModoCargaExterna] = useState(false);
  const [escenariosDisponibles, setEscenariosDisponibles] = useState([]);

  const historyData = formData?.history || {};

  const [azureInput, setAzureInput] = useState("");
  const [loadingAzure, setLoadingAzure] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

  // Asegurar persistencia de datos por defecto de la Historia
  useEffect(() => {
    setFormData((prev) => {
      const h = prev?.history || {};
      return {
        ...prev,
        history: {
          nombreHistoria: h.nombreHistoria || "",
          codigoHistoria: h.codigoHistoria || "",
          tribu: h.tribu || "Empresas",
          squad: h.squad || "Adquirencias",
          pais: h.pais || "Honduras",
          productOwner: h.productOwner || "Julia Milagros Zuniga Cruz",
          scrumMaster: h.scrumMaster || "Dorian Yamal Mazariegos Chavez",
          fechaElaboracion:
            h.fechaElaboracion || new Date().toISOString().split("T")[0],
          elaboradoPor:
            h.elaboradoPor ||
            auth?.user?.nombre ||
            auth?.user?.name ||
            "Kevin Agustin López Hernández",
        },
      };
    });
  }, [auth, setFormData]);

  useEffect(() => {
    if (!propsProjectsData || propsProjectsData.length === 0) {
      api
        .get("/modules", auth?.token)
        .then((data) => {
          const projects = data || [];
          setLocalProjects(projects);
          if (projects.length > 0) {
            const firstProj = projects[0];
            setLocalProjectId(firstProj.id.toString());
            const mods = firstProj.modules || [];
            if (mods.length > 0) {
              setLocalModuleId(mods[0].id.toString());
              const submods = mods[0].submodules || [];
              if (submods.length > 0) {
                setLocalSubmoduleId(submods[0].id.toString());
              }
            }
          }
        })
        .catch((err) =>
          console.error("Error cargando proyectos autónomos:", err)
        );
    }
  }, [auth?.token, propsProjectsData]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = auth?.token || localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/matrix/python-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setEscenariosDisponibles(data);
        }
      } catch (error) {
        console.error("Error cargando templates de Python:", error);
      }
    };
    fetchTemplates();
  }, [auth?.token]);

  const currentProject = useMemo(
    () => projectsData.find((p) => String(p.id) === String(projectId)),
    [projectsData, projectId]
  );

  const currentModule = useMemo(
    () => currentProject?.modules?.find((m) => String(m.id) === String(moduleId)),
    [currentProject, moduleId]
  );

  const currentSubmodule = useMemo(
    () =>
      currentModule?.submodules?.find(
        (sm) => String(sm.id) === String(submoduleId)
      ),
    [currentModule, submoduleId]
  );

  const availableScripts = currentSubmodule?.scripts || [];

  // Filtrado de plantillas Python según módulo activo
  const filteredPythonTemplates = useMemo(
    () =>
      escenariosDisponibles.filter((test) => {
        const nombreScript = (test.nombre || "").toLowerCase();
        const moduloSeleccionadoUI = (currentModule?.name || "").toLowerCase();
        const moduloInput = (formValues.modulo || "").toLowerCase();
        const textoFiltro = `${moduloSeleccionadoUI} ${moduloInput}`;

        if (textoFiltro.includes("retail") && !textoFiltro.includes("intra")) {
          return nombreScript.includes("retail");
        }
        if (textoFiltro.includes("intra") || textoFiltro.includes("extra")) {
          return (
            nombreScript.includes("intra") || nombreScript.includes("extra")
          );
        }
        return true;
      }),
    [escenariosDisponibles, currentModule?.name, formValues.modulo]
  );

  // Filtrado y agrupación de defs Python según moneda, impuesto y módulo
  const { tieneImpuesto, defsSinImpuesto, defsConImpuesto, defsOtros } =
    useMemo(() => {
      const params = formData?.parameters || {};
      const monedaRaw = String(params.moneda || "").toLowerCase().trim();
      const impuestoRaw = String(params.impuesto || "0").trim();

      const esDolar =
        monedaRaw === "0840" ||
        monedaRaw.includes("usd") ||
        monedaRaw.includes("dolar") ||
        monedaRaw.includes("dólar");

      const esLempira =
        monedaRaw === "0340" ||
        monedaRaw.includes("lempira") ||
        monedaRaw.includes("hnl") ||
        (!esDolar && monedaRaw !== "");

      const numImpuesto = parseFloat(impuestoRaw.replace(",", ".")) || 0;
      const hasTax = numImpuesto > 0;

      const moduloUI = currentModule?.name || "";
      const subModuloUI = currentSubmodule?.name || "";
      const moduloInput = formValues.modulo || "";
      const textoFiltro = `${moduloUI} ${subModuloUI} ${moduloInput}`.toLowerCase();

      const filtrados = escenariosPython.filter((escenario) => {
        const escLower = String(escenario).toLowerCase();

        // A. Filtro por Impuesto
        if (hasTax) {
          if (
            escLower.includes("sin_impuesto") ||
            escLower.includes("sin impuesto")
          ) {
            return false;
          }
        } else if (
          escLower.includes("con_impuesto") ||
          escLower.includes("con impuesto")
        ) {
          return false;
        }

        // B. Filtro por Moneda
        if (esLempira) {
          if (
            escLower.includes("dolar") ||
            escLower.includes("dólar") ||
            escLower.includes("usd")
          ) {
            return false;
          }
        } else if (esDolar) {
          if (escLower.includes("lempira") || escLower.includes("hnl")) {
            return false;
          }
        }

        // C. Filtro por Módulo/Submódulo
        const pideVenta = textoFiltro.includes("venta");
        const pideAnulacion =
          textoFiltro.includes("anulacion") ||
          textoFiltro.includes("anulación");
        const pideCierre = textoFiltro.includes("cierre");

        if (!pideVenta && !pideAnulacion && !pideCierre) return true;
        if (pideVenta && escLower.includes("venta")) return true;
        if (pideAnulacion && escLower.includes("anulacion")) return true;
        if (pideCierre && escLower.includes("cierre")) return true;

        return false;
      });

      const isSinImp = (e) =>
        e.toLowerCase().includes("sin_impuesto") ||
        e.toLowerCase().includes("sin impuesto");
      const isConImp = (e) =>
        e.toLowerCase().includes("con_impuesto") ||
        e.toLowerCase().includes("con impuesto");

      return {
        tieneImpuesto: hasTax,
        defsSinImpuesto: filtrados.filter(isSinImp),
        defsConImpuesto: filtrados.filter(isConImp),
        defsOtros: filtrados.filter((e) => !isSinImp(e) && !isConImp(e)),
      };
    }, [
      escenariosPython,
      formData?.parameters,
      currentModule?.name,
      currentSubmodule?.name,
      formValues.modulo,
    ]);

  const handleFetchAzureItem = async () => {
    if (!azureInput.trim()) return;

    const matchId =
      azureInput.match(/_workitems\/edit\/(\d+)/i) ||
      azureInput.match(/[?&]workitem=(\d+)/i) ||
      azureInput.match(/\b(\d{5,7})\b/);
    const workItemId = matchId ? matchId[1] : "";

    if (workItemId) {
      setFormData((prev) => ({
        ...prev,
        history: { ...prev.history, codigoHistoria: workItemId },
      }));
    }

    try {
      setLoadingAzure(true);
      const token = auth?.token || localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/matrix/azure-workitem?url=${encodeURIComponent(azureInput)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({
          ...prev,
          history: {
            ...prev.history,
            codigoHistoria:
              data.id || workItemId || prev.history.codigoHistoria,
            nombreHistoria: data.title || prev.history.nombreHistoria,
          },
        }));
      }
    } catch (error) {
      console.error("Error al consultar Azure:", error);
    } finally {
      setLoadingAzure(false);
    }
  };

  const procesarArchivoExcel = async (archivo) => {
    if (!archivo) return;

    const fileFormData = new FormData();
    fileFormData.append("archivo", archivo);

    try {
      setLoading(true);
      const token = auth?.token || localStorage.getItem("token") || "";

      const response = await fetch(`${API_BASE_URL}/matrix/leer-matriz`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fileFormData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al leer la matriz");
      }

      if (data.escenarios && data.escenarios.length > 0) {
        if (data.history) {
          setFormData((prev) => ({
            ...prev,
            rutaMatrizCargada: data.rutaMatrizCargada || "",
            history: {
              ...prev.history,
              nombreHistoria:
                data.history.nombreHistoria || prev.history.nombreHistoria,
              codigoHistoria:
                data.history.codigoHistoria || prev.history.codigoHistoria,
              tribu: data.history.tribu || prev.history.tribu,
              squad: data.history.squad || prev.history.squad,
              pais: data.history.pais || prev.history.pais,
              productOwner:
                data.history.productOwner || prev.history.productOwner,
              scrumMaster: data.history.scrumMaster || prev.history.scrumMaster,
              fechaElaboracion:
                data.history.fechaElaboracion || prev.history.fechaElaboracion,
              elaboradoPor:
                data.history.elaboradoPor || prev.history.elaboradoPor,
            },
          }));
        }

        const escenariosFormateados = data.escenarios.map((esc) => ({
          ...esc,
          pasos: (esc.pasos || []).map((p) => ({
            ...p,
            origen: "Automatizado",
          })),
        }));

        setEscenarios(escenariosFormateados);
        alert(
          `¡Matriz cargada con éxito! Historia "${data.history?.codigoHistoria || ""}" (${escenariosFormateados.length} escenarios).`
        );
      } else {
        alert("No se encontraron escenarios FBQA- en el archivo.");
      }
    } catch (error) {
      console.error("Error al cargar matriz:", error);
      alert(`No se pudo leer la matriz: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) procesarArchivoExcel(files[0]);
  };

  const abrirModalCrear = () => {
    setEditingIndex(null);
    setFormValues({
      ...INITIAL_FORM_VALUES,
      modulo: currentSubmodule?.name || "VENTA",
      pasos: [createEmptyStep()],
    });
    setModalOpen(true);
  };

  const abrirModalEditar = (index) => {
    setEditingIndex(index);
    const item = JSON.parse(JSON.stringify(escenarios[index]));

    item.pasos = (item.pasos || []).map((p) => ({
      ...p,
      tipoPaso: p.tipoPaso || (p.origen === "Automatizado" ? "PV" : "P"),
      origen:
        p.tipoPaso === "PV" || p.origen === "Automatizado"
          ? "Automatizado"
          : "Manual",
    }));

    setFormValues(item);
    setModalOpen(true);
  };

  const agregarPasoModal = () => {
    setFormValues((prev) => ({
      ...prev,
      pasos: [...prev.pasos, createEmptyStep()],
    }));
  };

  const actualizarPasoModal = (pIndex, campo, valor) => {
    setFormValues((prev) => {
      const nuevosPasos = [...prev.pasos];
      nuevosPasos[pIndex] = { ...nuevosPasos[pIndex], [campo]: valor };
      return { ...prev, pasos: nuevosPasos };
    });
  };

  const eliminarPasoModal = (pIndex) => {
    const pasoAEliminar = formValues.pasos[pIndex];
    const esAutomatizado =
      pasoAEliminar?.origen === "Automatizado" ||
      pasoAEliminar?.tipoPaso === "PV";

    if (esAutomatizado) {
      alert(
        "⚠️ No se pueden eliminar los pasos que son parte de la automatización."
      );
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      pasos: prev.pasos.filter((_, i) => i !== pIndex),
    }));
  };

  const handleScriptSelect = async (valorSeleccionado) => {
    setFormValues((prev) => ({
      ...prev,
      escenarioPython: "",
    }));
    setEscenariosPython([]);

    const scriptEscaneado = availableScripts.find(
      (s) => s.path === valorSeleccionado
    );

    if (scriptEscaneado) {
      setFormValues((prev) => ({
        ...prev,
        script: scriptEscaneado.path,
        casoPrueba: scriptEscaneado.name,
        descripcion: "Analizando script...",
        pasos: [],
      }));

      try {
        const token = auth?.token || localStorage.getItem("token") || "";
        const projectPrefix = currentProject?.folderName || "CD_OMNICANAL";
        const fullScriptPath = `${projectPrefix}/${scriptEscaneado.path}`;

        if (scriptEscaneado.path.endsWith(".py")) {
          setCargandoEscenarios(true);
          const resPy = await fetch(
            `${API_BASE_URL}/matrix/parse-python-scenarios?path=${encodeURIComponent(fullScriptPath)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (resPy.ok) {
            const dataPy = await resPy.json();
            setEscenariosPython(dataPy.escenarios || []);
            setFormValues((prev) => ({
              ...prev,
              isPythonLocal: true,
              scriptFullPath: fullScriptPath,
              descripcion: `Script: ${scriptEscaneado.name}. Seleccione un def.`,
              pasos: [],
            }));
          }
          setCargandoEscenarios(false);
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/matrix/parse-script?path=${encodeURIComponent(fullScriptPath)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          const data = await res.json();
          setFormValues((prev) => ({
            ...prev,
            isPythonLocal: false,
            descripcion:
              data.descripcion || `Automatización de ${scriptEscaneado.name}`,
            pasos: data.pasos.length > 0 ? data.pasos : prev.pasos,
          }));
        }
      } catch (err) {
        console.error("Error al analizar el script:", err);
        setCargandoEscenarios(false);
      }
      return;
    }

    const plantillaEncontrada = escenariosDisponibles.find(
      (t) => t.nombre === valorSeleccionado
    );
    if (plantillaEncontrada) {
      if (plantillaEncontrada.nombre.includes(".py")) {
        setCargandoEscenarios(true);
        try {
          const token = auth?.token || localStorage.getItem("token") || "";
          const rutaDinamicaPy = `pos_screenplay_framework/tests/${plantillaEncontrada.nombre}`;

          const resPy = await fetch(
            `${API_BASE_URL}/matrix/parse-python-scenarios?path=${encodeURIComponent(rutaDinamicaPy)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (resPy.ok) {
            const dataPy = await resPy.json();
            setEscenariosPython(dataPy.escenarios || []);
          }

          setFormValues((prev) => ({
            ...prev,
            script: "",
            casoPrueba: plantillaEncontrada.nombre,
            descripcion: plantillaEncontrada.descripcion,
            precondiciones: plantillaEncontrada.precondiciones,
            postcondiciones: plantillaEncontrada.postcondiciones,
            prioridad: plantillaEncontrada.prioridad,
            pasos: [],
            isPythonTemplate: true,
            scriptFullPath: rutaDinamicaPy,
          }));
        } catch (err) {
          console.error("Error cargando plantillas python", err);
        }
        setCargandoEscenarios(false);
        return;
      }

      setFormValues((prev) => ({
        ...prev,
        script: "",
        casoPrueba: plantillaEncontrada.nombre,
        descripcion: plantillaEncontrada.descripcion,
        precondiciones: plantillaEncontrada.precondiciones,
        postcondiciones: plantillaEncontrada.postcondiciones,
        prioridad: plantillaEncontrada.prioridad,
        pasos: plantillaEncontrada.pasos,
        isPythonTemplate: false,
      }));
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      casoPrueba: valorSeleccionado,
      script: "",
      isPythonLocal: false,
      isPythonTemplate: false,
    }));
  };

  const handleDefSelect = async (defSeleccionado) => {
    setFormValues((prev) => ({
      ...prev,
      escenarioPython: defSeleccionado,
    }));

    if (!defSeleccionado) return;

    try {
      const token = auth?.token || localStorage.getItem("token") || "";
      const fullScriptPath = formValues.scriptFullPath;

      const res = await fetch(
        `${API_BASE_URL}/matrix/parse-python-steps?path=${encodeURIComponent(fullScriptPath)}&escenario=${defSeleccionado}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setFormValues((prev) => ({
          ...prev,
          casoPrueba: defSeleccionado,
          descripcion: `Automatización de ${defSeleccionado}`,
          pasos: data.pasos.length > 0 ? data.pasos : prev.pasos,
        }));
      }
    } catch (err) {
      console.error("Error cargando pasos del def:", err);
    }
  };

  const handleGuardarFormulario = (e) => {
    e.preventDefault();
    const nombreCasoNuevo = formValues.escenarioPython || formValues.casoPrueba;

    const esDuplicado = escenarios.some((esc, idx) => {
      if (editingIndex === idx) return false;
      return esc.casoPrueba === nombreCasoNuevo;
    });

    if (esDuplicado) {
      alert(
        `⚠️ El escenario "${nombreCasoNuevo}" ya fue añadido a la matriz de pruebas.`
      );
      return;
    }

    const actualizados = [...escenarios];
    const payloadEscenario = {
      tipoPrueba: formValues.tipoPrueba || "Solo Funcional",
      casoPrueba: formValues.escenarioPython || formValues.casoPrueba,
      script: formValues.script || "tests/test_flujo_retail.py",
      escenarioPython: formValues.escenarioPython || formValues.casoPrueba,
      modulo: formValues.modulo || "VENTA",
      descripcion: formValues.descripcion || "",
      precondiciones: formValues.precondiciones || "",
      postcondiciones: formValues.postcondiciones || "",
      prioridad: formValues.prioridad || "Alta",
      pasos: formValues.pasos.map((p) => ({
        ...p,
        origen: p.tipoPaso === "PV" ? "Automatizado" : "Manual",
      })),
    };

    if (editingIndex !== null) {
      actualizados[editingIndex] = {
        ...actualizados[editingIndex],
        ...payloadEscenario,
      };
    } else {
      const num = actualizados.length + 1;
      const nuevoId = `FBQA-${num < 10 ? "00" + num : "0" + num}`;
      actualizados.push({ id: nuevoId, ...payloadEscenario });
    }

    setEscenarios(actualizados);
    setModalOpen(false);
  };

  const eliminarEscenario = (index) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el caso ${escenarios[index].id}?`
      )
    ) {
      return;
    }
    const filtrados = escenarios.filter((_, i) => i !== index);
    const reordenados = filtrados.map((esc, i) => ({
      ...esc,
      id: `FBQA-${i + 1 < 10 ? "00" + (i + 1) : "0" + (i + 1)}`,
    }));
    setEscenarios(reordenados);
  };

  const handleGenerarExcel = async () => {
    setLoading(true);
    setDownloadInfo(null);
    try {
      const response = await api.post(
        "/matrix/generar-matriz",
        { ...historyData, escenarios },
        auth?.token
      );

      if (!response.downloadUrl) {
        throw new Error("El servidor no devolvió la ruta de descarga.");
      }

      setDownloadInfo({
        url: `${API_BASE_URL}${response.downloadUrl}`,
        nombreArchivo: response.nombreArchivo || "Matriz_Pruebas.xlsx",
      });

      alert("¡Matriz generada con éxito!");
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al generar la matriz de pruebas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarLocal = async () => {
    if (!downloadInfo) return;
    try {
      const token = auth?.token || localStorage.getItem("token") || "";
      const response = await fetch(downloadInfo.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Error (${response.status}): Archivo no encontrado.`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadInfo.nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert(`No se pudo descargar: ${error.message}`);
    }
  };

  const updateHistoryField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      history: { ...prev.history, [field]: value },
    }));
  };

  return (
    <div className="cardMatriz mg-container">
      {/* Header y Switch de Modo */}
      <div className="mg-header">
        <h2 className="mg-title">
          Gestor Inteligente de Matriz de Pruebas (.xlsx)
        </h2>

        <div className="mg-mode-switch">
          <span
            className={`mg-mode-label ${
              !modoCargaExterna ? "mg-mode-label--manual-active" : ""
            }`}
          >
            Creación Manual
          </span>

          <label className="mg-switch">
            <input
              type="checkbox"
              className="mg-switch-input"
              checked={modoCargaExterna}
              onChange={() => {
                if (escenarios && escenarios.length > 0) {
                  if (
                    !window.confirm(
                      "Al cambiar de modo se borrarán los escenarios actuales. ¿Desea continuar?"
                    )
                  ) {
                    return;
                  }
                }
                setModoCargaExterna(!modoCargaExterna);
                setEscenarios([]);
              }}
            />
            <span
              className={`mg-switch-slider ${
                modoCargaExterna ? "mg-switch-slider--upload" : ""
              }`}
            >
              <span
                className={`mg-switch-thumb ${
                  modoCargaExterna ? "mg-switch-thumb--upload" : ""
                }`}
              />
            </span>
          </label>

          <span
            className={`mg-mode-label ${
              modoCargaExterna ? "mg-mode-label--upload-active" : ""
            }`}
          >
            Cargar Matriz Existente
          </span>
        </div>
      </div>

      {/* Zona de Carga Externa o Formulario de Historia */}
      {modoCargaExterna ? (
        <div
          className={`mg-dropzone ${isDragging ? "mg-dropzone--dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("matriz-upload-input").click()}
        >
          <h3 className="mg-dropzone-title">
            📁 Cargar Matriz de Pruebas Existente
          </h3>
          <p className="mg-dropzone-desc">
            Arrastra y suelta tu archivo Excel (.xlsx) aquí, o haz clic para
            seleccionar.
          </p>
          <input
            id="matriz-upload-input"
            type="file"
            accept=".xlsx"
            className="mg-hidden-input"
            onChange={(e) => procesarArchivoExcel(e.target.files[0])}
          />
          <button type="button" className="mg-dropzone-btn">
            Seleccionar archivo
          </button>
          {loading && (
            <p className="mg-dropzone-loading">
              Analizando estructura de la matriz...
            </p>
          )}
        </div>
      ) : (
        <div className="mg-info-panel">
          <div className="mg-azure-box">
            <label className="mg-azure-label">
              🔗 Auto-completar desde URL / Texto de Azure DevOps
            </label>
            <div className="mg-azure-row">
              <input
                type="text"
                className="input mg-input"
                placeholder="Pega la URL de Azure DevOps o la URL acompañada del título..."
                value={azureInput}
                onChange={(e) => setAzureInput(e.target.value)}
              />
              <button
                type="button"
                className="mg-azure-btn"
                onClick={handleFetchAzureItem}
                disabled={loadingAzure}
              >
                {loadingAzure ? "Cargando..." : "⚡ Obtener Datos"}
              </button>
            </div>
          </div>

          <h3 className="mg-section-title">
            📋 1. Información General de la Historia
          </h3>

          <div className="mg-history-grid">
            <div className="field">
              <label className="mg-label">Nombre de la Historia</label>
              <input
                className="input mg-input mg-input--readonly"
                value={historyData.nombreHistoria || ""}
                disabled
                readOnly
                placeholder="Se autocompleta desde la URL de Azure"
              />
            </div>

            <div className="field">
              <label className="mg-label">Código de Historia</label>
              <input
                className="input mg-input mg-input--readonly mg-input--readonly-bold"
                value={historyData.codigoHistoria || ""}
                disabled
                readOnly
                placeholder="Ej: 171746"
              />
            </div>

            <div className="field">
              <label className="mg-label">Tribu</label>
              <select
                className="input mg-input"
                value={historyData.tribu || "Empresas"}
                onChange={(e) => updateHistoryField("tribu", e.target.value)}
              >
                <option value="Empresas">Empresas</option>
                <option value="Personas">Personas</option>
              </select>
            </div>

            <div className="field">
              <label className="mg-label">Squad</label>
              <input
                className="input mg-input"
                value={historyData.squad || "Adquirencias"}
                onChange={(e) => updateHistoryField("squad", e.target.value)}
              />
            </div>

            <div className="field">
              <label className="mg-label">País</label>
              <input
                className="input mg-input"
                value={historyData.pais || "Honduras"}
                onChange={(e) => updateHistoryField("pais", e.target.value)}
              />
            </div>

            <div className="field">
              <label className="mg-label">Product Owner / PM</label>
              <input
                className="input mg-input"
                value={historyData.productOwner || "Julia Milagros Zuniga Cruz"}
                onChange={(e) =>
                  updateHistoryField("productOwner", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label className="mg-label">Scrum Master</label>
              <input
                className="input mg-input"
                value={
                  historyData.scrumMaster || "Dorian Yamal Mazariegos Chavez"
                }
                onChange={(e) =>
                  updateHistoryField("scrumMaster", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label className="mg-label">Fecha de Elaboración</label>
              <input
                className="input mg-input"
                type="date"
                value={
                  historyData.fechaElaboracion ||
                  new Date().toISOString().split("T")[0]
                }
                onChange={(e) =>
                  updateHistoryField("fechaElaboracion", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label className="mg-label">Elaborado Por (Analista QA)</label>
              <input
                className="input mg-input"
                value={
                  historyData.elaboradoPor ||
                  auth?.user?.nombre ||
                  auth?.user?.name ||
                  "Kevin Agustin López Hernández"
                }
                onChange={(e) =>
                  updateHistoryField("elaboradoPor", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Escenarios */}
      <div className="mg-table-section">
        <div className="mg-table-header">
          <h3 className="mg-section-title mg-section-title--inline">
            2. Matriz de Escenarios Leídos / Configurados (
            {escenarios?.length || 0})
          </h3>
          <button
            type="button"
            className="mg-add-fbqa-btn"
            onClick={abrirModalCrear}
          >
            + Añadir FBQA
          </button>
        </div>

        <div className="mg-table-scroll">
          <table className="mg-table">
            <thead>
              <tr className="mg-thead-row">
                <th className="mg-th">ID</th>
                <th className="mg-th">Tipo de prueba</th>
                <th className="mg-th">Nombre / Escenario</th>
                <th className="mg-th">Módulo</th>
                <th className="mg-th">Pasos Configurados</th>
                <th className="mg-th">Prioridad</th>
                <th className="mg-th mg-th--center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!escenarios || escenarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="mg-td--empty">
                    {modoCargaExterna
                      ? "Sube una matriz arriba para visualizar sus escenarios FBQA."
                      : 'No hay escenarios configurados. Haga clic en "+ Añadir FBQA".'}
                  </td>
                </tr>
              ) : (
                escenarios.map((esc, index) => (
                  <tr key={esc.id || index} className="mg-tr">
                    <td className="mg-td mg-td--id">{esc.id}</td>
                    <td className="mg-td">{esc.tipoPrueba}</td>
                    <td className="mg-td">
                      {esc.casoPrueba
                        ? formatScenarioLabel(esc.casoPrueba)
                        : "Ejecucion Manual"}
                    </td>
                    <td className="mg-td">{esc.modulo}</td>
                    <td className="mg-td">
                      {esc.pasos?.length || 0} paso(s)
                    </td>
                    <td className="mg-td">{esc.prioridad}</td>
                    <td className="mg-td mg-td--actions">
                      <button
                        type="button"
                        className="mg-action-btn mg-action-btn--edit"
                        onClick={() => abrirModalEditar(index)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      {!modoCargaExterna && (
                        <button
                          type="button"
                          className="mg-action-btn mg-action-btn--delete"
                          onClick={() => eliminarEscenario(index)}
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón Generar Excel */}
      <button
        type="button"
        className="mg-generate-btn"
        onClick={handleGenerarExcel}
        disabled={loading}
      >
        {loading
          ? "Generando archivo Excel..."
          : "Generar Matriz de Pruebas Completa (.xlsx)"}
      </button>

      {/* Banner de Descarga */}
      {downloadInfo && (
        <div className="mg-download-box">
          <p className="mg-download-msg">
            ¡El archivo Excel se ha generado con éxito!
          </p>
          <button
            type="button"
            className="mg-download-btn"
            onClick={handleDescargarLocal}
          >
            📥 Descargar Matriz de Pruebas (.xlsx)
          </button>
        </div>
      )}

      {/* Modal Crear / Editar Caso de Prueba */}
      {modalOpen && (
        <div
          className="mg-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div
            className="modal-content mg-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalTitleHeaderStyle">
              <h3 className="mg-modal-title">
                {editingIndex !== null
                  ? "✏ Editar Caso de Prueba"
                  : "➕ Añadir Nuevo Caso de Prueba (FBQA)"}
              </h3>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="closeButtonStyle"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleGuardarFormulario}>
              <div className="mg-modal-grid-3">
                <div>
                  <label className="mg-label mg-label--modal">
                    Tipo de prueba
                  </label>
                  <select
                    className="input mg-input"
                    value={formValues.tipoPrueba}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        tipoPrueba: e.target.value,
                      })
                    }
                  >
                    <option value="Solo Funcional">Solo Funcional</option>
                    <option value="Solo Performance">Solo Performance</option>
                  </select>
                </div>

                <div>
                  <label className="mg-label mg-label--modal">
                    Seleccionar Script
                  </label>
                  <select
                    className="input mg-input"
                    value={formValues.script || formValues.casoPrueba}
                    onChange={(e) => handleScriptSelect(e.target.value)}
                  >
                    <option value="">
                      -- Selecciona un script o plantilla --
                    </option>
                    {availableScripts.length > 0 && (
                      <optgroup label="Scripts Escaneados (.ts / .py)">
                        {availableScripts.map((script, idx) => (
                          <option key={`local-${idx}`} value={script.path}>
                            {script.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {filteredPythonTemplates.length > 0 && (
                      <optgroup label="Plantillas Preconfiguradas de Python">
                        {filteredPythonTemplates.map((test, idx) => (
                          <option key={`api-${idx}`} value={test.nombre}>
                            {formatScenarioLabel(test.nombre)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="mg-label mg-label--modal">Módulo</label>
                  <input
                    className="input mg-input"
                    required
                    value={formValues.modulo || ""}
                    onChange={(e) =>
                      setFormValues({ ...formValues, modulo: e.target.value })
                    }
                    placeholder="Consultas / Cierres"
                  />
                </div>
              </div>

              {(formValues.isPythonLocal || formValues.isPythonTemplate) && (
                <div className="mg-modal-block--lg">
                  <label className="mg-label mg-label--green">
                    Seleccionar Escenario (def)
                  </label>
                  {cargandoEscenarios ? (
                    <div className="mg-loading-defs">
                      Cargando submódulos...
                    </div>
                  ) : (
                    <select
                      className="input mg-input mg-input--highlighted"
                      value={formValues.escenarioPython || ""}
                      onChange={(e) => handleDefSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Elija el def a cargar --</option>

                      {!tieneImpuesto && defsSinImpuesto.length > 0 && (
                        <optgroup label="--- SIN IMPUESTO ---">
                          {defsSinImpuesto.map((escenario, idx) => (
                            <option key={`sin-${idx}`} value={escenario}>
                              {formatScenarioLabel(escenario)}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {tieneImpuesto && defsConImpuesto.length > 0 && (
                        <optgroup label="--- CON IMPUESTO ---">
                          {defsConImpuesto.map((escenario, idx) => (
                            <option key={`con-${idx}`} value={escenario}>
                              {formatScenarioLabel(escenario)}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {defsOtros.length > 0 && (
                        <optgroup label="--- OTROS ESCENARIOS ---">
                          {defsOtros.map((escenario, idx) => (
                            <option key={`otro-${idx}`} value={escenario}>
                              {formatScenarioLabel(escenario)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                </div>
              )}

              <div className="mg-modal-block">
                <label className="mg-label mg-label--modal">
                  Descripción / Objetivo
                </label>
                <textarea
                  className="input mg-input"
                  rows={2}
                  value={
                    formValues.descripcion
                      ? formValues.descripcion.replace(/_/g, " ")
                      : "Ejecucion Manual"
                  }
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      descripcion: e.target.value,
                    })
                  }
                />
              </div>

              <div className="mg-modal-grid-2">
                <div>
                  <label className="mg-label mg-label--modal">Prioridad</label>
                  <select
                    className="input mg-input"
                    value={formValues.prioridad}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        prioridad: e.target.value,
                      })
                    }
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              {/* Diseño de Guión: Pasos Detallados */}
              <div className="pasosContainer">
                <div className="mg-steps-header">
                  <h4 className="mg-steps-title">
                    📌 Diseño de Guión: Pasos Detallados
                  </h4>
                  <button
                    type="button"
                    className="mg-add-step-btn"
                    onClick={agregarPasoModal}
                  >
                    + Añadir Paso
                  </button>
                </div>

                <div className="mg-steps-scroll">
                  <div className="mg-steps-grid-head">
                    <div>Paso/PV</div>
                    <div>Origen</div>
                    <div>Descripción de la Prueba</div>
                    <div>Datos para la Prueba</div>
                    <div>Pasos para realizar la prueba funcional</div>
                    <div>Resultado Funcional Esperado</div>
                    <div className="mg-steps-col-center">Acción</div>
                  </div>

                  {formValues.pasos.map((paso, pIndex) => {
                    const esAutomatizado =
                      paso.tipoPaso === "PV" || paso.origen === "Automatizado";

                    return (
                      <div key={pIndex} className="mg-steps-grid-row">
                        <select
                          className="inputTablePasos"
                          value={paso.tipoPaso || (esAutomatizado ? "PV" : "P")}
                          onChange={(e) => {
                            const nuevoTipo = e.target.value;
                            setFormValues((prev) => {
                              const nuevosPasos = [...prev.pasos];
                              nuevosPasos[pIndex] = {
                                ...nuevosPasos[pIndex],
                                tipoPaso: nuevoTipo,
                                origen:
                                  nuevoTipo === "PV"
                                    ? "Automatizado"
                                    : "Manual",
                              };
                              return { ...prev, pasos: nuevosPasos };
                            });
                          }}
                        >
                          <option value="P">P</option>
                          <option value="PV">PV</option>
                        </select>

                        <div
                          className={`mg-origin-badge ${
                            esAutomatizado
                              ? "mg-origin-badge--auto"
                              : "mg-origin-badge--manual"
                          }`}
                        >
                          {esAutomatizado ? "Automatizado" : "Manual"}
                        </div>

                        <input
                          className="inputTablePasos"
                          placeholder="Descripción..."
                          value={paso.descripcionDeLaPrueba || ""}
                          onChange={(e) =>
                            actualizarPasoModal(
                              pIndex,
                              "descripcionDeLaPrueba",
                              e.target.value
                            )
                          }
                          required
                        />

                        <input
                          className="inputTablePasos"
                          placeholder="Datos..."
                          value={paso.datosParaLaPrueba || ""}
                          onChange={(e) =>
                            actualizarPasoModal(
                              pIndex,
                              "datosParaLaPrueba",
                              e.target.value
                            )
                          }
                        />

                        <input
                          className="inputTablePasos"
                          placeholder="Acción..."
                          value={paso.pasosParaRealizarLaPruebaFuncional || ""}
                          onChange={(e) =>
                            actualizarPasoModal(
                              pIndex,
                              "pasosParaRealizarLaPruebaFuncional",
                              e.target.value
                            )
                          }
                        />

                        <input
                          className="inputTablePasos"
                          placeholder="Resultado..."
                          value={paso.resultadoFuncionalEsperado || ""}
                          onChange={(e) =>
                            actualizarPasoModal(
                              pIndex,
                              "resultadoFuncionalEsperado",
                              e.target.value
                            )
                          }
                          required
                        />

                        <button
                          type="button"
                          className="mg-step-del-btn"
                          onClick={() => eliminarPasoModal(pIndex)}
                          disabled={esAutomatizado}
                          title={
                            esAutomatizado
                              ? "Los pasos automatizados no se pueden eliminar"
                              : "Eliminar paso"
                          }
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mg-modal-footer">
                <button
                  type="button"
                  className="mg-btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="mg-btn-save">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}