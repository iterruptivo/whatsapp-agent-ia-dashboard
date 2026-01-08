'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Key,
  ToggleLeft,
  ToggleRight,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Upload,
  UserCog,
  ArrowRightLeft,
} from 'lucide-react';
import {
  type UsuarioConDatos,
  toggleUsuarioActivo,
} from '@/lib/actions-usuarios';
import UsuarioFormModal from './UsuarioFormModal';
import ResetPasswordModal from './ResetPasswordModal';
import UsuarioImportModal from './UsuarioImportModal';
import ReemplazarUsuarioModal from './ReemplazarUsuarioModal';

interface UsuariosClientProps {
  initialUsuarios: UsuarioConDatos[];
  initialStats: {
    total: number;
    activos: number;
    inactivos: number;
    porRol: Record<string, number>;
  };
  onRefresh: () => Promise<void>;
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  jefe_ventas: 'Jefe de Ventas',
  vendedor: 'Vendedor',
  vendedor_caseta: 'Vendedor Caseta',
  coordinador: 'Coordinador',
  finanzas: 'Finanzas',
  marketing: 'Marketing',
};

const ROL_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  jefe_ventas: 'bg-blue-100 text-blue-800',
  vendedor: 'bg-green-100 text-green-800',
  vendedor_caseta: 'bg-teal-100 text-teal-800',
  coordinador: 'bg-indigo-100 text-indigo-800',
  finanzas: 'bg-orange-100 text-orange-800',
  marketing: 'bg-pink-100 text-pink-800',
};

export default function UsuariosClient({
  initialUsuarios,
  initialStats,
  onRefresh,
}: UsuariosClientProps) {
  const [usuarios] = useState<UsuarioConDatos[]>(initialUsuarios);
  const [stats] = useState(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReemplazarModal, setShowReemplazarModal] = useState(false);
  const [usuarioEditing, setUsuarioEditing] = useState<UsuarioConDatos | null>(null);
  const [usuarioReset, setUsuarioReset] = useState<UsuarioConDatos | null>(null);
  const [usuarioReemplazar, setUsuarioReemplazar] = useState<UsuarioConDatos | null>(null);

  // Loading states for toggle
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filtrar usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      // Búsqueda por nombre o email
      const matchSearch =
        searchTerm === '' ||
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.telefono && u.telefono.includes(searchTerm));

      // Filtro por rol
      const matchRol = filtroRol === 'todos' || u.rol === filtroRol;

      // Filtro por estado
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && u.activo) ||
        (filtroEstado === 'inactivos' && !u.activo);

      return matchSearch && matchRol && matchEstado;
    });
  }, [usuarios, searchTerm, filtroRol, filtroEstado]);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleCreateClick = () => {
    setUsuarioEditing(null);
    setShowFormModal(true);
  };

  const handleEditClick = (usuario: UsuarioConDatos) => {
    setUsuarioEditing(usuario);
    setShowFormModal(true);
  };

  const handleResetClick = (usuario: UsuarioConDatos) => {
    setUsuarioReset(usuario);
    setShowResetModal(true);
  };

  const handleReemplazarClick = (usuario: UsuarioConDatos) => {
    setUsuarioReemplazar(usuario);
    setShowReemplazarModal(true);
  };

  const handleToggleActivo = async (usuario: UsuarioConDatos) => {
    setTogglingId(usuario.id);
    try {
      const result = await toggleUsuarioActivo(usuario.id);
      if (result.success) {
        await onRefresh();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error toggling usuario:', error);
      alert('Error al cambiar estado del usuario');
    } finally {
      setTogglingId(null);
    }
  };

  const handleFormSuccess = async () => {
    setShowFormModal(false);
    setUsuarioEditing(null);
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactivos</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactivos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.porRol).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Usuarios del Sistema
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importar</span>
              </button>
              <button
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Usuario</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Filter by rol */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white"
              >
                <option value="todos">Todos los roles</option>
                <option value="admin">Administrador</option>
                <option value="jefe_ventas">Jefe de Ventas</option>
                <option value="vendedor">Vendedor</option>
                <option value="vendedor_caseta">Vendedor Caseta</option>
                <option value="coordinador">Coordinador</option>
                <option value="finanzas">Finanzas</option>
              </select>
            </div>

            {/* Filter by estado */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white"
              >
                <option value="todos">Todos los estados</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900">{usuario.nombre}</p>
                        {/* Ícono de reemplazo */}
                        {(usuario.reemplazaANombre || usuario.reemplazadoPorNombre) && (
                          <span
                            className="inline-flex items-center"
                            title={
                              usuario.reemplazadoPorNombre
                                ? `Fue reemplazado por: ${usuario.reemplazadoPorNombre}`
                                : `Reemplaza a: ${usuario.reemplazaANombre}`
                            }
                          >
                            <ArrowRightLeft
                              className={`w-3.5 h-3.5 ${
                                usuario.reemplazadoPorNombre
                                  ? 'text-red-500'    // Fue reemplazado (inactivo)
                                  : 'text-amber-500'  // Reemplaza a otro
                              }`}
                            />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {usuario.telefono && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {usuario.telefono}
                        </p>
                      )}
                      {usuario.email_alternativo && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {usuario.email_alternativo}
                        </p>
                      )}
                      {!usuario.telefono && !usuario.email_alternativo && (
                        <p className="text-sm text-gray-400 italic">Sin datos</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ROL_COLORS[usuario.rol] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ROL_LABELS[usuario.rol] || usuario.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        usuario.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditClick(usuario)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetClick(usuario)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {/* Botón Reemplazar: solo para usuarios activos con teléfono */}
                      {usuario.activo && usuario.telefono && (
                        <button
                          onClick={() => handleReemplazarClick(usuario)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Reemplazar Usuario"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActivo(usuario)}
                        disabled={togglingId === usuario.id}
                        className={`p-2 rounded-lg transition-colors ${
                          usuario.activo
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}
                        title={usuario.activo ? 'Desactivar' : 'Activar'}
                      >
                        {togglingId === usuario.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : usuario.activo ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden divide-y divide-gray-200">
          {usuariosFiltrados.map((usuario) => (
            <div key={usuario.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-gray-900">{usuario.nombre}</p>
                    {/* Ícono de reemplazo - Mobile */}
                    {(usuario.reemplazaANombre || usuario.reemplazadoPorNombre) && (
                      <ArrowRightLeft
                        className={`w-3.5 h-3.5 ${
                          usuario.reemplazadoPorNombre
                            ? 'text-red-500'
                            : 'text-amber-500'
                        }`}
                        title={
                          usuario.reemplazadoPorNombre
                            ? `Fue reemplazado por: ${usuario.reemplazadoPorNombre}`
                            : `Reemplaza a: ${usuario.reemplazaANombre}`
                        }
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{usuario.email}</p>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    usuario.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    ROL_COLORS[usuario.rol] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ROL_LABELS[usuario.rol] || usuario.rol}
                </span>
                {usuario.telefono && (
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {usuario.telefono}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                <button
                  onClick={() => handleEditClick(usuario)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleResetClick(usuario)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  Reset
                </button>
                {/* Botón Reemplazar Mobile */}
                {usuario.activo && usuario.telefono && (
                  <button
                    onClick={() => handleReemplazarClick(usuario)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <UserCog className="w-4 h-4" />
                    Reemplazar
                  </button>
                )}
                <button
                  onClick={() => handleToggleActivo(usuario)}
                  disabled={togglingId === usuario.id}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    usuario.activo
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                  } disabled:opacity-50`}
                >
                  {togglingId === usuario.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : usuario.activo ? (
                    <>
                      <ToggleRight className="w-4 h-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" />
                      Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {usuariosFiltrados.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron usuarios</p>
            <p className="text-sm text-gray-400">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showFormModal && (
        <UsuarioFormModal
          usuario={usuarioEditing}
          onClose={() => {
            setShowFormModal(false);
            setUsuarioEditing(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showResetModal && usuarioReset && (
        <ResetPasswordModal
          usuario={usuarioReset}
          onClose={() => {
            setShowResetModal(false);
            setUsuarioReset(null);
          }}
        />
      )}

      {showImportModal && (
        <UsuarioImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={async () => {
            setShowImportModal(false);
            await onRefresh();
          }}
        />
      )}

      {showReemplazarModal && usuarioReemplazar && (
        <ReemplazarUsuarioModal
          usuario={usuarioReemplazar}
          onClose={() => {
            setShowReemplazarModal(false);
            setUsuarioReemplazar(null);
          }}
          onSuccess={async () => {
            setShowReemplazarModal(false);
            setUsuarioReemplazar(null);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}
