'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  getTipificacionesTree,
  getTipificacionesNivel3,
  createTipificacionN1,
  createTipificacionN2,
  createTipificacionN3,
  updateTipificacion,
  toggleTipificacionActivo,
  type TipificacionTreeNode,
  type TipificacionNivel3,
} from '@/lib/actions-tipificaciones-config';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Power,
  Users,
  Layers,
  Tag,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

export default function ConfiguracionTipificacionesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [treeData, setTreeData] = useState<TipificacionTreeNode[]>([]);
  const [nivel3Data, setNivel3Data] = useState<TipificacionNivel3[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedN1, setExpandedN1] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showModalN1, setShowModalN1] = useState(false);
  const [showModalN2, setShowModalN2] = useState(false);
  const [showModalN3, setShowModalN3] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [formN1, setFormN1] = useState({ codigo: '', label: '' });
  const [formN2, setFormN2] = useState({ nivel_1_codigo: '', codigo: '', label: '' });
  const [formN3, setFormN3] = useState({ codigo: '', label: '' });
  const [editForm, setEditForm] = useState({ nivel: 1 as 1 | 2 | 3, id: '', label: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Only admin can access
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      router.push('/operativo');
    }
  }, [user, router]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [treeResult, n3Result] = await Promise.all([
        getTipificacionesTree(),
        getTipificacionesNivel3(),
      ]);

      if (treeResult.success) {
        setTreeData(treeResult.data);
      }

      if (n3Result.success) {
        setNivel3Data(n3Result.data);
      }
    } catch (error) {
      console.error('Error loading tipificaciones:', error);
      setMessage({ type: 'error', text: 'Error al cargar datos' });
    } finally {
      setIsLoading(false);
    }
  }

  // Toggle N1 expansion
  const toggleN1 = (codigo: string) => {
    setExpandedN1((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  // Create N1
  const handleCreateN1 = async () => {
    if (!formN1.codigo || !formN1.label) {
      setMessage({ type: 'error', text: 'Código y label son obligatorios' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await createTipificacionN1(formN1);
      if (result.success) {
        setMessage({ type: 'success', text: 'Nivel 1 creado exitosamente' });
        setShowModalN1(false);
        setFormN1({ codigo: '', label: '' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setIsSaving(false);
    }
  };

  // Create N2
  const handleCreateN2 = async () => {
    if (!formN2.nivel_1_codigo || !formN2.codigo || !formN2.label) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await createTipificacionN2(formN2);
      if (result.success) {
        setMessage({ type: 'success', text: 'Nivel 2 creado exitosamente' });
        setShowModalN2(false);
        setFormN2({ nivel_1_codigo: '', codigo: '', label: '' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setIsSaving(false);
    }
  };

  // Create N3
  const handleCreateN3 = async () => {
    if (!formN3.codigo || !formN3.label) {
      setMessage({ type: 'error', text: 'Código y label son obligatorios' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await createTipificacionN3(formN3);
      if (result.success) {
        setMessage({ type: 'success', text: 'Nivel 3 creado exitosamente' });
        setShowModalN3(false);
        setFormN3({ codigo: '', label: '' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setIsSaving(false);
    }
  };

  // Edit tipificacion
  const handleEditTipificacion = async () => {
    if (!editForm.label) {
      setMessage({ type: 'error', text: 'El label es obligatorio' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateTipificacion(editForm.nivel, editForm.id, {
        label: editForm.label,
      });
      if (result.success) {
        setMessage({ type: 'success', text: 'Tipificación actualizada' });
        setShowEditModal(false);
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle activo
  const handleToggleActivo = async (nivel: 1 | 2 | 3, id: string) => {
    try {
      const result = await toggleTipificacionActivo(nivel, id);
      if (result.success) {
        setMessage({ type: 'success', text: result.data.message });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado' });
    }
  };

  // Open edit modal
  const openEditModal = (nivel: 1 | 2 | 3, id: string, label: string) => {
    setEditForm({ nivel, id, label });
    setShowEditModal(true);
  };

  // Open add N2 modal for specific N1
  const openAddN2Modal = (nivel1Codigo: string) => {
    setFormN2({ nivel_1_codigo: nivel1Codigo, codigo: '', label: '' });
    setShowModalN2(true);
  };

  // Clear message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (user?.rol !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Configuración de Tipificaciones"
        subtitle="Administra las tipificaciones disponibles para clasificar leads"
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className="w-8 h-8 text-[#1b967a]" />
            <h1 className="text-2xl font-bold text-[#192c4d]">Tipificaciones</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModalN1(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo N1
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: N1 → N2 Tree */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#192c4d]">Árbol N1 → N2</h2>
                <span className="text-sm text-gray-500">
                  {treeData.length} categorías principales
                </span>
              </div>

              <div className="space-y-2">
                {treeData.map((node) => {
                  const isExpanded = expandedN1.includes(node.nivel1.codigo);
                  const hasN2 = node.nivel2List.length > 0;

                  return (
                    <div key={node.nivel1.id} className="border rounded-lg overflow-hidden">
                      {/* N1 Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100">
                        <button
                          onClick={() => toggleN1(node.nivel1.codigo)}
                          className="flex items-center gap-2 flex-1"
                        >
                          {hasN2 ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )
                          ) : (
                            <div className="w-4" />
                          )}
                          <span className="font-medium text-gray-900">{node.nivel1.label}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            ({node.nivel1.codigo})
                          </span>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Badge uso count */}
                          <span
                            className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                              node.uso_count > 0
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            {node.uso_count}
                          </span>

                          {/* Agregar N2 button */}
                          <button
                            onClick={() => openAddN2Modal(node.nivel1.codigo)}
                            className="p-1 text-[#1b967a] hover:bg-green-50 rounded"
                            title="Agregar Nivel 2"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(1, node.nivel1.id, node.nivel1.label)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle activo button */}
                          <button
                            onClick={() => handleToggleActivo(1, node.nivel1.id)}
                            className={`p-1 rounded ${
                              node.uso_count > 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            disabled={node.uso_count > 0}
                            title={
                              node.uso_count > 0
                                ? `En uso por ${node.uso_count} leads`
                                : 'Desactivar'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* N2 Items */}
                      {isExpanded && hasN2 && (
                        <div className="divide-y bg-white">
                          {node.nivel2List.map((n2) => (
                            <div
                              key={n2.id}
                              className={`flex items-center justify-between px-8 py-2.5 hover:bg-gray-50 ${
                                (n2.uso_count || 0) > 0 ? 'bg-blue-50/30' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                <span className="text-sm text-gray-700">{n2.label}</span>
                                <span className="text-xs text-gray-400">({n2.codigo})</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Badge uso count */}
                                <span
                                  className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                                    (n2.uso_count || 0) > 0
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <Users className="w-3 h-3" />
                                  {n2.uso_count || 0}
                                </span>

                                {/* Edit button */}
                                <button
                                  onClick={() => openEditModal(2, n2.id, n2.label)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Toggle activo button */}
                                <button
                                  onClick={() => handleToggleActivo(2, n2.id)}
                                  className={`p-1 rounded ${
                                    (n2.uso_count || 0) > 0
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-red-600 hover:bg-red-50'
                                  }`}
                                  disabled={(n2.uso_count || 0) > 0}
                                  title={
                                    (n2.uso_count || 0) > 0
                                      ? `En uso por ${n2.uso_count} leads`
                                      : 'Desactivar'
                                  }
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: N3 List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#1b967a]" />
                  <h2 className="text-lg font-semibold text-[#192c4d]">Nivel 3 (Independientes)</h2>
                </div>
                <button
                  onClick={() => setShowModalN3(true)}
                  className="p-1 text-[#1b967a] hover:bg-green-50 rounded"
                  title="Agregar Nivel 3"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {nivel3Data.map((n3) => (
                  <div
                    key={n3.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                      (n3.uso_count || 0) > 0 ? 'bg-blue-50/30 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{n3.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{n3.codigo}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Badge uso count */}
                      <span
                        className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                          (n3.uso_count || 0) > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        {n3.uso_count || 0}
                      </span>

                      {/* Edit button */}
                      <button
                        onClick={() => openEditModal(3, n3.id, n3.label)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Toggle activo button */}
                      <button
                        onClick={() => handleToggleActivo(3, n3.id)}
                        className={`p-1 rounded ${
                          (n3.uso_count || 0) > 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        disabled={(n3.uso_count || 0) > 0}
                        title={
                          (n3.uso_count || 0) > 0
                            ? `En uso por ${n3.uso_count} leads`
                            : 'Desactivar'
                        }
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {nivel3Data.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay tipificaciones N3</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Instrucciones</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Nivel 1 y Nivel 2 son jerárquicos (N1 contiene múltiples N2)</li>
            <li>• Nivel 3 es independiente (no tiene relación jerárquica)</li>
            <li>
              • El badge <Users className="w-3 h-3 inline" /> muestra cuántos leads usan cada
              tipificación
            </li>
            <li>• No se puede desactivar una tipificación que esté en uso</li>
            <li>• Haz clic en el ícono lápiz para editar el label de una tipificación</li>
          </ul>
        </div>
      </main>

      {/* Modal: Create N1 */}
      {showModalN1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#192c4d]">Crear Nivel 1</h3>
              <button onClick={() => setShowModalN1(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={formN1.codigo}
                  onChange={(e) => setFormN1({ ...formN1, codigo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                  placeholder="ej: contactado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={formN1.label}
                  onChange={(e) => setFormN1({ ...formN1, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                  placeholder="ej: Contactado"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowModalN1(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateN1}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create N2 */}
      {showModalN2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#192c4d]">Crear Nivel 2</h3>
              <button onClick={() => setShowModalN2(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel 1 Padre</label>
                <select
                  value={formN2.nivel_1_codigo}
                  onChange={(e) => setFormN2({ ...formN2, nivel_1_codigo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                >
                  <option value="">Seleccionar...</option>
                  {treeData.map((node) => (
                    <option key={node.nivel1.codigo} value={node.nivel1.codigo}>
                      {node.nivel1.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={formN2.codigo}
                  onChange={(e) => setFormN2({ ...formN2, codigo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                  placeholder="ej: interesado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={formN2.label}
                  onChange={(e) => setFormN2({ ...formN2, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                  placeholder="ej: Interesado"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowModalN2(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateN2}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create N3 */}
      {showModalN3 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#192c4d]">Crear Nivel 3</h3>
              <button onClick={() => setShowModalN3(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={formN3.codigo}
                  onChange={(e) => setFormN3({ ...formN3, codigo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                  placeholder="ej: primera_visita"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={formN3.label}
                  onChange={(e) => setFormN3({ ...formN3, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                  placeholder="ej: Primera Visita"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowModalN3(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateN3}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Tipificacion */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#192c4d]">
                Editar Nivel {editForm.nivel}
              </h3>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-[#1b967a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditTipificacion}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
