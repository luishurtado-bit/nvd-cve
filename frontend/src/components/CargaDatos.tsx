import { useState, useEffect, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { apiFrontB, type ResumenDatos } from "../api/cliente";

interface CargaDatosProps {
  onDatosActualizados?: (resumen: ResumenDatos) => void;
  onNotificar?: (mensaje: string) => void;
}

export function CargaDatos({ onDatosActualizados, onNotificar }: CargaDatosProps) {
  const [inicio, setInicio] = useState<string>("2026-01-01");
  const [fin, setFin] = useState<string>("2026-01-31");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const [resumen, setResumen] = useState<ResumenDatos | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void cargarResumenInicial();
  }, []);

  const cargarResumenInicial = async () => {
    try {
      const data = await apiFrontB.obtenerResumen();
      setResumen(data);
    } catch {
      // Aún no hay datos cargados
    }
  };

  const manejarCargaFechas = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!inicio || !fin) {
      setError("Selecciona ambas fechas (inicio y fin).");
      return;
    }
    if (inicio > fin) {
      setError("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    setCargando(true);
    try {
      const data = await apiFrontB.cargarPorFechas({ inicio, fin });
      setResumen(data);
      onDatosActualizados?.(data);
      onNotificar?.(`✅ ${data.N.toLocaleString()} CVEs cargados desde NVD`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar datos de la NVD.");
    } finally {
      setCargando(false);
    }
  };

  const manejarArchivoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const seleccionado = e.target.files?.[0] ?? null;
    setArchivo(seleccionado);
    setError(null);
  };

  const manejarDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      setArchivo(file);
      setError(null);
    } else {
      setError("Por favor suelta un archivo con extensión .csv");
    }
  };

  const manejarSubidaCsv = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!archivo) {
      setError("Por favor selecciona o arrastra un archivo .csv primero.");
      return;
    }

    setError(null);
    setCargando(true);
    try {
      const data = await apiFrontB.cargarArchivoCsv(archivo);
      setResumen(data);
      onDatosActualizados?.(data);
      onNotificar?.(`✅ Archivo "${archivo.name}" procesado (${data.N} válidos)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el archivo CSV.");
    } finally {
      setCargando(false);
    }
  };

  const porcentajeValido =
    resumen && resumen.descargados > 0
      ? Math.round((resumen.N / resumen.descargados) * 100)
      : 0;

  return (
    <section className="panel-carga">
      <h2>1. Carga y Depuración de Datos (NVD / CVE)</h2>

      {error && (
        <div role="alert" style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", border: "1px solid #fecaca" }}>
          <strong>Aviso:</strong> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "24px" }}>
        {/* Opción A: Consulta por fechas */}
        <form
          onSubmit={manejarCargaFechas}
          className="card-pro"
          style={{
            padding: "22px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Consultar API NVD por Periodo</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label htmlFor="fecha-inicio" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Fecha de inicio
                </label>
                <input
                  id="fecha-inicio"
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  disabled={cargando}
                  style={{ width: "100%" }}
                  required
                />
              </div>
              <div>
                <label htmlFor="fecha-fin" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Fecha fin
                </label>
                <input
                  id="fecha-fin"
                  type="date"
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  disabled={cargando}
                  style={{ width: "100%" }}
                  required
                />
              </div>
            </div>
          </div>
          <button type="submit" disabled={cargando}>
            {cargando ? "Descargando..." : "Descargar de NVD"}
          </button>
        </form>

        {/* Opción B: Drag & Drop CSV */}
        <form
          onSubmit={manejarSubidaCsv}
          className="card-pro"
          style={{
            padding: "22px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Cargar desde Archivo CSV</h3>
            <label
              htmlFor="archivo-csv"
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={manejarDrop}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                marginBottom: "14px",
                borderRadius: "10px",
                border: `2px dashed ${arrastrando ? "var(--primary)" : "var(--border-input)"}`,
                background: arrastrando ? "rgba(59, 130, 246, 0.08)" : "var(--bg-subtle)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                {archivo ? `📄 ${archivo.name}` : "Arrastra tu archivo .csv aquí o haz clic"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Formato esperado: CVE depurados o exportados NVD
              </span>
              <input
                id="archivo-csv"
                type="file"
                accept=".csv"
                onChange={manejarArchivoChange}
                disabled={cargando}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <button type="submit" disabled={cargando || !archivo}>
            {cargando ? "Procesando CSV..." : "Subir CSV"}
          </button>
        </form>
      </div>

      {/* Resumen de depuración con barra de calidad */}
      {resumen && (
        <div className="card-pro" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Resumen del Conjunto Cargado</h3>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "4px 12px", borderRadius: "999px" }}>
              Periodo: <strong>{resumen.periodo.inicio ?? "Sin fijar"}</strong> → <strong>{resumen.periodo.fin ?? "Sin fijar"}</strong>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", textAlign: "center", marginBottom: "16px" }}>
            <div style={{ background: "var(--bg-subtle)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Descargados</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: "4px" }}>{resumen.descargados}</div>
            </div>
            <div style={{ background: "rgba(220, 38, 38, 0.08)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(220, 38, 38, 0.25)" }}>
              <div style={{ fontSize: "0.82rem", color: "#ef4444", fontWeight: 500 }}>Rechazados</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#ef4444", marginTop: "4px" }}>{resumen.rechazados}</div>
            </div>
            <div style={{ background: "rgba(217, 119, 6, 0.08)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(217, 119, 6, 0.25)" }}>
              <div style={{ fontSize: "0.82rem", color: "#f59e0b", fontWeight: 500 }}>Sin puntuación</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>{resumen.sin_puntuacion}</div>
            </div>
            <div style={{ background: "rgba(37, 99, 235, 0.1)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(59, 130, 246, 0.35)" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600 }}>Espacio Muestral (N)</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>{resumen.N}</div>
            </div>
          </div>

          {/* Barra de retención de depuración */}
          {resumen.descargados > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                <span>Tasa de retención tras depuración (N / Descargados)</span>
                <strong>{porcentajeValido}% válidos para análisis</strong>
              </div>
              <div style={{ width: "100%", height: "8px", background: "var(--bg-subtle)", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${porcentajeValido}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #2563eb, #10b981)",
                    borderRadius: "999px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}