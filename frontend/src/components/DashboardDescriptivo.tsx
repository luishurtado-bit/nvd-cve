import { useEffect, useState, type ReactNode } from "react";
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
} from "@/api/cliente";
import Cargando from "@/componentes/Cargando";
import { Campo } from "@/components/campo";
import { SelectOpciones } from "@/components/select-opciones";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { descargarGraficaPng } from "@/utils/exportarPng";

interface DashboardProps {
  recargarTrigger: number;
  onNotificar?: (mensaje: string) => void;
}

// Los colores de las series van en hex (no en variables CSS): la exportación a PNG serializa
// el <svg> y las variables no se resolverían fuera de la página.
const COLORES_SEVERIDAD: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  NONE: "#94a3b8",
};
const COLOR_SEVERIDAD_DEFECTO = "#3b82f6";
const COLOR_VECTOR = "#0ea5e9";
const COLOR_HISTOGRAMA = "#8b5cf6";
const COLOR_SERIE = "#10b981";

type FiltroSeveridad = "TODAS" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

const opcionesSeveridad: { valor: FiltroSeveridad; texto: string }[] = [
  { valor: "TODAS", texto: "Todas" },
  { valor: "CRITICAL", texto: "CRITICAL" },
  { valor: "HIGH", texto: "HIGH" },
  { valor: "MEDIUM", texto: "MEDIUM" },
  { valor: "LOW", texto: "LOW" },
  { valor: "NONE", texto: "NONE" },
];

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
    <div className="rounded-lg border bg-popover px-3.5 py-2.5 text-sm text-popover-foreground shadow-md">
      <div className="mb-1 font-bold text-primary">{label}</div>
      <div>
        {item.name}: <strong>{item.value?.toLocaleString()}</strong>
      </div>
      {typeof prop === "number" && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          Proporción: <strong>{(prop * 100).toFixed(2)}%</strong>
        </div>
      )}
    </div>
  );
}

function Estadistico({ etiqueta, valor, className }: { etiqueta: string; valor: string | number; className?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-sm text-muted-foreground">{etiqueta}</div>
        <div className={cn("mt-1 text-2xl font-bold tabular-nums", className)}>{valor}</div>
      </CardContent>
    </Card>
  );
}

interface TarjetaGraficaProps {
  id: string;
  titulo: string;
  nombreArchivo: string;
  onExportar: (id: string, nombre: string) => void;
  children: ReactNode;
}

// El id va en el contenedor de la gráfica (no en la Card): descargarGraficaPng() toma el
// primer <svg> dentro de ese id, y así no puede confundirse con un icono del botón.
function TarjetaGrafica({ id, titulo, nombreArchivo, onExportar, children }: TarjetaGraficaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={() => onExportar(id, nombreArchivo)}>
            Guardar PNG
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div id={id} className="h-65 w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardDescriptivo({ recargarTrigger, onNotificar }: DashboardProps) {
  const [severidad, setSeveridad] = useState<DistribucionOut | null>(null);
  const [vector, setVector] = useState<DistribucionOut | null>(null);
  const [serie, setSerie] = useState<SerieDiariaOut | null>(null);
  const [histograma, setHistograma] = useState<HistogramaOut | null>(null);
  const [cwe, setCwe] = useState<DistribucionOut | null>(null);

  const [filtroSeveridad, setFiltroSeveridad] = useState<FiltroSeveridad>("TODAS");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [busquedaCwe, setBusquedaCwe] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void cargarDatosDashboard();
  }, [recargarTrigger]);

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
    return <Cargando texto="Cargando visualizaciones del dashboard..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error en Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
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

  return (
    <section className="mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-bold tracking-tight">2. Dashboard Descriptivo (Electiva III)</h2>

        <a
          href="/api/exportar/cve"
          download="cve_depurados.csv"
          onClick={() => onNotificar?.("📥 Descargando tabla cve_depurados.csv...")}
          className={buttonVariants()}
        >
          Descargar Tabla CVE (CSV)
        </a>
      </div>

      {/* Tarjetas de Estadísticos Descriptivos */}
      {histograma && (
        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <Estadistico etiqueta="Total analizados (n)" valor={histograma.n} />
          <Estadistico
            etiqueta="Media CVSS (baseScore)"
            valor={histograma.media !== null ? histograma.media.toFixed(2) : "N/A"}
            className="text-blue-500"
          />
          <Estadistico
            etiqueta="Mediana CVSS"
            valor={histograma.mediana !== null ? histograma.mediana.toFixed(2) : "N/A"}
            className="text-emerald-500"
          />
          <Estadistico
            etiqueta="Desviación Estándar"
            valor={histograma.desviacion !== null ? histograma.desviacion.toFixed(2) : "N/A"}
            className="text-violet-500"
          />
        </div>
      )}

      {/* Barra de filtros */}
      <Card className="mb-6">
        <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3.5">
          <Campo etiqueta="Severidad" htmlFor="filtro-sev">
            <SelectOpciones
              id="filtro-sev"
              opciones={opcionesSeveridad}
              valor={filtroSeveridad}
              onCambio={setFiltroSeveridad}
            />
          </Campo>
          <Campo etiqueta="Fecha desde" htmlFor="filtro-desde">
            <Input
              id="filtro-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha hasta" htmlFor="filtro-hasta">
            <Input
              id="filtro-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Buscar CWE" htmlFor="buscar-cwe">
            <Input
              id="buscar-cwe"
              type="text"
              placeholder="Ej. CWE-79..."
              value={busquedaCwe}
              onChange={(e) => setBusquedaCwe(e.target.value)}
            />
          </Campo>
          <Button type="button" variant="outline" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        </CardContent>
      </Card>

      {/* Grid de gráficas */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-6">
        {/* 1. Severidad */}
        <TarjetaGrafica
          id="grafica-severidad"
          titulo="Distribución por Severidad"
          nombreArchivo="distribucion_severidad"
          onExportar={exportarFigura}
        >
          <ResponsiveContainer>
            <BarChart data={categoriasSeveridadFiltradas}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="categoria" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip content={<TooltipPro />} />
              <Bar dataKey="conteo" name="Cantidad CVE" radius={[6, 6, 0, 0]}>
                {categoriasSeveridadFiltradas.map((entry) => (
                  <Cell key={entry.categoria} fill={COLORES_SEVERIDAD[entry.categoria] ?? COLOR_SEVERIDAD_DEFECTO} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        {/* 2. Vector de Ataque */}
        <TarjetaGrafica
          id="grafica-vector"
          titulo="Vector de Ataque (CVSS)"
          nombreArchivo="vector_ataque"
          onExportar={exportarFigura}
        >
          <ResponsiveContainer>
            <BarChart data={vector?.categorias ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" stroke="var(--text-muted)" />
              <YAxis dataKey="categoria" type="category" width={130} stroke="var(--text-muted)" />
              <Tooltip content={<TooltipPro />} />
              <Bar dataKey="conteo" name="Cantidad CVE" fill={COLOR_VECTOR} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        {/* 3. Histograma */}
        <TarjetaGrafica
          id="grafica-histograma"
          titulo="Histograma CVSS (baseScore)"
          nombreArchivo="histograma_basescore"
          onExportar={exportarFigura}
        >
          <ResponsiveContainer>
            <BarChart data={datosHistograma}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="rango" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip content={<TooltipPro />} />
              <Bar dataKey="conteo" name="Frecuencia" fill={COLOR_HISTOGRAMA} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        {/* 4. Serie Diaria */}
        <TarjetaGrafica
          id="grafica-serie"
          titulo="Serie Diaria de CVE Publicados"
          nombreArchivo="serie_diaria_cve"
          onExportar={exportarFigura}
        >
          <ResponsiveContainer>
            <LineChart data={puntosSerieFiltrados}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="fecha" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip content={<TooltipPro />} />
              <Line type="monotone" dataKey="conteo" name="CVEs por día" stroke={COLOR_SERIE} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </TarjetaGrafica>
      </div>

      {/* 5. Tabla Top CWE */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Debilidades Más Frecuentes (CWE)</CardTitle>
          <CardAction className="text-sm text-muted-foreground">
            Mostrando {categoriasCweFiltradas.length} de {cwe?.categorias.length ?? 0} categorías
          </CardAction>
        </CardHeader>
        <CardContent>
          {categoriasCweFiltradas.length === 0 ? (
            <p className="m-0 text-muted-foreground">No hay registros CWE que coincidan con el filtro.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría CWE</TableHead>
                  <TableHead>Conteo</TableHead>
                  <TableHead>Proporción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriasCweFiltradas.map((item) => (
                  <TableRow key={item.categoria}>
                    <TableCell className="font-semibold">{item.categoria}</TableCell>
                    <TableCell className="tabular-nums">{item.conteo}</TableCell>
                    <TableCell className="tabular-nums">{(item.proporcion * 100).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
