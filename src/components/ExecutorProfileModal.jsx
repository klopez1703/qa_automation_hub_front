import { useEffect, useState } from 'react';
import { api } from '../api/client';
import '../styles/ExecutorProfileModal.css';

const SUCCESS_STATUSES = ['EXITO', 'ÉXITO', 'EXITOSO', 'COMPLETADO', 'PASSED', 'PASS'];
const FAIL_STATUSES = ['FALLO', 'FALLIDO', 'FAILED', 'FAIL', 'ERROR'];

export function formatRoleLabel(roleName) {
  if (!roleName) return 'QA Funcional';
  const upper = roleName.toUpperCase();
  if (upper === 'ADMIN') return 'Admin';
  if (upper === 'QA_MANUAL' || upper === 'QA_FUNCIONAL') return 'QA Funcional';
  if (upper === 'QA_AUTOMATIZADOR') return 'QA Automatizador';
  return roleName;
}

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getRoleVariant = (roleName) => {
  const upper = (roleName || '').toUpperCase();
  if (upper === 'ADMIN') return 'admin';
  if (upper.includes('AUTOMATIZADOR')) return 'automator';
  return 'manual';
};

const getRoleIcon = (variant) => {
  if (variant === 'admin') return '🛡️';
  if (variant === 'automator') return '⚡';
  return '🧪';
};

const getExecutionStatusVariant = (status) => {
  const upper = String(status || '').toUpperCase();
  if (SUCCESS_STATUSES.includes(upper)) return 'success';
  if (FAIL_STATUSES.includes(upper)) return 'fail';
  return 'neutral';
};

export default function ExecutorProfileModal({ userId, token, onClose, onSelectUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || !token) return;
    setLoading(true);
    setError('');
    api
      .get(`/users/${userId}/profile`, token)
      .then(setProfile)
      .catch((err) => setError(err.message || 'No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (!userId) return null;

  const roleLabel = formatRoleLabel(profile?.role);
  const roleVariant = getRoleVariant(profile?.role);

  const kpiItems = profile
    ? [
        {
          label: 'Total Ejecuciones',
          value: profile.stats.totalExecutions,
          theme: 'slate',
        },
        {
          label: 'Exitosas',
          value: profile.stats.passedExecutions,
          theme: 'green',
        },
        {
          label: 'Fallidas',
          value: profile.stats.failedExecutions,
          theme: 'red',
        },
        {
          label: 'Efectividad',
          value: `${profile.stats.passRate}%`,
          theme: 'blue',
        },
      ]
    : [];

  return (
    <div className="epm-overlay" onClick={onClose}>
      <div className="epm-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera Oscura */}
        <div className="epm-header">
          <div className="epm-hero">
            <div className={`epm-avatar epm-avatar--${roleVariant}`}>
              {loading ? '…' : getInitials(profile?.name)}
            </div>

            <div>
              <div className="epm-title-row">
                <h3 className="epm-title">
                  {loading ? 'Cargando perfil...' : profile?.name}
                </h3>

                {profile && (
                  <span
                    className={`epm-status-pill ${
                      profile.active
                        ? 'epm-status-pill--active'
                        : 'epm-status-pill--inactive'
                    }`}
                  >
                    {profile.active ? '● Activo' : '● Inactivo'}
                  </span>
                )}
              </div>

              <div className="epm-email">{profile?.email}</div>

              {profile && (
                <div className="epm-role-wrap">
                  <span className={`epm-role-badge epm-role-badge--${roleVariant}`}>
                    {getRoleIcon(roleVariant)} {roleLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button type="button" className="epm-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Cuerpo del Perfil */}
        <div className="epm-body">
          {loading ? (
            <div className="epm-loading">Obteniendo información del ejecutador...</div>
          ) : error ? (
            <div className="epm-error">⚠️ {error}</div>
          ) : (
            profile && (
              <>
                {/* Cadena de Mando: Jefe QA -> Chapter Member -> Squad */}
                <div className="epm-org-box">
                  <div className="epm-org-title">Estructura Organizacional QA</div>

                  <div
                    className={`epm-hierarchy-grid ${
                      profile.squad ? 'epm-hierarchy-grid--with-squad' : ''
                    }`}
                  >
                    <div className="epm-hierarchy-card epm-hierarchy-card--amber">
                      <div className="epm-hierarchy-tag epm-hierarchy-tag--amber">
                        Jefe de QA
                      </div>
                      <div className="epm-hierarchy-val epm-hierarchy-val--amber">
                        {profile.qaHeadName || 'Joseph'}
                      </div>
                    </div>

                    <div className="epm-hierarchy-card epm-hierarchy-card--blue">
                      <div className="epm-hierarchy-tag epm-hierarchy-tag--blue">
                        Chapter Member
                      </div>
                      <div className="epm-hierarchy-val epm-hierarchy-val--blue">
                        {profile.chapterMember ? profile.chapterMember.name : 'Sin asignar'}
                      </div>
                    </div>

                    <div className="epm-hierarchy-card epm-hierarchy-card--green">
                      <div className="epm-hierarchy-tag epm-hierarchy-tag--green">
                        Squad
                      </div>
                      <div className="epm-hierarchy-val epm-hierarchy-val--green">
                        {profile.squad ? profile.squad.name : 'Sin Squad'}
                      </div>
                    </div>
                  </div>

                  {profile.squad && (
                    <div className="epm-squad-details">
                      <div>
                        <div className="epm-sub-label">
                          Squads de {profile.chapterMember?.name || 'este Chapter'}
                        </div>
                        <div className="epm-chip-list">
                          {(profile.chapterMember?.assignedSquads || []).map((sq) => (
                            <span
                              key={sq.id}
                              className={`epm-chip ${
                                sq.id === profile.squad.id ? 'epm-chip--squad-active' : ''
                              }`}
                            >
                              {sq.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="epm-sub-label">
                          Integrantes en {profile.squad.name} ({profile.squad.members.length})
                        </div>
                        <div className="epm-chip-list">
                          {profile.squad.members.map((m) => {
                            const isCurrent = m.id === profile.id;
                            const isClickable = Boolean(onSelectUser && !isCurrent);

                            return (
                              <span
                                key={m.id}
                                onClick={() => isClickable && onSelectUser(m.id)}
                                className={`epm-chip ${
                                  isCurrent ? 'epm-chip--member-current' : 'epm-chip--member'
                                } ${isClickable ? 'epm-chip--clickable' : ''}`}
                              >
                                {m.name} ({formatRoleLabel(m.role)})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* KPIs de Ejecución */}
                <div className="epm-kpi-grid">
                  {kpiItems.map((kpi) => (
                    <div key={kpi.label} className={`epm-kpi-card epm-kpi-card--${kpi.theme}`}>
                      <div className={`epm-kpi-label epm-kpi-label--${kpi.theme}`}>
                        {kpi.label}
                      </div>
                      <div className={`epm-kpi-value epm-kpi-value--${kpi.theme}`}>
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Últimas Ejecuciones */}
                <div>
                  <div className="epm-recent-title">Últimas ejecuciones realizadas</div>

                  {profile.recentExecutions.length === 0 ? (
                    <div className="epm-recent-empty">
                      Este usuario aún no registra ejecuciones en la bitácora.
                    </div>
                  ) : (
                    <div className="epm-recent-list">
                      {profile.recentExecutions.map((ex) => {
                        const statusVariant = getExecutionStatusVariant(ex.status);

                        return (
                          <div key={ex.id} className="epm-recent-row">
                            <div className="epm-recent-info">
                              <div className="epm-recent-name" title={ex.title}>
                                {ex.title}
                              </div>
                            </div>

                            <span
                              className={`epm-exec-badge epm-exec-badge--${statusVariant}`}
                            >
                              {ex.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}