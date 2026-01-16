// ============================================================================
// COMPONENT: CompartirReunionModal
// ============================================================================
// Modal para gestionar permisos de compartir reuniones
// Tabs: Link Público | Por Roles | Por Usuarios
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, Link2, Users, UserCheck, Copy, RefreshCw, Loader2, Check, Trash2 } from 'lucide-react';
import { Reunion, ReunionListItem } from '@/types/reuniones';
import {
  compartirReunion,
  desactivarCompartir,
  regenerarLinkToken,
  actualizarPermisosReunion,
} from '@/lib/actions-reuniones';

interface CompartirReunionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reunion: ReunionListItem;
  onSuccess: () => void;
}

type Tab = 'link' | 'roles' | 'usuarios';

// Roles que tienen acceso por defecto (pueden quitarse)
const ROLES_ACCESO_DEFECTO = ['superadmin', 'admin', 'gerencia'];

const ROLES_DISPONIBLES = [
  { value: 'superadmin', label: 'Super Admin', esDefecto: true },
  { value: 'admin', label: 'Administrador', esDefecto: true },
  { value: 'gerencia', label: 'Gerencia', esDefecto: true },
  { value: 'jefe_ventas', label: 'Jefe de Ventas', esDefecto: false },
  { value: 'coordinador', label: 'Coordinador', esDefecto: false },
  { value: 'vendedor', label: 'Vendedor', esDefecto: false },
  { value: 'vendedor_caseta', label: 'Vendedor de Caseta', esDefecto: false },
  { value: 'finanzas', label: 'Finanzas', esDefecto: false },
  { value: 'marketing', label: 'Marketing', esDefecto: false },
];

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export default function CompartirReunionModal({
  isOpen,
  onClose,
  reunion,
  onSuccess,
}: CompartirReunionModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Estados para roles - Si no hay roles configurados, usar los por defecto
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(
    reunion.roles_permitidos && reunion.roles_permitidos.length > 0
      ? reunion.roles_permitidos
      : ROLES_ACCESO_DEFECTO
  );

  // Estados para usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>(
    reunion.usuarios_permitidos || []
  );
  const [busquedaUsuario, setBusquedaUsuario] = useState('');

  // Generar URL compartida
  useEffect(() => {
    if (reunion.es_publico && reunion.link_token) {
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/reuniones/compartida/${reunion.link_token}`);
    } else {
      setShareUrl(null);
    }
  }, [reunion.es_publico, reunion.link_token]);

  // Cargar usuarios disponibles
  useEffect(() => {
    if (activeTab === 'usuarios') {
      const fetchUsuarios = async () => {
        setLoadingUsuarios(true);
        try {
          const response = await fetch('/api/usuarios?activos_only=true');
          const data = await response.json();
          if (data.success) {
            setUsuarios(data.usuarios);
          }
        } catch (error) {
          console.error('Error fetching usuarios:', error);
        } finally {
          setLoadingUsuarios(false);
        }
      };

      fetchUsuarios();
    }
  }, [activeTab]);

  // Activar link público
  const handleActivarLink = async () => {
    setLoading(true);
    try {
      const result = await compartirReunion(reunion.id);
      if (result.success && result.shareUrl) {
        setShareUrl(result.shareUrl);
        onSuccess();
      } else {
        alert(result.error || 'Error al generar link');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar link');
    } finally {
      setLoading(false);
    }
  };

  // Desactivar link público
  const handleDesactivarLink = async () => {
    if (!confirm('¿Desactivar el link público? Ya no será accesible.')) return;

    setLoading(true);
    try {
      const result = await desactivarCompartir(reunion.id);
      if (result.success) {
        setShareUrl(null);
        onSuccess();
      } else {
        alert(result.error || 'Error al desactivar link');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al desactivar link');
    } finally {
      setLoading(false);
    }
  };

  // Regenerar token
  const handleRegenerarToken = async () => {
    if (!confirm('¿Regenerar el link? El link anterior dejará de funcionar.')) return;

    setLoading(true);
    try {
      const result = await regenerarLinkToken(reunion.id);
      if (result.success && result.shareUrl) {
        setShareUrl(result.shareUrl);
        onSuccess();
      } else {
        alert(result.error || 'Error al regenerar link');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al regenerar link');
    } finally {
      setLoading(false);
    }
  };

  // Copiar link al portapapeles
  const handleCopiarLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Actualizar roles
  const handleToggleRol = (rol: string) => {
    setRolesSeleccionados((prev) =>
      prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]
    );
  };

  const handleGuardarRoles = async () => {
    setLoading(true);
    try {
      const result = await actualizarPermisosReunion(reunion.id, {
        roles_permitidos: rolesSeleccionados,
      });
      if (result.success) {
        alert('Roles actualizados correctamente');
        onSuccess();
      } else {
        alert(result.error || 'Error al actualizar roles');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar roles');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar usuarios
  const handleToggleUsuario = (usuarioId: string) => {
    setUsuariosSeleccionados((prev) =>
      prev.includes(usuarioId) ? prev.filter((u) => u !== usuarioId) : [...prev, usuarioId]
    );
  };

  const handleGuardarUsuarios = async () => {
    setLoading(true);
    try {
      const result = await actualizarPermisosReunion(reunion.id, {
        usuarios_permitidos: usuariosSeleccionados,
      });
      if (result.success) {
        alert('Usuarios actualizados correctamente');
        onSuccess();
      } else {
        alert(result.error || 'Error al actualizar usuarios');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios por búsqueda
  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busquedaUsuario.toLowerCase()) ||
      u.email.toLowerCase().includes(busquedaUsuario.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#192c4d]">Compartir Reunión</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('link')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'link'
                  ? 'border-[#1b967a] text-[#1b967a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Link Público
              </div>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'roles'
                  ? 'border-[#1b967a] text-[#1b967a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Por Roles
              </div>
            </button>
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'usuarios'
                  ? 'border-[#1b967a] text-[#1b967a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Por Usuarios
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Link Público */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Genera un link público para compartir esta reunión con cualquier persona, incluso sin
                cuenta en el sistema.
              </p>

              {shareUrl ? (
                <>
                  {/* Link activo */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 mb-1">Link activo</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm"
                          />
                          <button
                            onClick={handleCopiarLink}
                            className="p-2 bg-[#1b967a] text-white rounded hover:bg-[#157a63] transition-colors"
                            title="Copiar link"
                          >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleRegenerarToken}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors disabled:opacity-50 text-sm"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Regenerar Link
                      </button>
                      <button
                        onClick={handleDesactivarLink}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Desactivar
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Link inactivo */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      Esta reunión no tiene un link público activo.
                    </p>
                    <button
                      onClick={handleActivarLink}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors disabled:opacity-50 mx-auto"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Link2 className="w-5 h-5" />
                      )}
                      Generar Link Público
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Por Roles */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecciona los roles que podrán acceder a esta reunión.
              </p>

              <div className="space-y-2">
                {ROLES_DISPONIBLES.map((rol) => (
                  <label
                    key={rol.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      rol.esDefecto ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={rolesSeleccionados.includes(rol.value)}
                      onChange={() => handleToggleRol(rol.value)}
                      className="w-4 h-4 text-[#1b967a] focus:ring-[#1b967a] rounded"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{rol.label}</span>
                      {rol.esDefecto && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Por defecto
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={handleGuardarRoles}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  Guardar Roles
                </button>
              </div>
            </div>
          )}

          {/* Tab: Por Usuarios */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecciona usuarios específicos que podrán acceder a esta reunión.
              </p>

              {/* Búsqueda */}
              <input
                type="text"
                placeholder="Buscar usuario por nombre o email..."
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />

              {/* Lista de usuarios */}
              {loadingUsuarios ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1b967a]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {usuariosFiltrados.map((usuario) => (
                    <label
                      key={usuario.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={usuariosSeleccionados.includes(usuario.id)}
                        onChange={() => handleToggleUsuario(usuario.id)}
                        className="w-4 h-4 text-[#1b967a] focus:ring-[#1b967a] rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                        <div className="text-xs text-gray-500">
                          {usuario.email} · {usuario.rol}
                        </div>
                      </div>
                    </label>
                  ))}
                  {usuariosFiltrados.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No se encontraron usuarios
                    </p>
                  )}
                </div>
              )}

              {/* Usuarios seleccionados */}
              {usuariosSeleccionados.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    {usuariosSeleccionados.length} usuario(s) seleccionado(s)
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <button
                  onClick={handleGuardarUsuarios}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  Guardar Usuarios
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
