<!--
Plantilla oficial de Pull Request — Web Esencial.
Elige UN tipo (Issue PR o Topic Issue PR) y borra la sección que no aplica.
No inventes números de issue, criterios ni versiones: si no existen, escribe N/A.
Base obligatoria: produccion. Solo el propietario revisa y fusiona.
-->

## Tipo de PR

- [ ] Issue Pull Request (una o varias tareas específicas)
- [ ] Topic Issue Pull Request (conjunto de issues que forman un tema o entrega)

## Resumen

<!-- Qué se modificó y por qué (2–5 líneas). -->

---

<!-- ===================== ISSUE PULL REQUEST ===================== -->

### Related Issue(s)

<!-- Ej.: Closes #12. Si no hay issue: N/A -->

### Acceptance Test(s)

<!-- Criterios de aceptación y cómo verificarlos paso a paso. -->

- [ ] 

### Implementation Notes

<!-- Decisiones técnicas, archivos clave, compatibilidad con clientes existentes, riesgos. -->

### Related Pull Request(s)

<!-- PRs de los que depende o relacionados. Si no hay: N/A -->

---

<!-- ================== TOPIC ISSUE PULL REQUEST ================== -->

### Related Issue(s)

<!-- Lista de issues que componen el tema/entrega. -->

### Acceptance Test(s)

- [ ] 

### Version Number

<!-- Versión según el archivo VERSION. Si no existe o no aplica: N/A -->

---

## Validación

<!-- Marca solo lo que realmente ejecutaste y pega el resultado resumido. -->

- [ ] `npm test`
- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `CLIENT_ID=<id> npm run build` para cada cliente/variante afectada: <!-- ids -->
- [ ] Revisado el diff: sin secretos, sin artefactos generados (`out/`, `.next/`, `*.tsbuildinfo`)
- [ ] **Verificación MCP** (obligatoria si el PR toca código; ver `.claude/skills/web-esencial/references/MCP_VERIFICATION.md`)

<!-- Verificación MCP: clientes y viewports revisados, resultado de page-audit, Lighthouse
     (Accesibilidad / Buenas prácticas / SEO), LCP y CLS, prueba del editor si aplica, problemas encontrados.
     Si el PR es solo de documentación: "No aplica". -->

## Cómo probarlo

<!-- Pasos para que el propietario reproduzca y verifique el cambio. -->

## Riesgos

<!-- Impacto en clientes existentes, componentes compartidos, despliegue. Si no hay: Ninguno conocido. -->
