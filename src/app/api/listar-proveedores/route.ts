import { NextRequest, NextResponse } from "next/server";
import { obtenerTodasLasCedulas } from "@/lib/cedulas-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forzarRefresco = searchParams.get("refresh") === "true";

    // Obtiene automáticamente de Supabase Principal (appfundaamiga-main)
    // con respaldo local en memoria y Excel para garantizar respuesta ultra rápida y 100% disponible
    const proveedores = await obtenerTodasLasCedulas(forzarRefresco);

    return NextResponse.json({
      success: true,
      proveedores,
      total: proveedores.length,
    });
  } catch (error: any) {
    console.error("Error listando proveedores:", error);
    return NextResponse.json({ error: error.message, proveedores: [] }, { status: 500 });
  }
}
