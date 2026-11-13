import type { components } from "./schema";

export type ResumenDatos = components["schemas"]["ResumenDatos"];
export type CargarIn = components["schemas"]["CargarIn"];
export type DistribucionOut = components["schemas"]["DistribucionOut"];
export type SerieDiariaOut = components["schemas"]["SerieDiariaOut"];
export type HistogramaOut = components["schemas"]["HistogramaOut"];

async function manejarRespuesta<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detalle = `Error HTTP ${resp.status}`;
    try {
      const errData = (await resp.json()) as { detail?: string | Array<{ msg: string }> };
      if (typeof errData.detail === "string") {
        detalle = errData.detail;
      } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
        detalle = errData.detail.map((d) => d.msg).join(", ");
      }
    } catch {
      // Si no es JSON, mantenemos el mensaje HTTP
    }
    throw new Error(detalle);
  }
  return resp.json() as Promise<T>;
}

export const apiFrontB = {
  obtenerResumen: async (): Promise<ResumenDatos> => {
    const resp = await fetch("/api/datos/resumen");
    return manejarRespuesta<ResumenDatos>(resp);
  },

  cargarPorFechas: async (fechas: CargarIn): Promise<ResumenDatos> => {
    const resp = await fetch("/api/datos/cargar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fechas),
    });
    return manejarRespuesta<ResumenDatos>(resp);
  },

  cargarArchivoCsv: async (archivo: File): Promise<ResumenDatos> => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    const resp = await fetch("/api/datos/archivo", {
      method: "POST",
      body: formData,
    });
    return manejarRespuesta<ResumenDatos>(resp);
  },

  obtenerSeveridad: async (): Promise<DistribucionOut> => {
    const resp = await fetch("/api/dashboard/severidad");
    return manejarRespuesta<DistribucionOut>(resp);
  },

  obtenerVectorAtaque: async (): Promise<DistribucionOut> => {
    const resp = await fetch("/api/dashboard/vector-ataque");
    return manejarRespuesta<DistribucionOut>(resp);
  },

  obtenerSerieDiaria: async (): Promise<SerieDiariaOut> => {
    const resp = await fetch("/api/dashboard/serie-diaria");
    return manejarRespuesta<SerieDiariaOut>(resp);
  },

  obtenerHistograma: async (bins?: number): Promise<HistogramaOut> => {
    const url = bins ? `/api/dashboard/histograma?bins=${bins}` : "/api/dashboard/histograma";
    const resp = await fetch(url);
    return manejarRespuesta<HistogramaOut>(resp);
  },

  obtenerCwe: async (top?: number): Promise<DistribucionOut> => {
    const url = top ? `/api/dashboard/cwe?top=${top}` : "/api/dashboard/cwe";
    const resp = await fetch(url);
    return manejarRespuesta<DistribucionOut>(resp);
  },
};