#!/bin/bash

# Script para testear las APIs del Dashboard Ejecutivo
# Uso: ./scripts/test-executive-apis.sh [BASE_URL]
# Ejemplo: ./scripts/test-executive-apis.sh http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"

echo "============================================"
echo "Testing Executive Dashboard APIs"
echo "Base URL: $BASE_URL"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
  local name=$1
  local endpoint=$2

  echo -e "${YELLOW}Testing: $name${NC}"
  echo "GET $endpoint"

  response=$(curl -s "$BASE_URL$endpoint")

  # Check if response contains "success": true
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$response"
  fi

  echo ""
  echo "--------------------------------------------"
  echo ""
}

# Test 1: Summary (General)
test_endpoint "Summary - General" "/api/executive/summary"

# Test 2: Summary (Con proyecto_id de ejemplo)
# Nota: Reemplaza este UUID con uno real de tu DB
PROYECTO_ID="uuid-ejemplo"
test_endpoint "Summary - Proyecto Específico" "/api/executive/summary?proyecto_id=$PROYECTO_ID"

# Test 3: Funnel
test_endpoint "Funnel de Conversión" "/api/executive/funnel"

# Test 4: Pipeline
test_endpoint "Pipeline por Estado" "/api/executive/pipeline"

# Test 5: Vendedores
test_endpoint "Ranking de Vendedores" "/api/executive/vendedores"

# Test 6: Canales (debe agrupar Victoria)
test_endpoint "Efectividad por Canal (Victoria IA)" "/api/executive/canales"

# Test 7: Financiero
test_endpoint "Salud Financiera" "/api/executive/financiero"

# Test 8: Proyectos
test_endpoint "Comparativa de Proyectos" "/api/executive/proyectos"

echo "============================================"
echo "Testing Complete"
echo "============================================"
