import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ExecutorProfileModal from '../components/ExecutorProfileModal';
import '../styles/ExecutionHistory.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const SUCCESS_STATUSES = new Set([
  'EXITO',
  'ÉXITO',
  'EXITOSO',
  'COMPLETADO',
  'COMPLETED',
  'SUCCESS',
]);
const PAGE_LIMIT = 10;

export default function ExecutionHistoryPage() {
  const { auth } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  const rawRole =
    auth?.user?.role?.name ||
    auth?.user?.role ||
    auth?.role?.name ||
    auth?.role ||
    '';
  const [isAdmin, setIsAdmin] = useState(String(rawRole).toUpperCase() === 'ADMIN');

  // Catálogos organizacionales (ADMIN)
  const [chapterMembers, setChapterMembers] = useState([]);
  const [squads, setSquads] = useState([]);
  const [filtroChapter, setFiltroChapter] = useState('');
  const [filtroSquad, setFiltroSquad] = useState('');

  // Filtros y paginación
  const [filtroEscenario, setFiltroEscenario] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Modales
  const [profileUserId, setProfileUserId] = useState(null);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [activeTab, setActiveTab] = useState('checklist');

  const getAuthHeaders = useCallback(() => {
    const token = auth?.token || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, [auth]);

  useEffect(() => {
    setIsAdmin(String(rawRole).toUpperCase() === 'ADMIN');
  }, [rawRole]);

  useEffect(() => {
    if (!isAdmin) return;

    fetch(`${API_BASE_URL}/users/org-structure`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setChapterMembers(Array.isArray(data.chapterMembers) ? data.chapterMembers : []);
        setSquads(Array.isArray(data.squads) ? data.squads : []);
      })
      .catch((err) => console.error('Error cargando estructura QA:', err));
  }, [isAdmin, getAuthHeaders]);

  const availableSquads = filtroChapter
    ? squads.filter((s) => Number(s.chapterMemberId) === Number(filtroChapter))
    : squads;

  const fetchHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (filtroEscenario) params.append('escenario', filtroEscenario);
      if (filtroFecha) params.append('fecha', filtroFecha);
      if (isAdmin && filtroChapter) params.append('chapterMemberId', filtroChapter);
      if (isAdmin && filtroSquad) params.append('squadId', filtroSquad);

      const res = await fetch(`${API_BASE_URL}/executions?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setHistorial(data.runs || []);
        setTotalPages(data.totalPages || 1);
        setTotalRegistros(data.total || 0);
        if (typeof data.isAdmin === 'boolean') {
          setIsAdmin(data.isAdmin);
        }
      }
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, filtroEscenario, filtroFecha, isAdmin, filtroChapter, filtroSquad, page]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistorial();
  };

  const handleLimpiar = () => {
    setFiltroEscenario('');
    setFiltroFecha('');
    setFiltroChapter('');
    setFiltroSquad('');
    setPage(1);
  };

  const handleVerDetalle = async (run) => {
    setSelectedExecution(run);
    setActiveTab('checklist');

    try {
      setLoadingDetalle(true);
      const res = await fetch(`${API_BASE_URL}/executions/${run.id}/details`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const detalleCompleto = await res.json();
        const execData = detalleCompleto.execution || detalleCompleto;

        if (execData.steps && typeof execData.steps === 'string') {
          try {
            execData.steps = JSON.parse(execData.steps);
          } catch {
            execData.steps = [];
          }
        }
        setSelectedExecution(execData);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleDownloadExecutionMatrix = async (execId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/executions/${execId}/download-matrix`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error('Matriz no disponible en el servidor.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Matriz_Resultado_${execId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Aviso: ${error.message}`);
    }
  };

  return (
    <div className="exec-history-container">
      {/* Cabecera */}
      <div className="exec-history-header">
        <div>
          <h1 className="exec-history-title">Historial y Bitácora de Ejecuciones</h1>
          <p className="exec-history-subtitle">
            {isAdmin
              ? 'Vista global de administrador: consulta ejecuciones de todo el equipo y filtra por Chapter Member o Squad.'
              : 'Consulta tus ejecuciones realizadas, revisa sus pasos detallados y descarga tus matrices generadas.'}
          </p>
        </div>

        <span className={`exec-role-badge ${isAdmin ? 'exec-role-badge--admin' : 'exec-role-badge--user'}`}>
          {isAdmin
            ? `🛡️ Vista Global Admin (${totalRegistros} registros)`
            : `👤 Mis Ejecuciones (${totalRegistros} registros)`}
        </span>
      </div>

      {/* Barra de filtros */}
      <form className="exec-filters" onSubmit={handleBuscar}>
        <div className="exec-filter-group">
          <label className="exec-filter-label">Buscar por Escenario:</label>
          <input
            type="text"
            className="exec-filter-control"
            placeholder="Ej. Venta, Retail..."
            value={filtroEscenario}
            onChange={(e) => setFiltroEscenario(e.target.value)}
          />
        </div>

        <div className="exec-filter-group exec-filter-group--sm">
          <label className="exec-filter-label">Filtrar por Fecha:</label>
          <input
            type="date"
            className="exec-filter-control"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>

        {isAdmin && (
          <>
            <div className="exec-filter-group">
              <label className="exec-filter-label">Chapter Member:</label>
              <select
                className={`exec-filter-control ${filtroChapter ? 'exec-filter-control--chapter' : ''}`}
                value={filtroChapter}
                onChange={(e) => {
                  setFiltroChapter(e.target.value);
                  setFiltroSquad('');
                  setPage(1);
                }}
              >
                <option value="">Todos los Chapter ({chapterMembers.length})</option>
                {chapterMembers.map((cm) => (
                  <option key={cm.id} value={cm.id}>{cm.name}</option>
                ))}
              </select>
            </div>

            <div className="exec-filter-group">
              <label className="exec-filter-label">Squad:</label>
              <select
                className={`exec-filter-control ${filtroSquad ? 'exec-filter-control--squad' : ''}`}
                value={filtroSquad}
                onChange={(e) => {
                  setFiltroSquad(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los Squads ({availableSquads.length})</option>
                {availableSquads.map((sq) => (
                  <option key={sq.id} value={sq.id}>{sq.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="exec-filter-actions">
          <button type="submit" className="exec-btn exec-btn--primary">
            🔍 Buscar
          </button>
          <button type="button" className="exec-btn exec-btn--secondary" onClick={handleLimpiar}>
            Limpiar
          </button>
        </div>
      </form>

      {/* Paginación */}
      <div className="exec-pagination">
        <span className="exec-pagination-info">
          Página <strong>{page}</strong> de <strong>{totalPages || 1}</strong>
        </span>
        <div className="exec-pagination-actions">
          <button
            type="button"
            className="exec-page-btn"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1 || loading}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="exec-page-btn"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages || loading}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="exec-table-wrap">
        <div className="exec-grid-layout exec-table-head">
          <div>Estado / Escenario</div>
          <div>Código ID</div>
          <div>Fecha y Hora</div>
          <div>Ejecutado por</div>
          <div>Acciones Rápidas</div>
          <div className="exec-detail-cell">Detalle</div>
        </div>

        {loading ? (
          <div className="exec-state-box">Cargando registros...</div>
        ) : historial.length === 0 ? (
          <div className="exec-state-box exec-state-box--empty">
            {isAdmin
              ? 'No se encontraron registros en la bitácora para los criterios seleccionados.'
              : 'Aún no tienes ejecuciones registradas en tu historial.'}
          </div>
        ) : (
          historial.map((run, idx) => {
            const esExito = SUCCESS_STATUSES.has(String(run.status || '').toUpperCase());
            const escenarioNombre = run.scenario?.name || run.scenarioName || 'Escenario Desconocido';
            const usuarioDisparador = run.user?.name || 'Usuario Desconocido';
            const squadName = run.user?.squad?.name;
            const chapterName = run.user?.squad?.chapterMember?.name;
            const fechaInicio = run.startedAt || run.fecha;
            const canOpenProfile = isAdmin && Boolean(run.user?.id);

            return (
              <div key={run.id || idx} className="exec-grid-layout exec-table-row">
                <div className="exec-scenario-cell">
                  <div className={`exec-status-avatar ${esExito ? 'exec-status-avatar--success' : 'exec-status-avatar--fail'}`}>
                    {esExito ? '✓' : '✕'}
                  </div>
                  <div className="exec-scenario-info">
                    <span className="exec-scenario-name">{escenarioNombre.replace(/_/g, ' ')}</span>
                    <span className={`exec-scenario-status ${esExito ? 'exec-scenario-status--success' : 'exec-scenario-status--fail'}`}>
                      {run.status || 'FALLO'}
                    </span>
                  </div>
                </div>

                <div className="exec-id-cell">#{run.id}</div>

                <div className="exec-date-cell">
                  {fechaInicio ? new Date(fechaInicio).toLocaleString() : 'N/A'}
                </div>

                <div className="exec-user-cell">
                  <div
                    onClick={() => canOpenProfile && setProfileUserId(run.user.id)}
                    title={canOpenProfile ? 'Ver perfil del ejecutador' : undefined}
                    className={`exec-user-name ${canOpenProfile ? 'exec-user-name--clickable' : ''}`}
                  >
                    {usuarioDisparador}
                  </div>
                  {isAdmin && (squadName || chapterName) && (
                    <div className="exec-user-org">
                      {[squadName, chapterName].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                <div className="exec-actions-cell">
                  <button
                    type="button"
                    className="exec-btn exec-btn--primary exec-btn--sm"
                    onClick={() => handleDownloadExecutionMatrix(run.id)}
                  >
                    📥 Descargar Matriz
                  </button>
                </div>

                <div className="exec-detail-cell">
                  <button
                    type="button"
                    className="exec-detail-btn"
                    onClick={() => handleVerDetalle(run)}
                    title="Ver Detalle"
                  >
                    ➔
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Perfil del Ejecutador (ADMIN) */}
      {isAdmin && (
        <ExecutorProfileModal
          userId={profileUserId}
          token={auth?.token || localStorage.getItem('token')}
          onClose={() => setProfileUserId(null)}
          onSelectUser={(id) => setProfileUserId(id)}
        />
      )}

      {/* Modal de Detalle Interactivo */}
      {selectedExecution && (
        <div className="exec-modal-overlay" onClick={() => setSelectedExecution(null)}>
          <div className="exec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="exec-modal-header">
              <h3 className="exec-modal-title">
                Bitácora de Ejecución #{selectedExecution.id}
              </h3>
              <button
                type="button"
                className="exec-btn exec-btn--danger"
                onClick={() => setSelectedExecution(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="exec-modal-tabs">
              <button
                type="button"
                className={`exec-tab-btn ${activeTab === 'checklist' ? 'exec-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('checklist')}
              >
                📋 Checklist de Pasos
              </button>
              <button
                type="button"
                className={`exec-tab-btn ${activeTab === 'logs' ? 'exec-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                💻 Consola de Logs
              </button>
            </div>

            <div className="exec-modal-body">
              {loadingDetalle ? (
                <div className="exec-modal-loading">
                  Cargando pasos y evidencias históricas...
                </div>
              ) : activeTab === 'checklist' ? (
                <div>
                  <h4 className="exec-steps-title">Pasos Registrados en la Bitácora:</h4>
                  {Array.isArray(selectedExecution.steps) && selectedExecution.steps.length > 0 ? (
                    selectedExecution.steps.map((step, sIdx) => (
                      <div key={sIdx} className="exec-step-card">
                        <div className="exec-step-header">
                          <span className="exec-step-badge">{step.tipoPaso || 'P'}</span>
                          <span className="exec-step-desc">
                            {step.descripcionDeLaPrueba || step.description}
                          </span>
                        </div>
                        <div className="exec-step-expected">
                          <strong>Resultado Esperado:</strong>{' '}
                          {step.resultadoFuncionalEsperado || step.expectedResult || 'N/A'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="exec-empty-steps">
                      No hay un desglose de pasos guardado para esta corrida histórica.
                    </p>
                  )}
                </div>
              ) : (
                <pre className="exec-logs-pre">
                  {selectedExecution.logOutput || 'No hay registros de consola guardados.'}
                </pre>
              )}
            </div>

            <div className="exec-modal-footer">
              <button
                type="button"
                className="exec-btn exec-btn--primary exec-btn--lg"
                onClick={() => handleDownloadExecutionMatrix(selectedExecution.id)}
              >
                📥 Descargar Matriz Histórica (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}