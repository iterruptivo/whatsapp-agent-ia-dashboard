'use client';

// ============================================================================
// COMPONENTE: BoletaHistorialCell
// ============================================================================
// Muestra el historial de boletas y notas de crédito de forma expandible
// Sesión 105 - Historial de Boletas y Notas de Crédito
// ============================================================================

import { useState } from 'react';
import {
  Receipt,
  FileX,
  ExternalLink,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
} from 'lucide-react';

// Interface para cada entrada del historial
export interface BoletaHistorialEntry {
  id: string;
  boleta_url: string;
  numero_boleta: string;
  tipo: 'boleta' | 'factura';
  estado: 'activa' | 'anulada_por_nc';
  uploaded_at: string;
  uploaded_by_id: string;
  uploaded_by_nombre: string;
  nota_credito_url?: string;
  nota_credito_numero?: string;
  nota_credito_at?: string;
  nota_credito_by_id?: string;
  nota_credito_by_nombre?: string;
}

// Estructura principal V2
export interface BoletaVinculadaV2 {
  voucher_index: number;
  historial: BoletaHistorialEntry[];
  boleta_activa_id: string | null;
}

interface BoletaHistorialCellProps {
  boletaData: BoletaVinculadaV2 | null;
  canVincular: boolean;
  canSubirNC: boolean;
  onVincularBoleta: () => void;
  onSubirNC: () => void;
  onDesvincularBoleta: () => void;
  isDeleting: boolean;
}

// Helper para formatear fecha
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function BoletaHistorialCell({
  boletaData,
  canVincular,
  canSubirNC,
  onVincularBoleta,
  onSubirNC,
  onDesvincularBoleta,
  isDeleting,
}: BoletaHistorialCellProps) {
  const [expanded, setExpanded] = useState(false);

  // CASO 1: Sin datos de boleta -> mostrar botón agregar
  if (!boletaData || !boletaData.historial || boletaData.historial.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        {canVincular ? (
          <button
            onClick={onVincularBoleta}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            title="Vincular boleta"
          >
            <Plus className="w-3 h-3" />
            Agregar
          </button>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </div>
    );
  }

  // Encontrar la boleta activa o la última entrada
  const boletaActiva = boletaData.boleta_activa_id
    ? boletaData.historial.find(h => h.id === boletaData.boleta_activa_id)
    : null;

  // Última entrada del historial (para mostrar si no hay activa)
  const ultimaEntrada = boletaData.historial[boletaData.historial.length - 1];

  // Entradas anteriores (para el historial expandible)
  const entradasAnteriores = boletaData.historial.slice(0, -1).reverse();

  // Determinar qué mostrar: boleta activa o última (anulada)
  const entradaPrincipal = boletaActiva || ultimaEntrada;
  const hayHistorial = boletaData.historial.length > 1;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* BOLETA PRINCIPAL */}
      <div className="flex items-center gap-1">
        {entradaPrincipal.estado === 'activa' ? (
          // Boleta activa - link azul
          <a
            href={entradaPrincipal.boleta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            title="Ver boleta"
          >
            <Receipt className="w-3 h-3" />
            {entradaPrincipal.numero_boleta}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          // Boleta anulada - link gris
          <a
            href={entradaPrincipal.boleta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            title="Ver boleta (anulada)"
          >
            <Receipt className="w-3 h-3" />
            {entradaPrincipal.numero_boleta}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Botón eliminar solo si hay boleta activa y puede vincular */}
        {entradaPrincipal.estado === 'activa' && canVincular && (
          <button
            onClick={onDesvincularBoleta}
            disabled={isDeleting}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Desvincular boleta"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* NC O BOTÓN SUBIR NC */}
      {entradaPrincipal.estado === 'activa' ? (
        // Boleta activa -> mostrar botón Subir NC
        canSubirNC && (
          <button
            onClick={onSubirNC}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            title="Subir Nota de Crédito"
          >
            <FileX className="w-3 h-3" />
            Subir NC
          </button>
        )
      ) : entradaPrincipal.nota_credito_url ? (
        // Boleta anulada con NC -> mostrar link a NC + botón nueva boleta
        <>
          <a
            href={entradaPrincipal.nota_credito_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 transition-colors"
            title="Ver Nota de Crédito"
          >
            <FileX className="w-3 h-3" />
            NC: {entradaPrincipal.nota_credito_numero}
            <ExternalLink className="w-3 h-3" />
          </a>
          {canVincular && (
            <button
              onClick={onVincularBoleta}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              title="Agregar nueva boleta"
            >
              <Plus className="w-3 h-3" />
              Nueva Boleta
            </button>
          )}
        </>
      ) : null}

      {/* BADGE HISTORIAL (si hay más de 1 entrada) */}
      {hayHistorial && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
          title={expanded ? 'Ocultar historial' : 'Ver historial'}
        >
          <History className="w-3 h-3" />
          Historial ({entradasAnteriores.length})
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      )}

      {/* HISTORIAL EXPANDIDO */}
      {expanded && entradasAnteriores.length > 0 && (
        <div className="mt-2 w-full border-t border-gray-200 pt-2 space-y-2">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Historial
          </div>
          {entradasAnteriores.map((entrada, index) => (
            <div
              key={entrada.id}
              className="bg-gray-50 rounded-lg p-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">
                  {entradasAnteriores.length - index}.
                </span>
                <a
                  href={entrada.boleta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                >
                  <Receipt className="w-3 h-3" />
                  {entrada.numero_boleta}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              {entrada.nota_credito_url && (
                <div className="flex items-center justify-end">
                  <a
                    href={entrada.nota_credito_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800"
                  >
                    <FileX className="w-3 h-3" />
                    NC: {entrada.nota_credito_numero}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
              <div className="text-[10px] text-gray-400 text-right">
                {formatDate(entrada.uploaded_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
