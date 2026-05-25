const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function extraer() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("c:\\Users\\kevin17\\Documents\\gestor comprobantes\\gestor-comprobantes-fundamiga\\gestor-comprobantes\\ejemplos\\CUENTAS DE COBRO REMES.xlsx");
  
  const outputDir = path.join(__dirname, "firmas_extraidas");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const registros = [];
  let firmasGuardadas = 0;

  for (const sheet of workbook.worksheets) {
    // Extraer nombre (fila 3, col 2)
    const nombre = sheet.getRow(3).getCell(2).value;
    // Extraer cédula (fila 4, col 2)
    const cedula = sheet.getRow(4).getCell(2).value;
    
    if (!nombre) {
      console.log(`Hoja "${sheet.name}": sin nombre, saltando...`);
      continue;
    }

    const nombreStr = String(nombre).trim();
    const cedulaStr = String(cedula).trim();
    
    console.log(`Hoja "${sheet.name}": ${nombreStr} - CC ${cedulaStr}`);
    
    // Buscar imágenes
    const images = sheet.getImages();
    let firmaGuardada = false;
    
    if (images.length > 0) {
      // Tomar la primera imagen (debería ser la firma)
      const img = images[0];
      const media = workbook.model.media[img.imageId];
      
      if (media && media.buffer) {
        const nombreArchivo = nombreStr
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        const ext = media.extension || 'png';
        const filePath = path.join(outputDir, `${nombreArchivo}.${ext}`);
        
        fs.writeFileSync(filePath, media.buffer);
        firmasGuardadas++;
        firmaGuardada = true;
        console.log(`  → Firma guardada: ${nombreArchivo}.${ext} (${media.buffer.length} bytes)`);
      }
    }
    
    registros.push({
      nombre: nombreStr,
      cedula: cedulaStr,
      hoja: sheet.name,
      tieneFirma: firmaGuardada,
    });
  }

  // Guardar el JSON con los datos
  const jsonPath = path.join(outputDir, "_registros.json");
  fs.writeFileSync(jsonPath, JSON.stringify(registros, null, 2));
  
  console.log(`\n=== RESUMEN ===`);
  console.log(`Total hojas: ${workbook.worksheets.length}`);
  console.log(`Registros extraídos: ${registros.length}`);
  console.log(`Firmas guardadas: ${firmasGuardadas}`);
  console.log(`Datos guardados en: ${jsonPath}`);
}

extraer().catch(console.error);
