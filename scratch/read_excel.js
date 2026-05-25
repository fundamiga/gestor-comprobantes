const xlsx = require("xlsx");

try {
  const workbook = xlsx.readFile("c:\\Users\\kevin17\\Documents\\gestor comprobantes\\gestor-comprobantes-fundamiga\\gestor-comprobantes\\ejemplos\\CUENTAS DE COBRO REMES.xlsx");
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convertir a JSON
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Hoja: ${sheetName}`);
  console.log(`Filas: ${data.length}`);
  
  // Mostrar las primeras 30 filas para ver la estructura
  for (let i = 0; i < Math.min(30, data.length); i++) {
    console.log(`Fila ${i + 1}:`, JSON.stringify(data[i]));
  }
} catch (err) {
  console.error("Error:", err.message);
}
