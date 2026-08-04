# Alzak Flow — Frontend

Cliente **Next.js 14 (App Router)** + TypeScript estricto + Tailwind CSS del sistema Alzak Flow.

> 📖 **La documentación técnica completa** (arquitectura, API, Socket.io, base de datos, deploy, flujos de negocio y jobs) está en el **[README raíz del proyecto](../README.md) — "Manual de Vuelo"**.
> Las convenciones de arquitectura de frontend (átomos/moléculas/páginas, hooks, Zod, a11y) están en **[CLAUDE.md](../CLAUDE.md)**.

## Desarrollo local

```bash
npm install
npm run dev     # http://localhost:3001
npm run build   # build + type check
npm run lint    # ESLint
```

## Variables de entorno (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3005      # backend Express + Socket.io
NEXT_PUBLIC_SOCKET_URL=http://localhost:3005   # misma URL (Socket.io corre en el mismo proceso)
```

En producción apuntan a `https://alzakserver.tail94787f.ts.net`.

## Repositorios

- **Fuente de verdad + deploy:** `carforck/Appflow` (GitHub, root dir `frontend/`) → **Vercel despliega desde aquí**
- **Backup empresa:** `alzak-foundation/alzak-flow` (GitLab interno)
- **Este repo** (`asistenteti-star/Appflow2026`) es un **espejo histórico solo-frontend** y NO dispara deploys.
