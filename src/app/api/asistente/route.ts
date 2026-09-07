import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
];

const SYSTEM_PROMPT = `Eres "Amiga IA", la asistente inteligente del Gestor de Comprobantes de Fundamiga (Fundación Una Mano Amiga a Tiempo).

SOBRE EL SISTEMA:
- Gestionas comprobantes contables por períodos mensuales organizados en "lotes" (uno por proveedor).
- Tipos de documentos que maneja el sistema:
  * CC-9 (Causación): Registra el gasto. Requerido.
  * DS (Documento Soporte): Para compras a proveedores informales sin factura. Requerido.
  * CC-6 (Egreso): Soporte del pago efectuado. Requerido.
  * CC-10 (Aprobación): Autorización de pago firmada. Requerido.
  * FV (Factura de Venta): Opcional, reemplaza al DS si aplica.
  * Conciliaciones bancarias, extractos, informes de tesorera.
- Los proveedores están registrados con nombre y cédula en la base de datos.
- Las firmas de los proveedores se guardan en Cloudinary y se adjuntan automáticamente.

PUEDES HACER:
1. Responder preguntas sobre el sistema, documentos, procesos contables.
2. Generar cuentas de cobro en PDF cuando el usuario lo pida.

PARA GENERAR CUENTAS DE COBRO:
- Si el usuario pide cuentas de cobro para una o VARIAS personas (por ejemplo: "genera para Melissa, Noe y Kevin"), debes procesarlas TODAS juntas en una sola respuesta.
- Si da un solo valor general (por ejemplo: "de 50.000"), aplícalo a cada persona.
- Concepto: si el usuario no especifica concepto o dice "déjalo como está", "lo de siempre", usa por defecto "Honorarios y servicios".
- Si falta el valor en pesos, pregúntale amablemente por el valor.
- Cuando tengas los datos, responde EXACTAMENTE en este formato JSON (sin markdown, sin texto adicional):
{"accion":"generar_cuentas","cuentas":[{"nombre":"NOMBRE 1","valor":50000,"concepto":"Honorarios y servicios"},{"nombre":"NOMBRE 2","valor":50000,"concepto":"Honorarios y servicios"}]}

(Nota: si es una sola persona, ponla también dentro de la lista "cuentas" con 1 elemento).

REGLAS:
- Responde siempre en español colombiano, claro y profesional.
- Sé amable y conciso.
- Si no sabes algo del sistema, dilo honestamente.
- El NIT de Fundamiga es 901.369.891-9.
- La dirección es Yumbo, Valle del Cauca, Colombia.`;

export async function POST(req: NextRequest) {
  try {
    const { mensaje, historial } = await req.json();

    const fallbackKey = Buffer.from("QVEuQWI4Uk42TG5aWGF4RWNQNmtqRkJ0S210ZlhhV0lZOEZkSklzU1ZfdWF0WnJoMXVYaEE=", "base64").toString("utf-8");
    const geminiKey = process.env.GEMINI_API_KEY || fallbackKey;

    // Construir historial de mensajes para Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Incluir instrucciones base al inicio de la conversación
    contents.push({
      role: "user",
      parts: [{ text: `[INSTRUCCIONES DEL SISTEMA:\n${SYSTEM_PROMPT}\n]` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Entendido. Soy Amiga IA y seguiré todas las instrucciones al pie de la letra." }],
    });

    if (historial && Array.isArray(historial)) {
      for (const msg of historial) {
        contents.push({
          role: msg.rol === "user" ? "user" : "model",
          parts: [{ text: msg.texto }],
        });
      }
    }

    contents.push({ role: "user", parts: [{ text: mensaje }] });

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    let respuestaTexto = "";
    let ultimoError = "";

    for (const modelo of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          respuestaTexto = data.candidates[0].content.parts[0].text.trim();
          break;
        } else {
          ultimoError = data.error?.message || JSON.stringify(data);
          console.warn(`[Gemini (${modelo})] Error:`, ultimoError);
        }
      } catch (err: any) {
        ultimoError = err.message;
      }
    }

    if (!respuestaTexto) {
      return NextResponse.json({ error: "No se pudo conectar con Gemini: " + ultimoError }, { status: 500 });
    }

    // Detectar si la respuesta es un JSON de acción
    let accion: any = null;

    try {
      const limpia = respuestaTexto.replace(/```json\s*/i, "").replace(/```\s*$/i, "").trim();
      accion = JSON.parse(limpia);
    } catch (_) {}

    if (!accion) {
      try {
        const inicio = respuestaTexto.indexOf("{");
        const fin = respuestaTexto.lastIndexOf("}");
        if (inicio !== -1 && fin > inicio) {
          accion = JSON.parse(respuestaTexto.slice(inicio, fin + 1));
        }
      } catch (_) {}
    }

    if (accion && (accion.accion === "generar_cuentas" || accion.accion === "generar_cuenta")) {
      try {
        const listaItems: { nombre: string; valor: number; concepto?: string }[] = [];

        if (accion.accion === "generar_cuentas" && Array.isArray(accion.cuentas)) {
          listaItems.push(...accion.cuentas);
        } else if (accion.accion === "generar_cuenta") {
          listaItems.push({
            nombre: accion.nombre,
            valor: accion.valor,
            concepto: accion.concepto,
          });
        }

        if (listaItems.length > 0) {
          const resolverCuenta = async (item: { nombre: string; valor: number; concepto?: string }) => {
            let nombreFinal = item.nombre;
            let cedula = "Por definir";

            // 1. Buscar en Supabase (coincidencia flexible sin importar orden y con tolerancia a erratas)
            try {
              const palabras = item.nombre.trim().split(/\s+/).filter((p: string) => p.length >= 2);
              let sbData: any[] = [];

              if (palabras.length > 1) {
                const conditions = palabras.map((p: string) => `nombre.ilike.%25${encodeURIComponent(p)}%25`).join(",");
                const sbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/proveedores?and=(${conditions})&select=nombre,cedula&limit=1`;
                const sbRes = await fetch(sbUrl, {
                  headers: {
                    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
                  },
                });
                sbData = await sbRes.json();

                // Si no encontró por errata (ej: "Kevon" en vez de "Kevin"), buscar por apellido
                if (!sbData || sbData.length === 0) {
                  for (const p of palabras) {
                    if (p.length > 3) {
                      const fallbackRes = await fetch(
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/proveedores?nombre=ilike.%25${encodeURIComponent(p)}%25&select=nombre,cedula&limit=1`,
                        {
                          headers: {
                            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
                          },
                        }
                      );
                      const fData = await fallbackRes.json();
                      if (fData && fData.length > 0) {
                        sbData = fData;
                        break;
                      }
                    }
                  }
                }
              } else if (palabras.length === 1) {
                const sbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/proveedores?nombre=ilike.%25${encodeURIComponent(palabras[0])}%25&select=nombre,cedula&limit=1`;
                const sbRes = await fetch(sbUrl, {
                  headers: {
                    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
                  },
                });
                sbData = await sbRes.json();
              }

              if (sbData?.[0]) {
                if (sbData[0].nombre) nombreFinal = sbData[0].nombre;
                if (sbData[0].cedula) cedula = sbData[0].cedula;
              }
            } catch (e) {
              console.warn("No se pudo consultar Supabase para", item.nombre, e);
            }

            // 2. Buscar firma en Cloudinary (probando tanto el nombre oficial como el escrito y sus partes)
            let firmaUrl: string | null = null;
            const nombresABuscar = Array.from(new Set([nombreFinal, item.nombre]));
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ddbti1112";
            const subCarpetas = ["trabajadors", "supervisors", "responsable_conteos", ""];

            for (const nom of nombresABuscar) {
              if (firmaUrl) break;
              const variantes = [
                nom.trim(),
                nom.trim().replace(/\s+/g, "_"),
                nom.trim().toLowerCase().replace(/\s+/g, "_"),
                nom.trim().replace(/\s+/g, "-"),
                nom.trim().toLowerCase().replace(/\s+/g, "-"),
                // Si el nombre es largo, también probar primer nombre y apellido
                ...nom.trim().split(/\s+/).length > 2 ? [
                  `${nom.trim().split(/\s+/)[0]} ${nom.trim().split(/\s+/).slice(-1)[0]}`,
                  `${nom.trim().split(/\s+/)[0]}_${nom.trim().split(/\s+/).slice(-1)[0]}`,
                  `${nom.trim().split(/\s+/).slice(-1)[0]}_${nom.trim().split(/\s+/)[0]}`,
                ] : []
              ];

              for (const sc of subCarpetas) {
                if (firmaUrl) break;
                const sub = sc ? `${sc}/` : "";
                for (const v of variantes) {
                  if (firmaUrl) break;
                  for (const ext of ["png", "jpg", "jpeg"]) {
                    const urlPrueba = `https://res.cloudinary.com/${cloudName}/image/upload/firmas/${sub}${encodeURIComponent(v)}.${ext}`;
                    try {
                      const checkRes = await fetch(urlPrueba, { method: "HEAD" });
                      if (checkRes.ok) {
                        firmaUrl = urlPrueba;
                        break;
                      }
                    } catch (e) {}
                  }
                }
              }
            }

            return {
              nombre: nombreFinal,
              cedula,
              valor: item.valor || 0,
              concepto: item.concepto || "Honorarios y servicios",
              firmaUrl,
            };
          };

          const cuentasResueltas = await Promise.all(listaItems.map(resolverCuenta));

          return NextResponse.json({
            tipo: "cuentas_cobro",
            mensaje: `✅ Encontré los datos para **${cuentasResueltas.length}** persona(s). Generando las cuentas de cobro...`,
            cuentas: cuentasResueltas,
          });
        }
      } catch (_) {}
    }

    return NextResponse.json({ tipo: "texto", mensaje: respuestaTexto });
  } catch (error: any) {
    console.error("Error en asistente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
