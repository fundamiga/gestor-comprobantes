import { TIPOS_DOCUMENTO } from "@/lib/constantes";
import type { Lote, EstadoLote } from "@/types";

/** Convierte un File a dataUrl base64 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Calcula el estado de completitud de un lote */
export function calcularEstadoLote(lote: Lote): EstadoLote {
  const requeridos = TIPOS_DOCUMENTO.filter((t) => t.requerido);
  const cargados = requeridos.filter((t) => {
    const docs = lote.documentos[t.id] ?? [];
    const min = t.minArchivos ?? 1;
    if (min === 2) {
      if (docs.length < 2) return false;
      const gruposMap: { [key: string]: number } = {};
      docs.forEach((d) => {
        const gid = d.grupoId || "grupo_inicial";
        gruposMap[gid] = (gruposMap[gid] ?? 0) + 1;
      });
      const algunGrupoIncompleto = Object.values(gruposMap).some((count) => count === 1);
      return !algunGrupoIncompleto;
    }
    return docs.length >= min;
  });
  if (cargados.length === requeridos.length) return "completo";
  const algunArchivo = Object.values(lote.documentos).some((d) => d.length > 0);
  if (!algunArchivo) return "vacio";
  return "incompleto";
}

/** Devuelve el color de acento según el estado */
export function colorEstado(estado: EstadoLote): string {
  if (estado === "completo")   return "#10b981";
  if (estado === "incompleto") return "#f59e0b";
  return "#cbd5e1";
}

/** Devuelve la etiqueta legible del estado */
export function labelEstado(estado: EstadoLote): string {
  if (estado === "completo")   return "Completo";
  if (estado === "incompleto") return "Incompleto";
  return "Sin documentos";
}

/** Genera un id único */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Formatea un número de bytes a KB legible */
export function formatKb(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Inserta la bandera de descarga fl_attachment en urls de Cloudinary */
export function obtenerUrlDescargaCloudinary(url: string): string {
  if (url && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
}
