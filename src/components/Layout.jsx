// import { useEffect, useRef, useState } from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { formatRoleLabel } from "./ExecutorProfileModal";
// import ThemeToggle from "./ThemeToggle";
// import { VscRunCompact, VscGitPullRequestCreate } from "react-icons/vsc";
// import { TbListDetailsFilled, TbLogout } from "react-icons/tb";
// import { GrCatalog } from "react-icons/gr";
// import { BiSolidUserCircle, BiUserPin } from "react-icons/bi";
// import { IoTicket, IoNotificationsOutline } from "react-icons/io5";

// import "../styles/Layout.css";

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// function getInitials(name = "") {
//   const parts = String(name).trim().split(/\s+/).filter(Boolean);
//   if (parts.length === 0) return "QA";
//   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
//   return (parts[0][0] + parts[1][0]).toUpperCase();
// }

// export default function Layout({ children }) {
//   const { auth, logout } = useAuth();
//   const navigate = useNavigate();

//   const [currentUser, setCurrentUser] = useState(() => {
//     const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
//     return saved?.user || auth?.user || null;
//   });

//   const [pendingTickets, setPendingTickets] = useState(0);
//   const [ticketToast, setTicketToast] = useState(null);
//   const lastSeenTicketId = useRef(null);

//   const rawRole =
//     typeof currentUser?.role === "object"
//       ? currentUser?.role?.name
//       : currentUser?.role || "";

//   const isAdmin = rawRole.toUpperCase() === "ADMIN";
//   const formattedRole = formatRoleLabel(rawRole || "QA_FUNCIONAL");
//   const initials = getInitials(currentUser?.name);

//   const can = (permission) => {
//     if (isAdmin) return true;
//     const perms = currentUser?.permissions || [];
//     return perms.includes("*") || perms.includes(permission);
//   };

//   const canAny = (...perms) => isAdmin || perms.some((p) => can(p));

//   // 1. Sincronizar permisos y datos del usuario al montar, enfocar o actualizar perfil
//   useEffect(() => {
//     const syncUserAccess = async () => {
//       const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
//       const token = saved?.token || auth?.token;
//       if (!token) return;

//       try {
//         const res = await fetch(`${API_BASE}/auth/me`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!res.ok) return;
//         const data = await res.json();
//         if (data.user) {
//           const updated = { ...(saved || auth), token, user: data.user };
//           localStorage.setItem("qa-hub-auth", JSON.stringify(updated));
//           setCurrentUser(data.user);
//           window.dispatchEvent(new Event("qa-auth-updated"));
//         }
//       } catch {
//         // Silencioso
//       }
//     };

//     const handleLocalUpdate = () => {
//       const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
//       if (saved?.user) setCurrentUser(saved.user);
//     };

//     syncUserAccess();
//     window.addEventListener("focus", syncUserAccess);
//     window.addEventListener("qa-auth-updated", handleLocalUpdate);

//     return () => {
//       window.removeEventListener("focus", syncUserAccess);
//       window.removeEventListener("qa-auth-updated", handleLocalUpdate);
//     };
//   }, [auth]);

//   // 2. Monitoreo de tickets pendientes para ADMIN
//   useEffect(() => {
//     const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
//     const token = saved?.token || auth?.token;
//     if (!isAdmin || !token) return;

//     const checkPendingTickets = async () => {
//       try {
//         const res = await fetch(`${API_BASE}/tickets/pending-count`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!res.ok) return;
//         const data = await res.json();
//         setPendingTickets(data.pendingCount || 0);

//         if (data.latestTicket) {
//           if (
//             lastSeenTicketId.current !== null &&
//             data.latestTicket.id > lastSeenTicketId.current
//           ) {
//             setTicketToast(data.latestTicket);
//           }
//           lastSeenTicketId.current = data.latestTicket.id;
//         } else if (lastSeenTicketId.current === null) {
//           lastSeenTicketId.current = 0;
//         }
//       } catch {
//         // Silencioso
//       }
//     };

//     checkPendingTickets();
//     const interval = setInterval(checkPendingTickets, 10000);
//     return () => clearInterval(interval);
//   }, [isAdmin, auth?.token]);

//   return (
//     <div className="app-shell">
//       {/* ====================================================================
//           BARRA LATERAL IZQUIERDA
//           ==================================================================== */}
//       <aside className="sidebar">
//         <img
//           src="/logoFicohsa-blanco.png"
//           alt="Ficohsa"
//           className="sidebar-logo"
//         />
//         <div className="brand">
//           <span className="brand-mark">▍</span>Portal QA Automation
//         </div>

//         <nav className="nav-links">
//           {can("PRUEBAS_EJECUTAR") && (
//             <NavLink
//               to="/"
//               end
//               className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
//             >
//               <VscRunCompact className="icon" /> Ejecutar pruebas
//             </NavLink>
//           )}

//           {canAny("HISTORIAL_VER_PROPIO", "HISTORIAL_VER_SQUAD", "HISTORIAL_VER_TODO") && (
//             <NavLink
//               to="/executions"
//               className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
//             >
//               <TbListDetailsFilled className="icon" /> Historial de ejecuciones
//             </NavLink>
//           )}

//           {can("MATRIZ_VER") && (
//             <NavLink
//               to="/matrix"
//               className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
//             >
//               <VscGitPullRequestCreate className="icon" /> Generador de Matriz
//             </NavLink>
//           )}

//           <NavLink
//             to="/tickets"
//             className={({ isActive }) =>
//               `nav-link nav-link--tickets${isActive ? " active" : ""}`
//             }
//           >
//             <IoTicket className="icon" /> Gestión de tickets
//             {isAdmin && pendingTickets > 0 && (
//               <span className="nav-ticket-badge">{pendingTickets}</span>
//             )}
//           </NavLink>

//           {can("CATALOGO_GESTIONAR") && (
//             <NavLink
//               to="/scenarios"
//               className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
//             >
//               <GrCatalog className="icon" /> Catálogo de escenarios
//             </NavLink>
//           )}

//           {can("USUARIOS_GESTIONAR") && (
//             <NavLink
//               to="/users"
//               className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
//             >
//               <BiSolidUserCircle className="icon" /> Usuarios
//             </NavLink>
//           )}
//         </nav>

//         {/* Bloque inferior centrado (estilo tarjeta de perfil) */}
//         <div className="sidebar-footer sidebar-footer--centered">
//           <div
//             className="sidebar-profile-card"
//             onClick={() => navigate("/profile")}
//             title="Ver y editar mi perfil"
//           >
//             <div className="sidebar-profile-avatar">{initials}</div>
//             <div className="sidebar-user-name">{currentUser?.name}</div>
//             <div className="sidebar-user-role-sub">{formattedRole}</div>
//           </div>

//           <div className="sidebar-theme-row">
//             <ThemeToggle />
//           </div>

//           <div className="sidebar-logout-row">
//             <button
//               type="button"
//               className="btn btn-ghost sidebar-logout-btn"
//               onClick={logout}
//             >
//               <TbLogout className="icon" /> Cerrar sesión
//             </button>
//           </div>
//         </div>
//       </aside>

//       {/* ====================================================================
//           ÁREA PRINCIPAL + BARRA SUPERIOR DERECHA DE PERFIL
//           ==================================================================== */}
//       <main className="main">
//         <header className="topbar-header">
//           <div className="topbar-right-group">
//             {/* Botón acceso rápido a Tickets / Notificaciones */}
//             <button
//               type="button"
//               className="topbar-icon-btn"
//               onClick={() => navigate("/tickets")}
//               title={
//                 isAdmin && pendingTickets > 0
//                   ? `${pendingTickets} solicitudes pendientes`
//                   : "Gestión de tickets"
//               }
//             >
//               <IoNotificationsOutline size={19} />
//               {isAdmin && pendingTickets > 0 && (
//                 <span className="topbar-icon-dot">{pendingTickets}</span>
//               )}
//             </button>

//             {/* Perfil superior derecho */}
//             <button
//               type="button"
//               className="topbar-profile-pill"
//               onClick={() => navigate("/profile")}
//               title="Abrir Mi Perfil"
//             >
//               <div className="topbar-avatar">{initials}</div>
//               <div className="topbar-user-info">
//                 <span className="topbar-user-name">
//                   {currentUser?.name}
//                 </span>
//                 <span className="topbar-user-role">{formattedRole}</span>
//               </div>
//             </button>
//           </div>
//         </header>

//         <div className="main-page-content">{children}</div>
//       </main>

//       {/* Notificación flotante cuando llega un ticket nuevo al Admin */}
//       {isAdmin && ticketToast && (
//         <div className="admin-ticket-toast">
//           <div className="admin-ticket-toast-header">
//             <span>🔔 Nueva solicitud #{ticketToast.id}</span>
//             <button
//               type="button"
//               onClick={() => setTicketToast(null)}
//               style={{
//                 background: "transparent",
//                 border: "none",
//                 color: "inherit",
//                 cursor: "pointer",
//                 fontWeight: 700,
//               }}
//             >
//               ✕
//             </button>
//           </div>
//           <div className="admin-ticket-toast-body">
//             <strong>{ticketToast.requester?.name}</strong> solicitó{" "}
//             {ticketToast.permission?.action || ticketToast.project?.name}.
//           </div>
//           <div className="admin-ticket-toast-actions">
//             <button
//               type="button"
//               className="admin-ticket-toast-btn"
//               onClick={() => {
//                 setTicketToast(null);
//                 navigate("/tickets");
//               }}
//             >
//               Revisar ahora
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatRoleLabel } from "./ExecutorProfileModal";
import ThemeToggle from "./ThemeToggle";
import { VscRunCompact, VscGitPullRequestCreate } from "react-icons/vsc";
import { TbListDetailsFilled, TbLogout } from "react-icons/tb";
import { GrCatalog } from "react-icons/gr";
import { BiSolidUserCircle } from "react-icons/bi";
import { IoTicket, IoNotificationsOutline, IoSearchOutline } from "react-icons/io5";
import { MdSpaceDashboard } from "react-icons/md";

import "../styles/Layout.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "QA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Layout({ children }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
    return saved?.user || auth?.user || null;
  });

  const [pendingTickets, setPendingTickets] = useState(0);
  const [ticketToast, setTicketToast] = useState(null);
  const lastSeenTicketId = useRef(null);

  // Buscador global superior
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  const rawRole =
    typeof currentUser?.role === "object"
      ? currentUser?.role?.name
      : currentUser?.role || "";

  const isAdmin = rawRole.toUpperCase() === "ADMIN";
  const formattedRole = formatRoleLabel(rawRole || "QA_FUNCIONAL");
  const initials = getInitials(currentUser?.name);

  // 1. Declarar permisos ANTES de usarlos
  const can = (permission) => {
    if (isAdmin) return true;
    const perms = currentUser?.permissions || [];
    return perms.includes("*") || perms.includes(permission);
  };

  const canAny = (...perms) => isAdmin || perms.some((p) => can(p));

  // 2. Rutas rápidas para el buscador global
  const quickRoutes = [
    {
      label: "Dashboard General",
      sub: "Métricas de ejecución y efectividad QA",
      path: "/",
      show: true,
    },
    {
      label: "Ejecutar Pruebas",
      sub: "Lanzar flujos en POS (ADB / Wi-Fi / Serial)",
      path: "/executescenario",
      show: can("PRUEBAS_EJECUTAR"),
    },
    {
      label: "Historial de Ejecuciones",
      sub: "Bitácora, logs y evidencias .xlsx",
      path: "/executions",
      show: canAny("HISTORIAL_VER_PROPIO", "HISTORIAL_VER_SQUAD", "HISTORIAL_VER_TODO"),
    },
    {
      label: "Generador de Matriz",
      sub: "Importar historias Azure DevOps y pasos FBQA",
      path: "/matrix",
      show: can("MATRIZ_VER"),
    },
    {
      label: "Gestión de Tickets",
      sub: "Solicitudes de permisos y acceso a proyectos",
      path: "/tickets",
      show: true,
    },
    {
      label: "Catálogo de Escenarios",
      sub: "Proyectos, módulos y submódulos",
      path: "/scenarios",
      show: can("CATALOGO_GESTIONAR"),
    },
    {
      label: "Usuarios y Squads",
      sub: "Administración de ejecutadores QA",
      path: "/users",
      show: can("USUARIOS_GESTIONAR"),
    },
    {
      label: "Mi Perfil",
      sub: "Editar datos personales y contraseña",
      path: "/profile",
      show: true,
    },
  ].filter((r) => r.show);

  const filteredQuickRoutes = quickRoutes.filter(
    (r) =>
      r.label.toLowerCase().includes(globalQuery.toLowerCase()) ||
      r.sub.toLowerCase().includes(globalQuery.toLowerCase())
  );

  // Atajo Ctrl + K y cierre al hacer clic fuera
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    const onClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  // Sincronizar permisos y datos del usuario al montar, enfocar o actualizar perfil
  useEffect(() => {
    const syncUserAccess = async () => {
      const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
      const token = saved?.token || auth?.token;
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.user) {
          const updated = { ...(saved || auth), token, user: data.user };
          localStorage.setItem("qa-hub-auth", JSON.stringify(updated));
          setCurrentUser(data.user);
          window.dispatchEvent(new Event("qa-auth-updated"));
        }
      } catch {
        // Silencioso
      }
    };

    const handleLocalUpdate = () => {
      const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
      if (saved?.user) setCurrentUser(saved.user);
    };

    syncUserAccess();
    window.addEventListener("focus", syncUserAccess);
    window.addEventListener("qa-auth-updated", handleLocalUpdate);

    return () => {
      window.removeEventListener("focus", syncUserAccess);
      window.removeEventListener("qa-auth-updated", handleLocalUpdate);
    };
  }, [auth]);

  // Monitoreo de tickets pendientes para ADMIN
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
    const token = saved?.token || auth?.token;
    if (!isAdmin || !token) return;

    const checkPendingTickets = async () => {
      try {
        const res = await fetch(`${API_BASE}/tickets/pending-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setPendingTickets(data.pendingCount || 0);

        if (data.latestTicket) {
          if (
            lastSeenTicketId.current !== null &&
            data.latestTicket.id > lastSeenTicketId.current
          ) {
            setTicketToast(data.latestTicket);
          }
          lastSeenTicketId.current = data.latestTicket.id;
        } else if (lastSeenTicketId.current === null) {
          lastSeenTicketId.current = 0;
        }
      } catch {
        // Silencioso
      }
    };

    checkPendingTickets();
    const interval = setInterval(checkPendingTickets, 10000);
    return () => clearInterval(interval);
  }, [isAdmin, auth?.token]);

  return (
    <div className="app-shell">
      {/* ====================================================================
          BARRA LATERAL IZQUIERDA
          ==================================================================== */}
      <aside className="sidebar">
        <img
          src="/logoFicohsa-blanco.png"
          alt="Ficohsa"
          className="sidebar-logo"
        />
        <div className="brand">
          <span className="brand-mark">▍</span>Portal QA Automation
        </div>

        <nav className="nav-links">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <MdSpaceDashboard className="icon" /> Dashboard
          </NavLink>

          {can("PRUEBAS_EJECUTAR") && (
            <NavLink
              to="/executescenario"
              end
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <VscRunCompact className="icon" /> Ejecutar pruebas
            </NavLink>
          )}

          {canAny("HISTORIAL_VER_PROPIO", "HISTORIAL_VER_SQUAD", "HISTORIAL_VER_TODO") && (
            <NavLink
              to="/executions"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <TbListDetailsFilled className="icon" /> Historial de ejecuciones
            </NavLink>
          )}

          {can("MATRIZ_VER") && (
            <NavLink
              to="/matrix"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <VscGitPullRequestCreate className="icon" /> Generador de Matriz
            </NavLink>
          )}

          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `nav-link nav-link--tickets${isActive ? " active" : ""}`
            }
          >
            <IoTicket className="icon" /> Gestión de tickets
            {isAdmin && pendingTickets > 0 && (
              <span className="nav-ticket-badge">{pendingTickets}</span>
            )}
          </NavLink>

          {can("CATALOGO_GESTIONAR") && (
            <NavLink
              to="/scenarios"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <GrCatalog className="icon" /> Catálogo de escenarios
            </NavLink>
          )}

          {can("USUARIOS_GESTIONAR") && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <BiSolidUserCircle className="icon" /> Usuarios
            </NavLink>
          )}
        </nav>

        {/* Bloque inferior centrado */}
        <div className="sidebar-footer sidebar-footer--centered">
          <div
            className="sidebar-profile-card"
            onClick={() => navigate("/profile")}
            title="Ver y editar mi perfil"
          >
            <div className="sidebar-profile-avatar">{initials}</div>
            <div className="sidebar-user-name">{currentUser?.name}</div>
            <div className="sidebar-user-role-sub">{formattedRole}</div>
          </div>

          <div className="sidebar-theme-row">
            <ThemeToggle />
          </div>

          <div className="sidebar-logout-row">
            <button
              type="button"
              className="btn btn-ghost sidebar-logout-btn"
              onClick={logout}
            >
              <TbLogout className="icon" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          ÁREA PRINCIPAL + TOPBAR (BUSCADOR IZQUIERDA + PERFIL DERECHA)
          ==================================================================== */}
      <main className="main">
        <header className="topbar-header">
          {/* Buscador global izquierdo */}
          <div className="topbar-search-wrap" ref={searchWrapRef}>
            <IoSearchOutline className="topbar-search-icon" size={17} />
            <input
              ref={searchInputRef}
              type="text"
              className="topbar-search-input"
              placeholder="Buscar módulo, escenario o #ejecución..."
              value={globalQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setSearchOpen(true);
              }}
            />
            <kbd className="topbar-kbd">Ctrl K</kbd>

            {searchOpen && globalQuery.trim() !== "" && (
              <div className="topbar-search-dropdown">
                {filteredQuickRoutes.length > 0 ? (
                  filteredQuickRoutes.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className="topbar-search-item"
                      onClick={() => {
                        navigate(item.path);
                        setGlobalQuery("");
                        setSearchOpen(false);
                      }}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.sub}</span>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="topbar-search-item"
                    onClick={() => {
                      navigate(`/executions?q=${encodeURIComponent(globalQuery.trim())}`);
                      setGlobalQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <strong>Buscar "{globalQuery}" en Historial</strong>
                    <span>Filtrar ejecuciones y escenarios por este término</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grupo derecho: Notificaciones + Perfil */}
          <div className="topbar-right-group">
            <button
              type="button"
              className="topbar-icon-btn"
              onClick={() => navigate("/tickets")}
              title={
                isAdmin && pendingTickets > 0
                  ? `${pendingTickets} solicitudes pendientes`
                  : "Gestión de tickets"
              }
            >
              <IoNotificationsOutline size={19} />
              {isAdmin && pendingTickets > 0 && (
                <span className="topbar-icon-dot">{pendingTickets}</span>
              )}
            </button>

            <button
              type="button"
              className="topbar-profile-pill"
              onClick={() => navigate("/profile")}
              title="Abrir Mi Perfil"
            >
              <div className="topbar-avatar">{initials}</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{currentUser?.name}</span>
                <span className="topbar-user-role">{formattedRole}</span>
              </div>
            </button>
          </div>
        </header>

        <div className="main-page-content">{children}</div>
      </main>

      {/* Notificación flotante cuando llega un ticket nuevo al Admin */}
      {isAdmin && ticketToast && (
        <div className="admin-ticket-toast">
          <div className="admin-ticket-toast-header">
            <span>🔔 Nueva solicitud #{ticketToast.id}</span>
            <button
              type="button"
              onClick={() => setTicketToast(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
          <div className="admin-ticket-toast-body">
            <strong>{ticketToast.requester?.name}</strong> solicitó{" "}
            {ticketToast.permission?.action || ticketToast.project?.name}.
          </div>
          <div className="admin-ticket-toast-actions">
            <button
              type="button"
              className="admin-ticket-toast-btn"
              onClick={() => {
                setTicketToast(null);
                navigate("/tickets");
              }}
            >
              Revisar ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}