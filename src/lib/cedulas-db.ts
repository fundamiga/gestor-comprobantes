import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";

export interface ProveedorCedula {
  id: string;
  nombre: string;
  cedula: string;
  cargo?: string;
  origen?: "supabase_principal" | "supabase_gestor" | "excel_local";
}

// 1. Cliente hacia la Base de Datos Principal de Cédulas (de appfundaamiga-main)
const SUPABASE_CEDULAS_URL =
  process.env.SUPABASE_CEDULAS_PRINCIPAL_URL ||
  "https://upgrsqatxeokoagcwbks.supabase.co";

const SUPABASE_CEDULAS_KEY =
  process.env.SUPABASE_CEDULAS_PRINCIPAL_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZ3JzcWF0eGVva29hZ2N3YmtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM0NzUsImV4cCI6MjA5MDMyOTQ3NX0.b87zEqrr-dznnsOwX58mKHlVcgLjYEJkTTJwaf5-KCQ";

export const supabaseCedulasPrincipal = createClient(
  SUPABASE_CEDULAS_URL,
  SUPABASE_CEDULAS_KEY
);

// Cache en memoria para que las consultas posteriores respondan en 0 ms
let cachedProveedores: ProveedorCedula[] = [];
let lastFetch = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Normalizador de texto para búsquedas
export function normalizarTexto(txt: string): string {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bjhon\b/g, "john")
    .trim();
}

/**
 * Lee los proveedores y cédulas desde los archivos Excel locales en la carpeta ejemplos/
 */
async function leerCedulasExcelLocales(): Promise<ProveedorCedula[]> {
  const lista: ProveedorCedula[] = [];
  const vistos = new Set<string>();

  // 1. Archivo "nombre y cedula.xlsx"
  try {
    const p1 = path.join(process.cwd(), "ejemplos", "nombre y cedula.xlsx");
    if (fs.existsSync(p1)) {
      const wb1 = new ExcelJS.Workbook();
      await wb1.xlsx.readFile(p1);
      const s1 = wb1.worksheets[0];
      if (s1) {
        s1.eachRow((r, rowNum) => {
          const v1 = r.getCell(1).value;
          const v3 = r.getCell(3).value;
          let ns = "";
          let cs = "";

          if (v1 && typeof v1 === "string") {
            if (v1.match(/[-–]/)) {
              const parts = v1.split(/[-–]/);
              ns = parts[0].trim();
              cs = parts.slice(1).join("").trim();
            } else {
              ns = v1.trim();
              if (v3) cs = String(v3).trim();
            }
          }

          if (ns && cs) {
            // Capitalizar nombres
            ns = ns.replace(/\b\w/g, (c) => c.toUpperCase());
            const key = normalizarTexto(ns);
            if (!vistos.has(key)) {
              vistos.add(key);
              lista.push({
                id: `excel-local-${rowNum}`,
                nombre: ns,
                cedula: cs,
                origen: "excel_local",
              });
            }
          }
        });
      }
    }
  } catch (err: any) {
    console.warn("Aviso al leer nombre y cedula.xlsx:", err?.message);
  }

  // 2. Archivo "CUENTAS DE COBRO REMES.xlsx"
  try {
    const p2 = path.join(process.cwd(), "ejemplos", "CUENTAS DE COBRO REMES.xlsx");
    if (fs.existsSync(p2)) {
      const wb2 = new ExcelJS.Workbook();
      await wb2.xlsx.readFile(p2);
      for (const sheet of wb2.worksheets) {
        const n = sheet.getRow(3).getCell(2).value;
        const c = sheet.getRow(4).getCell(2).value;
        if (n && c) {
          const ns = String(n).trim().replace(/\b\w/g, (x) => x.toUpperCase());
          const cs = String(c).trim();
          const key = normalizarTexto(ns);
          if (!vistos.has(key)) {
            vistos.add(key);
            lista.push({
              id: `excel-remes-${sheet.id || sheet.name}`,
              nombre: ns,
              cedula: cs,
              origen: "excel_local",
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("Aviso al leer CUENTAS DE COBRO REMES.xlsx:", err?.message);
  }

  return lista;
}

/**
 * Consulta la base de datos de trabajadores principal (de appfundaamiga-main)
 * con un timeout de seguridad para que nunca se quede congelado esperando.
 */
async function obtenerTrabajadoresPrincipal(timeoutMs = 3500): Promise<ProveedorCedula[]> {
  try {
    const fetchPromise = supabaseCedulasPrincipal
      .from("trabajadores")
      .select("id, nombre, cedula, cargo")
      .order("nombre", { ascending: true });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout conectando a Supabase Principal")), timeoutMs)
    );

    const res: any = await Promise.race([fetchPromise, timeoutPromise]);
    if (res?.error) throw res.error;

    if (Array.isArray(res?.data)) {
      return res.data
        .filter((t: any) => t.nombre && t.cedula)
        .map((t: any) => ({
          id: String(t.id),
          nombre: String(t.nombre).trim(),
          cedula: String(t.cedula).trim(),
          cargo: t.cargo || undefined,
          origen: "supabase_principal",
        }));
    }
    return [];
  } catch (err: any) {
    console.warn("Aviso al consultar Supabase Principal de Cédulas:", err?.message);
    return [];
  }
}

/**
 * Obtiene la lista completa y unificada de personas/cédulas:
 * 1. Base de datos principal de cédulas (appfundaamiga-main: https://upgrsqatxeokoagcwbks.supabase.co)
 * 2. Excel local de respaldo ("nombre y cedula.xlsx" y "CUENTAS DE COBRO REMES.xlsx")
 * Retorna de inmediato si está en caché.
 */
export async function obtenerTodasLasCedulas(forzarRefresco = false): Promise<ProveedorCedula[]> {
  const now = Date.now();
  if (!forzarRefresco && cachedProveedores.length > 0 && now - lastFetch < CACHE_TTL_MS) {
    return cachedProveedores;
  }

  const mapa = new Map<string, ProveedorCedula>();

  // 1. Consultar BD principal de Cédulas (appfundaamiga-main)
  const principales = await obtenerTrabajadoresPrincipal();
  for (const item of principales) {
    const key = normalizarTexto(item.nombre);
    if (!mapa.has(key)) {
      mapa.set(key, item);
    }
  }

  // 2. Cargar/Complementar con los Excel locales (garantiza que NUNCA se quede en blanco)
  const locales = await leerCedulasExcelLocales();
  for (const item of locales) {
    const key = normalizarTexto(item.nombre);
    if (!mapa.has(key)) {
      mapa.set(key, item);
    }
  }

  const resultado = Array.from(mapa.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  );

  cachedProveedores = resultado;
  lastFetch = now;

  return resultado;
}

/**
 * Busca una persona por coincidencia flexible de nombre en la base combinada.
 */
export async function buscarCedulaPorNombre(
  nombreBusqueda: string
): Promise<{ nombre: string; cedula: string; cargo?: string } | null> {
  if (!nombreBusqueda || !nombreBusqueda.trim()) return null;

  const todas = await obtenerTodasLasCedulas();
  const searchNorm = normalizarTexto(nombreBusqueda);
  const palabras = searchNorm.split(/\s+/).filter((p) => p.length >= 2);

  // 1. Coincidencia exacta
  const exacta = todas.find((p) => normalizarTexto(p.nombre) === searchNorm);
  if (exacta) return { nombre: exacta.nombre, cedula: exacta.cedula, cargo: exacta.cargo };

  // 2. Coincidencia donde todas las palabras de búsqueda estén en el nombre
  if (palabras.length > 1) {
    const matchTodas = todas.find((p) => {
      const pNorm = normalizarTexto(p.nombre);
      return palabras.every((w) => pNorm.includes(w));
    });
    if (matchTodas) {
      return { nombre: matchTodas.nombre, cedula: matchTodas.cedula, cargo: matchTodas.cargo };
    }
  }

  // 3. Coincidencia donde todas las palabras del nombre estén en la búsqueda
  const matchInverso = todas.find((p) => {
    const pNorm = normalizarTexto(p.nombre);
    const pWords = pNorm.split(/\s+/).filter((w) => w.length >= 2);
    return pWords.length > 0 && pWords.every((w) => searchNorm.includes(w));
  });
  if (matchInverso) {
    return { nombre: matchInverso.nombre, cedula: matchInverso.cedula, cargo: matchInverso.cargo };
  }

  // 4. Coincidencia por palabra relevante (>= 4 caracteres)
  for (const w of palabras) {
    if (w.length >= 4) {
      const matchWord = todas.find((p) => normalizarTexto(p.nombre).includes(w));
      if (matchWord) {
        return { nombre: matchWord.nombre, cedula: matchWord.cedula, cargo: matchWord.cargo };
      }
    }
  }

  return null;
}

/**
 * Invalida la memoria caché para reflejar cambios inmediatamente tras agregar/editar/eliminar.
 */
export function invalidarCacheCedulas() {
  cachedProveedores = [];
  lastFetch = 0;
}

/**
 * Agrega una persona directamente en la base de datos principal (tabla trabajadores)
 */
export async function agregarPersonaBD(nombre: string, cedula: string) {
  const nombreStr = nombre.trim();
  const cedulaStr = cedula.trim();
  const id = String(Date.now());

  const { data, error } = await supabaseCedulasPrincipal
    .from("trabajadores")
    .insert([
      {
        id,
        nombre: nombreStr,
        cedula: cedulaStr,
        valor_turno: 0,
        valor_hora_adicional: 0,
        forma_pago: "Efectivo",
        cargo: "CONTRATISTA",
      },
    ])
    .select();

  if (error) throw error;
  invalidarCacheCedulas();
  return { id, nombre: nombreStr, cedula: cedulaStr };
}

/**
 * Edita una persona directamente en la base de datos principal (tabla trabajadores)
 */
export async function editarPersonaBD(id: string, nombre: string, cedula: string) {
  const nombreStr = nombre.trim();
  const cedulaStr = cedula.trim();

  // Si el id viene de un registro de Excel (ej: excel-local-1), creamos el registro en la BD principal
  if (id.startsWith("excel-") || id.startsWith("local-") || id.startsWith("remes-")) {
    return await agregarPersonaBD(nombreStr, cedulaStr);
  }

  const { data, error } = await supabaseCedulasPrincipal
    .from("trabajadores")
    .update({ nombre: nombreStr, cedula: cedulaStr })
    .eq("id", id)
    .select();

  if (error) throw error;
  invalidarCacheCedulas();
  return { id, nombre: nombreStr, cedula: cedulaStr };
}

/**
 * Elimina una persona de la base de datos principal
 */
export async function eliminarPersonaBD(id: string) {
  // Si no es un id numérico de base de datos, solo invalidamos el caché
  if (!id.startsWith("excel-") && !id.startsWith("local-") && !id.startsWith("remes-")) {
    const { error } = await supabaseCedulasPrincipal
      .from("trabajadores")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
  invalidarCacheCedulas();
  return true;
}
