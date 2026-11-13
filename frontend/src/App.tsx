import { useEffect, useState } from "react";
import { CargaDatos } from "./components/CargaDatos";
import { DashboardDescriptivo } from "./components/DashboardDescriptivo";

interface Salud {
  estado: string;
}

export default function App() {
  const [estado, setEstado] = useState<string>("consultando…");
  const [versionDatos, setVersionDatos] = useState<number>(0);
  const [temaOscuro, setTemaOscuro] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/salud")
      .then((r) => r.json() as Promise<Salud>)
      .then((d) => setEstado(d.estado))
      .catch(() => setEstado("sin conexión con el backend"));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", temaOscuro ? "dark" : "light");
  }, [temaOscuro]);

  const mostrarNotificacion = (mensaje: string) => {
    setToast(mensaje);
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {toast && <div className="toast-flotante">{toast}</div>}

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "2px solid var(--border-color)",
          paddingBottom: "14px",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.55rem", letterSpacing: "-0.02em" }}>
          Análisis de Vulnerabilidades NVD / CVE
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setTemaOscuro((prev) => !prev)}
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: "var(--bg-subtle)",
              color: "var(--text-main)",
              border: "1px solid var(--border-input)",
              cursor: "pointer",
            }}
          >
            {temaOscuro ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
          </button>

          <span
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: "bold",
              background: estado === "ok" ? "rgba(22, 163, 74, 0.15)" : "rgba(220, 38, 38, 0.15)",
              color: estado === "ok" ? "#16a34a" : "#ef4444",
            }}
          >
            Backend: {estado}
          </span>
        </div>
      </header>

      <CargaDatos
        onDatosActualizados={() => setVersionDatos((v) => v + 1)}
        onNotificar={mostrarNotificacion}
      />
      <DashboardDescriptivo
        recargarTrigger={versionDatos}
        onNotificar={mostrarNotificacion}
      />
    </main>
  );
}