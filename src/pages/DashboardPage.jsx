import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IoRefreshOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoSwapVerticalOutline,
  IoRocketOutline,
  IoLayersOutline,
  IoCheckmarkDoneCircleOutline,
  IoFlameOutline,
  IoStatsChartOutline,
  IoHourglassOutline,
  IoChevronForward,
} from "react-icons/io5";
import "../styles/DashboardPage.css";

const API_BASE = import.meta.env.VITE_API_URL;

// Extrae el arreglo real sin importar cómo lo envuelva el backend
function extractArray(payload, preferredKeys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  const firstArray = Object.values(payload).find((v) => Array.isArray(v));
  return firstArray || [];
}

export default function DashboardPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [executions, setExecutions] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros interactivos
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState("30D");
  const [hoveredIdx, setHoveredIdx] = useState(6);
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortAsc, setSortAsc] = useState(false);

  // Estado para la tarjeta derecha (Catálogo real de BD)
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedChipModule, setSelectedChipModule] = useState("ALL");

  const getToken = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");
    return saved?.token || auth?.token || "";
  }, [auth?.token]);

  const fetchJson = async (endpoint, token) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  };

  const loadDashboardData = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const [execRes, scenRes, tickRes, projRes] = await Promise.all([
        fetchJson("/executions", token).catch(() => null),
        fetchJson("/modules/scenarios", token).catch(() => null),
        fetchJson("/tickets", token).catch(() => null),
        fetchJson("/projects", token).catch(() => null),
      ]);

      setExecutions(extractArray(execRes, ["executions", "items", "data", "rows"]));
      setScenarios(extractArray(scenRes, ["scenarios", "items", "data", "rows"]));
      setTickets(extractArray(tickRes, ["tickets", "items", "data", "rows"]));
      setProjects(extractArray(projRes, ["projects", "items", "data", "rows"]));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Proyectos únicos reales (desde /projects, /scenarios y /executions)
  const projectOptions = useMemo(() => {
    const names = new Set();
    projects.forEach((p) => {
      if (p?.name) names.add(p.name);
    });
    scenarios.forEach((s) => {
      const pName =
        s.projectName ||
        s.project?.name ||
        s.submodule?.module?.project?.name ||
        s.module?.project?.name;
      if (pName) names.add(pName);
    });
    executions.forEach((e) => {
      const pName = e.projectName || e.project?.name || e.scenario?.projectName;
      if (pName) names.add(pName);
    });
    return Array.from(names);
  }, [projects, scenarios, executions]);

  // Ejecuciones filtradas por proyecto y período de días
  const filteredExecutions = useMemo(() => {
    const daysLimit = selectedPeriod === "7D" ? 7 : 30;
    const cutoff = Date.now() - daysLimit * 24 * 60 * 60 * 1000;

    return executions.filter((e) => {
      const pName =
        e.projectName || e.project?.name || e.scenario?.projectName || "";
      if (
        selectedProject !== "ALL" &&
        pName.toLowerCase() !== selectedProject.toLowerCase()
      ) {
        return false;
      }

      const dt = e.startedAt || e.createdAt || e.finishedAt;
      if (dt) {
        const ts = new Date(dt).getTime();
        if (!Number.isNaN(ts) && ts < cutoff) return false;
      }
      return true;
    });
  }, [executions, selectedProject, selectedPeriod]);

  // Métricas superiores (100% calculadas desde BD)
  const kpis = useMemo(() => {
    const total = filteredExecutions.length;
    const passed = filteredExecutions.filter((e) =>
      ["EXITO", "ÉXITO", "EXITOSO", "PASSED", "SUCCESS", "OK"].includes(
        String(e.status || e.estado || "").toUpperCase()
      )
    ).length;
    const failed = filteredExecutions.filter((e) =>
      ["FALLO", "FALLIDO", "FAILED", "ERROR"].includes(
        String(e.status || e.estado || "").toUpperCase()
      )
    ).length;

    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const uniqueDays = new Set(
      filteredExecutions
        .map((e) => (e.startedAt || e.createdAt || "").slice(0, 10))
        .filter(Boolean)
    );

    return {
      totalScenarios: scenarios.length,
      totalExecutions: total,
      passed,
      failed,
      passRate,
      streakDays: uniqueDays.size,
    };
  }, [filteredExecutions, scenarios.length]);

  // Puntos reales por fecha para la gráfica de área (sin datos ficticios)
  const trendPoints = useMemo(() => {
    const numPoints = 7;
    const daysSpan = selectedPeriod === "7D" ? 7 : 30;
    const stepDays = Math.max(1, Math.floor(daysSpan / (numPoints - 1)));
    const now = new Date();

    return Array.from({ length: numPoints }, (_, idx) => {
      const offsetDays = (numPoints - 1 - idx) * stepDays;
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - offsetDays);
      const isoDay = targetDate.toISOString().slice(0, 10);

      // Ejecuciones acumuladas o del corte correspondiente
      const slice = filteredExecutions.filter((e) => {
        const raw = e.startedAt || e.createdAt;
        if (!raw) return false;
        const dStr = new Date(raw).toISOString().slice(0, 10);
        if (idx === numPoints - 1) return dStr <= isoDay;
        const prevDate = new Date(targetDate);
        prevDate.setDate(targetDate.getDate() - stepDays);
        return dStr > prevDate.toISOString().slice(0, 10) && dStr <= isoDay;
      });

      const passedInSlice = slice.filter((e) =>
        ["EXITO", "ÉXITO", "EXITOSO", "PASSED", "SUCCESS", "OK"].includes(
          String(e.status || e.estado || "").toUpperCase()
        )
      ).length;

      const rate =
        slice.length > 0 ? Math.round((passedInSlice / slice.length) * 100) : 0;

      return {
        day: targetDate.getDate(),
        dateLabel: targetDate.toLocaleDateString("es-HN", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        rate,
        count: slice.length,
        delta: `${passedInSlice}/${slice.length} OK`,
      };
    });
  }, [filteredExecutions, selectedPeriod]);

  // Geometría SVG de la gráfica de área
  const chartGeometry = useMemo(() => {
    const w = 560;
    const h = 162;
    const padX = 28;
    const padY = 18;
    const usableW = w - padX * 2;
    const usableH = h - padY;

    const coords = trendPoints.map((pt, idx) => {
      const x = padX + (idx / (trendPoints.length - 1)) * usableW;
      const y = padY + usableH - (pt.rate / 100) * usableH;
      return { ...pt, x, y };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");

    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`;

    return { coords, linePath, areaPath };
  }, [trendPoints]);

  // Distribución semanal (Gráfica de dona con conteos reales de BD)
  const activitySplit = useMemo(() => {
    const passed = kpis.passed;
    const failed = kpis.failed;
    const pendingTickets = tickets.filter((t) =>
      ["PENDIENTE", "PENDING", "ABIERTO"].includes(
        String(t.status || "").toUpperCase()
      )
    ).length;
    const catalogCount = scenarios.length;

    const sum = passed + failed + pendingTickets + catalogCount;
    if (sum === 0) {
      return {
        totalItems: 0,
        segments: [
          { label: "Exitosas", pct: 0, count: 0, color: "#f97316" },
          { label: "Escenarios", pct: 0, count: 0, color: "#3b82f6" },
          { label: "Fallidas", pct: 0, count: 0, color: "#ec4899" },
          { label: "Tickets", pct: 0, count: 0, color: "#4f46e5" },
        ],
      };
    }

    const pPass = Math.round((passed / sum) * 100);
    const pCat = Math.round((catalogCount / sum) * 100);
    const pFail = Math.round((failed / sum) * 100);
    const pTick = Math.max(0, 100 - pPass - pCat - pFail);

    return {
      totalItems: sum,
      segments: [
        { label: "Exitosas", pct: pPass, count: passed, color: "#f97316" },
        { label: "Escenarios", pct: pCat, count: catalogCount, color: "#3b82f6" },
        { label: "Fallidas", pct: pFail, count: failed, color: "#ec4899" },
        { label: "Tickets", pct: pTick, count: pendingTickets, color: "#4f46e5" },
      ],
    };
  }, [kpis, tickets, scenarios.length]);

  // Tabla inferior: Ejecuciones recientes reales
  const tableRows = useMemo(() => {
    const dotColors = ["#ec4899", "#3b82f6", "#f97316", "#10b981"];
    let rows = filteredExecutions.map((ex, i) => {
      const rawStatus = String(ex.status || ex.estado || "PENDIENTE").toUpperCase();
      let statusLabel = "En Progreso";
      let statusKind = "progress";
      if (["EXITO", "ÉXITO", "EXITOSO", "PASSED", "SUCCESS", "OK"].includes(rawStatus)) {
        statusLabel = "Exitoso";
        statusKind = "success";
      } else if (["FALLO", "FALLIDO", "FAILED", "ERROR"].includes(rawStatus)) {
        statusLabel = "Fallido";
        statusKind = "pending";
      } else if (["PENDIENTE", "NOT_STARTED"].includes(rawStatus)) {
        statusLabel = "Pendiente";
        statusKind = "neutral";
      }

      const rawDate = ex.startedAt || ex.createdAt;
      const dateStr = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : "—";

      return {
        id: ex.id || i + 1,
        name:
          ex.scenarioName ||
          ex.scenario?.name ||
          ex.casoPrueba ||
          `Ejecución #${ex.id || i + 1}`,
        date: dateStr,
        type:
          ex.connectionMode ||
          ex.connectionType ||
          ex.executor?.name ||
          ex.user?.name ||
          "—",
        statusLabel,
        statusKind,
        priority:
          statusKind === "pending"
            ? "Alta"
            : statusKind === "progress"
            ? "Media"
            : "Normal",
        dotColor: dotColors[i % dotColors.length],
      };
    });

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.statusLabel.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.statusKind === statusFilter);
    }

    if (sortAsc) {
      rows = [...rows].reverse();
    }

    return rows.slice(0, 5);
  }, [filteredExecutions, tableSearch, statusFilter, sortAsc]);

  // Tarjeta derecha: Módulos y Escenarios reales desde la BD (cero datos en duro)
  const dynamicModules = useMemo(() => {
    const palette = ["#f97316", "#3b82f6", "#ec4899", "#6366f1", "#10b981"];
    const modSet = new Set();
    scenarios.forEach((s) => {
      const modName =
        s.moduleName ||
        s.submodule?.module?.name ||
        s.module?.name ||
        s.projectName ||
        s.project?.name;
      if (modName) modSet.add(modName);
    });
    return Array.from(modSet)
      .slice(0, 5)
      .map((name, idx) => ({
        name,
        abbr: name.slice(0, 3).toUpperCase(),
        color: palette[idx % palette.length],
      }));
  }, [scenarios]);

  const matchingScenarios = useMemo(() => {
    return scenarios
      .filter((s) => {
        const modName =
          s.moduleName ||
          s.submodule?.module?.name ||
          s.module?.name ||
          s.projectName ||
          "";
        if (
          selectedChipModule !== "ALL" &&
          modName.toLowerCase() !== selectedChipModule.toLowerCase()
        ) {
          return false;
        }
        if (catalogSearch.trim()) {
          const title = (s.name || s.casoPrueba || "").toLowerCase();
          return title.includes(catalogSearch.toLowerCase());
        }
        return true;
      })
      .slice(0, 2);
  }, [scenarios, selectedChipModule, catalogSearch]);

  const latestExecutionLabel = useMemo(() => {
    if (executions.length === 0) return "Sin ejecuciones registradas aún";
    const last = executions[0];
    return (
      last.scenarioName ||
      last.scenario?.name ||
      last.casoPrueba ||
      `Ejecución #${last.id}`
    );
  }, [executions]);

  const activePoint = chartGeometry.coords[hoveredIdx] || chartGeometry.coords[0];

  // Cálculo de segmentos SVG para el anillo
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  return (
    <div className="hl-dashboard">
      {/* ====================================================================
          HEADER SUPERIOR
          ==================================================================== */}
      <div className="hl-top-bar">
        <h1 className="hl-main-title">Dashboard</h1>
        <button
          type="button"
          className="hl-pill-btn"
          onClick={loadDashboardData}
          disabled={loading}
        >
          <IoRefreshOutline className={loading ? "hl-spin" : ""} size={15} />
          <span>{loading ? "Actualizando..." : "Actualizar Datos"}</span>
        </button>
      </div>

      {/* ====================================================================
          FILA 1: 4 TARJETAS KPI CON MINI-GRÁFICAS SVG
          ==================================================================== */}
      <div className="hl-kpi-row">
        {/* KPI 1: Escenarios Activos */}
        <div className="hl-kpi-card" onClick={() => navigate("/scenarios")}>
          <div className="hl-kpi-head">
            <span className="hl-kpi-icon">
              <IoLayersOutline size={16} />
            </span>
            <span className="hl-kpi-label">Escenarios Activos</span>
            <span className="hl-badge-green">{projectOptions.length} proy.</span>
          </div>
          <div className="hl-kpi-body">
            <strong className="hl-kpi-number">
              {String(kpis.totalScenarios).padStart(2, "0")}
            </strong>
            <svg width="54" height="32" viewBox="0 0 54 32" className="hl-mini-svg">
              <rect x="4" y="20" width="6" height="12" rx="2" fill="#f97316" />
              <rect x="13" y="16" width="6" height="16" rx="2" fill="#f97316" />
              <rect x="22" y="12" width="6" height="20" rx="2" fill="#f97316" />
              <rect x="31" y="7" width="6" height="25" rx="2" fill="#f97316" />
              <rect x="40" y="2" width="6" height="30" rx="2" fill="#f97316" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Pruebas Ejecutadas */}
        <div className="hl-kpi-card" onClick={() => navigate("/executions")}>
          <div className="hl-kpi-head">
            <span className="hl-kpi-icon">
              <IoCheckmarkDoneCircleOutline size={16} />
            </span>
            <span className="hl-kpi-label">Pruebas Ejecutadas</span>
            <span className="hl-badge-green">{kpis.passed} OK</span>
          </div>
          <div className="hl-kpi-body">
            <strong className="hl-kpi-number">{kpis.totalExecutions}</strong>
            <svg width="64" height="32" viewBox="0 0 64 32" className="hl-mini-svg">
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="4,28 18,24 28,15 42,13 58,4"
              />
            </svg>
          </div>
        </div>

        {/* KPI 3: Tasa de Éxito */}
        <div className="hl-kpi-card" onClick={() => navigate("/executions")}>
          <div className="hl-kpi-head">
            <span className="hl-kpi-icon">
              <IoStatsChartOutline size={16} />
            </span>
            <span className="hl-kpi-label">Tasa de Éxito</span>
            <span className="hl-badge-green">{kpis.failed} fallos</span>
          </div>
          <div className="hl-kpi-body">
            <strong className="hl-kpi-number">
              {kpis.passRate}
              <small>%</small>
            </strong>
            <svg width="56" height="32" viewBox="0 0 56 32" className="hl-mini-svg">
              <line x1="6" y1="4" x2="6" y2="28" stroke="#f97316" strokeWidth="1.5" />
              <line x1="6" y1="28" x2="52" y2="28" stroke="#f97316" strokeWidth="1.5" />
              <line
                x1="8"
                y1="17"
                x2="50"
                y2="17"
                stroke="#fdba74"
                strokeDasharray="3 3"
                strokeWidth="1.3"
              />
              <path
                d="M 10 10 C 20 2, 26 30, 48 22"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 4: Racha QA */}
        <div className="hl-kpi-card" onClick={() => navigate("/")}>
          <div className="hl-kpi-head">
            <span className="hl-kpi-icon">
              <IoFlameOutline size={16} />
            </span>
            <span className="hl-kpi-label">Días Activos</span>
            <span className="hl-badge-green">Historial</span>
          </div>
          <div className="hl-kpi-body">
            <strong className="hl-kpi-number">
              {String(kpis.streakDays).padStart(2, "0")}
              <small> Días</small>
            </strong>
            <div className="hl-streak-dots">
              {[0, 1, 2, 3].map((dot) => {
                const active = dot < Math.min(4, kpis.streakDays);
                return (
                  <span
                    key={dot}
                    className={`hl-streak-circle ${active ? "is-active" : ""}`}
                  >
                    ⚡
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          FILA 2: TENDENCIA DE EJECUCIONES + DISTRIBUCIÓN QA (DONA)
          ==================================================================== */}
      <div className="hl-mid-row">
        <div className="hl-card hl-overview-card">
          <div className="hl-card-header">
            <div>
              <h2 className="hl-card-title">Tendencia de Ejecuciones</h2>
              <p className="hl-card-sub">
                Comportamiento real de efectividad y volumen de pruebas en el portal.
              </p>
            </div>

            <div className="hl-selects-group">
              <select
                className="hl-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="ALL">Todos los Proyectos</option>
                {projectOptions.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>

              <select
                className="hl-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="30D">Últimos 30 días</option>
                <option value="7D">Últimos 7 días</option>
              </select>
            </div>
          </div>

          <div className="hl-area-chart-wrap">
            {activePoint && (
              <div
                className="hl-chart-tooltip"
                style={{
                  left: `calc(${(activePoint.x / 560) * 100}%)`,
                  top: `${Math.max(4, activePoint.y - 68)}px`,
                }}
              >
                <div className="hl-tooltip-top">
                  <strong>{activePoint.dateLabel}</strong>
                  <span className="hl-badge-green">{activePoint.delta}</span>
                </div>
                <div className="hl-tooltip-pct">{activePoint.rate}%</div>
                <div className="hl-tooltip-bar">
                  <span style={{ width: `${activePoint.rate}%` }} />
                </div>
              </div>
            )}

            <svg viewBox="0 0 560 205" className="hl-area-svg">
              <defs>
                <linearGradient id="hlOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.04" />
                </linearGradient>
                <pattern
                  id="hlAreaHatch"
                  width="6"
                  height="6"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="currentColor"
                    strokeOpacity="0.06"
                    strokeWidth="1.5"
                  />
                </pattern>
              </defs>

              {[100, 75, 50, 25, 0].map((val, i) => {
                const y = 18 + (i / 4) * 144;
                return (
                  <g key={val}>
                    <text x="2" y={y + 4} className="hl-axis-text">
                      {val}
                    </text>
                    <line
                      x1="28"
                      y1={y}
                      x2="532"
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.07"
                    />
                  </g>
                );
              })}

              <rect x="28" y="18" width="504" height="144" fill="url(#hlAreaHatch)" />

              <path d={chartGeometry.areaPath} fill="url(#hlOrangeGrad)" />
              <path
                d={chartGeometry.linePath}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.4"
              />

              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={activePoint.y}
                  x2={activePoint.x}
                  y2="162"
                  stroke="#f97316"
                  strokeWidth="1.6"
                />
              )}

              {chartGeometry.coords.map((pt, idx) => (
                <g
                  key={idx}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === idx ? 5.5 : 3.5}
                    fill={hoveredIdx === idx ? "#f97316" : "#ffffff"}
                    stroke="#f97316"
                    strokeWidth="2.2"
                  />
                  <text
                    x={pt.x}
                    y="194"
                    textAnchor="middle"
                    className="hl-axis-text"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Gráfica de Dona */}
        <div className="hl-card hl-donut-card">
          <div className="hl-card-header">
            <div className="hl-title-with-icon">
              <IoStatsChartOutline size={17} />
              <h2 className="hl-card-title">Distribución QA</h2>
            </div>

            <div className="hl-mini-actions">
              <button
                type="button"
                className="hl-square-btn"
                onClick={() => navigate("/executions")}
                title="Explorar ejecuciones"
              >
                <IoSearchOutline size={14} />
              </button>
              <button
                type="button"
                className="hl-square-btn"
                onClick={() => navigate("/executions")}
                title="Ver detalle"
              >
                <IoChevronForward size={14} />
              </button>
            </div>
          </div>

          <div className="hl-donut-wrap">
            <svg viewBox="0 0 140 140" className="hl-donut-svg">
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="rgba(148,163,184,0.2)"
                strokeWidth="15"
              />
              {activitySplit.segments.map((seg) => {
                if (seg.pct <= 0) return null;
                const dash = (seg.pct / 100) * circumference;
                const gap = Math.max(0, dash - 3);
                const offset = -((cumulativePct / 100) * circumference);
                cumulativePct += seg.pct;

                return (
                  <circle
                    key={seg.label}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="15"
                    strokeDasharray={`${gap} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                  />
                );
              })}
            </svg>

            <div className="hl-donut-center">
              <span>Total Reg.</span>
              <strong>{activitySplit.totalItems}</strong>
            </div>
          </div>

          <div className="hl-donut-legend">
            {activitySplit.segments.map((seg) => (
              <div key={seg.label} className="hl-legend-item">
                <i style={{ backgroundColor: seg.color }} />
                <span>
                  {seg.label}: <strong>{seg.pct}%</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====================================================================
          FILA 3: EJECUCIONES RECIENTES + EXPLORADOR DE CATÁLOGO (100% BD)
          ==================================================================== */}
      <div className="hl-bottom-row">
        <div className="hl-card hl-table-card">
          <div className="hl-card-header">
            <div className="hl-title-with-icon">
              <IoHourglassOutline size={17} />
              <h2 className="hl-card-title">Ejecuciones Recientes</h2>
            </div>

            <div className="hl-table-controls">
              <div className="hl-inline-search">
                <IoSearchOutline size={14} />
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="hl-pill-btn hl-pill-btn--sm"
                onClick={() => setSortAsc((s) => !s)}
              >
                <IoSwapVerticalOutline size={14} />
                <span>Ordenar</span>
              </button>

              <button
                type="button"
                className="hl-pill-btn hl-pill-btn--sm"
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "ALL"
                      ? "success"
                      : prev === "success"
                      ? "pending"
                      : "ALL"
                  )
                }
              >
                <IoFilterOutline size={14} />
                <span>
                  {statusFilter === "ALL"
                    ? "Filtro"
                    : statusFilter === "success"
                    ? "Exitosas"
                    : "Fallidas"}
                </span>
              </button>
            </div>
          </div>

          <div className="hl-table-wrap">
            <table className="hl-table">
              <thead>
                <tr>
                  <th>Escenario / Prueba</th>
                  <th>Fecha</th>
                  <th>Ejecutor / Modo</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="hl-empty-cell">
                      No hay ejecuciones registradas todavía.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate("/executions")}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="hl-row-name">
                          <span
                            className="hl-row-dot"
                            style={{ backgroundColor: row.dotColor }}
                          />
                          <span>{row.name}</span>
                        </div>
                      </td>
                      <td>{row.date}</td>
                      <td>{row.type}</td>
                      <td>
                        <span className={`hl-status-pill hl-status--${row.statusKind}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td>{row.priority}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tarjeta derecha: Catálogo de Escenarios real desde la BD */}
        <div className="hl-card hl-quick-card">
          <div>
            <h2 className="hl-card-title">Catálogo de Pruebas</h2>
            <p className="hl-card-sub">
              Filtra tus módulos y escenarios registrados en base de datos.
            </p>
          </div>

          <div className="hl-quick-search">
            <IoSearchOutline size={15} />
            <input
              type="text"
              placeholder="Buscar escenario en catálogo..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          <div className="hl-recent-label">
            Última ejecución: <strong>{latestExecutionLabel}</strong>
          </div>

          {/* Módulos reales extraídos de tus escenarios en BD */}
          {dynamicModules.length > 0 ? (
            <div className="hl-module-chips">
              <button
                type="button"
                className={`hl-mod-circle ${
                  selectedChipModule === "ALL" ? "is-selected" : ""
                }`}
                style={{ "--mod-color": "#f97316" }}
                onClick={() => setSelectedChipModule("ALL")}
                title="Todos los módulos"
              >
                ALL
              </button>
              {dynamicModules.map((mod) => (
                <button
                  key={mod.name}
                  type="button"
                  className={`hl-mod-circle ${
                    selectedChipModule === mod.name ? "is-selected" : ""
                  }`}
                  style={{ "--mod-color": mod.color }}
                  onClick={() => setSelectedChipModule(mod.name)}
                  title={mod.name}
                >
                  {mod.abbr}
                </button>
              ))}
            </div>
          ) : (
            <div className="hl-recent-label">
              {matchingScenarios.length > 0
                ? `${scenarios.length} escenarios disponibles`
                : "Sin módulos agrupados"}
            </div>
          )}

          <div className="hl-quick-actions">
            <button
              type="button"
              className="hl-btn-soft"
              onClick={() => navigate("/matrix")}
            >
              Matriz
            </button>
            <button
              type="button"
              className="hl-btn-dark"
              onClick={() => navigate("/")}
            >
              <IoRocketOutline size={15} />
              <span>Ir a Ejecutar →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}