# Test Assets - Recursos de Prueba

Esta carpeta contiene imagenes y documentos de ejemplo para usar en pruebas automatizadas y manuales del dashboard EcoPlaza.

## Estructura de Carpetas

```
docs/test-assets/
├── README.md              # Este archivo
├── dni/                   # Documentos de identidad
│   ├── dni-frente-*.jpg   # DNI anverso
│   └── dni-reverso-*.jpg  # DNI reverso
├── vouchers/              # Comprobantes bancarios
│   ├── voucher-bcp-*.jpg      # Vouchers BCP
│   ├── voucher-interbank-*.jpg # Vouchers Interbank
│   ├── voucher-bbva-*.jpg     # Vouchers BBVA
│   └── voucher-bn-*.jpg       # Vouchers Banco de la Nacion
├── contratos/             # Documentos contractuales
│   └── contrato-ejemplo-*.pdf
└── otros/                 # Otros documentos de prueba
```

## Convenciones de Nombres

### DNI
| Archivo | Descripcion |
|---------|-------------|
| `dni-frente-01.jpg` | DNI anverso - persona ejemplo 1 |
| `dni-frente-02.jpg` | DNI anverso - persona ejemplo 2 |
| `dni-reverso-01.jpg` | DNI reverso - persona ejemplo 1 |
| `dni-reverso-02.jpg` | DNI reverso - persona ejemplo 2 |
| `dni-frente-borroso.jpg` | DNI con baja calidad (para pruebas OCR) |
| `dni-frente-rotado.jpg` | DNI rotado (para pruebas de orientacion) |

### Vouchers Bancarios
| Archivo | Descripcion |
|---------|-------------|
| `voucher-bcp-deposito-01.jpg` | Voucher BCP deposito efectivo |
| `voucher-bcp-transferencia-01.jpg` | Voucher BCP transferencia |
| `voucher-interbank-deposito-01.jpg` | Voucher Interbank deposito |
| `voucher-interbank-yape-01.jpg` | Voucher Interbank via Yape |
| `voucher-bbva-deposito-01.jpg` | Voucher BBVA deposito |
| `voucher-bn-deposito-01.jpg` | Voucher Banco de la Nacion |
| `voucher-borroso-01.jpg` | Voucher con baja calidad |
| `voucher-parcial-01.jpg` | Voucher cortado/parcial |

## Uso en Pruebas

### Para Agentes QA (Playwright MCP)
```javascript
// Ruta base para test assets
const TEST_ASSETS_PATH = 'docs/test-assets';

// Subir DNI en prueba
await page.setInputFiles('input[type="file"]',
  `${TEST_ASSETS_PATH}/dni/dni-frente-01.jpg`
);

// Subir voucher en prueba
await page.setInputFiles('input[type="file"]',
  `${TEST_ASSETS_PATH}/vouchers/voucher-bcp-01.jpg`
);
```

### Para Agentes Frontend
Usar estas imagenes para:
- Probar el componente DocumentoOCRUploader
- Verificar previsualizacion de imagenes
- Testear validaciones de formato/tamano

### Rutas Absolutas (Windows)
```
E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\test-assets\dni\
E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\test-assets\vouchers\
```

## Imagenes Disponibles

### DNI Peruano Real (Wikimedia Commons - CC BY-SA 4.0)
- [x] `dni-frente-01.jpg` - DNI anverso modelo 2020 (324 KB)
- [x] `dni-reverso-01.png` - DNI reverso modelo 2020 (218 KB)

Fuente: [Wikimedia Commons - Identity cards of Peru](https://commons.wikimedia.org/wiki/Category:Identity_cards_of_Peru)

### DNI Sinteticos (Generados para pruebas OCR)

| # | Archivo Frente | Archivo Reverso | DNI | Nombre Completo | Ubicacion |
|---|----------------|-----------------|-----|-----------------|-----------|
| 1 | `dni-sintetico-01-frente.png` | `dni-sintetico-01-reverso.png` | 35849928 | ROBERTO CARLOS HERNANDEZ RAMIREZ | MIRAFLORES, LIMA |
| 2 | `dni-sintetico-02-frente.png` | `dni-sintetico-02-reverso.png` | 34296788 | PEDRO ANTONIO RAMIREZ SILVA | LA MOLINA, LIMA |
| 3 | `dni-sintetico-03-frente.png` | `dni-sintetico-03-reverso.png` | 77154533 | MIGUEL ANGEL LOPEZ SANCHEZ | WANCHAQ, CUSCO |
| 4 | `dni-sintetico-04-frente.png` | `dni-sintetico-04-reverso.png` | 99851297 | JOSE LUIS RODRIGUEZ HERNANDEZ | CENTRO, LA LIBERTAD |
| 5 | `dni-sintetico-05-frente.png` | `dni-sintetico-05-reverso.png` | 36107868 | ROBERTO CARLOS ROJAS GONZALEZ | SAN SEBASTIAN, CUSCO |
| 6 | `dni-sintetico-06-frente.png` | `dni-sintetico-06-reverso.png` | 24000314 | CARMEN JULIA RAMIREZ RODRIGUEZ | SURCO, LIMA |

**Generador:** `scripts/generate_synthetic_dni.py`

**Campos disponibles para OCR:**
- **Frente:** DNI, Apellido Paterno, Apellido Materno, Nombres, Fecha Nacimiento, Sexo
- **Reverso:** Ubigeo, Departamento, Provincia, Distrito, Direccion

### Vouchers Bancarios (Placeholder para pruebas)
- [x] `voucher-bcp-01.jpg` - Voucher BCP deposito (test)
- [x] `voucher-interbank-01.jpg` - Voucher Interbank (test)
- [x] `voucher-bbva-01.jpg` - Voucher BBVA (test)
- [x] `voucher-yape-01.jpg` - Voucher Yape (test)

> **Nota:** Los vouchers son imagenes placeholder generadas para pruebas. Contienen datos ficticios.

### Pendientes (Casos Edge para pruebas OCR)
- [ ] `dni-borroso.jpg` - DNI con baja calidad de imagen
- [ ] `dni-rotado.jpg` - DNI con rotacion de 90 grados
- [ ] `voucher-parcial.jpg` - Voucher recortado o incompleto
- [ ] `voucher-oscuro.jpg` - Voucher con poca iluminacion

## Especificaciones de Imagen

| Atributo | Valor Recomendado |
|----------|-------------------|
| Formato | JPG o PNG |
| Resolucion minima | 800x600 px |
| Resolucion maxima | 2000x1500 px |
| Tamano maximo | 5 MB |
| Calidad JPG | 80-90% |

## Datos de Prueba Esperados

### DNI de Ejemplo
Los DNI de prueba deberian tener datos ficticios pero realistas:
- Numero: 8 digitos (ej: 12345678)
- Nombres y apellidos ficticios
- Fecha nacimiento que resulte en persona mayor de edad

### Voucher de Ejemplo
Los vouchers de prueba deberian mostrar:
- Monto: Entre S/ 500 y S/ 50,000 o USD 100 - USD 15,000
- Fecha: Reciente (ultimo mes)
- Numero de operacion visible
- Nombre del depositante (puede ser ficticio)

## Seguridad

**IMPORTANTE**:
- NO usar documentos reales con datos personales
- Tachar o pixelar numeros de DNI reales si es necesario
- Los vouchers deben tener datos de prueba o anonimizados
- Estas imagenes NO deben subirse a repositorios publicos

## Contacto

Para agregar nuevas imagenes de prueba, coordinar con el Project Manager.
Las imagenes deben ser proporcionadas por el equipo de EcoPlaza.

---
Ultima actualizacion: 2 Enero 2026
