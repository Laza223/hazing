# 04 — Calidad

## Juez de verificación (inmutable)

`scripts/audit-verify.sh` — 4 gates en orden, `set -e`:

```bash
pnpm format:check   # NO pnpm format: ese reescribe, este falla
pnpm lint
pnpm typecheck
pnpm test
```

Nadie que aplique fixes de una auditoría o lista de hallazgos edita este script — está en la deny-list de `.claude/settings.json`. Solo un humano lo actualiza cuando cambia el tooling del stack.

## Definition of Done

Antes de declarar cualquier cambio terminado, correr los 4 comandos de arriba y citar el output real (no "debería pasar"). CI (`quality` en GitHub Actions, desde Fase 2) corre lo mismo en cada push/PR a `main`.

## Accesibilidad

WCAG AA — heredado de glamify, con requisitos adicionales del design brief monocromo (§8.6 del handoff, [`00-handoff.md`](00-handoff.md)):
- Contraste ≥ 4.5:1 en texto normal, ≥ 3:1 en texto grande (18px+/bold).
- El color nunca es el único portador de significado (WCAG 1.4.1) — éxito/error/stock se comunican con tipografía y forma, no con rojo/verde.
- `prefers-reduced-motion`: todo transform/scale se reemplaza por opacity-only o instantáneo — obligatorio, no opcional.
- Touch targets ≥ 44px.
- 0 violaciones de `@axe-core/playwright` en CI (mismo gate que glamify).

## Testing

- **Unit (Vitest):** lógica pura en `src/lib/*` — pricing, validación de talles/variantes, totales de carrito, formato ARS.
- **Integración (Vitest + DB real):** servicios que tocan Prisma — se agregan a partir de Fase 3/4.
- **E2E (Playwright):** flujos completos (catálogo → checkout, admin CRUD, cuenta) — se agregan a partir de Fase 6/7, siguiendo el patrón de `glamify/tests/e2e/*`.

## Legal (Argentina)

Botón de Arrepentimiento (Res. 424/2020, Art. 34 Ley 24.240) con constancia `ARR-NNNNNN` — cubierto por test de integración heredado del patrón de glamify (`tests/integration/legal/retraction-service.test.ts`). Ley 25.326 de protección de datos personales — sin tracking de terceros sin consentimiento (mismo patrón opt-out que PostHog en glamify).
