import React, { useEffect, useState, useCallback, useMemo } from "react";
import "../styles/TicketsPage.css";

const API_BASE = import.meta.env.VITE_API_URL;

export default function TicketsPage() {
  const savedAuth = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
  const rawRole =
    typeof savedAuth?.user?.role === "string"
      ? savedAuth.user.role
      : savedAuth?.user?.role?.name || "";
  const isAdminUser = rawRole.toUpperCase() === "ADMIN";

  const [permDropdownOpen, setPermDropdownOpen] = useState(false);
  const [permSearch, setPermSearch] = useState("");

  const [tickets, setTickets] = useState([]);
  const [canApprove, setCanApprove] = useState(isAdminUser);
  const [myAccess, setMyAccess] = useState({
    permissions: savedAuth?.user?.permissions || [],
    projects: savedAuth?.user?.projects || [],
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState(null);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Crear Ticket (solo usuarios no-admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [options, setOptions] = useState({ permissions: [], projects: [] });
  const [form, setForm] = useState({
    requestType: "PERMISSION",
    permissionId: "",
    projectId: "",
    justification: "",
    expiresAt: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal Ver Detalle de Ticket
  const [detailTicket, setDetailTicket] = useState(null);

  // Modal Resolver o Dar de Baja Ticket (Admin / Aprobador)
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [resolveAction, setResolveAction] = useState("APPROVED");
  const [reviewerComment, setReviewerComment] = useState("");
  const [resolveExpiresAt, setResolveExpiresAt] = useState("");

  const getAuthHeaders = () => {
    const authData = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
    const token = authData?.token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const syncMyAccess = useCallback(async () => {
    if (isAdminUser) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        const current = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
        if (current) {
          localStorage.setItem(
            "qa-hub-auth",
            JSON.stringify({ ...current, user: data.user })
          );
        }
        setMyAccess({
          permissions: data.user.permissions || [],
          projects: data.user.projects || [],
        });
      }
    } catch {
      // Silencioso
    }
  }, [isAdminUser]);

  const fetchTickets = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(`${API_BASE}/tickets`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error al cargar tickets");
        setTickets(data.tickets || []);
        setCanApprove(Boolean(data.canApprove));
        await syncMyAccess();
      } catch (err) {
        if (!silent) setAlert({ type: "error", text: err.message });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [syncMyAccess]
  );

  useEffect(() => {
    fetchTickets(false);
    const interval = setInterval(() => {
      fetchTickets(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const openCreateModal = async () => {
    setAlert(null);
    try {
      const res = await fetch(`${API_BASE}/tickets/options`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando opciones");
      setOptions({
        permissions: data.permissions || [],
        projects: data.projects || [],
      });

      const activeSet = new Set(
        (myAccess.permissions || []).map((code) => String(code).toUpperCase())
      );

      const busyPermIds = new Set(
        tickets
          .filter(
            (t) =>
              (t.status === "APPROVED" || t.status === "PENDING") &&
              t.permissionId
          )
          .map((t) => String(t.permissionId))
      );

      const firstAvailablePerm = (data.permissions || []).find(
        (p) => !busyPermIds.has(String(p.id))
      );

      setForm({
        requestType: "PERMISSION",
        permissionId: firstAvailablePerm?.id || "",
        projectId: data.projects?.[0]?.id || "",
        justification: "",
        expiresAt: "",
      });
      setPermDropdownOpen(false);
      setPermSearch("");
      setShowCreateModal(true);
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo enviar la solicitud");

      if ((form.requestType === "PERMISSION" || form.requestType === "BOTH") && !form.permissionId) {
        setSubmitting(false);
        return setAlert({ type: "error", text: "Debes seleccionar un permiso requerido." });
      }

      setShowCreateModal(false);
      setAlert({
        type: "success",
        text: "Ticket enviado correctamente. Queda pendiente de aprobación.",
      });
      fetchTickets(true);
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openResolveModal = (ticket, action) => {
    setDetailTicket(null);
    setResolvingTicket(ticket);
    setResolveAction(action);
    setReviewerComment("");
    setResolveExpiresAt(
      ticket.expiresAt ? new Date(ticket.expiresAt).toISOString().slice(0, 10) : ""
    );
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    setSubmitting(true);
    setAlert(null);

    const isRevoke = resolveAction === "REVOKED";
    const endpoint = isRevoke
      ? `${API_BASE}/tickets/${resolvingTicket.id}/revoke`
      : `${API_BASE}/tickets/${resolvingTicket.id}/resolve`;

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: resolveAction,
          reviewerComment,
          expiresAt: resolveExpiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al procesar el ticket");

      setResolvingTicket(null);
      const messages = {
        APPROVED: "Ticket aprobado y accesos asignados automáticamente al usuario.",
        REJECTED: "Ticket rechazado.",
        REVOKED: "Acceso dado de baja. El permiso/proyecto fue retirado del usuario.",
      };
      setAlert({ type: "success", text: messages[resolveAction] });
      fetchTickets(true);
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo cancelar");
      setAlert({ type: "success", text: "Solicitud cancelada." });
      fetchTickets(true);
    } catch (err) {
      setAlert({ type: "error", text: err.message });
    }
  };

  const counts = {
    ALL: tickets.length,
    PENDING: tickets.filter((t) => t.status === "PENDING").length,
    APPROVED: tickets.filter((t) => t.status === "APPROVED").length,
    REJECTED: tickets.filter((t) => t.status === "REJECTED" || t.status === "REVOKED").length,
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "REJECTED"
          ? t.status === "REJECTED" || t.status === "REVOKED"
          : t.status === statusFilter;

      if (!matchesStatus) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        t.requester?.name?.toLowerCase().includes(q) ||
        t.requester?.email?.toLowerCase().includes(q) ||
        t.permission?.action?.toLowerCase().includes(q) ||
        t.project?.name?.toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    });
  }, [tickets, statusFilter, searchTerm]);

  // Resetear a página 1 al filtrar o buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, pageSize]);

  // Cálculos de paginación
  const totalItems = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTickets = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return filteredTickets.slice(startIdx, startIdx + pageSize);
  }, [filteredTickets, safePage, pageSize]);

  // Números de página visibles con elipsis (...)
  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (safePage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  }, [safePage, totalPages]);

  const statusLabels = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    REVOKED: "Dado de baja",
  };

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="tk-container">
      <div className="tk-header">
        <div>
          <h1 className="tk-title">
            {canApprove
              ? "Bandeja de Aprobación y Gestión de Tickets"
              : "Mis Solicitudes de Acceso"}
          </h1>
          <p className="tk-subtitle">
            {canApprove
              ? "Administra, consulta el detalle, aprueba o da de baja permisos y proyectos asignados."
              : "Solicita permisos de ejecución, generación de matrices o acceso a proyectos."}
          </p>
        </div>

        <div className="tk-header-actions">
          {canApprove && (
            <span className="tk-live-pill" title="Sincronizando automáticamente cada 10s">
              <span className="tk-live-dot" />
              En vivo
            </span>
          )}

          <button
            type="button"
            className="tk-refresh-btn"
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
          >
            {refreshing ? "Actualizando..." : "🔄 Actualizar"}
          </button>

          {!isAdminUser && !canApprove && (
            <button type="button" className="tk-new-btn" onClick={openCreateModal}>
              + Solicitar Acceso
            </button>
          )}
        </div>
      </div>

      {alert && (
        <div className={`tk-alert tk-alert--${alert.type}`}>
          <span>{alert.text}</span>
          <button
            type="button"
            className="tk-alert-close"
            onClick={() => setAlert(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Resumen de permisos y proyectos activos para usuarios no-admin */}
      {!canApprove && (
        <div className="tk-access-summary">
          <div className="tk-access-group">
            <span className="tk-access-label">Mis permisos activos</span>
            <div className="tk-access-chips">
              {myAccess.permissions.length === 0 ? (
                <span className="tk-requester-meta">Sin permisos adicionales asignados</span>
              ) : (
                myAccess.permissions.map((perm) => (
                  <span key={perm} className="tk-pill tk-pill--perm">
                    🔑 {perm}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="tk-access-group">
            <span className="tk-access-label">Proyectos habilitados</span>
            <div className="tk-access-chips">
              {myAccess.projects.length === 0 ? (
                <span className="tk-requester-meta">Ningún proyecto asignado aún</span>
              ) : (
                myAccess.projects.map((proj) => (
                  <span key={proj.id} className="tk-pill tk-pill--project">
                    📁 {proj.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPIs / Filtros rápidos */}
      <div className="tk-kpi-grid">
        <div
          className={`tk-kpi-card ${statusFilter === "PENDING" ? "tk-kpi-card--active" : ""}`}
          onClick={() => setStatusFilter("PENDING")}
        >
          <div className="tk-kpi-label">Pendientes</div>
          <div className="tk-kpi-val">{counts.PENDING}</div>
          <div className="tk-kpi-tag tk-kpi-tag--amber">En espera de revisión</div>
        </div>

        <div
          className={`tk-kpi-card ${statusFilter === "APPROVED" ? "tk-kpi-card--active" : ""}`}
          onClick={() => setStatusFilter("APPROVED")}
        >
          <div className="tk-kpi-label">Aprobados</div>
          <div className="tk-kpi-val">{counts.APPROVED}</div>
          <div className="tk-kpi-tag tk-kpi-tag--green">Accesos activos</div>
        </div>

        <div
          className={`tk-kpi-card ${statusFilter === "REJECTED" ? "tk-kpi-card--active" : ""}`}
          onClick={() => setStatusFilter("REJECTED")}
        >
          <div className="tk-kpi-label">Rechazados / Baja</div>
          <div className="tk-kpi-val">{counts.REJECTED}</div>
          <div className="tk-kpi-tag tk-kpi-tag--red">No activos o revocados</div>
        </div>

        <div
          className={`tk-kpi-card ${statusFilter === "ALL" ? "tk-kpi-card--active" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="tk-kpi-label">Total Solicitudes</div>
          <div className="tk-kpi-val">{counts.ALL}</div>
          <div className="tk-kpi-tag tk-kpi-tag--blue">Ver todos</div>
        </div>
      </div>

      {canApprove && (
        <div className="tk-search-bar">
          <input
            type="text"
            className="tk-search-input"
            placeholder="Buscar por solicitante, permiso, proyecto o #ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Barra de Paginación */}
        {!loading && totalItems > 0 && (
          <div className="tk-pagination">
            <div className="tk-pagination-info">
              Mostrando <strong>{startItem}</strong>–<strong>{endItem}</strong> de{" "}
              <strong>{totalItems}</strong> solicitudes
            </div>

            <div className="tk-pagination-controls">
              <label className="tk-page-size-label">
                Filas:
                <select
                  className="tk-page-size-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <div className="tk-page-buttons">
                <button
                  type="button"
                  className="tk-page-btn"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ← Anterior
                </button>

                {visiblePages.map((page, idx) =>
                  page === "..." ? (
                    <span key={`ellipsis-${idx}`} className="tk-page-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`tk-page-btn tk-page-num ${
                        safePage === page ? "is-active" : ""
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="tk-page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Tabla de Tickets */}
      <div className="tk-table-wrap">
        <div className="tk-grid-row tk-table-head">
          <div>ID</div>
          <div>Solicitante</div>
          <div>Recurso / Permiso Solicitado</div>
          <div>Justificación</div>
          <div>Estado</div>
          <div style={{ textAlign: "right" }}>Acciones</div>
        </div>

        {loading ? (
          <div className="tk-state-box">Cargando solicitudes...</div>
        ) : paginatedTickets.length === 0 ? (
          <div className="tk-state-box">No hay tickets registrados en esta vista.</div>
        ) : (
          paginatedTickets.map((t) => (
            <div key={t.id} className="tk-grid-row tk-table-row">
              <div className="tk-id">#{t.id}</div>

              <div>
                <div className="tk-requester-name">{t.requester?.name}</div>
                <div className="tk-requester-meta">
                  {t.requester?.role?.name}
                  {t.requester?.squad?.name ? ` · ${t.requester.squad.name}` : ""}
                </div>
              </div>

              <div className="tk-resource-badges">
                {t.permission && (
                  <span className="tk-pill tk-pill--perm" title={t.permission.description}>
                    🔑 {t.permission.action}
                  </span>
                )}
                {t.project && (
                  <span className="tk-pill tk-pill--project">
                    📁 {t.project.name}
                  </span>
                )}
              </div>

              <div>
                <div className="tk-justification">{t.justification}</div>
                <div className="tk-date-meta">
                  Creado: {new Date(t.createdAt).toLocaleDateString()}
                  {t.expiresAt &&
                    ` · Expira: ${new Date(t.expiresAt).toLocaleDateString()}`}
                </div>
              </div>

              <div>
                <span className={`tk-status-badge tk-status-badge--${t.status}`}>
                  <span className="tk-status-dot" />
                  {statusLabels[t.status] || t.status}
                </span>
              </div>

              <div className="tk-actions">
                <button
                  type="button"
                  className="tk-btn-sm tk-btn-sm--detail"
                  onClick={() => setDetailTicket(t)}
                >
                  Detalle
                </button>

                {t.status === "PENDING" && canApprove && (
                  <>
                    <button
                      type="button"
                      className="tk-btn-sm tk-btn-sm--approve"
                      onClick={() => openResolveModal(t, "APPROVED")}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="tk-btn-sm tk-btn-sm--reject"
                      onClick={() => openResolveModal(t, "REJECTED")}
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {t.status === "APPROVED" && canApprove && (
                  <button
                    type="button"
                    className="tk-btn-sm tk-btn-sm--revoke"
                    onClick={() => openResolveModal(t, "REVOKED")}
                  >
                    Dar de baja
                  </button>
                )}

                {t.status === "PENDING" && !canApprove && (
                  <button
                    type="button"
                    className="tk-btn-sm tk-btn-sm--cancel"
                    onClick={() => handleCancelTicket(t.id)}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Ver Detalle Completo del Ticket */}
      {detailTicket && (
        <div className="tk-modal-overlay" onClick={() => setDetailTicket(null)}>
          <div className="tk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tk-modal-header">
              <h3 className="tk-modal-title">Detalle del Ticket #{detailTicket.id}</h3>
              <button
                type="button"
                className="tk-modal-close"
                onClick={() => setDetailTicket(null)}
              >
                ✕
              </button>
            </div>

            <div className="tk-modal-body">
              <div className="tk-detail-grid">
                <div className="tk-detail-item">
                  <span className="tk-detail-label">Solicitante</span>
                  <div className="tk-detail-value">{detailTicket.requester?.name}</div>
                  <div className="tk-requester-meta">{detailTicket.requester?.email}</div>
                </div>

                <div className="tk-detail-item">
                  <span className="tk-detail-label">Rol y Squad</span>
                  <div className="tk-detail-value">
                    {detailTicket.requester?.role?.name || "Sin rol"}
                    {detailTicket.requester?.squad?.name
                      ? ` · ${detailTicket.requester.squad.name}`
                      : ""}
                  </div>
                </div>

                <div className="tk-detail-item">
                  <span className="tk-detail-label">Estado Actual</span>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`tk-status-badge tk-status-badge--${detailTicket.status}`}>
                      <span className="tk-status-dot" />
                      {statusLabels[detailTicket.status] || detailTicket.status}
                    </span>
                  </div>
                </div>

                <div className="tk-detail-item">
                  <span className="tk-detail-label">Fecha de Solicitud</span>
                  <div className="tk-detail-value">
                    {new Date(detailTicket.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="tk-detail-item tk-detail-item--full">
                  <span className="tk-detail-label">Recurso / Permiso Solicitado</span>
                  <div className="tk-resource-badges" style={{ marginTop: "6px" }}>
                    {detailTicket.permission && (
                      <span className="tk-pill tk-pill--perm">
                        🔑 {detailTicket.permission.action} — {detailTicket.permission.description}
                      </span>
                    )}
                    {detailTicket.project && (
                      <span className="tk-pill tk-pill--project">
                        📁 Proyecto: {detailTicket.project.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="tk-detail-item tk-detail-item--full">
                  <span className="tk-detail-label">Justificación del Solicitante</span>
                  <div className="tk-detail-value">{detailTicket.justification}</div>
                </div>

                <div className="tk-detail-item">
                  <span className="tk-detail-label">Vigencia / Expiración</span>
                  <div className="tk-detail-value">
                    {detailTicket.expiresAt
                      ? new Date(detailTicket.expiresAt).toLocaleDateString()
                      : "Permanente (sin fecha límite)"}
                  </div>
                </div>

                <div className="tk-detail-item">
                  <span className="tk-detail-label">Revisado por</span>
                  <div className="tk-detail-value">
                    {detailTicket.reviewer?.name || "Pendiente de revisión"}
                  </div>
                  {detailTicket.reviewedAt && (
                    <div className="tk-requester-meta">
                      {new Date(detailTicket.reviewedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {detailTicket.reviewerComment && (
                  <div className="tk-detail-item tk-detail-item--full">
                    <span className="tk-detail-label">Comentario de Resolución / Baja</span>
                    <div className="tk-detail-value">{detailTicket.reviewerComment}</div>
                  </div>
                )}
              </div>

              <div className="tk-modal-footer">
                {detailTicket.status === "APPROVED" && canApprove && (
                  <button
                    type="button"
                    className="tk-btn-sm tk-btn-sm--revoke"
                    style={{ padding: "9px 14px", fontSize: "0.85rem" }}
                    onClick={() => openResolveModal(detailTicket, "REVOKED")}
                  >
                    Dar de baja permiso
                  </button>
                )}

                <button
                  type="button"
                  className="tk-btn-secondary"
                  onClick={() => setDetailTicket(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Solicitud (Solo Usuarios) */}
      {showCreateModal && !isAdminUser && (
        <div className="tk-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="tk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tk-modal-header">
              <h3 className="tk-modal-title">Nueva Solicitud de Acceso</h3>
              <button
                type="button"
                className="tk-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form className="tk-modal-body" onSubmit={handleCreateSubmit}>
              <label className="tk-label">Tipo de Solicitud</label>
              <div className="tk-type-pills">
                {[
                  { id: "PERMISSION", label: "Permiso Funcional" },
                  { id: "PROJECT", label: "Acceso a Proyecto" },
                  { id: "BOTH", label: "Permiso + Proyecto" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`tk-type-pill ${
                      form.requestType === opt.id ? "tk-type-pill--active" : ""
                    }`}
                    onClick={() => setForm({ ...form, requestType: opt.id })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              
              {(form.requestType === "PERMISSION" || form.requestType === "BOTH") &&
                (() => {
                  const busyPermIds = new Set(
                    tickets
                      .filter(
                        (t) =>
                          (t.status === "APPROVED" || t.status === "PENDING") &&
                          t.permissionId
                      )
                      .map((t) => String(t.permissionId))
                  );

                  const availablePermissions = options.permissions.filter(
                    (p) => !busyPermIds.has(String(p.id))
                  );

                  const formatTitle = (p) => {
                    if (p.description && p.description.trim()) {
                      const firstClause = p.description.split(",")[0].trim();
                      return firstClause.endsWith(".")
                        ? firstClause.slice(0, -1)
                        : firstClause;
                    }
                    return String(p.action || "")
                      .toLowerCase()
                      .replace(/_/g, " ")
                      .replace(/^\w/, (c) => c.toUpperCase());
                  };

                  const query = permSearch.trim().toLowerCase();
                  const searchedPermissions = availablePermissions.filter((p) => {
                    if (!query) return true;
                    return (
                      String(p.category || "").toLowerCase().includes(query) ||
                      String(p.action || "").toLowerCase().includes(query) ||
                      String(p.description || "").toLowerCase().includes(query) ||
                      formatTitle(p).toLowerCase().includes(query)
                    );
                  });

                  const groupedPermissions = searchedPermissions.reduce((acc, p) => {
                    const cat = (p.category || "GENERAL").trim().toUpperCase();
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(p);
                    return acc;
                  }, {});

                  const selectedPerm = availablePermissions.find(
                    (p) => String(p.id) === String(form.permissionId)
                  );

                  return (
                    <div className="tk-field">
                      <label className="tk-label">Permiso requerido</label>

                      {/* Trigger superior */}
                      <button
                        type="button"
                        className={`tk-perm-trigger ${permDropdownOpen ? "is-open" : ""}`}
                        onClick={() => setPermDropdownOpen((prev) => !prev)}
                      >
                        <div className="tk-perm-trigger-text">
                          <span className="tk-perm-trigger-cat">
                            {selectedPerm
                              ? (selectedPerm.category || "PERMISO").toUpperCase()
                              : "SELECCIONAR"}
                          </span>
                          <strong className="tk-perm-trigger-title">
                            {selectedPerm
                              ? formatTitle(selectedPerm)
                              : "-- Selecciona un permiso --"}
                          </strong>
                        </div>
                        <span className="tk-perm-chevron">
                          {permDropdownOpen ? "⌃" : "⌄"}
                        </span>
                      </button>

                      {/* Panel desplegable con buscador y tarjetas agrupadas */}
                      {permDropdownOpen && (
                        <div className="tk-perm-panel">
                          <div className="tk-perm-search-wrap">
                            <span className="tk-perm-search-icon">🔍</span>
                            <input
                              type="text"
                              className="tk-perm-search-input"
                              placeholder="Buscar permiso por nombre o categoría..."
                              value={permSearch}
                              onChange={(e) => setPermSearch(e.target.value)}
                              autoFocus
                            />
                          </div>

                          <div className="tk-perm-list">
                            {Object.keys(groupedPermissions).length === 0 ? (
                              <div className="tk-perm-empty">
                                No se encontraron permisos disponibles.
                              </div>
                            ) : (
                              Object.entries(groupedPermissions).map(
                                ([categoryLabel, items]) => (
                                  <div key={categoryLabel} className="tk-perm-group">
                                    <div className="tk-perm-group-title">
                                      {categoryLabel}
                                    </div>

                                    {items.map((p) => {
                                      const isSelected =
                                        String(p.id) === String(form.permissionId);
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          className={`tk-perm-option ${
                                            isSelected ? "is-selected" : ""
                                          }`}
                                          onClick={() => {
                                            setForm({ ...form, permissionId: p.id });
                                            setPermDropdownOpen(false);
                                          }}
                                        >
                                          <span className="tk-perm-option-badge" />
                                          <div className="tk-perm-option-content">
                                            <div className="tk-perm-option-title">
                                              {formatTitle(p)}
                                            </div>
                                            <div className="tk-perm-option-desc">
                                              {p.description || p.action}
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <span className="tk-perm-option-check">
                                              ✓
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {(form.requestType === "PROJECT" || form.requestType === "BOTH") && (
                <div className="tk-field">
                  <label className="tk-label">Proyecto específico</label>
                  <select
                    className="tk-control"
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    required
                  >
                    <option value="">-- Selecciona un proyecto --</option>
                    {options.projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="tk-field">
                <label className="tk-label">Fecha de vencimiento (opcional)</label>
                <input
                  type="date"
                  className="tk-control"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>

              <div className="tk-field">
                <label className="tk-label">Justificación / Historia de Usuario *</label>
                <textarea
                  rows={3}
                  className="tk-control"
                  placeholder="Ej: Requiero ejecutar pruebas del proyecto KinPOS para validar la HU-4521..."
                  value={form.justification}
                  onChange={(e) => setForm({ ...form, justification: e.target.value })}
                  required
                />
              </div>

              <div className="tk-modal-footer">
                <button
                  type="button"
                  className="tk-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="tk-btn-primary" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aprobar / Rechazar / Dar de baja Ticket */}
      {resolvingTicket && (
        <div className="tk-modal-overlay" onClick={() => setResolvingTicket(null)}>
          <div className="tk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tk-modal-header">
              <h3 className="tk-modal-title">
                {resolveAction === "APPROVED"
                  ? `Aprobar Ticket #${resolvingTicket.id}`
                  : resolveAction === "REVOKED"
                  ? `Dar de baja Ticket #${resolvingTicket.id}`
                  : `Rechazar Ticket #${resolvingTicket.id}`}
              </h3>
              <button
                type="button"
                className="tk-modal-close"
                onClick={() => setResolvingTicket(null)}
              >
                ✕
              </button>
            </div>

            <form className="tk-modal-body" onSubmit={handleResolveSubmit}>
              <p style={{ marginTop: 0, fontSize: "0.88rem" }}>
                Solicitante: <strong>{resolvingTicket.requester?.name}</strong>
              </p>

              {resolveAction === "REVOKED" && (
                <p style={{ fontSize: "0.84rem", color: "var(--danger-text-strong)" }}>
                  Esta acción retirará inmediatamente el permiso o proyecto asignado al usuario.
                </p>
              )}

              {resolveAction === "APPROVED" && resolvingTicket.permissionId && (
                <div className="tk-field">
                  <label className="tk-label">
                    Vigencia del permiso (dejar vacío para acceso permanente)
                  </label>
                  <input
                    type="date"
                    className="tk-control"
                    value={resolveExpiresAt}
                    onChange={(e) => setResolveExpiresAt(e.target.value)}
                  />
                </div>
              )}

              <div className="tk-field">
                <label className="tk-label">
                  {resolveAction === "REVOKED"
                    ? "Motivo de baja *"
                    : "Comentario de resolución"}
                </label>
                <textarea
                  rows={3}
                  className="tk-control"
                  placeholder={
                    resolveAction === "REVOKED"
                      ? "Indica el motivo por el cual se retira el acceso..."
                      : "Observaciones para el solicitante..."
                  }
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  required={resolveAction === "REVOKED"}
                />
              </div>

              <div className="tk-modal-footer">
                <button
                  type="button"
                  className="tk-btn-secondary"
                  onClick={() => setResolvingTicket(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="tk-btn-primary" disabled={submitting}>
                  {submitting
                    ? "Procesando..."
                    : resolveAction === "APPROVED"
                    ? "Confirmar Aprobación"
                    : resolveAction === "REVOKED"
                    ? "Confirmar Baja"
                    : "Confirmar Rechazo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}