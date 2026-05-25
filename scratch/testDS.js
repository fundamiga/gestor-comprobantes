const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function testExtraction() {
  const pdfPath = path.join(__dirname, '../ejemplos/DS-4354 SHIRLY POLANCO.pdf');
  const buffer = fs.readFileSync(pdfPath);
  
  const pdfData = await pdf(buffer);
  const text = pdfData.text;

  console.log("--- RAW PDF TEXT ---");
  console.log(text.substring(0, 1500)); // Print first 1500 chars to understand structure
}

testExtraction();
