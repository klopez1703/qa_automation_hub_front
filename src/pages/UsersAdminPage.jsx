import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ExecutorProfileModal, { formatRoleLabel } from '../components/ExecutorProfileModal';
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { FaRandom } from "react-icons/fa";

import '../styles/UsersAdmin.css';

const ITEMS_PER_PAGE = 6;

const getInitials = (name, fallback = 'QA') => {
  if (!name || !name.trim()) return fallback;
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

export default function UsersAdminPage() {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [qaHeadName, setQaHeadName] = useState('');
  const [chapterMembers, setChapterMembers] = useState([]);
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [chapterFilter, setChapterFilter] = useState('TODOS');
  const [squadFilter, setSquadFilter] = useState('TODOS');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modal Crear / Editar Usuario (cascada Chapter Member -> Squad -> Rol)
  const [formModal, setFormModal] = useState({ open: false, mode: 'create', userId: null });
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    chapterMemberId: '',
    squadId: '',
    roleId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modales auxiliares: Chapter Member, Squad y Rol
  const [chapterModal, setChapterModal] = useState({ open: false, name: '', email: '', loading: false });
  const [squadModal, setSquadModal] = useState({
    open: false,
    name: '',
    description: '',
    chapterMemberId: '',
    loading: false,
  });
  const [roleModal, setRoleModal] = useState({ open: false, name: '', loading: false });

  // Modal Perfil del Ejecutador
  const [profileUserId, setProfileUserId] = useState(null);

  const [resetModal, setResetModal] = useState({
    open: false,
    user: null,
    mode: "MANUAL", // "MANUAL" | "EMAIL"
    newPassword: "",
    showPassword: false,
    mustChangePassword: false,
    loading: false,
    tempPasswordFallback: "",
  });

  function generateQuickPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
    let pass = "Qa";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetModal((prev) => ({
      ...prev,
      newPassword: pass,
      showPassword: true,
    }));
  }

  // Modal Confirmar Eliminación
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    user: null,
    loading: false,
  });

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  async function apiRequest(method, path, body) {
    const m = method.toUpperCase();
    if (m === 'GET') return api.get(path, auth.token);
    if (m === 'POST') return api.post(path, body ?? {}, auth.token);
    if (m === 'PUT') return api.put(path, body ?? {}, auth.token);
    if (m === 'PATCH' && typeof api.patch === 'function') {
      return api.patch(path, body ?? {}, auth.token);
    }
    if (m === 'DELETE' && typeof api.del === 'function') {
      return api.del(path, auth.token);
    }

    const base = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${base}${path}`, {
      method: m,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Error en la operación');
    return data;
  }

  const refresh = useCallback(() => {
    if (!auth?.token) return;
    setLoading(true);
    Promise.all([
      api.get('/users', auth.token),
      api.get('/users/roles', auth.token).catch(() => []),
      api.get('/users/org-structure', auth.token).catch(() => ({
        qaHeadName: '',
        chapterMembers: [],
        squads: [],
      })),
    ])
      .then(([usersData, rolesData, orgData]) => {
        setUsers(Array.isArray(usersData) ? usersData : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setQaHeadName(orgData?.qaHeadName || '');
        setChapterMembers(Array.isArray(orgData?.chapterMembers) ? orgData.chapterMembers : []);
        setSquads(Array.isArray(orgData?.squads) ? orgData.squads : []);
      })
      .catch((err) => setError(err.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, [auth?.token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, chapterFilter, squadFilter, roleFilter, statusFilter]);

  const formAvailableSquads = useMemo(
    () =>
      form.chapterMemberId
        ? squads.filter((s) => Number(s.chapterMemberId) === Number(form.chapterMemberId))
        : [],
    [squads, form.chapterMemberId]
  );

  const filterAvailableSquads = useMemo(
    () =>
      chapterFilter !== 'TODOS'
        ? squads.filter((s) => Number(s.chapterMemberId) === Number(chapterFilter))
        : squads,
    [squads, chapterFilter]
  );

  function openCreateModal() {
    setError('');
    const defaultChapterId =
      chapterFilter !== 'TODOS'
        ? String(chapterFilter)
        : chapterMembers[0]?.id
        ? String(chapterMembers[0].id)
        : '';

    const squadsForDefaultChapter = defaultChapterId
      ? squads.filter((s) => Number(s.chapterMemberId) === Number(defaultChapterId))
      : [];

    const defaultSquadId =
      squadFilter !== 'TODOS'
        ? String(squadFilter)
        : squadsForDefaultChapter[0]?.id
        ? String(squadsForDefaultChapter[0].id)
        : '';

    const defaultQaRole = roles.find((r) => r.name !== 'ADMIN') || roles[0];

    setForm({
      name: '',
      email: '',
      password: '',
      chapterMemberId: defaultChapterId,
      squadId: defaultSquadId,
      roleId: defaultQaRole ? String(defaultQaRole.id) : '2',
    });
    setFormModal({ open: true, mode: 'create', userId: null });
  }

  function openEditModal(user) {
    setError('');
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      chapterMemberId: user.chapterMemberId ? String(user.chapterMemberId) : '',
      squadId: user.squadId ? String(user.squadId) : '',
      roleId: user.roleId ? String(user.roleId) : '2',
    });
    setFormModal({ open: true, mode: 'edit', userId: user.id });
  }

  function handleChapterChangeInForm(newChapterId) {
    const matchingSquads = squads.filter(
      (s) => Number(s.chapterMemberId) === Number(newChapterId)
    );
    setForm((prev) => ({
      ...prev,
      chapterMemberId: newChapterId,
      squadId: matchingSquads[0]?.id ? String(matchingSquads[0].id) : '',
    }));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!form.chapterMemberId || !form.squadId) {
      setError('Debes seleccionar un Chapter Member y un Squad asignado.');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: form.name,
      email: form.email,
      squadId: Number(form.squadId),
      roleId: Number(form.roleId),
      ...(formModal.mode === 'create' ? { password: form.password } : {}),
    };

    try {
      if (formModal.mode === 'create') {
        await api.post('/users', payload, auth.token);
        triggerSuccess('¡Usuario registrado y asignado al Squad!');
      } else {
        await apiRequest('PUT', `/users/${formModal.userId}`, payload);
        triggerSuccess('¡Usuario actualizado correctamente!');
      }
      setFormModal({ open: false, mode: 'create', userId: null });
      refresh();
    } catch (err) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRole(e) {
    e.preventDefault();
    setError('');
    setRoleModal((prev) => ({ ...prev, loading: true }));
    try {
      const created = await api.post('/users/roles', { name: roleModal.name }, auth.token);
      setRoleModal({ open: false, name: '', loading: false });
      triggerSuccess(`Rol "${formatRoleLabel(created.name)}" agregado.`);
      refresh();
    } catch (err) {
      setError(err.message || 'Error al crear rol');
      setRoleModal((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleCreateChapterMember(e) {
    e.preventDefault();
    setError('');
    setChapterModal((prev) => ({ ...prev, loading: true }));
    try {
      const created = await api.post(
        '/users/chapter-members',
        { name: chapterModal.name, email: chapterModal.email, qaHeadName },
        auth.token
      );
      setChapterModal({ open: false, name: '', email: '', loading: false });
      triggerSuccess(`Chapter Member "${created.name}" registrado bajo ${qaHeadName}.`);
      refresh();
    } catch (err) {
      setError(err.message || 'Error al crear Chapter Member');
      setChapterModal((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleCreateSquad(e) {
    e.preventDefault();
    setError('');
    setSquadModal((prev) => ({ ...prev, loading: true }));
    try {
      const created = await api.post(
        '/users/squads',
        {
          name: squadModal.name,
          description: squadModal.description,
          chapterMemberId: Number(squadModal.chapterMemberId),
        },
        auth.token
      );
      setSquadModal({ open: false, name: '', description: '', chapterMemberId: '', loading: false });
      triggerSuccess(`Squad "${created.name}" asignado a ${created.chapterMember?.name || 'Chapter Member'}.`);
      refresh();
    } catch (err) {
      setError(err.message || 'Error al crear Squad');
      setSquadModal((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleToggleStatus(user) {
    setError('');
    setSuccessMessage('');
    const nextActive = user.active === false;

    try {
      await apiRequest('PATCH', `/users/${user.id}/status`, { active: nextActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: nextActive } : u))
      );
      triggerSuccess(
        nextActive ? `Usuario ${user.name} activado.` : `Usuario ${user.name} desactivado.`
      );
    } catch (err) {
      setError(err.message || 'Error al cambiar estado del usuario');
    }
  }

  async function handleConfirmResetPassword(e) {
    if (e) e.preventDefault();
    if (!resetModal.user) return;
    setError("");
    setSuccessMessage("");

    if (resetModal.mode === "MANUAL") {
      if (!resetModal.newPassword || resetModal.newPassword.trim().length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }

      setResetModal((prev) => ({ ...prev, loading: true }));
      try {
        const res = await apiRequest(
          "PUT",
          `/users/${resetModal.user.id}/password`,
          {
            newPassword: resetModal.newPassword.trim(),
            mustChangePassword: resetModal.mustChangePassword,
          }
        );
        triggerSuccess(
          res?.message || `Contraseña actualizada para ${resetModal.user.name}.`
        );
        setResetModal({
          open: false,
          user: null,
          mode: "MANUAL",
          newPassword: "",
          showPassword: false,
          mustChangePassword: false,
          loading: false,
          tempPasswordFallback: "",
        });
      } catch (err) {
        setError(err.message || "Error al actualizar la contraseña");
        setResetModal((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    // Modo EMAIL: Flujo original de contraseña temporal por correo
    setResetModal((prev) => ({
      ...prev,
      loading: true,
      tempPasswordFallback: "",
    }));

    try {
      const res = await apiRequest(
        "POST",
        `/users/${resetModal.user.id}/reset-password`,
        {}
      );
      if (res?.emailSent) {
        triggerSuccess(
          res.message || `Contraseña temporal enviada a ${resetModal.user.email}`
        );
        setResetModal({
          open: false,
          user: null,
          mode: "MANUAL",
          newPassword: "",
          showPassword: false,
          mustChangePassword: false,
          loading: false,
          tempPasswordFallback: "",
        });
      } else {
        setResetModal((prev) => ({
          ...prev,
          loading: false,
          tempPasswordFallback: res?.tempPassword || "Actualizada en BD",
        }));
        triggerSuccess(res?.message || "Contraseña temporal generada.");
      }
    } catch (err) {
      setError(err.message || "Error al restablecer contraseña");
      setResetModal((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.user) return;
    setError('');
    setSuccessMessage('');
    setDeleteModal((prev) => ({ ...prev, loading: true }));

    try {
      await apiRequest('DELETE', `/users/${deleteModal.user.id}`);
      triggerSuccess(`Usuario ${deleteModal.user.name} eliminado.`);
      setDeleteModal({ open: false, user: null, loading: false });
      refresh();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el usuario');
      setDeleteModal({ open: false, user: null, loading: false });
    }
  }

  // Contadores
  const totalUsers = users.length;
  const countActivos = users.filter((u) => u.active !== false).length;
  const countInactivos = users.filter((u) => u.active === false).length;
  const countAutomatizadores = users.filter((u) =>
    (u.role || '').toUpperCase().includes('AUTOMATIZADOR')
  ).length;

  const selectedChapterObj =
    chapterFilter !== 'TODOS'
      ? chapterMembers.find((c) => Number(c.id) === Number(chapterFilter))
      : null;

  const selectedSquadObj =
    squadFilter !== 'TODOS'
      ? squads.find((s) => Number(s.id) === Number(squadFilter))
      : null;

  // Datos en vivo para vistas previas dentro de los modales
  const formSelectedRole = roles.find((r) => Number(r.id) === Number(form.roleId));
  const formRoleVariant = getRoleVariant(formSelectedRole?.name);
  const formSelectedChapter = chapterMembers.find(
    (c) => Number(c.id) === Number(form.chapterMemberId)
  );
  const formSelectedSquad = squads.find((s) => Number(s.id) === Number(form.squadId));

  const squadModalSelectedChapter = chapterMembers.find(
    (c) => Number(c.id) === Number(squadModal.chapterMemberId)
  );

  // Filtrado combinado
  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          (u.name || '').toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query) ||
          (u.squadName || '').toLowerCase().includes(query) ||
          (u.chapterMemberName || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;

        if (chapterFilter !== 'TODOS' && Number(u.chapterMemberId) !== Number(chapterFilter)) {
          return false;
        }

        if (squadFilter !== 'TODOS' && Number(u.squadId) !== Number(squadFilter)) {
          return false;
        }

        if (roleFilter !== 'TODOS' && Number(u.roleId) !== Number(roleFilter)) {
          return false;
        }

        const isActive = u.active !== false;
        if (statusFilter === 'ACTIVOS' && !isActive) return false;
        if (statusFilter === 'INACTIVOS' && isActive) return false;

        return true;
      }),
    [users, searchTerm, chapterFilter, squadFilter, roleFilter, statusFilter]
  );

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const kpiCards = [
    {
      id: 'JEFE',
      label: 'Jefe de QA (Chapter Lead)',
      value: qaHeadName,
      sub: `${chapterMembers.length} Chapter Members · ${squads.length} Squads`,
      theme: 'amber',
      isSelected: false,
      onClick: () => {
        setChapterFilter('TODOS');
        setSquadFilter('TODOS');
      },
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: 'TOTAL',
      label: 'Ejecutadores QA',
      value: totalUsers,
      sub: `${countAutomatizadores} Automatizadores · ${totalUsers - countAutomatizadores} Otros roles`,
      theme: 'blue',
      isSelected: statusFilter === 'TODOS' && roleFilter === 'TODOS',
      onClick: () => {
        setStatusFilter('TODOS');
        setRoleFilter('TODOS');
      },
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'ACTIVOS',
      label: 'Usuarios Activos',
      value: countActivos,
      sub: 'Con acceso habilitado',
      theme: 'green',
      isSelected: statusFilter === 'ACTIVOS',
      onClick: () => setStatusFilter((prev) => (prev === 'ACTIVOS' ? 'TODOS' : 'ACTIVOS')),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      id: 'INACTIVOS',
      label: 'Usuarios Inactivos',
      value: countInactivos,
      sub: 'Cuentas desactivadas',
      theme: 'red',
      isSelected: statusFilter === 'INACTIVOS',
      onClick: () => setStatusFilter((prev) => (prev === 'INACTIVOS' ? 'TODOS' : 'INACTIVOS')),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="8" x2="22" y2="13" />
          <line x1="22" y1="8" x2="17" y2="13" />
        </svg>
      ),
    },
  ];

  return (
    <div className="users-admin-container">
      {/* Header */}
      <div className="ua-header">
        <div>
          <h1 className="ua-title">Usuarios, Chapter Members y Squads</h1>
          <p className="ua-subtitle">
            Jerarquía QA: <strong>{qaHeadName}</strong> (Jefe de QA) → Chapter Member → Squad → Rol.
          </p>
        </div>

        <div className="ua-header-actions">
          {error && (
            <div className="ua-alert ua-alert--error">
              <span>⚠️ {error}</span>
              <span className="ua-alert-close" onClick={() => setError('')}>✕</span>
            </div>
          )}

          {successMessage && (
            <div className="ua-alert ua-alert--success">
              <span>✅ {successMessage}</span>
              <span className="ua-alert-close" onClick={() => setSuccessMessage('')}>✕</span>
            </div>
          )}

          <button
            type="button"
            className="ua-top-btn ua-top-btn--role"
            onClick={() => setRoleModal({ open: true, name: '', loading: false })}
          >
            + Rol
          </button>

          <button
            type="button"
            className="ua-top-btn ua-top-btn--chapter"
            onClick={() => setChapterModal({ open: true, name: '', email: '', loading: false })}
          >
            + Chapter Member
          </button>

          <button
            type="button"
            className="ua-top-btn ua-top-btn--squad"
            onClick={() =>
              setSquadModal({
                open: true,
                name: '',
                description: '',
                chapterMemberId: chapterMembers[0]?.id ? String(chapterMembers[0].id) : '',
                loading: false,
              })
            }
          >
            + Nuevo Squad
          </button>

          <button
            type="button"
            className="ua-top-btn--primary"
            onClick={openCreateModal}
          >
            <span className="ua-top-btn-plus">+</span> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* 4 Cards de Resumen */}
      <div className="ua-kpi-grid">
        {kpiCards.map((card) => (
          <div
            key={card.id}
            className={`kpi-user-card ${card.isSelected ? 'kpi-user-card--selected' : ''}`}
            onClick={card.onClick}
          >
            <div className={`ua-kpi-icon ua-kpi-icon--${card.theme}`}>{card.icon}</div>
            <div>
              <div className="ua-kpi-label">{card.label}</div>
              <div className="ua-kpi-value">{loading ? '—' : card.value}</div>
              <div className={`ua-kpi-sub ua-kpi-sub--${card.theme}`}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Búsqueda + Filtros */}
      <div className="ua-toolbar">
        <div className="ua-search-wrap">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ua-search-icon"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="ua-input ua-input--search input-focus"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar ejecutador, chapter o squad..."
          />
        </div>

        <div className="ua-filters-group">
          <select
            className={`ua-input ua-filter-select ua-filter-select--chapter input-focus ${
              chapterFilter !== 'TODOS' ? 'ua-filter-select--chapter-active' : ''
            }`}
            value={chapterFilter}
            onChange={(e) => {
              setChapterFilter(e.target.value);
              setSquadFilter('TODOS');
            }}
          >
            <option value="TODOS">Todos los Chapter ({chapterMembers.length})</option>
            {chapterMembers.map((cm) => (
              <option key={cm.id} value={cm.id}>
                Chapter: {cm.name} ({cm.squads?.length || 0} squads)
              </option>
            ))}
          </select>

          <select
            className={`ua-input ua-filter-select ua-filter-select--squad input-focus ${
              squadFilter !== 'TODOS' ? 'ua-filter-select--squad-active' : ''
            }`}
            value={squadFilter}
            onChange={(e) => setSquadFilter(e.target.value)}
          >
            <option value="TODOS">Todos los Squads ({filterAvailableSquads.length})</option>
            {filterAvailableSquads.map((sq) => (
              <option key={sq.id} value={sq.id}>
                Squad: {sq.name} ({sq.users?.length || 0})
              </option>
            ))}
          </select>

          <select
            className="ua-input ua-filter-select ua-filter-select--role input-focus"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="TODOS">Todos los roles ({roles.length})</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {formatRoleLabel(r.name)}
              </option>
            ))}
          </select>

          <select
            className="ua-input ua-filter-select ua-filter-select--status input-focus"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="TODOS">Todos ({totalUsers})</option>
            <option value="ACTIVOS">Activos ({countActivos})</option>
            <option value="INACTIVOS">Inactivos ({countInactivos})</option>
          </select>
        </div>
      </div>

      {/* Banner Jerárquico Dinámico */}
      {(selectedChapterObj || selectedSquadObj) && (
        <div className="ua-hierarchy-banner">
          <div className="ua-hierarchy-chain">
            <div>
              <div className="ua-hierarchy-tag ua-hierarchy-tag--amber">Jefe de QA</div>
              <div className="ua-hierarchy-val ua-hierarchy-val--slate">{qaHeadName}</div>
            </div>

            <span className="ua-hierarchy-arrow">→</span>

            <div>
              <div className="ua-hierarchy-tag ua-hierarchy-tag--blue">
                Chapter Member (Coordinador)
              </div>
              <div className="ua-hierarchy-val ua-hierarchy-val--blue">
                {selectedSquadObj?.chapterMember?.name || selectedChapterObj?.name || 'Sin asignar'}
              </div>
            </div>

            {selectedSquadObj && (
              <>
                <span className="ua-hierarchy-arrow">→</span>
                <div>
                  <div className="ua-hierarchy-tag ua-hierarchy-tag--green">
                    Squad Seleccionado
                  </div>
                  <div className="ua-hierarchy-val ua-hierarchy-val--green">
                    {selectedSquadObj.name}
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedChapterObj && !selectedSquadObj && (
            <div>
              <div className="ua-chapter-squads-label">
                Squads a cargo de {selectedChapterObj.name}:
              </div>
              <div className="ua-chapter-squads-list">
                {(selectedChapterObj.squads || []).map((sq) => (
                  <button
                    key={sq.id}
                    type="button"
                    className="ua-squad-pill-btn"
                    onClick={() => setSquadFilter(String(sq.id))}
                  >
                    {sq.name} ({sq.users?.length || 0})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paginación Superior */}
      <div className="ua-pagination-bar">
        <div className="ua-pagination-info">
          Página <strong className="ua-pagination-strong">{safePage}</strong> de{' '}
          <strong className="ua-pagination-strong">{totalPages}</strong>
          <span className="ua-pagination-total">
            ({filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'})
          </span>
        </div>

        <div className="ua-pagination-btns">
          <button
            type="button"
            className="ua-page-btn ua-page-btn--prev"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ← Anterior
          </button>

          <button
            type="button"
            className="ua-page-btn ua-page-btn--next"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="ua-table-wrap">
        <div className="ua-table-grid ua-table-head">
          <span>Ejecutador</span>
          <span>Correo</span>
          <span>Chapter Member / Squad</span>
          <span>Rol</span>
          <span>Estado</span>
          <span className="ua-th-right">Acciones</span>
        </div>

        {loading ? (
          <div className="ua-state-box">Cargando usuarios...</div>
        ) : paginatedUsers.length === 0 ? (
          <div className="ua-state-box ua-state-box--bordered">
            No hay usuarios que coincidan con los filtros seleccionados.
          </div>
        ) : (
          paginatedUsers.map((u) => {
            const isActive = u.active !== false;
            const roleVariant = getRoleVariant(u.role);

            return (
              <div
                key={u.id}
                className={`ua-table-grid user-item-card ${
                  isActive ? '' : 'user-item-card--inactive'
                }`}
              >
                {/* Nombre + Avatar */}
                <div
                  className="ua-user-cell"
                  onClick={() => setProfileUserId(u.id)}
                  title="Ver perfil del ejecutador"
                >
                  <div className={`ua-avatar ua-avatar--${roleVariant}`}>
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <div className="ua-user-name">{u.name}</div>
                    <div className="ua-user-meta">
                      ID #{u.id} · {u.executionsCount || 0} ejecuciones
                    </div>
                  </div>
                </div>

                {/* Correo */}
                <div className="ua-email-cell">{u.email}</div>

                {/* Chapter Member y Squad */}
                <div className="ua-org-cell">
                  {u.squadName ? (
                    <div>
                      <div className="ua-squad-name">{u.squadName}</div>
                      <div className="ua-chapter-name">
                        Chapter: {u.chapterMemberName || 'Sin asignar'}
                      </div>
                    </div>
                  ) : (
                    <span className="ua-unassigned">Sin Squad asignado</span>
                  )}
                </div>

                {/* Rol */}
                <div>
                  <span className={`ua-role-badge ua-role-badge--${roleVariant}`}>
                    {getRoleIcon(roleVariant)} {formatRoleLabel(u.role)}
                  </span>
                </div>

                {/* Estado */}
                <div>
                  <span
                    className={`ua-status-badge ${
                      isActive ? 'ua-status-badge--active' : 'ua-status-badge--inactive'
                    }`}
                  >
                    <span className="ua-status-dot" />
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Acciones */}
                <div className="ua-actions-cell">
                  <button
                    type="button"
                    className="action-icon-btn action-icon-btn--view"
                    title="Ver perfil del ejecutador"
                    onClick={() => setProfileUserId(u.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="action-icon-btn action-icon-btn--edit"
                    title="Editar usuario, Chapter, Squad y Rol"
                    onClick={() => openEditModal(u)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`action-icon-btn ${
                      isActive ? 'action-icon-btn--deactivate' : 'action-icon-btn--activate'
                    }`}
                    title={isActive ? 'Desactivar usuario' : 'Activar usuario'}
                    onClick={() => handleToggleStatus(u)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                      <line x1="12" y1="2" x2="12" y2="12" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="action-icon-btn action-icon-btn--reset"
                    title="Cambiar o restablecer contraseña"
                    onClick={() =>
                      setResetModal({
                        open: true,
                        user: u,
                        mode: "MANUAL",
                        newPassword: "",
                        showPassword: false,
                        mustChangePassword: false,
                        loading: false,
                        tempPasswordFallback: "",
                      })
                    }
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="action-icon-btn action-icon-btn--delete"
                    title="Eliminar usuario"
                    onClick={() => setDeleteModal({ open: true, user: u, loading: false })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Perfil del Ejecutador */}
      <ExecutorProfileModal
        userId={profileUserId}
        token={auth?.token}
        onClose={() => setProfileUserId(null)}
        onSelectUser={(id) => setProfileUserId(id)}
      />

      {/* ==========================================================================
          MODAL 1: Crear / Editar Ejecutador QA
          ========================================================================== */}
      {formModal.open && (
        <div
          className="ua-modal-overlay"
          onClick={() => setFormModal({ open: false, mode: 'create', userId: null })}
        >
          <div className="ua-modal-card ua-modal-card--user" onClick={(e) => e.stopPropagation()}>
            {/* Cabecera Oscura */}
            <div className="ua-modal-dark-header ua-modal-dark-header--lg">
              <div className="ua-modal-hero ua-modal-hero--lg">
                <div
                  className={`ua-modal-avatar ua-modal-avatar--lg ua-modal-avatar--${formRoleVariant}`}
                >
                  {getInitials(form.name, 'QA')}
                </div>

                <div>
                  <div className="ua-modal-title-row">
                    <h3 className="ua-modal-title ua-modal-title--lg">
                      {form.name.trim()
                        ? form.name.trim()
                        : formModal.mode === 'create'
                        ? 'Registrar ejecutador QA'
                        : 'Editar ejecutador QA'}
                    </h3>
                    <span className="ua-modal-pill ua-modal-pill--green">
                      ● {formModal.mode === 'create' ? 'Nuevo Usuario' : 'Editando perfil'}
                    </span>
                  </div>

                  <div className="ua-modal-subtitle ua-modal-subtitle--lg">
                    {form.email.trim() || 'Ingresa el correo corporativo del ejecutador'}
                  </div>

                  <div className="ua-modal-badge-wrap--lg">
                    <span className={`ua-modal-hero-badge ua-modal-hero-badge--${formRoleVariant}`}>
                      {getRoleIcon(formRoleVariant)}{' '}
                      {formatRoleLabel(formSelectedRole?.name || 'QA_MANUAL')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="ua-modal-close-btn"
                onClick={() => setFormModal({ open: false, mode: 'create', userId: null })}
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form className="ua-modal-body--lg" onSubmit={handleFormSubmit}>
              <div className="ua-field">
                <label className="ua-label">Nombre completo *</label>
                <input
                  className="ua-input input-focus"
                  placeholder="Nombre completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className={formModal.mode === 'create' ? 'ua-form-grid-2' : 'ua-form-grid-1'}>
                <div>
                  <label className="ua-label">Correo electrónico *</label>
                  <input
                    className="ua-input input-focus"
                    type="email"
                    placeholder="correo.correo@ficohsa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                {formModal.mode === 'create' && (
                  <div>
                    <label className="ua-label">Contraseña temporal *</label>
                    <input
                      className="ua-input input-focus"
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Caja Estructura Organizacional QA */}
              <div className="ua-org-box">
                <div className="ua-org-box-title">Estructura Organizacional QA</div>

                {/* Vista previa 3 cards jerárquicas */}
                <div className="ua-preview-grid-3">
                  <div className="ua-preview-card ua-preview-card--amber">
                    <div className="ua-preview-tag ua-preview-tag--amber">Jefe de QA</div>
                    <div className="ua-preview-val ua-preview-val--amber">{qaHeadName}</div>
                  </div>

                  <div className="ua-preview-card ua-preview-card--blue">
                    <div className="ua-preview-tag ua-preview-tag--blue">Chapter Member</div>
                    <div className="ua-preview-val ua-preview-val--blue">
                      {formSelectedChapter ? formSelectedChapter.name : 'Sin asignar'}
                    </div>
                  </div>

                  <div className="ua-preview-card ua-preview-card--green">
                    <div className="ua-preview-tag ua-preview-tag--green">Squad</div>
                    <div className="ua-preview-val ua-preview-val--green">
                      {formSelectedSquad ? formSelectedSquad.name : 'Sin Squad'}
                    </div>
                  </div>
                </div>

                {/* Selectores en Cascada */}
                <div className="ua-form-grid-cascade">
                  <div>
                    <label className="ua-label">1. Chapter Member *</label>
                    <select
                      className="ua-input input-focus"
                      value={form.chapterMemberId}
                      onChange={(e) => handleChapterChangeInForm(e.target.value)}
                      required
                    >
                      <option value="">-- Seleccionar --</option>
                      {chapterMembers.map((cm) => (
                        <option key={cm.id} value={cm.id}>
                          {cm.name} ({cm.squads?.length || 0} squads)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="ua-label">2. Squad asignado *</label>
                    <select
                      className="ua-input input-focus"
                      value={form.squadId}
                      onChange={(e) => setForm({ ...form, squadId: e.target.value })}
                      disabled={!form.chapterMemberId}
                      required
                    >
                      <option value="">
                        {!form.chapterMemberId
                          ? '-- Elige Chapter --'
                          : formAvailableSquads.length === 0
                          ? '-- Sin Squads aún --'
                          : '-- Seleccionar --'}
                      </option>
                      {formAvailableSquads.map((sq) => (
                        <option key={sq.id} value={sq.id}>
                          {sq.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ua-label">3. Rol del usuario *</label>
                  <select
                    className="ua-input input-focus"
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatRoleLabel(r.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ua-modal-footer">
                <button
                  type="button"
                  className="ua-btn-cancel"
                  onClick={() => setFormModal({ open: false, mode: 'create', userId: null })}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ua-btn-submit ua-btn-submit--dark"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Guardando...'
                    : formModal.mode === 'create'
                    ? 'Crear usuario'
                    : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 2: Registrar Nuevo Rol
          ========================================================================== */}
      {roleModal.open && (
        <div
          className="ua-modal-overlay"
          onClick={() => setRoleModal({ open: false, name: '', loading: false })}
        >
          <div className="ua-modal-card ua-modal-card--role" onClick={(e) => e.stopPropagation()}>
            {/* Cabecera Oscura */}
            <div className="ua-modal-dark-header">
              <div className="ua-modal-hero">
                <div className="ua-modal-avatar ua-modal-avatar--automator">⚡</div>

                <div>
                  <div className="ua-modal-title-row">
                    <h3 className="ua-modal-title">Registrar nuevo Rol</h3>
                    <span className="ua-modal-pill ua-modal-pill--purple">● Catálogo QA</span>
                  </div>
                  <div className="ua-modal-subtitle">
                    Define un perfil operativo para los ejecutadores
                  </div>
                  <div className="ua-modal-badge-wrap">
                    <span className="ua-modal-hero-badge ua-modal-hero-badge--automator">
                      ⚡{' '}
                      {roleModal.name.trim()
                        ? formatRoleLabel(roleModal.name.trim())
                        : 'Vista previa del rol'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="ua-modal-close-btn"
                onClick={() => setRoleModal({ open: false, name: '', loading: false })}
              >
                ✕
              </button>
            </div>

            {/* Cuerpo */}
            <form className="ua-modal-body" onSubmit={handleCreateRole}>
              <div className="ua-org-box ua-org-box--sm">
                <label className="ua-label">Nombre del Rol *</label>
                <input
                  className="ua-input input-focus"
                  placeholder="Ej. QA Automatizador, QA Performance..."
                  value={roleModal.name}
                  onChange={(e) => setRoleModal({ ...roleModal, name: e.target.value })}
                  required
                />
                {roles.length > 0 && (
                  <div className="ua-existing-roles">
                    <div className="ua-existing-roles-label">
                      Roles activos en sistema ({roles.length}):
                    </div>
                    <div className="ua-existing-roles-list">
                      {roles.map((r) => (
                        <span key={r.id} className="ua-existing-role-chip">
                          {formatRoleLabel(r.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="ua-modal-footer">
                <button
                  type="button"
                  className="ua-btn-cancel"
                  onClick={() => setRoleModal({ open: false, name: '', loading: false })}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ua-btn-submit ua-btn-submit--purple"
                  disabled={roleModal.loading}
                >
                  {roleModal.loading ? 'Guardando...' : 'Guardar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 3: Registrar Chapter Member
          ========================================================================== */}
      {chapterModal.open && (
        <div
          className="ua-modal-overlay"
          onClick={() => setChapterModal({ open: false, name: '', email: '', loading: false })}
        >
          <div className="ua-modal-card ua-modal-card--chapter" onClick={(e) => e.stopPropagation()}>
            {/* Cabecera Oscura */}
            <div className="ua-modal-dark-header">
              <div className="ua-modal-hero">
                <div className="ua-modal-avatar ua-modal-avatar--chapter">
                  {getInitials(chapterModal.name, 'CM')}
                </div>

                <div>
                  <div className="ua-modal-title-row">
                    <h3 className="ua-modal-title">
                      {chapterModal.name.trim() || 'Registrar Chapter Member'}
                    </h3>
                    <span className="ua-modal-pill ua-modal-pill--blue">● Coordinación</span>
                  </div>
                  <div className="ua-modal-subtitle">
                    {chapterModal.email.trim() || 'Coordinador técnico de Squads QA'}
                  </div>
                  <div className="ua-modal-badge-wrap">
                    <span className="ua-modal-hero-badge ua-modal-hero-badge--amber">
                      Reporta a {qaHeadName} (Jefe de QA)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="ua-modal-close-btn"
                onClick={() => setChapterModal({ open: false, name: '', email: '', loading: false })}
              >
                ✕
              </button>
            </div>

            {/* Cuerpo */}
            <form className="ua-modal-body" onSubmit={handleCreateChapterMember}>
              <div className="ua-preview-grid-2">
                <div className="ua-preview-card ua-preview-card--amber">
                  <div className="ua-preview-tag ua-preview-tag--amber">Jefe de QA</div>
                  <div className="ua-preview-val ua-preview-val--lg ua-preview-val--amber">
                    {qaHeadName}
                  </div>
                </div>

                <div className="ua-preview-card ua-preview-card--blue">
                  <div className="ua-preview-tag ua-preview-tag--blue">Nuevo Chapter Member</div>
                  <div className="ua-preview-val ua-preview-val--lg ua-preview-val--blue">
                    {chapterModal.name.trim() || 'Por definir'}
                  </div>
                </div>
              </div>

              <div className="ua-field">
                <label className="ua-label">Nombre del Chapter Member *</label>
                <input
                  className="ua-input input-focus"
                  placeholder="Chapter Member"
                  value={chapterModal.name}
                  onChange={(e) => setChapterModal({ ...chapterModal, name: e.target.value })}
                  required
                />
              </div>

              <div className="ua-field--lg">
                <label className="ua-label">Correo (opcional)</label>
                <input
                  className="ua-input input-focus"
                  type="email"
                  placeholder="correo.correo@ficohsa.com"
                  value={chapterModal.email}
                  onChange={(e) => setChapterModal({ ...chapterModal, email: e.target.value })}
                />
              </div>

              <div className="ua-modal-footer">
                <button
                  type="button"
                  className="ua-btn-cancel"
                  onClick={() => setChapterModal({ open: false, name: '', email: '', loading: false })}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ua-btn-submit ua-btn-submit--blue"
                  disabled={chapterModal.loading}
                >
                  {chapterModal.loading ? 'Guardando...' : 'Guardar Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 4: Crear Nuevo Squad
          ========================================================================== */}
      {squadModal.open && (
        <div
          className="ua-modal-overlay"
          onClick={() =>
            setSquadModal({ open: false, name: '', description: '', chapterMemberId: '', loading: false })
          }
        >
          <div className="ua-modal-card ua-modal-card--squad" onClick={(e) => e.stopPropagation()}>
            {/* Cabecera Oscura */}
            <div className="ua-modal-dark-header">
              <div className="ua-modal-hero">
                <div className="ua-modal-avatar ua-modal-avatar--squad">
                  {getInitials(squadModal.name, 'SQ')}
                </div>

                <div>
                  <div className="ua-modal-title-row">
                    <h3 className="ua-modal-title">
                      {squadModal.name.trim() || 'Crear nuevo Squad'}
                    </h3>
                    <span className="ua-modal-pill ua-modal-pill--green">● Célula QA</span>
                  </div>
                  <div className="ua-modal-subtitle">
                    {squadModal.description.trim() || 'Célula de negocio o plataforma asignada'}
                  </div>
                  <div className="ua-modal-badge-wrap">
                    <span className="ua-modal-hero-badge ua-modal-hero-badge--blue">
                      Chapter: {squadModalSelectedChapter?.name || 'Sin asignar'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="ua-modal-close-btn"
                onClick={() =>
                  setSquadModal({ open: false, name: '', description: '', chapterMemberId: '', loading: false })
                }
              >
                ✕
              </button>
            </div>

            {/* Cuerpo */}
            <form className="ua-modal-body" onSubmit={handleCreateSquad}>
              <div className="ua-preview-grid-3 ua-preview-grid-3--sm">
                <div className="ua-preview-card ua-preview-card--sm ua-preview-card--amber">
                  <div className="ua-preview-tag ua-preview-tag--xs ua-preview-tag--amber">
                    Jefe de QA
                  </div>
                  <div className="ua-preview-val ua-preview-val--xs ua-preview-val--amber">
                    {qaHeadName}
                  </div>
                </div>

                <div className="ua-preview-card ua-preview-card--sm ua-preview-card--blue">
                  <div className="ua-preview-tag ua-preview-tag--xs ua-preview-tag--blue">
                    Chapter
                  </div>
                  <div className="ua-preview-val ua-preview-val--xs ua-preview-val--blue">
                    {squadModalSelectedChapter?.name || '—'}
                  </div>
                </div>

                <div className="ua-preview-card ua-preview-card--sm ua-preview-card--green">
                  <div className="ua-preview-tag ua-preview-tag--xs ua-preview-tag--green">
                    Nuevo Squad
                  </div>
                  <div className="ua-preview-val ua-preview-val--xs ua-preview-val--green">
                    {squadModal.name.trim() || 'Por definir'}
                  </div>
                </div>
              </div>

              <div className="ua-field">
                <label className="ua-label">Chapter Member responsable *</label>
                <select
                  className="ua-input input-focus"
                  value={squadModal.chapterMemberId}
                  onChange={(e) => setSquadModal({ ...squadModal, chapterMemberId: e.target.value })}
                  required
                >
                  <option value="">-- Selecciona un Chapter Member --</option>
                  {chapterMembers.map((cm) => (
                    <option key={cm.id} value={cm.id}>
                      {cm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ua-field">
                <label className="ua-label">Nombre del Squad *</label>
                <input
                  className="ua-input input-focus"
                  placeholder="Squad"
                  value={squadModal.name}
                  onChange={(e) => setSquadModal({ ...squadModal, name: e.target.value })}
                  required
                />
              </div>

              <div className="ua-field--lg">
                <label className="ua-label">Descripción (opcional)</label>
                <input
                  className="ua-input input-focus"
                  placeholder="Célula de negocio o plataforma"
                  value={squadModal.description}
                  onChange={(e) => setSquadModal({ ...squadModal, description: e.target.value })}
                />
              </div>

              <div className="ua-modal-footer">
                <button
                  type="button"
                  className="ua-btn-cancel"
                  onClick={() =>
                    setSquadModal({ open: false, name: '', description: '', chapterMemberId: '', loading: false })
                  }
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ua-btn-submit ua-btn-submit--dark"
                  disabled={squadModal.loading}
                >
                  {squadModal.loading ? 'Creando...' : 'Guardar Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 5: Gestionar / Restablecer Contraseña
          ========================================================================== */}
      {resetModal.open && resetModal.user && (
        <div
          className="ua-modal-overlay"
          onClick={() =>
            !resetModal.loading &&
            setResetModal({
              open: false,
              user: null,
              mode: "MANUAL",
              newPassword: "",
              showPassword: false,
              mustChangePassword: false,
              loading: false,
              tempPasswordFallback: "",
            })
          }
        >
          <div
            className="ua-modal-card ua-modal-card--compact"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ua-compact-title">🔑 Gestionar contraseña</h3>
            <p className="ua-compact-text">
              Usuario: <strong className="ua-text-dark">{resetModal.user.name}</strong> (
              <strong className="ua-text-blue">{resetModal.user.email}</strong>)
            </p>

            {/* Selector de modo */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <button
                type="button"
                className={
                  resetModal.mode === "MANUAL"
                    ? "ua-btn-submit ua-btn-submit--violet-sm"
                    : "ua-btn-cancel ua-btn-cancel--compact"
                }
                style={{ flex: 1 }}
                disabled={resetModal.loading}
                onClick={() =>
                  setResetModal((prev) => ({
                    ...prev,
                    mode: "MANUAL",
                    tempPasswordFallback: "",
                  }))
                }
              >
                Asignar manual
              </button>

              <button
                type="button"
                className={
                  resetModal.mode === "EMAIL"
                    ? "ua-btn-submit ua-btn-submit--violet-sm"
                    : "ua-btn-cancel ua-btn-cancel--compact"
                }
                style={{ flex: 1 }}
                disabled={resetModal.loading}
                onClick={() =>
                  setResetModal((prev) => ({
                    ...prev,
                    mode: "EMAIL",
                    tempPasswordFallback: "",
                  }))
                }
              >
                Enviar por correo
              </button>
            </div>

            {resetModal.mode === "MANUAL" ? (
              <form onSubmit={handleConfirmResetPassword}>
                <div className="ua-field">
                  <label className="ua-label">Nueva contraseña *</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type={resetModal.showPassword ? "text" : "password"}
                      className="ua-input input-focus"
                      placeholder="Mínimo 6 caracteres"
                      value={resetModal.newPassword}
                      onChange={(e) =>
                        setResetModal((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      required
                    />
                    <button
                      type="button"
                      className="ua-btn-cancel ua-btn-cancel--compact"
                      onClick={() =>
                        setResetModal((prev) => ({
                          ...prev,
                          showPassword: !prev.showPassword,
                        }))
                      }
                      title="Mostrar u ocultar contraseña"
                    >
                      {resetModal.showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button
                      type="button"
                      className="ua-btn-cancel ua-btn-cancel--compact"
                      onClick={generateQuickPassword}
                      title="Generar contraseña segura"
                    >
                      <FaRandom />
                    </button>
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.85rem",
                    marginBottom: "16px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={resetModal.mustChangePassword}
                    onChange={(e) =>
                      setResetModal((prev) => ({
                        ...prev,
                        mustChangePassword: e.target.checked,
                      }))
                    }
                  />
                  Exigir cambio de contraseña al iniciar sesión
                </label>

                <div className="ua-modal-footer">
                  <button
                    type="button"
                    className="ua-btn-cancel ua-btn-cancel--compact"
                    disabled={resetModal.loading}
                    onClick={() =>
                      setResetModal({
                        open: false,
                        user: null,
                        mode: "MANUAL",
                        newPassword: "",
                        showPassword: false,
                        mustChangePassword: false,
                        loading: false,
                        tempPasswordFallback: "",
                      })
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="ua-btn-submit ua-btn-submit--violet-sm"
                    disabled={resetModal.loading}
                  >
                    {resetModal.loading ? "Guardando..." : "Guardar contraseña"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="ua-compact-text">
                  Se generará una nueva contraseña temporal aleatoria y se enviará al correo{' '}
                  <strong className="ua-text-blue">{resetModal.user.email}</strong>.
                </p>

                {resetModal.tempPasswordFallback && (
                  <div className="ua-temp-pass-box">
                    <div className="ua-temp-pass-label">
                      Contraseña temporal generada (SMTP no configurado):
                    </div>
                    <div className="ua-temp-pass-code">
                      {resetModal.tempPasswordFallback}
                    </div>
                  </div>
                )}

                <div className="ua-modal-footer">
                  <button
                    type="button"
                    className="ua-btn-cancel ua-btn-cancel--compact"
                    disabled={resetModal.loading}
                    onClick={() =>
                      setResetModal({
                        open: false,
                        user: null,
                        mode: "MANUAL",
                        newPassword: "",
                        showPassword: false,
                        mustChangePassword: false,
                        loading: false,
                        tempPasswordFallback: "",
                      })
                    }
                  >
                    {resetModal.tempPasswordFallback ? "Cerrar" : "Cancelar"}
                  </button>

                  {!resetModal.tempPasswordFallback && (
                    <button
                      type="button"
                      className="ua-btn-submit ua-btn-submit--violet-sm"
                      disabled={resetModal.loading}
                      onClick={handleConfirmResetPassword}
                    >
                      {resetModal.loading
                        ? "Generando y enviando..."
                        : "Aplicar y enviar correo"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 6: Confirmar Eliminación
          ========================================================================== */}
      {deleteModal.open && deleteModal.user && (
        <div
          className="ua-modal-overlay"
          onClick={() =>
            !deleteModal.loading && setDeleteModal({ open: false, user: null, loading: false })
          }
        >
          <div
            className="ua-modal-card ua-modal-card--compact ua-modal-card--delete"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ua-compact-title">Eliminar usuario</h3>
            <p className="ua-compact-text ua-compact-text--delete">
              ¿Estás seguro de eliminar permanentemente la cuenta de{' '}
              <strong className="ua-text-dark">{deleteModal.user.name}</strong> ({deleteModal.user.email})?
            </p>

            <div className="ua-modal-footer">
              <button
                type="button"
                className="ua-btn-cancel ua-btn-cancel--compact"
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal({ open: false, user: null, loading: false })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ua-btn-submit ua-btn-submit--danger-sm"
                disabled={deleteModal.loading}
                onClick={handleConfirmDelete}
              >
                {deleteModal.loading ? 'Eliminando...' : 'Eliminar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}