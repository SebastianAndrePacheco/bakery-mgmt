import { SidebarWrapper } from '@/components/layouts/sidebar-wrapper'
import { Header } from '@/components/layouts/header'

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SidebarWrapper />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
