// ─── Especificaciones de plantillas Excel por tipo ───────────────────────────
// Nombre canónico de la hoja y headers de primera fila, en el orden esperado.
// Usados tanto para validación frontend ligera como para descarga de plantillas.

import type { TipoPlantilla } from './types'

export interface TemplateSpec {
  sheetName: string
  headers: string[]
  label: string           // label legible para mensajes al usuario
}

export const TEMPLATE_SPECS: Record<TipoPlantilla, TemplateSpec> = {
  portafolio: {
    sheetName: 'Portafolio',
    headers: ['EAN', 'SKU', 'Producto', 'Marca', 'Categoría', 'PVP Sugerido', 'Costo Variable', 'Peso Profit Pool', 'IVA'],
    label: 'Portafolio',
  },
  categorias: {
    sheetName: 'Categorías',
    headers: ['Categoría', 'IVA (%)'],
    label: 'Categorías',
  },
  competidores: {
    sheetName: 'Competidores',
    headers: ['EAN Propio', 'EAN Competidor', 'Tipo Competidor', 'Marca Competidor', 'Retailer', 'País', 'Es Principal'],
    label: 'Competidores',
  },
  atributos: {
    sheetName: 'Atributos',
    headers: ['Categoría', 'Atributo', 'Peso (%)'],
    label: 'Atributos',
  },
  // FIXME 2026-04-28: doc 02 §8 dice formato largo (4 cols), código usa formato ancho (5 cols).
  // Decisión funcional pendiente con José antes de unificar.
  calificaciones: {
    sheetName: 'Calificaciones',
    headers: ['EAN', 'Atributo', 'Calificación Propia', 'Competidor', 'Calificación Competidor'],
    label: 'Calificaciones',
  },
  elasticidad: {
    sheetName: 'Elasticidad',
    headers: ['EAN', 'Coeficiente Elasticidad'],
    label: 'Elasticidad',
  },
  canales: {
    sheetName: 'Canales',
    headers: ['Canal', 'Categoría', 'Margen (%)'],
    label: 'Canales',
  },
  competencia: {
    sheetName: 'Competencia',
    headers: ['EAN', 'Producto', 'Marca', 'Categoría', 'PVP Referencia'],
    label: 'Competencia (SKUs)',
  },
  // ─── Vertical Educación ────────────────────────────────────────────────────
  programas: {
    sheetName: 'Programas',
    headers: ['Código Programa', 'Nombre', 'Facultad/Escuela', 'Nivel Educativo', 'Ciudad', 'Precio Actual'],
    label: 'Programas',
  },
  facultades_escuelas: {
    sheetName: 'Facultades',
    headers: ['Facultad/Escuela'],
    label: 'Facultades/Escuelas',
  },
  niveles_educativos: {
    sheetName: 'Niveles',
    headers: ['Nivel Educativo'],
    label: 'Niveles Educativos',
  },
  ciudades: {
    sheetName: 'Ciudades',
    headers: ['Ciudad'],
    label: 'Ciudades',
  },
  atributos_r010: {
    sheetName: 'Atributos',
    headers: ['Facultad/Escuela', 'Ciudad', 'Atributo', 'Peso (%)'],
    label: 'Atributos de Valor Percibido',
  },
  calificaciones_edu: {
    sheetName: 'Calificaciones',
    headers: ['Programa', 'Atributo', 'Tipo (propio|competidor)', 'Código SNIES', 'Calificación'],
    label: 'Calificaciones Edu',
  },
  asignaciones_snies: {
    sheetName: 'Asignaciones SNIES',
    headers: ['Programa Propio (Nombre + Ciudad)', 'Código SNIES Competidor'],
    label: 'Asignaciones SNIES',
  },
  snies_update: {
    sheetName: 'SNIES',
    headers: ['Código SNIES', 'Programa', 'Universidad', 'Ciudad', 'Nivel', 'Modalidad', 'Precio Actual'],
    label: 'Actualizar Base SNIES',
  },
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024            // 10 MB — plantillas operativas (UploadPlantillaModal, matrices)
export const MAX_SCRAPER_FILE_SIZE_BYTES = 30 * 1024 * 1024    // 30 MB — archivos wide single-table del scraper (decisión #7 — 2026-05-04)
