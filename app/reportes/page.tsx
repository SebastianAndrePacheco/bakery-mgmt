import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Reportes y análisis del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Los reportes estarán disponibles pronto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            En construcción...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
