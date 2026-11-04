# Verificación con MCP (Chrome DevTools) antes de cada PR de código

**Regla:** todo PR que modifique código o contenido que llega al sitio o al editor (`src/`, `clients/`,
`tools/generator/`, `public/`, `next.config.ts`, `tailwind.config.ts`, `package.json` con dependencias)
debe verificarse en un navegador real con el MCP de Chrome DevTools **antes de abrir el PR**. Los tests,
el type-check y el lint no detectan problemas visuales, imágenes rotas, botones tapados ni enlaces de
WhatsApp mal formados: el MCP sí.

No aplica a PRs solo de documentación (`*.md`) o de configuración de Claude Code sin efecto en el sitio.

El objetivo no es "que compile", sino que **el sitio esté listo para vender**: se ve bien en móvil, los
botones de contacto funcionan y nada parece roto o de plantilla.

## 1. Preparar

```bash
npm run qa:build                    # compila TODOS los clientes en .qa/sites/<id>
npm run qa:build -- demo-artist     # o solo los afectados
npm run qa:serve                    # sirve cada sitio con gzip en 127.0.0.1:4101, 4102, …
npm run generate                    # solo si el cambio toca el editor (127.0.0.1:3001)
```
`qa:serve` y `generate` son procesos largos: ejecútalos en segundo plano y detenlos al terminar.

Qué clientes revisar:
- Cambio en componentes compartidos, `layout.tsx`, `page.tsx`, utils, esquema o Tailwind → **un cliente
  por variante** (los 4 demos) como mínimo.
- Cambio en una variante → todos los clientes de esa variante.
- Cambio en un `clients/<id>.json` → ese cliente.

## 2. Revisar cada sitio afectado (MCP)

Para cada sitio, en **móvil** (`emulate` viewport `375x812x2,mobile,touch`) y **escritorio** (`1280x900x1`):

1. `navigate_page` al puerto del sitio.
2. `take_screenshot` de la primera pantalla y de las secciones tocadas por el cambio. **Mira las capturas**:
   textos de plantilla o de otro rubro, imágenes rotas o deformadas, elementos superpuestos, contraste.
3. `evaluate_script` con el contenido de `tools/qa/page-audit.js` → debe devolver `"ok": true`.
   Comprueba: desborde horizontal, anclas rotas, WhatsApp sin código de país, imágenes rotas o aplastadas,
   número de `h1`, elementos fijos superpuestos, botones de contacto demasiado pequeños, meta description.
4. `list_console_messages` (tipos `error`, `warn`) → sin errores nuevos.
5. Si el cambio afecta a la interacción (menú móvil, botones, videos): `take_snapshot` + `click` y vuelve a
   capturar.

Una vez por PR, sobre el cliente más afectado:

6. `lighthouse_audit` móvil. Mínimos: **Accesibilidad ≥ 90, Buenas prácticas ≥ 90, SEO ≥ 95**. Si una
   puntuación baja respecto a `produccion`, explica por qué o corrígelo.
7. `performance_start_trace` con `emulate` `networkConditions: "Slow 4G"` y `cpuThrottlingRate: 4`.
   Objetivo: **LCP ≤ 2,5 s y CLS ≤ 0,1** servido con `qa:serve`. Las imágenes externas (Unsplash) pueden
   estar en caché del navegador: si importa, usa `isolatedContext` en `new_page` para una carga en frío.

## 3. Si el cambio toca el editor (`tools/generator/`)

Con `npm run generate` y el MCP:
1. Cargar **cada** cliente de `clients/`, cambiar solo el id a `qa-<id>` y guardar.
2. Comparar el JSON guardado con el original: no puede faltar ningún campo ni cambiar valores (solo se
   admiten defaults de Zod y orden de claves).
3. Probar un error de validación (campo obligatorio vacío) y verificar que el mensaje es comprensible y
   lleva al campo.
4. **Borrar** los archivos `clients/qa-*.json` creados y comprobar `git status` limpio.

## 4. Registrar el resultado en el PR

En la sección *Validación* de la plantilla, añade un bloque **"Verificación MCP"** con:
- clientes y viewports revisados;
- resultado de `page-audit` (ok / problemas);
- puntuaciones de Lighthouse y LCP/CLS medidos;
- capturas relevantes descritas (no hace falta adjuntarlas) y cualquier problema preexistente detectado.

No marques nada como verificado si no se ejecutó. Si un problema es preexistente y está fuera del alcance,
dilo en *Riesgos* y no lo ocultes.

## 5. Si el MCP no está disponible

1. Carga la skill `chrome-devtools-mcp:troubleshooting`. Causa típica en Windows: primer arranque lento de
   `npx` (timeout de 30 s); precalienta con `npx -y chrome-devtools-mcp@latest --help` y pide al propietario
   reconectar con `/mcp`.
2. Alternativa equivalente: la CLI del mismo paquete (skill `chrome-devtools-mcp:chrome-devtools-cli`),
   invocada con `node <ruta>/chrome-devtools-mcp/build/src/bin/chrome-devtools.js` (no con `npx`: en
   Windows `npx.cmd` corrompe argumentos con `|`, `&`, `>`). El script de auditoría debe pasarse en una
   sola línea; por eso `page-audit.js` no usa comentarios `//`.
3. Si no hay forma de verificar, **no abras el PR como listo**: ábrelo en *draft* indicando que falta la
   verificación MCP, o espera a que el propietario lo habilite.

## 6. Limpieza

Detén `qa:serve`, `generate` y cualquier servidor auxiliar; cierra las páginas abiertas; confirma que no
quedan `clients/qa-*.json` ni cambios no deseados (`git status`). `.qa/` está en `.gitignore`.
