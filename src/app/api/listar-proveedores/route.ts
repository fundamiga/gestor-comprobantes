import { NextRequest, NextResponse } from "next/server";
import path from "path";
import ExcelJS from "exceljs";

export const dynamic = 'force-dynamic';


// Cache en memoria
let cachedProveedores: { nombre: string; cedula: string }[] = [];
let lastFetch = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

async function leerExcel(): Promise<{ nombre: string; cedula: string }[]> {
  const proveedores: { nombre: string; cedula: string }[] = [];
  const vistos = new Set<string>();

  // 1. Leer el archivo principal
  try {
    const filePath = path.join(process.cwd(), "ejemplos", "CUENTAS DE COBRO REMES.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    for (const sheet of workbook.worksheets) {
      const nombre = sheet.getRow(3).getCell(2).value;
      const cedula = sheet.getRow(4).getCell(2).value;

      if (!nombre) continue;

      const nombreStr = String(nombre).trim();
      const cedulaStr = String(cedula).trim();

      if (vistos.has(nombreStr.toLowerCase())) continue;
      vistos.add(nombreStr.toLowerCase());

      proveedores.push({ nombre: nombreStr, cedula: cedulaStr });
    }
  } catch (err) {
    console.error("Error leyendo CUENTAS DE COBRO REMES.xlsx:", err);
  }

  // 2. Leer el archivo de nombre y cedula
  try {
    const file2Path = path.join(process.cwd(), "ejemplos", "nombre y cedula.xlsx");
    const workbook2 = new ExcelJS.Workbook();
    await workbook2.xlsx.readFile(file2Path);
    
    const sheet = workbook2.worksheets[0];
    if (sheet) {
      sheet.eachRow((row) => {
        const v1 = row.values[1];
        const v3 = row.values[3];

        let nombreStr = "";
        let cedulaStr = "";

        if (v1 && typeof v1 === "string") {
          // Algunos están en formato "Nombre – Cedula"
          if (v1.match(/[-–]/)) {
            const parts = v1.split(/[-–]/);
            nombreStr = parts[0].trim();
            cedulaStr = parts.slice(1).join("").trim();
          } else {
            nombreStr = v1.trim();
            if (v3) {
              cedulaStr = String(v3).trim();
            }
          }
        }

        if (nombreStr) {
          // Capitalizar para que quede bonito (ej: "arredondo Garzon melissa" -> "Arredondo Garzon Melissa")
          nombreStr = nombreStr.replace(/\b\w/g, (c) => c.toUpperCase());
          
          if (!vistos.has(nombreStr.toLowerCase())) {
            vistos.add(nombreStr.toLowerCase());
            proveedores.push({ nombre: nombreStr, cedula: cedulaStr });
          }
        }
      });
    }
  } catch (err) {
    console.error("Error leyendo nombre y cedula.xlsx:", err);
  }

  return proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    if (cachedProveedores.length > 0 && now - lastFetch < CACHE_TTL_MS) {
      return NextResponse.json({ proveedores: cachedProveedores });
    }

    cachedProveedores = await leerExcel();
    lastFetch = now;

    return NextResponse.json({ proveedores: cachedProveedores });
  } catch (error: any) {
    console.error("Error leyendo Excel de proveedores:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
