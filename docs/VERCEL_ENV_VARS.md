# Variables de Entorno - Vercel

## Swagger UI en Producción

Para habilitar la protección de Swagger UI en producción, agregar las siguientes variables de entorno en Vercel:

### Paso a Paso

1. **Ir a Vercel Dashboard:**
   ```
   https://vercel.com/ecoplaza/whatsapp-agent-ia-dashboard/settings/environment-variables
   ```

2. **Agregar Variables:**

   **Variable 1:**
   ```
   Name: SWAGGER_USERNAME
   Value: ecoplaza_admin
   Environments: Production, Preview
   ```

   **Variable 2:**
   ```
   Name: SWAGGER_PASSWORD
   Value: Sw4gg3r#2025!Eco
   Environments: Production, Preview
   ```

3. **Re-deploy:**
   - Hacer un nuevo deploy o trigger desde el dashboard de Vercel
   - Las variables estarán disponibles en el siguiente deployment

### Verificación

Una vez desplegado, verificar:

1. **Acceder a:**
   ```
   https://whatsapp-agent-ia-dashboard.vercel.app/api/docs
   ```

2. **Debería solicitar autenticación:**
   - Usuario: `ecoplaza_admin`
   - Contraseña: `Sw4gg3r#2025!Eco`

3. **Si no solicita autenticación:**
   - Verificar que las variables estén en el ambiente correcto
   - Verificar logs de Vercel para errores

### Desarrollo Local

En desarrollo (localhost), NO se requiere autenticación:
```
http://localhost:3000/api/docs
```

### Seguridad

- **NO** compartir estas credenciales públicamente
- Cambiar las credenciales si se sospecha de compromiso
- Las variables están solo disponibles en el servidor (no expuestas al cliente)

---

**Última Actualización:** 23 Diciembre 2025
**Sesión:** 74+
