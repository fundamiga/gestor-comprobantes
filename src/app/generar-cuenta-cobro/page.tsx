"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, FileText, UploadCloud, FileDown, Loader2, Search, UserPlus, PenTool, X, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Proveedor {
  nombre: string;
  cedula: string;
}

interface FirmaEntry {
  nombre: string;
  url: string;
}

export default function GenerarCuentaCobroPage() {
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [concepto, setConcepto] = useState("Honorarios / Servicios");
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState("");
  const [firma, setFirma] = useState<File | null>(null);
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Autocompletado Proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [firmasCloud, setFirmasCloud] = useState<FirmaEntry[]>([]);
  const [sugerencias, setSugerencias] = useState<Proveedor[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Autocompletado Firmas (Manual)
  const [busquedaFirma, setBusquedaFirma] = useState("");
  const [sugerenciasFirma, setSugerenciasFirma] = useState<FirmaEntry[]>([]);
  const [mostrarSugerenciasFirma, setMostrarSugerenciasFirma] = useState(false);
  const wrapperFirmaRef = useRef<HTMLDivElement>(null);

  // Modales
  const [modalFirma, setModalFirma] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);
  const [modalLista, setModalLista] = useState(false);
  const [nuevoFirmaNombre, setNuevoFirmaNombre] = useState("");
  const [nuevoFirmaArchivo, setNuevoFirmaArchivo] = useState<File | null>(null);
  const [subiendoFirma, setSubiendoFirma] = useState(false);
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [nuevoProvCedula, setNuevoProvCedula] = useState("");
  const [guardandoProv, setGuardandoProv] = useState(false);

  // Cargar datos
  const cargarDatos = async () => {
    setCargandoDatos(true);
    try {
      const [resProv, resFirmas] = await Promise.all([
        fetch("/api/listar-proveedores"),
        fetch("/api/listar-firmas"),
      ]);
      let provs: Proveedor[] = [];
      let firmas: FirmaEntry[] = [];
      if (resProv.ok) { const data = await resProv.json(); provs = data.proveedores || []; }
      if (resFirmas.ok) { const data = await resFirmas.json(); firmas = data.firmas || []; setFirmasCloud(firmas); }
      const nombresExcel = new Set(provs.map((p) => p.nombre.toLowerCase()));
      for (const f of firmas) {
        if (!nombresExcel.has(f.nombre.toLowerCase())) {
          provs.push({ nombre: f.nombre, cedula: "" });
        }
      }
      provs.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setProveedores(provs);
    } catch (err) { console.error("Error cargando datos:", err); }
    finally { setCargandoDatos(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setMostrarSugerencias(false);
      if (wrapperFirmaRef.current && !wrapperFirmaRef.current.contains(e.target as Node)) setMostrarSugerenciasFirma(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNombreChange = (val: string) => {
    setNombre(val); setFirmaUrl(null); setFirma(null); setBusquedaFirma("");
    if (val.length >= 1) {
      const filtradas = proveedores.filter((p) => p.nombre.toLowerCase().includes(val.toLowerCase()));
      setSugerencias(filtradas); setMostrarSugerencias(filtradas.length > 0);
    } else { setSugerencias([]); setMostrarSugerencias(false); }
  };

  const handleBusquedaFirmaChange = (val: string) => {
    setBusquedaFirma(val);
    if (val.length >= 1) {
      const filtradas = firmasCloud.filter(f => normalizeString(f.nombre).includes(normalizeString(val)));
      setSugerenciasFirma(filtradas);
      setMostrarSugerenciasFirma(filtradas.length > 0);
    } else {
      setSugerenciasFirma([]);
      setMostrarSugerenciasFirma(false);
    }
  };

  const seleccionarFirmaManual = (firmaObj: FirmaEntry) => {
    setFirmaUrl(firmaObj.url);
    setFirma(null);
    setBusquedaFirma("");
    setMostrarSugerenciasFirma(false);
    toast.success("Firma asignada manualmente.");
  };

  const normalizeString = (s: string) => {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bjhon\b/g, "john");
  };

  const seleccionarProveedor = (prov: Proveedor) => {
    setNombre(prov.nombre); setNit(prov.cedula); setMostrarSugerencias(false);
    const nombreNorm = normalizeString(prov.nombre);
    const firmaEncontrada = firmasCloud.find((f) => {
      const fNameNorm = normalizeString(f.nombre);
      if (fNameNorm.includes(nombreNorm) || nombreNorm.includes(fNameNorm)) return true;
      const fWords = fNameNorm.split(" ").filter(Boolean);
      if (fWords.length > 0 && fWords.every(w => nombreNorm.includes(w))) return true;
      const pWords = nombreNorm.split(" ").filter(Boolean);
      return pWords.length > 0 && pWords.every(w => fNameNorm.includes(w));
    });
    if (firmaEncontrada) { setFirmaUrl(firmaEncontrada.url); toast.success("¡Nombre, cédula y firma autocompletados!"); }
    else { setFirmaUrl(null); toast.success("Nombre y cédula autocompletados."); }
  };

  const handleSubirFirma = async () => {
    if (!nuevoFirmaNombre || !nuevoFirmaArchivo) { toast.error("Nombre y archivo son obligatorios."); return; }
    setSubiendoFirma(true);
    try {
      const fd = new FormData();
      fd.append("nombre", nuevoFirmaNombre);
      fd.append("firma", nuevoFirmaArchivo);
      const res = await fetch("/api/subir-firma", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const data = await res.json();
      toast.success(`Firma de "${data.nombre}" subida exitosamente.`);
      setModalFirma(false); setNuevoFirmaNombre(""); setNuevoFirmaArchivo(null);
      // Recargar firmas
      await cargarDatos();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubiendoFirma(false); }
  };

  const handleAgregarProveedor = async () => {
    if (!nuevoProvNombre || !nuevoProvCedula) { toast.error("Nombre y cédula son obligatorios."); return; }
    setGuardandoProv(true);
    try {
      const res = await fetch("/api/agregar-proveedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoProvNombre, cedula: nuevoProvCedula }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const data = await res.json();
      toast.success(`"${data.nombre}" agregado con cédula ${data.cedula}.`);
      setModalProveedor(false); setNuevoProvNombre(""); setNuevoProvCedula("");
      await cargarDatos();
    } catch (err: any) { toast.error(err.message); }
    finally { setGuardandoProv(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !nit || !valor || !fecha) { toast.error("Por favor completa los campos obligatorios."); return; }
    setCargando(true);
    try {
      const formData = new FormData();
      formData.append("nombre", nombre); formData.append("nit", nit);
      formData.append("concepto", concepto); formData.append("valor", valor);
      formData.append("fecha", fecha);
      if (firma) formData.append("firma", firma);
      if (firmaUrl) formData.append("firmaUrl", firmaUrl);
      const res = await fetch("/api/generar-cuenta-cobro-manual", { method: "POST", body: formData });
      if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || "Error generando la cuenta de cobro"); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Cuenta_Cobro_${nombre.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
      toast.success("Cuenta de cobro generada exitosamente.");
    } catch (error: any) { toast.error(error.message); }
    finally { setCargando(false); }
  };

  const modalOverlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  };
  const modalBox: React.CSSProperties = {
    background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 440,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)", position: "relative",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <nav style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(241,245,249,0.8)", padding: "14px 24px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
          <ArrowLeft size={18} /> Volver a Inicio
        </Link>
      </nav>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, background: "#dbeafe", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={24} style={{ color: "#3b82f6" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>Generar Cuenta de Cobro</h1>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Ingresa los datos manualmente para crear el PDF</p>
            </div>
          </div>

          {/* BOTONES DE GESTIÓN */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button onClick={() => setModalLista(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 14, color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              <Users size={16} /> Ver Registrados
            </button>
            <button onClick={() => setModalProveedor(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 14, color: "#15803d", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              <UserPlus size={16} /> Agregar Persona
            </button>
            <button onClick={() => setModalFirma(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14, color: "#1d4ed8", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              <PenTool size={16} /> Subir Firma
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 28, borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* NOMBRE CON AUTOCOMPLETADO */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }} ref={wrapperRef}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Nombre *
                  {cargandoDatos && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: "normal" }}>Cargando...</span>}
                </label>
                <div style={{ position: "relative" }}>
                  <input type="text" required value={nombre} onChange={(e) => handleNombreChange(e.target.value)}
                    onFocus={() => { if (nombre.length >= 1 && sugerencias.length > 0) setMostrarSugerencias(true); }}
                    placeholder="Escribe para buscar..." style={{ ...inputStyle, paddingRight: 36, width: "100%", boxSizing: "border-box" as const }} />
                  <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                </div>
                {mostrarSugerencias && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, marginTop: 4, maxHeight: 200, overflowY: "auto" as const, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                    {sugerencias.map((s, i) => (
                      <div key={i} onClick={() => seleccionarProveedor(s)}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "#0f172a", borderBottom: i < sugerencias.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", justifyContent: "space-between" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                        <span>{s.nombre}</span>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{s.cedula}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>NIT / Cédula *</label>
                <input type="text" required value={nit} onChange={(e) => setNit(e.target.value)} placeholder="Ej. 123456789" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Valor (COP) *</label>
                <input type="number" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej. 500000" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Fecha *</label>
                <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Concepto</label>
              <textarea value={concepto} onChange={(e) => setConcepto(e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" as const }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Firma (Imagen opcional)</label>
              <div style={{ border: "2px dashed #cbd5e1", borderRadius: 16, padding: 24, textAlign: "center" as const, background: firmaUrl ? "#dcfce7" : "#f8fafc", cursor: "pointer", position: "relative" as const, transition: "all 0.2s" }}>
                <input type="file" accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => { if (e.target.files && e.target.files.length > 0) { setFirma(e.target.files[0]); setFirmaUrl(null); } }}
                  style={{ position: "absolute" as const, inset: 0, opacity: 0, cursor: "pointer", width: "100%", zIndex: 10 }} />
                <UploadCloud size={28} style={{ color: firmaUrl ? "#22c55e" : "#94a3b8", margin: "0 auto 8px", position: "relative", zIndex: 5 }} />
                {firma ? (
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#3b82f6", position: "relative", zIndex: 5 }}>{firma.name}</p>
                ) : firmaUrl ? (
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#22c55e", position: "relative", zIndex: 5 }}>✅ Firma detectada o seleccionada</p>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b", position: "relative", zIndex: 5 }}>Sube una imagen (PNG o JPG) o selecciona un nombre arriba</p>
                )}
              </div>
              
              {/* Buscador manual de firmas */}
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, position: "relative" }} ref={wrapperFirmaRef}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>O busca la firma en la base de datos manualmente:</label>
                <div style={{ position: "relative" }}>
                  <input type="text" value={busquedaFirma} onChange={(e) => handleBusquedaFirmaChange(e.target.value)}
                    onFocus={() => { if (busquedaFirma.length >= 1 && sugerenciasFirma.length > 0) setMostrarSugerenciasFirma(true); }}
                    placeholder="Buscar firma por nombre..." style={{ ...inputStyle, paddingRight: 36, width: "100%", boxSizing: "border-box" as const, fontSize: 13, padding: "10px 14px" }} />
                  <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                </div>
                {mostrarSugerenciasFirma && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, marginTop: 4, maxHeight: 180, overflowY: "auto" as const, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                    {sugerenciasFirma.map((s, i) => (
                      <div key={i} onClick={() => seleccionarFirmaManual(s)}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#0f172a", borderBottom: i < sugerenciasFirma.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", alignItems: "center", gap: 8 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                        <PenTool size={14} style={{ color: "#3b82f6" }} />
                        <span>{s.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={cargando} style={{ marginTop: 10, background: cargando ? "#93c5fd" : "#3b82f6", color: "#fff", border: "none", borderRadius: 14, padding: "14px 20px", fontSize: 15, fontWeight: 800, cursor: cargando ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" }}>
              {cargando ? (<><Loader2 size={18} className="animate-spin" /> Generando...</>) : (<><FileDown size={18} /> Generar PDF</>)}
            </button>
          </form>
        </motion.div>
      </main>

      {/* MODAL SUBIR FIRMA */}
      <AnimatePresence>
        {modalFirma && (
          <motion.div style={modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalFirma(false)}>
            <motion.div style={modalBox} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setModalFirma(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: "#eff6ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PenTool size={20} style={{ color: "#3b82f6" }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Subir Firma a la Nube</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Nombre de la persona *</label>
                  <input type="text" value={nuevoFirmaNombre} onChange={(e) => setNuevoFirmaNombre(e.target.value)} placeholder="Ej. Maria Lopez" style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Imagen de la firma *</label>
                  <div style={{ border: "2px dashed #cbd5e1", borderRadius: 14, padding: 20, textAlign: "center" as const, background: nuevoFirmaArchivo ? "#dcfce7" : "#f8fafc", cursor: "pointer", position: "relative" as const }}>
                    <input type="file" accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => { if (e.target.files && e.target.files.length > 0) setNuevoFirmaArchivo(e.target.files[0]); }}
                      style={{ position: "absolute" as const, inset: 0, opacity: 0, cursor: "pointer", width: "100%" }} />
                    <UploadCloud size={24} style={{ color: nuevoFirmaArchivo ? "#22c55e" : "#94a3b8", margin: "0 auto 6px" }} />
                    <p style={{ margin: 0, fontSize: 13, color: nuevoFirmaArchivo ? "#15803d" : "#64748b", fontWeight: nuevoFirmaArchivo ? 700 : 400 }}>
                      {nuevoFirmaArchivo ? nuevoFirmaArchivo.name : "Selecciona PNG o JPG"}
                    </p>
                  </div>
                </div>
                <button onClick={handleSubirFirma} disabled={subiendoFirma} style={{ marginTop: 6, background: subiendoFirma ? "#93c5fd" : "#3b82f6", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 800, cursor: subiendoFirma ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
                  {subiendoFirma ? (<><Loader2 size={16} className="animate-spin" /> Subiendo...</>) : (<><UploadCloud size={16} /> Subir Firma</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL AGREGAR PERSONA */}
      <AnimatePresence>
        {modalProveedor && (
          <motion.div style={modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalProveedor(false)}>
            <motion.div style={modalBox} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setModalProveedor(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: "#f0fdf4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={20} style={{ color: "#15803d" }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Agregar Persona</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Nombre completo *</label>
                  <input type="text" value={nuevoProvNombre} onChange={(e) => setNuevoProvNombre(e.target.value)} placeholder="Ej. Maria Lopez Garcia" style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Cédula *</label>
                  <input type="text" value={nuevoProvCedula} onChange={(e) => setNuevoProvCedula(e.target.value)} placeholder="Ej. 123456789" style={inputStyle} />
                </div>
                <button onClick={handleAgregarProveedor} disabled={guardandoProv} style={{ marginTop: 6, background: guardandoProv ? "#86efac" : "#22c55e", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 800, cursor: guardandoProv ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
                  {guardandoProv ? (<><Loader2 size={16} className="animate-spin" /> Guardando...</>) : (<><UserPlus size={16} /> Guardar Persona</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL VER REGISTRADOS */}
      <AnimatePresence>
        {modalLista && (
          <motion.div style={modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalLista(false)}>
            <motion.div style={{...modalBox, maxWidth: 500}} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setModalLista(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: "#f8fafc", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={20} style={{ color: "#475569" }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Personas Registradas</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{proveedores.length} personas en la base de datos</p>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 8 }}>
                {proveedores.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{p.nombre}</span>
                    <span style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>{p.cedula}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: "1.5px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  color: "#0f172a",
  background: "#f8fafc",
  transition: "border-color 0.2s",
};
