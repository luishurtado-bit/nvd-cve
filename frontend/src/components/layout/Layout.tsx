import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChartColumn, Combine, Database, LayoutDashboard, Moon, Percent, Scale, ShieldAlert, SlidersHorizontal, Sun } from 'lucide-react'
import { api } from '@/api/cliente'
import BarraContexto from '@/components/layout/BarraContexto'
import PieFuente from '@/components/layout/PieFuente'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTema } from '@/hooks/use-tema'
import { cn } from '@/lib/utils'

const enlaces = [
  { ruta: '/', texto: 'Inicio', titulo: 'Dashboard de vulnerabilidades CVE', icono: LayoutDashboard },
  { ruta: '/datos', texto: 'Datos y calidad', titulo: 'Carga y calidad de los datos', icono: Database },
  { ruta: '/descriptivo', texto: 'Descriptivo', titulo: 'Análisis descriptivo', icono: SlidersHorizontal },
  { ruta: '/eventos', texto: 'Eventos', titulo: 'Datos y eventos A, B y C', icono: Combine },
  { ruta: '/reglas', texto: 'Reglas', titulo: 'Reglas de probabilidad', icono: Scale },
  {
    ruta: '/bayes',
    texto: 'Bayes',
    titulo: 'Probabilidad condicional y teorema de Bayes',
    icono: Percent,
  },
  { ruta: '/binomial', texto: 'Binomial', titulo: 'Distribución binomial', icono: ChartColumn },
]

type EstadoBackend = 'consultando…' | 'ok' | 'sin conexión'

/** `/` solo es la portada; las demás rutas también cubren lo que cuelga de ellas (`/datos/calidad`). */
function esActiva(pathname: string, ruta: string): boolean {
  return ruta === '/' ? pathname === '/' : pathname === ruta || pathname.startsWith(`${ruta}/`)
}

export default function Layout() {
  const { tema, alternar } = useTema()
  const { pathname } = useLocation()
  const tituloPagina = enlaces.find((e) => esActiva(pathname, e.ruta))?.titulo ?? 'NVD/CVE'
  const [backend, setBackend] = useState<EstadoBackend>('consultando…')

  useEffect(() => {
    api
      .salud()
      .then((s) => setBackend(s.estado === 'ok' ? 'ok' : 'sin conexión'))
      .catch(() => setBackend('sin conexión'))
  }, [])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-1 p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">

          <ShieldAlert className="hidden size-5 group-data-[collapsible=icon]:block" aria-label="NVD/CVE" />
          <span className="text-base font-semibold leading-tight group-data-[collapsible=icon]:hidden">
            NVD/CVE
          </span>
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Análisis estadístico de vulnerabilidades
          </span>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {enlaces.map((e) => (
                  <SidebarMenuItem key={e.ruta}>
                    <SidebarMenuButton
                      isActive={esActiva(pathname, e.ruta)}
                      tooltip={e.texto}
                      render={<Link to={e.ruta} />}
                    >
                      <e.icono />
                      <span>{e.texto}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3 p-4 group-data-[collapsible=icon]:p-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <span>Backend</span>
            <Badge
              variant={backend === 'sin conexión' ? 'destructive' : 'secondary'}
              className={cn(
                backend === 'ok' &&
                  'bg-green-600/15 text-green-700 dark:bg-green-500/20 dark:text-green-400',
              )}
            >
              {backend}
            </Badge>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <div
                  className="hidden items-center justify-center py-1 group-data-[collapsible=icon]:flex"
                  aria-label={`Backend: ${backend}`}
                />
              }
            >
              <span
                className={cn(
                  'size-2.5 rounded-full',
                  backend === 'ok' && 'bg-green-600 dark:bg-green-500',
                  backend === 'sin conexión' && 'bg-destructive',
                  backend === 'consultando…' && 'bg-muted-foreground',
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="right">Backend: {backend}</TooltipContent>
          </Tooltip>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Barra superior con el botón para abrir/cerrar la sidebar (Ctrl+B también la alterna) */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background px-4 py-2">
          <SidebarTrigger />
          <h1 className="m-0 min-w-0 truncate text-base font-semibold tracking-tight text-blue-900 dark:text-blue-300">
            {tituloPagina}
          </h1>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={alternar}
                  aria-label={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                />
              }
            >
              {tema === 'dark' ? <Sun /> : <Moon />}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </TooltipContent>
          </Tooltip>
        </header>
        <BarraContexto />
        <div className="mx-auto w-full max-w-[90rem] flex-1 p-6">
          <Outlet />
        </div>
        <PieFuente />
      </SidebarInset>
      <Toaster position="top-right" />
    </SidebarProvider>
  )
}
