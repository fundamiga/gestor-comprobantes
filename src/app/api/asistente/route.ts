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

PARA GENERAR CUENTA DE COBRO necesitas extraer del mensaje:
- nombre: nombre completo del proveedor
- valor: monto en pesos colombianos (número entero)
- concepto: descripción del servicio prestado

Cuando tengas los 3 datos requeridos (nombre, valor y concepto), responde EXACTAMENTE en este formato JSON (sin markdown, sin texto adicional):
{"accion":"generar_cuenta","nombre":"NOMBRE COMPLETO","valor":000000,"concepto":"descripción del concepto"}

Si falta el valor o el concepto, sé amable y pregúntale al usuario por el dato que falta para poder generar el documento.

REGLAS:
- Responde siempre en español colombiano, claro y profesional.
- Sé amable y conciso.
- Si no sabes algo del sistema, dilo honestamente.
- El NIT de Fundamiga es 901.369.891-9.
- La dirección es Yumbo, Valle del Cauca, Colombia.`;

export async function POST(req: NextRequest) {
  try {
    const { mensaje, historial } = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "Falta GEMINI_API_KEY en las variables de entorno." }, { status: 500 });
    }

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
    const jsonMatch = respuestaTexto.match(/\{[\s\S]*?"accion"\s*:\s*"generar_cuenta"[\s\S]*?\}/) || respuestaTexto.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const accion = JSON.parse(jsonMatch[0]);
        if (accion.accion === "generar_cuenta") {
          let nombreFinal = accion.nombre;
          let cedula = "Por definir";

          // 1. Buscar proveedor en Supabase con coincidencia flexible por palabras
          try {
            const palabras = accion.nombre.trim().split(/\s+/).filter((p: string) => p.length > 1);
            const patron = palabras.map((p: string) => encodeURIComponent(p)).join("%25");
            const sbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/proveedores?nombre=ilike.%25${patron}%25&select=nombre,cedula&limit=1`;
            
            const sbRes = await fetch(sbUrl, {
              headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
              },
            });
            const sbData = await sbRes.json();
            if (sbData?.[0]) {
              if (sbData[0].nombre) nombreFinal = sbData[0].nombre;
              if (sbData[0].cedula) cedula = sbData[0].cedula;
            }
          } catch (e) {
            console.warn("No se pudo consultar Supabase para la cédula:", e);
          }

          // 2. Buscar firma en Cloudinary (probando tanto el nombre oficial como el escrito)
          let firmaUrl: string | null = null;
          const nombresABuscar = Array.from(new Set([nombreFinal, accion.nombre]));
          const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ddbti1112";
          const subCarpetas = ["trabajadors", "supervisors", "responsable_conteos", ""];

          for (const nom of nombresABuscar) {
            if (firmaUrl) break;
            const variantes = [
              nom.trim(),
              nom.trim().replace(/\s+/g, '_'),
              nom.trim().toLowerCase().replace(/\s+/g, '_'),
              nom.trim().replace(/\s+/g, '-'),
              nom.trim().toLowerCase().replace(/\s+/g, '-')
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

          return NextResponse.json({
            tipo: "cuenta_cobro",
            mensaje: `✅ Datos encontrados para **${nombreFinal}** (C.C. ${cedula}). Generando cuenta de cobro por **$${Number(accion.valor).toLocaleString('es-CO')}**...`,
            datos: {
              nombre: nombreFinal,
              cedula,
              valor: accion.valor,
              concepto: accion.concepto,
              firmaUrl,
            },
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
