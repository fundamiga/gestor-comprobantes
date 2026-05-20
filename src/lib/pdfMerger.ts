import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

/**
 * Descarga y combina múltiples archivos (imágenes o PDFs) en un único PDF y lo descarga.
 */
export async function combinarYDescargarPdf(
  archivos: { url: string; tipo: string; nombre: string }[],
  nombreArchivoDestino: string
) {
  if (!archivos || archivos.length === 0) return;
  
  const toastId = toast.loading('Descargando y combinando archivos en un solo PDF...');
  
  try {
    const mergedPdf = await PDFDocument.create();

    for (const arch of archivos) {
      const response = await fetch(arch.url);
      if (!response.ok) {
        throw new Error(`No se pudo obtener el archivo: ${arch.nombre}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      // Detectamos si es PDF comparando tipo o extensión
      const esPdf = arch.tipo === 'application/pdf' || arch.url.toLowerCase().split('?')[0].endsWith('.pdf');

      if (esPdf) {
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } else {
        // Es imagen
        let image;
        const esPng = arch.tipo === 'image/png' || arch.url.toLowerCase().split('?')[0].endsWith('.png');
        try {
          if (esPng) {
            image = await mergedPdf.embedPng(arrayBuffer);
          } else {
            image = await mergedPdf.embedJpg(arrayBuffer);
          }
        } catch {
          // Si falla embedPng/embedJpg por extensión incorrecta, probamos el otro
          try {
            if (esPng) {
              image = await mergedPdf.embedJpg(arrayBuffer);
            } else {
              image = await mergedPdf.embedPng(arrayBuffer);
            }
          } catch {
            throw new Error(`Formato de imagen no soportado para: ${arch.nombre}`);
          }
        }

        // Crear página con las mismas dimensiones de la imagen
        const page = mergedPdf.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes] as BlobPart[], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = nombreArchivoDestino.endsWith('.pdf') ? nombreArchivoDestino : `${nombreArchivoDestino}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(downloadUrl);
    toast.success('¡Documento combinado con éxito!', { id: toastId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(err);
    toast.error(`Error al crear PDF combinado: ${msg}`, { id: toastId });
  }
}
