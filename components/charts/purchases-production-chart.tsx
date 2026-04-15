'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/utils/helpers/currency'

interface DataPoint {
  week: string
  compras: number
  produccion: number
}

interface PurchasesProductionChartProps {
  data: DataPoint[]
}

export function PurchasesProductionChart({ data }: PurchasesProductionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos en las últimas 8 semanas
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCompras" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradProduccion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value ?? 0)),
            name === 'compras' ? 'Compras' : 'Costo Producción',
          ]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Legend
          formatter={(v) => v === 'compras' ? 'Compras' : 'Costo Producción'}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Area type="monotone" dataKey="compras"    stroke="#3b82f6" fill="url(#gradCompras)"    strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="produccion" stroke="#a855f7" fill="url(#gradProduccion)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
