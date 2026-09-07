"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Download, Bot, User, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAsistenteContext } from "@/lib/asistente-context";
import { calcularEstadoLote } from "@/lib/utils";
import { MESES, TIPOS_DOCUMENTO } from "@/lib/constantes";

interface ArchivoPDFItem {
  url: string;
  nombre: string;
  persona: string;
  valor: number;
  firmaUrl: string | null;
}

interface NavAccion {
  loteId: string;
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
      texto: "Hola! Soy Amiga IA, la asistente del Gestor de Comprobantes de Fundamiga.\n\nPuedo ayudarte con:\n- Preguntas sobre el sistema\n- Generar cuentas de cobro en PDF con firma automatica\n- Consultar el estado de tus carpetas, consecutivos y archivos\n\nEn que te puedo ayudar?",
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

  const construirContexto = () => {
    const periodoActivo = periodos.find((p) => p.id === periodoActivoId);
    const resumenPeriodos = periodos.map((p) => ({
      id: p.id,
      nombre: `${MESES[p.mes]} ${p.anio}`,
      activo: p.id === periodoActivoId,
      totalLotes: p.lotes.length,
      lotes: p.lotes.map((l) => {
        const estado = calcularEstadoLote(l);
        const totalArchivos = Object.values(l.documentos).flat().length;
        const tipos = Object.entries(l.documentos)
          .filter(([, archs]) => archs.length > 0)
          .map(([tipoId, archs]) => `${tipoId}(${archs.length}arch)`);
        return { id: l.id, nombre: l.proveedor, estado, totalArchivos, tipos };
      }),
    }));
    return {
      periodoActivoNombre: periodoActivo ? `${MESES[periodoActivo.mes]} ${periodoActivo.anio}` : null,
      periodos: resumenPeriodos,
      alertasConsecutivos,
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

  const enviarMensaje = async () => {
    const texto = input.trim();
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
        body: JSON.stringify({ mensaje: texto, historial: historialParaApi, contexto: construirContexto() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");

      if (data.tipo === "navegar" && data.loteId) {
        const periodoActivo = periodos.find((p) => p.id === periodoActivoId);
        const lote = periodoActivo?.lotes.find((l) => l.id === data.loteId);
        const tipoLabel = data.tipoId ? TIPOS_DOCUMENTO.find((t) => t.id === data.tipoId)?.label || data.tipoId : null;
        const label = lote ? `${lote.proveedor}${tipoLabel ? ` - ${tipoLabel}` : ""}` : data.loteId;
        setMensajes((prev) => [...prev, {
          id: Date.now().toString() + "_nav",
          rol: "assistant",
          texto: data.mensaje || `Te llevo a: ${label}`,
          navAccion: { loteId: data.loteId, tipoId: data.tipoId, label },
        }]);
        return;
      }

      const listaCuentas: DatosCuenta[] = data.cuentas || (data.datos ? [data.datos] : []);

      if (listaCuentas.length > 0) {
        setMensajes((prev) => [...prev, {
          id: Date.now().toString() + "_c",
          rol: "assistant",
          texto: data.mensaje || `Generando ${listaCuentas.length} cuenta(s) de cobro...`,
        }]);
        const resultados = await Promise.all(
          listaCuentas.map(async (c) => {
            const pdf = await generarPDF(c);
            return pdf ? { url: pdf.url, nombre: pdf.nombre, persona: c.nombre, valor: c.valor, firmaUrl: c.firmaUrl } : null;
          })
        );
        const generados = resultados.filter((item): item is ArchivoPDFItem => item !== null);
        if (generados.length > 0) {
          setMensajes((prev) => [...prev, {
            id: Date.now().toString() + "_pdf",
            rol: "assistant",
            texto: `Listo! Se generaron ${generados.length} cuenta(s) de cobro:`,
            archivosPdf: generados,
          }]);
        }
      } else {
        setMensajes((prev) => [...prev, {
          id: Date.now().toString() + "_r",
          rol: "assistant",
          texto: data.mensaje || data.error || "No pude procesar tu solicitud.",
        }]);
      }
    } catch (err: any) {
      setMensajes((prev) => [...prev, {
        id: Date.now().toString() + "_e",
        rol: "assistant",
        texto: `Error: ${err.message || "No se pudo conectar con el asistente."}`,
      }]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensaje(); }
  };

  const renderTexto = (texto: string) =>
    texto.split("\n").map((linea, i) => (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: linea.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>") }} />
        {i < texto.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <>
      <button
        onClick={() => setAbierto(!abierto)}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(16,185,129,0.4)" }}
        title="Asistente IA"
      >
        {abierto ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ position: "fixed", bottom: 90, right: 24, zIndex: 999, width: 380, maxWidth: "calc(100vw - 48px)", height: 520, maxHeight: "calc(100vh - 120px)", background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e2e8f0" }}
          >
            <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#fff" }}>Amiga IA</p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                  {periodoActivoId
                    ? (() => { const p = periodos.find((x) => x.id === periodoActivoId); return p ? `Viendo: ${MESES[p.mes]} ${p.anio}` : "Asistente de Fundamiga"; })()
                    : "Asistente de Fundamiga"}
                </p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
              {mensajes.map((msg) => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.rol === "user" ? "flex-end" : "flex-start", marginBottom: 12, gap: 8, alignItems: "flex-end" }}>
                  {msg.rol === "assistant" && (
                    <div style={{ width: 28, height: 28, background: "#d1fae5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Bot size={14} style={{ color: "#10b981" }} />
                    </div>
                  )}
                  <div style={{ maxWidth: "80%", background: msg.rol === "user" ? "#10b981" : "#f8fafc", color: msg.rol === "user" ? "#fff" : "#0f172a", borderRadius: msg.rol === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5, border: msg.rol === "assistant" ? "1px solid #e2e8f0" : "none" }}>
                    {renderTexto(msg.texto)}

                    {msg.navAccion && (
                      <button
                        onClick={() => { navegarA(msg.navAccion!.loteId, msg.navAccion!.tipoId); setAbierto(false); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "#1a73e8", color: "#fff", borderRadius: 10, padding: "7px 13px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <ExternalLink size={13} /> Ir a: {msg.navAccion.label}
                      </button>
                    )}

                    {msg.pdfUrl && !msg.archivosPdf && (
                      <a href={msg.pdfUrl} download={msg.pdfNombre} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "#10b981", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        <Download size={14} /> Descargar PDF
                      </a>
                    )}

                    {msg.archivosPdf && msg.archivosPdf.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        {msg.archivosPdf.map((arch, idx) => (
                          <a key={idx} href={arch.url} download={arch.nombre} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#10b981", color: "#fff", borderRadius: 10, padding: "9px 12px", fontSize: 12, fontWeight: 800, textDecoration: "none", boxShadow: "0 2px 6px rgba(16,185,129,0.25)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <Download size={15} style={{ flexShrink: 0 }} />
                              {arch.persona} (${arch.valor.toLocaleString("es-CO")})
                            </span>
                            <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>
                              {arch.firmaUrl ? "Con firma" : "Sin firma"}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.rol === "user" && (
                    <div style={{ width: 28, height: 28, background: "#dbeafe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={14} style={{ color: "#3b82f6" }} />
                    </div>
                  )}
                </div>
              ))}

              {cargando && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
                  <div style={{ width: 28, height: 28, background: "#d1fae5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={14} style={{ color: "#10b981" }} />
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                    <Loader2 size={14} style={{ color: "#10b981", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe tu mensaje... (Enter para enviar)" rows={1}
                style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.4, maxHeight: 100, overflowY: "auto" }} />
              <button onClick={enviarMensaje} disabled={!input.trim() || cargando}
                style={{ width: 38, height: 38, borderRadius: "50%", background: input.trim() && !cargando ? "#10b981" : "#e2e8f0", border: "none", cursor: input.trim() && !cargando ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
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
