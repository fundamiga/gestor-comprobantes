import { NextRequest, NextResponse } from "next/server";
import { editarPersonaBD } from "@/lib/cedulas-db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, cedula } = body;

    if (!id || !nombre || !cedula) {
      return NextResponse.json(
        { error: "El id, nombre y cédula son obligatorios" },
        { status: 400 }
      );
    }

    const resultado = await editarPersonaBD(id, nombre, cedula);

    return NextResponse.json({
      success: true,
      proveedor: resultado,
    });
  } catch (error: any) {
    console.error("Error en editar-proveedor:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe otra persona con este nombre" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
