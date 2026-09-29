# ADR 0006 — Gate de producción con Deployment Checks de Vercel, sin job `deploy`

**Estado:** aceptado por Lazar (2026-09-29); check `quality` (origen GitHub, solo Production) agregado en Vercel el 2026-09-29 y verificado tras recargar. Todavía no se probó con un push real: si el primer deploy queda sin promover, revisar la nota de abajo · **Reemplaza:** el job `deploy` "calcado de glamify" que planeaban el handoff §6 (Fase 10) y el ADR 0005.

## Problema

Hoy cada push a `main` lo deploya a producción la integración Git de Vercel, **aunque el job `quality` del CI falle**: Vercel no espera a GitHub Actions. El plan original era agregar un job `deploy` con Vercel CLI + token, atrás de `quality`, igual que glamify, para que un rojo no llegue a hazing.store.

## Precedente propio

El job `deploy` de glamify (`.github/workflows/ci.yml` de glamify) tiene un paso "Check Vercel Token" que lo saltea si no hay `VERCEL_TOKEN` y deja el deploy a la integración Git. En la práctica, glamify deploya con la integración Git y el job está muerto: no hay precedente real funcionando que copiar.

## Alternativas descartadas

1. **Job `deploy` con Vercel CLI + token (plan original):** obliga a desactivar la integración Git para producción (si no, deploya dos veces), a guardar un token de cuenta con permisos de deploy en GitHub Secrets y a mantener `vercel pull/build/deploy --prebuilt` en el CI. Es el patrón que glamify tiene y no usa. Más superficie (un token de larga vida en un repo **público**) para lograr lo mismo que una opción nativa.
2. **Dejarlo como está:** un `main` rojo llega a producción. Con checkout y plata real, no alcanza.
3. **Branch protection con PR obligatorio:** frena el merge a `main` hasta que `quality` pase, pero cambia el flujo de trabajo (commits directos a `main` autorizados por Lazar) y no cubre un push forzado por el dueño. Complementaria, no sustituta.

## Decisión

No agregar el job `deploy`. Mantener la integración Git de Vercel y activar **Deployment Checks** en el proyecto con el check de GitHub **`quality`** como requerido: Vercel sigue construyendo cada push, pero **no asigna hazing.store** a ese deployment hasta que `quality` pase. En caso de emergencia se puede usar "Force Promote" desde el dashboard. Documentación: https://vercel.com/docs/deployment-checks (verificada el 2026-09-28).

## Reversibilidad

Barata: es un toggle en Settings → Build and Deployment → Deployment Checks. No toca código ni datos.

## Consecuencias aceptadas

- La producción tarda lo que tarde el CI (hoy ~3–4 min) en recibir un deploy ya construido.
- El nombre del job (`quality`) pasa a ser contrato: si se renombra en `ci.yml`, hay que actualizar el check requerido en Vercel.
- Se configura en el dashboard (requisito: "automatic aliasing" de producción activado, que es el default). Alta hecha en Add Checks → GitHub → "Select checks to add" con el SHA de un commit que ya corrió el CI y "Show All Checks" activado (`quality` solo aparece así).
- Vercel advierte que, para checks disparados por `repository_dispatch`, el workflow debe avisar con `vercel/repository-dispatch/actions/status@v1`. `ci.yml` corre por `push`, así que en principio no hace falta; si el primer push a `main` deja el deployment sin promover, agregar ese paso al final del job `quality` o quitar el check (el deployment se libera con Force Promote).
- El proyecto ya tenía dos checks nativos de Vercel (`Lint`, `TypeCheck`) en Preview y Production; no se tocaron.
