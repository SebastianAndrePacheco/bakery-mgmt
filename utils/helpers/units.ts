import { Unit } from '@/utils/types/database.types'

/**
 * Convierte una cantidad de una unidad a otra
 * @param quantity - Cantidad a convertir
 * @param fromUnit - Unidad origen
 * @param toUnit - Unidad destino
 * @returns Cantidad convertida o null si no es posible la conversión
 */
export function convertUnits(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number | null {
  // Si son la misma unidad, no hay conversión
  if (fromUnit.id === toUnit.id) {
    return quantity
  }

  // Verificar que sean del mismo tipo
  if (fromUnit.type !== toUnit.type) {
    console.error('No se pueden convertir unidades de diferentes tipos')
    return null
  }

  // Convertir a unidad base
  let quantityInBase = quantity
  if (fromUnit.base_unit_id && fromUnit.conversion_factor) {
    quantityInBase = quantity * fromUnit.conversion_factor
  }

  // Convertir de unidad base a unidad destino
  if (toUnit.base_unit_id && toUnit.conversion_factor) {
    return quantityInBase / toUnit.conversion_factor
  }

  // Si toUnit es la unidad base
  if (!toUnit.base_unit_id && fromUnit.base_unit_id === toUnit.id) {
    return quantityInBase
  }

  console.error('No se pudo realizar la conversión de unidades')
  return null
}

/**
 * Formatea una cantidad con su unidad
 * @param quantity - Cantidad numérica
 * @param unit - Unidad
 * @param decimals - Número de decimales (default: 2)
 */
export function formatQuantityWithUnit(
  quantity: number,
  unit: Unit,
  decimals: number = 2
): string {
  const formattedQuantity = quantity.toFixed(decimals)
  return `${formattedQuantity} ${unit.symbol}`
}

/**
 * Obtiene la unidad base de una unidad dada
 */
export function getBaseUnit(unit: Unit, allUnits: Unit[]): Unit {
  if (!unit.base_unit_id) {
    return unit
  }
  const baseUnit = allUnits.find(u => u.id === unit.base_unit_id)
  return baseUnit || unit
}
