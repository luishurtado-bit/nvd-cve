import { useState, type FormEvent } from 'react'
import type { CargarIn } from '@/api/tipos'
import { Campo } from '@/components/campo'
import { SelectorFecha } from '@/components/selector-fecha'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDatos } from '@/contexto/datos'

// Límites de la NVD y del backend: 120 días por consulta; hasta 366 días en una descarga
const DIAS_POR_TRAMO = 120
const MAX_DIAS = 366
const DIA_EN_MS = 86_400_000
const DIAS_POR_DEFECTO = 30

const iso = (fecha: Date) => fecha.toISOString().slice(0, 10)

/** Los días entre dos fechas AAAA-MM-DD, ambas incluidas; null si falta alguna o están al revés. */
function diasEntre(inicio: string, fin: string): number | null {
  if (!inicio || !fin || inicio > fin) return null
  return Math.round((Date.parse(fin) - Date.parse(inicio)) / DIA_EN_MS) + 1
}

function fechasDeHoy() {
  const ahora = Date.now()
  const ayer = ahora - DIA_EN_MS
  return { hoy: iso(new Date(ahora)), ultimoMes: { inicio: iso(new Date(ayer - (DIAS_POR_DEFECTO - 1) * DIA_EN_MS)), fin: iso(new Date(ayer)) } }
}

interface Props {
  /** Hay una descarga en curso: no se puede lanzar otra (el servidor corre una a la vez). */
  ocupado: boolean
  onDescargar: (entrada: CargarIn) => void
}

/** Elige el periodo y avisa, antes de pedir nada, cuántas consultas harán falta y si el rango no sirve. */
export default function FormularioDescarga({ ocupado, onDescargar }: Props) {
  const { resumen } = useDatos()
  // La fecha se toma una vez, al abrir el formulario: durante el render no se puede leer el reloj
  const [{ hoy, ultimoMes }] = useState(fechasDeHoy)
  // Por defecto, el periodo ya cargado; si son datos simulados, el último mes hasta ayer
  const porDefecto =
    resumen && resumen.origen !== 'simulado' && resumen.periodo.inicio && resumen.periodo.fin
      ? { inicio: resumen.periodo.inicio, fin: resumen.periodo.fin }
      : ultimoMes

  // null = la persona no ha tocado el campo todavía, así que vale el valor por defecto
  const [inicioElegido, setInicio] = useState<string | null>(null)
  const [finElegido, setFin] = useState<string | null>(null)
  const inicio = inicioElegido ?? porDefecto.inicio
  const fin = finElegido ?? porDefecto.fin
  const dias = diasEntre(inicio, fin)
  const tramos = dias === null ? 0 : Math.ceil(dias / DIAS_POR_TRAMO)

  const problema = !inicio || !fin
    ? 'Elige las dos fechas.'
    : inicio > fin
      ? 'La fecha de inicio no puede ser posterior a la de fin.'
      : inicio > hoy
        ? 'La fecha de inicio no puede ser futura.'
        : dias !== null && dias > MAX_DIAS
          ? `El rango tiene ${dias} días y el máximo es ${MAX_DIAS}.`
          : null

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!problema) onDescargar({ inicio, fin })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Descargar de la NVD</CardTitle>
        <CardDescription>Trae los CVE publicados en un rango de fechas y los deja como el conjunto de análisis.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Publicados desde" htmlFor="descarga-inicio">
              <SelectorFecha id="descarga-inicio" valor={inicio} onCambio={setInicio} disabled={ocupado} max={hoy} />
            </Campo>
            <Campo etiqueta="Publicados hasta" htmlFor="descarga-fin">
              <SelectorFecha id="descarga-fin" valor={fin} onCambio={setFin} disabled={ocupado} max={hoy} />
            </Campo>
          </div>
          <p className="m-0 text-sm text-muted-foreground" aria-live="polite">
            {problema ? (
              <span className="text-destructive">{problema}</span>
            ) : dias !== null && tramos > 1 ? (
              `Son ${dias} días y la NVD acepta ${DIAS_POR_TRAMO} por consulta: se descargará en ${tramos} tramos y tardará más.`
            ) : dias !== null ? (
              `Son ${dias} días: una sola consulta (la NVD acepta hasta ${DIAS_POR_TRAMO}).`
            ) : null}
          </p>
          <Button type="submit" disabled={ocupado || problema !== null}>
            {ocupado ? 'Descargando…' : 'Descargar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
