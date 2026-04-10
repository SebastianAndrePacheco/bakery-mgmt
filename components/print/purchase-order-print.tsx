'use client'

import { PurchaseOrder, Supplier } from '@/utils/types/database.types'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'

interface PurchaseOrderPrintProps {
  order: PurchaseOrder & { supplier?: Supplier }
  items: any[]
}

export function PurchaseOrderPrint({ order, items }: PurchaseOrderPrintProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <button
        onClick={handlePrint}
        className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 print:hidden"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Imprimir
      </button>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>

      {/* Área de impresión (oculta en pantalla) */}
      <div id="print-area" className="hidden print:block">
        <div className="max-w-4xl mx-auto p-8 bg-white">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">ORDEN DE COMPRA</h1>
                <p className="text-lg font-mono mt-2">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Fecha de Orden</p>
                <p className="text-lg font-semibold">{formatDate(order.order_date)}</p>
              </div>
            </div>
          </div>

          {/* Información del Proveedor */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-3">Proveedor</h2>
            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-lg">{order.supplier?.business_name}</p>
              {order.supplier?.ruc && (
                <p className="text-sm text-slate-600">RUC: {order.supplier.ruc}</p>
              )}
              <p className="text-sm text-slate-600">Contacto: {order.supplier?.contact_name}</p>
              <p className="text-sm text-slate-600">Teléfono: {order.supplier?.phone}</p>
              {order.supplier?.email && (
                <p className="text-sm text-slate-600">Email: {order.supplier.email}</p>
              )}
              {order.supplier?.address && (
                <p className="text-sm text-slate-600">Dirección: {order.supplier.address}</p>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-slate-700">Fecha de Orden:</p>
              <p className="text-base">{formatDate(order.order_date)}</p>
            </div>
            {order.expected_delivery_date && (
              <div>
                <p className="text-sm font-bold text-slate-700">Entrega Esperada:</p>
                <p className="text-base">{formatDate(order.expected_delivery_date)}</p>
              </div>
            )}
          </div>

          {/* Tabla de Items */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-3">Detalle de Insumos</h2>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left text-sm font-bold">Código</th>
                  <th className="border border-slate-300 px-3 py-2 text-left text-sm font-bold">Descripción</th>
                  <th className="border border-slate-300 px-3 py-2 text-right text-sm font-bold">Cantidad</th>
                  <th className="border border-slate-300 px-3 py-2 text-right text-sm font-bold">Precio Unit.</th>
                  <th className="border border-slate-300 px-3 py-2 text-right text-sm font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index) => (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-3 py-2 text-sm">{item.supply.code}</td>
                    <td className="border border-slate-300 px-3 py-2 text-sm">
                      {item.supply.name}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                      {item.quantity} {item.supply.unit?.symbol}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right font-semibold">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-slate-300">
                <span className="text-sm font-bold">Subtotal:</span>
                <span className="text-sm">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-300">
                <span className="text-sm font-bold">IGV (18%):</span>
                <span className="text-sm">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between py-3 bg-slate-100 px-3 mt-2">
                <span className="text-base font-bold">TOTAL:</span>
                <span className="text-base font-bold">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Documentos (si ya fue recibido) */}
          {order.guia_remision && (
            <div className="mb-6 p-4 border-2 border-slate-300 rounded">
              <h2 className="text-sm font-bold text-slate-700 uppercase mb-3">Documentos de Recepción</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold">Guía de Remisión:</p>
                  <p>{order.guia_remision}</p>
                </div>
                {order.comprobante_serie && (
                  <div>
                    <p className="font-bold">Comprobante:</p>
                    <p>{order.comprobante_tipo?.toUpperCase()} {order.comprobante_serie}-{order.comprobante_numero}</p>
                  </div>
                )}
                {order.comprobante_fecha && (
                  <div>
                    <p className="font-bold">Fecha de Emisión:</p>
                    <p>{formatDate(order.comprobante_fecha)}</p>
                  </div>
                )}
                {order.actual_delivery_date && (
                  <div>
                    <p className="font-bold">Fecha de Recepción:</p>
                    <p>{formatDate(order.actual_delivery_date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          {order.notes && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase mb-2">Observaciones</h2>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}

          {/* Firmas */}
          <div className="mt-12 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-2 mt-16">
                <p className="text-sm font-bold">Recibido por</p>
                <p className="text-xs text-slate-600">Nombre y Firma</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-2 mt-16">
                <p className="text-sm font-bold">Entregado por</p>
                <p className="text-xs text-slate-600">Nombre y Firma</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-slate-500">
            <p>Documento generado el {new Date().toLocaleDateString('es-PE')}</p>
          </div>
        </div>
      </div>
    </>
  )
}
