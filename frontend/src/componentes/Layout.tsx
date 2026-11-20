import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChartColumn, Combine, Database, Moon, Percent, Scale, ShieldAlert, Sun } from 'lucide-react'
import { api } from '@/api/cliente'
import { Badge } from '@/components/ui/badge'
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
  { ruta: '/datos', texto: 'Datos y dashboard', icono: Database },
  { ruta: '/eventos', texto: 'Eventos', icono: Combine },
  { ruta: '/reglas', texto: 'Reglas', icono: Scale },
  { ruta: '/bayes', texto: 'Bayes', icono: Percent },
  { ruta: '/binomial', texto: 'Binomial', icono: ChartColumn },
]

type EstadoBackend = 'consultando…' | 'ok' | 'sin conexión'

export default function Layout() {
  const { tema, alternar } = useTema()
  const { pathname } = useLocation()
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
                      isActive={pathname.startsWith(e.ruta)}
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

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={alternar}
                tooltip={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                className="border"
              >
                {tema === 'dark' ? <Sun /> : <Moon />}
                <span>{tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Barra superior con el botón para abrir/cerrar la sidebar (Ctrl+B también la alterna) */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <span className="text-sm font-semibold md:hidden">NVD/CVE</span>
        </div>
        <div className="mx-auto w-full max-w-[90rem] p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster position="top-right" />
    </SidebarProvider>
  )
}
