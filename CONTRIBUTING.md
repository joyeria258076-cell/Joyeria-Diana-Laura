# Flujo de trabajo

## Estrategia de ramas (Git Flow)

```
feature/*  ──►  develop  ──►  main
fix/*      ──►  develop        ▲
                hotfix/*  ─────┘  (y de regreso a develop)
```

| Rama | Para qué sirve | Se publica en |
|---|---|---|
| `main` | Producción. Solo recibe cambios ya probados desde `develop` o un `hotfix/*`. | Vercel (sitio real) y Render |
| `develop` | Integración. Aquí se juntan las funciones terminadas antes de salir a producción. | Vercel, sitio de pruebas |
| `feature/<descripcion>` | Una función nueva. Sale de `develop` y vuelve a `develop`. | Vista previa de Vercel en su pull request |
| `fix/<descripcion>` | Corrección no urgente. Sale de `develop` y vuelve a `develop`. | Vista previa de Vercel |
| `hotfix/<descripcion>` | Error urgente en producción. Sale de `main`, vuelve a `main` y también a `develop`. | Producción |

Reglas:

1. Nadie trabaja directo sobre `main` ni `develop`: todo entra por pull request.
2. Un pull request solo se une cuando la integración continua pasa en verde.
3. Para publicar, se abre un pull request de `develop` hacia `main`.
4. Después de unir una rama `feature/`, `fix/` o `hotfix/`, se borra.

Al inicio el proyecto se desarrolló directo sobre `main` por ser de una sola
persona. Este flujo se adoptó a partir de octubre de 2026.

## Mensajes de commit

Se sigue la convención *Conventional Commits*:

- `feat(alcance): ...` función nueva
- `fix(alcance): ...` corrección
- `ci: ...`, `docs: ...`, `style: ...`, `refactor: ...`

## Integración continua

`.github/workflows/ci.yml` corre en cada pull request hacia `develop` o `main`
y en cada push a esas ramas:

1. **Frontend:** instala dependencias y compila con Vite.
2. **Backend:** instala dependencias y compila TypeScript, lo que revisa los tipos.

Si alguno falla, el pull request queda en rojo y no se une.

`.github/workflows/sonarqube.yml` hace el análisis de calidad con SonarQube.

## Despliegue continuo

- **Frontend:** Vercel publica automáticamente `main` como sitio real, y cada
  otra rama (incluida `develop`) y cada pull request en una dirección de vista previa.
- **Backend:** Render publica automáticamente cada cambio en `main`
  (`Backend/render.yaml`).
