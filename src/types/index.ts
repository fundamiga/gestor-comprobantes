// Tipos de documento reconocidos en el sistema
export interface TipoDocumento {
  id: string;
  label: string;
  nombre: string;
  descripcion: string;
  requerido: boolean;
  color: string;
  minArchivos?: number;
  ayudaPareja?: string;
}

// Un archivo subido (foto o PDF), información ligera
export interface ArchivoSubido {
  id: string;
  nombre: string;
  tipo: string; // MIME type: "image/jpeg", "application/pdf", etc.
  url: string;  // URL de Cloudinary
  fechaSubida: string;
  tamanioKb: number;
  grupoId?: string;
  grupoNombre?: string;
}

// Colección de archivos agrupada por tipo de documento
export type DocumentosLote = {
  [tipoId: string]: ArchivoSubido[];
};

// Un lote = un proveedor/concepto dentro de un período
export interface Lote {
  id: string;
  proveedor: string;
  referencia: string;
  tipoPago: string;
  fechaCreacion: string;
  documentos: DocumentosLote;
}

// Un período = un mes/año
export interface Periodo {
  id: string;
  mes: number;   // 0 = Enero ... 11 = Diciembre
  anio: number;
  lotes: Lote[];
}

// Estado de completitud de un lote
export type EstadoLote = "completo" | "incompleto" | "vacio";
