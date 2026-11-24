import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Inicio from './paginas/Inicio.tsx'
import Datos from './paginas/Datos.tsx'
import Descriptivo from './paginas/Descriptivo.tsx'
import Eventos from './paginas/Eventos.tsx'
import Reglas from './paginas/Reglas.tsx'
import Bayes from './paginas/Bayes.tsx'
import Binomial from './paginas/Binomial.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="datos" element={<Datos />} />
        <Route path="descriptivo" element={<Descriptivo />} />
        <Route path="eventos" element={<Eventos />} />
        <Route path="reglas" element={<Reglas />} />
        <Route path="bayes" element={<Bayes />} />
        <Route path="binomial" element={<Binomial />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
