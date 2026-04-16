import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { EmpleadoForm } from '@/components/forms/empleado-form'

export default async function NuevoEmpleadoPage() {
  const supabase = await createClient()
  const { data: cargos } = await supabase
    .from('cargos')
    .select('*')
    .eq('is_active', true)
    .order('nombre')

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Empleados', href: '/empleados' },
        { label: 'Nuevo Empleado' },
      ]} />

      <div>
        <h1 className="text-3xl font-bold">Nuevo Empleado</h1>
        <p className="text-muted-foreground">Registra los datos del nuevo trabajador</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ficha del empleado</CardTitle>
          <CardDescription>Completa los datos personales, laborales y bancarios</CardDescription>
        </CardHeader>
        <CardContent>
          <EmpleadoForm cargos={cargos ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
