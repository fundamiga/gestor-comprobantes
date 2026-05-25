import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Insertar en Supabase. Si el nombre ya existe (ignorando mayúsculas/minúsculas), fallará por el índice único
    const { data, error } = await supabase
      .from("proveedores")
      .insert([{ nombre: nombreStr, cedula: cedulaStr }])
      .select();

    if (error) {
      console.error("Error insertando proveedor en Supabase:", error);
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: "Esta persona ya existe en la base de datos" },
          { status: 409 }
        );
      }
      throw error;
    }

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
