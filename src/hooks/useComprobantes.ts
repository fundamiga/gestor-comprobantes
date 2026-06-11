"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Periodo, Lote, ArchivoSubido } from "@/types";
import { uid } from "@/lib/utils";

export function useComprobantes() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargado, setCargado] = useState(false);

  // ── Cargar períodos al montar ──────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("periodos")
        .select("*")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false });

      if (!error && data) {
        // Supabase devuelve lotes como JSONB, puede venir como string o arreglo
        const parsed: Periodo[] = data.map((row) => ({
          ...row,
          lotes: Array.isArray(row.lotes) ? row.lotes : JSON.parse(row.lotes || "[]"),
        }));
        setPeriodos(parsed);
      }
      setCargado(true);
    }
    cargar();
  }, []);

  // ── Sincronización con Debounce ───────────────────
  useEffect(() => {
    if (!cargado || periodos.length === 0) return;

    const timeout = setTimeout(async () => {
      const promesas = periodos.map(p => 
        supabase.from("periodos").upsert({
          id: p.id,
          mes: p.mes,
          anio: p.anio,
          lotes: p.lotes 
        })
      );
      await Promise.all(promesas);
      console.log("Base de datos sincronizada");
    }, 1500); 

    return () => clearTimeout(timeout);
  }, [periodos, cargado]);

  // ── Períodos ──────────────────────────────────────────────────────────────
  const crearPeriodo = useCallback(
    async (mes: number, anio: number): Promise<Periodo> => {
      const existente = periodos.find((p) => p.mes === mes && p.anio === anio);
      if (existente) return existente;

      const nuevo: Periodo = { id: uid(), mes, anio, lotes: [] };
      setPeriodos((prev) =>
        [...prev, nuevo].sort((a, b) => b.anio - a.anio || b.mes - a.mes)
      );
      return nuevo;
    },
    [periodos]
  );

  const eliminarPeriodo = useCallback(
    async (periodoId: string) => {
      await supabase.from("periodos").delete().eq("id", periodoId);
      setPeriodos((prev) => prev.filter((p) => p.id !== periodoId));
    },
    []
  );

  // ── Lotes ─────────────────────────────────────────────────────────────────
  const crearLote = useCallback(
    async (
      periodoId: string,
      datos: Pick<Lote, "proveedor" | "referencia" | "tipoPago">
    ) => {
      const nuevo: Lote = {
        id: uid(),
        ...datos,
        fechaCreacion: new Date().toLocaleDateString("es-CO"),
        documentos: {},
      };

      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          return { ...p, lotes: [...p.lotes, nuevo] };
        });
        return next;
      });

      return nuevo;
    },
    []
  );

  const eliminarLote = useCallback(
    async (periodoId: string, loteId: string) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          return { ...p, lotes: p.lotes.filter((l) => l.id !== loteId) };
        });
        return next;
      });
    },
    []
  );

  const actualizarLote = useCallback(
    async (periodoId: string, loteId: string, datos: Partial<Lote>) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          return {
            ...p,
            lotes: p.lotes.map((l) => (l.id === loteId ? { ...l, ...datos } : l)),
          };
        });
        return next;
      });
    },
    []
  );

  // ── Archivos ──────────────────────────────────────────────────────────────
  const agregarArchivo = useCallback(
    async (periodoId: string, loteId: string, tipoId: string, archivo: ArchivoSubido) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const lotes = p.lotes.map((l) => {
            if (l.id !== loteId) return l;
            const prevArchivos = l.documentos[tipoId] ?? [];
            return {
              ...l,
              documentos: { ...l.documentos, [tipoId]: [...prevArchivos, archivo] },
            };
          });
          return { ...p, lotes };
        });
        return next;
      });
    },
    []
  );

  const eliminarArchivo = useCallback(
    async (periodoId: string, loteId: string, tipoId: string, archivoId: string) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const lotes = p.lotes.map((l) => {
            if (l.id !== loteId) return l;
            return {
              ...l,
              documentos: {
                ...l.documentos,
                [tipoId]: (l.documentos[tipoId] ?? []).filter((a) => a.id !== archivoId),
              },
            };
          });
          return { ...p, lotes };
        });
        return next;
      });
    },
    []
  );

  const actualizarArchivosDoc = useCallback(
    async (periodoId: string, loteId: string, tipoId: string, nuevosArchivos: ArchivoSubido[]) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const lotes = p.lotes.map((l) => {
            if (l.id !== loteId) return l;
            return {
              ...l,
              documentos: {
                ...l.documentos,
                [tipoId]: nuevosArchivos,
              },
            };
          });
          return { ...p, lotes };
        });
        return next;
      });
    },
    []
  );

  return {
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
  };
}
