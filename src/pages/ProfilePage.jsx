import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatRoleLabel } from "../components/ExecutorProfileModal";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";

import "../styles/ProfilePage.css";

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "QA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProfilePage() {
  const { auth } = useAuth();
  const toast = useToast();

  const token = auth?.token || "";
  const sessionUser = auth?.user || {};
  const userId = sessionUser?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Formulario de datos personales
  const [name, setName] = useState(sessionUser?.name || "");
  const [email, setEmail] = useState(sessionUser?.email || "");
  const [savingInfo, setSavingInfo] = useState(false);

  // Formulario de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId || !token) return;
    setLoading(true);
    try {
      const data = await api.get(`/users/${userId}/profile`, token);
      setProfile(data);
      setName(data.name || sessionUser?.name || "");
      setEmail(data.email || sessionUser?.email || "");
    } catch (err) {
      toast.error(err.message || "No se pudo cargar la información del perfil.");
    } finally {
      setLoading(false);
    }
  }, [userId, token, sessionUser?.name, sessionUser?.email, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.warning("Por favor completa tu nombre y correo electrónico.");
      return;
    }

    setSavingInfo(true);
    try {
      const res = await api.put(
        `/users/${userId}/self-profile`,
        { name: name.trim(), email: email.trim() },
        token
      );

      // Actualizar sesión en localStorage y disparar evento global para el Sidebar
      const currentStorage = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
      if (currentStorage?.user) {
        currentStorage.user = {
          ...currentStorage.user,
          name: res.user?.name || name.trim(),
          email: res.user?.email || email.trim(),
        };
        localStorage.setItem("qa-hub-auth", JSON.stringify(currentStorage));
        window.dispatchEvent(new Event("qa-auth-updated"));
      }

      toast.success(res.message || "Perfil actualizado correctamente.");
      loadProfile();
    } catch (err) {
      toast.error(err.message || "Error al guardar los datos del perfil.");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning("Completa todos los campos de contraseña.");
      return;
    }
    if (newPassword.trim().length < 6) {
      toast.warning("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.put(
        `/users/${userId}/self-password`,
        { currentPassword, newPassword: newPassword.trim() },
        token
      );
      toast.success(res.message || "Contraseña actualizada exitosamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = formatRoleLabel(profile?.role || sessionUser?.role);
  const permissions = sessionUser?.permissions || [];
  const projects = sessionUser?.projects || [];
  const stats = profile?.stats || {
    totalExecutions: 0,
    passedExecutions: 0,
    failedExecutions: 0,
    passRate: 0,
  };

  return (
    <div className="pf-container">
      <div className="page-header">
        <h1>Mi Perfil</h1>
        <p>
          Consulta tu estructura QA, estadísticas de ejecución y administra tus
          credenciales de acceso.
        </p>
      </div>

      {/* HERO CARD DEL PERFIL */}
      <div className="pf-hero-card">
        <div className="pf-hero-left">
          <div className="pf-avatar">{getInitials(name || sessionUser?.name)}</div>
          <div>
            <div className="pf-name-row">
              <h2 className="pf-user-name">{name || sessionUser?.name}</h2>
              <span className="pf-status-pill">● Activo</span>
            </div>
            <div className="pf-user-email">{email || sessionUser?.email}</div>
            <div className="pf-badges-row">
              <span className="pf-role-badge">🛡️ {roleLabel}</span>
              <span className="pf-meta-chip">ID Usuario #{userId}</span>
            </div>
          </div>
        </div>

        {/* Jerarquía QA */}
        <div className="pf-hierarchy-box">
          <div className="pf-hierarchy-item">
            <span className="pf-h-label">Jefe de QA</span>
            <strong className="pf-h-val">{profile?.qaHeadName || "Joseph"}</strong>
          </div>
          <span className="pf-h-arrow">→</span>
          <div className="pf-hierarchy-item">
            <span className="pf-h-label">Chapter Member</span>
            <strong className="pf-h-val">
              {profile?.chapterMember?.name || "Sin asignar"}
            </strong>
          </div>
          <span className="pf-h-arrow">→</span>
          <div className="pf-hierarchy-item">
            <span className="pf-h-label">Squad</span>
            <strong className="pf-h-val">
              {profile?.squad?.name || "Sin Squad"}
            </strong>
          </div>
        </div>
      </div>

      {/* KPIs DE EJECUCIÓN */}
      <div className="pf-kpi-grid">
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">Ejecuciones Totales</span>
          <strong className="pf-kpi-value">{loading ? "—" : stats.totalExecutions}</strong>
        </div>
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">Exitosas</span>
          <strong className="pf-kpi-value pf-text-green">
            {loading ? "—" : stats.passedExecutions}
          </strong>
        </div>
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">Fallidas</span>
          <strong className="pf-kpi-value pf-text-red">
            {loading ? "—" : stats.failedExecutions}
          </strong>
        </div>
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">Tasa de Éxito</span>
          <strong className="pf-kpi-value pf-text-blue">
            {loading ? "—" : `${stats.passRate}%`}
          </strong>
        </div>
      </div>

      {/* GRID PRINCIPAL: EDITAR DATOS + CAMBIAR CONTRASEÑA */}
      <div className="pf-forms-grid">
        {/* Tarjeta 1: Información Personal */}
        <form className="pf-card" onSubmit={handleSaveInfo}>
          <h3 className="pf-card-title">Información Personal</h3>
          <p className="pf-card-subtitle">
            Estos datos se reflejan en tus ejecuciones y matrices generadas.
          </p>

          <div className="pf-field">
            <label className="pf-label">Nombre completo *</label>
            <input
              type="text"
              className="input pf-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Correo electrónico *</label>
            <input
              type="email"
              className="input pf-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Rol asignado</label>
            <input
              type="text"
              className="input pf-input"
              value={roleLabel}
              disabled
            />
          </div>

          <div className="pf-card-footer">
            <button
              type="submit"
              className="btn"
              disabled={savingInfo}
            >
              {savingInfo ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        {/* Tarjeta 2: Seguridad y Contraseña */}
        <form className="pf-card" onSubmit={handleChangePassword}>
          <div className="pf-card-head-row">
            <div>
              <h3 className="pf-card-title">Seguridad y Contraseña</h3>
              <p className="pf-card-subtitle">
                Actualiza tu contraseña de acceso al portal.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowPasswords((v) => !v)}
            >
              {showPasswords ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="pf-field">
            <label className="pf-label">Contraseña actual *</label>
            <input
              type={showPasswords ? "text" : "password"}
              className="input pf-input"
              placeholder="Ingresa tu contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Nueva contraseña *</label>
            <input
              type={showPasswords ? "text" : "password"}
              className="input pf-input"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Confirmar nueva contraseña *</label>
            <input
              type={showPasswords ? "text" : "password"}
              className="input pf-input"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="pf-card-footer">
            <button
              type="submit"
              className="btn"
              disabled={savingPassword}
            >
              {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>

      {/* PERMISOS Y PROYECTOS HABILITADOS */}
      <div className="pf-card pf-card--spaced">
        <h3 className="pf-card-title">Accesos y Proyectos Habilitados</h3>
        <div className="pf-access-grid">
          <div>
            <span className="pf-label">Permisos activos</span>
            <div className="pf-chips-wrap">
              {permissions.includes("*") ? (
                <span className="pf-chip pf-chip--perm">Acceso Total (ADMIN)</span>
              ) : permissions.length === 0 ? (
                <span className="pf-muted">Sin permisos adicionales</span>
              ) : (
                permissions.map((perm) => (
                  <span key={perm} className="pf-chip pf-chip--perm">
                    {perm}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <span className="pf-label">Proyectos asignados</span>
            <div className="pf-chips-wrap">
              {projects.length === 0 ? (
                <span className="pf-muted">
                  {roleLabel === "ADMIN"
                    ? "Todos los proyectos habilitados"
                    : "Ningún proyecto asignado aún"}
                </span>
              ) : (
                projects.map((proj) => (
                  <span key={proj.id} className="pf-chip pf-chip--project">
                    📁 {proj.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}