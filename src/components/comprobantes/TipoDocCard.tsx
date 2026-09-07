"use client";
// Force Vercel redeploy - Triggering 10:55 AM

import { useState, useRef, useCallback, Fragment } from "react";
import {
  FileText,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  FileDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  GripVertical,
  Folder,
  FolderOpen,
  FolderCheck,
} from "lucide-react";
import { Reorder } from "framer-motion";
import type { ArchivoSubido, TipoDocumento } from "@/types";
import { ZonaUpload } from "./ZonaUpload";

interface TipoDocCardProps {
  tipo: TipoDocumento;
  archivos: ArchivoSubido[];
  onAgregar: (archivo: ArchivoSubido) => void;
  onEliminar: (archivoId: string) => void;
  onActualizarArchivos: (nuevosArchivos: ArchivoSubido[]) => void;
  onVer: (archivo: ArchivoSubido) => void;
  nombreProveedor: string;
  alertaConsecutivo?: { faltantes: number[]; repetidos: number[]; presentes: number[] };
  defaultOpen?: boolean;
}

interface GrupoPareja {
  id: string;
  nombre: string;
  archivos: ArchivoSubido[];
}

export function TipoDocCard({
  tipo,
  archivos,
  onAgregar,
  onEliminar,
  onActualizarArchivos,
  onVer,
  nombreProveedor,
  alertaConsecutivo,
  defaultOpen,
}: TipoDocCardProps) {
  const [abierto, setAbierto] = useState(defaultOpen ?? false);
  const [gruposVacios, setGruposVacios] = useState<{ id: string; nombre: string }[]>([]);
  const [renombrandoId, setRenombrandoId] = useState<string | null>(null);
  const [nuevoNombreText, setNuevoNombreText] = useState("");
  const [extraUploadActivo, setExtraUploadActivo] = useState<{ [grupoId: string]: boolean }>({});
  const [ordenIds, setOrdenIds] = useState<string[]>([]);
  const [numeroSiguiente, setNumeroSiguiente] = useState<string>("");
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [parejasAbiertas, setParejasAbiertas] = useState<{ [grupoId: string]: boolean }>({});

  const toggleParejaAbierta = (id: string) => {
    setParejasAbiertas((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false,
    }));
  };

  // Refs para auto-guardado sin problemas de stale closures
  const archivosRef = useRef(archivos);
  archivosRef.current = archivos;
  const gruposVaciosRef = useRef(gruposVacios);
  gruposVaciosRef.current = gruposVacios;
  // Este ref se actualiza SÍNCRONAMENTE en onReorder (no espera al render)
  // para que onDragEnd siempre lea el orden final correcto
  const ordenIdsDragRef = useRef<string[]>([]);
  const onActualizarArchivosRef = useRef(onActualizarArchivos);
  onActualizarArchivosRef.current = onActualizarArchivos;
  const setGruposVaciosRef = useRef(setGruposVacios);
  setGruposVaciosRef.current = setGruposVacios;

  // Handler de reorder: actualiza ref y estado al mismo tiempo
  const handleReorder = useCallback((newIds: string[]) => {
    ordenIdsDragRef.current = newIds; // síncrono → disponible inmediatamente
    setOrdenIds(newIds);              // asíncrono → dispara re-render
  }, []);

  const tiene = archivos.length > 0;

  // ── 1. AGRUPAR ARCHIVOS SI EL TIPO EXIGE GRUPOS (minArchivos >= 1) ────────────────
  const esPorGrupos = typeof tipo.minArchivos === "number" && tipo.minArchivos >= 1;
  const esPorParejas = esPorGrupos; // Alias para compatibilidad con el resto del código

  // Agrupar archivos reales
  const gruposMap: { [grupoId: string]: ArchivoSubido[] } = {};
  const archivosSinGrupo: ArchivoSubido[] = [];

  archivos.forEach((a) => {
    if (a.grupoId) {
      if (!gruposMap[a.grupoId]) {
        gruposMap[a.grupoId] = [];
      }
      gruposMap[a.grupoId].push(a);
    } else {
      archivosSinGrupo.push(a);
    }
  });

  // Si hay archivos viejos sin grupo, los ponemos en "grupo_inicial"
  if (archivosSinGrupo.length > 0) {
    const idInicial = "grupo_inicial";
    if (!gruposMap[idInicial]) {
      gruposMap[idInicial] = [];
    }
    gruposMap[idInicial].push(...archivosSinGrupo);
  }

  // Mapear a formato de grupos
  const gruposReales: GrupoPareja[] = Object.entries(gruposMap).map(([id, files]) => {
    const nombre = files[0]?.grupoNombre || (id === "grupo_inicial" ? "Pareja 1" : "Pareja");
    return { id, nombre, archivos: files };
  });

  // Combinar con grupos vacíos creados por el usuario
  const todosGrupos: GrupoPareja[] = [...gruposReales];
  gruposVacios.forEach((v) => {
    if (!todosGrupos.some((g) => g.id === v.id)) {
      todosGrupos.push({ id: v.id, nombre: v.nombre, archivos: [] });
    }
  });

  // Asegurar que haya al menos 1 grupo inicial si es por parejas y no hay nada
  if (esPorParejas && todosGrupos.length === 0) {
    todosGrupos.push({
      id: "grupo_inicial",
      nombre: "Pareja 1",
      archivos: [],
    });
  }

  // Extraer número solo para cálculo de consecutivos (NO para ordenar el drag)
  const extraerNumero = (grupo: GrupoPareja) => {
    let numStr: number | null = null;
    let fallback: number | null = null;
    const posibles = [grupo.nombre, ...grupo.archivos.map(a => a.nombre)];
    for (const r of posibles) {
      const t = r.replace(new RegExp(tipo.id, 'gi'), '');
      if (t.startsWith("Pareja ")) {
         const m = t.match(/\d+/);
         if (m && fallback === null) fallback = parseInt(m[0], 10);
         continue;
      }
      const m = t.match(/\d+/);
      if (m) {
         numStr = parseInt(m[0], 10);
         break;
      }
    }
    return numStr !== null ? numStr : (fallback !== null ? fallback : 999999);
  };

  // Ordenar grupos usando grupoOrden (posición guardada explícitamente por el usuario al arrastrar).
  // Si ningún archivo tiene grupoOrden (nuevo upload), ordenar por el número consecutivo del archivo.
  if (esPorParejas) {
    todosGrupos.sort((a, b) => {
      const ordenA = a.archivos.length > 0 ? (a.archivos[0].grupoOrden ?? Infinity) : Infinity;
      const ordenB = b.archivos.length > 0 ? (b.archivos[0].grupoOrden ?? Infinity) : Infinity;
      // Si alguno tiene grupoOrden guardado, comparar por él
      if (ordenA !== Infinity || ordenB !== Infinity) return ordenA - ordenB;
      // Fallback: ordenar por el número extraído del nombre del archivo (consecutivo automático)
      return extraerNumero(a) - extraerNumero(b);
    });
  }

  // Calcular el número sugerido
  let proximoRecomendado = 1;
  if (esPorParejas) {
    const todosNumeros = todosGrupos.map(extraerNumero).filter((n) => n !== 999999);
    if (todosNumeros.length > 0) {
      proximoRecomendado = Math.max(...todosNumeros) + 1;
    }
  }

  // ── 2. ALERTAS DEL HEADER CARD ────────────────────────────────────────────────────
  let faltaParejaCritico = false;
  let faltaParejaAdvertencia = false;

  const baseIds = todosGrupos.map(g => g.id);
  const currentIds = ordenIds.length === baseIds.length && ordenIds.every(id => baseIds.includes(id)) ? ordenIds : baseIds;
  const haCambiadoOrden = JSON.stringify(currentIds) !== JSON.stringify(baseIds);

  // Inicializar ordenIdsDragRef con baseIds si todavia esta vacio (primer render)
  if (ordenIdsDragRef.current.length === 0 && baseIds.length > 0) {
    ordenIdsDragRef.current = baseIds;
  }

  // Función de guardado que LEE DE REFS (no closures) → segura para llamar desde el botón
  const guardarOrdenDesdeRef = useCallback(() => {
    // Usar ordenIdsDragRef que se actualizó síncronamente en onReorder
    // Si está vacío pero haCambiadoOrden es true, usamos ordenIds (estado)
    const latestIds = ordenIdsDragRef.current.length > 0 ? ordenIdsDragRef.current : ordenIds;
    const latestArchivos = archivosRef.current;
    const latestVacios = gruposVaciosRef.current;

    if (latestIds.length === 0) return;

    const archivosOrdenados: ArchivoSubido[] = [];
    let vaciosActualizados = [...latestVacios];

    latestIds.forEach((grupoId, index) => {
      // Intentar preservar el nombre actual si ya tiene uno coherente
      const grupoActual = latestVacios.find(v => v.id === grupoId) || 
                         (grupoId === "grupo_inicial" ? { nombre: "Pareja 1" } : null);
      
      let nombreBase = grupoActual?.nombre || 
                       latestArchivos.find(a => (a.grupoId || "grupo_inicial") === grupoId)?.grupoNombre || 
                       `Pareja ${index + 1}`;
      
      // Solo re-numerar si el nombre sigue el patrón "Pareja X"
      const esPatronPareja = /^Pareja \d+$/.test(nombreBase);
      const nuevoNombre = esPatronPareja ? `Pareja ${index + 1}` : nombreBase;

      const archivosDelGrupo = latestArchivos
        .filter(a => (a.grupoId || "grupo_inicial") === grupoId)
        .map(a => ({ ...a, grupoNombre: nuevoNombre, grupoOrden: index }));
      
      archivosOrdenados.push(...archivosDelGrupo);

      vaciosActualizados = vaciosActualizados.map(v =>
        v.id === grupoId ? { ...v, nombre: nuevoNombre } : v
      );
    });

    const archivosRestantes = latestArchivos.filter(
      a => !latestIds.includes(a.grupoId || "grupo_inicial")
    );
    archivosOrdenados.push(...archivosRestantes);

    setGruposVaciosRef.current(vaciosActualizados);
    onActualizarArchivosRef.current(archivosOrdenados);
    
    // Limpiar estados de orden para ocultar botones
    setOrdenIds([]);
    ordenIdsDragRef.current = [];

    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 1800);
  }, [ordenIds]);

  const guardarNuevoOrden = guardarOrdenDesdeRef;

  const renderGrupos = currentIds.map(id => todosGrupos.find(g => g.id === id)!).filter(Boolean);

  if (esPorParejas) {
    // Es crítico si algún grupo tiene exactamente 1 archivo
    faltaParejaCritico = todosGrupos.some((g) => g.archivos.length === 1);
    // Es advertencia/caso especial si algún grupo tiene número impar >= 3
    faltaParejaAdvertencia =
      !faltaParejaCritico && todosGrupos.some((g) => g.archivos.length >= 3 && g.archivos.length % 2 !== 0);
  }

  // ── 3. ACCIONES DE GRUPOS ──────────────────────────────────────────────────────────
  const handleCrearGrupo = (index?: number) => {
    let numFinal = proximoRecomendado;
    if (numeroSiguiente !== "") {
      const userNum = parseInt(numeroSiguiente, 10);
      if (!isNaN(userNum)) {
        numFinal = userNum;
        setNumeroSiguiente((userNum + 1).toString());
      }
    }

    const nuevoId = `grupo_${Date.now()}`;
    const nuevoNombre = `Pareja ${numFinal}`;
    
    // 1. Añadir a los grupos vacíos
    setGruposVacios((prev) => [...prev, { id: nuevoId, nombre: nuevoNombre }]);
    
    // 2. Si se especifica un índice, actualizar el orden inmediatamente
    if (typeof index === "number") {
      const baseIds = todosGrupos.map(g => g.id);
      const originIds = ordenIds.length === baseIds.length && ordenIds.every(id => baseIds.includes(id)) 
        ? ordenIds 
        : baseIds;
      
      const nextIds = [...originIds];
      nextIds.splice(index, 0, nuevoId);
      
      setOrdenIds(nextIds);
      ordenIdsDragRef.current = nextIds;
    }
  };

  const handleEliminarGrupo = (grupoId: string) => {
    if (confirm("¿Estás seguro de eliminar este grupo de parejas y todos sus archivos?")) {
      // Eliminar de los grupos vacíos locales si estuviera allí
      setGruposVacios((prev) => prev.filter((v) => v.id !== grupoId));
      // Eliminar archivos que correspondan a este grupo
      const nuevosArchs = archivos.filter((a) => {
        const idG = a.grupoId || "grupo_inicial";
        return idG !== grupoId;
      });
      onActualizarArchivos(nuevosArchs);
    }
  };

  const handleRenombrarGrupo = (grupoId: string, nombreActual: string) => {
    setRenombrandoId(grupoId);
    setNuevoNombreText(nombreActual);
  };

  const handleGuardarNombreGrupo = (grupoId: string) => {
    const textoFinal = nuevoNombreText.trim() || "Pareja";

    // Actualizar en grupos vacíos locales si estuviera allí
    setGruposVacios((prev) =>
      prev.map((v) => (v.id === grupoId ? { ...v, nombre: textoFinal } : v))
    );

    // Actualizar en los archivos de la base de datos
    const nuevosArchs = archivos.map((a) => {
      const idG = a.grupoId || "grupo_inicial";
      if (idG === grupoId) {
        return { ...a, grupoId, grupoNombre: textoFinal };
      }
      return a;
    });
    onActualizarArchivos(nuevosArchs);

    setRenombrandoId(null);
    setNuevoNombreText("");
  };

  const handleCombinarPdfGrupo = async (grupo: GrupoPareja) => {
    const { combinarYDescargarPdf } = await import("@/lib/pdfMerger");
    const labelProveedor = nombreProveedor.replace(/\s+/g, "_");
    const labelGrupo = grupo.nombre.replace(/\s+/g, "_");
    await combinarYDescargarPdf(
      grupo.archivos,
      `${labelProveedor}_${tipo.id}_${labelGrupo}`
    );
  };

  return (
    <div
      id={`tipo-${tipo.id}`}
      className="drive-folder-card"
      style={{
        border: `1.5px solid ${tiene ? tipo.color + "45" : "#dadce0"}`,
        borderRadius: 16,
        background: "#ffffff",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(60,64,67,0.08)",
        cursor: "default",
      }}
    >

      {/* Header del card principal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 16px 12px 16px",
          cursor: "pointer",
          gap: 12,
          userSelect: "none",
        }}
        onClick={() => setAbierto(!abierto)}
      >
        <div
          style={{
            width: 44,
            height: 40,
            borderRadius: "6px 12px 12px 12px",
            flexShrink: 0,
            background: tiene ? `${tipo.color}15` : "#fffbea",
            border: `1.5px solid ${tiene ? tipo.color : "#fcd34d"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            position: "relative",
          }}
        >
          {abierto ? (
            <FolderOpen size={22} style={{ color: tiene ? tipo.color : "#d97706" }} />
          ) : tiene ? (
            <FolderCheck size={22} style={{ color: tipo.color }} />
          ) : (
            <Folder size={22} style={{ color: "#d97706" }} />
          )}
          {tiene && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #fff",
              }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: tipo.color,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {tipo.label}
            </span>
            {tipo.id.includes("_ARCHIVOS") && (
              <span
                style={{
                  fontSize: 8,
                  background: tipo.color,
                  color: "#fff",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                📁 DIRECTO EN CARPETA
              </span>
            )}
            {!tipo.requerido && (
              <span
                style={{
                  fontSize: 8,
                  background: "#f1f5f9",
                  color: "#94a3b8",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Opcional
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#1e293b", margin: "2px 0 0", fontWeight: 700 }}>
            {tipo.nombre}
          </p>
          <p style={{ fontSize: 10, color: "#64748b", margin: "1px 0 0" }}>
            {tipo.descripcion}
          </p>

          {/* Advertencias */}
          {faltaParejaCritico && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#b45309",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 9,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              <AlertCircle size={10} style={{ color: "#d97706" }} /> Falta la pareja (soporte incompleto)
            </div>
          )}
          {faltaParejaAdvertencia && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#0369a1",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 9,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              <AlertCircle size={10} style={{ color: "#0284c7" }} /> Caso especial (archivos impares)
            </div>
          )}
        </div>

        {/* Conteo global y chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {esPorParejas ? (
            tiene && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: tipo.color,
                  background: `${tipo.color}15`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {todosGrupos.filter((g) => g.archivos.length > 0).length} parejas ({archivos.length} arch.)
              </span>
            )
          ) : (
            tiene && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: tipo.color,
                  background: `${tipo.color}15`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"}
              </span>
            )
          )}

          {abierto ? (
            <ChevronDown size={14} style={{ color: "#94a3b8" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          )}
        </div>
      </div>

      {/* ── PANEL EXPANDIDO ──────────────────────────────────────────────────────── */}
      {abierto && (
        <div 
          className="custom-scrollbar"
          style={{ 
            padding: "16px", 
            borderTop: "1.5px solid #f1f5f9", 
            background: "#fff",
            maxHeight: "550px", // Limitar altura para tener scroll propio
            overflowY: "auto",
            scrollBehavior: "smooth"
          }}
        >
          
          {tipo.minArchivos && tipo.minArchivos >= 1 ? (
            // ── RENDERING POR GRUPOS/PAREJAS ─────────────────────────────────────────
            <div style={{ display: "flex", flexDirection: "column" }}>
              {guardadoOk && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#d1fae5",
                    color: "#065f46",
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 800,
                  }}>
                    ✓ Orden guardado
                  </span>
                </div>
              )}

              {haCambiadoOrden && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  background: "#eff6ff",
                  padding: "10px 14px",
                  borderRadius: 12,
                  marginBottom: 14,
                  border: "1.5px dashed #3b82f6"
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1e40af" }}>
                    Has cambiado el orden. ¿Deseas guardar los cambios?
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={() => {
                        setOrdenIds([]);
                        ordenIdsDragRef.current = [];
                      }}
                      style={{
                        background: "#fff",
                        border: "1.5px solid #d1d5db",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      Deshacer
                    </button>
                    <button 
                      onClick={guardarNuevoOrden}
                      style={{
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)"
                      }}
                    >
                      Guardar Orden
                    </button>
                  </div>
                </div>
              )}
              {/* Barra de cabecera de las parejas */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  marginTop: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Folder size={15} style={{ color: "#5f6368" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#444746" }}>
                    Carpetas de Parejas ({renderGrupos.length})
                  </span>
                </div>

                {renderGrupos.length > 1 && (
                  <button
                    onClick={() => {
                      const allOpen = renderGrupos.every((g) => parejasAbiertas[g.id] !== false);
                      const updated: { [id: string]: boolean } = {};
                      renderGrupos.forEach((g) => {
                        updated[g.id] = !allOpen;
                      });
                      setParejasAbiertas(updated);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#1a73e8",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "2px 6px",
                      fontFamily: "inherit",
                    }}
                  >
                    {renderGrupos.every((g) => parejasAbiertas[g.id] !== false)
                      ? "Colapsar todas"
                      : "Expandir todas"}
                  </button>
                )}
              </div>

              <Reorder.Group 
                 axis="y" 
                 values={currentIds} 
                 onReorder={handleReorder} 
                 style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0, padding: 0, listStyle: "none" }}
              >
                {/* Botón para insertar antes de la primera pareja */}
                {renderGrupos.length > 0 && (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    margin: "0 0 -18px 0", 
                    position: "relative", 
                    zIndex: 5,
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                  >
                    <button
                      onClick={() => handleCrearGrupo(0)}
                      title="Insertar pareja al inicio"
                      style={{
                        background: tipo.color,
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}

                {renderGrupos.map((grupo, index) => {
                  const esRenombrando = renombrandoId === grupo.id;
                  const count = grupo.archivos.length;
                  const gFaltaPareja = count === 1;
                  const gEsImparExtra = count >= 3 && count % 2 !== 0;
                  const uploadExtra = extraUploadActivo[grupo.id] ?? false;
                  const esAbierta = parejasAbiertas[grupo.id] ?? true;

                  // Extraer el número consecutivo de esta pareja
                  let numGrupo: number | null = null;
                  let fallbackNum: number | null = null;
                  const posiblesTextos = [grupo.nombre, ...grupo.archivos.map(a => a.nombre)];
                  for (const rawTexto of posiblesTextos) {
                    const texto = rawTexto.replace(new RegExp(tipo.id, 'gi'), '');
                    if (texto.startsWith("Pareja ")) {
                       const m = texto.match(/\d+/);
                       if (m && fallbackNum === null) fallbackNum = parseInt(m[0], 10);
                       continue;
                    }
                    const match = texto.match(/\d+/);
                    if (match) {
                      numGrupo = parseInt(match[0], 10);
                      break;
                    }
                  }
                  
                  if (numGrupo === null && fallbackNum !== null) {
                    numGrupo = fallbackNum;
                  }

                  const esRepetido = numGrupo !== null && alertaConsecutivo?.repetidos.includes(numGrupo);

                  // Verificar si faltan números antes de este grupo
                  let faltanAntes: number[] = [];
                  if (numGrupo !== null && alertaConsecutivo) {
                    const idx = alertaConsecutivo.presentes.indexOf(numGrupo);
                    if (idx > 0) {
                      const prevNum = alertaConsecutivo.presentes[idx - 1];
                      if (numGrupo > prevNum + 1) {
                        for (let i = prevNum + 1; i < numGrupo; i++) {
                          faltanAntes.push(i);
                        }
                      }
                    }
                  }

                  return (
                    <Fragment key={grupo.id}>
                      <Reorder.Item
                        key={grupo.id}
                        value={grupo.id}
                        className="drive-subfolder"
                        style={{
                          border: `1px solid ${gFaltaPareja ? "#fde68a" : count >= 2 ? "#bbf7d0" : "#dadce0"}`,
                          borderRadius: 14,
                          background: "#ffffff",
                          position: "relative",
                          boxShadow: "0 1px 3px rgba(60,64,67,0.06)",
                        }}
                      >
                        {/* Cabecera de la Pareja estilo Carpeta Google Drive */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            background: gFaltaPareja ? "#fffdf5" : count >= 2 ? "#fafffd" : "#ffffff",
                            borderBottom: esAbierta ? "1px solid #f1f5f9" : "none",
                            gap: 10,
                            cursor: "pointer",
                            userSelect: "none",
                            transition: "background 0.15s ease",
                          }}
                          onClick={() => toggleParejaAbierta(grupo.id)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                            <div
                              title="Arrastra desde aquí para cambiar el orden"
                              style={{ cursor: "grab", color: "#94a3b8", display: "flex", alignItems: "center" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={16} />
                            </div>

                            {/* Ícono de Carpeta Drive */}
                            <Folder
                              size={24}
                              style={{
                                color: gFaltaPareja ? "#f59e0b" : count >= 2 ? "#10b981" : "#94a3b8",
                                fill: `${gFaltaPareja ? "#f59e0b" : count >= 2 ? "#10b981" : "#94a3b8"}22`,
                                flexShrink: 0,
                              }}
                            />

                            {esRenombrando ? (
                              <div
                                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: 300 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={nuevoNombreText}
                                  onChange={(e) => setNuevoNombreText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleGuardarNombreGrupo(grupo.id);
                                    if (e.key === "Escape") setRenombrandoId(null);
                                  }}
                                  autoFocus
                                  style={{
                                    padding: "4px 8px",
                                    border: "1.5px solid #3b82f6",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontFamily: "inherit",
                                    width: "100%",
                                  }}
                                />
                                <button
                                  onClick={() => handleGuardarNombreGrupo(grupo.id)}
                                  style={{
                                    background: "#10b981",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: 4,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => setRenombrandoId(null)}
                                  style={{
                                    background: "#64748b",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: 4,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
                                <strong style={{ fontSize: 13, color: "#1f1f1f" }}>
                                  {grupo.nombre}
                                </strong>
                                {/* Chip con número consecutivo del archivo */}
                                {numGrupo !== null && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: esRepetido ? "#fee2e2" : "#f1f5f9",
                                      color: esRepetido ? "#b91c1c" : "#475569",
                                      borderRadius: 6,
                                      padding: "1px 7px",
                                      fontFamily: "monospace",
                                      letterSpacing: "0.02em",
                                      border: `1px solid ${esRepetido ? "#fca5a5" : "#e2e8f0"}`,
                                    }}
                                  >
                                    #{numGrupo}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRenombrarGrupo(grupo.id, grupo.nombre);
                                  }}
                                  title="Cambiar nombre de esta pareja"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    padding: 2,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Edit2 size={11} />
                                </button>

                                {/* Badge de Estado estilo Drive */}
                                {count >= 2 ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#d1fae5",
                                      color: "#065f46",
                                      borderRadius: 99,
                                      padding: "2px 8px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <CheckCircle2 size={11} />
                                    {count} archivos · Completa
                                  </span>
                                ) : count === 1 ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      borderRadius: 99,
                                      padding: "2px 8px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <AlertCircle size={11} />
                                    1 de 2 · Falta soporte
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#f1f5f9",
                                      color: "#64748b",
                                      borderRadius: 99,
                                      padding: "2px 8px",
                                    }}
                                  >
                                    Vacía (0/2)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botones de acción del grupo */}
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {count >= 2 && (
                              <button
                                onClick={() => handleCombinarPdfGrupo(grupo)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#fff",
                                  border: "1px solid #dadce0",
                                  borderRadius: 16,
                                  padding: "3px 10px",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#3c4043",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                <FileDown size={11} /> PDF
                              </button>
                            )}
                            <button
                              onClick={() => handleEliminarGrupo(grupo.id)}
                              title="Eliminar esta pareja"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                borderRadius: 6,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                            >
                              <Trash2 size={14} />
                            </button>
                            <div
                              onClick={() => toggleParejaAbierta(grupo.id)}
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                color: "#5f6368",
                                padding: "2px 4px",
                              }}
                            >
                              <ChevronDown
                                size={16}
                                style={{
                                  transform: esAbierta ? "rotate(0deg)" : "rotate(-90deg)",
                                  transition: "transform 0.2s ease",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contenido interior de la carpeta de pareja (archivos y dropzone) */}
                        {esAbierta && (
                          <div style={{ padding: "14px", background: "#ffffff" }}>
                            {/* Advertencia de salto de consecutivo */}
                            {faltanAntes.length > 0 && (
                              <div
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fecaca",
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                  marginBottom: 10,
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 6,
                                  fontSize: 10,
                                  color: "#b91c1c",
                                }}
                              >
                                <AlertCircle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                                <div>
                                  <strong>Salto de secuencia:</strong> Faltan los consecutivos{" "}
                                  <strong>
                                    {faltanAntes.length > 7
                                      ? `${faltanAntes[0]} al ${faltanAntes[faltanAntes.length - 1]} (${faltanAntes.length} números faltantes)`
                                      : faltanAntes.join(", ")}
                                  </strong>{" "}
                                  antes de este archivo.
                                </div>
                              </div>
                            )}

                            {/* Advertencia interna del grupo de Consecutivo Repetido */}
                            {esRepetido && (
                              <div
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fecaca",
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                  marginBottom: 10,
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 6,
                                  fontSize: 10,
                                  color: "#b91c1c",
                                }}
                              >
                                <AlertCircle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                                <div>
                                  <strong>Consecutivo repetido:</strong> El número <strong>{numGrupo}</strong> ya está siendo usado por otra pareja u otro lote en este mes.
                                </div>
                              </div>
                            )}

                            {/* Advertencia interna del grupo */}
                            {gFaltaPareja && (
                              <div
                                style={{
                                  background: "#fffbeb",
                                  border: "1px solid #fde68a",
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                  marginBottom: 10,
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 6,
                                  fontSize: 10,
                                  color: "#b45309",
                                }}
                              >
                                <AlertCircle size={13} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                                <div>
                                  <strong>Falta un soporte:</strong> Se requiere subir el archivo complementario de: <strong>{tipo.ayudaPareja}</strong>.
                                </div>
                              </div>
                            )}
                            {gEsImparExtra && (
                              <div
                                style={{
                                  background: "#f0f9ff",
                                  border: "1px solid #bae6fd",
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                  marginBottom: 10,
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 6,
                                  fontSize: 10,
                                  color: "#0369a1",
                                }}
                              >
                                <AlertCircle size={13} style={{ color: "#0284c7", flexShrink: 0, marginTop: 1 }} />
                                <div>
                                  <strong>Nota sobre archivos impares:</strong> Tienes {count} archivos. Si es un caso especial con soportes adicionales, ignora este aviso.
                                </div>
                              </div>
                            )}

                            {/* Listado de archivos y dropzone de esta pareja */}
                            <div style={{ marginBottom: count > 0 ? 10 : 0 }}>
                              <ZonaUpload
                                tipoDoc={tipo}
                                archivos={grupo.archivos}
                                onAgregar={onAgregar}
                                onEliminar={onEliminar}
                                onVer={onVer}
                                grupoId={grupo.id}
                                grupoNombre={grupo.nombre}
                                ocultarDropzone={count >= (tipo.minArchivos || 2) && !uploadExtra}
                              />
                            </div>

                            {/* Botón para forzar más archivos (Trio/Cuarteto) */}
                            {count >= (tipo.minArchivos || 2) && (
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() =>
                                    setExtraUploadActivo((prev) => ({ ...prev, [grupo.id]: !uploadExtra }))
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: tipo.color,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    padding: "4px 0",
                                    textDecoration: "underline",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {uploadExtra ? "✕ Cerrar subida" : "+ Agregar soporte extra a esta pareja"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Reorder.Item>
                      
                      {/* Botón para insertar entre parejas */}
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "center", 
                        margin: "-10px 0 -4px 0", 
                        position: "relative", 
                        zIndex: 5,
                        opacity: 0,
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                      >
                        <button
                          onClick={() => handleCrearGrupo(todosGrupos.indexOf(grupo) + 1)}
                          title="Insertar pareja aquí"
                          style={{
                            background: tipo.color,
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </Fragment>
                  );
                })}
              </Reorder.Group>

              {/* Botón para iniciar una nueva pareja y Campo para número inicial */}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: `${tipo.color}10`,
                    border: `1.5px solid ${tipo.color}35`,
                    borderRadius: 10,
                    padding: "0 10px",
                  }}
                  title="Escribe el número inicial aquí. Se auto incrementará con cada pareja que crees."
                >
                  <span style={{ fontSize: 10, fontWeight: 800, color: tipo.color, marginRight: 6 }}>
                    Num Inicial:
                  </span>
                  <input
                    type="number"
                    value={numeroSiguiente}
                    onChange={(e) => setNumeroSiguiente(e.target.value)}
                    placeholder={proximoRecomendado.toString()}
                    style={{
                      width: 50,
                      border: "none",
                      background: "transparent",
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={() => handleCrearGrupo()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: `${tipo.color}15`,
                    color: tipo.color,
                    border: `1.5px dashed ${tipo.color}35`,
                    borderRadius: 10,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 11,
                    fontFamily: "inherit",
                    flex: 1,
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <Plus size={14} /> Iniciar Nueva Pareja de Documentos
                </button>
              </div>
            </div>
          ) : (
            // ── RENDERING PLANO (FV, CC-1...) ───────────────────────────────────────
            <div>
              {archivos.length > 1 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button
                    onClick={async () => {
                      const { combinarYDescargarPdf } = await import("@/lib/pdfMerger");
                      combinarYDescargarPdf(archivos, `${nombreProveedor.replace(/\s+/g, "_")}_${tipo.id}`);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "#fff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#475569",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <FileDown size={11} /> Combinar todos en un PDF
                  </button>
                </div>
              )}
              <ZonaUpload
                tipoDoc={tipo}
                archivos={archivos}
                onAgregar={onAgregar}
                onEliminar={onEliminar}
                onVer={onVer}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
