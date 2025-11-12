# 🗺️ ROADMAP DE MEJORAS - Sistema de Documentación

**Estado Actual:** Reestructuración Modular (Solución #1) ✅ Implementada
**Fecha:** 10 Noviembre 2025

---

## 📊 ESTADO ACTUAL DEL SISTEMA

### ✅ SOLUCIÓN #1 IMPLEMENTADA: Reestructuración Modular

**Fecha de Implementación:** 10 Noviembre 2025
**Commit:** `e7219b6`

**Estructura Actual:**
```
docs/
├── modulos/
│   ├── auth.md (1,245 líneas)
│   ├── leads.md (956 líneas)
│   └── locales.md (842 líneas)
├── sesiones/
│   └── 2025-11-noviembre.md
└── CLAUDE.md (351 líneas - índice maestro)
```

**Resultados:**
- ✅ CLAUDE.md reducido de 5,892 → 351 líneas (94% reducción)
- ✅ Cada módulo <1,500 líneas (legible en una vista)
- ✅ Navegación clara con índice maestro
- ✅ Versionado en GitHub

**Capacidad Actual:**
- Soporta hasta ~50-60 sesiones más antes de que módulos individuales crezcan demasiado
- Estimado: 6-8 meses de desarrollo a ritmo actual

---

## 🔮 SOLUCIONES FUTURAS (Roadmap)

### 🎯 SOLUCIÓN #2: Python CLI Knowledge Navigator (PRÓXIMA)

**PRIORIDAD:** 🟡 MEDIA-ALTA

**CUÁNDO IMPLEMENTAR:**
- ✅ Cuando módulos individuales excedan 2,000 líneas
- ✅ Cuando buscar información manualmente tome >2 minutos
- ✅ Cuando haya >10 módulos diferentes
- ✅ Estimado: **3-6 meses desde ahora** (Marzo-Junio 2026)

---

#### Descripción de la Solución:

**Herramienta CLI (Command Line Interface) en Python** que permite búsqueda y navegación rápida en documentación sin necesidad de abrir archivos manualmente.

**Comandos Propuestos:**
```bash
# Buscar por sesión
$ python doc-nav.py session 42
→ Muestra: Resumen de Sesión 42 + archivos relacionados

# Buscar por feature
$ python doc-nav.py feature "session loss"
→ Encuentra: auth.md (Sesiones 28, 29, 35B, 36, 39, 42)

# Buscar por archivo
$ python doc-nav.py file "lib/auth-context.tsx"
→ Lista: Todas las sesiones que modificaron este archivo

# Buscar cambios recientes
$ python doc-nav.py recent 5
→ Muestra: Últimas 5 sesiones con resumen

# Buscar por palabra clave
$ python doc-nav.py search "useEffect"
→ Encuentra: Todas las referencias a useEffect en docs
```

---

#### Implementación Paso a Paso:

**FASE 1: Indexación de Documentos (2 horas)**

**Archivo:** `scripts/doc-nav.py`

```python
#!/usr/bin/env python3
"""
Knowledge Navigator - CLI para navegación rápida de documentación
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict

# Directorio base de documentación
DOCS_DIR = Path(__file__).parent.parent / "docs"

def index_documents() -> Dict:
    """
    Indexa todos los archivos .md y extrae metadatos
    """
    index = {
        "sessions": {},
        "modules": {},
        "files": {}
    }

    # Indexar módulos
    modulos_dir = DOCS_DIR / "modulos"
    for md_file in modulos_dir.glob("*.md"):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

            # Extraer sesiones mencionadas (regex: Sesión XX)
            sessions = re.findall(r'Sesión (\d+[A-Z]?)', content)

            # Extraer archivos modificados (regex: **ARCHIVO:** `path/to/file`)
            files = re.findall(r'\*\*ARCHIVO:\*\* `([^`]+)`', content)

            index["modules"][md_file.stem] = {
                "path": str(md_file),
                "sessions": list(set(sessions)),
                "files": list(set(files))
            }

    # Indexar sesiones individuales
    sesiones_dir = DOCS_DIR / "sesiones"
    for md_file in sesiones_dir.glob("*.md"):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Similar indexación

    return index

def search_by_session(session_num: str, index: Dict):
    """
    Busca documentación de sesión específica
    """
    print(f"\n🔍 Buscando Sesión {session_num}...\n")

    found = False
    for module, data in index["modules"].items():
        if session_num in data["sessions"]:
            print(f"📄 Módulo: {module}.md")
            print(f"   Path: {data['path']}")
            print(f"   Sesiones: {', '.join(data['sessions'][:5])}")
            print()
            found = True

    if not found:
        print(f"❌ Sesión {session_num} no encontrada en índice")

def search_by_keyword(keyword: str, index: Dict):
    """
    Busca palabra clave en toda la documentación
    """
    print(f"\n🔍 Buscando '{keyword}' en documentación...\n")

    results = []

    for md_file in DOCS_DIR.rglob("*.md"):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

            if keyword.lower() in content.lower():
                # Contar ocurrencias
                count = content.lower().count(keyword.lower())
                results.append((md_file, count))

    # Ordenar por relevancia (más ocurrencias primero)
    results.sort(key=lambda x: x[1], reverse=True)

    for file, count in results[:10]:  # Top 10
        print(f"📄 {file.relative_to(DOCS_DIR)}")
        print(f"   Ocurrencias: {count}")
        print()

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python doc-nav.py session <num>")
        print("  python doc-nav.py search <keyword>")
        print("  python doc-nav.py file <filepath>")
        print("  python doc-nav.py recent <n>")
        return

    command = sys.argv[1]

    # Construir índice
    print("⏳ Indexando documentación...")
    index = index_documents()
    print("✅ Índice construido\n")

    if command == "session" and len(sys.argv) >= 3:
        search_by_session(sys.argv[2], index)

    elif command == "search" and len(sys.argv) >= 3:
        search_by_keyword(sys.argv[2], index)

    # ... otros comandos

if __name__ == "__main__":
    main()
```

---

**FASE 2: Comandos Avanzados (3 horas)**

```python
def search_by_file(filepath: str, index: Dict):
    """
    Encuentra todas las sesiones que modificaron un archivo
    """
    print(f"\n🔍 Buscando cambios a '{filepath}'...\n")

    for module, data in index["modules"].items():
        if any(filepath in f for f in data["files"]):
            print(f"📄 {module}.md")
            print(f"   Sesiones que modificaron: {', '.join(data['sessions'])}")
            print()

def show_recent_sessions(n: int):
    """
    Muestra las últimas N sesiones
    """
    # Leer CLAUDE.md índice
    claude_path = DOCS_DIR / "CLAUDE.md"
    with open(claude_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extraer últimas N sesiones del índice
    sessions_match = re.search(r'## 📋 ÚLTIMAS SESIONES.*?```(.*?)```',
                               content, re.DOTALL)

    if sessions_match:
        print(f"\n📅 Últimas {n} sesiones:\n")
        print(sessions_match.group(1)[:500])  # Primeros 500 chars
```

---

**FASE 3: Formateo de Output (1 hora)**

```python
from colorama import init, Fore, Style

init()  # Inicializar colores en Windows

def print_header(text: str):
    print(f"\n{Fore.CYAN}{Style.BRIGHT}{text}{Style.RESET_ALL}\n")

def print_result(title: str, content: str):
    print(f"{Fore.GREEN}✓{Style.RESET_ALL} {title}")
    print(f"  {content}")
```

---

#### Beneficios:

✅ **Velocidad:** Buscar info en <5 segundos (vs 2-5 minutos manualmente)
✅ **Productividad:** No necesitas abrir 10 archivos para encontrar algo
✅ **Consistencia:** Siempre encuentra la info más reciente
✅ **Onboarding:** Nuevo dev puede explorar proyecto rápidamente

---

#### Esfuerzo Estimado:

- **Desarrollo:** 6-8 horas (1 día)
- **Testing:** 2 horas
- **Documentación:** 1 hora
- **Total:** ~1 día de trabajo

---

#### Dependencias:

```bash
# requirements.txt
colorama==0.4.6  # Colores en terminal
click==8.1.7     # CLI framework (opcional, mejora UX)
```

---

#### Criterio de Éxito:

- [ ] `python doc-nav.py session 42` retorna resultados en <1s
- [ ] `python doc-nav.py search "session loss"` encuentra todas las referencias
- [ ] `python doc-nav.py file "lib/auth-context.tsx"` lista sesiones correctas
- [ ] Output es legible con colores y formato claro

---

---

### 🎯 SOLUCIÓN #3: Embeddings + Semantic Search

**PRIORIDAD:** 🟢 MEDIA

**CUÁNDO IMPLEMENTAR:**
- ✅ Cuando documentación exceda 50,000 líneas totales
- ✅ Cuando búsqueda por keywords no sea suficiente
- ✅ Cuando necesites encontrar "conceptos similares" no solo palabras exactas
- ✅ Estimado: **8-12 meses desde ahora** (Julio-Noviembre 2026)

---

#### Descripción de la Solución:

**Sistema de búsqueda semántica** que entiende el significado de tus preguntas, no solo palabras clave.

**Ejemplos de Queries:**
```bash
# Búsqueda tradicional (keyword):
"session loss" → Solo encuentra documentos con esas palabras exactas

# Búsqueda semántica (conceptual):
"usuarios pierden sesión rápidamente"
→ Encuentra: Session loss, logout prematuro, auth expiration, etc.

"problema de autenticación"
→ Encuentra: Session loss, middleware validation, getUser() issues, etc.
```

---

#### Arquitectura:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INDEXACIÓN (ejecutar 1 vez por semana)                  │
├─────────────────────────────────────────────────────────────┤
│ docs/*.md → Chunking (500 words/chunk)                     │
│           → Embeddings (OpenAI/Sentence-Transformers)       │
│           → Vector Database (ChromaDB/FAISS)                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. BÚSQUEDA (runtime)                                       │
├─────────────────────────────────────────────────────────────┤
│ User query → Embedding                                      │
│           → Similarity search en vector DB                  │
│           → Top K resultados más relevantes                 │
└─────────────────────────────────────────────────────────────┘
```

---

#### Implementación:

**FASE 1: Setup de Vector Database (4 horas)**

```python
# scripts/semantic-search.py
from sentence_transformers import SentenceTransformer
import chromadb
from pathlib import Path

# Modelo de embeddings (local, gratis)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Vector database (local)
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(name="docs")

def chunk_document(content: str, chunk_size: int = 500):
    """
    Divide documento en chunks de ~500 palabras
    """
    words = content.split()
    chunks = []

    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i+chunk_size])
        chunks.append(chunk)

    return chunks

def index_documents():
    """
    Indexa todos los .md en vector database
    """
    docs_dir = Path("docs")

    for md_file in docs_dir.rglob("*.md"):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Dividir en chunks
        chunks = chunk_document(content)

        # Generar embeddings
        embeddings = model.encode(chunks)

        # Guardar en ChromaDB
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            collection.add(
                documents=[chunk],
                embeddings=[embedding.tolist()],
                metadatas=[{
                    "file": str(md_file),
                    "chunk_id": i
                }],
                ids=[f"{md_file.stem}_{i}"]
            )

    print(f"✅ Indexados {len(chunks)} chunks de documentación")

def semantic_search(query: str, top_k: int = 5):
    """
    Búsqueda semántica
    """
    # Generar embedding de query
    query_embedding = model.encode([query])[0]

    # Buscar en ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=top_k
    )

    print(f"\n🔍 Resultados para: '{query}'\n")

    for i, (doc, metadata, distance) in enumerate(zip(
        results['documents'][0],
        results['metadatas'][0],
        results['distances'][0]
    )):
        print(f"{i+1}. {metadata['file']}")
        print(f"   Relevancia: {1 - distance:.2%}")
        print(f"   Extracto: {doc[:200]}...")
        print()
```

---

**FASE 2: CLI Integration (2 horas)**

```python
# Agregar a doc-nav.py
def semantic_command(query: str):
    from semantic_search import semantic_search
    semantic_search(query, top_k=5)
```

```bash
# Uso:
$ python doc-nav.py semantic "problemas de autenticación"
→ Encuentra documentación relevante por concepto, no solo keyword
```

---

#### Beneficios:

✅ **Búsqueda Inteligente:** Entiende sinónimos y conceptos relacionados
✅ **Descubrimiento:** Encuentra info que no sabías que existía
✅ **Tolerancia a errores:** Funciona aunque no recuerdes palabras exactas
✅ **Escalabilidad:** Funciona con 100,000+ líneas de documentación

---

#### Esfuerzo Estimado:

- **Setup inicial:** 6-8 horas
- **Indexación semanal:** 5 minutos automáticos (cron job)
- **Total:** ~1 día de setup + mantenimiento mínimo

---

#### Dependencias:

```bash
pip install sentence-transformers chromadb
```

**Alternativa (si quieres usar OpenAI):**
```bash
pip install openai chromadb
# Usar embeddings de OpenAI (más precisos pero cuestan $0.0001 por 1K tokens)
```

---

#### Criterio de Éxito:

- [ ] Query "usuarios pierden sesión" encuentra docs de session loss
- [ ] Query "problema de autenticación" encuentra múltiples sesiones relevantes
- [ ] Búsqueda toma <2 segundos incluso con 100,000 líneas
- [ ] Top 5 resultados son todos relevantes (>80% accuracy)

---

---

### 🎯 SOLUCIÓN #4: AI-Powered Project Assistant (Futuro Lejano)

**PRIORIDAD:** 🔵 BAJA (Futuro distante)

**CUÁNDO IMPLEMENTAR:**
- ✅ Cuando equipo crezca a 5+ desarrolladores
- ✅ Cuando documentación exceda 100,000 líneas
- ✅ Cuando presupuesto permita API costs (~$50-100/mes)
- ✅ Estimado: **12+ meses desde ahora** (Diciembre 2026+)

---

#### Descripción de la Solución:

**Chatbot AI personalizado** que conoce TODO el proyecto y puede responder preguntas en lenguaje natural.

**Ejemplos de Uso:**
```
User: ¿Por qué implementamos split useEffect en Sesión 42?

AI Assistant:
En Sesión 42 implementamos split useEffect porque teníamos un problema
de doble subscription que causaba session loss. El useEffect con
dependency [supabaseUser?.id] se ejecutaba múltiples veces cuando
supabaseUser cambiaba de null a objeto, creando 2 listeners de
onAuthStateChange simultáneamente.

La solución fue separar en 2 useEffects:
1. useEffect #1 con [] dependency (solo auth initialization)
2. useEffect #2 con [supabaseUser?.id] (solo polling)

Archivos modificados: lib/auth-context.tsx (líneas 100-253)
Commit: f556dd8
```

---

#### Arquitectura:

```
┌─────────────────────────────────────────────────────────────┐
│ RAG Pipeline (Retrieval-Augmented Generation)              │
├─────────────────────────────────────────────────────────────┤
│ 1. User Question                                            │
│ 2. Semantic Search → Retrieve relevant docs                │
│ 3. Send docs + question to LLM (GPT-4/Claude)              │
│ 4. LLM generates answer based on actual project docs       │
│ 5. Return answer with citations                            │
└─────────────────────────────────────────────────────────────┘
```

---

#### Implementación (Conceptual):

```python
# scripts/ai-assistant.py
from openai import OpenAI
from semantic_search import semantic_search

client = OpenAI(api_key="...")

def ask_assistant(question: str):
    """
    AI Assistant powered by GPT-4 + Project Docs
    """
    # 1. Buscar docs relevantes (semantic search)
    relevant_docs = semantic_search(question, top_k=3)

    # 2. Construir contexto para LLM
    context = "\n\n".join([doc['content'] for doc in relevant_docs])

    # 3. Prompt para GPT-4
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": f"""
                Eres un asistente experto del proyecto EcoPlaza Dashboard.
                Responde preguntas basándote SOLO en la documentación proporcionada.
                Si no sabes, di "No encuentro esa información en la documentación".

                DOCUMENTACIÓN:
                {context}
                """
            },
            {
                "role": "user",
                "content": question
            }
        ],
        temperature=0.3  # Más determinístico
    )

    answer = response.choices[0].message.content

    # 4. Mostrar respuesta con fuentes
    print(f"\n🤖 AI Assistant:\n")
    print(answer)
    print(f"\n📚 Fuentes:")
    for doc in relevant_docs:
        print(f"  - {doc['file']}")
```

---

#### Beneficios:

✅ **Onboarding Instantáneo:** Nuevo dev pregunta, AI responde en segundos
✅ **Memoria Perfecta:** AI nunca olvida decisiones técnicas pasadas
✅ **Explicaciones:** No solo encuentra info, la EXPLICA
✅ **Multilingüe:** Puede responder en inglés/español según contexto

---

#### Esfuerzo Estimado:

- **Desarrollo:** 2-3 días
- **Fine-tuning:** 1 semana (ajustar prompts, mejorar respuestas)
- **Costo mensual:** $50-100 en API calls (OpenAI GPT-4)

---

#### Criterio de Éxito:

- [ ] 90%+ de respuestas son correctas y útiles
- [ ] Responde en <10 segundos
- [ ] Cita fuentes correctas (sesiones, archivos, líneas)
- [ ] Nuevo dev puede hacer onboarding solo con AI assistant

---

---

## 📅 ROADMAP TIMELINE RECOMENDADO

```
┌────────────────────────────────────────────────────────────────────┐
│ NOVIEMBRE 2025                                                     │
├────────────────────────────────────────────────────────────────────┤
│ ✅ Solución #1: Reestructuración Modular (COMPLETADO)             │
│    - Capacidad: 50-60 sesiones más (~6-8 meses)                   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ MARZO-JUNIO 2026 (3-6 meses)                                      │
├────────────────────────────────────────────────────────────────────┤
│ 🎯 Solución #2: Python CLI Knowledge Navigator                    │
│    Trigger: Módulos >2,000 líneas o >10 módulos                   │
│    Esfuerzo: 1 día de desarrollo                                  │
│    Beneficio: Búsqueda <5s, productividad +50%                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ JULIO-NOVIEMBRE 2026 (8-12 meses)                                 │
├────────────────────────────────────────────────────────────────────┤
│ 🎯 Solución #3: Semantic Search + Embeddings                      │
│    Trigger: >50,000 líneas o búsqueda keyword insuficiente        │
│    Esfuerzo: 1 día de setup                                       │
│    Beneficio: Búsqueda conceptual, descubrimiento de info         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ DICIEMBRE 2026+ (12+ meses)                                       │
├────────────────────────────────────────────────────────────────────┤
│ 🎯 Solución #4: AI-Powered Assistant (opcional)                   │
│    Trigger: Equipo 5+ devs, presupuesto permite API costs         │
│    Esfuerzo: 2-3 días desarrollo + $50-100/mes                    │
│    Beneficio: Onboarding instantáneo, memoria perfecta            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 DECISIÓN DE IMPLEMENTACIÓN

### Implementar SOLUCIÓN #2 cuando:
- ✅ Módulo individual excede 2,000 líneas
- ✅ Total de módulos excede 10
- ✅ Buscar información manualmente toma >2 minutos
- ✅ Hay tiempo para 1 día de desarrollo

**Indicadores para monitorear:**
```bash
# Verificar tamaño de módulos (ejecutar cada mes)
wc -l docs/modulos/*.md

# Si alguno >2,000 líneas → Implementar Solución #2
```

### Implementar SOLUCIÓN #3 cuando:
- ✅ Total de documentación excede 50,000 líneas
- ✅ Keyword search retorna demasiados falsos positivos
- ✅ Necesitas encontrar "conceptos similares" no solo palabras
- ✅ Solución #2 ya está implementada y funcionando

### Implementar SOLUCIÓN #4 cuando:
- ✅ Equipo crece a 5+ desarrolladores
- ✅ Onboarding de nuevos devs toma >1 semana
- ✅ Presupuesto permite $50-100/mes en API costs
- ✅ Soluciones #2 y #3 ya implementadas

---

## 📊 MÉTRICAS DE ÉXITO

**Solución #1 (Actual):**
- ✅ CLAUDE.md: 351 líneas (94% reducción)
- ✅ Tiempo de navegación: ~30-60s por búsqueda manual
- ✅ Capacidad: ~6-8 meses más

**Solución #2 (Objetivo):**
- ⏳ Tiempo de búsqueda: <5 segundos
- ⏳ Precisión: >90% de queries retornan info correcta
- ⏳ Productividad: +50% en tiempo ahorrado

**Solución #3 (Objetivo):**
- ⏳ Búsqueda semántica funciona con >50,000 líneas
- ⏳ Descubrimiento: +30% de info relevante encontrada
- ⏳ Tiempo de indexación: <5 minutos semanal

**Solución #4 (Objetivo):**
- ⏳ Onboarding: 1 semana → 2 días
- ⏳ Respuestas correctas: >90%
- ⏳ Costo: <$100/mes

---

## 🔄 PROCESO DE REVISIÓN

**MENSUAL (primer lunes de cada mes):**
- [ ] Verificar tamaño de módulos: `wc -l docs/modulos/*.md`
- [ ] Evaluar si triggers de Solución #2 se cumplieron
- [ ] Actualizar este roadmap si prioridades cambian

**TRIMESTRAL (cada 3 meses):**
- [ ] Revisar efectividad de Solución #1
- [ ] Planear implementación de Solución #2 si es necesario
- [ ] Evaluar ROI de cada solución implementada

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
