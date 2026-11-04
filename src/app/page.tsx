"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  FolderOpen,
  Folder,
  Calendar,
  ChevronRight,
  X,
  FileText,
  FileSignature,
  LayoutGrid,
  List,
  Trash2,
  Scale,
  Search,
  Sparkles,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  PenTool,
  Database,
} from "lucide-react";
import Link from "next/link";
import { useComprobantes } from "@/hooks/useComprobantes";
import { MESES, TIPOS_DOCUMENTO } from "@/lib/constantes";
import { motion } from "framer-motion";
import { calcularEstadoLote, analizarConsecutivos } from "@/lib/utils";
import { EstadoBadge } from "@/components/comprobantes/UIComunes";
import { VistaMes } from "@/components/comprobantes/VistaMes";
import { ChatAsistente } from "@/components/Asistente/ChatAsistente";
import { VentanaAlertaLateral } from "@/components/Asistente/VentanaAlertaLateral";
import { AsistenteProvider } from "@/lib/asistente-context";
import { BibliotecaLegal } from "@/components/legal/BibliotecaLegal";
import type { EstadoLote, Periodo } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// ── Modal seleccionar período ─────────────────────────────────────────────────
function ModalPeriodo({
  onConfirmar,
  onCerrar,
}: {
  onConfirmar: (mes: number, anio: number) => void;
  onCerrar: () => void;
}) {
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(CURRENT_YEAR);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onCerrar}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
          border: "1px solid #e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "#fef3c7",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={19} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "#0f172a" }}>
                Abrir o Crear Período
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                Carpeta mensual de comprobantes
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <select
            value={mes}
            onChange={(e) => setMes(+e.target.value)}
            style={{
              flex: 2,
              padding: "10px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(+e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCerrar}
            style={{
              flex: 1,
              padding: "10px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              color: "#64748b",
              fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(mes, anio)}
            style={{
              flex: 2,
              padding: "10px",
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #10b981, #059669)",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              color: "#fff",
              fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
            }}
          >
            Abrir Carpeta
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar estilo Google Drive Workspace Pro ─────────────────────────────────
function DriveSidebar({
  periodos,
  periodoAbierto,
  viendoLegal,
  onSelectPeriodo,
  onIrInicio,
  onAbrirLegal,
  onNuevoPeriodo,
}: {
  periodos: Periodo[];
  periodoAbierto: string | null;
  viendoLegal: boolean;
  onSelectPeriodo: (id: string) => void;
  onIrInicio: () => void;
  onAbrirLegal: () => void;
  onNuevoPeriodo: () => void;
}) {
  const todosLotes = periodos.flatMap((p) => p.lotes);
  const totalLotes = todosLotes.length;
  const totalCompletos = todosLotes.filter((l) => calcularEstadoLote(l) === "completo").length;
  const totalArchivos = todosLotes.reduce(
    (acc, l) => acc + Object.values(l.documentos).flat().length,
    0
  );
  const pctGlobal = totalLotes > 0 ? Math.round((totalCompletos / totalLotes) * 100) : 0;

  return (
    <aside className="drive-sidebar">
      {/* Brand Header */}
      <div
        style={{
          padding: "20px 18px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={onIrInicio}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: "linear-gradient(135deg, #10b981, #059669)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
            flexShrink: 0,
          }}
        >
          <ClipboardList size={20} style={{ color: "#fff" }} />
        </div>
        <div>
          <span
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: "#ffffff",
              display: "block",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            Fundamiga Drive
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#34d399",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Archivo Contable Pro
          </span>
        </div>
      </div>

      {/* Botón icónico "+ Nuevo Período" estilo Google Drive */}
      <div style={{ padding: "16px 16px 10px" }}>
        <button
          onClick={onNuevoPeriodo}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 6px 20px rgba(16, 185, 129, 0.32)",
            transition: "transform 0.15s ease",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nuevo Período Mensual</span>
        </button>
      </div>

      {/* Navegación Principal */}
      <div style={{ padding: "6px 12px", flex: 1, overflowY: "auto" }} className="custom-scrollbar">
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "8px 8px 6px",
          }}
        >
          Explorador de Unidad
        </p>

        <button
          onClick={onIrInicio}
          className={`drive-nav-item ${!periodoAbierto && !viendoLegal ? "active" : ""}`}
        >
          <HardDrive size={17} />
          <span style={{ flex: 1 }}>Mi Unidad (Períodos)</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              background: "rgba(255,255,255,0.1)",
              padding: "1px 7px",
              borderRadius: 99,
            }}
          >
            {periodos.length}
          </span>
        </button>

        {/* Árbol rápido de Períodos en el Sidebar */}
        {periodos.length > 0 && (
          <div
            style={{
              marginLeft: 14,
              paddingLeft: 10,
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              marginTop: 4,
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {periodos.map((p) => {
              const comp = p.lotes.filter((l) => calcularEstadoLote(l) === "completo").length;
              const inc = p.lotes.filter((l) => calcularEstadoLote(l) !== "completo").length;
              const dotColor = p.lotes.length === 0 ? "#64748b" : inc === 0 ? "#10b981" : "#f59e0b";
              const activo = periodoAbierto === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPeriodo(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 9,
                    background: activo ? "rgba(59, 130, 246, 0.22)" : "transparent",
                    color: activo ? "#93c5fd" : "#94a3b8",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: activo ? 800 : 600,
                    textAlign: "left",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {MESES[p.mes]} {p.anio}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.75 }}>
                    {comp}/{p.lotes.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={onAbrirLegal}
          className={`drive-nav-item ${viendoLegal ? "active" : ""}`}
        >
          <Scale size={17} style={{ color: "#a78bfa" }} />
          <span style={{ flex: 1 }}>Biblioteca Legal</span>
        </button>

        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "18px 8px 6px",
          }}
        >
          Generadores & Firmas
        </p>

        <Link href="/generar-cuenta-cobro" className="drive-nav-item">
          <PenTool size={17} style={{ color: "#38bdf8" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f1f5f9" }}>
              Cuentas Cobro & Firmas
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              Cédulas BD + Firmas Nube
            </div>
          </div>
        </Link>

        <Link href="/crear-contrato" className="drive-nav-item">
          <FileSignature size={17} style={{ color: "#c084fc" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f1f5f9" }}>
              Generador Contratos
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              Auxiliar y Supervisor
            </div>
          </div>
        </Link>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("abrir-chat-asistente"))}
          className="drive-nav-item"
          style={{ marginTop: 4 }}
        >
          <Sparkles size={17} style={{ color: "#34d399" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#34d399" }}>
              Amiga IA · Auditora
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              Auditar secuencias y parejas
            </div>
          </div>
        </button>
      </div>

      {/* Footer de Estado de Almacenamiento y Base de Datos */}
      <div
        style={{
          padding: "14px 16px",
          margin: "10px 12px 14px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>
            Integridad Contable
          </span>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#34d399" }}>
            {pctGlobal}%
          </span>
        </div>
        <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
          <div
            style={{
              height: "100%",
              width: `${pctGlobal}%`,
              background: "linear-gradient(90deg, #10b981, #34d399)",
              borderRadius: 99,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
          <span>{totalCompletos}/{totalLotes} lotes listos</span>
          <span>{totalArchivos} arch.</span>
        </div>
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            color: "#6ee7b7",
            fontWeight: 700,
          }}
        >
          <Database size={11} />
          <span>BD Cédulas & Firmas Conectada</span>
        </div>
      </div>
    </aside>
  );
}

export default function Home() {
  const {
    periodos,
    cargado,
    crearPeriodo,
    eliminarPeriodo,
    crearLote,
    eliminarLote,
    actualizarLote,
    agregarArchivo,
    eliminarArchivo,
    actualizarArchivosDoc,
  } = useComprobantes();

  const [periodoAbierto, setPeriodoAbierto] = useState<string | null>(null);
  const [loteNavegandoId, setLoteNavegandoId] = useState<string | null>(null);
  const [tipoNavegandoId, setTipoNavegandoId] = useState<string | null>(null);
  const [highlightInfo, setHighlightInfo] = useState<import("@/lib/asistente-context").HighlightInfo | null>(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [modoVista, setModoVista] = useState<"grid" | "list">("grid");
  const [viendoLegal, setViendoLegal] = useState(false);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");

  const handleSetHighlight = useCallback((info: import("@/lib/asistente-context").HighlightInfo | null) => {
    setHighlightInfo(info);
  }, []);

  // Abrir o crear período
  const handleAbrirPeriodo = async (mes: number, anio: number) => {
    const existente = periodos.find((p) => p.mes === mes && p.anio === anio);
    if (existente) {
      setPeriodoAbierto(existente.id);
    } else {
      const nuevo = await crearPeriodo(mes, anio);
      setPeriodoAbierto(nuevo.id);
    }
    setViendoLegal(false);
    setModalPeriodo(false);
  };

  // Navegación desde el chat: abre periodo, lote y/o tipo de documento
  const handleNavegarDesdeChat = useCallback((loteId?: string | null, tipoId?: string | null, periodoId?: string | null) => {
    let targetPeriodoId = periodoId;
    if (!targetPeriodoId && loteId) {
      const periodoConLote = periodos.find((p) => p.lotes.some((l) => l.id === loteId));
      if (periodoConLote) targetPeriodoId = periodoConLote.id;
    }
    if (!targetPeriodoId && periodoAbierto) {
      targetPeriodoId = periodoAbierto;
    }
    if (!targetPeriodoId && periodos.length > 0) {
      targetPeriodoId = periodos[0].id;
    }

    let targetLoteId = loteId;
    if (targetPeriodoId && tipoId && !targetLoteId) {
      const p = periodos.find((x) => x.id === targetPeriodoId);
      const loteConTipo = p?.lotes.find((l) => (l.documentos[tipoId] ?? []).length > 0) || p?.lotes[0];
      if (loteConTipo) {
        targetLoteId = loteConTipo.id;
      }
    }

    if (targetPeriodoId) {
      setViendoLegal(false);
      setPeriodoAbierto(targetPeriodoId);
      setLoteNavegandoId(targetLoteId || null);
      setTipoNavegandoId(tipoId || null);
    }
  }, [periodos, periodoAbierto]);

  const periodosFiltrados = useMemo(() => {
    if (!busquedaGlobal.trim()) return periodos;
    const q = busquedaGlobal.toLowerCase().trim();
    return periodos.filter((p) => {
      const nombreMes = `${MESES[p.mes]} ${p.anio}`.toLowerCase();
      if (nombreMes.includes(q)) return true;
      return p.lotes.some(
        (l) =>
          l.proveedor.toLowerCase().includes(q) ||
          (l.referencia || "").toLowerCase().includes(q)
      );
    });
  }, [periodos, busquedaGlobal]);

  // Calcular alertas del periodo activo para el contexto del chat
  const alertasParaChat = periodoAbierto
    ? (() => {
        const p = periodos.find((x) => x.id === periodoAbierto);
        if (!p) return [];
        const alertas = analizarConsecutivos(p);
        return Object.entries(alertas).map(([tipoId, alerta]) => {
          const tipoDef = TIPOS_DOCUMENTO.find((t) => t.id === tipoId);
          return {
            tipoId,
            tipoLabel: tipoDef?.label || tipoId,
            tipoNombre: tipoDef?.nombre || tipoId,
            faltantes: alerta.faltantes,
            repetidos: alerta.repetidos,
            presentes: alerta.presentes,
          };
        });
      })()
    : [];

  // Documentos Legales → BibliotecaLegal dentro del Workspace Shell
  if (viendoLegal) {
    return (
      <div className="drive-workspace-shell">
        {modalPeriodo && (
          <ModalPeriodo
            onConfirmar={handleAbrirPeriodo}
            onCerrar={() => setModalPeriodo(false)}
          />
        )}
        <DriveSidebar
          periodos={periodos}
          periodoAbierto={null}
          viendoLegal={true}
          onSelectPeriodo={(id) => {
            setViendoLegal(false);
            setPeriodoAbierto(id);
          }}
          onIrInicio={() => {
            setViendoLegal(false);
            setPeriodoAbierto(null);
          }}
          onAbrirLegal={() => setViendoLegal(true)}
          onNuevoPeriodo={() => setModalPeriodo(true)}
        />
        <div className="drive-main-canvas">
          <BibliotecaLegal onVolver={() => setViendoLegal(false)} />
        </div>
      </div>
    );
  }

  // Período abierto → VistaMes dentro del Workspace Shell
  if (periodoAbierto) {
    const periodo = periodos.find((p) => p.id === periodoAbierto);
    if (periodo) {
      return (
        <AsistenteProvider
          periodos={periodos}
          periodoActivoId={periodoAbierto}
          alertasConsecutivos={alertasParaChat}
          highlightInfo={highlightInfo}
          onNavegar={handleNavegarDesdeChat}
          onSetHighlight={handleSetHighlight}
        >
          <div className="drive-workspace-shell">
            {modalPeriodo && (
              <ModalPeriodo
                onConfirmar={handleAbrirPeriodo}
                onCerrar={() => setModalPeriodo(false)}
              />
            )}
            <DriveSidebar
              periodos={periodos}
              periodoAbierto={periodoAbierto}
              viendoLegal={false}
              onSelectPeriodo={(id) => {
                setLoteNavegandoId(null);
                setTipoNavegandoId(null);
                setPeriodoAbierto(id);
              }}
              onIrInicio={() => setPeriodoAbierto(null)}
              onAbrirLegal={() => {
                setPeriodoAbierto(null);
                setViendoLegal(true);
              }}
              onNuevoPeriodo={() => setModalPeriodo(true)}
            />
            <div className="drive-main-canvas">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <VistaMes
                  periodo={periodo}
                  loteInicialId={loteNavegandoId}
                  tipoInicialId={tipoNavegandoId}
                  onCrearLote={(datos) => crearLote(periodo.id, datos)}
                  onEliminarLote={(loteId) => eliminarLote(periodo.id, loteId)}
                  onActualizarLote={(loteId, datos) => actualizarLote(periodo.id, loteId, datos)}
                  onAgregarArchivo={(loteId, tipoId, arch) =>
                    agregarArchivo(periodo.id, loteId, tipoId, arch)
                  }
                  onEliminarArchivo={(loteId, tipoId, archId) =>
                    eliminarArchivo(periodo.id, loteId, tipoId, archId)
                  }
                  onActualizarArchivosDoc={(loteId, tipoId, nuevosArchs) =>
                    actualizarArchivosDoc(periodo.id, loteId, tipoId, nuevosArchs)
                  }
                  onVolver={() => setPeriodoAbierto(null)}
                />
              </motion.div>
            </div>
            <VentanaAlertaLateral />
            <ChatAsistente />
          </div>
        </AsistenteProvider>
      );
    }
  }

  // Totales globales
  const todosLotes = periodos.flatMap((p) => p.lotes);
  const totalLotes = todosLotes.length;
  const totalCompletos = todosLotes.filter(
    (l) => calcularEstadoLote(l) === "completo"
  ).length;
  const totalIncompletos = todosLotes.filter(
    (l) => calcularEstadoLote(l) === "incompleto"
  ).length;
  const totalArchivosGlobal = todosLotes.reduce(
    (acc, l) => acc + Object.values(l.documentos).flat().length,
    0
  );

  return (
    <AsistenteProvider
      periodos={periodos}
      periodoActivoId={null}
      alertasConsecutivos={[]}
      highlightInfo={highlightInfo}
      onNavegar={handleNavegarDesdeChat}
      onSetHighlight={handleSetHighlight}
    >
      <div className="drive-workspace-shell">
        {modalPeriodo && (
          <ModalPeriodo
            onConfirmar={handleAbrirPeriodo}
            onCerrar={() => setModalPeriodo(false)}
          />
        )}

        <DriveSidebar
          periodos={periodos}
          periodoAbierto={null}
          viendoLegal={false}
          onSelectPeriodo={(id) => setPeriodoAbierto(id)}
          onIrInicio={() => setPeriodoAbierto(null)}
          onAbrirLegal={() => setViendoLegal(true)}
          onNuevoPeriodo={() => setModalPeriodo(true)}
        />

        <div className="drive-main-canvas">
          {/* Top Command Header */}
          <header
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid #e2e8f0",
              padding: "14px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              position: "sticky",
              top: 0,
              zIndex: 20,
              flexWrap: "wrap",
            }}
          >
            {/* Buscador global estilo Google Drive */}
            <div className="drive-search-bar" style={{ maxWidth: 460, flex: 1 }}>
              <Search size={16} style={{ color: "#5f6368", flexShrink: 0 }} />
              <input
                type="text"
                value={busquedaGlobal}
                onChange={(e) => setBusquedaGlobal(e.target.value)}
                placeholder="Buscar período, lote o proveedor en Mi Unidad..."
              />
              {busquedaGlobal && (
                <button
                  onClick={() => setBusquedaGlobal("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", padding: 2, display: "flex" }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Botones rápidos de herramientas */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href="/generar-cuenta-cobro"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#eff6ff",
                  color: "#2563eb",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 12,
                  fontFamily: "inherit",
                  textDecoration: "none",
                }}
              >
                <PenTool size={15} /> Cuentas Cobro & Firmas
              </Link>
              <Link
                href="/crear-contrato"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#f5f3ff",
                  color: "#7c3aed",
                  border: "1.5px solid #ddd6fe",
                  borderRadius: 12,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 12,
                  fontFamily: "inherit",
                  textDecoration: "none",
                }}
              >
                <FileSignature size={15} /> Crear Contrato
              </Link>
              <button
                onClick={() => setModalPeriodo(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "9px 18px",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 12,
                  fontFamily: "inherit",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
                }}
              >
                <Plus size={16} /> Nuevo Período
              </button>
            </div>
          </header>

          <motion.main
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              maxWidth: 1140,
              width: "100%",
              margin: "0 auto",
              padding: "24px 28px 60px",
              boxSizing: "border-box",
            }}
          >
            {/* Tarjetas KPI de Telemetría Contable */}
            {totalLotes > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  marginBottom: 26,
                }}
              >
                {[
                  {
                    label: "Total Lotes Contables",
                    valor: totalLotes,
                    sub: `${periodos.length} períodos activos`,
                    color: "#0f172a",
                    accent: "#3b82f6",
                    bg: "#ffffff",
                  },
                  {
                    label: "Lotes Completos",
                    valor: totalCompletos,
                    sub: "Con todos sus soportes",
                    color: "#059669",
                    accent: "#10b981",
                    bg: "#f0fdf4",
                  },
                  {
                    label: "Lotes Pendientes",
                    valor: totalIncompletos,
                    sub: "Faltan parejas o tipos",
                    color: "#d97706",
                    accent: "#f59e0b",
                    bg: "#fffbeb",
                  },
                  {
                    label: "Archivos en la Nube",
                    valor: totalArchivosGlobal,
                    sub: "Sincronizados en Cloudinary",
                    color: "#4f46e5",
                    accent: "#6366f1",
                    bg: "#eef2ff",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: item.bg,
                      borderRadius: 18,
                      padding: "16px 20px",
                      border: `1.5px solid ${item.accent}28`,
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.03)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 4,
                        height: "100%",
                        background: item.accent,
                      }}
                    />
                    <p
                      style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight: 900,
                        color: item.color,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.valor}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 2px",
                        fontSize: 11,
                        color: item.color,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {item.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Accesos Rápidos Estilo Google Drive Pro ───────────────────── */}
            <div style={{ marginBottom: 28 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 12px 2px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={13} color="#10b981" /> Accesos Rápidos & Módulos Especiales
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 14,
                }}
              >
                {/* Card 1: Documentos Legales */}
                <motion.div
                  whileHover={{ y: -3 }}
                  className="drive-folder-card"
                  style={{
                    display: "flex",
                    overflow: "hidden",
                    cursor: "pointer",
                    alignItems: "stretch",
                    border: "1.5px solid #ddd6fe",
                  }}
                  onClick={() => setViendoLegal(true)}
                >
                  <div
                    style={{
                      width: 78,
                      flexShrink: 0,
                      background: "linear-gradient(150deg, #7c3aed25, #7c3aed08)",
                      borderRight: "1px solid #ddd6fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Scale size={32} color="#7c3aed" />
                  </div>
                  <div style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                        Documentos Legales
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          background: "#7c3aed",
                          color: "#fff",
                          padding: "1px 7px",
                          borderRadius: 99,
                          textTransform: "uppercase",
                        }}
                      >
                        Biblioteca
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}>
                      Actas Consejo · Asamblea · Libro Asociados · Estatutos
                    </p>
                  </div>
                </motion.div>

                {/* Card 2: Cuentas de Cobro, Cédulas y Firmas */}
                <Link
                  href="/generar-cuenta-cobro"
                  style={{ textDecoration: "none" }}
                >
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="drive-folder-card"
                    style={{
                      display: "flex",
                      overflow: "hidden",
                      cursor: "pointer",
                      alignItems: "stretch",
                      border: "1.5px solid #bfdbfe",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 78,
                        flexShrink: 0,
                        background: "linear-gradient(150deg, #2563eb25, #2563eb08)",
                        borderRight: "1px solid #bfdbfe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <PenTool size={30} color="#2563eb" />
                    </div>
                    <div style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                          Cuentas de Cobro & Firmas
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            background: "#2563eb",
                            color: "#fff",
                            padding: "1px 7px",
                            borderRadius: 99,
                            textTransform: "uppercase",
                          }}
                        >
                          BD + Firmas
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}>
                        Generar PDF con firma, subir/recortar firmas y editar cédulas
                      </p>
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>

            {/* Sin períodos */}
            {!cargado || periodos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    background: "#f1f5f9",
                    borderRadius: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <FolderOpen size={38} style={{ color: "#cbd5e1" }} />
                </div>
                <h2
                  style={{
                    fontWeight: 900,
                    color: "#94a3b8",
                    fontSize: 18,
                    margin: "0 0 8px",
                  }}
                >
                  {cargado ? "Sin períodos aún" : "Cargando unidad contable..."}
                </h2>
                {cargado && (
                  <>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: 13,
                        margin: "0 0 24px",
                        lineHeight: 1.5,
                      }}
                    >
                      Crea un período mensual para organizar tus comprobantes por proveedor y secuencia
                    </p>
                    <button
                      onClick={() => setModalPeriodo(true)}
                      style={{
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 14,
                        padding: "12px 28px",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 14,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: "inherit",
                      }}
                    >
                      <Plus size={18} /> Crear primer período
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Explorador de Períodos - Estilo Google Drive 3D Pro */
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Folder size={18} style={{ color: "#1a73e8", fill: "#1a73e820" }} />
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                      Carpetas de Períodos Mensuales ({periodosFiltrados.length})
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Switcher Cuadrícula 3D / Lista */}
                    <div
                      style={{
                        display: "flex",
                        background: "#e2e8f0",
                        borderRadius: 10,
                        padding: 3,
                        gap: 2,
                      }}
                    >
                      <button
                        onClick={() => setModoVista("grid")}
                        title="Vista en carpetas 3D"
                        style={{
                          background: modoVista === "grid" ? "#ffffff" : "transparent",
                          border: "none",
                          borderRadius: 8,
                          padding: "5px 10px",
                          cursor: "pointer",
                          boxShadow: modoVista === "grid" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: modoVista === "grid" ? "#1a73e8" : "#475569",
                        }}
                      >
                        <LayoutGrid size={14} /> Carpetas 3D
                      </button>
                      <button
                        onClick={() => setModoVista("list")}
                        title="Vista en lista"
                        style={{
                          background: modoVista === "list" ? "#ffffff" : "transparent",
                          border: "none",
                          borderRadius: 8,
                          padding: "5px 10px",
                          cursor: "pointer",
                          boxShadow: modoVista === "list" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: modoVista === "list" ? "#1a73e8" : "#475569",
                        }}
                      >
                        <List size={14} /> Lista
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISTA CUADRÍCULA 3D ESTILO GOOGLE DRIVE PRO */}
                {modoVista === "grid" ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))",
                      gap: 18,
                    }}
                  >
                    {periodosFiltrados.map((periodo) => {
                      const completos = periodo.lotes.filter(
                        (l) => calcularEstadoLote(l) === "completo"
                      ).length;
                      const incompletos = periodo.lotes.filter(
                        (l) => calcularEstadoLote(l) === "incompleto"
                      ).length;
                      const sinDocs = periodo.lotes.filter(
                        (l) => calcularEstadoLote(l) === "vacio"
                      ).length;
                      const totalArchivosMes = periodo.lotes.reduce(
                        (acc, l) => acc + Object.values(l.documentos).flat().length,
                        0
                      );
                      const estadoGeneral: EstadoLote =
                        periodo.lotes.length === 0
                          ? "vacio"
                          : incompletos > 0 || sinDocs > 0
                          ? "incompleto"
                          : "completo";

                      const folderColor =
                        estadoGeneral === "completo"
                          ? "#10b981"
                          : estadoGeneral === "incompleto"
                          ? "#f59e0b"
                          : "#64748b";

                      const pct =
                        periodo.lotes.length > 0
                          ? Math.round((completos / periodo.lotes.length) * 100)
                          : 0;

                      return (
                        <div
                          key={periodo.id}
                          className="pro-folder-3d"
                          onClick={() => setPeriodoAbierto(periodo.id)}
                          style={{ paddingTop: 18, position: "relative" }}
                        >
                          {/* Pestaña superior física del Mes */}
                          <div
                            style={{
                              position: "absolute",
                              top: 2,
                              left: 14,
                              height: 22,
                              padding: "0 12px",
                              borderRadius: "10px 10px 0 0",
                              background: folderColor,
                              color: "#ffffff",
                              fontSize: 10,
                              fontWeight: 900,
                              letterSpacing: "0.06em",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              zIndex: 1,
                            }}
                          >
                            <Calendar size={11} />
                            <span>AÑO {periodo.anio}</span>
                          </div>

                          {/* Estado y botón eliminar en esquina superior derecha */}
                          <div style={{ position: "absolute", top: 2, right: 10, zIndex: 5, display: "flex", alignItems: "center", gap: 6 }}>
                            <EstadoBadge estado={estadoGeneral} size="sm" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `¿Eliminar el período ${MESES[periodo.mes]} ${periodo.anio}? Se perderán todos sus lotes y archivos.`
                                  )
                                ) {
                                  eliminarPeriodo(periodo.id);
                                }
                              }}
                              title="Eliminar período"
                              style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                padding: 4,
                                color: "#94a3b8",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#ef4444";
                                e.currentTarget.style.borderColor = "#fecaca";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#94a3b8";
                                e.currentTarget.style.borderColor = "#e2e8f0";
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Bolsillo trasero de la carpeta + hojas de Lotes asomándose */}
                          <div
                            style={{
                              position: "relative",
                              borderRadius: "14px 14px 16px 16px",
                              background: `linear-gradient(145deg, ${folderColor}30 0%, ${folderColor}10 100%)`,
                              border:
                                estadoGeneral === "completo"
                                  ? "1.5px solid #6ee7b7"
                                  : estadoGeneral === "incompleto"
                                  ? "1.5px solid #fcd34d"
                                  : "1.5px solid #cbd5e1",
                              paddingTop: 34,
                              overflow: "hidden",
                            }}
                          >
                            {periodo.lotes.length > 0 ? (
                              <>
                                <div
                                  className="pro-folder-sheet-1"
                                  style={{
                                    position: "absolute",
                                    top: 8,
                                    left: 16,
                                    right: 40,
                                    height: 36,
                                    background: "#ffffff",
                                    borderRadius: "6px 6px 0 0",
                                    border: "1px solid #cbd5e1",
                                    padding: "5px 8px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    zIndex: 1,
                                  }}
                                >
                                  <Folder size={11} style={{ color: folderColor, flexShrink: 0 }} />
                                  <span style={{ fontSize: 8.5, fontWeight: 700, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {periodo.lotes[0]?.proveedor}
                                  </span>
                                </div>
                                {periodo.lotes.length > 1 && (
                                  <div
                                    className="pro-folder-sheet-2"
                                    style={{
                                      position: "absolute",
                                      top: 12,
                                      left: 36,
                                      right: 14,
                                      height: 34,
                                      background: "#f8fafc",
                                      borderRadius: "6px 6px 0 0",
                                      border: "1px solid #cbd5e1",
                                      padding: "5px 8px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      zIndex: 2,
                                    }}
                                  >
                                    <Folder size={11} style={{ color: "#3b82f6", flexShrink: 0 }} />
                                    <span style={{ fontSize: 8.5, fontWeight: 700, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {periodo.lotes[1]?.proveedor}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 9,
                                  left: 16,
                                  right: 16,
                                  height: 22,
                                  border: "1px dashed #94a3b8",
                                  borderRadius: "6px 6px 0 0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 8.5,
                                  color: "#64748b",
                                  fontWeight: 600,
                                }}
                              >
                                Mes sin lotes aún
                              </div>
                            )}

                            {/* Solapa frontal de la carpeta del Mes */}
                            <div
                              className="pro-folder-flap"
                              style={{
                                position: "relative",
                                zIndex: 3,
                                background: "#ffffff",
                                borderRadius: "12px 12px 14px 14px",
                                borderTop: `3px solid ${folderColor}`,
                                padding: "14px 16px 12px",
                                boxShadow: "0 -3px 10px rgba(15, 23, 42, 0.06)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                                    {MESES[periodo.mes]} {periodo.anio}
                                  </p>
                                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                                    {totalArchivosMes} archivo{totalArchivosMes !== 1 ? "s" : ""} cargados
                                  </span>
                                </div>
                              </div>

                              {/* Chips de lotes completos e incompletos */}
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    color: "#334155",
                                    background: "#f1f5f9",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  {periodo.lotes.length} lote{periodo.lotes.length !== 1 ? "s" : ""}
                                </span>
                                {completos > 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      color: "#065f46",
                                      background: "#d1fae5",
                                      padding: "2px 7px",
                                      borderRadius: 6,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <CheckCircle2 size={10} /> {completos} compl.
                                  </span>
                                )}
                                {incompletos > 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      color: "#92400e",
                                      background: "#fef3c7",
                                      padding: "2px 7px",
                                      borderRadius: 6,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <AlertCircle size={10} /> {incompletos} pend.
                                  </span>
                                )}
                              </div>

                              {/* Barra de progreso mensual */}
                              <div>
                                <div style={{ height: 5, width: "100%", background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: folderColor, borderRadius: 99, transition: "width 0.3s ease" }} />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>
                                  <span>{pct}% completado</span>
                                  <span style={{ color: "#1a73e8", fontWeight: 800 }}>Abrir mes →</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* VISTA LISTA ESTILO DRIVE */
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {periodosFiltrados.map((periodo) => {
                      const completos = periodo.lotes.filter(
                        (l) => calcularEstadoLote(l) === "completo"
                      ).length;
                      const incompletos = periodo.lotes.filter(
                        (l) => calcularEstadoLote(l) === "incompleto"
                      ).length;
                      const sinDocs = periodo.lotes.filter(
                        (l) => calcularEstadoLote(l) === "vacio"
                      ).length;
                      const estadoGeneral: EstadoLote =
                        periodo.lotes.length === 0
                          ? "vacio"
                          : incompletos > 0 || sinDocs > 0
                          ? "incompleto"
                          : "completo";

                      const folderColor =
                        estadoGeneral === "completo"
                          ? "#1e8e3e"
                          : estadoGeneral === "incompleto"
                          ? "#f9ab00"
                          : "#5f6368";

                      return (
                        <div
                          key={periodo.id}
                          className="drive-folder-card"
                          onClick={() => setPeriodoAbierto(periodo.id)}
                          style={{
                            padding: "12px 18px",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <Folder
                            size={24}
                            style={{
                              color: folderColor,
                              fill: `${folderColor}25`,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: "#1f1f1f" }}>
                                {MESES[periodo.mes]} {periodo.anio}
                              </span>
                              <EstadoBadge estado={estadoGeneral} size="sm" />
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5f6368" }}>
                              {periodo.lotes.length} lote{periodo.lotes.length !== 1 ? "s" : ""}
                              {completos > 0 ? ` · ${completos} completos` : ""}
                              {incompletos > 0 ? ` · ${incompletos} incompletos` : ""}
                              {sinDocs > 0 ? ` · ${sinDocs} vacíos` : ""}
                            </p>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPeriodoAbierto(periodo.id);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                background: "#f1f3f4",
                                border: "none",
                                borderRadius: 10,
                                padding: "6px 14px",
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 12,
                                color: "#1f1f1f",
                                fontFamily: "inherit",
                              }}
                            >
                              Abrir <ChevronRight size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `¿Eliminar el período ${MESES[periodo.mes]} ${periodo.anio}? Se perderán todos sus lotes y archivos.`
                                  )
                                ) {
                                  eliminarPeriodo(periodo.id);
                                }
                              }}
                              title="Eliminar período"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                color: "#94a3b8",
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Leyenda de Clasificaciones de Documentos */}
            <div
              style={{
                marginTop: 36,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: "18px 22px",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
              }}
            >
              <p
                style={{
                  margin: "0 0 14px",
                  fontWeight: 900,
                  fontSize: 11,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Guía de Clasificaciones Contables por Lote
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {TIPOS_DOCUMENTO.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <span
                      style={{
                        minWidth: 44,
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 900,
                        color: t.color,
                        background: `${t.color}18`,
                        borderRadius: 6,
                        padding: "3px 6px",
                        flexShrink: 0,
                      }}
                    >
                      {t.label}
                    </span>
                    <span style={{ fontSize: 11.5, color: "#334155", fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.nombre}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: t.requerido ? "#059669" : "#94a3b8",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {t.requerido ? "Obligatorio" : "Opcional"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.main>
        </div>
        <VentanaAlertaLateral />
        <ChatAsistente />
      </div>
    </AsistenteProvider>
  );
}
