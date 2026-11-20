import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChartColumn, Combine, Database, Moon, Percent, Scale, Sun } from 'lucide-react'
import { api } from '@/api/cliente'
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
      <Sidebar>
        <SidebarHeader className="gap-1 p-4">
          <span className="text-base font-semibold leading-tight">NVD/CVE</span>
          <span className="text-xs text-muted-foreground">
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

        <SidebarFooter className="gap-3 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
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
          <Button type="button" variant="outline" onClick={alternar}>
            {tema === 'dark' ? <Sun /> : <Moon />}
            {tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Barra superior solo en móvil, para abrir la sidebar */}
        <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">NVD/CVE</span>
        </div>
        <div className="mx-auto w-full max-w-[90rem] p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster position="top-right" />
    </SidebarProvider>
  )
}
