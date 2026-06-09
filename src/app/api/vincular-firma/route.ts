import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { nombrePersona, urlFirma } = await req.json();

    if (!nombrePersona || !urlFirma) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 1. Descargar la imagen de la firma existente
    const imageRes = await fetch(urlFirma);
    if (!imageRes.ok) {
      throw new Error("No se pudo descargar la firma original");
    }
    const blob = await imageRes.blob();

    // 2. Subir a Cloudinary con el nuevo nombre (el de la persona)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS;
    const apiKey = process.env.CLOUDINARY_API_KEY_FIRMAS;
    const apiSecret = process.env.CLOUDINARY_API_SECRET_FIRMAS;
    
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Credenciales de Cloudinary no configuradas");
    }

    const folder = "firmas/trabajadors";
    const publicId = nombrePersona.trim().replace(/\s+/g, "_");
    const timestamp = Math.round(Date.now() / 1000);

    const strToSign = `folder=${folder}&invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    const uploadData = new FormData();
    uploadData.append("file", blob);
    uploadData.append("api_key", apiKey);
    uploadData.append("timestamp", String(timestamp));
    uploadData.append("signature", signature);
    uploadData.append("folder", folder);
    uploadData.append("public_id", publicId);
    uploadData.append("invalidate", "true");

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Error subiendo a Cloudinary:", errText);
      throw new Error("Error vinculando la firma en Cloudinary");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en vincular-firma:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
