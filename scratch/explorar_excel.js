const ExcelJS = require('exceljs');

async function explorar() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("c:\\Users\\kevin17\\Documents\\gestor comprobantes\\gestor-comprobantes-fundamiga\\gestor-comprobantes\\ejemplos\\CUENTAS DE COBRO REMES.xlsx");
  
  const sheet = workbook.worksheets[0]; // Hoja 'A'
  
  // Imprimir solo filas clave (nombre, cedula, valor) - primeras 30 filas
  for (let r = 1; r <= 30; r++) {
    const row = sheet.getRow(r);
    const vals = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cell.value !== null && cell.value !== undefined) {
        vals.push(`col${colNumber}=${JSON.stringify(cell.value).substring(0, 80)}`);
      }
    });
    if (vals.length > 0) {
      console.log(`Fila ${r}: ${vals.join(' | ')}`);
    }
  }

  // Ahora ver cuántas columnas hay y si hay múltiples cuentas lado a lado
  console.log("\n--- Columnas usadas ---");
  const row1 = sheet.getRow(1);
  row1.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    console.log(`Col ${colNumber}: ${JSON.stringify(cell.value).substring(0, 50)}`);
  });

  const row3 = sheet.getRow(3);
  row3.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    console.log(`Fila3 Col ${colNumber}: ${JSON.stringify(cell.value).substring(0, 50)}`);
  });

  const row4 = sheet.getRow(4);
  row4.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    console.log(`Fila4 Col ${colNumber}: ${JSON.stringify(cell.value).substring(0, 50)}`);
  });

  // Cuántas filas totales
  console.log(`\nTotal filas: ${sheet.rowCount}`);
  
  // Buscar todas las filas que dicen "Yo" para ver cuántas cuentas hay
  console.log("\n--- Todas las filas con 'Yo' ---");
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (typeof cell.value === 'string' && cell.value.trim() === 'Yo') {
        console.log(`Fila ${rowNumber}, Col ${colNumber}: "Yo"`);
      }
    });
  });
}

explorar().catch(console.error);
