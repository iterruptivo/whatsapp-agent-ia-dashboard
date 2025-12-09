// Función para convertir números a letras en español
// Ejemplo: 15000 → "QUINCE MIL Y 00/100 DÓLARES AMERICANOS"

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let resultado = '';

  // Centenas
  const centenas = Math.floor(n / 100);
  if (centenas > 0) {
    resultado += CENTENAS[centenas] + ' ';
  }

  const resto = n % 100;

  // Casos especiales 10-19
  if (resto >= 10 && resto < 20) {
    resultado += ESPECIALES[resto - 10];
    return resultado.trim();
  }

  // Decenas
  const decenas = Math.floor(resto / 10);
  const unidades = resto % 10;

  if (decenas > 0) {
    if (decenas === 2 && unidades > 0) {
      resultado += 'VEINTI' + UNIDADES[unidades];
      return resultado.trim();
    } else {
      resultado += DECENAS[decenas];
      if (unidades > 0) {
        resultado += ' Y ' + UNIDADES[unidades];
      }
    }
  } else if (unidades > 0) {
    resultado += UNIDADES[unidades];
  }

  return resultado.trim();
}

export function numeroALetras(numero: number, moneda: 'USD' | 'PEN' = 'USD'): string {
  if (numero === 0) return 'CERO ' + (moneda === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES');

  const parteEntera = Math.floor(numero);
  const centavos = Math.round((numero - parteEntera) * 100);

  let resultado = '';

  // Millones
  const millones = Math.floor(parteEntera / 1000000);
  if (millones > 0) {
    if (millones === 1) {
      resultado += 'UN MILLÓN ';
    } else {
      resultado += convertirGrupo(millones) + ' MILLONES ';
    }
  }

  // Miles
  const miles = Math.floor((parteEntera % 1000000) / 1000);
  if (miles > 0) {
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += convertirGrupo(miles) + ' MIL ';
    }
  }

  // Unidades (0-999)
  const unidades = parteEntera % 1000;
  if (unidades > 0) {
    resultado += convertirGrupo(unidades) + ' ';
  }

  // Agregar centavos y moneda
  const centavosStr = centavos.toString().padStart(2, '0');

  if (moneda === 'USD') {
    resultado += `Y ${centavosStr}/100 DÓLARES AMERICANOS`;
  } else {
    resultado += `Y ${centavosStr}/100 SOLES`;
  }

  return resultado.trim();
}

// Función para convertir fecha a texto
// Ejemplo: "2025-12-08" → "ocho de diciembre del dos mil veinticinco"
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const UNIDADES_LOWER = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DECENAS_LOWER = ['', 'diez', 'veinte', 'treinta'];
const ESPECIALES_LOWER = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];

function diaALetras(dia: number): string {
  if (dia >= 10 && dia < 20) {
    return ESPECIALES_LOWER[dia - 10];
  }
  if (dia >= 20 && dia < 30) {
    if (dia === 20) return 'veinte';
    return 'veinti' + UNIDADES_LOWER[dia - 20];
  }
  if (dia === 30) return 'treinta';
  if (dia === 31) return 'treinta y uno';
  return UNIDADES_LOWER[dia];
}

function anioALetras(anio: number): string {
  // Solo para años 2000-2099
  const resto = anio - 2000;
  if (resto === 0) return 'dos mil';

  if (resto >= 10 && resto < 20) {
    return 'dos mil ' + ESPECIALES_LOWER[resto - 10];
  }

  const decenas = Math.floor(resto / 10);
  const unidades = resto % 10;

  if (decenas === 0) {
    return 'dos mil ' + UNIDADES_LOWER[unidades];
  }

  if (decenas === 2 && unidades > 0) {
    return 'dos mil veinti' + UNIDADES_LOWER[unidades];
  }

  if (unidades === 0) {
    return 'dos mil ' + DECENAS_LOWER[decenas];
  }

  return 'dos mil ' + DECENAS_LOWER[decenas] + ' y ' + UNIDADES_LOWER[unidades];
}

export function fechaALetras(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;

  const dia = d.getDate();
  const mes = d.getMonth();
  const anio = d.getFullYear();

  return `${diaALetras(dia)} de ${MESES[mes]} del ${anioALetras(anio)}`;
}

// Función para convertir monto USD a PEN
export function convertirUSDaPEN(montoUSD: number, tipoCambio: number): number {
  return Math.round(montoUSD * tipoCambio * 100) / 100;
}

// Genera todas las variantes de un monto (USD, PEN, textos)
export interface MontoVariantes {
  usd: number;
  usd_texto: string;
  pen: number;
  pen_texto: string;
}

export function generarMontoVariantes(montoUSD: number, tipoCambio: number): MontoVariantes {
  const pen = convertirUSDaPEN(montoUSD, tipoCambio);
  return {
    usd: montoUSD,
    usd_texto: numeroALetras(montoUSD, 'USD'),
    pen: pen,
    pen_texto: numeroALetras(pen, 'PEN'),
  };
}

// Función para convertir tipo de cambio a texto
// Ejemplo: 3.84 → "Tres con 84/100 soles"
export function tipoCambioALetras(tipoCambio: number): string {
  const parteEntera = Math.floor(tipoCambio);
  const centavos = Math.round((tipoCambio - parteEntera) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');

  const unidadesTexto = ['Cero', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];

  return `${unidadesTexto[parteEntera]} con ${centavosStr}/100 soles`;
}

// Función para convertir número entero a texto (sin moneda)
// Ejemplo: 24 → "VEINTICUATRO", 15 → "QUINCE"
export function numeroEnteroALetras(numero: number): string {
  if (numero === 0) return 'CERO';

  let resultado = '';

  // Millones
  const millones = Math.floor(numero / 1000000);
  if (millones > 0) {
    if (millones === 1) {
      resultado += 'UN MILLÓN ';
    } else {
      resultado += convertirGrupo(millones) + ' MILLONES ';
    }
  }

  // Miles
  const miles = Math.floor((numero % 1000000) / 1000);
  if (miles > 0) {
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += convertirGrupo(miles) + ' MIL ';
    }
  }

  // Unidades (0-999)
  const unidades = numero % 1000;
  if (unidades > 0) {
    resultado += convertirGrupo(unidades);
  }

  return resultado.trim();
}

// Calcula la fecha de última cuota dado fecha inicio y número de cuotas
// Ajusta automáticamente el día para meses con menos días (ej: 30 en febrero → 28 o 29)
export function calcularFechaUltimaCuota(fechaInicio: string | Date, numeroCuotas: number): Date {
  const fechaBase = typeof fechaInicio === 'string' ? new Date(fechaInicio) : new Date(fechaInicio);

  // Obtener día, mes y año originales
  const diaOriginal = fechaBase.getDate();
  const mesOriginal = fechaBase.getMonth();
  const añoOriginal = fechaBase.getFullYear();

  // Calcular mes destino (sumar cuotas - 1 porque la primera cuota es en el mes de inicio)
  const mesesASumar = numeroCuotas - 1;
  const mesDestino = mesOriginal + mesesASumar;

  // Calcular año y mes finales
  const añoDestino = añoOriginal + Math.floor(mesDestino / 12);
  const mesDestinoFinal = mesDestino % 12;

  // Obtener último día del mes destino (maneja febrero, años bisiestos, etc.)
  const ultimoDiaMes = new Date(añoDestino, mesDestinoFinal + 1, 0).getDate();

  // Usar el menor entre el día original y el último día del mes
  const diaFinal = Math.min(diaOriginal, ultimoDiaMes);

  // Crear fecha resultado
  return new Date(añoDestino, mesDestinoFinal, diaFinal);
}

// Extrae el día de una fecha
export function extraerDia(fecha: string | Date): number {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.getDate();
}

// Formatea fecha como DD/MM/YYYY
export function formatearFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}
