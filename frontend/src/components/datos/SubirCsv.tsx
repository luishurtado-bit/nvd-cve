import { useState, type DragEvent } from 'react'
import { FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/cliente'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDatos } from '@/contexto/datos'
import { mensajeDe } from '@/lib/dominio'
import { numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

const esCsv = (archivo: File) => archivo.name.toLowerCase().endsWith('.csv')

/** Carga un CSV propio o uno de los que guarda la aplicación en `data/`. Se elige con el teclado o se arrastra. */
export default function SubirCsv() {
  const { alCargar } = useDatos()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function elegir(nuevo: File | null | undefined) {
    if (!nuevo) return
    if (!esCsv(nuevo)) {
      setError('El archivo debe ser un CSV (.csv).')
      return
    }
    setError(null)
    setArchivo(nuevo)
  }

  function soltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setArrastrando(false)
    elegir(e.dataTransfer.files[0])
  }

  async function subir() {
    if (!archivo) return
    setError(null)
    setSubiendo(true)
    try {
      const resumen = await api.datos.archivo(archivo)
      alCargar(resumen)
      toast(`«${archivo.name}» cargado: ${numero(resumen.N)} CVE con puntuación.`)
      setArchivo(null)
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir un CSV</CardTitle>
        <CardDescription>
          Sirve cualquier CSV guardado por la aplicación o uno propio con, al menos, las columnas cve_id, publicado, base_score,
          vector_ataque y privilegios.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* El input está oculto a la vista pero no al teclado: con Tab se enfoca y con Enter se abre el selector */}
        <label
          htmlFor="archivo-csv"
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring',
            arrastrando ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60',
          )}
        >
          <FileUp aria-hidden="true" className="size-6 text-muted-foreground" />
          <span className="font-medium">{archivo ? archivo.name : 'Elige un archivo .csv o arrástralo aquí'}</span>
          {archivo ? <span className="text-xs text-muted-foreground">{numero(Math.max(1, Math.round(archivo.size / 1024)))} KB</span> : null}
          <input id="archivo-csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => elegir(e.target.files?.[0])} />
        </label>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="button" onClick={subir} disabled={!archivo || subiendo}>
          {subiendo ? 'Subiendo…' : 'Subir CSV'}
        </Button>
      </CardContent>
    </Card>
  )
}
