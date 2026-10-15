# Flujo de trabajo

## Estrategia de ramas

El proyecto usa un flujo basado en ramas cortas (GitHub Flow):

- `main` es la rama estable. Todo lo que llega a `main` se publica solo:
  el frontend en Vercel y el backend en Render.
- Cada cambio se hace en una rama propia que sale de `main`:
  - `feature/<descripcion>` para funciones nuevas (ej. `feature/resenas-en-pedidos`)
  - `fix/<descripcion>` para corregir errores (ej. `fix/registro-contrasenas`)
  - `docs/<descripcion>` para documentación
- Al terminar se abre un pull request hacia `main`.
- El pull request solo se une cuando la integración continua pasa en verde.
- Después de unirla, la rama se borra.

Al inicio el proyecto se desarrolló directo sobre `main` por ser de una sola
persona. Este flujo se adoptó a partir de octubre de 2026.

## Mensajes de commit

Se sigue la convención *Conventional Commits*:

- `feat(alcance): ...` función nueva
- `fix(alcance): ...` corrección
- `docs: ...`, `style: ...`, `refactor: ...`

## Integración continua

`.github/workflows/ci.yml` corre en cada pull request y en cada push a `main`:

1. **Frontend:** instala dependencias y compila con Vite.
2. **Backend:** instala dependencias y compila TypeScript, lo que revisa los tipos.

Si alguno falla, el pull request queda en rojo y no se une.

`.github/workflows/sonarqube.yml` hace el análisis de calidad con SonarQube.

## Despliegue continuo

- **Frontend:** Vercel publica automáticamente cada cambio en `main` y genera
  una vista previa por cada pull request.
- **Backend:** Render publica automáticamente cada cambio en `main`
  (`Backend/render.yaml`).
