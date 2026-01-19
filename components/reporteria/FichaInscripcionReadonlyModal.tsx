'use client';

import { useState, useEffect } from 'react';
import { X, FileText, User, Users, DollarSign, Image as ImageIcon, Loader2, Receipt, CreditCard, Calendar, Building2 } from 'lucide-react';
import { getClienteFichaByLocalId, ClienteFicha, getAbonosByLocalId, AbonoControlPago } from '@/lib/actions-clientes-ficha';

interface FichaInscripcionReadonlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  localId: string;
}

export default function FichaInscripcionReadonlyModal({
  isOpen,
  onClose,
  localId,
}: FichaInscripcionReadonlyModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClienteFicha | null>(null);
  const [abonos, setAbonos] = useState<AbonoControlPago[]>([]);

  useEffect(() => {
    if (isOpen && localId) {
      loadFichaData();
    }
  }, [isOpen, localId]);

  const loadFichaData = async () => {
    try {
      setLoading(true);
      setError(null);
      setAbonos([]);

      // Cargar ficha y abonos en paralelo
      const [fichaResult, abonosResult] = await Promise.all([
        getClienteFichaByLocalId(localId),
        getAbonosByLocalId(localId),
      ]);

      if (!fichaResult) {
        setError('No se encontró la ficha de inscripción');
        return;
      }

      setData(fichaResult);
      setAbonos(abonosResult);
    } catch (err) {
      setError('Error al cargar la ficha de inscripción');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#1b967a]" />
            <h2 className="text-2xl font-bold text-[#192c4d]">
              Ficha de Inscripción
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#1b967a] animate-spin" />
              <span className="ml-3 text-gray-600">Cargando ficha...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {/* Sección Titular */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-[#1b967a]" />
                  <h3 className="text-lg font-semibold text-[#192c4d]">
                    Titular
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nombres</label>
                    <p className="text-gray-900">{data.titular_nombres || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Apellidos</label>
                    <p className="text-gray-900">
                      {data.titular_apellido_paterno || ''} {data.titular_apellido_materno || ''}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Documento</label>
                    <p className="text-gray-900">
                      {data.titular_tipo_documento || '-'}: {data.titular_numero_documento || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado Civil</label>
                    <p className="text-gray-900">{data.titular_estado_civil || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Celular</label>
                    <p className="text-gray-900">{data.titular_celular || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{data.titular_email || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Dirección</label>
                    <p className="text-gray-900">
                      {data.titular_direccion || '-'}, {data.titular_distrito || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ocupación</label>
                    <p className="text-gray-900">{data.titular_ocupacion || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Centro de Trabajo</label>
                    <p className="text-gray-900">{data.titular_centro_trabajo || '-'}</p>
                  </div>
                </div>
              </section>

              {/* Sección Cónyuge */}
              {data.tiene_conyuge && (
                <section className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-[#1b967a]" />
                    <h3 className="text-lg font-semibold text-[#192c4d]">
                      Cónyuge
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nombres</label>
                      <p className="text-gray-900">{data.conyuge_nombres}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Apellidos</label>
                      <p className="text-gray-900">
                        {data.conyuge_apellido_paterno} {data.conyuge_apellido_materno}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Documento</label>
                      <p className="text-gray-900">
                        {data.conyuge_tipo_documento}: {data.conyuge_numero_documento}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Celular</label>
                      <p className="text-gray-900">{data.conyuge_celular}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{data.conyuge_email}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Sección Copropietarios */}
              {data.copropietarios && data.copropietarios.length > 0 && (
                <section className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-[#1b967a]" />
                    <h3 className="text-lg font-semibold text-[#192c4d]">
                      Copropietarios ({data.copropietarios.length})
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {data.copropietarios.map((coprop, index) => (
                      <div key={index} className="border-t border-gray-200 pt-4 first:border-0 first:pt-0">
                        <p className="text-sm font-semibold text-[#1b967a] mb-2">
                          Copropietario {index + 1}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Nombres</label>
                            <p className="text-gray-900">{coprop.nombres || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Apellidos</label>
                            <p className="text-gray-900">
                              {coprop.apellido_paterno || ''} {coprop.apellido_materno || ''}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Documento</label>
                            <p className="text-gray-900">
                              {coprop.tipo_documento || '-'}: {coprop.numero_documento || '-'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Parentesco</label>
                            <p className="text-gray-900">{coprop.parentesco || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Teléfono</label>
                            <p className="text-gray-900">{coprop.telefono || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Email</label>
                            <p className="text-gray-900">{coprop.email || '-'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Sección UIN */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-[#1b967a]" />
                  <h3 className="text-lg font-semibold text-[#192c4d]">
                    Información Financiera (UIN)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Modalidad de Pago</label>
                    <p className="text-gray-900">{data.modalidad_pago || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cuota Inicial (USD)</label>
                    <p className="text-gray-900 font-semibold">
                      {data.cuota_inicial_usd ? `$ ${data.cuota_inicial_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Número de Cuotas</label>
                    <p className="text-gray-900">{data.numero_cuotas || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cuota Mensual (USD)</label>
                    <p className="text-gray-900 font-semibold">
                      {data.cuota_mensual_usd ? `$ ${data.cuota_mensual_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Fecha Inicio Pago</label>
                    <p className="text-gray-900">
                      {data.fecha_inicio_pago ? new Date(data.fecha_inicio_pago).toLocaleDateString('es-PE') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">TEA</label>
                    <p className="text-gray-900">{data.tea ? `${data.tea}%` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Saldo a Financiar (USD)</label>
                    <p className="text-gray-900 font-semibold">
                      {data.saldo_financiar_usd ? `$ ${data.saldo_financiar_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Entidad Bancaria</label>
                    <p className="text-gray-900">{data.entidad_bancaria || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo de Cambio</label>
                    <p className="text-gray-900">{data.tipo_cambio ? `S/ ${data.tipo_cambio.toFixed(3)}` : '-'}</p>
                  </div>
                </div>
              </section>

              {/* Sección Documentos */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="h-5 w-5 text-[#1b967a]" />
                  <h3 className="text-lg font-semibold text-[#192c4d]">
                    Documentos
                  </h3>
                </div>
                <div className="space-y-4">
                  {/* DNI Fotos */}
                  {data.dni_fotos && data.dni_fotos.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        DNI ({data.dni_fotos.length} {data.dni_fotos.length === 1 ? 'foto' : 'fotos'})
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.dni_fotos.map((url, index) => (
                          <div key={index}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={url}
                                alt={`DNI ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg border border-gray-300 hover:border-[#1b967a] transition-colors"
                              />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comprobantes de Depósito (Separación) */}
                  {data.comprobante_deposito_fotos && data.comprobante_deposito_fotos.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Comprobantes de Separación ({data.comprobante_deposito_fotos.length})
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.comprobante_deposito_fotos.map((url, index) => (
                          <div key={index}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={url}
                                alt={`Comprobante ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg border border-gray-300 hover:border-[#1b967a] transition-colors"
                              />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Abonos de Control de Pagos */}
                  {abonos.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt className="h-4 w-4 text-[#1b967a]" />
                        <label className="text-sm font-semibold text-gray-700">
                          Abonos de Control de Pagos ({abonos.length})
                        </label>
                      </div>
                      <div className="space-y-3">
                        {abonos.map((abono) => (
                          <div
                            key={abono.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-[#1b967a]/50 transition-colors"
                          >
                            <div className="flex flex-col md:flex-row gap-4">
                              {/* Voucher/Comprobante */}
                              {abono.comprobante_url ? (
                                <div className="flex-shrink-0">
                                  <a
                                    href={abono.comprobante_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={abono.comprobante_url}
                                      alt={`Voucher ${abono.numero_operacion || ''}`}
                                      className="w-32 h-24 object-cover rounded-lg border border-gray-300 hover:border-[#1b967a] transition-colors"
                                    />
                                  </a>
                                </div>
                              ) : (
                                <div className="w-32 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Receipt className="h-8 w-8 text-gray-400" />
                                </div>
                              )}

                              {/* Info del abono */}
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[#1b967a]">
                                    {abono.moneda === 'USD' ? '$' : 'S/'} {abono.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                  {abono.pago_concepto && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                      {abono.pago_concepto}
                                      {abono.pago_numero_cuota && ` #${abono.pago_numero_cuota}`}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(abono.fecha_abono).toLocaleDateString('es-PE')}
                                  </span>

                                  {abono.metodo_pago && (
                                    <span className="flex items-center gap-1">
                                      <CreditCard className="h-3 w-3" />
                                      {abono.metodo_pago}
                                    </span>
                                  )}

                                  {abono.banco && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {abono.banco}
                                    </span>
                                  )}

                                  {abono.numero_operacion && (
                                    <span className="text-gray-500">
                                      Op: {abono.numero_operacion}
                                    </span>
                                  )}
                                </div>

                                {abono.notas && (
                                  <p className="text-xs text-gray-500 italic">
                                    {abono.notas}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje si no hay documentos */}
                  {(!data.dni_fotos || data.dni_fotos.length === 0) &&
                   (!data.comprobante_deposito_fotos || data.comprobante_deposito_fotos.length === 0) &&
                   abonos.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay documentos adjuntos
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
