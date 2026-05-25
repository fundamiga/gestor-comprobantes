const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function testPdf() {
  const pdfPath = path.join(__dirname, '../ejemplos/CC9-1732 CONECTATE.pdf');
  const dataBuffer = fs.readFileSync(pdfPath);
  try {
    const data = await pdf(dataBuffer);
    console.log("PDF TEXT:");
    console.log(data.text);
  } catch(e) {
    console.log("Error parsing PDF:", e);
  }
}
testPdf();
