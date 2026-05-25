import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { data: proveedores, error } = await supabase
      .from("proveedores")
      .select("id, nombre, cedula")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error consultando proveedores en Supabase:", error);
      throw error;
    }

    return NextResponse.json({ proveedores: proveedores || [] });
  } catch (error: any) {
    console.error("Error listando proveedores:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
