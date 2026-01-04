'use client';

import GenerarConstanciaButton from '@/components/control-pagos/GenerarConstanciaButton';

export default function TestConstanciaButtonPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-[#192c4d] mb-2">
            Test: GenerarConstanciaButton
          </h1>
          <p className="text-gray-600 mb-6">
            Componente para generar constancias de separación, abono y cancelación
          </p>

          <div className="space-y-8">
            {/* Constancia de Separación */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                1. Constancia de Separación
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Se muestra cuando <code className="bg-gray-100 px-2 py-1 rounded">separacion_pagada = true</code>
              </p>
              <GenerarConstanciaButton
                controlPagoId="test-control-pago-1"
                tipo="separacion"
              />
            </div>

            {/* Constancia de Abono */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. Constancia de Abono
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Se muestra para cada abono verificado (que no sea separación)
              </p>
              <div className="space-y-3">
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="abono"
                  abonoId="test-abono-1"
                />
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="abono"
                  abonoId="test-abono-2"
                />
              </div>
            </div>

            {/* Constancia de Cancelación */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. Constancia de Cancelación
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Se muestra cuando <code className="bg-gray-100 px-2 py-1 rounded">saldo_pendiente = 0</code>
              </p>
              <GenerarConstanciaButton
                controlPagoId="test-control-pago-1"
                tipo="cancelacion"
              />
            </div>

            {/* Estado Disabled */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Estado Disabled
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Botones en estado deshabilitado
              </p>
              <div className="space-y-3">
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="separacion"
                  disabled
                />
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="abono"
                  abonoId="test-abono-1"
                  disabled
                />
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="cancelacion"
                  disabled
                />
              </div>
            </div>

            {/* Comparación Visual */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                5. Comparación Visual
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Todos los tipos lado a lado
              </p>
              <div className="flex flex-wrap gap-3">
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="separacion"
                />
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="abono"
                  abonoId="test-abono-1"
                />
                <GenerarConstanciaButton
                  controlPagoId="test-control-pago-1"
                  tipo="cancelacion"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notas de Implementación */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Notas de Implementación
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
            <li>Las server actions aún no están implementadas</li>
            <li>Al hacer clic mostrará error: "Función aún no implementada"</li>
            <li>El componente está listo para conectarse a las server actions cuando estén disponibles</li>
            <li>Funciones esperadas: generateConstanciaSeparacion, generateConstanciaAbono, generateConstanciaCancelacion</li>
          </ul>
        </div>

        {/* Paleta de Colores */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Paleta de Colores Utilizados
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="bg-teal-600 text-white p-4 rounded text-center font-medium">
                Separación
              </div>
              <div className="text-xs text-gray-600 text-center">
                teal-600 / teal-700
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-blue-600 text-white p-4 rounded text-center font-medium">
                Abono
              </div>
              <div className="text-xs text-gray-600 text-center">
                blue-600 / blue-700
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-green-700 text-white p-4 rounded text-center font-medium">
                Cancelación
              </div>
              <div className="text-xs text-gray-600 text-center">
                green-700 / green-800
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
