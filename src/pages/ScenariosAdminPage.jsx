import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/ScenariosAdmin.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const ITEMS_PER_PAGE = 7;

const formatDefLabel = (defRaw) =>
  defRaw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getSubmoduleBadgeClass = (name) => {
  const upper = (name || '').toUpperCase();
  if (upper.includes('VENTA')) return 'sa-badge--venta';
  if (upper.includes('ANULACION') || upper.includes('ANULACIÓN')) return 'sa-badge--anulacion';
  return 'sa-badge--default';
};

export default function ScenariosAdminPage() {
  const { auth } = useAuth();
  const [projectsData, setProjectsData] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados de Proyecto / Módulo / Submódulo
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [modoModulo, setModoModulo] = useState('existente');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [nuevoModuloNombre, setNuevoModuloNombre] = useState('');
  const [submoduleName, setSubmoduleName] = useState('');

  // Estados de Integración con pos_screenplay_framework
  const [pythonTemplates, setPythonTemplates] = useState([]);
  const [selectedPyFile, setSelectedPyFile] = useState('');
  const [escenariosPython, setEscenariosPython] = useState([]);
  const [selectedDef, setSelectedDef] = useState('');
  const [cargandoDefs, setCargandoDefs] = useState(false);

  // Estado del Nuevo Escenario a guardar en BD
  const [newScenario, setNewScenario] = useState({
    submoduleId: '',
    name: '',
    description: '',
    specPathOrTag: '',
  });

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const refresh = useCallback(() => {
    if (!auth?.token) return;

    api
      .get('/modules', auth.token)
      .then((data) => {
        const list = data || [];
        setProjectsData(list);
        if (list.length > 0) {
          setSelectedProjectId((prev) => prev || String(list[0].id));
        }
      })
      .catch((err) => console.error('Error cargando módulos:', err));

    api
      .get('/modules/scenarios', auth.token)
      .then((data) => setScenarios(data || []))
      .catch(() => setScenarios([]));
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token) return;
    refresh();

    const fetchPythonTemplates = async () => {
      try {
        const token = auth?.token || localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE_URL}/matrix/python-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const pyFiles = (data || []).filter((t) =>
            (t.nombre || '').toLowerCase().endsWith('.py')
          );
          setPythonTemplates(pyFiles);
        }
      } catch (err) {
        console.error('Error cargando scripts de pos_screenplay_framework:', err);
      }
    };

    fetchPythonTemplates();
  }, [auth?.token, refresh]);

  const currentProject = useMemo(
    () => projectsData.find((p) => String(p.id) === String(selectedProjectId)),
    [projectsData, selectedProjectId]
  );

  const availableModules = currentProject?.modules || currentProject?.modulos || [];

  const allSubmodules = useMemo(() => {
    const list = [];
    projectsData.forEach((p) => {
      if (selectedProjectId && String(p.id) !== String(selectedProjectId)) return;
      const mods = p.modules || p.modulos || [];
      mods.forEach((m) => {
        const subs = m.submodules || m.submódulos || [];
        subs.forEach((s) => {
          list.push({ ...s, moduleName: m.name, projectName: p.name });
        });
      });
    });
    return list;
  }, [projectsData, selectedProjectId]);

  // Paginación de escenarios
  const totalPages = Math.max(1, Math.ceil(scenarios.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedScenarios = scenarios.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const cargarDefsDeArchivo = async (nombreArchivoPy) => {
    if (!nombreArchivoPy) {
      setEscenariosPython([]);
      return;
    }

    setCargandoDefs(true);
    try {
      const token = auth?.token || localStorage.getItem('token') || '';
      const rutaDinamicaPy = `pos_screenplay_framework/tests/${nombreArchivoPy}`;
      const resPy = await fetch(
        `${API_BASE_URL}/matrix/parse-python-scenarios?path=${encodeURIComponent(rutaDinamicaPy)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resPy.ok) {
        const dataPy = await resPy.json();
        setEscenariosPython(dataPy.escenarios || []);
      } else {
        setEscenariosPython([]);
      }
    } catch (err) {
      console.error('Error parseando defs de Python:', err);
      setEscenariosPython([]);
    } finally {
      setCargandoDefs(false);
    }
  };

  const handleSubmoduleChange = async (subId) => {
    setSelectedDef('');
    const subObj = allSubmodules.find((sm) => String(sm.id) === String(subId));

    if (!subObj) {
      setSelectedPyFile('');
      setEscenariosPython([]);
      setNewScenario({ submoduleId: '', name: '', description: '', specPathOrTag: '' });
      return;
    }

    const modLower = (subObj.moduleName || '').toLowerCase();
    const matchedTemplate = pythonTemplates.find((t) => {
      const fileLower = (t.nombre || '').toLowerCase();
      if (modLower.includes('retail') && !modLower.includes('intra')) {
        return fileLower.includes('retail');
      }
      if (modLower.includes('intra') || modLower.includes('extra')) {
        return fileLower.includes('intra') || fileLower.includes('extra');
      }
      return false;
    });

    const autoFile = matchedTemplate ? matchedTemplate.nombre : '';
    setSelectedPyFile(autoFile);
    setNewScenario({
      submoduleId: subId,
      name: '',
      description: '',
      specPathOrTag: autoFile,
    });

    if (autoFile) {
      await cargarDefsDeArchivo(autoFile);
    } else {
      setEscenariosPython([]);
    }
  };

  const handlePyFileChange = async (fileName) => {
    setSelectedPyFile(fileName);
    setSelectedDef('');
    setNewScenario((prev) => ({
      ...prev,
      name: '',
      description: '',
      specPathOrTag: fileName,
    }));
    await cargarDefsDeArchivo(fileName);
  };

  const handleDefSelect = (defRaw) => {
    setSelectedDef(defRaw);
    if (!defRaw) return;

    setNewScenario((prev) => ({
      ...prev,
      name: formatDefLabel(defRaw),
      description: defRaw,
      specPathOrTag: selectedPyFile || prev.specPathOrTag,
    }));
  };

  const selectedSubmoduleObj = allSubmodules.find(
    (sm) => String(sm.id) === String(newScenario.submoduleId)
  );

  const defsFiltrados = escenariosPython.filter((esc) => {
    const escStr = typeof esc === 'string' ? esc : esc?.nombre || esc?.name || '';
    const escLower = escStr.toLowerCase();
    const subLower = (selectedSubmoduleObj?.name || '').toLowerCase();

    const pideVenta = subLower.includes('venta');
    const pideAnulacion = subLower.includes('anulacion') || subLower.includes('anulación');
    const pideCierre = subLower.includes('cierre');

    if (!pideVenta && !pideAnulacion && !pideCierre) return true;
    if (pideVenta && escLower.includes('venta')) return true;
    if (pideAnulacion && escLower.includes('anulacion')) return true;
    if (pideCierre && escLower.includes('cierre')) return true;
    return false;
  });

  async function handleCreateSubmoduleWithModule(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!selectedProjectId) return setError('Selecciona un proyecto primero.');

    try {
      let targetModuleId = selectedModuleId;
      if (modoModulo === 'nuevo') {
        if (!nuevoModuloNombre.trim()) {
          return setError('El nombre del nuevo módulo es obligatorio.');
        }
        const createdModule = await api.post(
          '/modules',
          { name: nuevoModuloNombre, projectId: parseInt(selectedProjectId, 10) },
          auth.token
        );
        targetModuleId = createdModule.id;
      }

      if (!targetModuleId) {
        return setError('Debes seleccionar o crear un módulo válido.');
      }

      await api.post(
        '/modules/submodules',
        { name: submoduleName, moduleId: parseInt(targetModuleId, 10) },
        auth.token
      );
      triggerSuccess('¡Submódulo guardado con éxito!');
      setSubmoduleName('');
      setNuevoModuloNombre('');
      setSelectedModuleId('');
      refresh();
    } catch (err) {
      setError(err.message || 'Error al guardar el submódulo.');
    }
  }

  async function handleCreateScenario(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const yaExiste = scenarios.some(
      (s) =>
        String(s.submoduleId) === String(newScenario.submoduleId) &&
        s.name.trim().toLowerCase() === newScenario.name.trim().toLowerCase()
    );
    if (yaExiste) {
      return setError('Este escenario ya está registrado en el submódulo seleccionado.');
    }

    try {
      await api.post('/modules/scenarios', newScenario, auth.token);
      triggerSuccess('¡Escenario registrado correctamente!');
      setNewScenario({ submoduleId: '', name: '', description: '', specPathOrTag: '' });
      setSelectedPyFile('');
      setSelectedDef('');
      setEscenariosPython([]);
      setCurrentPage(Math.ceil((scenarios.length + 1) / ITEMS_PER_PAGE));
      refresh();
    } catch (err) {
      setError(err.message || 'Error al registrar el escenario.');
    }
  }

  return (
    <div className="sa-container">
      {/* Header y Alertas */}
      <div className="sa-header">
        <div>
          <h1 className="sa-title">Catálogo de Módulos y Escenarios</h1>
          <p className="sa-subtitle">Administra submódulos y sincroniza los escenarios</p>
        </div>

        <div className="sa-alerts">
          {error && (
            <div className="sa-alert sa-alert--error">
              <span>⚠️ {error}</span>
              <span className="sa-alert-close" onClick={() => setError('')}>
                ✕
              </span>
            </div>
          )}
          {successMessage && (
            <div className="sa-alert sa-alert--success">
              <span>✅ {successMessage}</span>
              <span className="sa-alert-close" onClick={() => setSuccessMessage('')}>
                ✕
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Layout Principal 2 Columnas */}
      <div className="sa-grid">
        {/* COLUMNA IZQUIERDA (Formularios) */}
        <div className="sa-scrollable-col">
          {/* 1. Proyecto */}
          <div className="sa-card">
            <h3 className="sa-card-title">
              <span className="sa-step-badge">1</span> Proyecto de Trabajo
            </h3>
            <select
              className="sa-input"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedModuleId('');
              }}
            >
              <option value="">Selecciona un proyecto...</option>
              {projectsData.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Módulos y Submódulos */}
          <div className={`sa-card ${selectedProjectId ? '' : 'sa-card--disabled'}`}>
            <h3 className="sa-card-title">
              <span className="sa-step-badge">2</span> Gestión de módulos y submódulos
            </h3>
            <form onSubmit={handleCreateSubmoduleWithModule}>
              <div className="sa-radio-group">
                <label
                  className={`sa-radio-pill ${modoModulo === 'existente' ? 'sa-radio-pill--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="modoModulo"
                    value="existente"
                    className="sa-radio-input"
                    checked={modoModulo === 'existente'}
                    onChange={() => setModoModulo('existente')}
                  />
                  Existente
                </label>
                <label
                  className={`sa-radio-pill ${modoModulo === 'nuevo' ? 'sa-radio-pill--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="modoModulo"
                    value="nuevo"
                    className="sa-radio-input"
                    checked={modoModulo === 'nuevo'}
                    onChange={() => setModoModulo('nuevo')}
                  />
                  Nuevo
                </label>
              </div>

              {modoModulo === 'existente' ? (
                <div className="sa-field-group">
                  <label className="sa-label">Módulo padre</label>
                  <select
                    className="sa-input"
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un módulo...</option>
                    {availableModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="sa-field-group">
                  <label className="sa-label">Nombre del nuevo módulo</label>
                  <input
                    className="sa-input"
                    value={nuevoModuloNombre}
                    placeholder="Ej. Retail"
                    onChange={(e) => setNuevoModuloNombre(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="sa-field-group--md">
                <label className="sa-label">Nombre del submódulo</label>
                <input
                  className="sa-input"
                  value={submoduleName}
                  placeholder="Ej. VENTA"
                  onChange={(e) => setSubmoduleName(e.target.value)}
                  required
                />
              </div>

              <button className="sa-btn-submit" type="submit">
                Guardar Submódulo
              </button>
            </form>
          </div>

          {/* 3. Nuevo Escenario (Conectado a pos_screenplay_framework) */}
          <div className="sa-card">
            <h3 className="sa-card-title">
              <span className="sa-step-badge">3</span> Nuevo escenario de prueba
            </h3>
            <form onSubmit={handleCreateScenario}>
              <div className="sa-field-group">
                <label className="sa-label">Submódulo</label>
                <select
                  className="sa-input"
                  value={newScenario.submoduleId}
                  onChange={(e) => handleSubmoduleChange(e.target.value)}
                  required
                >
                  <option value="">Selecciona un submódulo...</option>
                  {allSubmodules.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.projectName} › {sm.moduleName} › {sm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sa-field-group">
                <label className="sa-label">Seleccionar Test</label>
                <select
                  className="sa-input"
                  value={selectedPyFile}
                  onChange={(e) => handlePyFileChange(e.target.value)}
                >
                  <option value="">-- Selecciona archivo .py --</option>
                  {pythonTemplates.map((t, idx) => (
                    <option key={idx} value={t.nombre}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sa-field-group">
                <label className="sa-label">Seleccionar Escenario</label>
                <select
                  className={`sa-input ${defsFiltrados.length > 0 ? 'sa-input--highlighted' : ''}`}
                  value={selectedDef}
                  onChange={(e) => handleDefSelect(e.target.value)}
                  disabled={cargandoDefs || !selectedPyFile}
                >
                  <option value="">
                    {cargandoDefs ? 'Cargando defs...' : '-- Elija el def a cargar --'}
                  </option>
                  {defsFiltrados.map((esc, idx) => {
                    const defRaw = typeof esc === 'string' ? esc : esc.nombre || esc.name;
                    return (
                      <option key={idx} value={defRaw}>
                        {formatDefLabel(defRaw)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sa-field-group">
                <label className="sa-label">Nombre del escenario</label>
                <input
                  className="sa-input"
                  value={newScenario.name}
                  placeholder="Se autocompleta al elegir el def..."
                  onChange={(e) =>
                    setNewScenario({ ...newScenario, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="sa-field-group--lg">
                <label className="sa-label">Ruta o tag</label>
                <input
                  className="sa-input sa-input--mono"
                  value={newScenario.specPathOrTag}
                  placeholder="test_flujo_retail.py"
                  onChange={(e) =>
                    setNewScenario({ ...newScenario, specPathOrTag: e.target.value })
                  }
                  required
                />
              </div>

              <button className="sa-btn-submit sa-btn-submit--lg" type="submit">
                Registrar Escenario
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA (Tabla compacta con paginación) */}
        <div className="sa-table-card">
          <div className="sa-table-grid sa-table-head">
            <span className="sa-th">SUBMÓDULO</span>
            <span className="sa-th">NOMBRE</span>
            <span className="sa-th">RUTA / TAG</span>
          </div>

          <div className="sa-table-body">
            {scenarios.length === 0 ? (
              <div className="sa-table-empty">No hay escenarios registrados.</div>
            ) : (
              paginatedScenarios.map((s) => (
                <div key={s.id} className="sa-table-grid sa-table-row">
                  {/* Módulo -> Submódulo */}
                  <div className="sa-badges">
                    <span className="sa-badge sa-badge--module">
                      <span className="sa-badge-dot" />
                      {s.submodule?.module?.name}
                    </span>
                    <span className={`sa-badge ${getSubmoduleBadgeClass(s.submodule?.name)}`}>
                      <span className="sa-badge-dot" />
                      {s.submodule?.name}
                    </span>
                  </div>

                  {/* Nombre del escenario */}
                  <div className="sa-scenario-name">{s.name}</div>

                  {/* Ruta / Tag */}
                  <div className="sa-scenario-path">{s.specPathOrTag || '—'}</div>
                </div>
              ))
            )}
          </div>

          {/* Footer con Paginación y Estado */}
          <div className="sa-table-footer">
            <span className="sa-footer-count">
              {scenarios.length === 0
                ? 'Mostrando 0 escenarios'
                : `Mostrando ${startIndex + 1}–${Math.min(startIndex + ITEMS_PER_PAGE, scenarios.length)} de ${scenarios.length} escenarios`}
            </span>

            <div className="sa-footer-right">
              {scenarios.length > ITEMS_PER_PAGE && (
                <div className="sa-pagination">
                  <button
                    type="button"
                    className="sa-page-btn"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ‹ Anterior
                  </button>
                  <span className="sa-page-indicator">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="sa-page-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente ›
                  </button>
                </div>
              )}

              <span className="sa-sync-status">
                <span className="sa-sync-dot" />
                Sincronizado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}