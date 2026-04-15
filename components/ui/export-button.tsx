'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ExportColumn = {
  label: string
  key: string
  format?: (value: unknown, row: Record<string, unknown>) => string
}

interface ExportButtonProps {
  data: Record<string, unknown>[]
  columns: ExportColumn[]
  filename: string
  label?: string
}

function escapeCsv(val: unknown): string {
  const str = val == null ? '' : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function ExportButton({ data, columns, filename, label = 'Exportar CSV' }: ExportButtonProps) {
  const handleExport = () => {
    const header = columns.map(c => escapeCsv(c.label)).join(',')
    const rows = data.map(row =>
      columns.map(col => {
        const raw = row[col.key]
        const val = col.format ? col.format(raw, row) : raw
        return escapeCsv(val)
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
