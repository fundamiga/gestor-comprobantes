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
  if (text.includes("Servicio de")) {
    const lineas = text.split('\n');
    const lineaServicio = lineas.find(l => l.includes("Servicio de"));
    if (lineaServicio) concepto = lineaServicio.trim();
  }

  let nit = "Por definir";
  const nitMatches = text.match(/\b\d{7,10}[-\d]?\b/g);
  if (nitMatches) {
    const nitsDiferentes = nitMatches.filter(n => n !== "901369891" && n !== "901.369.891-9");
    if (nitsDiferentes.length > 0) {
      nit = nitsDiferentes[0];
    }
  }

  let nombre = "Proveedor";
  const lineas = text.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    if (lineas[i].includes("Tercero") || lineas[i].includes("1")) {
      if (lineas[i+1] && lineas[i+1].length > 3 && !lineas[i+1].match(/^\d/)) {
        nombre = lineas[i+1].trim();
        break;
      } else if (lineas[i+2] && lineas[i+2].length > 3 && !lineas[i+2].match(/^\d/)) {
        nombre = lineas[i+2].trim();
        break;
      }
    }
  }

  console.log("--- RESULTADOS EXTRACCIÓN ---");
  console.log("Nombre:", nombre);
  console.log("NIT:", nit);
  console.log("Valor:", valor);
  console.log("Concepto:", concepto);
}

testExtraction();
