import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
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

Cuando detectes que el usuario quiere generar una cuenta de cobro, responde EXACTAMENTE en este formato JSON (sin markdown, sin texto adicional):
{"accion":"generar_cuenta","nombre":"NOMBRE COMPLETO","valor":000000,"concepto":"descripción del concepto"}

Si falta algún dato, pregunta por él antes de responder con ese JSON.

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
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
          // Buscar cédula del proveedor en Supabase
          let cedula = "Por definir";
          try {
            const sbRes = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/proveedores?nombre=ilike.%25${encodeURIComponent(accion.nombre)}%25&select=nombre,cedula&limit=1`,
              {
                headers: {
                  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
                },
              }
            );
            const sbData = await sbRes.json();
            if (sbData?.[0]?.cedula) cedula = sbData[0].cedula;
          } catch (e) {
            console.warn("No se pudo consultar Supabase para la cédula:", e);
          }

          // Buscar firma en Cloudinary
          let firmaUrl: string | null = null;
          try {
            const origen = req.nextUrl.origin || "http://localhost:3000";
            const firmRes = await fetch(
              `${origen}/api/buscar-firma?nombre=${encodeURIComponent(accion.nombre)}`
            );
            if (firmRes.ok) {
              const firmData = await firmRes.json();
              if (firmData.firmaUrl) firmaUrl = firmData.firmaUrl;
            }
          } catch (e) {
            console.warn("No se pudo buscar firma:", e);
          }

          return NextResponse.json({
            tipo: "cuenta_cobro",
            mensaje: `✅ Encontré los datos de **${accion.nombre}**. Voy a generar la cuenta de cobro ahora...`,
            datos: {
              nombre: accion.nombre,
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
