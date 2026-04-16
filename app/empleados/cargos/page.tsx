import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CargosManager } from '@/components/forms/cargos-manager'

export default async function CargosPage() {
  const supabase = await createClient()
  const { data: cargos } = await supabase
    .from('cargos')
    .select('*')
    .order('nombre')

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Empleados', href: '/empleados' },
        { label: 'Cargos' },
      ]} />

      <div>
        <h1 className="text-3xl font-bold">Cargos</h1>
        <p className="text-muted-foreground">Catálogo de puestos disponibles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Cargos</CardTitle>
        </CardHeader>
        <CardContent>
          <CargosManager cargos={cargos ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
