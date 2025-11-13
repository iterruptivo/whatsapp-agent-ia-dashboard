// ============================================================================
// COMPONENT: ManualLeadPanel
// ============================================================================
// Descripción: Panel lateral para agregar leads manualmente uno por uno
// Formato: Formulario visual con campos: nombre, telefono, email_vendedor, email, rubro
// Acceso: Admin + Vendedor
// Estado asignado: "lead_manual"
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { importManualLeads } from '@/lib/actions';
import { X, Plus, Pencil, Trash2, AlertCircle, CheckCircle, Search, ChevronDown } from 'lucide-react';
import { Usuario } from '@/lib/db';

interface ManualLeadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proyectoId: string;
  proyectoNombre: string;
  usuarios: Usuario[];
}

interface PendingLead {
  nombre: string;
  telefono: string;
  email_vendedor: string;
  email?: string;
  rubro?: string;
}

const EMPTY_FORM: PendingLead = {
  nombre: '',
  telefono: '',
  email_vendedor: '',
  email: '',
  rubro: '',
};

export default function ManualLeadPanel({
  isOpen,
  onClose,
  onSuccess,
  proyectoId,
  proyectoNombre,
  usuarios,
}: ManualLeadPanelProps) {
  // ====== ESTADOS ======
  const [pendingLeads, setPendingLeads] = useState<PendingLead[]>([]);
  const [currentForm, setCurrentForm] = useState<PendingLead>(EMPTY_FORM);
  const [importing, setImporting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    imported: number;
    duplicates: Array<{ nombre: string; telefono: string }>;
    invalidVendors: Array<{ email: string; row: number }>;
    total: number;
  } | null>(null);

  // Vendedor dropdown con búsqueda
  const [isVendedorDropdownOpen, setIsVendedorDropdownOpen] = useState(false);
  const [vendedorSearch, setVendedorSearch] = useState('');
  const vendedorDropdownRef = useRef<HTMLDivElement>(null);

  // Validación de teléfono
  const [phoneError, setPhoneError] = useState('');

  // Validación de email
  const [emailError, setEmailError] = useState('');

  // Validación de vendedor
  const [vendedorError, setVendedorError] = useState('');

  // ====== VALIDATION FUNCTIONS ======

  // Validar teléfono internacional
  const validarTelefonoInternacional = (telefono: string): boolean => {
    // Limpiar: eliminar espacios, guiones, paréntesis, signos +
    const cleaned = telefono.replace(/[\s\-\(\)\+]/g, '');

    // Validar:
    // - Empieza con dígito 1-9 (código de país)
    // - Total entre 10-15 dígitos
    // Ejemplos válidos:
    // - 51987654321 (Perú: 11 dígitos)
    // - 1234567890 (USA: 11 dígitos)
    // - 34612345678 (España: 11 dígitos)
    return /^[1-9]\d{9,14}$/.test(cleaned);
  };

  // Validar formato de email
  const validarEmail = (email: string): boolean => {
    // Regex estándar para validar email
    // Valida: usuario@dominio.extension
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ====== HANDLERS ======

  // 1. Agregar lead a la lista
  const handleAddLead = () => {
    // Reset errors
    setPhoneError('');
    setEmailError('');
    setVendedorError('');

    // Validar campos requeridos
    if (!currentForm.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    if (!currentForm.telefono.trim()) {
      setPhoneError('El teléfono es requerido');
      return;
    }

    // Validar formato de teléfono con código de país
    if (!validarTelefonoInternacional(currentForm.telefono)) {
      setPhoneError('Teléfono inválido. Incluye el código de país (ej: 51987654321)');
      return;
    }

    // Validar formato de email (solo si se proporcionó)
    if (currentForm.email && currentForm.email.trim() !== '') {
      if (!validarEmail(currentForm.email.trim())) {
        setEmailError('Email inválido. Usa el formato: usuario@dominio.com');
        return;
      }
    }

    if (!currentForm.email_vendedor) {
      setVendedorError('Debes seleccionar un vendedor');
      return;
    }

    if (editingIndex !== null) {
      // Actualizar lead existente
      const updated = [...pendingLeads];
      updated[editingIndex] = { ...currentForm };
      setPendingLeads(updated);
      setEditingIndex(null);
    } else {
      // Agregar nuevo lead
      setPendingLeads([...pendingLeads, { ...currentForm }]);
    }

    // Limpiar formulario y errores
    setCurrentForm(EMPTY_FORM);
    setPhoneError('');
    setEmailError('');
    setVendedorError('');
  };

  // 2. Editar lead de la lista
  const handleEditLead = (index: number) => {
    setCurrentForm(pendingLeads[index]);
    setEditingIndex(index);
  };

  // 3. Eliminar lead de la lista
  const handleDeleteLead = (index: number) => {
    setPendingLeads(pendingLeads.filter((_, i) => i !== index));
    // Si estaba editando este lead, limpiar formulario
    if (editingIndex === index) {
      setCurrentForm(EMPTY_FORM);
      setEditingIndex(null);
    }
  };

  // 4. Importar todos los leads
  const handleImportAll = async () => {
    if (pendingLeads.length === 0) {
      alert('Agrega al menos un lead antes de importar');
      return;
    }

    setImporting(true);
    const importResult = await importManualLeads(proyectoId, pendingLeads);
    setImporting(false);
    setResult(importResult);

    if (importResult.success && importResult.imported > 0) {
      // Esperar 2 segundos antes de llamar onSuccess
      setTimeout(() => {
        onSuccess();
        handleReset();
      }, 2000);
    }
  };

  // 5. Reset completo
  const handleReset = () => {
    setPendingLeads([]);
    setCurrentForm(EMPTY_FORM);
    setEditingIndex(null);
    setResult(null);
  };

  // 6. Cerrar panel
  const handleClose = () => {
    if (pendingLeads.length > 0 && !result) {
      // Confirmar si tiene leads sin importar
      if (
        confirm(
          `Tienes ${pendingLeads.length} lead${pendingLeads.length > 1 ? 's' : ''} sin importar. ¿Seguro que deseas cerrar? Se perderán los datos.`
        )
      ) {
        handleReset();
        onClose();
      }
    } else {
      handleReset();
      onClose();
    }
  };

  // 7. Cancelar edición
  const handleCancelEdit = () => {
    setCurrentForm(EMPTY_FORM);
    setEditingIndex(null);
    setPhoneError('');
    setEmailError('');
    setVendedorError('');
  };

  // 8. Seleccionar vendedor
  const handleSelectVendedor = (email: string) => {
    setCurrentForm({ ...currentForm, email_vendedor: email });
    setIsVendedorDropdownOpen(false);
    setVendedorSearch('');
    // Limpiar error al seleccionar vendedor
    if (vendedorError) setVendedorError('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        vendedorDropdownRef.current &&
        !vendedorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsVendedorDropdownOpen(false);
      }
    };

    if (isVendedorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVendedorDropdownOpen]);

  if (!isOpen) return null;

  // Filtrar usuarios activos con rol "vendedor"
  const activeVendedores = usuarios.filter(
    (u) => u.activo && u.rol === 'vendedor'
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Panel Lateral */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-white shadow-2xl z-50
          w-[90%] sm:w-[70%] md:w-[60%] lg:w-[50%]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto
        `}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Agregar Leads Manualmente
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Proyecto: <span className="font-semibold">{proyectoNombre}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
              title="Cerrar panel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          {/* FORMULARIO ACTIVO (si no hay resultado) */}
          {!result && (
            <div className="space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {editingIndex !== null ? (
                    <>
                      <Pencil className="w-5 h-5 inline-block mr-2 text-blue-600" />
                      Editando Lead #{editingIndex + 1}
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 inline-block mr-2 text-primary" />
                      Nuevo Lead
                    </>
                  )}
                </h3>
                {editingIndex !== null && (
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              {/* Input: Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez García"
                  value={currentForm.nombre}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, nombre: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Input: Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 51987654321"
                  value={currentForm.telefono}
                  onChange={(e) => {
                    setCurrentForm({ ...currentForm, telefono: e.target.value });
                    // Limpiar error al empezar a escribir
                    if (phoneError) setPhoneError('');
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:border-transparent outline-none transition-all ${
                    phoneError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary'
                  }`}
                />
                {phoneError ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Incluir código de país, para Perú: 51
                  </p>
                )}
              </div>

              {/* Dropdown: Vendedor con búsqueda */}
              <div ref={vendedorDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendedor asignado <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsVendedorDropdownOpen(!isVendedorDropdownOpen)}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:border-transparent outline-none transition-all text-left flex items-center justify-between ${
                      vendedorError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-primary'
                    }`}
                  >
                    <span className={currentForm.email_vendedor ? 'text-gray-900' : 'text-gray-400'}>
                      {currentForm.email_vendedor
                        ? activeVendedores.find((v) => v.email === currentForm.email_vendedor)?.nombre
                        : 'Seleccionar vendedor...'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isVendedorDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isVendedorDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Buscar vendedor..."
                            value={vendedorSearch}
                            onChange={(e) => setVendedorSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="max-h-48 overflow-y-auto">
                        {activeVendedores
                          .filter((v) =>
                            v.nombre.toLowerCase().includes(vendedorSearch.toLowerCase())
                          )
                          .map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectVendedor(v.email)}
                              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                currentForm.email_vendedor === v.email
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-gray-900'
                              }`}
                            >
                              {v.nombre}
                            </button>
                          ))}

                        {/* No results */}
                        {activeVendedores.filter((v) =>
                          v.nombre.toLowerCase().includes(vendedorSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No se encontraron vendedores
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Error message */}
                {vendedorError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {vendedorError}
                  </p>
                )}
              </div>

              {/* Input: Email (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email del lead <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="Ej: juan.perez@ejemplo.com"
                  value={currentForm.email || ''}
                  onChange={(e) => {
                    setCurrentForm({ ...currentForm, email: e.target.value });
                    // Limpiar error al empezar a escribir
                    if (emailError) setEmailError('');
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:border-transparent outline-none transition-all ${
                    emailError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary'
                  }`}
                />
                {emailError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Input: Rubro (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rubro <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Retail, Gastronomía, Servicios..."
                  value={currentForm.rubro || ''}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, rubro: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Botón: Agregar/Actualizar */}
              <button
                onClick={handleAddLead}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 hover:shadow-md active:scale-[0.98] font-medium transition-all duration-200"
              >
                {editingIndex !== null ? (
                  <>
                    <Pencil className="w-5 h-5" />
                    Actualizar Lead
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Agregar a la Lista
                  </>
                )}
              </button>
            </div>
          )}

          {/* LISTA DE LEADS PENDIENTES (si no hay resultado) */}
          {!result && pendingLeads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Leads Listos para Importar
                </h3>
                <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                  {pendingLeads.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {pendingLeads.map((lead, index) => (
                  <div
                    key={index}
                    className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                      editingIndex === index
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                            #{index + 1}
                          </span>
                          <p className="font-semibold text-gray-900 truncate">
                            {lead.nombre}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          📱 {lead.telefono}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          👤{' '}
                          {
                            usuarios.find((u) => u.email === lead.email_vendedor)
                              ?.nombre
                          }
                        </p>
                        {lead.email && (
                          <p className="text-xs text-gray-500 mt-1">
                            ✉️ {lead.email}
                          </p>
                        )}
                        {lead.rubro && (
                          <p className="text-xs text-gray-500">
                            🏢 {lead.rubro}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditLead(index)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESUMEN DE RESULTADOS (después de import) */}
          {result && (
            <div className="space-y-4">
              {/* Success/Error Message */}
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-green-900 font-medium">
                      Importación completada
                    </p>
                    <p className="text-sm text-green-800 mt-1">
                      {result.imported} de {result.total} leads importados
                      exitosamente
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 font-medium">
                      Error en la importación
                    </p>
                    <p className="text-sm text-red-800 mt-1">
                      No se pudo completar la importación
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {result.duplicates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 font-medium mb-2">
                    Leads duplicados (no importados):
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.duplicates.map((dup, idx) => (
                      <p key={idx} className="text-sm text-yellow-800">
                        • {dup.nombre} ({dup.telefono})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Vendors */}
              {result.invalidVendors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">
                    Vendedores inválidos (no importados):
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.invalidVendors.map((inv, idx) => (
                      <p key={idx} className="text-sm text-red-800">
                        • Lead {inv.row}: {inv.email} (no existe o no es vendedor)
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* FOOTER (sticky bottom) - Solo si no hay resultado */}
        {!result && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 shadow-lg">
            <div className="flex gap-3">
              <button
                onClick={handleImportAll}
                disabled={importing || pendingLeads.length === 0}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  importing || pendingLeads.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-secondary text-white hover:bg-secondary/90 hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {importing
                  ? 'Importando...'
                  : `Importar ${pendingLeads.length} Lead${
                      pendingLeads.length !== 1 ? 's' : ''
                    }`}
              </button>
              <button
                onClick={handleClose}
                disabled={importing}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
