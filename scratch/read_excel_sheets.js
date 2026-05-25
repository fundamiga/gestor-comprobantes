const xlsx = require("xlsx");

try {
  const workbook = xlsx.readFile("c:\\Users\\kevin17\\Documents\\gestor comprobantes\\gestor-comprobantes-fundamiga\\gestor-comprobantes\\ejemplos\\CUENTAS DE COBRO REMES.xlsx");
  console.log("Hojas en el libro:", workbook.SheetNames);
} catch (err) {
  console.error("Error:", err.message);
}
