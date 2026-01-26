'use client';

import { User, Users } from 'lucide-react';

interface Asesor {
  nombre: string;
  rol: 'asesor_1' | 'asesor_2' | 'asesor_3' | 'jefatura';
}

interface Props {
  asesores: Asesor[];
}

const rolLabels: Record<string, string> = {
  asesor_1: 'Principal',
  asesor_2: 'Asesor 2',
  asesor_3: 'Asesor 3',
  jefatura: 'Jefatura',
};

const rolColors: Record<string, string> = {
  asesor_1: 'bg-blue-100 text-blue-700',
  asesor_2: 'bg-blue-50 text-blue-600',
  asesor_3: 'bg-blue-50 text-blue-600',
  jefatura: 'bg-purple-100 text-purple-700',
};

export default function EquipoVentaCell({ asesores }: Props) {
  if (!asesores || asesores.length === 0) {
    return <span className="text-gray-400 text-xs">Sin asignar</span>;
  }

  // Ordenar: asesor_1 primero, luego asesor_2, asesor_3, jefatura al final
  const sorted = [...asesores].sort((a, b) => {
    const order = { asesor_1: 1, asesor_2: 2, asesor_3: 3, jefatura: 4 };
    return order[a.rol] - order[b.rol];
  });

  return (
    <div className="flex flex-col gap-0.5">
      {sorted.map((asesor, idx) => (
        <div key={idx} className="flex items-center gap-1 text-xs">
          {asesor.rol === 'jefatura' ? (
            <Users className="w-3 h-3 text-purple-500 flex-shrink-0" />
          ) : (
            <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
          )}
          <span className="text-gray-700 truncate max-w-[100px]" title={asesor.nombre}>
            {asesor.nombre}
          </span>
          <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${rolColors[asesor.rol]}`}>
            {asesor.rol === 'jefatura' ? 'Jef' : asesor.rol === 'asesor_1' ? 'Ppal' : 'Ases'}
          </span>
        </div>
      ))}
    </div>
  );
}
