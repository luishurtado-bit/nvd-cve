import { NavLink, Outlet } from 'react-router-dom'

const enlaces = [
  { ruta: '/eventos', texto: 'Eventos' },
  { ruta: '/reglas', texto: 'Reglas' },
  { ruta: '/bayes', texto: 'Bayes' },
  { ruta: '/binomial', texto: 'Binomial' },
]

export default function Layout() {
  return (
    <div>
      <header>
        <h1>Análisis estadístico de vulnerabilidades NVD/CVE</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
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