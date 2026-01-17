-- ============================================================================
-- MIGRACIÓN 013: MÓDULO DE EXPANSIÓN - CORREDORES Y TERRENOS
-- Fecha: 2026-01-16
-- Descripción: Sistema para registro de corredores inmobiliarios y
--              recepción de propuestas de terrenos
-- ============================================================================

-- ============================================================================
-- TABLA 1: CORREDORES_REGISTRO
-- Registro de corredores inmobiliarios externos
-- ============================================================================
CREATE TABLE IF NOT EXISTS corredores_registro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos personales
    dni VARCHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE,

    -- Contacto
    email VARCHAR(255) NOT NULL UNIQUE,
    telefono VARCHAR(15) NOT NULL,
    telefono_secundario VARCHAR(15),

    -- Dirección
    departamento VARCHAR(50),
    provincia VARCHAR(50),
    distrito VARCHAR(50),
    direccion TEXT,

    -- Profesional
    empresa_inmobiliaria VARCHAR(200),
    años_experiencia INTEGER DEFAULT 0,
    especialidad VARCHAR(100), -- residencial, comercial, industrial, terrenos
    licencia_numero VARCHAR(50),

    -- Documentos (URLs en Supabase Storage)
    dni_frontal_url TEXT,
    dni_reverso_url TEXT,
    foto_perfil_url TEXT,
    cv_url TEXT,

    -- Estado y verificación
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'verificando', 'aprobado', 'rechazado', 'suspendido')),
    verificado_por UUID REFERENCES usuarios(id),
    fecha_verificacion TIMESTAMPTZ,
    motivo_rechazo TEXT,

    -- Acceso al portal
    password_hash TEXT,
    ultimo_acceso TIMESTAMPTZ,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,

    -- Tokens
    token_verificacion VARCHAR(100),
    token_recuperacion VARCHAR(100),
    token_expiracion TIMESTAMPTZ,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Términos
    acepto_terminos BOOLEAN DEFAULT FALSE,
    fecha_acepto_terminos TIMESTAMPTZ
);

-- Índices para corredores
CREATE INDEX IF NOT EXISTS idx_corredores_dni ON corredores_registro(dni);
CREATE INDEX IF NOT EXISTS idx_corredores_email ON corredores_registro(email);
CREATE INDEX IF NOT EXISTS idx_corredores_estado ON corredores_registro(estado);
CREATE INDEX IF NOT EXISTS idx_corredores_departamento ON corredores_registro(departamento);

-- ============================================================================
-- TABLA 2: TERRENOS_EXPANSION
-- Propuestas de terrenos enviadas por corredores
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrenos_expansion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relación con corredor
    corredor_id UUID NOT NULL REFERENCES corredores_registro(id) ON DELETE RESTRICT,

    -- Código único de referencia
    codigo VARCHAR(20) NOT NULL UNIQUE, -- TE-2026-00001

    -- ============================================
    -- PASO 1: UBICACIÓN
    -- ============================================
    departamento VARCHAR(50) NOT NULL,
    provincia VARCHAR(50) NOT NULL,
    distrito VARCHAR(50) NOT NULL,
    direccion TEXT NOT NULL,
    referencia TEXT,
    coordenadas_lat DECIMAL(10, 8),
    coordenadas_lng DECIMAL(11, 8),

    -- ============================================
    -- PASO 2: CARACTERÍSTICAS DEL TERRENO
    -- ============================================
    area_total_m2 DECIMAL(12, 2) NOT NULL,
    area_construida_m2 DECIMAL(12, 2) DEFAULT 0,
    frente_ml DECIMAL(8, 2), -- metros lineales de frente
    fondo_ml DECIMAL(8, 2),

    tipo_terreno VARCHAR(50) NOT NULL CHECK (tipo_terreno IN (
        'urbano', 'rural', 'eriaza', 'agricola', 'industrial'
    )),

    zonificacion VARCHAR(50), -- RDM, RDA, CZ, I1, etc.
    uso_actual VARCHAR(100),

    -- Servicios
    tiene_agua BOOLEAN DEFAULT FALSE,
    tiene_luz BOOLEAN DEFAULT FALSE,
    tiene_desague BOOLEAN DEFAULT FALSE,
    tiene_internet BOOLEAN DEFAULT FALSE,
    acceso_pavimentado BOOLEAN DEFAULT FALSE,

    -- ============================================
    -- PASO 3: DOCUMENTACIÓN Y LEGAL
    -- ============================================
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
    propietario_es_corredor BOOLEAN DEFAULT FALSE, -- Si el corredor es el propietario

    -- ============================================
    -- PASO 4: VALORIZACIÓN
    -- ============================================
    precio_solicitado DECIMAL(15, 2),
    moneda VARCHAR(3) DEFAULT 'USD' CHECK (moneda IN ('USD', 'PEN')),
    precio_negociable BOOLEAN DEFAULT TRUE,

    tasacion_referencial DECIMAL(15, 2),
    fuente_tasacion VARCHAR(100),

    urgencia_venta VARCHAR(20) CHECK (urgencia_venta IN (
        'inmediata', 'corto_plazo', 'mediano_plazo', 'sin_apuro'
    )),

    -- ============================================
    -- PASO 5: MULTIMEDIA
    -- ============================================
    fotos_urls JSONB DEFAULT '[]'::jsonb, -- Array de URLs
    videos_urls JSONB DEFAULT '[]'::jsonb,
    planos_urls JSONB DEFAULT '[]'::jsonb,
    documentos_urls JSONB DEFAULT '[]'::jsonb,

    -- ============================================
    -- EVALUACIÓN INTERNA (EcoPlaza)
    -- ============================================
    estado VARCHAR(30) DEFAULT 'borrador' CHECK (estado IN (
        'borrador',      -- Corredor aún editando
        'enviado',       -- Enviado para revisión
        'en_revision',   -- EcoPlaza revisando
        'info_adicional', -- Se requiere más información
        'evaluacion',    -- En evaluación técnica
        'visita_programada', -- Visita agendada
        'visitado',      -- Ya visitado
        'negociacion',   -- En negociación
        'aprobado',      -- Aprobado para compra
        'rechazado',     -- No cumple criterios
        'archivado'      -- Archivado sin acción
    )),

    prioridad VARCHAR(10) DEFAULT 'normal' CHECK (prioridad IN (
        'baja', 'normal', 'alta', 'urgente'
    )),

    -- Asignación interna
    asignado_a UUID REFERENCES usuarios(id),
    fecha_asignacion TIMESTAMPTZ,

    -- Evaluación
    puntaje_evaluacion INTEGER CHECK (puntaje_evaluacion BETWEEN 0 AND 100),
    evaluacion_notas TEXT,

    -- Visita
    fecha_visita_programada TIMESTAMPTZ,
    fecha_visita_realizada TIMESTAMPTZ,
    resultado_visita TEXT,

    -- Decisión final
    decision_final VARCHAR(20) CHECK (decision_final IN (
        'comprar', 'descartar', 'pendiente', 'negociar'
    )),
    motivo_decision TEXT,
    decidido_por UUID REFERENCES usuarios(id),
    fecha_decision TIMESTAMPTZ,

    -- Oferta
    oferta_monto DECIMAL(15, 2),
    oferta_fecha TIMESTAMPTZ,
    oferta_aceptada BOOLEAN,

    -- ============================================
    -- COMISIÓN DEL CORREDOR
    -- ============================================
    comision_porcentaje DECIMAL(5, 2) DEFAULT 2.00,
    comision_monto DECIMAL(15, 2),
    comision_pagada BOOLEAN DEFAULT FALSE,
    fecha_pago_comision TIMESTAMPTZ,

    -- ============================================
    -- METADATA
    -- ============================================
    notas_internas TEXT,
    etiquetas JSONB DEFAULT '[]'::jsonb, -- ["urgente", "zona-norte", etc]

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    enviado_at TIMESTAMPTZ,

    -- Proyecto relacionado (si aplica)
    proyecto_id UUID REFERENCES proyectos(id)
);

-- Índices para terrenos
CREATE INDEX IF NOT EXISTS idx_terrenos_corredor ON terrenos_expansion(corredor_id);
CREATE INDEX IF NOT EXISTS idx_terrenos_codigo ON terrenos_expansion(codigo);
CREATE INDEX IF NOT EXISTS idx_terrenos_estado ON terrenos_expansion(estado);
CREATE INDEX IF NOT EXISTS idx_terrenos_departamento ON terrenos_expansion(departamento);
CREATE INDEX IF NOT EXISTS idx_terrenos_asignado ON terrenos_expansion(asignado_a);
CREATE INDEX IF NOT EXISTS idx_terrenos_prioridad ON terrenos_expansion(prioridad);
CREATE INDEX IF NOT EXISTS idx_terrenos_created ON terrenos_expansion(created_at DESC);

-- ============================================================================
-- TABLA 3: TERRENOS_HISTORIAL
-- Historial de cambios y acciones sobre terrenos
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrenos_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terreno_id UUID NOT NULL REFERENCES terrenos_expansion(id) ON DELETE CASCADE,

    -- Quién hizo el cambio
    usuario_id UUID REFERENCES usuarios(id), -- NULL si es el corredor
    corredor_id UUID REFERENCES corredores_registro(id),

    -- Qué cambió
    accion VARCHAR(50) NOT NULL, -- creado, editado, enviado, asignado, estado_cambio, comentario, etc.
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),

    -- Detalles
    descripcion TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,

    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_terreno ON terrenos_historial(terreno_id);
CREATE INDEX IF NOT EXISTS idx_historial_created ON terrenos_historial(created_at DESC);

-- ============================================================================
-- TABLA 4: TERRENOS_COMENTARIOS
-- Comunicación entre corredor y EcoPlaza
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrenos_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terreno_id UUID NOT NULL REFERENCES terrenos_expansion(id) ON DELETE CASCADE,

    -- Autor (uno u otro, no ambos)
    usuario_id UUID REFERENCES usuarios(id),
    corredor_id UUID REFERENCES corredores_registro(id),

    -- Contenido
    mensaje TEXT NOT NULL,
    archivos_urls JSONB DEFAULT '[]'::jsonb,

    -- Visibilidad
    es_interno BOOLEAN DEFAULT FALSE, -- Si TRUE, solo visible para EcoPlaza

    -- Leído
    leido BOOLEAN DEFAULT FALSE,
    fecha_leido TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_autor CHECK (
        (usuario_id IS NOT NULL AND corredor_id IS NULL) OR
        (usuario_id IS NULL AND corredor_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_comentarios_terreno ON terrenos_comentarios(terreno_id);

-- ============================================================================
-- TABLA 5: DEPARTAMENTOS_PERU
-- Catálogo de ubicaciones (para dropdowns cascada)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ubigeo_peru (
    id VARCHAR(6) PRIMARY KEY, -- Código UBIGEO
    departamento VARCHAR(50) NOT NULL,
    provincia VARCHAR(50),
    distrito VARCHAR(50),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('departamento', 'provincia', 'distrito'))
);

-- Insertar departamentos principales
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
CREATE OR REPLACE FUNCTION update_updated_at_expansion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_updated_corredores ON corredores_registro;
CREATE TRIGGER trigger_updated_corredores
    BEFORE UPDATE ON corredores_registro
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_expansion();

DROP TRIGGER IF EXISTS trigger_updated_terrenos ON terrenos_expansion;
CREATE TRIGGER trigger_updated_terrenos
    BEFORE UPDATE ON terrenos_expansion
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_expansion();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Habilitar RLS
ALTER TABLE corredores_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrenos_expansion ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrenos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrenos_comentarios ENABLE ROW LEVEL SECURITY;

-- Policy para corredores_registro (acceso admin)
CREATE POLICY "corredores_admin_all" ON corredores_registro
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia')
        )
    );

-- Policy para terrenos_expansion (acceso admin)
CREATE POLICY "terrenos_admin_all" ON terrenos_expansion
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia')
        )
    );

-- Policy para terrenos_historial (acceso admin)
CREATE POLICY "historial_admin_read" ON terrenos_historial
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia')
        )
    );

-- Policy para terrenos_comentarios (acceso admin)
CREATE POLICY "comentarios_admin_all" ON terrenos_comentarios
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.rol IN ('superadmin', 'admin', 'gerencia')
        )
    );

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Nota: Los buckets se crean desde el dashboard de Supabase o con la API

-- Buckets necesarios:
-- 1. corredores-documentos (DNI, CV, etc.)
-- 2. terrenos-fotos
-- 3. terrenos-documentos (planos, fichas registrales, etc.)

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE corredores_registro IS 'Registro de corredores inmobiliarios externos';
COMMENT ON TABLE terrenos_expansion IS 'Propuestas de terrenos para expansión';
COMMENT ON TABLE terrenos_historial IS 'Historial de cambios en terrenos';
COMMENT ON TABLE terrenos_comentarios IS 'Comunicación corredor-EcoPlaza';
COMMENT ON TABLE ubigeo_peru IS 'Catálogo de ubicaciones geográficas del Perú';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
