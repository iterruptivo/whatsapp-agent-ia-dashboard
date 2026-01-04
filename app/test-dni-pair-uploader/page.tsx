'use client';

import { useState } from 'react';
import DNIPairUploader, { DNIPair } from '@/components/shared/DNIPairUploader';

export default function TestDNIPairUploaderPage() {
  const [pairs, setPairs] = useState<DNIPair[]>([]);
  const [tieneConyuge, setTieneConyuge] = useState(false);
  const [numeroCopropietarios, setNumeroCopropietarios] = useState(0);
  const [datosExtraidos, setDatosExtraidos] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-[#192c4d] mb-2">
            Test: DNIPairUploader
          </h1>
          <p className="text-gray-600">
            Componente para subir DNI en pares (frente + reverso) con OCR dual
          </p>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-[#192c4d] mb-4">Configuracion</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tieneConyuge}
                onChange={(e) => setTieneConyuge(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">Tiene Conyuge</span>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Copropietarios:</span>
              <input
                type="number"
                min="0"
                max="5"
                value={numeroCopropietarios}
                onChange={(e) => setNumeroCopropietarios(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 border border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        {/* Componente */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <DNIPairUploader
            localId="test-local-123"
            onPairsChange={(newPairs) => {
              console.log('Pairs changed:', newPairs);
              setPairs(newPairs);
            }}
            onDatosExtraidos={(datos) => {
              console.log('Datos extraidos:', datos);
              setDatosExtraidos(prev => [...prev, datos]);
            }}
            tieneConyuge={tieneConyuge}
            numeroCopropietarios={numeroCopropietarios}
          />
        </div>

        {/* Debug output */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-[#192c4d] mb-4">Debug Output</h2>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Pares actuales ({pairs.length}):</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(pairs, null, 2)}
            </pre>
          </div>

          {datosExtraidos.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Datos extraidos ({datosExtraidos.length}):
              </h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(datosExtraidos, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
