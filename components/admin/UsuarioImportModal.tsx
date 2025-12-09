// ============================================================================
// COMPONENT: UsuarioImportModal
// ============================================================================
// Descripción: Modal para importar usuarios masivamente desde Excel
// Formato: nombre, email, rol, telefono, email_alternativo (opcional)
// Acceso: Solo Admin
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download, Users } from 'lucide-react';
import { bulkCreateUsuarios, type BulkCreateResult } from '@/lib/actions-usuarios';

interface UsuarioImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedUsuario {
  nombre: string;
  email: string;
  rol: string;
  telefono: string;
  email_alternativo: string;
  // Errores de validación frontend
  errors: string[];
}

const VALID_ROLES = ['admin', 'jefe_ventas', 'vendedor', 'vendedor_caseta', 'finanzas'];

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  jefe_ventas: 'Jefe de Ventas',
  vendedor: 'Vendedor',
  vendedor_caseta: 'Vendedor Caseta',
  finanzas: 'Finanzas',
};

// Validar formato email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Limpiar teléfono: solo dígitos
const cleanPhone = (phone: string): string => {
  return String(phone || '').replace(/\D/g, '');
};

export default function UsuarioImportModal({
  isOpen,
  onClose,
  onSuccess,
}: UsuarioImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedUsuario[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ====== CLOSE WITH REFRESH ======
  const handleCloseWithRefresh = () => {
    if (result && result.success && result.created.length > 0) {
      onSuccess();
    }
    handleReset();
    onClose();
  };

  // ====== ESC KEY TO CLOSE ======
  const handleEsc = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !importing) {
      handleCloseWithRefresh();
    }
  };

  // ====== FILE SELECTION ======
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  // ====== PARSE FILE ======
  const parseFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      // Detectar duplicados internos
      const emailsInFile = new Map<string, number[]>();
      const phonesInFile = new Map<string, number[]>();

      jsonData.forEach((row: any, idx: number) => {
        const email = String(row.email || '').trim().toLowerCase();
        const phone = cleanPhone(row.telefono);

        if (email) {
          if (!emailsInFile.has(email)) emailsInFile.set(email, []);
          emailsInFile.get(email)!.push(idx + 1);
        }
        if (phone) {
          if (!phonesInFile.has(phone)) phonesInFile.set(phone, []);
          phonesInFile.get(phone)!.push(idx + 1);
        }
      });

      const usuarios: ParsedUsuario[] = jsonData.map((row: any, idx: number) => {
        const errors: string[] = [];
        const nombre = String(row.nombre || '').trim();
        const email = String(row.email || '').trim().toLowerCase();
        const rol = String(row.rol || '').trim().toLowerCase();
        const telefono = cleanPhone(row.telefono);
        const email_alternativo = String(row.email_alternativo || '').trim();

        // Validaciones
        if (!nombre) errors.push('Nombre vacío');
        if (!email) {
          errors.push('Email vacío');
        } else if (!isValidEmail(email)) {
          errors.push('Email inválido');
        } else if (emailsInFile.get(email)!.length > 1) {
          errors.push(`Email duplicado en filas: ${emailsInFile.get(email)!.join(', ')}`);
        }

        if (!rol) {
          errors.push('Rol vacío');
        } else if (!VALID_ROLES.includes(rol)) {
          errors.push(`Rol inválido (usar: ${VALID_ROLES.join(', ')})`);
        }

        if (!telefono) {
          errors.push('Teléfono vacío');
        } else if (telefono.length < 10) {
          errors.push('Teléfono debe tener mínimo 10 dígitos con código país');
        } else if (phonesInFile.get(telefono)!.length > 1) {
          errors.push(`Teléfono duplicado en filas: ${phonesInFile.get(telefono)!.join(', ')}`);
        }

        if (email_alternativo && !isValidEmail(email_alternativo)) {
          errors.push('Email alternativo inválido');
        }

        return {
          nombre,
          email,
          rol,
          telefono,
          email_alternativo,
          errors,
        };
      });

      setParsedData(usuarios);
    };

    reader.readAsBinaryString(file);
  };

  // ====== IMPORT ======
  const handleImport = async () => {
    // Filtrar solo los válidos (sin errores frontend)
    const validUsers = parsedData.filter(u => u.errors.length === 0);

    if (validUsers.length === 0) {
      alert('No hay usuarios válidos para importar. Corrige los errores primero.');
      return;
    }

    setImporting(true);

    const importResult = await bulkCreateUsuarios(
      validUsers.map(u => ({
        nombre: u.nombre,
        email: u.email,
        rol: u.rol as 'admin' | 'jefe_ventas' | 'vendedor' | 'vendedor_caseta' | 'finanzas',
        telefono: u.telefono,
        email_alternativo: u.email_alternativo || undefined,
      }))
    );

    setImporting(false);
    setResult(importResult);
  };

  // ====== RESET ======
  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ====== DOWNLOAD TEMPLATE ======
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nombre: 'Juan Pérez',
        email: 'juan@ecoplaza.pe',
        rol: 'vendedor',
        telefono: '51987654321',
        email_alternativo: 'juan.personal@gmail.com',
      },
      {
        nombre: 'María López',
        email: 'maria@ecoplaza.pe',
        rol: 'admin',
        telefono: '51912345678',
        email_alternativo: '',
      },
      {
        nombre: 'Carlos García',
        email: 'carlos@ecoplaza.pe',
        rol: 'jefe_ventas',
        telefono: '51998877665',
        email_alternativo: 'carlos.garcia@gmail.com',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    XLSX.writeFile(workbook, 'plantilla_usuarios.xlsx');
  };

  // ====== DOWNLOAD CREDENTIALS ======
  const handleDownloadCredentials = () => {
    if (!result || result.created.length === 0) return;

    const credentialsData = result.created.map(u => ({
      nombre: u.nombre,
      email: u.email,
      contraseña: u.password,
      rol: ROL_LABELS[u.rol] || u.rol,
    }));

    const worksheet = XLSX.utils.json_to_sheet(credentialsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Credenciales');

    XLSX.writeFile(workbook, 'credenciales_usuarios.xlsx');
  };

  // Contadores para preview
  const validCount = parsedData.filter(u => u.errors.length === 0).length;
  const invalidCount = parsedData.filter(u => u.errors.length > 0).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onKeyDown={handleEsc}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-primary rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Importar Usuarios Masivamente
            </h2>
            <button
              onClick={handleCloseWithRefresh}
              disabled={importing}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Formato y plantilla - Solo mostrar si no hay resultado */}
          {!result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Formato requerido:</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar plantilla
                </button>
              </div>

              {/* Tabla de ejemplo */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">nombre *</th>
                      <th className="text-left py-2 px-3 font-medium">email *</th>
                      <th className="text-left py-2 px-3 font-medium">rol *</th>
                      <th className="text-left py-2 px-3 font-medium">telefono *</th>
                      <th className="text-left py-2 px-3 font-medium">email_alternativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200 bg-white">
                      <td className="py-2 px-3 text-gray-900">Juan Pérez</td>
                      <td className="py-2 px-3 text-gray-900">juan@ecoplaza.pe</td>
                      <td className="py-2 px-3 text-gray-900">vendedor</td>
                      <td className="py-2 px-3 text-gray-900">51987654321</td>
                      <td className="py-2 px-3 text-gray-600">juan.personal@gmail.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <span className="font-medium">Campos requeridos:</span> nombre, email, rol, telefono
                </p>
                <p>
                  <span className="font-medium">Roles válidos:</span> admin, jefe_ventas, vendedor, vendedor_caseta, finanzas
                </p>
                <p>
                  <span className="font-medium">Teléfono:</span> Solo dígitos con código de país (ej: 51987654321)
                </p>
                <p>
                  <span className="font-medium">Contraseñas:</span> Se generan automáticamente (16 caracteres seguros)
                </p>
              </div>
            </div>
          )}

          {/* Upload Section */}
          {!file && !result && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-4">Seleccionar archivo Excel</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="usuario-file-input"
              />
              <label
                htmlFor="usuario-file-input"
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
              >
                Seleccionar archivo
              </label>
            </div>
          )}

          {/* Preview Section */}
          {file && parsedData.length > 0 && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600 font-medium">
                    {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-red-600 font-medium">
                      {invalidCount} con errores
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">#</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Estado</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Nombre</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Email</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Rol</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((usuario, idx) => (
                        <tr
                          key={idx}
                          className={`border-t border-gray-200 ${
                            usuario.errors.length > 0 ? 'bg-red-50' : 'bg-white'
                          }`}
                        >
                          <td className="py-2 px-3 text-gray-600">{idx + 1}</td>
                          <td className="py-2 px-3">
                            {usuario.errors.length > 0 ? (
                              <span
                                className="text-red-600 cursor-help"
                                title={usuario.errors.join('\n')}
                              >
                                ❌
                              </span>
                            ) : (
                              <span className="text-green-600">✓</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-900">{usuario.nombre || '-'}</td>
                          <td className="py-2 px-3 text-gray-900">{usuario.email || '-'}</td>
                          <td className="py-2 px-3 text-gray-900">
                            {ROL_LABELS[usuario.rol] || usuario.rol || '-'}
                          </td>
                          <td className="py-2 px-3 text-gray-900">{usuario.telefono || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Errores detallados */}
              {invalidCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">
                    Errores encontrados ({invalidCount} filas):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto text-sm text-red-800">
                    {parsedData
                      .filter(u => u.errors.length > 0)
                      .slice(0, 10)
                      .map((u, idx) => (
                        <p key={idx}>
                          • Fila {parsedData.indexOf(u) + 1}: {u.errors.join(', ')}
                        </p>
                      ))}
                    {invalidCount > 10 && (
                      <p className="text-red-600 font-medium">
                        ... y {invalidCount - 10} errores más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {importing ? 'Importando...' : `Importar ${validCount} usuarios`}
                </button>
                <button
                  onClick={handleReset}
                  disabled={importing}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Result Section */}
          {result && (
            <div className="space-y-4">
              {/* Success/Error Message */}
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-green-900 font-medium">Importación completada</p>
                    <p className="text-sm text-green-800 mt-1">
                      {result.created.length} usuarios creados exitosamente
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 font-medium">Error en la importación</p>
                    <p className="text-sm text-red-800 mt-1">{result.message}</p>
                  </div>
                </div>
              )}

              {/* Usuarios creados */}
              {result.created.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-green-900 font-medium">
                      Usuarios creados ({result.created.length}):
                    </p>
                    <button
                      onClick={handleDownloadCredentials}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Descargar credenciales
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.created.map((user, idx) => (
                      <p key={idx} className="text-sm text-green-800">
                        • {user.nombre} ({user.email}) - {ROL_LABELS[user.rol]}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Emails duplicados */}
              {result.duplicateEmails.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 font-medium mb-2">
                    Emails duplicados (no creados):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.duplicateEmails.map((item, idx) => (
                      <p key={idx} className="text-sm text-yellow-800">
                        • {item.email} (fila {item.row})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Teléfonos duplicados */}
              {result.duplicatePhones.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 font-medium mb-2">
                    Teléfonos duplicados (no creados):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.duplicatePhones.map((item, idx) => (
                      <p key={idx} className="text-sm text-yellow-800">
                        • {item.telefono} (fila {item.row})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Errores de creación */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">
                    Errores al crear ({result.errors.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((item, idx) => (
                      <p key={idx} className="text-sm text-red-800">
                        • Fila {item.row}: {item.email} - {item.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={handleCloseWithRefresh}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {result.success && result.created.length > 0 ? 'Actualizar lista' : 'Cerrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
