import { NextRequest, NextResponse } from "next/server";
import path from "path";
import ExcelJS from "exceljs";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, cedula } = body;

    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: "Nombre y cédula son obligatorios" },
        { status: 400 }
      );
    }

    const nombreStr = nombre.trim();
    const cedulaStr = cedula.trim();

    const filePath = path.join(process.cwd(), "ejemplos", "nombre y cedula.xlsx");

    let workbook: ExcelJS.Workbook;
    let sheet: ExcelJS.Worksheet;

    if (fs.existsSync(filePath)) {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      sheet = workbook.worksheets[0];
    } else {
      workbook = new ExcelJS.Workbook();
      sheet = workbook.addWorksheet("Proveedores");
    }

    // Verificar si ya existe
    let yaExiste = false;
    sheet.eachRow((row) => {
      const v1 = row.values[1];
      if (v1 && typeof v1 === "string") {
        // Formato "Nombre – Cedula"
        const parts = String(v1).split(/[-–]/);
        const existingName = parts[0].trim().toLowerCase();
        if (existingName === nombreStr.toLowerCase()) {
          yaExiste = true;
        }
      }
    });

    if (yaExiste) {
      return NextResponse.json(
        { error: "Esta persona ya existe en la base de datos" },
        { status: 409 }
      );
    }

    // Agregar nueva fila en formato "Nombre – Cedula"
    const nuevaFila = `${nombreStr} – ${cedulaStr}`;
    const lastRow = sheet.rowCount + 1;
    sheet.getRow(lastRow).getCell(1).value = nuevaFila;

    await workbook.xlsx.writeFile(filePath);

    return NextResponse.json({
      success: true,
      nombre: nombreStr,
      cedula: cedulaStr,
    });
  } catch (error: any) {
    console.error("Error en agregar-proveedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
