import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nombre = searchParams.get("nombre");

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
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

    const publicId = `firmas/trabajadors/${nombre.trim().replace(/\s+/g, "_")}`;
    const timestamp = Math.round(Date.now() / 1000);

    // Generar firma para el endpoint de destroy
    // La firma se hace con los parámetros de la petición excepto api_key, resource_type y file, ordenados alfabéticamente
    const strToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error eliminando de Cloudinary:", errorText);
      return NextResponse.json(
        { error: "Error eliminando la firma en Cloudinary" },
        { status: 500 }
      );
    }

    const data = await res.json();
    
    if (data.result !== "ok" && data.result !== "not found") {
       throw new Error(data.result);
    }

    return NextResponse.json({
      success: true,
      result: data.result
    });
  } catch (error: any) {
    console.error("Error en borrar-firma:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
