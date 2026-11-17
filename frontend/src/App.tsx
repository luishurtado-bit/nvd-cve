import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout.tsx'
import Eventos from './paginas/Eventos.tsx'
import Reglas from './paginas/Reglas.tsx'
import Bayes from './paginas/Bayes.tsx'
import Binomial from './paginas/Binomial.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/eventos" replace />} />
        <Route path="eventos" element={<Eventos />} />
        <Route path="reglas" element={<Reglas />} />
        <Route path="bayes" element={<Bayes />} />
        <Route path="binomial" element={<Binomial />} />
      </Route>
    </Routes>
  )
}