const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text, x, y, size = 11, isBold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  const marginX = 50;
  let currentY = 750;

  // Fecha
  const fechaActual = new Date();
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const fechaStr = `Yumbo, ${fechaActual.getDate()} ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;
  drawText(fechaStr, marginX, currentY);

  // Titulo
  drawText("CUENTA DE COBRO", 350, currentY, 14, true);
  
  currentY -= 60;
  
  // Proveedor
  drawText("Yo:", marginX, currentY, 12, true);
  drawText("SHIRLEY MYLEYDI POLANCO MURILLO", marginX + 30, currentY, 12);
  
  currentY -= 20;
  drawText("Con C.C:", marginX, currentY, 12, true);
  drawText("65.794.060-5", marginX + 60, currentY, 12);

  currentY -= 40;
  drawText("Manifiesto que:", marginX, currentY, 12);
  currentY -= 20;
  drawText("FUNDACION UNA MANO AMIGA A TIEMPO", marginX, currentY, 12, true);
  currentY -= 20;
  drawText("NIT: 901.369.891-9", marginX, currentY, 12);

  currentY -= 40;
  drawText("ME DEBE LA SUMA DE:", marginX, currentY, 12, true);
  drawText("$ 1,000,000.00", marginX + 160, currentY, 12);

  currentY -= 30;
  drawText("POR CONCEPTO DE:", marginX, currentY, 12, true);
  drawText("Arrendamiento - Mes de Enero-2026", marginX + 140, currentY, 12);

  currentY -= 60;
  const textoLegal = "Declaro voluntariamente y bajo la gravedad de juramento, que no soy responsable del impuesto\n" +
                     "del IVA. Declaro que mis ingresos mensuales provienen de la compensación por servicios\n" +
                     "personales y que para obtenerlos no he contratado ni vinculado dos (2) o más trabajadores\n" +
                     "asociados a la actividad. Lo anterior con el propósito de ser beneficiario en el cálculo de la\n" +
                     "retención en la fuente por concepto de honorarios, según lo dispuesto en el art 383 del\n" +
                     "estatuto tributario.";
  
  page.drawText(textoLegal, {
    x: marginX,
    y: currentY,
    size: 10,
    font: font,
    lineHeight: 14,
    color: rgb(0, 0, 0),
  });

  currentY -= 120;
  
  // Firma
  page.drawLine({
    start: { x: marginX, y: currentY },
    end: { x: marginX + 200, y: currentY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  currentY -= 15;
  drawText("Firma", marginX, currentY, 11, true);
  currentY -= 15;
  drawText("C.C.", marginX, currentY, 11, true);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../ejemplos/TEST_CUENTA_COBRO.pdf'), pdfBytes);
  console.log("PDF Generado exitosamente en ejemplos/TEST_CUENTA_COBRO.pdf");
}

createPDF();
