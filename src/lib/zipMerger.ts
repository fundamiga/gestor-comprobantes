import JSZip from 'jszip';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import type { Periodo, ArchivoSubido } from '@/types';
import { MESES, TIPOS_DOCUMENTO } from '@/lib/constantes';

/**
 * Fusiona múltiples archivos (PDFs e imágenes JPG/PNG) en un único archivo PDF consolidado.
 * Retorna un ArrayBuffer con los bytes del PDF resultante.
 */
async function fusionarArchivosAPdf(archivos: ArchivoSubido[]): Promise<Uint8Array | null> {
  if (archivos.length === 0) return null;

  try {
    const mergedPdf = await PDFDocument.create();
    let paginasAgregadas = 0;

    for (const arch of archivos) {
      try {
        const response = await fetch(arch.url);
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status} al descargar el archivo`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const lowerNombre = arch.nombre.toLowerCase();
        const tipoMime = arch.tipo.toLowerCase();

        // 1. Fusionar PDF
        if (tipoMime === 'application/pdf' || lowerNombre.endsWith('.pdf')) {
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
            paginasAgregadas++;
          });
        } 
        // 2. Fusionar Imagen JPG / JPEG
        else if (
          tipoMime === 'image/jpeg' || 
          tipoMime === 'image/jpg' || 
          lowerNombre.endsWith('.jpg') || 
          lowerNombre.endsWith('.jpeg')
        ) {
          const image = await mergedPdf.embedJpg(arrayBuffer);
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          paginasAgregadas++;
        } 
        // 3. Fusionar Imagen PNG
        else if (tipoMime === 'image/png' || lowerNombre.endsWith('.png')) {
          const image = await mergedPdf.embedPng(arrayBuffer);
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          paginasAgregadas++;
        } 
        // 4. Tipo no soportado para fusión
        else {
          console.warn(`Tipo de archivo no combinable para fusión directa: ${arch.nombre}`);
          throw new Error(`Formato no compatible para fusión directa`);
        }
      } catch (err) {
        console.error(`Error al procesar el archivo "${arch.nombre}" para fusión:`, err);
        // Lanzamos el error para activar el plan de respaldo individual
        throw err;
      }
    }

    if (paginasAgregadas > 0) {
      return await mergedPdf.save();
    }
  } catch (err) {
    console.error('Fallo general en el proceso de fusión de PDFs:', err);
  }

  return null;
}

/**
 * Descarga todos los archivos de un período (mes), organizados en carpetas por proveedor
 * y subcarpetas por tipo de documento, fusionando de forma automática las parejas/múltiples archivos en un único PDF.
 */
export async function descargarPeriodoZip(periodo: Periodo) {
  const nombreMes = MESES[periodo.mes];
  const nombreZip = `${nombreMes}_${periodo.anio}_Comprobantes.zip`;
  
  const toastId = toast.loading(`Generando ZIP y combinando documentos (${nombreMes} ${periodo.anio})...`);
  
  try {
    const zip = new JSZip();
    let totalArchivos = 0;

    for (const lote of periodo.lotes) {
      // Limpiamos el nombre de la carpeta del proveedor de caracteres especiales
      const carpetaProveedor = lote.proveedor.replace(/[\\/:*?"<>|]/g, '_');
      let folderProveedor: JSZip | null = null;

      for (const [tipoId, archivos] of Object.entries(lote.documentos)) {
        if (archivos.length === 0) continue;

        // Encontrar la configuración del tipo para saber su categoría y nombre
        const configTipo = TIPOS_DOCUMENTO.find(t => t.id === tipoId);
        const categoria = configTipo?.categoria || "otros";
        
        // Creamos la carpeta del proveedor si aún no se ha creado
        if (!folderProveedor) {
          folderProveedor = zip.folder(carpetaProveedor);
        }
        if (!folderProveedor) continue;

        // --- SISTEMA DE CARPETAS POR CATEGORÍA ---
        let folderDestino: JSZip = folderProveedor;

        if (categoria === "comprobantes") {
          folderDestino = folderProveedor.folder("Comprobantes") || folderProveedor;
        } else if (categoria === "bancos" || categoria === "caja" || categoria === "conciliaciones") {
          const rootConcil = folderProveedor.folder("CONCILIACIONES") || folderProveedor;
          if (categoria === "conciliaciones") {
             folderDestino = rootConcil;
          } else {
             folderDestino = rootConcil.folder(categoria.toUpperCase()) || rootConcil;
          }
        } else {
          folderDestino = folderProveedor.folder("Otros") || folderProveedor;
        }

        // Creamos la subcarpeta final para el tipo de documento (usando su label legible)
        const nombreFinalCarpeta = configTipo ? configTipo.label.replace(/[\\/:*?"<>|]/g, '_') : tipoId;
        
        let folderTipo: JSZip | null = null;
        
        // Excepción: Si son los "ARCHIVOS GENERALES" de bancos, caja o conciliaciones, no creamos subcarpeta extra, 
        // los metemos directamente "a la par" en su directorio padre respectivo.
        if (tipoId === "BANC_ARCHIVOS" || tipoId === "CAJA_ARCHIVOS" || tipoId === "CONCIL_ARCHIVOS") {
           folderTipo = folderDestino;
        } else {
           folderTipo = folderDestino.folder(nombreFinalCarpeta);
        }

        if (!folderTipo) continue;

        // Determinamos si este tipo usa lógica de grupos (Parejas/Tríos)
        const esPorGrupos = typeof configTipo?.minArchivos === "number" && configTipo.minArchivos >= 1 && tipoId !== "CC1" && tipoId !== "FV";

        if (esPorGrupos) {
          // Agrupar por grupoId para procesar cada conjunto por separado
          const gruposMap: { [grupoId: string]: ArchivoSubido[] } = {};
          const archivosSinGrupo: ArchivoSubido[] = [];

          archivos.forEach((a) => {
            if (a.grupoId) {
              if (!gruposMap[a.grupoId]) {
                gruposMap[a.grupoId] = [];
              }
              gruposMap[a.grupoId].push(a);
            } else {
              archivosSinGrupo.push(a);
            }
          });

          // Poner archivos sin grupo en el grupo inicial
          if (archivosSinGrupo.length > 0) {
            const idInicial = "grupo_inicial";
            if (!gruposMap[idInicial]) {
              gruposMap[idInicial] = [];
            }
            gruposMap[idInicial].push(...archivosSinGrupo);
          }

          // Procesar cada pareja/trío de forma independiente
          for (const [grupoId, archivosGrupo] of Object.entries(gruposMap)) {
            if (archivosGrupo.length === 0) continue;

            const nombreGrupo = archivosGrupo[0]?.grupoNombre || (grupoId === "grupo_inicial" ? "Grupo 1" : "Grupo");
            const grupoLimpio = nombreGrupo.replace(/[\\/:*?"<>|]/g, '_');

            // Clasificar archivos en combinables (PDFs, JPGs, PNGs) y no combinables
            const combinables: ArchivoSubido[] = [];
            const noCombinables: ArchivoSubido[] = [];

            for (const arch of archivosGrupo) {
              const lowerNombre = arch.nombre.toLowerCase();
              const tipoMime = (arch.tipo || "").toLowerCase();
              const esPDF = tipoMime === 'application/pdf' || lowerNombre.endsWith('.pdf');
              const esJPG = tipoMime === 'image/jpeg' || tipoMime === 'image/jpg' || lowerNombre.endsWith('.jpg') || lowerNombre.endsWith('.jpeg');
              const esPNG = tipoMime === 'image/png' || lowerNombre.endsWith('.png');

              if (esPDF || esJPG || esPNG) {
                combinables.push(arch);
              } else {
                noCombinables.push(arch);
              }
            }

            let fusionExitosa = false;

            // Intentamos fusionar el grupo en un único PDF
            if (combinables.length > 0) {
              try {
                toast.loading(`Combinando ${nombreFinalCarpeta} (${nombreGrupo})...`, { id: toastId });
                const pdfBytes = await fusionarArchivosAPdf(combinables);
                
                if (pdfBytes) {
                  // Nombre legible para el PDF combinado: e.g. CONCILIACION_Grupo_1.pdf
                  const nombrePdfCombinado = `${nombreFinalCarpeta}_${grupoLimpio}.pdf`;
                  folderTipo.file(nombrePdfCombinado, pdfBytes);
                  totalArchivos++;
                  fusionExitosa = true;
                }
              } catch (err) {
                console.warn(`No se pudo realizar la fusión para el grupo ${nombreGrupo}.`, err);
              }
            }

            // Fallback: Si la fusión del grupo falló o no se pudo hacer, guardamos de forma individual
            if (!fusionExitosa && combinables.length > 0) {
              for (const arch of combinables) {
                try {
                  const response = await fetch(arch.url);
                  if (!response.ok) throw new Error(`No se pudo obtener: ${arch.nombre}`);
                  const arrayBuffer = await response.arrayBuffer();
                  const nombreLimpio = arch.nombre.replace(/[\\/:*?"<>|]/g, '_');
                  folderTipo.file(`${nombreFinalCarpeta}_${grupoLimpio}_${nombreLimpio}`, arrayBuffer);
                  totalArchivos++;
                } catch (e) {
                  console.error(`Error individual ${arch.nombre}:`, e);
                }
              }
            }

            // Guardar archivos no combinables (Excel, etc.)
            for (const arch of noCombinables) {
              try {
                const response = await fetch(arch.url);
                if (!response.ok) throw new Error(`No se pudo obtener: ${arch.nombre}`);
                const arrayBuffer = await response.arrayBuffer();
                const nombreLimpio = arch.nombre.replace(/[\\/:*?"<>|]/g, '_');
                folderTipo.file(`${nombreFinalCarpeta}_${grupoLimpio}_${nombreLimpio}`, arrayBuffer);
                totalArchivos++;
              } catch (e) {
                console.error(`Error no combinable ${arch.nombre}:`, e);
              }
            }
          }
        } else {
          // Documentos individuales (sin lógica de grupos)
          for (const arch of archivos) {
            try {
              const response = await fetch(arch.url);
              if (!response.ok) throw new Error(`No se pudo obtener: ${arch.nombre}`);
              const arrayBuffer = await response.arrayBuffer();
              const nombreLimpio = arch.nombre.replace(/[\\/:*?"<>|]/g, '_');
              folderTipo.file(`${nombreFinalCarpeta}_${nombreLimpio}`, arrayBuffer);
              totalArchivos++;
            } catch (e) {
              console.error(`Error individual ${arch.nombre}:`, e);
            }
          }
        }
      }
    }

    if (totalArchivos === 0) {
      toast.error('No hay archivos válidos para descargar en este período.', { id: toastId });
      return;
    }

    toast.loading('Generando el archivo ZIP contable...', { id: toastId });
    const content = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(content);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = nombreZip;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(downloadUrl);
    toast.success(`¡ZIP de ${nombreMes} creado y organizado con éxito!`, { id: toastId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(err);
    toast.error(`Error al generar el ZIP: ${msg}`, { id: toastId });
  }
}
