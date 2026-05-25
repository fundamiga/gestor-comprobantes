import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const nombre = formData.get("nombre") as string;
    const archivo = formData.get("firma") as File;

    if (!nombre || !archivo) {
      return NextResponse.json(
        { error: "Nombre y archivo de firma son obligatorios" },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS;
    const apiKey = process.env.CLOUDINARY_API_KEY_FIRMAS;
    const apiSecret = process.env.CLOUDINARY_API_SECRET_FIRMAS;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Credenciales de Cloudinary no configuradas" },
        { status: 500 }
      );
    }

    // Convertir nombre a public_id: "Ana Maria Lopez" -> "Ana_Maria_Lopez"
    const publicId = nombre.trim().replace(/\s+/g, "_");
    const folder = "firmas/trabajadors";
    const timestamp = Math.round(Date.now() / 1000);

    // Generar firma de Cloudinary (signed upload)
    const strToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    // Preparar FormData para Cloudinary
    const uploadData = new FormData();
    uploadData.append("file", archivo);
    uploadData.append("api_key", apiKey);
    uploadData.append("timestamp", String(timestamp));
    uploadData.append("signature", signature);
    uploadData.append("folder", folder);
    uploadData.append("public_id", publicId);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadData }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error subiendo a Cloudinary:", errorText);
      return NextResponse.json(
        { error: "Error subiendo la firma a Cloudinary" },
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      nombre: nombre.trim(),
      url: data.secure_url,
    });
  } catch (error: any) {
    console.error("Error en subir-firma:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
