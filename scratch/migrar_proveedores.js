// Script para crear la tabla 'proveedores' en Supabase y migrar los datos del Excel
const ExcelJS = require('exceljs');
const path = require('path');

const SUPABASE_URL = 'https://cffsosbcmmeabiftjzyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZnNvc2JjbW1lYWJpZnRqenlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQzMzYsImV4cCI6MjA5NDczMDMzNn0.npwz0_r8j2byZ8e4vUQ-0c2ITVa1Cdr8adVR_cpgVJA';

async function leerProveedoresExcel() {
  const proveedores = [];
  const vistos = new Set();

  // 1. Archivo principal
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(process.cwd(), 'ejemplos', 'CUENTAS DE COBRO REMES.xlsx'));
    for (const sheet of wb.worksheets) {
      const n = sheet.getRow(3).getCell(2).value;
      const c = sheet.getRow(4).getCell(2).value;
      if (!n) continue;
      const ns = String(n).trim();
      const cs = String(c).trim();
      if (vistos.has(ns.toLowerCase())) continue;
      vistos.add(ns.toLowerCase());
      proveedores.push({ nombre: ns, cedula: cs });
    }
  } catch (e) { console.error('Error leyendo REMES:', e.message); }

  // 2. Archivo nombre y cedula
  try {
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(path.join(process.cwd(), 'ejemplos', 'nombre y cedula.xlsx'));
    const s = wb2.worksheets[0];
    s.eachRow((r) => {
      const v1 = r.values[1];
      const v3 = r.values[3];
      let ns = '', cs = '';
      if (v1 && typeof v1 === 'string') {
        if (v1.match(/[-–]/)) {
          const p = v1.split(/[-–]/);
          ns = p[0].trim();
          cs = p.slice(1).join('').trim();
        } else {
          ns = v1.trim();
          if (v3) cs = String(v3).trim();
        }
      }
      if (ns) {
        ns = ns.replace(/\b\w/g, c => c.toUpperCase());
        if (!vistos.has(ns.toLowerCase())) {
          vistos.add(ns.toLowerCase());
          proveedores.push({ nombre: ns, cedula: cs });
        }
      }
    });
  } catch (e) { console.error('Error leyendo nombre y cedula:', e.message); }

  return proveedores;
}

async function subirASupabase(proveedores) {
  console.log(`\nSubiendo ${proveedores.length} proveedores a Supabase...\n`);

  // Subir en lotes de 50
  const batchSize = 50;
  let subidos = 0;

  for (let i = 0; i < proveedores.length; i += batchSize) {
    const batch = proveedores.slice(i, i + batchSize);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (res.ok) {
      subidos += batch.length;
      console.log(`  ✅ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} registros subidos`);
    } else {
      const err = await res.text();
      console.log(`  ❌ Error en lote ${Math.floor(i / batchSize) + 1}: ${err}`);
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Subidos: ${subidos}/${proveedores.length}`);
}

async function main() {
  const proveedores = await leerProveedoresExcel();
  console.log(`Se encontraron ${proveedores.length} proveedores en los Excel.`);
  console.log('Primeros 5:', proveedores.slice(0, 5));
  await subirASupabase(proveedores);
}

main();
