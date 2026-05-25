const xlsx = require('xlsx');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function analyze() {
  const excelPath = path.join(__dirname, '../ejemplos/CUENTAS DE COBRO PARQUEADEROS.xlsx');
  const pdfPath = path.join(__dirname, '../ejemplos/CC9-1732 CONECTATE.pdf');

  console.log("--- EXCEL ---");
  try {
    const workbook = xlsx.readFile(excelPath);
    console.log("Sheet names:", workbook.SheetNames);
    
    // Check first 3 sheets to find the actual template
    for (let i = 0; i < Math.min(3, workbook.SheetNames.length); i++) {
      const sheetName = workbook.SheetNames[i];
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\nSheet name: ${sheetName}`);
      console.log("First 15 rows:");
      for (let j = 0; j < Math.min(15, json.length); j++) {
        console.log(`Row ${j}:`, JSON.stringify(json[j]));
      }
    }
  } catch (e) {
    console.error("Excel error:", e.message);
  }

  console.log("\n--- PDF ---");
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    console.log("PDF text extract:");
    console.log(data.text.substring(0, 1000));
  } catch (e) {
    console.error("PDF error:", e.message);
  }
}

analyze();
