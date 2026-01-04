// ============================================================================
// EJEMPLO DE INTEGRACION: DNIPairUploader en Ficha de Inscripcion
// ============================================================================

'use client';

import { useState } from 'react';
import DNIPairUploader, { DNIPair, DNIOCRData, DNIReversoOCRData } from './DNIPairUploader';

export default function EjemploFichaInscripcion() {
  const [pairs, setPairs] = useState<DNIPair[]>([]);
  const [estadoCivil, setEstadoCivil] = useState<'soltero' | 'casado'>('soltero');
  const [numeroCopropietarios, setNumeroCopropietarios] = useState(0);

  // Estados del formulario que se llenan con OCR
  const [formData, setFormData] = useState({
    titular: {
      dni: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      fechaNacimiento: '',
      sexo: '',
      departamento: '',
      provincia: '',
      distrito: '',
      direccion: '',
    },
    conyuge: {
      dni: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      fechaNacimiento: '',
      sexo: '',
      departamento: '',
      provincia: '',
      distrito: '',
      direccion: '',
    },
  });

  const handleDatosExtraidos = (datos: {
    frente: DNIOCRData;
    reverso: DNIReversoOCRData;
    persona: string;
  }) => {
    console.log('Datos OCR extraidos:', datos);

    // Auto-llenar campos del formulario
    if (datos.persona === 'titular') {
      setFormData(prev => ({
        ...prev,
        titular: {
          dni: datos.frente.numero_dni,
          nombres: datos.frente.nombres,
          apellidoPaterno: datos.frente.apellido_paterno,
          apellidoMaterno: datos.frente.apellido_materno,
          fechaNacimiento: datos.frente.fecha_nacimiento,
          sexo: datos.frente.sexo === 'M' ? 'Masculino' : 'Femenino',
          departamento: datos.reverso.departamento || '',
          provincia: datos.reverso.provincia || '',
          distrito: datos.reverso.distrito || '',
          direccion: datos.reverso.direccion || '',
        },
      }));
    } else if (datos.persona === 'conyuge') {
      setFormData(prev => ({
        ...prev,
        conyuge: {
          dni: datos.frente.numero_dni,
          nombres: datos.frente.nombres,
          apellidoPaterno: datos.frente.apellido_paterno,
          apellidoMaterno: datos.frente.apellido_materno,
          fechaNacimiento: datos.frente.fecha_nacimiento,
          sexo: datos.frente.sexo === 'M' ? 'Masculino' : 'Femenino',
          departamento: datos.reverso.departamento || '',
          provincia: datos.reverso.provincia || '',
          distrito: datos.reverso.distrito || '',
          direccion: datos.reverso.direccion || '',
        },
      }));
    }
    // Para copropietarios, podrias almacenar en un array
  };

  const handleSubmit = async () => {
    // Validar que todos los pares esten completos
    const paresIncompletos = pairs.filter(
      p => !p.frente || !p.reverso || p.frente.estado !== 'listo' || p.reverso.estado !== 'listo'
    );

    if (paresIncompletos.length > 0) {
      alert('Por favor completa todos los DNI (frente y reverso)');
      return;
    }

    // Preparar payload con URLs de imagenes y datos OCR
    const payload = {
      titular: {
        ...formData.titular,
        dni_frente_url: pairs.find(p => p.persona === 'titular')?.frente?.url,
        dni_reverso_url: pairs.find(p => p.persona === 'titular')?.reverso?.url,
      },
      conyuge: estadoCivil === 'casado' ? {
        ...formData.conyuge,
        dni_frente_url: pairs.find(p => p.persona === 'conyuge')?.frente?.url,
        dni_reverso_url: pairs.find(p => p.persona === 'conyuge')?.reverso?.url,
      } : null,
      copropietarios: pairs
        .filter(p => p.persona === 'copropietario')
        .map(p => ({
          dni_frente_url: p.frente?.url,
          dni_reverso_url: p.reverso?.url,
          ocrData: {
            frente: p.frente?.ocrData,
            reverso: p.reverso?.ocrData,
          },
        })),
    };

    console.log('Payload final:', payload);

    // Aqui iria tu server action
    // await crearFichaInscripcion(payload);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-[#192c4d] mb-6">
        Ficha de Inscripcion - Ejemplo con DNIPairUploader
      </h1>

      {/* Seccion 1: Datos basicos */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-[#192c4d] mb-4">1. Datos Basicos</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado Civil
            </label>
            <select
              value={estadoCivil}
              onChange={(e) => setEstadoCivil(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="soltero">Soltero</option>
              <option value="casado">Casado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero de Copropietarios
            </label>
            <input
              type="number"
              min="0"
              max="5"
              value={numeroCopropietarios}
              onChange={(e) => setNumeroCopropietarios(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Seccion 2: DNI Upload */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-[#192c4d] mb-4">
          2. Documentos de Identidad
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Sube el DNI completo (frente y reverso) de cada persona. Los datos se extraeran automaticamente.
        </p>

        <DNIPairUploader
          localId="local-ejemplo-123"
          onPairsChange={setPairs}
          onDatosExtraidos={handleDatosExtraidos}
          tieneConyuge={estadoCivil === 'casado'}
          numeroCopropietarios={numeroCopropietarios}
        />
      </div>

      {/* Seccion 3: Datos del Titular (auto-llenados) */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-[#192c4d] mb-4">
          3. Datos del Titular
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Auto-llenados via OCR)
          </span>
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
            <input
              type="text"
              value={formData.titular.dni}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                titular: { ...prev.titular, dni: e.target.value },
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Extraido automaticamente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
            <input
              type="text"
              value={formData.titular.nombres}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                titular: { ...prev.titular, nombres: e.target.value },
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Extraido automaticamente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido Paterno
            </label>
            <input
              type="text"
              value={formData.titular.apellidoPaterno}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                titular: { ...prev.titular, apellidoPaterno: e.target.value },
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Extraido automaticamente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido Materno
            </label>
            <input
              type="text"
              value={formData.titular.apellidoMaterno}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                titular: { ...prev.titular, apellidoMaterno: e.target.value },
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Extraido automaticamente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={formData.titular.fechaNacimiento}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                titular: { ...prev.titular, fechaNacimiento: e.target.value },
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
            <input
              type="text"
              value={formData.titular.sexo}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              readOnly
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Direccion
            </label>
            <input
              type="text"
              value={formData.titular.direccion}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                titular: { ...prev.titular, direccion: e.target.value },
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Extraido del reverso del DNI"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={formData.titular.departamento}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia
            </label>
            <input
              type="text"
              value={formData.titular.provincia}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Seccion 4: Datos del Conyuge (si aplica) */}
      {estadoCivil === 'casado' && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#192c4d] mb-4">
            4. Datos del Conyuge
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Auto-llenados via OCR)
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
              <input
                type="text"
                value={formData.conyuge.dni}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Extraido automaticamente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
              <input
                type="text"
                value={formData.conyuge.nombres}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Extraido automaticamente"
              />
            </div>
            {/* ... mas campos similares ... */}
          </div>
        </div>
      )}

      {/* Botones de accion */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] transition-colors"
        >
          Guardar Ficha
        </button>
      </div>

      {/* Debug */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Debug: Pares actuales</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(pairs, null, 2)}
        </pre>
      </div>
    </div>
  );
}
