import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../api/cliente.ts'

const enlaces = [
  { ruta: '/datos', texto: 'Datos y dashboard' },
  { ruta: '/eventos', texto: 'Eventos' },
  { ruta: '/reglas', texto: 'Reglas' },
  { ruta: '/bayes', texto: 'Bayes' },
  { ruta: '/binomial', texto: 'Binomial' },
]

type Tema = 'light' | 'dark'

function temaInicial(): Tema {
  const guardado = localStorage.getItem('tema')
  if (guardado === 'light' || guardado === 'dark') return guardado
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function Layout() {
  const [tema, setTema] = useState<Tema>(temaInicial)
  const [backend, setBackend] = useState<'consultando…' | 'ok' | 'sin conexión'>('consultando…')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  useEffect(() => {
    api
      .salud()
      .then((s) => setBackend(s.estado === 'ok' ? 'ok' : 'sin conexión'))
      .catch(() => setBackend('sin conexión'))
  }, [])

  return (
    <div>
      <header>
        <div className="encabezado-superior">
          <h1>Análisis estadístico de vulnerabilidades NVD/CVE</h1>
          <div className="encabezado-acciones">
            <button
              type="button"
              className="boton-tema"
              onClick={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {tema === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
            </button>
            <span className={`estado-backend ${backend === 'ok' ? 'ok' : 'error'}`}>
              Backend: {backend}
            </span>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {enlaces.map((e) => (
            <NavLink
              key={e.ruta}
              to={e.ruta}
              style={({ isActive }) => ({
                fontWeight: isActive ? 'bold' : 'normal',
              })}
            >
              {e.texto}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
