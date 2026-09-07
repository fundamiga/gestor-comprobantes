import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
];

function crearSystemPrompt(fechaHoyStr: string, fechaAyerStr: string, anioActual: number) {
  return `Eres "Amiga IA", la asistente inteligente, bibliotecaria y auditora contable experta del Gestor de Comprobantes de Fundamiga (Fundación Una Mano Amiga a Tiempo).
FECHA ACTUAL DE HOY: ${fechaHoyStr}.

TU PAPEL COMO BIBLIOTECARIA Y AUDITORA CONTABLE:
- Conoces con exactitud milimétrica la ubicación de cada período (mes/año), lote (proveedor), carpeta de documento (CC-9, DS, CC-6, CC-10, FV, Bancos, etc.) y cada archivo subido.
- Eres guardiana del ORDEN y de la INTEGRIDAD de los comprobantes:
  1. AUDITORÍA DE CONSECUTIVOS: Verificas la secuencia numérica. Si hay saltos (gaps/faltantes) o repetidos, los reportas con precisión (ej: "En DS faltan los consecutivos del 4418 al 4432").
  2. AUDITORÍA DE PAREJAS: En los documentos que exigen parejas (CC-9, DS, CC-6, CC-10), sabes cuáles parejas tienen sus 2 archivos completos y cuáles están incompletas (1 archivo de 2).
  3. AUDITORÍA DE LOTES: Sabes qué lotes están incompletos y qué documentos obligatorios les faltan (CC-9 Causación, DS Soporte, CC-6 Egreso, CC-10 Aprobación).

ASISTENCIA ACTIVA Y GENERACIÓN PROACTIVA (COMPLETAR PAREJAS):
- Si el usuario te pregunta qué falta, o si al auditar detectas una pareja incompleta (ej: Pareja 1 de Melissa Garzón tiene el soporte DIAN pero le falta la cuenta de cobro):
  Ofrécele proactivamente completarla:
  *"En el lote de Melissa Garzón falta el soporte de la Pareja X (#4380). ¿Deseas que generemos la cuenta de cobro en PDF con su firma para completarla ahora mismo? Solo confírmame el valor y concepto."*
- Si el usuario autoriza o te da los datos (o te dice "sí, hazla"), emite inmediatamente el JSON de generación de cuentas.

NAVEGACIÓN INTELIGENTE E INSTANTÁNEA:
- Si el usuario te pide ir a cualquier parte, ver archivos o abrir carpetas (ejemplos: "llévame al lote de Melissa", "muéstrame los archivos DS de enero", "llévame a enero 2026", "dónde está el error de CC-10? llévame"):
  Debes responder con el JSON de navegación EXACTO (sin markdown adicional):
  {"accion":"navegar","periodoId":"ID_PERIODO_OPCIONAL","loteId":"ID_LOTE_OPCIONAL","tipoId":"ID_TIPO_OPCIONAL","mensaje":"¡Con gusto! Te llevo a [ubicación]..."}

PARA GENERAR CUENTAS DE COBRO:
- Si el usuario pide cuentas de cobro para una o VARIAS personas (por ejemplo: "genera para Melissa, Noe y Kevin"), procesa TODAS en una sola respuesta.
- Si da un solo valor general (por ejemplo: "de 50.000"), aplícalo a cada persona.
- Concepto por defecto si no se especifica: "Honorarios y servicios".
- Fecha por defecto: hoy (${fechaHoyStr}). Si menciona otra fecha, conviértela a YYYY-MM-DD.
- Cuando tengas los datos, responde EXACTAMENTE en este JSON:
  {"accion":"generar_cuentas","cuentas":[{"nombre":"NOMBRE","valor":50000,"concepto":"Honorarios y servicios","fecha":"${fechaHoyStr}"}]}

REGLAS DE COMUNICACIÓN:
- Responde siempre en español colombiano, amable, claro, estructurado y profesional.
- Usa viñetas y formato claro cuando hagas reportes de auditoría.
- El NIT de Fundamiga es 901.369.891-9, sede Yumbo, Valle del Cauca.`;
}

// ─── CACHÉ Y BÚSQUEDA RÁPIDA DE FIRMAS DE CLOUDINARY ───────────────────────
let cachedFirmas: { nombre: string; url: string }[] = [];
let lastFetchFirmas = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché en memoria

async function obtenerTodasLasFirmas(): Promise<{ nombre: string; url: string }[]> {
  const now = Date.now();
  if (cachedFirmas.length > 0 && now - lastFetchFirmas < CACHE_TTL_MS) {
    return cachedFirmas;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_FIRMAS || "ddbti1112";
  const apiKey = process.env.CLOUDINARY_API_KEY_FIRMAS || "763334958941215";
  const apiSecret = process.env.CLOUDINARY_API_SECRET_FIRMAS || "2umW5FqDTV-P2knCxn4pOKWT790";

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const subCarpetas = [
    "firmas/responsable_conteos",
    "firmas/supervisors",
    "firmas/trabajadors",
  ];

  const todas: { nombre: string; url: string }[] = [];
  await Promise.all(
    subCarpetas.map(async (carpeta) => {
      try {
        const params = new URLSearchParams({
          type: "upload",
          prefix: carpeta,
          max_results: "500",
        });
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?${params.toString()}`,
          { headers: { Authorization: `Basic ${auth}` } }
        );
        const data = await res.json();
        if (data.resources) {
          for (const r of data.resources) {
            todas.push({
              nombre: (r.display_name || r.public_id.split("/").pop() || "").replace(/_/g, " ").toLowerCase().trim(),
              url: r.secure_url,
            });
          }
        }
      } catch (_) {}
    })
  );

  if (todas.length > 0) {
    cachedFirmas = todas;
    lastFetchFirmas = now;
  }
  return cachedFirmas;
}

function buscarFirmaEnLista(nombres: string[], listaFirmas: { nombre: string; url: string }[]): string | null {
  for (const nombre of nombres) {
    if (!nombre) continue;
    const norm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const palabras = norm.split(/\s+/).filter((p) => p.length >= 2);

    // 1. Coincidencia exacta
    const ex = listaFirmas.find((f) => f.nombre.toLowerCase().trim() === norm);
    if (ex) return ex.url;

    // 2. Coincidencia si contiene todas las palabras
    if (palabras.length > 1) {
      const ct = listaFirmas.find((f) => {
        const fn = f.nombre.toLowerCase();
        return palabras.every((p) => fn.includes(p));
      });
      if (ct) return ct.url;
    }

    // 3. Coincidencia si contiene al menos 2 palabras clave
    if (palabras.length >= 2) {
      const best = listaFirmas.find((f) => {
        const fn = f.nombre.toLowerCase();
        let matches = 0;
        for (const p of palabras) {
          if (p.length > 3 && fn.includes(p)) matches++;
        }
        return matches >= 2;
      });
      if (best) return best.url;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { mensaje, historial, contexto } = await req.json();

    const fallbackKey = Buffer.from("QVEuQWI4Uk42TG5aWGF4RWNQNmtqRkJ0S210ZlhhV0lZOEZkSklzU1ZfdWF0WnJoMXVYaEE=", "base64").toString("utf-8");
    const geminiKey = process.env.GEMINI_API_KEY || fallbackKey;

    // Calcular fecha en zona horaria de Colombia (UTC-5)
    const hoy = new Date();
    const fechaColombia = new Date(hoy.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const anioActual = fechaColombia.getFullYear();
    const mesActual = String(fechaColombia.getMonth() + 1).padStart(2, "0");
    const diaActual = String(fechaColombia.getDate()).padStart(2, "0");
    const fechaHoyStr = `${anioActual}-${mesActual}-${diaActual}`;

    const ayer = new Date(fechaColombia);
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyerStr = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, "0")}-${String(ayer.getDate()).padStart(2, "0")}`;

    const systemPrompt = crearSystemPrompt(fechaHoyStr, fechaAyerStr, anioActual);

    // Construir bloque de datos reales del sistema si vienen del cliente
    let contextoStr = "";
    if (contexto) {
      const { periodoActivoNombre, periodos: pList } = contexto;
      contextoStr += `\n\n═════════════════════════════════════════════════════════════\n`;
      contextoStr += `BASE DE DATOS Y ESTADO DEL ARCHIVO EN TIEMPO REAL:\n`;
      if (periodoActivoNombre) {
        contextoStr += `(El usuario está viendo actualmente el período: ${periodoActivoNombre})\n`;
      }

      if (pList && pList.length > 0) {
        for (const p of pList) {
          contextoStr += `\n📁 PERÍODO: ${p.nombre} [id: ${p.id}] ${p.activo ? "★ ACTIVO" : ""}\n`;
          contextoStr += `   Total Lotes: ${p.totalLotes}\n`;

          if (p.alertasConsecutivos && p.alertasConsecutivos.length > 0) {
            contextoStr += `   📊 Auditoría de Consecutivos de este período:\n`;
            for (const a of p.alertasConsecutivos) {
              if ((a.faltantes && a.faltantes.length > 0) || (a.repetidos && a.repetidos.length > 0)) {
                contextoStr += `     - ${a.tipoLabel} (${a.tipoId}): ${a.rango ? `rango ${a.rango}` : ""} | FALTAN ${a.faltantes.length} números (${a.faltantes.slice(0, 10).join(", ")}${a.faltantes.length > 10 ? "..." : ""}) | Repetidos: ${a.repetidos.join(", ") || "0"}\n`;
              } else if (a.rango) {
                contextoStr += `     - ${a.tipoLabel} (${a.tipoId}): secuencia correcta ${a.rango} (sin saltos)\n`;
              }
            }
          }

          contextoStr += `   📋 Lotes en este período:\n`;
          for (const l of (p.lotes || [])) {
            contextoStr += `     * Lote "${l.proveedor}" [id: ${l.id}] | Estado: ${l.estado}\n`;
            if (l.requeridosFaltantes && l.requeridosFaltantes.length > 0) {
              contextoStr += `       ⚠️ Faltan documentos requeridos: ${l.requeridosFaltantes.join(", ")}\n`;
            }
            if (l.documentos) {
              for (const [tipoId, d] of Object.entries(l.documentos) as any) {
                if (d.incompletas && d.incompletas.length > 0) {
                  contextoStr += `       ⚠️ ${tipoId}: Tiene ${d.incompletas.length} pareja(s) INCOMPLETA(S):\n`;
                  for (const inc of d.incompletas) {
                    contextoStr += `          - ${inc.pareja} (${inc.num ? '#' + inc.num : 'sin número'}): solo tiene "${inc.archivoPresente}", falta ${inc.falta}\n`;
                  }
                } else if (d.totalParejas) {
                  contextoStr += `       ✅ ${tipoId}: ${d.completasCount} pareja(s) completas (${d.totalArchivos} archivos)\n`;
                } else if (d.totalArchivos) {
                  contextoStr += `       📄 ${tipoId}: ${d.totalArchivos} archivo(s)\n`;
                }
              }
            }
          }
        }
      }
      contextoStr += `═════════════════════════════════════════════════════════════\n`;
      contextoStr += `INSTRUCCIONES CLAVE DE NAVEGACIÓN:\n`;
      contextoStr += `- Cuando el usuario pida ir a una carpeta, período o lote ("llévame a...", "muéstrame...", "ir a...", "abre..."), responde EXACTAMENTE en este JSON:\n`;
      contextoStr += `{"accion":"navegar","periodoId":"ID_PERIODO","loteId":"ID_LOTE","tipoId":"ID_TIPO","mensaje":"¡Con gusto! Te llevo a [descripción]..."}\n`;
      contextoStr += `- Si el usuario solo pide un período, envía periodoId. Si pide un lote, incluye loteId. Si pide ver un tipo de documento (ej: DS, CC-9, CC-10), incluye tipoId.\n`;
    }

    // Construir historial de mensajes para Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Incluir instrucciones base al inicio de la conversación
    contents.push({
      role: "user",
      parts: [{ text: `[INSTRUCCIONES DEL SISTEMA:\n${systemPrompt}${contextoStr}\n]` }],
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

    if (accion && accion.accion === "navegar" && (accion.loteId || accion.periodoId || accion.tipoId)) {
      return NextResponse.json({
        tipo: "navegar",
        periodoId: accion.periodoId || null,
        loteId: accion.loteId || null,
        tipoId: accion.tipoId || null,
        mensaje: accion.mensaje || "Te llevo ahí.",
      });
    }

    if (accion && (accion.accion === "generar_cuentas" || accion.accion === "generar_cuenta")) {
      try {
        const listaItems: { nombre: string; valor: number; concepto?: string; fecha?: string }[] = [];

        if (accion.accion === "generar_cuentas" && Array.isArray(accion.cuentas)) {
          listaItems.push(...accion.cuentas);
        } else if (accion.accion === "generar_cuenta") {
          listaItems.push({
            nombre: accion.nombre,
            valor: accion.valor,
            concepto: accion.concepto,
            fecha: accion.fecha,
          });
        }

        if (listaItems.length > 0) {
          // 1. Obtener todas las firmas en 1 sola llamada (con caché en memoria)
          const todasLasFirmas = await obtenerTodasLasFirmas();

          // 2. Resolver cada cuenta en paralelo
          const resolverCuenta = async (item: { nombre: string; valor: number; concepto?: string; fecha?: string }) => {
            let nombreFinal = item.nombre;
            let cedula = "Por definir";

            // Buscar en Supabase (coincidencia flexible sin importar orden y con tolerancia a erratas)
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

            // Buscar firma en memoria al instante (0 ms)
            const firmaUrl = buscarFirmaEnLista([item.nombre, nombreFinal], todasLasFirmas);

            return {
              nombre: nombreFinal,
              cedula,
              valor: item.valor || 0,
              concepto: item.concepto || "Honorarios y servicios",
              fecha: item.fecha || fechaHoyStr,
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
