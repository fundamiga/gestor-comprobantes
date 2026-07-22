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
    if (min >= 1 && t.id !== "CC1" && t.id !== "FV") { // CC1 y FV siguen siendo planos por ahora
      if (docs.length < 1) return false;
      const gruposMap: { [key: string]: number } = {};
      docs.forEach((d) => {
        const gid = d.grupoId || "grupo_inicial";
        gruposMap[gid] = (gruposMap[gid] ?? 0) + 1;
      });
      const algunGrupoIncompleto = Object.values(gruposMap).some((count) => count < min);
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

      const esGrupo = tipo.minArchivos && tipo.minArchivos >= 1 && tipo.id !== "CC1" && tipo.id !== "FV";

      if (esGrupo) {
        // Por parejas: extraemos un solo número por cada grupo/pareja
        const gruposMap: { [key: string]: ArchivoSubido[] } = {};
        archivos.forEach((a) => {
          const gid = a.grupoId || "grupo_inicial";
          if (!gruposMap[gid]) gruposMap[gid] = [];
          gruposMap[gid].push(a);
        });

        Object.values(gruposMap).forEach((grupoArchivos) => {
          let num: number | null = null;
          let numFallback: number | null = null;
          
          // Buscamos el primer número en el nombre del grupo o en los nombres de los archivos
          const posiblesTextos = [
            grupoArchivos[0]?.grupoNombre || "",
            ...grupoArchivos.map((a) => a.nombre),
          ];

          for (const rawTexto of posiblesTextos) {
            // Ignorar el prefijo del tipo de documento (ej: "CC9") para no extraer el "9"
            const texto = rawTexto.replace(new RegExp(tipo.id, 'gi'), '');

            // Si es Pareja X, lo guardamos como fallback para no pisar números reales de las facturas
            if (texto.startsWith("Pareja ")) {
              const m = texto.match(/\d+/);
              if (m && numFallback === null) numFallback = parseInt(m[0], 10);
              continue;
            }
            const match = texto.match(/\d+/);
            if (match) {
              num = parseInt(match[0], 10);
              break; // Encontramos un número válido en este grupo
            }
          }

          if (num === null && numFallback !== null) {
            num = numFallback;
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

/** Conversión de un valor numérico a letras en español */
export function numeroALetras(num: number): string {
  if (isNaN(num) || num === 0) return "CERO";

  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales: Record<number, string> = {
    11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    21: "VEINTIUN", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
    25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"
  };
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function convertirGrupo(n: number): string {
    if (n === 100) return "CIEN";
    let res = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    res += centenas[c] + (c > 0 ? " " : "");
    if (d === 1 && u > 0) {
      res += (especiales[d * 10 + u] || "") + " ";
      return res.trim();
    } else if (d === 2 && u > 0) {
      res += (especiales[d * 10 + u] || "") + " ";
      return res.trim();
    } else {
      res += decenas[d] + (d > 0 && u > 0 ? " Y " : (d > 0 ? " " : ""));
      res += unidades[u];
    }
    return res.trim();
  }

  let entero = Math.floor(Math.abs(num));
  let letras = "";

  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    letras += (millones === 1 ? "UN MILLON" : convertirGrupo(millones) + " MILLONES") + " ";
    entero = entero % 1000000;
  }
  if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    letras += (miles === 1 ? "MIL" : convertirGrupo(miles) + " MIL") + " ";
    entero = entero % 1000;
  }
  if (entero > 0) {
    letras += convertirGrupo(entero);
  }

  return letras.trim();
}

