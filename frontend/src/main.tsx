import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './tailwind.css'
import App from './App.tsx'
import { DatosProvider } from './contexto/DatosProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DatosProvider>
        <App />
      </DatosProvider>
    </BrowserRouter>
  </StrictMode>,
)
