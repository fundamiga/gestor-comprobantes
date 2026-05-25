import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nombre = searchParams.get("nombre");

    if (!nombre) {
      return NextResponse.json({ error: "Nombre no proporcionado" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: "Falta configurar NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS" }, { status: 500 });
    }

    // Carpeta en Cloudinary, si no usas carpeta, déjala vacía ("") en tus variables de entorno.
    // Por defecto asume que tienes una carpeta llamada "firmas"
    const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "firmas";
    const folderPath = folder ? `${folder}/` : "";

    // Intentamos buscar la imagen con el nombre en distintos formatos por si acaso
    // Ej: "Juan Perez", "juan_perez", "juan-perez", "juanperez"
    const nombreNormal = nombre.trim();
    const nombreLower = nombreNormal.toLowerCase();
    
    const variantesNombres = [
      nombreNormal, // "Juan Perez"
      nombreNormal.replace(/\s+/g, '_'), // "Juan_Perez"
      nombreLower.replace(/\s+/g, '_'), // "juan_perez"
      nombreLower.replace(/\s+/g, '-'), // "juan-perez"
      nombreLower.replace(/\s+/g, ''),  // "juanperez"
    ];

    const formatos = ["png", "jpg", "jpeg"];
    
    // Subcarpetas específicas dentro de "firmas" (según la captura del usuario)
    const subCarpetas = [
      "responsable_conteos",
      "supervisors",
      "trabajadors",
      "" // También buscamos directamente en firmas/ por si acaso
    ];

    let firmaUrlEncontrada = null;

    // Buscamos la primera coincidencia
    for (const subCarpeta of subCarpetas) {
      if (firmaUrlEncontrada) break;
      const subRuta = subCarpeta ? `${subCarpeta}/` : "";
      
      for (const variante of variantesNombres) {
        if (firmaUrlEncontrada) break;
        for (const formato of formatos) {
          // Cloudinary encodea los espacios como %20
          const encodedVariante = encodeURIComponent(variante);
          const url = `https://res.cloudinary.com/${cloudName}/image/upload/${folderPath}${subRuta}${encodedVariante}.${formato}`;
          
          try {
            // Hacemos una petición HEAD rápida para ver si la imagen existe
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) {
              firmaUrlEncontrada = url;
              break; // Encontramos la firma, dejamos de buscar
            }
          } catch (err) {
            // Error de red, ignoramos e intentamos el siguiente
          }
        }
      }
    } 
    
    return NextResponse.json({ firmaUrl: firmaUrlEncontrada }, { status: 200 });

  } catch (error: any) {
    console.error("Error buscando firma en Cloudinary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
