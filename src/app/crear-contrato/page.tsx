"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSignature,
  Download,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  CheckCircle2,
  Phone,
  Mail,
  Home as HomeIcon,
  Search,
  UserPlus,
  AlertTriangle,
  Database,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { numeroALetras } from "@/lib/utils";

interface Proveedor {
  id?: string;
  nombre: string;
  cedula: string;
}

// Helper para convertir fecha ISO (YYYY-MM-DD) a formato legal en español
function fechaAFormatoLegal(fechaIso: string): string {
  if (!fechaIso) return "";
  const parts = fechaIso.split("-");
  if (parts.length !== 3) return "";
  const diaNum = parseInt(parts[2], 10);
  const mesNum = parseInt(parts[1], 10) - 1;
  const anio = parts[0];

  const diasTexto: Record<number, string> = {
    1: "primero (01)", 2: "dos (02)", 3: "tres (03)", 4: "cuatro (04)", 5: "cinco (05)",
    6: "seis (06)", 7: "siete (07)", 8: "ocho (08)", 9: "nueve (09)", 10: "diez (10)",
    11: "once (11)", 12: "doce (12)", 13: "trece (13)", 14: "catorce (14)", 15: "quince (15)",
    16: "dieciséis (16)", 17: "diecisiete (17)", 18: "dieciocho (18)", 19: "diecinueve (19)",
    20: "veinte (20)", 21: "veintiuno (21)", 22: "veintidós (22)", 23: "veintitrés (23)",
    24: "veinticuatro (24)", 25: "veinticinco (25)", 26: "veintiséis (26)", 27: "veintisiete (27)",
    28: "veintiocho (28)", 29: "veintinueve (29)", 30: "treinta (30)", 31: "treinta y uno (31)"
  };

  const mesesTexto = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const diaStr = diasTexto[diaNum] || `${diaNum}`;
  const mesStr = mesesTexto[mesNum] || "";

  return `${diaStr} de ${mesStr} de ${anio}`;
}

// Helper para calcular la duración entre dos fechas
function calcularDuracionMeses(fInicioIso: string, fFinIso: string): string {
  if (!fInicioIso || !fFinIso) return "";
  const d1 = new Date(fInicioIso);
  const d2 = new Date(fFinIso);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "";

  let meses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() >= d1.getDate() - 2) {
    meses = Math.max(1, meses);
  }
  if (meses <= 0) meses = 1;

  const numeroALetrasMeses: Record<number, string> = {
    1: "un (1) mes",
    2: "dos (2) meses",
    3: "tres (3) meses",
    4: "cuatro (4) meses",
    5: "cinco (5) meses",
    6: "seis (6) meses",
    7: "siete (7) meses",
    8: "ocho (8) meses",
    9: "nueve (9) meses",
    10: "diez (10) meses",
    11: "once (11) meses",
    12: "doce (12) meses"
  };

  return numeroALetrasMeses[meses] || `${meses} meses`;
}

export default function CrearContratoPage() {
  const [tipoContrato, setTipoContrato] = useState<"auxiliar" | "supervisor">("auxiliar");
  const [loading, setLoading] = useState(false);

  // Autocompletado desde Base de Datos (Supabase)
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sugerencias, setSugerencias] = useState<Proveedor[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargandoDb, setCargandoDb] = useState(false);
  const [guardandoEnDb, setGuardandoEnDb] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Formulario Datos Contratista
  const [nombreContratista, setNombreContratista] = useState("");
  const [cedulaContratista, setCedulaContratista] = useState("");
  const [expedidaEn, setExpedidaEn] = useState("Yumbo");
  const [domicilioContratista, setDomicilioContratista] = useState("Yumbo");
  const [direccionContratista, setDireccionContratista] = useState("");
  const [telefonoContratista, setTelefonoContratista] = useState("");
  const [emailContratista, setEmailContratista] = useState("");
  const [formaPago, setFormaPago] = useState("QUINCENAL");

  // Fechas ISO para datepickers
  const [fechaInicioPicker, setFechaInicioPicker] = useState("2026-08-01");
  const [fechaFinPicker, setFechaFinPicker] = useState("2026-10-31");

  const [duracionTexto, setDuracionTexto] = useState("tres (3) meses");
  const [fechaInicioTexto, setFechaInicioTexto] = useState("primero (01) de agosto de 2026");
  const [fechaFinTexto, setFechaFinTexto] = useState("treinta y uno (31) de octubre de 2026");

  const [valorMensualNumero, setValorMensualNumero] = useState("3.786.000");
  const [valorMensualLetras, setValorMensualLetras] = useState("TRES MILLONES SETECIENTOS OCHENTA Y SEIS MIL");
  
  const [valorQuincenalNumero, setValorQuincenalNumero] = useState("600.000");
  const [valorQuincenalLetras, setValorQuincenalLetras] = useState("SEISCIENTOS MIL");

  // Cargar personas/proveedores desde la Base de Datos
  const cargarProveedores = async () => {
    setCargandoDb(true);
    try {
      const res = await fetch("/api/listar-proveedores");
      if (res.ok) {
        const data = await res.json();
        setProveedores(data.proveedores || []);
      }
    } catch (err) {
      console.error("Error consultando base de datos:", err);
    } finally {
      setCargandoDb(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handler cambio de nombre con autocompletado en tiempo real
  const handleNombreChange = (val: string) => {
    setNombreContratista(val);
    if (val.trim().length >= 1) {
      const valNorm = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filtrados = proveedores.filter((p) => {
        const pNorm = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return pNorm.includes(valNorm);
      });
      setSugerencias(filtrados);
      setMostrarSugerencias(filtrados.length > 0);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  // Seleccionar persona del desplegable
  const seleccionarProveedor = (prov: Proveedor) => {
    setNombreContratista(prov.nombre);
    if (prov.cedula) {
      setCedulaContratista(prov.cedula);
      toast.success(`¡Autocompletado: ${prov.nombre} con cédula ${prov.cedula}!`);
    } else {
      toast.info(`¡Seleccionado: ${prov.nombre}! (Sin cédula registrada en BD)`);
    }
    setMostrarSugerencias(false);
  };

  // Guardar nueva persona en la Base de Datos directamente
  const handleGuardarEnDb = async () => {
    if (!nombreContratista.trim() || !cedulaContratista.trim()) {
      toast.error("Ingresa el nombre y la cédula para guardar en la base de datos.");
      return;
    }
    setGuardandoEnDb(true);
    try {
      const res = await fetch("/api/agregar-proveedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreContratista.trim(), cedula: cedulaContratista.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error guardando en BD");
      }
      const data = await res.json();
      toast.success(`¡Persona "${data.nombre}" registrada exitosamente en la Base de Datos!`);
      await cargarProveedores();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar en la base de datos.");
    } finally {
      setGuardandoEnDb(false);
    }
  };

  // Handlers para actualizar automáticamente las fechas y la duración desde el calendario
  const handleCambioFechaInicioPicker = (isoDate: string) => {
    setFechaInicioPicker(isoDate);
    const textoLegal = fechaAFormatoLegal(isoDate);
    if (textoLegal) setFechaInicioTexto(textoLegal);

    if (fechaFinPicker) {
      const duracion = calcularDuracionMeses(isoDate, fechaFinPicker);
      if (duracion) setDuracionTexto(duracion);
    }
  };

  const handleCambioFechaFinPicker = (isoDate: string) => {
    setFechaFinPicker(isoDate);
    const textoLegal = fechaAFormatoLegal(isoDate);
    if (textoLegal) setFechaFinTexto(textoLegal);

    if (fechaInicioPicker) {
      const duracion = calcularDuracionMeses(fechaInicioPicker, isoDate);
      if (duracion) setDuracionTexto(duracion);
    }
  };

  // Handlers para actualizar automáticamente el valor en letras al escribir en números
  const handleCambioValorMensual = (val: string) => {
    setValorMensualNumero(val);
    const soloNumeros = val.replace(/[^0-9]/g, "");
    if (soloNumeros) {
      const num = parseInt(soloNumeros, 10);
      if (!isNaN(num) && num > 0) {
        setValorMensualLetras(numeroALetras(num));
      }
    }
  };

  const handleCambioValorQuincenal = (val: string) => {
    setValorQuincenalNumero(val);
    const soloNumeros = val.replace(/[^0-9]/g, "");
    if (soloNumeros) {
      const num = parseInt(soloNumeros, 10);
      if (!isNaN(num) && num > 0) {
        setValorQuincenalLetras(numeroALetras(num));
      }
    }
  };

  // Cargar datos predeterminados de prueba
  const handleCargarEjemploMarilin = () => {
    setNombreContratista("MARILIN VALDEZ GUTIERREZ");
    setCedulaContratista("1.118.305.208");
    setExpedidaEn("Yumbo");
    setDomicilioContratista("Yumbo");
    setDireccionContratista("CALLE 2 O # 6 - 26 NUEVO HORIZONTE");
    setTelefonoContratista("3224016048");
    setEmailContratista("MARILINVA@GMAIL.COM");
    toast.success("Datos cargados para Marilin Valdez");
  };

  const handleCargarEjemploNoe = () => {
    setNombreContratista("NOE CONTRERAS");
    setCedulaContratista("88.270.810");
    setExpedidaEn("Cúcuta");
    setDomicilioContratista("Yumbo");
    setDireccionContratista("YUMBO CENTRO");
    setTelefonoContratista("3100000000");
    setEmailContratista("NOECONTRERAS@GMAIL.COM");
    toast.success("Datos cargados para Noe Contreras");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreContratista.trim() || !cedulaContratista.trim()) {
      toast.error("Por favor completa el nombre y la cédula del contratista");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generar-contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoContrato,
          nombreContratista,
          cedulaContratista,
          expedidaEn,
          domicilioContratista,
          direccionContratista,
          telefonoContratista,
          emailContratista,
          formaPago,
          duracionTexto,
          fechaInicioTexto,
          fechaFinTexto,
          valorMensualNumero,
          valorMensualLetras,
          valorQuincenalNumero,
          valorQuincenalLetras,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al generar contrato");
      }

      // Descargar el blob recibido
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanNombre = nombreContratista.trim().replace(/[^a-zA-Z0-9]/g, "_");
      a.download = `Contrato_${tipoContrato === "supervisor" ? "Supervisor" : "Auxiliar"}_${cleanNombre}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("¡Contrato con Portada y Membrete generado con éxito!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ocurrió un error al generar el documento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: 60 }}>
      {/* Header Sticky */}
      <header
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(241, 245, 249, 0.8)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 20,
          boxShadow: "0 4px 20px -10px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#f1f5f9",
              color: "#475569",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.2,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Generador de Contratos <Sparkles size={16} style={{ color: "#8b5cf6" }} />
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
              Fundación Una Mano Amiga a Tiempo (Conexión Directa a Base de Datos)
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          maxWidth: 840,
          margin: "30px auto 0",
          padding: "0 16px",
        }}
      >
        {/* Selector de Tipo de Contrato */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 12,
            }}
          >
            1. Selecciona el Tipo de Contrato
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            {/* Opcion Auxiliar */}
            <div
              onClick={() => setTipoContrato("auxiliar")}
              style={{
                border: `2px solid ${tipoContrato === "auxiliar" ? "#8b5cf6" : "#e2e8f0"}`,
                background: tipoContrato === "auxiliar" ? "#f5f3ff" : "#fff",
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: tipoContrato === "auxiliar" ? "#8b5cf6" : "#f1f5f9",
                  color: tipoContrato === "auxiliar" ? "#fff" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UserCheck size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
                    Auxiliar de Parqueadero
                  </h3>
                  {tipoContrato === "auxiliar" && (
                    <CheckCircle2 size={18} style={{ color: "#8b5cf6" }} />
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  Con portada institucional y membrete oficial de Fundamiga.
                </p>
              </div>
            </div>

            {/* Opcion Supervisor */}
            <div
              onClick={() => setTipoContrato("supervisor")}
              style={{
                border: `2px solid ${tipoContrato === "supervisor" ? "#8b5cf6" : "#e2e8f0"}`,
                background: tipoContrato === "supervisor" ? "#f5f3ff" : "#fff",
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: tipoContrato === "supervisor" ? "#8b5cf6" : "#f1f5f9",
                  color: tipoContrato === "supervisor" ? "#fff" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
                    Supervisor de Parqueadero
                  </h3>
                  {tipoContrato === "supervisor" && (
                    <CheckCircle2 size={18} style={{ color: "#8b5cf6" }} />
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  Supervisión y coordinación con membrete y portada institucional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de Datos */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#0f172a",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileText size={18} style={{ color: "#8b5cf6" }} /> 2. Datos para Portada y Contrato
              </h2>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {nombreContratista.trim() && cedulaContratista.trim() && (
                  <button
                    type="button"
                    onClick={handleGuardarEnDb}
                    disabled={guardandoEnDb}
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#15803d",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Database size={13} /> {guardandoEnDb ? "Guardando..." : "Guardar en Base de Datos"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCargarEjemploMarilin}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Marilin Valdez
                </button>
                <button
                  type="button"
                  onClick={handleCargarEjemploNoe}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Noe Contreras
                </button>
              </div>
            </div>

            {/* Grid 2 columnas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
              }}
            >
              {/* Nombre Contratista con Autocompletado de Base de Datos */}
              <div style={{ gridColumn: "span 2", position: "relative" }} ref={wrapperRef}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    Nombre Completo del Contratista *
                  </label>
                  {cargandoDb ? (
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>Conectando a BD...</span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                      <Database size={10} /> {proveedores.length} registros en BD
                    </span>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    required
                    placeholder="Escribe el nombre para buscar en la base de datos..."
                    value={nombreContratista}
                    onChange={(e) => handleNombreChange(e.target.value)}
                    onFocus={() => {
                      if (nombreContratista.trim().length >= 1 && sugerencias.length > 0) {
                        setMostrarSugerencias(true);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 38px 10px 14px",
                      borderRadius: 12,
                      border: "1.5px solid #cbd5e1",
                      fontSize: 13,
                      fontWeight: 600,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                {/* Desplegable de sugerencias con estado de cédula */}
                {mostrarSugerencias && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1.5px solid #8b5cf6",
                      borderRadius: 14,
                      marginTop: 4,
                      maxHeight: 220,
                      overflowY: "auto",
                      zIndex: 60,
                      boxShadow: "0 12px 30px rgba(139, 92, 246, 0.15)",
                    }}
                  >
                    {sugerencias.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => seleccionarProveedor(s)}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#0f172a",
                          borderBottom: i < sugerencias.length - 1 ? "1px solid #f1f5f9" : "none",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      >
                        <span style={{ fontWeight: 800, color: "#1e293b" }}>{s.nombre}</span>
                        {s.cedula ? (
                          <span
                            style={{
                              fontSize: 11,
                              background: "#dcfce7",
                              color: "#15803d",
                              padding: "2px 8px",
                              borderRadius: 10,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Check size={12} /> CC: {s.cedula}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              background: "#fef3c7",
                              color: "#d97706",
                              padding: "2px 8px",
                              borderRadius: 10,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <AlertTriangle size={12} /> Sin Cédula
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cédula */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Cédula / NIT *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1.118.305.208"
                  value={cedulaContratista}
                  onChange={(e) => setCedulaContratista(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Ciudad de Expedición */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Expedida en <MapPin size={12} style={{ display: "inline", color: "#64748b" }} />
                </label>
                <input
                  type="text"
                  placeholder="Ej: Yumbo / Cúcuta"
                  value={expedidaEn}
                  onChange={(e) => setExpedidaEn(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Dirección / Barrio en Portada */}
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  <HomeIcon size={13} style={{ display: "inline", color: "#64748b" }} /> Dirección / Barrio (Para la Portada)
                </label>
                <input
                  type="text"
                  placeholder="Ej: CALLE 2 O # 6 - 26 NUEVO HORIZONTE"
                  value={direccionContratista}
                  onChange={(e) => setDireccionContratista(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Teléfono */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  <Phone size={13} style={{ display: "inline", color: "#64748b" }} /> Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej: 3224016048"
                  value={telefonoContratista}
                  onChange={(e) => setTelefonoContratista(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  <Mail size={13} style={{ display: "inline", color: "#64748b" }} /> Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="Ej: marilinva@gmail.com"
                  value={emailContratista}
                  onChange={(e) => setEmailContratista(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Sección Fechas y Duración */}
              <div
                style={{
                  gridColumn: "span 2",
                  marginTop: 10,
                  paddingTop: 14,
                  borderTop: "1px dashed #e2e8f0",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#8b5cf6",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Calendar size={14} /> Duración y Período
                </h4>
              </div>

              {/* Duración texto */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Duración (Texto)
                </label>
                <input
                  type="text"
                  placeholder="Ej: tres (3) meses"
                  value={duracionTexto}
                  onChange={(e) => setDuracionTexto(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Fecha Inicio */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicioPicker}
                    onChange={(e) => handleCambioFechaInicioPicker(e.target.value)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "2px 6px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Ej: primero (01) de agosto de 2026"
                  value={fechaInicioTexto}
                  onChange={(e) => setFechaInicioTexto(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Fecha Fin */}
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    Fecha de Finalización
                  </label>
                  <input
                    type="date"
                    value={fechaFinPicker}
                    onChange={(e) => handleCambioFechaFinPicker(e.target.value)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "2px 6px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Ej: treinta y uno (31) de octubre de 2026"
                  value={fechaFinTexto}
                  onChange={(e) => setFechaFinTexto(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Sección Valores Económicos */}
              <div
                style={{
                  gridColumn: "span 2",
                  marginTop: 10,
                  paddingTop: 14,
                  borderTop: "1px dashed #e2e8f0",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#10b981",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <DollarSign size={14} /> Valores del Contrato
                </h4>
              </div>

              {/* Forma de Pago */}
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Forma de Pago (Para la Portada)
                </label>
                <input
                  type="text"
                  placeholder="Ej: QUINCENAL"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Valor Mensual Numero */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Valor Mensual ($)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 3.786.000"
                  value={valorMensualNumero}
                  onChange={(e) => handleCambioValorMensual(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Valor Mensual Letras */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Valor Mensual (En Letras)
                </label>
                <input
                  type="text"
                  placeholder="Ej: TRES MILLONES SETECIENTOS OCHENTA Y SEIS MIL..."
                  value={valorMensualLetras}
                  onChange={(e) => setValorMensualLetras(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Valor Quincenal Numero */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Pago Quincenal ($)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 600.000"
                  value={valorQuincenalNumero}
                  onChange={(e) => handleCambioValorQuincenal(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Valor Quincenal Letras */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Pago Quincenal (En Letras)
                </label>
                <input
                  type="text"
                  placeholder="Ej: SEISCIENTOS MIL"
                  value={valorQuincenalLetras}
                  onChange={(e) => setValorQuincenalLetras(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Botón Submit */}
            <div style={{ marginTop: 30, textAlign: "right" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#8b5cf6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  padding: "14px 32px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: loading ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 8px 25px rgba(139, 92, 246, 0.3)",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
              >
                {loading ? (
                  "Generando Contrato con Portada..."
                ) : (
                  <>
                    <Download size={18} /> Generar y Descargar Contrato (.docx)
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
