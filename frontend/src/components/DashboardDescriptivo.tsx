import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
} from "recharts";
import {
  apiFrontB,
  type DistribucionOut,
  type SerieDiariaOut,
  type HistogramaOut,
} from "../api/cliente";
import { descargarGraficaPng } from "../utils/exportarPng";

interface DashboardProps {
  recargarTrigger: number;
  onNotificar?: (mensaje: string) => void;
}

const COLORES_SEVERIDAD: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  NONE: "#94a3b8",
};

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  payload?: {
    categoria?: string;
    rango?: string;
    fecha?: string;
    proporcion?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function TooltipPro({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const prop = item.payload?.proporcion;

  return (
    <div
      style={{
        background: "#0f172a",
        color: "#f8fafc",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid #334155",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#93c5fd" }}>{label}</div>
      <div>
        {item.name}: <strong>{item.value?.toLocaleString()}</strong>
      </div>
      {typeof prop === "number" && (
        <div style={{ color: "#cbd5e1", fontSize: "0.78rem", marginTop: "2px" }}>
          Proporción: <strong>{(prop * 100).toFixed(2)}%</strong>
        </div>
      )}
    </div>
  );
}

export function DashboardDescriptivo({ recargarTrigger, onNotificar }: DashboardProps) {
  const [severidad, setSeveridad] = useState<DistribucionOut | null>(null);
  const [vector, setVector] = useState<DistribucionOut | null>(null);
  const [serie, setSerie] = useState<SerieDiariaOut | null>(null);
  const [histograma, setHistograma] = useState<HistogramaOut | null>(null);
  const [cwe, setCwe] = useState<DistribucionOut | null>(null);

  const [filtroSeveridad, setFiltroSeveridad] = useState<string>("TODAS");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [busquedaCwe, setBusquedaCwe] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void cargarDatosDashboard();
  }, [recargarTrigger]);

  const cargarDatosDashboard = async () => {
    setCargando(true);
    setError(null);
    try {
      const [resSev, resVec, resSer, resHist, resCwe] = await Promise.all([
        apiFrontB.obtenerSeveridad(),
        apiFrontB.obtenerVectorAtaque(),
        apiFrontB.obtenerSerieDiaria(),
        apiFrontB.obtenerHistograma(10),
        apiFrontB.obtenerCwe(10),
      ]);
      setSeveridad(resSev);
      setVector(resVec);
      setSerie(resSer);
      setHistograma(resHist);
      setCwe(resCwe);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar las métricas del dashboard."
      );
    } finally {
      setCargando(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroSeveridad("TODAS");
    setFechaDesde("");
    setFechaHasta("");
    setBusquedaCwe("");
    onNotificar?.("Filtros restablecidos");
  };

  const exportarFigura = (id: string, nombre: string) => {
    descargarGraficaPng(id, nombre);
    onNotificar?.(`🖼️ Imagen ${nombre}.png descargada`);
  };

  if (cargando) {
    return <p style={{ padding: "20px", color: "var(--text-muted)" }}>Cargando visualizaciones del dashboard...</p>;
  }

  if (error) {
    return (
      <div role="alert" style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "10px" }}>
        <strong>Error en Dashboard:</strong> {error}
      </div>
    );
  }

  const categoriasSeveridadFiltradas =
    severidad?.categorias.filter(
      (cat) => filtroSeveridad === "TODAS" || cat.categoria === filtroSeveridad
    ) ?? [];

  const puntosSerieFiltrados =
    serie?.puntos.filter((punto) => {
      if (fechaDesde && punto.fecha < fechaDesde) return false;
      if (fechaHasta && punto.fecha > fechaHasta) return false;
      return true;
    }) ?? [];

  const categoriasCweFiltradas =
    cwe?.categorias.filter((item) =>
      item.categoria.toLowerCase().includes(busquedaCwe.toLowerCase())
    ) ?? [];

  const datosHistograma =
    histograma?.intervalos.map((intv) => ({
      rango: `${intv.desde.toFixed(1)}–${intv.hasta.toFixed(1)}`,
      conteo: intv.conteo,
    })) ?? [];

  const botonPngStyle = {
    padding: "5px 11px",
    fontSize: "0.78rem",
    fontWeight: 600,
    background: "var(--bg-subtle)",
    color: "var(--text-main)",
    border: "1px solid var(--border-input)",
    borderRadius: "6px",
    cursor: "pointer",
  };

  return (
    <section style={{ marginTop: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <h2>2. Dashboard Descriptivo (Electiva III)</h2>

        <a
          href="/api/exportar/cve"
          download="cve_depurados.csv"
          onClick={() => onNotificar?.("📥 Descargando tabla cve_depurados.csv...")}
          style={{
            padding: "9px 16px",
            background: "var(--primary)",
            color: "#ffffff",
            borderRadius: "10px",
            textDecoration: "none",
            fontSize: "0.86rem",
            fontWeight: 600,
          }}
        >
          Descargar Tabla CVE (CSV)
        </a>
      </div>

      {/* Tarjetas de Estadísticos Descriptivos */}
      {histograma && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div className="card-pro" style={{ padding: "16px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Total analizados (n)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px" }}>{histograma.n}</div>
          </div>
          <div className="card-pro" style={{ padding: "16px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Media CVSS (baseScore)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6", marginTop: "4px" }}>
              {histograma.media !== null ? histograma.media.toFixed(2) : "N/A"}
            </div>
          </div>
          <div className="card-pro" style={{ padding: "16px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Mediana CVSS</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
              {histograma.mediana !== null ? histograma.mediana.toFixed(2) : "N/A"}
            </div>
          </div>
          <div className="card-pro" style={{ padding: "16px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Desviación Estándar</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#8b5cf6", marginTop: "4px" }}>
              {histograma.desviacion !== null ? histograma.desviacion.toFixed(2) : "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* Barra de filtros */}
      <div
        className="card-pro"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "14px",
          alignItems: "end",
          padding: "18px",
          marginBottom: "24px",
        }}
      >
        <div>
          <label htmlFor="filtro-sev" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
            Severidad
          </label>
          <select
            id="filtro-sev"
            value={filtroSeveridad}
            onChange={(e) => setFiltroSeveridad(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="TODAS">Todas</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="NONE">NONE</option>
          </select>
        </div>

        <div>
          <label htmlFor="filtro-desde" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
            Fecha desde
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="filtro-hasta" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
            Fecha hasta
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="buscar-cwe" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
            Buscar CWE
          </label>
          <input
            id="buscar-cwe"
            type="text"
            placeholder="Ej. CWE-79..."
            value={busquedaCwe}
            onChange={(e) => setBusquedaCwe(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <button
          type="button"
          onClick={limpiarFiltros}
          style={{
            padding: "9px 14px",
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text-main)",
            background: "var(--bg-subtle)",
            border: "1.5px solid var(--border-input)",
            borderRadius: "10px",
            cursor: "pointer",
            height: "40px",
          }}
        >
          Limpiar filtros
        </button>
      </div>

      {/* Grid de gráficas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px" }}>
        {/* 1. Severidad */}
        <div id="grafica-severidad" className="card-pro" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Distribución por Severidad</h3>
            <button type="button" onClick={() => exportarFigura("grafica-severidad", "distribucion_severidad")} style={botonPngStyle}>
              Guardar PNG
            </button>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={categoriasSeveridadFiltradas}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="categoria" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip content={<TooltipPro />} />
                <Bar dataKey="conteo" name="Cantidad CVE" radius={[6, 6, 0, 0]}>
                  {categoriasSeveridadFiltradas.map((entry) => (
                    <Cell key={entry.categoria} fill={COLORES_SEVERIDAD[entry.categoria] ?? "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Vector de Ataque */}
        <div id="grafica-vector" className="card-pro" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Vector de Ataque (CVSS)</h3>
            <button type="button" onClick={() => exportarFigura("grafica-vector", "vector_ataque")} style={botonPngStyle}>
              Guardar PNG
            </button>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={vector?.categorias ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" />
                <YAxis dataKey="categoria" type="category" width={130} stroke="var(--text-muted)" />
                <Tooltip content={<TooltipPro />} />
                <Bar dataKey="conteo" name="Cantidad CVE" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Histograma */}
        <div id="grafica-histograma" className="card-pro" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Histograma CVSS (baseScore)</h3>
            <button type="button" onClick={() => exportarFigura("grafica-histograma", "histograma_basescore")} style={botonPngStyle}>
              Guardar PNG
            </button>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={datosHistograma}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="rango" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip content={<TooltipPro />} />
                <Bar dataKey="conteo" name="Frecuencia" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Serie Diaria */}
        <div id="grafica-serie" className="card-pro" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Serie Diaria de CVE Publicados</h3>
            <button type="button" onClick={() => exportarFigura("grafica-serie", "serie_diaria_cve")} style={botonPngStyle}>
              Guardar PNG
            </button>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={puntosSerieFiltrados}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="fecha" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip content={<TooltipPro />} />
                <Line type="monotone" dataKey="conteo" name="CVEs por día" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Tabla Top CWE */}
      <div className="card-pro" style={{ marginTop: "24px", padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>Top Debilidades Más Frecuentes (CWE)</h3>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Mostrando {categoriasCweFiltradas.length} de {cwe?.categorias.length ?? 0} categorías
          </span>
        </div>
        {categoriasCweFiltradas.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No hay registros CWE que coincidan con el filtro.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-input)" }}>
                <th style={{ padding: "10px" }}>Categoría CWE</th>
                <th style={{ padding: "10px" }}>Conteo</th>
                <th style={{ padding: "10px" }}>Proporción</th>
              </tr>
            </thead>
            <tbody>
              {categoriasCweFiltradas.map((item) => (
                <tr key={item.categoria} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px", fontWeight: 600 }}>{item.categoria}</td>
                  <td style={{ padding: "10px" }}>{item.conteo}</td>
                  <td style={{ padding: "10px" }}>{(item.proporcion * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}