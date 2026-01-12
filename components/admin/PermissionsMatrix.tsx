/**
 * PermissionsMatrix Component
 *
 * Matriz visual de permisos con checkboxes.
 * Permite asignar/remover permisos de un rol de forma intuitiva.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use client';

import { useState, useMemo } from 'react';
import { Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { Permission } from '@/lib/permissions/types';
import { MODULOS, ACCIONES } from '@/lib/permissions/types';

// ============================================================================
// TYPES
// ============================================================================

interface PermissionsMatrixProps {
  // Permisos actuales del rol
  selectedPermissions: Permission[];

  // Callback cuando cambian los permisos
  onChange: (permissions: Permission[]) => void;

  // Solo lectura (para vista de detalle)
  readOnly?: boolean;

  // Título personalizado
  title?: string;
}

// Definición de permisos disponibles por módulo
// Esto define qué acciones son aplicables a cada módulo
const PERMISOS_POR_MODULO: Record<string, string[]> = {
  [MODULOS.LEADS]: [
    ACCIONES.READ,
    ACCIONES.READ_ALL,
    ACCIONES.WRITE,
    ACCIONES.DELETE,
    ACCIONES.ASSIGN,
    ACCIONES.EXPORT,
    ACCIONES.IMPORT,
    ACCIONES.BULK_ACTIONS,
  ],
  [MODULOS.LOCALES]: [
    ACCIONES.READ,
    ACCIONES.READ_ALL,
    ACCIONES.WRITE,
    ACCIONES.DELETE,
    ACCIONES.CAMBIAR_ESTADO,
    ACCIONES.EXPORT,
    ACCIONES.ADMIN,
  ],
  [MODULOS.VENTAS]: [
    ACCIONES.READ,
    ACCIONES.WRITE,
    ACCIONES.DELETE,
    ACCIONES.CAMBIAR_PRECIO,
    ACCIONES.APPROVE,
  ],
  [MODULOS.CONTROL_PAGOS]: [
    ACCIONES.READ,
    ACCIONES.WRITE,
    ACCIONES.VERIFY,
    ACCIONES.GENERAR_CONSTANCIAS,
    ACCIONES.GENERAR_CONTRATOS,
    ACCIONES.EXPEDIENTE,
    ACCIONES.VALIDACION_BANCARIA,
  ],
  [MODULOS.COMISIONES]: [
    ACCIONES.READ,
    ACCIONES.READ_ALL,
    ACCIONES.EXPORT,
  ],
  [MODULOS.REPULSE]: [
    ACCIONES.READ,
    ACCIONES.WRITE,
    ACCIONES.CONFIG,
    ACCIONES.EXCLUDE,
  ],
  [MODULOS.APROBACIONES]: [
    ACCIONES.READ,
    ACCIONES.APPROVE,
    ACCIONES.REJECT,
    ACCIONES.CONFIG,
  ],
  [MODULOS.USUARIOS]: [
    ACCIONES.READ,
    ACCIONES.WRITE,
    ACCIONES.DELETE,
    ACCIONES.CHANGE_ROLE,
    ACCIONES.ASSIGN_PERMISSIONS,
    ACCIONES.VIEW_AUDIT,
  ],
  [MODULOS.PROYECTOS]: [
    ACCIONES.READ,
    ACCIONES.WRITE,
    ACCIONES.DELETE,
    ACCIONES.CONFIG,
  ],
  [MODULOS.INSIGHTS]: [
    ACCIONES.READ,
    ACCIONES.EXPORT,
  ],
  [MODULOS.REUNIONES]: [
    ACCIONES.READ,
    ACCIONES.READ_ALL,
    ACCIONES.WRITE,
    ACCIONES.DELETE,
  ],
  [MODULOS.CONFIGURACION]: [
    ACCIONES.READ,
    ACCIONES.WRITE,
    ACCIONES.WEBHOOKS,
    ACCIONES.INTEGRACIONES,
  ],
};

// Labels legibles para módulos
const MODULO_LABELS: Record<string, string> = {
  [MODULOS.LEADS]: 'Leads',
  [MODULOS.LOCALES]: 'Locales',
  [MODULOS.VENTAS]: 'Ventas',
  [MODULOS.CONTROL_PAGOS]: 'Control de Pagos',
  [MODULOS.COMISIONES]: 'Comisiones',
  [MODULOS.REPULSE]: 'Repulse',
  [MODULOS.APROBACIONES]: 'Aprobaciones',
  [MODULOS.USUARIOS]: 'Usuarios',
  [MODULOS.PROYECTOS]: 'Proyectos',
  [MODULOS.INSIGHTS]: 'Insights',
  [MODULOS.REUNIONES]: 'Reuniones',
  [MODULOS.CONFIGURACION]: 'Configuración',
};

// Labels legibles para acciones
const ACCION_LABELS: Record<string, string> = {
  [ACCIONES.READ]: 'Ver Propios',
  [ACCIONES.READ_ALL]: 'Ver Todos',
  [ACCIONES.WRITE]: 'Crear/Editar',
  [ACCIONES.DELETE]: 'Eliminar',
  [ACCIONES.EXPORT]: 'Exportar',
  [ACCIONES.IMPORT]: 'Importar',
  [ACCIONES.BULK_ACTIONS]: 'Acciones Masivas',
  [ACCIONES.ASSIGN]: 'Asignar',
  [ACCIONES.APPROVE]: 'Aprobar',
  [ACCIONES.REJECT]: 'Rechazar',
  [ACCIONES.VERIFY]: 'Verificar',
  [ACCIONES.CONFIG]: 'Configurar',
  [ACCIONES.ADMIN]: 'Administrar',
  [ACCIONES.CAMBIAR_ESTADO]: 'Cambiar Estado',
  [ACCIONES.CAMBIAR_PRECIO]: 'Cambiar Precio',
  [ACCIONES.GENERAR_CONSTANCIAS]: 'Generar Constancias',
  [ACCIONES.GENERAR_CONTRATOS]: 'Generar Contratos',
  [ACCIONES.EXPEDIENTE]: 'Ver Expediente',
  [ACCIONES.VALIDACION_BANCARIA]: 'Validación Bancaria',
  [ACCIONES.CHANGE_ROLE]: 'Cambiar Rol',
  [ACCIONES.ASSIGN_PERMISSIONS]: 'Asignar Permisos',
  [ACCIONES.VIEW_AUDIT]: 'Ver Auditoría',
  [ACCIONES.WEBHOOKS]: 'Webhooks',
  [ACCIONES.INTEGRACIONES]: 'Integraciones',
  [ACCIONES.EXCLUDE]: 'Excluir',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PermissionsMatrix({
  selectedPermissions,
  onChange,
  readOnly = false,
  title = 'Permisos del Rol',
}: PermissionsMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>(
    Object.values(MODULOS)
  );

  // Verificar si un permiso está seleccionado
  const isPermissionSelected = (modulo: string, accion: string): boolean => {
    return selectedPermissions.some(
      (p) => p.modulo === modulo && p.accion === accion
    );
  };

  // Toggle permiso individual
  const togglePermission = (modulo: string, accion: string) => {
    if (readOnly) return;

    const isSelected = isPermissionSelected(modulo, accion);

    if (isSelected) {
      // Remover
      const newPermissions = selectedPermissions.filter(
        (p) => !(p.modulo === modulo && p.accion === accion)
      );
      onChange(newPermissions);
    } else {
      // Agregar
      const newPermissions = [
        ...selectedPermissions,
        { modulo, accion },
      ];
      onChange(newPermissions);
    }
  };

  // Toggle todos los permisos de un módulo
  const toggleModulePermissions = (modulo: string) => {
    if (readOnly) return;

    const moduloAcciones = PERMISOS_POR_MODULO[modulo] || [];
    const allSelected = moduloAcciones.every((accion) =>
      isPermissionSelected(modulo, accion)
    );

    if (allSelected) {
      // Remover todos los permisos de este módulo
      const newPermissions = selectedPermissions.filter(
        (p) => p.modulo !== modulo
      );
      onChange(newPermissions);
    } else {
      // Agregar todos los permisos que faltan de este módulo
      const permissionsToAdd = moduloAcciones
        .filter((accion) => !isPermissionSelected(modulo, accion))
        .map((accion) => ({ modulo, accion }));

      onChange([...selectedPermissions, ...permissionsToAdd]);
    }
  };

  // Toggle expansión de módulo
  const toggleModuleExpansion = (modulo: string) => {
    if (expandedModules.includes(modulo)) {
      setExpandedModules(expandedModules.filter((m) => m !== modulo));
    } else {
      setExpandedModules([...expandedModules, modulo]);
    }
  };

  // Verificar si todos los permisos de un módulo están seleccionados
  const isModuleFullySelected = (modulo: string): boolean => {
    const moduloAcciones = PERMISOS_POR_MODULO[modulo] || [];
    return moduloAcciones.every((accion) => isPermissionSelected(modulo, accion));
  };

  // Verificar si algunos (pero no todos) los permisos de un módulo están seleccionados
  const isModulePartiallySelected = (modulo: string): boolean => {
    const moduloAcciones = PERMISOS_POR_MODULO[modulo] || [];
    const selectedCount = moduloAcciones.filter((accion) =>
      isPermissionSelected(modulo, accion)
    ).length;
    return selectedCount > 0 && selectedCount < moduloAcciones.length;
  };

  // Filtrar módulos por búsqueda
  const filteredModulos = useMemo(() => {
    if (!searchTerm) return Object.values(MODULOS);

    const term = searchTerm.toLowerCase();
    return Object.values(MODULOS).filter((modulo) => {
      const moduloLabel = MODULO_LABELS[modulo]?.toLowerCase() || '';
      const acciones = PERMISOS_POR_MODULO[modulo] || [];
      const accionesLabels = acciones
        .map((a) => ACCION_LABELS[a]?.toLowerCase() || '')
        .join(' ');

      return moduloLabel.includes(term) || accionesLabels.includes(term);
    });
  }, [searchTerm]);

  // Contar permisos seleccionados
  const totalPermisos = Object.values(PERMISOS_POR_MODULO).reduce(
    (acc, acciones) => acc + acciones.length,
    0
  );
  const permisosSeleccionados = selectedPermissions.length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#192c4d]">{title}</h3>
          <div className="text-sm text-gray-600">
            <span className="font-medium text-primary">
              {permisosSeleccionados}
            </span>
            {' / '}
            <span>{totalPermisos}</span>
            {' permisos'}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar módulo o permiso..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredModulos.map((modulo) => {
          const isExpanded = expandedModules.includes(modulo);
          const isFullySelected = isModuleFullySelected(modulo);
          const isPartiallySelected = isModulePartiallySelected(modulo);
          const acciones = PERMISOS_POR_MODULO[modulo] || [];

          return (
            <div
              key={modulo}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Module Header */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  isFullySelected
                    ? 'bg-primary/10'
                    : isPartiallySelected
                    ? 'bg-primary/5'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleModuleExpansion(modulo)}
                    className="p-1 hover:bg-white/50 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {/* Module Checkbox */}
                  {!readOnly && (
                    <button
                      onClick={() => toggleModulePermissions(modulo)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isFullySelected
                          ? 'bg-primary border-primary'
                          : isPartiallySelected
                          ? 'bg-primary/50 border-primary/50'
                          : 'border-gray-300 hover:border-primary'
                      }`}
                    >
                      {(isFullySelected || isPartiallySelected) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}

                  {/* Module Label */}
                  <span className="font-medium text-gray-900">
                    {MODULO_LABELS[modulo]}
                  </span>

                  {/* Permissions Count */}
                  <span className="text-xs text-gray-500">
                    ({acciones.filter((a) => isPermissionSelected(modulo, a)).length} / {acciones.length})
                  </span>
                </div>
              </div>

              {/* Module Permissions (Expanded) */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {acciones.map((accion) => {
                      const isSelected = isPermissionSelected(modulo, accion);

                      return (
                        <button
                          key={accion}
                          onClick={() => togglePermission(modulo, accion)}
                          disabled={readOnly}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>

                          {/* Action Label */}
                          <span
                            className={`text-sm font-medium ${
                              isSelected ? 'text-primary' : 'text-gray-700'
                            }`}
                          >
                            {ACCION_LABELS[accion] || accion}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {filteredModulos.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              No se encontraron módulos o permisos con "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
