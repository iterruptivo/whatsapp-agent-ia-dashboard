export interface Lead {
  id: string;
  telefono: string;
  nombre: string;
  rubro: string;
  horario_visita: string;
  estado: 'lead_completo' | 'lead_incompleto' | 'en_conversacion' | 'conversacion_abandonada';
  fecha_captura: string;
  ultimo_mensaje: string;
  intentos_bot: number;
}

export const fakeLeads: Lead[] = [
  {
    id: '1',
    telefono: '+51987654321',
    nombre: 'Carlos Mendoza',
    rubro: 'Ferretería',
    horario_visita: 'Lunes 3pm',
    estado: 'lead_completo',
    fecha_captura: '2025-10-08T10:30:00',
    ultimo_mensaje: 'Perfecto, espero su visita',
    intentos_bot: 4,
  },
  {
    id: '2',
    telefono: '+51912345678',
    nombre: 'María García',
    rubro: 'Bazar',
    horario_visita: 'Martes por la mañana',
    estado: 'lead_completo',
    fecha_captura: '2025-10-08T11:15:00',
    ultimo_mensaje: 'Gracias, los espero',
    intentos_bot: 5,
  },
  {
    id: '3',
    telefono: '+51998765432',
    nombre: 'Juan Pérez',
    rubro: 'Restaurante',
    horario_visita: '',
    estado: 'lead_incompleto',
    fecha_captura: '2025-10-08T14:20:00',
    ultimo_mensaje: 'Déjame confirmar y te aviso',
    intentos_bot: 8,
  },
  {
    id: '4',
    telefono: '+51923456789',
    nombre: 'Ana Torres',
    rubro: 'Bodega',
    horario_visita: 'Miércoles 10am',
    estado: 'lead_completo',
    fecha_captura: '2025-10-09T09:00:00',
    ultimo_mensaje: 'Perfecto, aquí los espero',
    intentos_bot: 3,
  },
  {
    id: '5',
    telefono: '+51934567890',
    nombre: 'Pedro Ruiz',
    rubro: '',
    horario_visita: '',
    estado: 'en_conversacion',
    fecha_captura: '2025-10-09T15:45:00',
    ultimo_mensaje: 'Hola, quiero más información',
    intentos_bot: 2,
  },
  {
    id: '6',
    telefono: '+51945678901',
    nombre: '',
    rubro: '',
    horario_visita: '',
    estado: 'conversacion_abandonada',
    fecha_captura: '2025-10-07T16:30:00',
    ultimo_mensaje: 'Hola',
    intentos_bot: 5,
  },
  {
    id: '7',
    telefono: '+51956789012',
    nombre: 'Luis Castillo',
    rubro: 'Librería',
    horario_visita: 'Jueves 2pm',
    estado: 'lead_completo',
    fecha_captura: '2025-10-09T12:00:00',
    ultimo_mensaje: 'Excelente, confirmo la visita',
    intentos_bot: 4,
  },
  {
    id: '8',
    telefono: '+51967890123',
    nombre: 'Sandra Vega',
    rubro: 'Panadería',
    horario_visita: '',
    estado: 'lead_incompleto',
    fecha_captura: '2025-10-09T13:30:00',
    ultimo_mensaje: 'Tengo que revisar mi agenda',
    intentos_bot: 7,
  },
];

export const getStats = () => {
  const total = fakeLeads.length;
  const completos = fakeLeads.filter(l => l.estado === 'lead_completo').length;
  const incompletos = fakeLeads.filter(l => l.estado === 'lead_incompleto').length;
  const conversacion = fakeLeads.filter(l => l.estado === 'en_conversacion').length;
  const abandonados = fakeLeads.filter(l => l.estado === 'conversacion_abandonada').length;

  return {
    total,
    completos,
    incompletos,
    conversacion,
    abandonados,
    tasaConversion: ((completos / total) * 100).toFixed(1),
  };
};

export const getChartData = () => {
  return [
    { name: 'Lead Completo', value: fakeLeads.filter(l => l.estado === 'lead_completo').length, color: '#1b967a' },
    { name: 'Lead Incompleto', value: fakeLeads.filter(l => l.estado === 'lead_incompleto').length, color: '#fbde17' },
    { name: 'En Conversación', value: fakeLeads.filter(l => l.estado === 'en_conversacion').length, color: '#192c4d' },
    { name: 'Abandonado', value: fakeLeads.filter(l => l.estado === 'conversacion_abandonada').length, color: '#cbd5e1' },
  ];
};