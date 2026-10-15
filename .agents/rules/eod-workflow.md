---
name: eod-workflow
description: Protocolo de Cierre de Jornada (EOD), Diagnóstico Doctor y Saneamiento Automático para The Great Puzzle Project
---

# Protocolo EOD (End of Day) & Regla de Diagnóstico "Doctor"

Esta regla establece el estándar obligatorio de verificación, saneamiento y despliegue al cierre de cada jornada de desarrollo en el repositorio.

## 1. El Comando Maestro EOD
El comando para ejecutar el cierre escalonado es:
```bash
npm run eod
```

### Ejecución Escalonada Estricta:
El proceso corre de forma secuencial garantizando que cada fase termine exitosamente antes de iniciar la siguiente:
1. **Paso 1: `npm run sanear` (`scripts/sanear.mjs`)**:
   - Sanitiza automáticamente etiquetas huérfanas en Markdown/MDX que podrían romper el compilador de Astro/Vite.
   - Normaliza URLs duplicadas, elimina marcas de orden de bytes (UTF-8 BOM) y formatea frontmatter.
2. **Paso 2: `npm run doctor` (`scripts/doctor.mjs`)**:
   - Audita la existencia física de imágenes referenciadas en `src/content/`.
   - Verifica que ningún archivo confidencial o de escritorio (`.env`, `.history/`, `scratch/`, `*.bak`) haya sido atrapado por Git.
   - Si detecta anomalías, **aborta inmediatamente el commit** y genera `scripts/doctor-report.json`.
3. **Paso 3: `npm run sync` (`scripts/sync.mjs`)**:
   - Solo se ejecuta si el Doctor da el visto bueno (0 fallos).
   - Realiza `git pull`, `git add .`, commit semántico fechado y `git push origin main` hacia Cloudflare Pages.

---

## 2. Auto-Saneamiento cuando el Usuario envía un reporte de error
Si el pipeline se detiene o el usuario envía un reporte de `doctor` o `eod`:
1. **Inspección Inmediata**:
   - Leer `scripts/doctor-report.json` para obtener la lista exacta de `issues`.
2. **Corrección Quirúrgica**:
   - Si es **`IMAGEN_FANTASMA`**: Ajustar la ruta en el frontmatter o verificar la presencia del asset en `public/`.
   - Si es **`SEGURIDAD_DESK_FILTRADO`**: Ejecutar `git rm --cached -r <archivo>` y asegurar su presencia en `.gitignore`.
   - Si es **`FRONTMATTER_INVALIDO`**: Añadir los campos requeridos en el archivo MDX correspondiente.
3. **Re-verificación**:
   - Ejecutar `node scripts/doctor.mjs` para certificar que el repositorio volvió a estar 100% saludable antes de proseguir con el push.

---

## 3. Barrera de Seguridad de Escritorio (Desk Boundary)
- **Archivos Prohibidos en Git**: `.env`, `.env.*` (excepto `.env.example`), `.history/`, `scratch/`, `extra-kelvin/`, `*.bak`.
- Todas las herramientas de prueba, scripts de migración de un solo uso o experimentos locales deben permanecer en `scratch/` o en el Desk local del usuario, manteniendo la compilación de Cloudflare Pages ultra-liviana.
