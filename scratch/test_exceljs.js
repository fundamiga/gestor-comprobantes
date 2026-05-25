const ExcelJS = require('exceljs');
const fs = require('fs');

async function extractData() {
  const workbook = new ExcelJS.Workbook();
  console.log("Leyendo archivo...");
  await workbook.xlsx.readFile("c:\\Users\\kevin17\\Documents\\gestor comprobantes\\gestor-comprobantes-fundamiga\\gestor-comprobantes\\ejemplos\\CUENTAS DE COBRO REMES.xlsx");
  console.log("Archivo leído.");

  const sheet = workbook.worksheets[0]; // Hoja 'A'
  
  // Imprimir imágenes en la primera hoja
  console.log(`Imágenes en la hoja ${sheet.name}:`, sheet.getImages().length);
  
  const images = sheet.getImages();
  for (const img of images.slice(0, 5)) {
    console.log("Image Range:", img.range);
    const media = workbook.model.media[img.imageId];
    console.log(`Media Type: ${media.type}, Extension: ${media.extension}, Size: ${media.buffer.length} bytes`);
  }
}

extractData().catch(console.error);
