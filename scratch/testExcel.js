const ExcelJS = require('exceljs');
const path = require('path');

async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, '../ejemplos/CUENTAS DE COBRO PARQUEADEROS.xlsx'));
  const sheet = wb.getWorksheet('A');
  
  // Imprimir algunas celdas para ver dónde están los datos
  console.log("A3:", sheet.getCell('A3').value);
  console.log("B3:", sheet.getCell('B3').value);
  console.log("A4:", sheet.getCell('A4').value);
  console.log("B4:", sheet.getCell('B4').value);
  console.log("A9:", sheet.getCell('A9').value);
  console.log("C9:", sheet.getCell('C9').value);
  console.log("A11:", sheet.getCell('A11').value);
  console.log("C11:", sheet.getCell('C11').value);
}

test();
