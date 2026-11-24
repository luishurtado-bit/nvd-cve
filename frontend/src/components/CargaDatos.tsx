import { useState, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { apiFrontB, type ResumenDatos } from "@/api/cliente";
import { useDatos } from "@/contexto/datos";
import { Campo } from "@/components/campo";
import { Formulario } from "@/components/formulario";
import { SelectorFecha } from "@/components/selector-fecha";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CargaDatosProps {
  onDatosActualizados?: (resumen: ResumenDatos) => void;
  onNotificar?: (mensaje: string) => void;
}

type Tono = "neutro" | "error" | "aviso" | "primario";

const tonos: Record<Tono, { caja: string; texto: string }> = {
  neutro: { caja: "border-border bg-muted", texto: "text-muted-foreground" },
  error: { caja: "border-red-500/25 bg-red-500/10", texto: "text-red-500" },
  aviso: { caja: "border-amber-500/25 bg-amber-500/10", texto: "text-amber-500" },
  primario: { caja: "border-primary/35 bg-primary/10", texto: "text-primary" },
};

function Metrica({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono: Tono }) {
  return (
    <div className={cn("rounded-xl border p-3.5 text-center", tonos[tono].caja)}>
      <div className={cn("text-sm font-medium", tonos[tono].texto)}>{etiqueta}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", tono !== "neutro" && tonos[tono].texto)}>
        {valor}
      </div>
    </div>
  );
}

export function CargaDatos({ onDatosActualizados, onNotificar }: CargaDatosProps) {
  const [inicio, setInicio] = useState<string>("2026-01-01");
  const [fin, setFin] = useState<string>("2026-01-31");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  // El resumen del conjunto cargado vive en el contexto: lo ven también la barra de contexto y las demás páginas
  const { resumen, alCargar } = useDatos();
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      alCargar(data);
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
      alCargar(data);
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
    <section>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Aviso</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        {/* Opción A: Consulta por fechas */}
        <Card>
          <CardHeader>
            <CardTitle>Consultar API NVD por Periodo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Formulario onSubmit={manejarCargaFechas} className="flex-1 content-between">
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Fecha de inicio" htmlFor="fecha-inicio">
                  <SelectorFecha
                    id="fecha-inicio"
                    valor={inicio}
                    onCambio={setInicio}
                    disabled={cargando}
                  />
                </Campo>
                <Campo etiqueta="Fecha fin" htmlFor="fecha-fin">
                  <SelectorFecha
                    id="fecha-fin"
                    valor={fin}
                    onCambio={setFin}
                    disabled={cargando}
                  />
                </Campo>
              </div>
              <Button type="submit" className="w-full" disabled={cargando}>
                {cargando ? "Descargando..." : "Descargar de NVD"}
              </Button>
            </Formulario>
          </CardContent>
        </Card>

        {/* Opción B: Drag & Drop CSV */}
        <Card>
          <CardHeader>
            <CardTitle>Cargar desde Archivo CSV</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Formulario onSubmit={manejarSubidaCsv} className="flex-1 content-between">
              <label
                htmlFor="archivo-csv"
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={manejarDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors",
                  arrastrando ? "border-primary bg-primary/10" : "border-input bg-muted",
                )}
              >
                <span className="text-sm font-semibold">
                  {archivo ? `📄 ${archivo.name}` : "Arrastra tu archivo .csv aquí o haz clic"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Formato esperado: CVE depurados o exportados NVD
                </span>
                <input
                  id="archivo-csv"
                  type="file"
                  accept=".csv"
                  onChange={manejarArchivoChange}
                  disabled={cargando}
                  className="hidden"
                />
              </label>
              <Button type="submit" className="w-full" disabled={cargando || !archivo}>
                {cargando ? "Procesando CSV..." : "Subir CSV"}
              </Button>
            </Formulario>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de depuración con barra de calidad */}
      {resumen && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Conjunto Cargado</CardTitle>
            <CardAction>
              <Badge variant="secondary">
                Periodo: <strong>{resumen.periodo.inicio ?? "Sin fijar"}</strong> →{" "}
                <strong>{resumen.periodo.fin ?? "Sin fijar"}</strong>
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              <Metrica etiqueta="Descargados" valor={resumen.descargados} tono="neutro" />
              <Metrica etiqueta="Rechazados" valor={resumen.rechazados} tono="error" />
              <Metrica etiqueta="Sin puntuación" valor={resumen.sin_puntuacion} tono="aviso" />
              <Metrica etiqueta="Espacio Muestral (N)" valor={resumen.N} tono="primario" />
            </div>

            {/* Barra de retención de depuración */}
            {resumen.descargados > 0 && (
              <Progress
                value={porcentajeValido}
                className="gap-1.5 [&_[data-slot=progress-track]]:h-2"
              >
                <ProgressLabel className="text-xs font-normal text-muted-foreground">
                  Tasa de retención tras depuración (N / Descargados)
                </ProgressLabel>
                <span className="ml-auto text-xs font-semibold text-muted-foreground">
                  {porcentajeValido}% válidos para análisis
                </span>
              </Progress>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
