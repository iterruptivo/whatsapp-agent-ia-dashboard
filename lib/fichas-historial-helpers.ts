/**
 * Helpers para el sistema de historial de fichas (Audit Trail)
 * Funciones de formateo y mapeo - NO son Server Actions
 * Sistema de Auditoría de Fichas de Inscripción
 */

/**
 * Mapea nombres técnicos de campos a nombres legibles
 */
export function getCampoLabel(campo: string | null): string {
  if (!campo) return 'Ficha';

  const labels: Record<string, string> = {
    // Datos del titular
    titular_nombres: 'Nombres del titular',
    titular_apellido_paterno: 'Apellido paterno',
    titular_apellido_materno: 'Apellido materno',
    titular_tipo_documento: 'Tipo de documento',
    titular_numero_documento: 'Número de documento',
    titular_fecha_nacimiento: 'Fecha de nacimiento',
    titular_lugar_nacimiento: 'Lugar de nacimiento',
    titular_estado_civil: 'Estado civil',
    titular_nacionalidad: 'Nacionalidad',
    titular_direccion: 'Dirección',
    titular_distrito: 'Distrito',
    titular_provincia: 'Provincia',
    titular_departamento: 'Departamento',
    titular_referencia: 'Referencia',
    titular_celular: 'Celular',
    titular_telefono_fijo: 'Teléfono fijo',
    titular_email: 'Email',
    titular_ocupacion: 'Ocupación',
    titular_centro_trabajo: 'Centro de trabajo',
    titular_ruc: 'RUC',
    titular_genero: 'Género',
    titular_edad: 'Edad',
    titular_ingresos_salariales: 'Ingresos salariales',
    titular_nivel_estudios: 'Nivel de estudios',
    titular_tipo_trabajador: 'Tipo de trabajador',
    titular_puesto_trabajo: 'Puesto de trabajo',
    titular_cantidad_hijos: 'Cantidad de hijos',
    titular_cuenta_propiedades: 'Tiene propiedades',
    titular_cuenta_tarjeta_credito: 'Tiene tarjeta de crédito',
    titular_motivo_compra: 'Motivo de compra',

    // Datos del cónyuge
    tiene_conyuge: 'Tiene cónyuge',
    conyuge_nombres: 'Nombres del cónyuge',
    conyuge_apellido_paterno: 'Apellido paterno cónyuge',
    conyuge_apellido_materno: 'Apellido materno cónyuge',
    conyuge_tipo_documento: 'Tipo documento cónyuge',
    conyuge_numero_documento: 'Número documento cónyuge',
    conyuge_celular: 'Celular cónyuge',
    conyuge_email: 'Email cónyuge',

    // Datos financieros
    monto_separacion_usd: 'Monto separación (USD)',
    cuota_inicial_usd: 'Cuota inicial (USD)',
    inicial_restante_usd: 'Inicial restante (USD)',
    saldo_financiar_usd: 'Saldo a financiar (USD)',
    numero_cuotas: 'Número de cuotas',
    cuota_mensual_usd: 'Cuota mensual (USD)',
    tea: 'TEA (%)',
    modalidad_pago: 'Modalidad de pago',
    porcentaje_inicial: 'Porcentaje inicial',
    tipo_cambio: 'Tipo de cambio',
    entidad_bancaria: 'Entidad bancaria',
    fecha_inicio_pago: 'Fecha inicio de pago',
    fecha_separacion: 'Fecha de separación',
    compromiso_pago: 'Compromiso de pago',

    // Asignaciones
    vendedor_id: 'Vendedor/Asesor',
    local_id: 'Local asignado',
    lead_id: 'Lead vinculado',

    // Otros
    observaciones: 'Observaciones',
    rubro: 'Rubro',
    utm_source: 'Fuente UTM',
    utm_detalle: 'Detalle UTM',
    copropietarios: 'Copropietarios',

    // Estado y documentos
    estado: 'Estado de la ficha',
    contrato_url: 'Contrato',
    titular_sexo: 'Sexo del titular',
  };

  return labels[campo] || campo;
}

/**
 * Mapea orígenes técnicos a nombres legibles
 */
export function getOrigenLabel(origen: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    api: 'API',
    sistema: 'Sistema',
    importacion: 'Importación',
    mobile: 'App Móvil',
    n8n: 'n8n (Automatización)',
  };

  return labels[origen] || origen;
}

/**
 * Mapea acciones a iconos/colores
 */
export function getAccionStyle(accion: string): { icon: string; color: string; bg: string; border: string } {
  switch (accion) {
    case 'INSERT':
      return { icon: '✨', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
    case 'UPDATE':
      return { icon: '✏️', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'DELETE':
      return { icon: '🗑️', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
    case 'CAMBIO_TITULAR':
      return { icon: '👤', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' };
    case 'CAMBIO_LOCAL':
      return { icon: '🏪', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
    default:
      return { icon: '📝', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
}

/**
 * Obtiene descripción legible de la acción
 */
export function getAccionDescripcion(accion: string, campo: string | null): string {
  switch (accion) {
    case 'INSERT':
      return 'Ficha creada';
    case 'DELETE':
      return 'Ficha eliminada';
    case 'CAMBIO_TITULAR':
      return 'Cambio de titularidad';
    case 'CAMBIO_LOCAL':
      return 'Cambio de local/puesto';
    case 'UPDATE':
      return getCampoLabel(campo);
    default:
      return campo ? getCampoLabel(campo) : 'Modificación';
  }
}

/**
 * Formatea valores especiales para mostrar
 */
export function formatValor(campo: string | null, valor: string | null): string {
  if (valor === null || valor === '' || valor === 'null' || valor === 'undefined') return '(vacío)';

  // Formatear booleanos
  if (campo === 'tiene_conyuge' || campo === 'titular_cuenta_propiedades' || campo === 'titular_cuenta_tarjeta_credito') {
    return valor === 'true' ? 'Sí' : 'No';
  }

  // Formatear montos USD
  if (campo?.includes('_usd')) {
    const num = parseFloat(valor);
    if (!isNaN(num)) {
      return `$ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  // Formatear tipo de cambio
  if (campo === 'tipo_cambio') {
    const num = parseFloat(valor);
    if (!isNaN(num)) {
      return `S/ ${num.toFixed(3)}`;
    }
  }

  // Formatear porcentajes
  if (campo === 'tea' || campo === 'porcentaje_inicial') {
    const num = parseFloat(valor);
    if (!isNaN(num)) {
      return `${num.toFixed(2)}%`;
    }
  }

  // Formatear número de cuotas
  if (campo === 'numero_cuotas') {
    return `${valor} cuotas`;
  }

  // Formatear modalidad de pago
  if (campo === 'modalidad_pago') {
    const modalidades: Record<string, string> = {
      contado: 'Contado',
      financiado: 'Financiado',
      credito_directo: 'Crédito Directo',
    };
    return modalidades[valor] || valor;
  }

  // Formatear estado civil
  if (campo === 'titular_estado_civil') {
    const estados: Record<string, string> = {
      soltero: 'Soltero(a)',
      casado: 'Casado(a)',
      divorciado: 'Divorciado(a)',
      viudo: 'Viudo(a)',
      conviviente: 'Conviviente',
    };
    return estados[valor] || valor;
  }

  // Formatear tipo documento
  if (campo === 'titular_tipo_documento' || campo === 'conyuge_tipo_documento') {
    const tipos: Record<string, string> = {
      dni: 'DNI',
      ce: 'Carné de Extranjería',
      pasaporte: 'Pasaporte',
      ruc: 'RUC',
    };
    return tipos[valor] || valor;
  }

  // Formatear género
  if (campo === 'titular_genero' || campo === 'conyuge_genero' || campo === 'titular_sexo') {
    const generos: Record<string, string> = {
      masculino: 'Masculino',
      femenino: 'Femenino',
      Masculino: 'Masculino',
      Femenino: 'Femenino',
      M: 'Masculino',
      F: 'Femenino',
    };
    return generos[valor] || valor;
  }

  // Formatear estado de ficha
  if (campo === 'estado') {
    const estados: Record<string, string> = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      procesado: 'Procesado',
      cancelado: 'Cancelado',
    };
    return estados[valor] || valor;
  }

  return valor;
}

/**
 * Formatea un snapshot de titular para mostrar
 */
export function formatTitularSnapshot(titular: Record<string, any> | null): string {
  if (!titular) return '(sin datos)';

  const partes: string[] = [];

  if (titular.nombres) {
    const nombreCompleto = [
      titular.nombres,
      titular.apellido_paterno,
      titular.apellido_materno,
    ].filter(Boolean).join(' ');
    partes.push(nombreCompleto);
  }

  if (titular.numero_documento) {
    const tipoDoc = titular.tipo_documento?.toUpperCase() || 'DOC';
    partes.push(`${tipoDoc}: ${titular.numero_documento}`);
  }

  if (titular.celular) {
    partes.push(`Tel: ${titular.celular}`);
  }

  return partes.join(' | ') || '(sin datos)';
}
