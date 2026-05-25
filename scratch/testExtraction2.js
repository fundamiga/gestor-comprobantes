const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function testExtraction() {
  const pdfPath = path.join(__dirname, '../ejemplos/CC9-1732 CONECTATE.pdf');
  const buffer = fs.readFileSync(pdfPath);
  
  const pdfData = await pdf(buffer);
  const text = pdfData.text;

  let valor = 0;
  const valorMatch = text.match(/Total[\s\S]*?([\d,]+\.\d{2})/i);
  if (valorMatch) {
    valor = parseFloat(valorMatch[1].replace(/,/g, ''));
  }

  let concepto = "Honorarios / Servicios";
  const lineas = text.split('\n');
  const idxServicio = lineas.findIndex(l => l.includes("Servicio de") || l.includes("Honorarios") || l.includes("Pago de"));
  if (idxServicio !== -1) {
    concepto = lineas[idxServicio].trim();
    if (lineas[idxServicio+1] && !lineas[idxServicio+1].match(/^\d/)) {
        concepto += " " + lineas[idxServicio+1].trim();
    }
  }

  let nit = "Por definir";
  const nitMatches = text.match(/\b\d{7,10}[-\d]?\b/g);
  if (nitMatches) {
    const nitsDiferentes = nitMatches.filter(n => n !== "901369891" && n !== "901.369.891-9" && !n.startsWith("31"));
    if (nitsDiferentes.length > 0) {
      nit = nitsDiferentes[0];
    }
  }

  let nombre = "Proveedor";
  const idxCuenta = lineas.findIndex(l => l.includes("Cuenta contable") || l.includes("Tercero"));
  if (idxCuenta !== -1) {
      for (let i = idxCuenta + 1; i < idxCuenta + 15 && i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (linea.length > 4 && linea === linea.toUpperCase() && !linea.match(/^\d/) && !linea.includes("PUBLICO") && !linea.includes("SERVICIO")) {
          nombre = linea;
          if (lineas[i+1] && lineas[i+1].trim() === lineas[i+1].trim().toUpperCase() && lineas[i+1].trim().length > 2 && !lineas[i+1].match(/^\d/)) {
            nombre += " " + lineas[i+1].trim();
          }
          break;
        }
      }
  }

  console.log("--- RESULTADOS EXTRACCIÓN MEJORADA ---");
  console.log("Nombre:", nombre);
  console.log("NIT:", nit);
  console.log("Valor:", valor);
  console.log("Concepto:", concepto);
}

testExtraction();
