-- ============================================================================
-- MIGRACIÓN 014: TERRENOS EXPANSION
-- Fecha: 2026-01-17
-- Descripción: Tablas para propuestas de terrenos por corredores
-- Prerrequisito: corredores_registro ya existe
-- ============================================================================

-- ============================================================================
-- TABLA 1: TERRENOS_EXPANSION
-- Propuestas de terrenos enviadas por corredores
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrenos_expansion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relación con corredor (usa la tabla existente)
    corredor_id UUID NOT NULL REFERENCES corredores_registro(id) ON DELETE RESTRICT,

    -- Código único de referencia
    codigo VARCHAR(20) UNIQUE,

    -- UBICACIÓN
    departamento VARCHAR(50) NOT NULL,
    provincia VARCHAR(50) NOT NULL,
    distrito VARCHAR(50) NOT NULL,
    direccion TEXT NOT NULL,
    referencia TEXT,
    coordenadas_lat DECIMAL(10, 8),
    coordenadas_lng DECIMAL(11, 8),

    -- CARACTERÍSTICAS DEL TERRENO
    area_total_m2 DECIMAL(12, 2) NOT NULL,
    area_construida_m2 DECIMAL(12, 2) DEFAULT 0,
    frente_ml DECIMAL(8, 2),
    fondo_ml DECIMAL(8, 2),

    tipo_terreno VARCHAR(50) NOT NULL DEFAULT 'urbano' CHECK (tipo_terreno IN (
        'urbano', 'rural', 'eriaza', 'agricola', 'industrial'
    )),

    zonificacion VARCHAR(50),
    uso_actual VARCHAR(100),

    -- Servicios
    tiene_agua BOOLEAN DEFAULT FALSE,
    tiene_luz BOOLEAN DEFAULT FALSE,
    tiene_desague BOOLEAN DEFAULT FALSE,
    tiene_internet BOOLEAN DEFAULT FALSE,
    acceso_pavimentado BOOLEAN DEFAULT FALSE,

    -- DOCUMENTACIÓN Y LEGAL
    tipo_propiedad VARCHAR(50) CHECK (tipo_propiedad IN (
        'inscrito', 'posesion', 'herencia', 'comunidad', 'otro'
    )),

    partida_registral VARCHAR(50),
    ficha_registral_url TEXT,

    tiene_cargas BOOLEAN DEFAULT FALSE,
    descripcion_cargas TEXT,

    propietario_nombre VARCHAR(200),
    propietario_dni VARCHAR(20),
    propietario_telefono VARCHAR(15),
    propietario_es_corredor BOOLEAN DEFAULT FALSE,

    -- VALORIZACIÓN
    precio_solicitado DECIMAL(15, 2),
    moneda VARCHAR(3) DEFAULT 'USD' CHECK (moneda IN ('USD', 'PEN')),
    precio_negociable BOOLEAN DEFAULT TRUE,

    tasacion_referencial DECIMAL(15, 2),
    fuente_tasacion VARCHAR(100),

    urgencia_venta VARCHAR(20) CHECK (urgencia_venta IN (
        'inmediata', 'corto_plazo', 'mediano_plazo', 'sin_apuro'
    )),

    -- MULTIMEDIA
    fotos_urls JSONB DEFAULT '[]'::jsonb,
    videos_urls JSONB DEFAULT '[]'::jsonb,
    planos_urls JSONB DEFAULT '[]'::jsonb,
    documentos_urls JSONB DEFAULT '[]'::jsonb,

    -- EVALUACIÓN INTERNA
    estado VARCHAR(30) DEFAULT 'borrador' CHECK (estado IN (
        'borrador', 'enviado', 'en_revision', 'info_adicional', 'evaluacion',
        'visita_programada', 'visitado', 'negociacion', 'aprobado', 'rechazado', 'archivado'
    )),

    prioridad VARCHAR(10) DEFAULT 'normal' CHECK (prioridad IN (
        'baja', 'normal', 'alta', 'urgente'
    )),

    asignado_a UUID REFERENCES usuarios(id),
    fecha_asignacion TIMESTAMPTZ,

    puntaje_evaluacion INTEGER CHECK (puntaje_evaluacion BETWEEN 0 AND 100),
    evaluacion_notas TEXT,

    fecha_visita_programada TIMESTAMPTZ,
    fecha_visita_realizada TIMESTAMPTZ,
    resultado_visita TEXT,

    decision_final VARCHAR(20) CHECK (decision_final IN (
        'comprar', 'descartar', 'pendiente', 'negociar'
    )),
    motivo_decision TEXT,
    decidido_por UUID REFERENCES usuarios(id),
    fecha_decision TIMESTAMPTZ,

    oferta_monto DECIMAL(15, 2),
    oferta_fecha TIMESTAMPTZ,
    oferta_aceptada BOOLEAN,

    -- COMISIÓN
    comision_porcentaje DECIMAL(5, 2) DEFAULT 2.00,
    comision_monto DECIMAL(15, 2),
    comision_pagada BOOLEAN DEFAULT FALSE,
    fecha_pago_comision TIMESTAMPTZ,

    -- METADATA
    notas_internas TEXT,
    etiquetas JSONB DEFAULT '[]'::jsonb,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    enviado_at TIMESTAMPTZ,

    proyecto_id UUID REFERENCES proyectos(id)
);

-- ============================================================================
-- TABLA 2: TERRENOS_HISTORIAL
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrenos_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terreno_id UUID NOT NULL REFERENCES terrenos_expansion(id) ON DELETE CASCADE,

    usuario_id UUID REFERENCES usuarios(id),
    corredor_id UUID REFERENCES corredores_registro(id),

    accion VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),

    descripcion TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,

    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA 3: TERRENOS_COMENTARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrenos_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terreno_id UUID NOT NULL REFERENCES terrenos_expansion(id) ON DELETE CASCADE,

    usuario_id UUID REFERENCES usuarios(id),
    corredor_id UUID REFERENCES corredores_registro(id),

    mensaje TEXT NOT NULL,
    archivos_urls JSONB DEFAULT '[]'::jsonb,

    es_interno BOOLEAN DEFAULT FALSE,

    leido BOOLEAN DEFAULT FALSE,
    fecha_leido TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_autor CHECK (
        (usuario_id IS NOT NULL AND corredor_id IS NULL) OR
        (usuario_id IS NULL AND corredor_id IS NOT NULL)
    )
);

-- ============================================================================
-- TABLA 4: UBIGEO_PERU
-- ============================================================================
CREATE TABLE IF NOT EXISTS ubigeo_peru (
    id VARCHAR(6) PRIMARY KEY,
    departamento VARCHAR(50) NOT NULL,
    provincia VARCHAR(50),
    distrito VARCHAR(50),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('departamento', 'provincia', 'distrito'))
);

-- Insertar departamentos
INSERT INTO ubigeo_peru (id, departamento, provincia, distrito, tipo) VALUES
('01', 'AMAZONAS', NULL, NULL, 'departamento'),
('02', 'ANCASH', NULL, NULL, 'departamento'),
('03', 'APURIMAC', NULL, NULL, 'departamento'),
('04', 'AREQUIPA', NULL, NULL, 'departamento'),
('05', 'AYACUCHO', NULL, NULL, 'departamento'),
('06', 'CAJAMARCA', NULL, NULL, 'departamento'),
('07', 'CALLAO', NULL, NULL, 'departamento'),
('08', 'CUSCO', NULL, NULL, 'departamento'),
('09', 'HUANCAVELICA', NULL, NULL, 'departamento'),
('10', 'HUANUCO', NULL, NULL, 'departamento'),
('11', 'ICA', NULL, NULL, 'departamento'),
('12', 'JUNIN', NULL, NULL, 'departamento'),
('13', 'LA LIBERTAD', NULL, NULL, 'departamento'),
('14', 'LAMBAYEQUE', NULL, NULL, 'departamento'),
('15', 'LIMA', NULL, NULL, 'departamento'),
('16', 'LORETO', NULL, NULL, 'departamento'),
('17', 'MADRE DE DIOS', NULL, NULL, 'departamento'),
('18', 'MOQUEGUA', NULL, NULL, 'departamento'),
('19', 'PASCO', NULL, NULL, 'departamento'),
('20', 'PIURA', NULL, NULL, 'departamento'),
('21', 'PUNO', NULL, NULL, 'departamento'),
('22', 'SAN MARTIN', NULL, NULL, 'departamento'),
('23', 'TACNA', NULL, NULL, 'departamento'),
('24', 'TUMBES', NULL, NULL, 'departamento'),
('25', 'UCAYALI', NULL, NULL, 'departamento')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_terrenos_corredor ON terrenos_expansion(corredor_id);
CREATE INDEX IF NOT EXISTS idx_terrenos_codigo ON terrenos_expansion(codigo);
CREATE INDEX IF NOT EXISTS idx_terrenos_estado ON terrenos_expansion(estado);
CREATE INDEX IF NOT EXISTS idx_terrenos_departamento ON terrenos_expansion(departamento);
CREATE INDEX IF NOT EXISTS idx_terrenos_asignado ON terrenos_expansion(asignado_a);
CREATE INDEX IF NOT EXISTS idx_terrenos_prioridad ON terrenos_expansion(prioridad);
CREATE INDEX IF NOT EXISTS idx_terrenos_created ON terrenos_expansion(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historial_terreno ON terrenos_historial(terreno_id);
CREATE INDEX IF NOT EXISTS idx_historial_created ON terrenos_historial(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comentarios_terreno ON terrenos_comentarios(terreno_id);

-- ============================================================================
-- FUNCIÓN: Generar código de terreno
-- ============================================================================
CREATE OR REPLACE FUNCTION generar_codigo_terreno()
RETURNS TRIGGER AS $$
DECLARE
    año_actual VARCHAR(4);
    ultimo_numero INTEGER;
    nuevo_codigo VARCHAR(20);
BEGIN
    año_actual := EXTRACT(YEAR FROM NOW())::VARCHAR;

    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 9 FOR 5) AS INTEGER)), 0)
    INTO ultimo_numero
    FROM terrenos_expansion
    WHERE codigo LIKE 'TE-' || año_actual || '-%';

    nuevo_codigo := 'TE-' || año_actual || '-' || LPAD((ultimo_numero + 1)::VARCHAR, 5, '0');

    NEW.codigo := nuevo_codigo;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para código automático
DROP TRIGGER IF EXISTS trigger_codigo_terreno ON terrenos_expansion;
CREATE TRIGGER trigger_codigo_terreno
    BEFORE INSERT ON terrenos_expansion
    FOR EACH ROW
    WHEN (NEW.codigo IS NULL)
    EXECUTE FUNCTION generar_codigo_terreno();

-- ============================================================================
-- FUNCIÓN: Actualizar updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_terrenos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_updated_terrenos ON terrenos_expansion;
CREATE TRIGGER trigger_updated_terrenos
    BEFORE UPDATE ON terrenos_expansion
    FOR EACH ROW
    EXECUTE FUNCTION update_terrenos_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE terrenos_expansion ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrenos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrenos_comentarios ENABLE ROW LEVEL SECURITY;

-- Terrenos: Admin full access
CREATE POLICY "terrenos_admin_all" ON terrenos_expansion
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia', 'legal')
        )
    );

-- Terrenos: Corredor puede ver/editar sus propios terrenos
CREATE POLICY "terrenos_corredor_own" ON terrenos_expansion
    FOR ALL
    TO authenticated
    USING (
        corredor_id IN (
            SELECT cr.id FROM corredores_registro cr
            WHERE cr.usuario_id = auth.uid()
        )
    );

-- Historial: Admin puede leer todo
CREATE POLICY "historial_admin_read" ON terrenos_historial
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia', 'legal')
        )
    );

-- Historial: Corredor puede ver historial de sus terrenos
CREATE POLICY "historial_corredor_read" ON terrenos_historial
    FOR SELECT
    TO authenticated
    USING (
        terreno_id IN (
            SELECT te.id FROM terrenos_expansion te
            JOIN corredores_registro cr ON te.corredor_id = cr.id
            WHERE cr.usuario_id = auth.uid()
        )
    );

-- Historial: Admin puede insertar
CREATE POLICY "historial_admin_insert" ON terrenos_historial
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia', 'legal')
        )
    );

-- Historial: Corredor puede insertar en sus terrenos
CREATE POLICY "historial_corredor_insert" ON terrenos_historial
    FOR INSERT
    TO authenticated
    WITH CHECK (
        terreno_id IN (
            SELECT te.id FROM terrenos_expansion te
            JOIN corredores_registro cr ON te.corredor_id = cr.id
            WHERE cr.usuario_id = auth.uid()
        )
    );

-- Comentarios: Admin full access
CREATE POLICY "comentarios_admin_all" ON terrenos_comentarios
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia', 'legal')
        )
    );

-- Comentarios: Corredor puede ver/crear en sus terrenos (no internos)
CREATE POLICY "comentarios_corredor_read" ON terrenos_comentarios
    FOR SELECT
    TO authenticated
    USING (
        es_interno = FALSE AND
        terreno_id IN (
            SELECT te.id FROM terrenos_expansion te
            JOIN corredores_registro cr ON te.corredor_id = cr.id
            WHERE cr.usuario_id = auth.uid()
        )
    );

CREATE POLICY "comentarios_corredor_insert" ON terrenos_comentarios
    FOR INSERT
    TO authenticated
    WITH CHECK (
        es_interno = FALSE AND
        terreno_id IN (
            SELECT te.id FROM terrenos_expansion te
            JOIN corredores_registro cr ON te.corredor_id = cr.id
            WHERE cr.usuario_id = auth.uid()
        )
    );

-- Ubigeo: Lectura pública
ALTER TABLE ubigeo_peru ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ubigeo_read_all" ON ubigeo_peru
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- FIN
-- ============================================================================
