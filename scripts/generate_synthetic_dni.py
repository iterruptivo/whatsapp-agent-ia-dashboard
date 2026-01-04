#!/usr/bin/env python3
"""
Generador de DNI Peruanos Sinteticos para Pruebas
==================================================
Crea imagenes de DNI (frente y reverso) con datos ficticios
para testing del OCR con GPT-4 Vision.

Uso: python generate_synthetic_dni.py
"""

from PIL import Image, ImageDraw, ImageFont
import os
import random
from datetime import datetime, timedelta

# Configuracion
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs', 'test-assets', 'dni')

# Datos ficticios para generar DNIs variados
NOMBRES_MASCULINOS = [
    "CARLOS ALBERTO", "JOSE LUIS", "MIGUEL ANGEL", "JUAN PABLO",
    "ROBERTO CARLOS", "PEDRO ANTONIO"
]

NOMBRES_FEMENINOS = [
    "MARIA ELENA", "ANA LUCIA", "ROSA MARIA", "CARMEN JULIA",
    "LUCIA FERNANDA", "PATRICIA ISABEL"
]

APELLIDOS = [
    "GARCIA", "RODRIGUEZ", "MARTINEZ", "LOPEZ", "GONZALEZ",
    "HERNANDEZ", "PEREZ", "SANCHEZ", "RAMIREZ", "TORRES",
    "FLORES", "RIVERA", "MORALES", "ORTIZ", "CHAVEZ",
    "CASTILLO", "VASQUEZ", "ROJAS", "MENDOZA", "SILVA"
]

DEPARTAMENTOS = ["LIMA", "AREQUIPA", "CUSCO", "LA LIBERTAD", "PIURA", "CALLAO"]
PROVINCIAS = {
    "LIMA": ["LIMA", "HUARAL", "CANTA"],
    "AREQUIPA": ["AREQUIPA", "CAMANA", "ISLAY"],
    "CUSCO": ["CUSCO", "URUBAMBA", "CALCA"],
    "LA LIBERTAD": ["TRUJILLO", "ASCOPE", "PACASMAYO"],
    "PIURA": ["PIURA", "SULLANA", "TALARA"],
    "CALLAO": ["CALLAO"]
}

DISTRITOS = {
    "LIMA": ["MIRAFLORES", "SAN ISIDRO", "SURCO", "LA MOLINA", "SAN BORJA", "LINCE"],
    "AREQUIPA": ["CAYMA", "YANAHUARA", "CERRO COLORADO", "SACHACA"],
    "CUSCO": ["WANCHAQ", "SAN SEBASTIAN", "SANTIAGO"],
    "TRUJILLO": ["TRUJILLO", "VICTOR LARCO", "HUANCHACO"],
    "PIURA": ["PIURA", "CASTILLA", "CATACAOS"],
    "CALLAO": ["CALLAO", "BELLAVISTA", "LA PERLA", "LA PUNTA"]
}

CALLES = ["AV. LARCO", "JR. PUNO", "CALLE LOS OLIVOS", "AV. AREQUIPA",
          "JR. CUSCO", "AV. BRASIL", "CALLE LIMA", "JR. TACNA",
          "AV. JAVIER PRADO", "CALLE SAN MARTIN"]

def generate_dni_number():
    """Genera numero de DNI aleatorio de 8 digitos"""
    return str(random.randint(10000000, 99999999))

def generate_birth_date():
    """Genera fecha de nacimiento aleatoria (18-70 anos)"""
    today = datetime.now()
    age = random.randint(18, 70)
    birth_year = today.year - age
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    return datetime(birth_year, birth_month, birth_day)

def generate_address():
    """Genera direccion aleatoria"""
    calle = random.choice(CALLES)
    numero = random.randint(100, 2000)
    return f"{calle} {numero}"

def get_font(size=20):
    """Obtiene fuente, usa default si no hay fuentes del sistema"""
    try:
        # Intenta usar Arial o una fuente similar
        return ImageFont.truetype("arial.ttf", size)
    except:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except:
            return ImageFont.load_default()

def create_dni_frente(data, filename):
    """Crea imagen del frente del DNI"""
    # Dimensiones del DNI (tarjeta ID3)
    width, height = 856, 540

    # Crear imagen con fondo azul claro
    img = Image.new('RGB', (width, height), color=(240, 248, 255))
    draw = ImageDraw.Draw(img)

    # Fuentes
    font_title = get_font(24)
    font_label = get_font(14)
    font_data = get_font(18)
    font_dni = get_font(32)

    # Header
    draw.rectangle([(0, 0), (width, 80)], fill=(0, 51, 102))
    draw.text((width//2, 20), "REPUBLICA DEL PERU", fill='white', font=font_title, anchor='mt')
    draw.text((width//2, 50), "DOCUMENTO NACIONAL DE IDENTIDAD", fill='white', font=font_label, anchor='mt')

    # Foto placeholder (rectangulo gris)
    photo_x, photo_y = 40, 100
    photo_w, photo_h = 180, 220
    draw.rectangle([(photo_x, photo_y), (photo_x + photo_w, photo_y + photo_h)],
                   fill=(200, 200, 200), outline=(100, 100, 100), width=2)
    draw.text((photo_x + photo_w//2, photo_y + photo_h//2), "FOTO",
              fill=(100, 100, 100), font=font_title, anchor='mm')

    # Datos personales
    data_x = 250
    y = 100
    line_height = 45

    # DNI (grande y destacado)
    draw.rectangle([(data_x, y), (width - 40, y + 50)], fill=(255, 255, 220), outline=(0, 51, 102))
    draw.text((data_x + 10, y + 5), "DNI", fill=(0, 51, 102), font=font_label)
    draw.text((data_x + 60, y + 8), data['dni'], fill=(0, 51, 102), font=font_dni)

    y += 60

    # Apellido Paterno
    draw.text((data_x, y), "APELLIDO PATERNO", fill=(100, 100, 100), font=font_label)
    draw.text((data_x, y + 15), data['apellido_paterno'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Apellido Materno
    draw.text((data_x, y), "APELLIDO MATERNO", fill=(100, 100, 100), font=font_label)
    draw.text((data_x, y + 15), data['apellido_materno'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Nombres
    draw.text((data_x, y), "NOMBRES", fill=(100, 100, 100), font=font_label)
    draw.text((data_x, y + 15), data['nombres'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Fecha de nacimiento
    draw.text((data_x, y), "FECHA DE NACIMIENTO", fill=(100, 100, 100), font=font_label)
    draw.text((data_x, y + 15), data['fecha_nacimiento'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Sexo
    draw.text((data_x, y), "SEXO", fill=(100, 100, 100), font=font_label)
    draw.text((data_x, y + 15), data['sexo'], fill=(0, 0, 0), font=font_data)

    # Footer
    draw.rectangle([(0, height - 40), (width, height)], fill=(0, 51, 102))
    draw.text((width//2, height - 20), "REGISTRO NACIONAL DE IDENTIFICACION Y ESTADO CIVIL",
              fill='white', font=font_label, anchor='mm')

    # Guardar
    img.save(filename, 'PNG', quality=95)
    print(f"  Creado: {os.path.basename(filename)}")

def create_dni_reverso(data, filename):
    """Crea imagen del reverso del DNI"""
    width, height = 856, 540

    # Crear imagen con fondo crema
    img = Image.new('RGB', (width, height), color=(255, 253, 245))
    draw = ImageDraw.Draw(img)

    # Fuentes
    font_title = get_font(20)
    font_label = get_font(12)
    font_data = get_font(16)

    # Header
    draw.rectangle([(0, 0), (width, 50)], fill=(0, 51, 102))
    draw.text((width//2, 25), "DIRECCION DOMICILIARIA", fill='white', font=font_title, anchor='mm')

    y = 70
    line_height = 55
    margin = 40

    # Ubigeo
    draw.text((margin, y), "UBIGEO", fill=(100, 100, 100), font=font_label)
    draw.text((margin, y + 15), data['ubigeo'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Departamento
    draw.text((margin, y), "DEPARTAMENTO", fill=(100, 100, 100), font=font_label)
    draw.text((margin, y + 15), data['departamento'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Provincia
    draw.text((margin, y), "PROVINCIA", fill=(100, 100, 100), font=font_label)
    draw.text((margin, y + 15), data['provincia'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Distrito
    draw.text((margin, y), "DISTRITO", fill=(100, 100, 100), font=font_label)
    draw.text((margin, y + 15), data['distrito'], fill=(0, 0, 0), font=font_data)
    y += line_height

    # Direccion
    draw.text((margin, y), "DIRECCION", fill=(100, 100, 100), font=font_label)
    draw.text((margin, y + 15), data['direccion'], fill=(0, 0, 0), font=font_data)
    y += line_height + 20

    # Codigo de barras simulado
    barcode_y = y
    barcode_height = 60
    draw.rectangle([(margin, barcode_y), (width - margin, barcode_y + barcode_height)],
                   fill='white', outline=(0, 0, 0))

    # Simular barras
    x = margin + 10
    while x < width - margin - 10:
        bar_width = random.randint(1, 4)
        if random.random() > 0.5:
            draw.rectangle([(x, barcode_y + 5), (x + bar_width, barcode_y + barcode_height - 5)],
                          fill='black')
        x += bar_width + random.randint(1, 3)

    # Footer
    draw.rectangle([(0, height - 40), (width, height)], fill=(0, 51, 102))
    draw.text((width//2, height - 20), "RENIEC", fill='white', font=font_title, anchor='mm')

    # Guardar
    img.save(filename, 'PNG', quality=95)
    print(f"  Creado: {os.path.basename(filename)}")

def generate_synthetic_dni_pair(index):
    """Genera un par de DNI (frente y reverso) con datos aleatorios"""
    # Determinar sexo
    sexo = random.choice(['M', 'F'])

    # Generar datos
    if sexo == 'M':
        nombres = random.choice(NOMBRES_MASCULINOS)
    else:
        nombres = random.choice(NOMBRES_FEMENINOS)

    apellido_paterno = random.choice(APELLIDOS)
    apellido_materno = random.choice([a for a in APELLIDOS if a != apellido_paterno])

    departamento = random.choice(DEPARTAMENTOS)
    provincia = random.choice(PROVINCIAS.get(departamento, [departamento]))

    # Para distritos, buscar en el diccionario
    distrito_key = provincia if provincia in DISTRITOS else departamento
    distrito = random.choice(DISTRITOS.get(distrito_key, ["CENTRO"]))

    birth_date = generate_birth_date()

    # Generar ubigeo (6 digitos)
    ubigeo = f"{random.randint(10, 25)}{random.randint(1, 99):02d}{random.randint(1, 99):02d}"

    data = {
        'dni': generate_dni_number(),
        'nombres': nombres,
        'apellido_paterno': apellido_paterno,
        'apellido_materno': apellido_materno,
        'fecha_nacimiento': birth_date.strftime('%d/%m/%Y'),
        'sexo': sexo,
        'departamento': departamento,
        'provincia': provincia,
        'distrito': distrito,
        'direccion': generate_address(),
        'ubigeo': ubigeo
    }

    # Crear archivos
    frente_file = os.path.join(OUTPUT_DIR, f'dni-sintetico-{index:02d}-frente.png')
    reverso_file = os.path.join(OUTPUT_DIR, f'dni-sintetico-{index:02d}-reverso.png')

    print(f"\nGenerando DNI #{index}: {data['nombres']} {data['apellido_paterno']}")
    print(f"  DNI: {data['dni']} | Sexo: {data['sexo']} | Nac: {data['fecha_nacimiento']}")
    print(f"  Ubicacion: {data['distrito']}, {data['provincia']}, {data['departamento']}")

    create_dni_frente(data, frente_file)
    create_dni_reverso(data, reverso_file)

    return data

def main():
    print("=" * 60)
    print("GENERADOR DE DNI SINTETICOS PARA PRUEBAS")
    print("=" * 60)

    # Crear directorio si no existe
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generar 6 pares de DNI
    all_data = []
    for i in range(1, 7):
        data = generate_synthetic_dni_pair(i)
        all_data.append(data)

    print("\n" + "=" * 60)
    print(f"COMPLETADO: {len(all_data)} pares de DNI generados")
    print(f"Ubicacion: {OUTPUT_DIR}")
    print("=" * 60)

    # Mostrar resumen
    print("\nRESUMEN DE DNIs GENERADOS:")
    print("-" * 60)
    for i, d in enumerate(all_data, 1):
        print(f"{i}. {d['dni']} - {d['nombres']} {d['apellido_paterno']} {d['apellido_materno']}")
        print(f"   Sexo: {d['sexo']} | {d['distrito']}, {d['departamento']}")

if __name__ == "__main__":
    main()
