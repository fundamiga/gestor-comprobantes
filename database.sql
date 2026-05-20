-- Eliminar tablas si existen para empezar limpio
DROP TABLE IF EXISTS archivos_contenido;
DROP TABLE IF EXISTS periodos;

-- Crear tabla principal de periodos (guardará toda la estructura JSON)
CREATE TABLE periodos (
  id TEXT PRIMARY KEY,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  lotes JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Habilitar permisos públicos para leer y escribir (solo desarrollo)
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access" 
ON periodos 
FOR ALL 
USING (true)
WITH CHECK (true);
