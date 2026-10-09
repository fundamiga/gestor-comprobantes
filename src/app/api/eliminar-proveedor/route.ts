import { NextRequest, NextResponse } from "next/server";
import { eliminarPersonaBD } from "@/lib/cedulas-db";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "El id es obligatorio" },
        { status: 400 }
      );
    }

    await eliminarPersonaBD(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error en eliminar-proveedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
