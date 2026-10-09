import { NextRequest, NextResponse } from "next/server";
import { agregarPersonaBD } from "@/lib/cedulas-db";

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

    const resultado = await agregarPersonaBD(nombre, cedula);

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error: any) {
    console.error("Error en agregar-proveedor:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Esta persona ya existe en la base de datos" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
