import { z } from 'zod'

// ─── Átomos reutilizables ─────────────────────────────────────────────────────

export const eanSchema = z
  .string()
  .trim()
  .min(1, 'El EAN es requerido')
  .regex(/^\d+$/, 'Solo se permiten dígitos')
  .refine(v => v.length === 8 || v.length === 13, 'Debe tener 8 o 13 dígitos (EAN-8 / EAN-13)')

export const nombreSkuSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es requerido')
  .min(3, 'Mínimo 3 caracteres')
  .max(100, 'Máximo 100 caracteres')

// ─── Schema de SKU con contexto externo ──────────────────────────────────────

/**
 * Construye el schema para SkuModal.
 * La salida es SkuFormValues (todos strings) para mantener compatibilidad
 * con el consumidor PropiosTab que hace parseFloat() por su cuenta.
 *
 * Validaciones cruzadas vía superRefine:
 *  - EAN único contra existingEans
 *  - Si variant === 'propios': pvp > 0, costo > 0, costo < pvp, peso 0..100
 */
export function makeSkuSchema(opts: {
  variant: 'propios' | 'competencia'
  existingEans: string[]
}) {
  const { variant, existingEans } = opts

  return z
    .object({
      ean: z.string().trim(),
      nombre: z.string().trim(),
      marca: z.string().trim(),
      categoria: z.string(),
      pvpSugerido: z.string(),
      costoVariable: z.string(),
      pesoProfitPool: z.string(),
    })
    .superRefine((data, ctx) => {
      // ── EAN ────────────────────────────────────────────────────────────────
      const ean = data.ean
      if (!ean) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ean'], message: 'El EAN es requerido' })
      } else if (!/^\d+$/.test(ean)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ean'], message: 'Solo se permiten dígitos' })
      } else if (ean.length !== 8 && ean.length !== 13) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ean'],
          message: 'Debe tener 8 o 13 dígitos (EAN-8 / EAN-13)',
        })
      } else if (existingEans.includes(ean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ean'],
          message: 'Ya existe un producto con este EAN',
        })
      }

      // ── Nombre ────────────────────────────────────────────────────────────
      const nombre = data.nombre
      if (!nombre) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'El nombre es requerido' })
      } else if (nombre.length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'Mínimo 3 caracteres' })
      } else if (nombre.length > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'Máximo 100 caracteres' })
      }

      // ── Marca ─────────────────────────────────────────────────────────────
      if (!data.marca.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['marca'], message: 'La marca es requerida' })
      }

      // ── Categoría ─────────────────────────────────────────────────────────
      if (!data.categoria) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['categoria'], message: 'La categoría es requerida' })
      }

      // ── Campos solo para variante propios ─────────────────────────────────
      if (variant === 'propios') {
        const pvp = parseFloat(data.pvpSugerido)
        const costo = parseFloat(data.costoVariable)
        const peso = parseFloat(data.pesoProfitPool)

        if (!data.pvpSugerido || isNaN(pvp) || pvp <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pvpSugerido'], message: 'Debe ser mayor a 0' })
        }

        if (!data.costoVariable || isNaN(costo) || costo <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['costoVariable'], message: 'Debe ser mayor a 0' })
        } else if (!isNaN(pvp) && pvp > 0 && costo >= pvp) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['costoVariable'],
            message: 'Debe ser menor al PVP Sugerido',
          })
        }

        if (data.pesoProfitPool === '' || isNaN(peso) || peso < 0 || peso > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pesoProfitPool'],
            message: 'Debe estar entre 0 y 100',
          })
        }
      }
    })
}

export type SkuSchema = ReturnType<typeof makeSkuSchema>

// ─── Schema de Categoría ──────────────────────────────────────────────────────

/**
 * Construye el schema para CategoriaModal.
 * - nombre: requerido, único contra existingNombres (el propio se excluye en edit)
 * - iva: número en [0, 100] (porcentaje, p.ej. 19 para 19%). Permite 0.
 */
export function makeCategoriaSchema(opts: { existingNombres: string[] }) {
  const { existingNombres } = opts

  return z
    .object({
      nombre: z.string(),
      iva: z.string(),
    })
    .superRefine((data, ctx) => {
      // ── Nombre ────────────────────────────────────────────────────────────
      if (!data.nombre.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'El nombre es requerido' })
      } else if (existingNombres.includes(data.nombre.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'Ya existe una categoría con este nombre' })
      }

      // ── IVA ───────────────────────────────────────────────────────────────
      const ivaNum = parseFloat(data.iva)
      if (data.iva === '' || isNaN(ivaNum)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['iva'], message: 'El IVA es requerido' })
      } else if (ivaNum < 0 || ivaNum > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['iva'], message: 'Debe estar entre 0 y 100' })
      }
    })
}

export type CategoriaSchema = ReturnType<typeof makeCategoriaSchema>

// ─── Schema de Canal / Margen ─────────────────────────────────────────────────

/**
 * Construye el schema para CanalMargenModal.
 * - nombre: requerido y único (case-insensitive) solo cuando mode === 'add'
 * - margen: número en [1, 100] (porcentaje)
 * El mode se infiere por el comportamiento original: existingNombres vacío en edit
 * no aplica la validación de unicidad; se controla externamente pasando la lista.
 */
export function makeCanalMargenSchema(opts: {
  existingNombres: string[]
  isAdd: boolean
}) {
  const { existingNombres, isAdd } = opts

  return z
    .object({
      nombre: z.string(),
      margen: z.string(),
    })
    .superRefine((data, ctx) => {
      // ── Nombre (solo en add) ──────────────────────────────────────────────
      if (isAdd) {
        if (!data.nombre.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'El nombre es requerido' })
        } else if (existingNombres.map(n => n.toLowerCase()).includes(data.nombre.trim().toLowerCase())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'Ya existe un canal con este nombre' })
        }
      }

      // ── Margen ────────────────────────────────────────────────────────────
      const n = parseFloat(data.margen)
      if (isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['margen'], message: 'El margen es requerido' })
      } else if (n < 1 || n > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['margen'], message: 'Debe estar entre 1 y 100' })
      }
    })
}

export type CanalMargenSchema = ReturnType<typeof makeCanalMargenSchema>

// ─── Schema de Retailer ───────────────────────────────────────────────────────

/**
 * Construye el schema para RetailerModal.
 * - nombre: requerido, único case-insensitive contra existingNombres (el propio se excluye en edit)
 */
export function makeRetailerSchema(opts: { existingNombres: string[] }) {
  const { existingNombres } = opts

  return z
    .object({
      nombre: z.string(),
    })
    .superRefine((data, ctx) => {
      if (!data.nombre.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'El nombre es requerido' })
      } else if (existingNombres.map(n => n.toLowerCase()).includes(data.nombre.trim().toLowerCase())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nombre'], message: 'Ya existe un retailer con este nombre' })
      }
    })
}

export type RetailerSchema = ReturnType<typeof makeRetailerSchema>

// ─── Schema de Atributos por categoría ───────────────────────────────────────

/**
 * Valida la lista de atributos de una categoría.
 * - nombre: requerido, no vacío
 * - peso: número [0, 1] (decimales, no porcentaje)
 * - La suma de todos los pesos debe ser exactamente 1.0 (tolerancia ±0.0001)
 *
 * Se usa antes de PATCH — el estado local usa useState, no RHF, porque la
 * lista es dinámica (N filas) y no hay validación cruzada visible por campo.
 */
export const atributosSchema = z
  .object({
    atributos: z
      .array(
        z.object({
          nombre: z.string().trim().min(1, 'El nombre es requerido'),
          peso: z
            .number('El peso debe ser un número')
            .min(0, 'El peso no puede ser negativo')
            .max(1, 'El peso no puede superar 1 (100%)'),
          orden: z.number(),
        }),
      )
      .min(1, 'Debe haber al menos un atributo'),
  })
  .superRefine((data, ctx) => {
    const suma = data.atributos.reduce((acc, a) => acc + a.peso, 0)
    if (Math.abs(suma - 1.0) > 0.0001) {
      ctx.addIssue({
        code: 'custom',
        path: ['atributos'],
        message: `Los pesos deben sumar exactamente 100% (actualmente ${(suma * 100).toFixed(4)}%)`,
      })
    }
  })

export type AtributosInput = z.input<typeof atributosSchema>
export type AtributosOutput = z.output<typeof atributosSchema>

// ─── Schema de Umbrales ───────────────────────────────────────────────────────

/**
 * Valida los umbrales de alerta de precios.
 * - umbralSuperior y umbralInferior: número en [0.01, 0.30] (1%–30%)
 * - umbralSuperior > umbralInferior (no es requerimiento de negocio rígido,
 *   pero sí semántico: la zona de alerta alta debe ser distinta de la baja)
 *
 * El UI usa slider paso 0.5 sobre [1,30] y divide /100, por lo que el rango
 * real en el dominio es [0.01, 0.30].
 */
export const umbralesSchema = z
  .object({
    umbralSuperior: z
      .number('El umbral debe ser un número')
      .min(0.01, 'El umbral mínimo es 1%')
      .max(0.30, 'El umbral máximo es 30%'),
    umbralInferior: z
      .number('El umbral debe ser un número')
      .min(0.01, 'El umbral mínimo es 1%')
      .max(0.30, 'El umbral máximo es 30%'),
  })
  .superRefine((data, ctx) => {
    if (data.umbralSuperior <= data.umbralInferior) {
      ctx.addIssue({
        code: 'custom',
        path: ['umbralSuperior'],
        message: 'El umbral superior debe ser mayor que el inferior',
      })
    }
  })

export type UmbralesInput = z.input<typeof umbralesSchema>
export type UmbralesOutput = z.output<typeof umbralesSchema>

// ─── Schema de Calificaciones ─────────────────────────────────────────────────

/**
 * Valida el mapa de calificaciones por atributo para un SKU y modo dado.
 * - Las calificaciones son números libres (no NaN, no Infinity)
 * - No hay rango fijo en el dominio — el VP resultante puede ser cualquier
 *   valor real (suma de peso × calificación)
 *
 * Decisión: sin rango max/min porque el tipo `number` del dominio no lo impone
 * y el UI no lo muestra. Se valida solo que no sean NaN/Infinity.
 */
export const calificacionesSchema = z.object({
  skuId: z.string().min(1),
  modo: z.enum(['propio', 'competidor']),
  competidorId: z.string().nullable(),
  calificaciones: z.record(
    z.string(),
    z
      .number('La calificación debe ser un número')
      .finite('La calificación no puede ser infinita'),
  ),
})

export type CalificacionesInput = z.input<typeof calificacionesSchema>
export type CalificacionesOutput = z.output<typeof calificacionesSchema>

// ─── Schema de Elasticidad ────────────────────────────────────────────────────

/**
 * Valida el coeficiente de elasticidad de un SKU.
 * - Puede ser negativo (bienes normales: precio ↑ → demanda ↓)
 * - No tiene cota superior ni inferior fija en el dominio del negocio
 * - Solo se valida que no sea NaN/Infinity
 *
 * Decisión: useState + validación al borde (no RHF) porque es un solo campo
 * numérico sin validación cruzada.
 */
export const elasticidadItemSchema = z.object({
  skuId: z.string().min(1),
  coeficiente: z
    .number('El coeficiente debe ser un número')
    .finite('El coeficiente no puede ser infinito'),
})

export type ElasticidadItemInput = z.input<typeof elasticidadItemSchema>
export type ElasticidadItemOutput = z.output<typeof elasticidadItemSchema>

// ─── Schema de Canales (edición in-place de margen) ──────────────────────────

/**
 * Valida el margen inline de un canal × categoría.
 * - margen: número en [0.0, 1.0] (fracción decimal, no porcentaje)
 *   El UI convierte de/a % internamente.
 *
 * Nota: CanalMargenModal ya usa makeCanalMargenSchema (string → número allá).
 * Este schema es para la validación al borde antes del PATCH cuando se edita
 * directamente en tabla (si se añade esa funcionalidad) o para guardar todo.
 */
export const canalMargenInlineSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del canal es requerido'),
  margen: z
    .number('El margen debe ser un número')
    .min(0, 'El margen no puede ser negativo')
    .max(1, 'El margen no puede superar 100%'),
})

export type CanalMargenInlineInput = z.input<typeof canalMargenInlineSchema>
export type CanalMargenInlineOutput = z.output<typeof canalMargenInlineSchema>
