import { TIPOS_DOCUMENTO } from "@/lib/constantes";
import type { Lote, EstadoLote, Periodo, ArchivoSubido } from "@/types";

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

export interface AlertaConsecutivos {
  faltantes: number[];
  repetidos: number[];
  presentes: number[];
}

/** 
 * Analiza los números consecutivos de los archivos subidos por cada tipo de documento.
 * Extrae el número del nombre de la pareja o del nombre del archivo.
 */
export function analizarConsecutivos(periodo: Periodo): Record<string, AlertaConsecutivos> {
  const resultados: Record<string, AlertaConsecutivos> = {};

  TIPOS_DOCUMENTO.forEach((tipo) => {
    const numerosEncontrados: number[] = [];

    periodo.lotes.forEach((lote) => {
      const archivos = lote.documentos[tipo.id] || [];
      if (archivos.length === 0) return;

      if (tipo.minArchivos === 2) {
        // Por parejas: extraemos un solo número por cada grupo/pareja
        const gruposMap: { [key: string]: ArchivoSubido[] } = {};
        archivos.forEach((a) => {
          const gid = a.grupoId || "grupo_inicial";
          if (!gruposMap[gid]) gruposMap[gid] = [];
          gruposMap[gid].push(a);
        });

        Object.values(gruposMap).forEach((grupoArchivos) => {
          let num: number | null = null;
          // Buscamos el primer número en el nombre del grupo o en los nombres de los archivos
          const posiblesTextos = [
            grupoArchivos[0]?.grupoNombre || "",
            ...grupoArchivos.map((a) => a.nombre),
          ];

          for (const rawTexto of posiblesTextos) {
            // Ignorar el prefijo del tipo de documento (ej: "CC9") para no extraer el "9"
            const texto = rawTexto.replace(new RegExp(tipo.id, 'gi'), '');

            // Ignoramos el texto por defecto "Pareja X" si solo queremos números reales
            if (texto.startsWith("Pareja ")) {
              // Si el usuario no renombró la pareja y solo es "Pareja 1", no lo tomamos como número consecutivo real
              // a menos que sea el único texto disponible (mejor buscar en los archivos primero)
              continue;
            }
            const match = texto.match(/\d+/);
            if (match) {
              num = parseInt(match[0], 10);
              break; // Encontramos un número válido en este grupo
            }
          }

          // Si no encontramos número en el nombre renombrado ni en los archivos, probamos otra vez sin ignorar "Pareja X"
          if (num === null) {
            for (const rawTexto of posiblesTextos) {
              const texto = rawTexto.replace(new RegExp(tipo.id, 'gi'), '');
              const match = texto.match(/\d+/);
              if (match) {
                num = parseInt(match[0], 10);
                break;
              }
            }
          }

          if (num !== null) {
            numerosEncontrados.push(num);
          }
        });
      } else {
        // Documentos individuales: extraemos número del nombre de cada archivo
        archivos.forEach((a) => {
          const texto = a.nombre.replace(new RegExp(tipo.id, 'gi'), '');
          const match = texto.match(/\d+/);
          if (match) {
            numerosEncontrados.push(parseInt(match[0], 10));
          }
        });
      }
    });

    if (numerosEncontrados.length > 0) {
      const repetidosSet = new Set<number>();
      const unicosSet = new Set<number>();

      numerosEncontrados.forEach((n) => {
        if (unicosSet.has(n)) {
          repetidosSet.add(n);
        } else {
          unicosSet.add(n);
        }
      });

      if (unicosSet.size > 0) {
        const arrUnicos = Array.from(unicosSet);
        const min = Math.min(...arrUnicos);
        const max = Math.max(...arrUnicos);

        const faltantes: number[] = [];
        for (let i = min; i <= max; i++) {
          if (!unicosSet.has(i)) {
            faltantes.push(i);
          }
        }

        resultados[tipo.id] = {
          faltantes,
          repetidos: Array.from(repetidosSet).sort((a, b) => a - b),
          presentes: arrUnicos.sort((a, b) => a - b),
        };
      }
    }
  });

  return resultados;
}
