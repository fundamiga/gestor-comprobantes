import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Caché en memoria para reducir llamadas a Cloudinary.
// NOTA: En Vercel (serverless) cada instancia tiene su propia memoria,
// por eso siempre hay que pasar ?refresh=true después de subir una firma.
// TTL corto (30 s) para que un reemplazo reciente se refleje pronto.
let cachedFirmas: { nombre: string; url: string }[] = [];
let lastFetch = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

interface CloudinaryResource {
  public_id: string;
  display_name: string;
  secure_url: string;
  format: string;
}

async function fetchAllFromFolder(
  cloudName: string,
  auth: string,
  folder: string
): Promise<{ nombre: string; url: string }[]> {
  const results: { nombre: string; url: string }[] = [];
  let nextCursor: string | undefined = undefined;

  do {
    const params = new URLSearchParams({
      type: "upload",
      prefix: folder,
      max_results: "500",
    });
    if (nextCursor) params.set("next_cursor", nextCursor);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?${params.toString()}`,
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    if (!res.ok) {
      console.error(`Error fetching ${folder}: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();

    for (const resource of (data.resources ?? []) as CloudinaryResource[]) {
      // display_name es como "melissa_garzon", lo convertimos a "Melissa Garzon"
      const displayName = resource.display_name
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      results.push({
        nombre: displayName,
        url: resource.secure_url,
      });
    }

    nextCursor = data.next_cursor;
  } while (nextCursor);

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS;
    const apiKey = process.env.CLOUDINARY_API_KEY_FIRMAS;
    const apiSecret = process.env.CLOUDINARY_API_SECRET_FIRMAS;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Credenciales de Cloudinary no configuradas" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Revisar cache
    const now = Date.now();
    if (!forceRefresh && cachedFirmas.length > 0 && now - lastFetch < CACHE_TTL_MS) {
      return NextResponse.json({ firmas: cachedFirmas });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const subCarpetas = [
      "firmas/responsable_conteos",
      "firmas/supervisors",
      "firmas/trabajadors",
    ];

    const allFirmas: { nombre: string; url: string }[] = [];
    const seen = new Set<string>();

    for (const carpeta of subCarpetas) {
      const firmas = await fetchAllFromFolder(cloudName, auth, carpeta);
      for (const f of firmas) {
        if (!seen.has(f.nombre)) {
          seen.add(f.nombre);
          allFirmas.push(f);
        }
      }
    }

    allFirmas.sort((a, b) => a.nombre.localeCompare(b.nombre));

    cachedFirmas = allFirmas;
    lastFetch = now;

    return NextResponse.json({ firmas: allFirmas });
  } catch (error: any) {
    console.error("Error listando firmas de Cloudinary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
