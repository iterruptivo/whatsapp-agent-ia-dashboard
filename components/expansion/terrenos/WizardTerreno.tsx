'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, Save } from 'lucide-react';
import type { TerrenoCreateInput } from '@/lib/types/expansion';
import { WIZARD_STEPS } from '@/lib/types/expansion';
import { crearTerreno, actualizarTerreno, enviarTerreno } from '@/lib/actions-expansion';
import PasoUbicacion from './PasoUbicacion';
import PasoCaracteristicas from './PasoCaracteristicas';
import PasoDocumentacion from './PasoDocumentacion';
import PasoValorizacion from './PasoValorizacion';
import PasoMultimedia from './PasoMultimedia';

interface WizardTerrenoProps {
  terrenoId?: string;
  datosIniciales?: Partial<TerrenoCreateInput>;
}

export default function WizardTerreno({ terrenoId, datosIniciales }: WizardTerrenoProps) {
  const router = useRouter();
  const [pasoActual, setPasoActual] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [terrenoIdLocal, setTerrenoIdLocal] = useState(terrenoId);
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Datos del terreno (wizard state)
  const [datos, setDatos] = useState<Partial<TerrenoCreateInput>>({
    departamento: '',
    provincia: '',
    distrito: '',
    direccion: '',
    area_total_m2: 0,
    area_construida_m2: 0,
    tipo_terreno: 'urbano',
    tiene_agua: false,
    tiene_luz: false,
    tiene_desague: false,
    tiene_internet: false,
    acceso_pavimentado: false,
    tiene_cargas: false,
    propietario_es_corredor: false,
    moneda: 'USD',
    precio_negociable: true,
    fotos_urls: [],
    videos_urls: [],
    planos_urls: [],
    documentos_urls: [],
    ...datosIniciales,
  });

  // Actualizar datos del paso actual
  const actualizarDatos = (nuevosDatos: Partial<TerrenoCreateInput>) => {
    setDatos((prev) => ({ ...prev, ...nuevosDatos }));
    setErrores({}); // Limpiar errores al cambiar datos
  };

  // Validar paso actual
  const validarPaso = (paso: number): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (paso === 1) {
      // Ubicación
      if (!datos.departamento) nuevosErrores.departamento = 'Seleccione un departamento';
      if (!datos.provincia) nuevosErrores.provincia = 'Seleccione una provincia';
      if (!datos.distrito) nuevosErrores.distrito = 'Seleccione un distrito';
      if (!datos.direccion) nuevosErrores.direccion = 'Ingrese la dirección';
    } else if (paso === 2) {
      // Características
      if (!datos.area_total_m2 || datos.area_total_m2 <= 0) {
        nuevosErrores.area_total_m2 = 'Ingrese el área total del terreno';
      }
      if (!datos.tipo_terreno) nuevosErrores.tipo_terreno = 'Seleccione el tipo de terreno';
    } else if (paso === 3) {
      // Documentación - todos opcionales excepto checkbox
      // No hay campos obligatorios en este paso
    } else if (paso === 4) {
      // Valorización
      if (!datos.moneda) nuevosErrores.moneda = 'Seleccione la moneda';
    } else if (paso === 5) {
      // Multimedia
      if (!datos.fotos_urls || datos.fotos_urls.length === 0) {
        nuevosErrores.fotos_urls = 'Suba al menos una foto del terreno';
      }
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Guardar como borrador
  const guardarBorrador = async () => {
    setGuardando(true);
    try {
      if (terrenoIdLocal) {
        // Actualizar existente
        const result = await actualizarTerreno(terrenoIdLocal, datos);
        if (!result.success) {
          alert(result.error || 'Error al guardar');
          return;
        }
      } else {
        // Crear nuevo
        const result = await crearTerreno(datos);
        if (!result.success) {
          alert(result.error || 'Error al crear terreno');
          return;
        }
        setTerrenoIdLocal(result.data?.terreno_id);
      }
      alert('Borrador guardado correctamente');
    } catch (error) {
      console.error('Error guardando borrador:', error);
      alert('Error al guardar borrador');
    } finally {
      setGuardando(false);
    }
  };

  // Ir al siguiente paso
  const siguientePaso = async () => {
    if (!validarPaso(pasoActual)) {
      return;
    }

    // Guardar automáticamente antes de avanzar
    await guardarBorrador();

    if (pasoActual < 5) {
      setPasoActual(pasoActual + 1);
    }
  };

  // Ir al paso anterior
  const pasoAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  // Enviar para revisión
  const enviarParaRevision = async () => {
    // Validar todos los pasos
    for (let i = 1; i <= 5; i++) {
      setPasoActual(i);
      if (!validarPaso(i)) {
        alert(`Complete correctamente el paso ${i}: ${WIZARD_STEPS[i - 1].titulo}`);
        return;
      }
    }

    if (!terrenoIdLocal) {
      alert('Debe guardar el terreno primero');
      return;
    }

    setEnviando(true);
    try {
      const result = await enviarTerreno(terrenoIdLocal);
      if (!result.success) {
        alert(result.error || 'Error al enviar');
        return;
      }
      alert('Terreno enviado correctamente para revisión');
      router.push('/expansion/terrenos');
    } catch (error) {
      console.error('Error enviando terreno:', error);
      alert('Error al enviar terreno');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < pasoActual;
            const isCurrent = stepNumber === pasoActual;

            return (
              <div key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  {/* Icono del paso */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors ${
                      isCompleted
                        ? 'bg-[#1b967a] text-white'
                        : isCurrent
                        ? 'bg-[#192c4d] text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                  </div>

                  {/* Título del paso */}
                  <div className="mt-2 text-center">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-[#192c4d]' : 'text-gray-500'
                      }`}
                    >
                      {step.titulo}
                    </p>
                    <p className="text-xs text-gray-400">{step.descripcion}</p>
                  </div>
                </div>

                {/* Línea conectora */}
                {stepNumber < 5 && (
                  <div
                    className={`absolute top-6 left-1/2 w-full h-0.5 -ml-6 ${
                      isCompleted ? 'bg-[#1b967a]' : 'bg-gray-200'
                    }`}
                    style={{ width: 'calc(100% - 3rem)', marginLeft: '1.5rem' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        {pasoActual === 1 && (
          <PasoUbicacion
            datos={datos}
            actualizarDatos={actualizarDatos}
            errores={errores}
          />
        )}
        {pasoActual === 2 && (
          <PasoCaracteristicas
            datos={datos}
            actualizarDatos={actualizarDatos}
            errores={errores}
          />
        )}
        {pasoActual === 3 && (
          <PasoDocumentacion
            datos={datos}
            actualizarDatos={actualizarDatos}
            errores={errores}
          />
        )}
        {pasoActual === 4 && (
          <PasoValorizacion
            datos={datos}
            actualizarDatos={actualizarDatos}
            errores={errores}
          />
        )}
        {pasoActual === 5 && (
          <PasoMultimedia
            datos={datos}
            actualizarDatos={actualizarDatos}
            errores={errores}
            terrenoId={terrenoIdLocal}
          />
        )}
      </div>

      {/* Botones de navegación */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={pasoAnterior}
          disabled={pasoActual === 1}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>

        <button
          type="button"
          onClick={guardarBorrador}
          disabled={guardando}
          className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {guardando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Borrador
            </>
          )}
        </button>

        {pasoActual < 5 ? (
          <button
            type="button"
            onClick={siguientePaso}
            className="px-6 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] transition-colors"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={enviarParaRevision}
            disabled={enviando}
            className="px-6 py-2 bg-[#192c4d] text-white rounded-md hover:bg-[#0f1b30] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar para Revisión'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
