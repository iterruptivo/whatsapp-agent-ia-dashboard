// ============================================================================
// COMPONENT: TabButton
// ============================================================================
// Descripción: Botón de navegación reutilizable para tabs
// Features: Active state, hover effects, colores corporativos EcoPlaza
// ============================================================================

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export default function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-[#1b967a] text-white shadow-md'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-[#1b967a]'
      }`}
    >
      {label}
    </button>
  );
}
