import { Link } from 'react-router-dom'
import type { ResumenDatos } from '@/api/tipos'
import { numero, periodo } from '@/lib/formato'

/** Lo que hay que tener presente al leer las cifras. El texto es fijo; los números salen del resumen cargado. */
export default function Limitaciones({ resumen }: { resumen: ResumenDatos }) {
  const fuera = resumen.descargados - resumen.N
  return (
    <details className="rounded-lg border bg-card px-4 py-3 text-sm">
      <summary className="cursor-pointer select-none font-medium">Limitaciones de los datos</summary>
      <ul className="mt-3 mb-0 grid gap-2 pl-5">
        <li>
          Es un solo periodo ({periodo(resumen.periodo)}): las conclusiones valen solo para él.
        </li>
        <li>
          Solo se analizan los CVE con puntuación CVSS. De {numero(resumen.descargados)} descargados quedaron fuera{' '}
          {numero(fuera)}: {numero(resumen.rechazados)} rechazados, {numero(resumen.duplicados)} repetidos,{' '}
          {numero(resumen.sin_puntuacion)} sin puntuación y {numero(resumen.formato_invalido)} con una puntuación inválida.
        </li>
        <li>
          Desde abril de 2026 el NIST no enriquece todos los CVE: parte de las puntuaciones las pone quien publicó el CVE (la CNA).
        </li>
        <li>
          Conviven las versiones 3.1, 3.0 y 4.0 de CVSS; se usa una sola puntuación por CVE (la 3.1 si existe, luego la 3.0 y la 4.0).
        </li>
        <li>
          La relación entre el vector de ataque, los privilegios y lo crítico viene del propio cálculo del CVSS: es una observación,
          no una causa.
        </li>
      </ul>
      <p className="mt-3 mb-0">
        <Link to="/datos?pestana=calidad" className="underline underline-offset-2">
          Ver cómo se limpiaron los datos, paso a paso →
        </Link>
      </p>
    </details>
  )
}
