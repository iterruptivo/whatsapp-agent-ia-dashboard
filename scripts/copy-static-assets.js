/**
 * Script para copiar assets estáticos a la carpeta public antes del build
 * Esto permite tener archivos externos (como Sherpa) trackeados en git
 * pero servidos desde /public/ en producción
 */

const fs = require('fs');
const path = require('path');

// Configuración de assets a copiar
const ASSETS_TO_COPY = [
  {
    source: 'static-assets/sherpa',
    destination: 'public/sherpa'
  }
  // Agregar más assets aquí si es necesario en el futuro
];

function copyRecursive(src, dest) {
  // Crear directorio destino si no existe
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${entry.name}`);
    }
  }
}

console.log('📦 Copiando static assets a public/...\n');

let hasErrors = false;

for (const asset of ASSETS_TO_COPY) {
  const srcPath = path.resolve(process.cwd(), asset.source);
  const destPath = path.resolve(process.cwd(), asset.destination);

  if (!fs.existsSync(srcPath)) {
    console.error(`❌ Error: No se encontró ${asset.source}`);
    hasErrors = true;
    continue;
  }

  console.log(`📁 ${asset.source} → ${asset.destination}`);
  copyRecursive(srcPath, destPath);
  console.log('');
}

if (hasErrors) {
  console.error('⚠️  Algunos assets no se pudieron copiar');
  process.exit(1);
} else {
  console.log('✅ Todos los assets copiados correctamente\n');
}
