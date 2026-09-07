"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Download, Bot, User, ExternalLink, Sparkles, CheckCircle2, AlertTriangle, FolderSearch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAsistenteContext } from "@/lib/asistente-context";
import { calcularEstadoLote, analizarConsecutivos, extraerNumeroConsecutivo } from "@/lib/utils";
import { MESES, TIPOS_DOCUMENTO } from "@/lib/constantes";
import type { ArchivoSubido } from "@/types";

interface ArchivoPDFItem {
  url: string;
  nombre: string;
  persona: string;
  valor: number;
  firmaUrl: string | null;
}

interface NavAccion {
  periodoId?: string;
  loteId?: string;
  tipoId?: string;
  label: string;
}

interface Mensaje {
  id: string;
  rol: "user" | "assistant";
  texto: string;
  pdfUrl?: string;
  pdfNombre?: string;
  archivosPdf?: ArchivoPDFItem[];
  navAccion?: NavAccion;
}

interface DatosCuenta {
  nombre: string;
  cedula: string;
  valor: number;
  concepto: string;
  fecha?: string;
  firmaUrl: string | null;
}

export function ChatAsistente() {
  const { periodos, periodoActivoId, alertasConsecutivos, navegarA } = useAsistenteContext();

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "bienvenida",
      rol: "assistant",
      texto: "Â¡Hola! Soy **Amiga IA**, tu bibliotecaria y auditora contable de Fundamiga. ðŸ“šâœ¨\n\nConozco todo el archivo contable y puedo:\n- ðŸ§­ **Llevarte a cualquier carpeta o archivo** (*\"llÃ©vame al lote de Melissa\"*, *\"muÃ©strame los DS de enero\"*)\n- ðŸ” **Auditar el orden y consecutivos** (*\"Â¿hay saltos en CC-10?\"*, *\"Â¿quÃ© falta en este mes?\"*)\n- ðŸ“ **Detectar parejas incompletas** y ayudarte a completarlas de inmediato\n- âœï¸ **Generar cuentas de cobro** en PDF con firma automÃ¡tica\n\nÂ¿En quÃ© te puedo apoyar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 200);
  }, [abierto]);

  // â”€â”€â”€ AuditorÃ­a profunda para el contexto de la Bibliotecaria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const construirContexto = () => {
    const periodoActivo = periodos.find((p) => p.id === periodoActivoId);

    const resumenPeriodos = periodos.map((p) => {
      let alertasMap: any = {};
      try {
        alertasMap = analizarConsecutivos(p);
      } catch (_) {}

      const lotesAuditados = p.lotes.map((l) => {
        const estado = calcularEstadoLote(l);
        const requeridosFaltantes = TIPOS_DOCUMENTO
          .filter((t) => t.requerido && (!l.documentos[t.id] || l.documentos[t.id].length === 0))
          .map((t) => `${t.label} (${t.id})`);

        const detalleTipos: Record<string, any> = {};

        Object.entries(l.documentos).forEach(([tipoId, archs]) => {
          if (!archs || archs.length === 0) return;
          const tipoDef = TIPOS_DOCUMENTO.find((t) => t.id === tipoId);
          const esParejas = typeof tipoDef?.minArchivos === "number" && tipoDef.minArchivos >= 2;

          if (esParejas) {
            const gruposMap: { [gid: string]: ArchivoSubido[] } = {};
            archs.forEach((a) => {
              const gid = a.grupoId || "grupo_inicial";
              if (!gruposMap[gid]) gruposMap[gid] = [];
              gruposMap[gid].push(a);
            });

            const parejasInfo = Object.entries(gruposMap).map(([gid, files]) => {
              const nombre = files[0]?.grupoNombre || "Pareja";
              const num = extraerNumeroConsecutivo(nombre, tipoId) || extraerNumeroConsecutivo(files[0]?.nombre || "", tipoId);
              return {
                nombre,
                consecutivo: num,
                completa: files.length >= 2,
                archivosCount: files.length,
                archivos: files.map((f) => f.nombre),
              };
            });

            detalleTipos[tipoId] = {
              tipoNombre: tipoDef?.nombre || tipoId,
              totalArchivos: archs.length,
              totalParejas: parejasInfo.length,
              completasCount: parejasInfo.filter((x) => x.completa).length,
              incompletas: parejasInfo.filter((x) => !x.completa).map((x) => ({
                pareja: x.nombre,
                num: x.consecutivo,
                archivoPresente: x.archivos[0] || "1 archivo",
                falta: "soporte complementario (cuenta de cobro o factura)",
              })),
            };
          } else {
            detalleTipos[tipoId] = {
              tipoNombre: tipoDef?.nombre || tipoId,
              totalArchivos: archs.length,
              archivos: archs.map((f) => f.nombre),
            };
          }
        });

        return {
          id: l.id,
          proveedor: l.proveedor,
          referencia: l.referencia,
          estado,
          requeridosFaltantes,
          documentos: detalleTipos,
        };
      });

      return {
        id: p.id,
        nombre: `${MESES[p.mes]} ${p.anio}`,
        activo: p.id === periodoActivoId,
        totalLotes: p.lotes.length,
        lotes: lotesAuditados,
        alertasConsecutivos: Object.entries(alertasMap).map(([tipoId, alerta]: [string, any]) => {
          const tipoDef = TIPOS_DOCUMENTO.find((t) => t.id === tipoId);
          return {
            tipoId,
            tipoLabel: tipoDef?.label || tipoId,
            rango: alerta.presentes?.length ? `del ${Math.min(...alerta.presentes)} al ${Math.max(...alerta.presentes)}` : null,
            faltantes: alerta.faltantes || [],
            repetidos: alerta.repetidos || [],
          };
        }),
      };
    });

    return {
      periodoActivoId,
      periodoActivoNombre: periodoActivo ? `${MESES[periodoActivo.mes]} ${periodoActivo.anio}` : null,
      periodos: resumenPeriodos,
    };
  };

  const generarPDF = async (datos: DatosCuenta): Promise<{ url: string; nombre: string } | null> => {
    try {
      const res = await fetch("/api/generar-cuenta-cobro-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error("Error generando el PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const nombre = `Cuenta_Cobro_${datos.nombre.replace(/\s+/g, "_")}.pdf`;
      return { url, nombre };
    } catch (e: any) {
      toast.error("Error generando PDF: " + e.message);
      return null;
    }
  };

  const enviarMensajeTexto = async (textoAEnviar: string) => {
    const texto = textoAEnviar.trim();
    if (!texto || cargando) return;

    const msgUser: Mensaje = { id: Date.now().toString(), rol: "user", texto };
    const historialParaApi = mensajes
      .filter((m) => m.id !== "bienvenida")
      .map((m) => ({ rol: m.rol, texto: m.texto }));

    setMensajes((prev) => [...prev, msgUser]);
    setInput("");
    setCargando(true);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: texto,
          historial: historialParaApi,
          contexto: construirContexto(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");

      // â”€â”€ AcciÃ³n de NavegaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (data.tipo === "navegar") {
        const pTarget = periodos.find((p) => p.id === data.periodoId) ||
          periodos.find((p) => p.lotes.some((l) => l.id === data.loteId)) ||
          periodos.find((p) => p.id === periodoActivoId) ||
          periodos[0];

        const loteTarget = pTarget?.lotes.find((l) => l.id === data.loteId);
        const tipoDef = data.tipoId ? TIPOS_DOCUMENTO.find((t) => t.id === data.tipoId) : null;

        let label = "";
        if (pTarget) label += `${MESES[pTarget.mes]} ${pTarget.anio}`;
        if (loteTarget) label += ` > ${loteTarget.proveedor}`;
        if (tipoDef) label += ` > ${tipoDef.label}`;
        if (!label) label = "UbicaciÃ³n solicitada";

        // Ejecutar navegaciÃ³n de inmediato
        navegarA(data.loteId, data.tipoId, data.periodoId);

        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "_nav",
            rol: "assistant",
            texto: data.mensaje || `ðŸ“‚ Â¡Te llevo a: **${label}**!`,
            navAccion: {
              periodoId: data.periodoId,
              loteId: data.loteId,
              tipoId: data.tipoId,
              label,
            },
          },
        ]);
        return;
      }

      // â”€â”€ Cuentas de Cobro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const listaCuentas: DatosCuenta[] = data.cuentas || (data.datos ? [data.datos] : []);

      if (listaCuentas.length > 0) {
        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "_c",
            rol: "assistant",
            texto: data.mensaje || `âœ… Generando ${listaCuentas.length} cuenta(s) de cobro...`,
          },
        ]);

        const resultados = await Promise.all(
          listaCuentas.map(async (c) => {
            const pdf = await generarPDF(c);
            return pdf ? { url: pdf.url, nombre: pdf.nombre, persona: c.nombre, valor: c.valor, firmaUrl: c.firmaUrl } : null;
          })
        );
        const generados = resultados.filter((item): item is ArchivoPDFItem => item !== null);

        if (generados.length > 0) {
          setMensajes((prev) => [
            ...prev,
            {
              id: Date.now().toString() + "_pdf",
              rol: "assistant",
              texto: `ðŸ“„ Â¡Listo! Se generaron con Ã©xito **${generados.length}** cuenta(s) de cobro:`,
              archivosPdf: generados,
            },
          ]);
        }
      } else {
        // Respuesta de texto / informe
        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "_r",
            rol: "assistant",
            texto: data.mensaje || data.error || "No pude procesar tu solicitud.",
          },
        ]);
      }
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_e",
          rol: "assistant",
          texto: `âŒ Error: ${err.message || "No se pudo conectar con la asistente."}`,
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensajeTexto(input);
    }
  };

  const renderTexto = (texto: string) =>
    texto.split("\n").map((linea, i) => (
      <span key={i}>
        <span
          dangerouslySetInnerHTML={{
            __html: linea
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.+?)\*/g, "<em>$1</em>"),
          }}
        />
        {i < texto.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <>
      {/* BotÃ³n flotante */}
      <button
        onClick={() => setAbierto(!abierto)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #10b981, #059669)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(16,185,129,0.4)",
        }}
        title="Amiga IA - Bibliotecaria del Gestor"
      >
        {abierto ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
      </button>

      {/* Panel de chat */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              bottom: 90,
              right: 24,
              zIndex: 999,
              width: 410,
              maxWidth: "calc(100vw - 32px)",
              height: 570,
              maxHeight: "calc(100vh - 120px)",
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={20} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#fff" }}>Amiga IA</p>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.25)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 99,
                    }}
                  >
                    Bibliotecaria
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.85)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {periodoActivoId
                    ? (() => {
                        const p = periodos.find((x) => x.id === periodoActivoId);
                        return p ? `Viendo: ${MESES[p.mes]} ${p.anio}` : "Auditora del Gestor";
                      })()
                    : "Auditora del Gestor"}
                </p>
              </div>
              <button
                onClick={() => setAbierto(false)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Chips de sugerencias rÃ¡pidas */}
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 12px",
                background: "#f8fafc",
                borderBottom: "1px solid #f1f5f9",
                overflowX: "auto",
                whiteSpace: "nowrap",
              }}
            >
              <button
                onClick={() => enviarMensajeTexto("Â¿QuÃ© falta en este mes?")}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FolderSearch size={12} style={{ color: "#10b981" }} /> Â¿QuÃ© falta?
              </button>
              <button
                onClick={() => enviarMensajeTexto("Â¿Hay errores o saltos en los consecutivos?")}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AlertTriangle size={12} style={{ color: "#f59e0b" }} /> Consecutivos
              </button>
              <button
                onClick={() => enviarMensajeTexto("Â¿Falta alguna pareja en los archivos?")}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Sparkles size={12} style={{ color: "#3b82f6" }} /> Parejas incompletas
              </button>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
              {mensajes.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.rol === "user" ? "flex-end" : "flex-start",
                    marginBottom: 12,
                    gap: 8,
                    alignItems: "flex-end",
                  }}
                >
                  {msg.rol === "assistant" && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        background: "#d1fae5",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={14} style={{ color: "#10b981" }} />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "85%",
                      background: msg.rol === "user" ? "#10b981" : "#f8fafc",
                      color: msg.rol === "user" ? "#fff" : "#0f172a",
                      borderRadius: msg.rol === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "10px 14px",
                      fontSize: 13,
                      lineHeight: 1.5,
                      border: msg.rol === "assistant" ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    {renderTexto(msg.texto)}

                    {/* BotÃ³n de navegaciÃ³n interactivo */}
                    {msg.navAccion && (
                      <button
                        onClick={() => {
                          navegarA(msg.navAccion!.loteId, msg.navAccion!.tipoId, msg.navAccion!.periodoId);
                          setAbierto(false);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 10,
                          background: "#1a73e8",
                          color: "#fff",
                          borderRadius: 10,
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          boxShadow: "0 2px 6px rgba(26,115,232,0.3)",
                          transition: "transform 0.1s",
                        }}
                      >
                        <ExternalLink size={14} /> Ir a: {msg.navAccion.label}
                      </button>
                    )}

                    {/* Descargas mÃºltiples individuales por persona */}
                    {msg.archivosPdf && msg.archivosPdf.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        {msg.archivosPdf.map((arch, idx) => (
                          <a
                            key={idx}
                            href={arch.url}
                            download={arch.nombre}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              background: "#10b981",
                              color: "#fff",
                              borderRadius: 10,
                              padding: "9px 12px",
                              fontSize: 12,
                              fontWeight: 800,
                              textDecoration: "none",
                              boxShadow: "0 2px 6px rgba(16,185,129,0.25)",
                            }}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Download size={15} style={{ flexShrink: 0 }} />
                              {arch.persona} (${arch.valor.toLocaleString("es-CO")})
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                background: "rgba(255,255,255,0.2)",
                                padding: "2px 6px",
                                borderRadius: 6,
                                flexShrink: 0,
                              }}
                            >
                              {arch.firmaUrl ? "Con firma" : "Sin firma"}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.rol === "user" && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        background: "#dbeafe",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={14} style={{ color: "#3b82f6" }} />
                    </div>
                  )}
                </div>
              ))}

              {cargando && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: "#d1fae5",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Bot size={14} style={{ color: "#10b981" }} />
                  </div>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px 16px 16px 4px",
                      padding: "10px 14px",
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <Loader2 size={14} style={{ color: "#10b981", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>Consultando los archivos...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="PregÃºntale a la Bibliotecaria... (ej: Â¿quÃ© falta en enero?)"
                rows={1}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.4,
                  maxHeight: 100,
                  overflowY: "auto",
                }}
              />
              <button
                onClick={() => enviarMensajeTexto(input)}
                disabled={!input.trim() || cargando}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: input.trim() && !cargando ? "#10b981" : "#e2e8f0",
                  border: "none",
                  cursor: input.trim() && !cargando ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <Send size={16} color={input.trim() && !cargando ? "#fff" : "#94a3b8"} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

