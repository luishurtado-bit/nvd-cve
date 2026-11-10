
import { useEffect, useState } from 'react'

interface Salud {
  estado: string
}

export default function App() {
  const [estado, setEstado] = useState<string>('consultando…')

  useEffect(() => {
    fetch('/api/salud')
      .then((r) => r.json() as Promise<Salud>)
      .then((d) => setEstado(d.estado))
      .catch(() => setEstado('sin conexión con el backend'))
  }, [])

  return <h1>Backend: {estado}</h1>
}
