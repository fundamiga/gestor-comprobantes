import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    const nombreStr = nombre.trim();
    const cedulaStr = cedula.trim();

    const { data, error } = await supabase
      .from("proveedores")
      .update({ nombre: nombreStr, cedula: cedulaStr })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error editando proveedor en Supabase:", error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "Ya existe otra persona con este nombre" },
          { status: 409 }
        );
      }
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No se encontró la persona a editar" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      proveedor: data[0],
    });
  } catch (error: any) {
    console.error("Error en editar-proveedor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
