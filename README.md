# Alzak Flow

Sistema de gestión de investigación clínica para **Alzak Foundation**. Automatiza la extracción de tareas desde minutas de reunión con IA, gestión Kanban, flujo de revisión y aprobación, y comunicación interna bidireccional en **tiempo real** vía Socket.io.

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Backend — API REST completa](#5-backend--api-rest-completa)
6. [Socket.io — Tiempo real](#6-socketio--tiempo-real)
7. [Frontend — Páginas y módulos](#7-frontend--páginas-y-módulos)
8. [Hooks personalizados](#8-hooks-personalizados)
9. [Contextos React (estado global)](#9-contextos-react-estado-global)
10. [Sistema de roles RBAC](#10-sistema-de-roles-rbac)
11. [Flujo de procesamiento de minutas](#11-flujo-de-procesamiento-de-minutas)
12. [Docker — Despliegue](#12-docker--despliegue)
13. [Variables de entorno](#13-variables-de-entorno)
14. [Base de datos](#14-base-de-datos)
15. [Dev Bypass — credenciales de prueba](#15-dev-bypass--credenciales-de-prueba)
16. [Historial de versiones](#16-historial-de-versiones)

---

## 1. Descripción general

**Alzak Flow** centraliza la operación de estudios clínicos en una sola plataforma:

```
Minuta de reunión (texto libre / DOCX / PDF)
        │
        ▼
  IA (Google Gemini / Groq Llama 3.3)
        │  extrae tareas estructuradas
        ▼
  Staging Area — Revisión admin
        │  editar · aprobar · descartar
        ▼
  Cola de Revisión  ──►  Kanban Board
        │                    │
        ▼                    ▼
  Notificación email    Chat de notas
  al responsable        (tiempo real)
        │
        ▼
  Panel de Notificaciones ─► deep-link a tarea/chat
        │
        ▼
  Historial / Lista Maestra exportable PDF
```

Características principales:
- **RBAC** completo (`superadmin > admin > user`)
- **Chat de notas** por tarea con mensajería bidireccional en tiempo real
- **Socket.io** para sincronización del tablero, alertas sonoras y typing indicators
- **Panel de notificaciones** con datos reales, RBAC, deep-linking y sonido
- **Logo corporativo** Alzak Foundation en sidebar, login, favicon y PDFs exportados
- **Auto-migración de DB** al arrancar (sin migraciones manuales)
- **Dockerizado** con túnel SSH a MySQL en DigitalOcean

---

## 2. Arquitectura del sistema

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENTE (Navegador)                                             │
│                                                                  │
│   Next.js 14 (App Router) · React 18 · TypeScript               │
│   Tailwind CSS · socket.io-client · Recharts                     │
│   Puerto 3001                                                    │
└──────────────┬──────────────────────┬───────────────────────────┘
               │ HTTP / authFetch      │ WebSocket (Socket.io)
               │ Bearer JWT            │ JWT auth por handshake
┌──────────────▼──────────────────────▼───────────────────────────┐
│  BACKEND  (Express.js + Socket.io)                               │
│                                                                  │
│   Node.js 22 · Express 4 · Socket.io 4                          │
│   JWT (8h) · bcryptjs · multer · nodemailer                      │
│   Puerto 3005 · network_mode: host                               │
│                                                                  │
│   Rooms Socket.io:                                               │
│     alzak_global  → todos los usuarios autenticados              │
│     user_{email}  → room privado por usuario                     │
│     task_{id}     → chat de notas por tarea                      │
└──────────────┬───────────────────────────────────────────────────┘
               │ mysql2 · pool 10 conexiones
               │ localhost:3306 (vía túnel SSH)
┌──────────────▼───────────────────────────────────────────────────┐
│  BASE DE DATOS  (MySQL — DigitalOcean)                           │
│                                                                  │
│   Acceso mediante contenedor Docker de túnel SSH                 │
│   Tablas: users · projects · meetings · tasks ·                  │
│           db_notifications · task_notas · pending_emails         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14.2.35 | Framework App Router, SSR/SSG |
| React | 18 | UI components |
| TypeScript | 5 | Tipado estático estricto |
| Tailwind CSS | 3.4 | Utilidades CSS + tokens de diseño |
| socket.io-client | 4.8.x | WebSocket cliente (tiempo real) |
| next-themes | 0.4.6 | Dark/Light mode |
| Recharts | 3.8.x | Gráficas BI (BarChart, PieChart, LineChart) |
| Zod | 4.x | Validación de formularios |
| sharp | 0.33.x | Optimización de imágenes Next.js standalone |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 | Runtime |
| Express | 4.18 | HTTP server y routing |
| Socket.io | 4.8.x | WebSocket servidor con rooms JWT |
| mysql2 | 3.x | Cliente MySQL con pool de conexiones |
| jsonwebtoken | 9.x | Autenticación JWT (8h expiry) |
| bcryptjs | 3.x | Hash de contraseñas |
| multer | 2.x | Upload de archivos (PDF, DOCX) |
| nodemailer | 6.x | Envío de correos (aprobación de tareas) |
| @google/generative-ai | 0.24.x | Gemini para procesamiento de minutas |
| axios | 1.x | Cliente HTTP para Groq API |
| dotenv | 16.x | Variables de entorno |

### Infraestructura
| Componente | Tecnología | Detalle |
|---|---|---|
| Contenedores | Docker Compose | 3 servicios: api, frontend, db-tunnel |
| DB Tunnel | Alpine SSH | Expone MySQL remoto como localhost:3306 |
| Base de datos | MySQL (DigitalOcean) | Acceso vía túnel SSH |
| IA | Google Gemini / Groq Llama 3.3 | Extracción de tareas desde minutas |

---

## 4. Estructura de carpetas

```
alzak-flow/
│
├── backend/
│   ├── index.js                    # Entry point: Express + Socket.io + JWT rooms
│   ├── package.json
│   ├── Dockerfile                  # Node 22 Alpine
│   ├── Dockerfile.tunnel           # Túnel SSH hacia MySQL
│   ├── tunnel-entrypoint.sh        # Script de inicio del túnel
│   ├── docker-compose.yml          # 3 servicios: api · frontend · db-tunnel
│   └── src/
│       ├── config/
│       │   ├── db.js               # Pool MySQL2
│       │   ├── migrate.js          # Auto-migración al arrancar (ALTER TABLE)
│       │   └── socket.js           # Singleton io + helpers emitNotifAlert / emitTaskUpdated
│       ├── middleware/
│       │   └── auth.js             # authMiddleware JWT + requireRole()
│       ├── controllers/
│       │   ├── authController.js   # Login + bcrypt
│       │   ├── taskController.js   # CRUD tareas + emits socket tipados
│       │   ├── notesController.js  # Chat de notas + new_note emit
│       │   ├── notificationController.js  # RBAC notifications + notas-sin-leer
│       │   ├── userController.js   # CRUD usuarios + force_logout + role_changed
│       │   ├── projectController.js
│       │   ├── meetingController.js  # Procesamiento IA (Gemini/Groq)
│       │   ├── ingestaController.js  # Ingesta desde Google Drive
│       │   ├── uploadController.js   # Upload PDF/DOCX → texto
│       │   └── statsController.js    # KPIs para dashboard BI
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── taskRoutes.js       # /tareas + /:id/notas + /:id/aprobar
│       │   ├── userRoutes.js       # CRUD + PATCH /:correo/rol
│       │   ├── notificationRoutes.js  # GET, PATCH leer/leer-todo/notas-sin-leer
│       │   ├── projectRoutes.js
│       │   ├── meetingRoutes.js
│       │   ├── minutasRoutes.js
│       │   ├── uploadRoutes.js
│       │   ├── emailRoutes.js
│       │   └── statsRoutes.js
│       └── services/
│           └── emailService.js     # Cola de correos consolidados (aprobación)
│
└── frontend/
    ├── Dockerfile                  # Next.js standalone build (Node 22)
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── app/
    │   ├── layout.tsx              # Root: ThemeProvider + AuthProvider + metadata
    │   ├── page.tsx                # Redirect → /dashboard o /login
    │   ├── globals.css             # Variables CSS, glass, animaciones notif-panel
    │   ├── (auth)/login/           # Login rediseñado: logo + divisor + branding
    │   └── (dashboard)/
    │       ├── layout.tsx          # Auth guard + todos los Providers
    │       ├── dashboard/          # BI: KPIs + gráficas + actividad reciente
    │       ├── procesador/         # Procesador IA (2 pasos) + Staging Area
    │       ├── tareas/             # Kanban + Historial + Lista Maestra + deep-link ?open=ID&focus=notas
    │       ├── revision/           # Cola de aprobación (admin+)
    │       ├── proyectos/          # CRUD proyectos
    │       ├── usuarios/           # CRUD usuarios + cambio de rol
    │       ├── notas/              # Chat centralizado por tarea
    │       ├── perfil/             # Perfil + resumen de actividad
    │       └── admin/logs/         # Audit Log + System Health
    │
    ├── components/
    │   ├── Navigation.tsx          # Sidebar · Drawer · Bottom tabs · Notif bell (singleton panel)
    │   ├── TaskModal.tsx           # Detalle tarea: status, prioridad, chat, focus automático
    │   ├── NewTaskModal.tsx        # Crear tarea manual
    │   ├── NotificationPanel.tsx   # Panel notif: RBAC + deep-link + historial + vacío
    │   ├── Toast.tsx               # Sistema de toasts (4 tipos, auto-dismiss)
    │   ├── ProjectCharts.tsx       # Recharts BarChart + PieChart
    │   ├── ThemeToggle.tsx
    │   ├── dashboard/              # KPICards · BICharts · DashboardFilters · OverdueTasks
    │   ├── procesador/             # InputStep · ValidationStep · StagedTaskCard
    │   ├── revision/               # RevisionCard · RevisionRow
    │   ├── tareas/                 # KanbanCard · KanbanViews · HistorialView
    │   │                           # ListaMaestraView · StatusChip · TaskBoard
    │   ├── proyectos/              # ProjectCard · ProjectTable · ProjectForm · ProjectStats
    │   ├── usuarios/               # UserCard · UserFormModal · UsersPanel
    │   └── ui/                     # Button · Input · Modal · Badge · Switch (átomos)
    │
    ├── context/
    │   ├── AuthContext.tsx         # JWT + loginMock + socket user events
    │   ├── TaskStoreContext.tsx    # Tasks CRUD + socket task_updated/task_created
    │   ├── NotificationContext.tsx # Notifs DB + polling 30s + socket + Web Audio
    │   ├── ProjectStoreContext.tsx # Proyectos CRUD
    │   ├── StagingContext.tsx      # Tareas pendientes de validación IA
    │   ├── UserStoreContext.tsx    # Usuarios (lista, CRUD)
    │   └── SidebarContext.tsx      # collapsed, mobileOpen
    │
    ├── hooks/
    │   ├── useSocket.ts            # Singleton socket.io-client con JWT auth
    │   ├── useTaskNotes.ts         # Chat notas: optimistic UI + socket + typing
    │   ├── useTaskBoard.ts         # Kanban: filtros, modal, auto-open + chatFocus
    │   ├── useNotasUnread.ts       # Conteo de notas no leídas por tarea
    │   ├── useRevision.ts          # Cola revisión: approve/reject/approveAll
    │   ├── useProcesador.ts        # Flujo procesador IA 2 pasos
    │   ├── useProyectos.ts         # CRUD proyectos + filtros
    │   ├── useUsuarios.ts          # CRUD usuarios
    │   ├── useUsuariosPage.ts      # Estado UI página usuarios
    │   ├── useDashboardBI.ts       # KPIs, gráficas, filtros dashboard
    │   └── useListaMaestra.ts      # Lista maestra de tareas + export PDF
    │
    ├── schemas/
    │   └── proyecto.ts             # Zod schemas (ProjectFormSchema, StatusEnum)
    │
    └── lib/
        ├── api.ts                  # authFetch() wrapper JWT + backendBase()
        ├── mockData.ts             # Tipos TypeScript de dominio
        ├── pdfUtils.ts             # PDF: jsPDF + autoTable + logo WebP→PNG via canvas
        ├── textParser.ts           # Parser de texto para extracción local
        └── prepareTasksForRevision.ts  # Mapeo staging → revision tasks
```

---

## 5. Backend — API REST completa

Base URL: `http://servidor:3005`

Todos los endpoints protegidos requieren: `Authorization: Bearer <JWT>`

### Auth

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/auth/login` | Público | Login → JWT + user |
| POST | `/auth/register` | superadmin | Registro de nuevo usuario |

### Tareas

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/tareas` | todos | Lista tareas (RBAC: user ve solo las suyas) |
| POST | `/tareas/crear` | admin+ | Crear tarea manual |
| POST | `/tareas/commit-staging` | admin+ | Aprobar batch de staging (idempotente) |
| GET | `/tareas/revision` | admin+ | Cola de revisión (estado `Pendiente Revisión`) |
| PATCH | `/tareas/:id/revision` | admin+ | Editar tarea en revisión |
| PATCH | `/tareas/:id/aprobar` | admin+ | Aprobar → `Pendiente` + email + socket |
| DELETE | `/tareas/:id` | admin+ | Rechazar y eliminar tarea en revisión |
| PATCH | `/tareas/:id` | admin+ | Actualizar prioridad / fecha / responsable |
| PATCH | `/tareas/:id/status` | todos | Cambiar estado (Pendiente / En Proceso / Completada) |
| GET | `/tareas/:id/notas` | todos | Listar notas de chat de la tarea |
| POST | `/tareas/:id/notas` | todos | Añadir nota (socket emit `new_note`) |

### Usuarios

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/users` | admin+ | Lista usuarios |
| DELETE | `/users/:correo` | admin+ | Eliminar usuario (socket: `user_force_logout`) |
| PATCH | `/users/:correo/rol` | superadmin | Cambiar rol (socket: `user_role_changed`) |

### Proyectos

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/projects` | todos | Lista proyectos |
| POST | `/api/projects` | admin+ | Crear proyecto |
| PATCH | `/api/projects/:id` | admin+ | Actualizar proyecto |
| DELETE | `/api/projects/:id` | superadmin | Eliminar proyecto |

### Procesamiento IA

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/procesar-reunion` | admin+ | Envía texto a Gemini/Groq, extrae tareas |
| POST | `/upload/texto` | admin+ | Upload PDF/DOCX → texto extraído |
| GET | `/api/minutas` | admin+ | Lista minutas procesadas |

### Notificaciones

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/notifications` | todos | Notificaciones del usuario (RBAC) |
| PATCH | `/api/notifications/:id/leer` | todos | Marcar una como leída |
| PATCH | `/api/notifications/leer-todo` | todos | Marcar todas como leídas |
| GET | `/api/notifications/notas-sin-leer` | todos | Conteo de notas no leídas por tarea `{ [id_tarea]: count }` |
| PATCH | `/api/notifications/leer-tarea/:taskId` | todos | Marcar como leídas todas las notas de una tarea |

### Stats / BI

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/stats` | admin+ | KPIs para dashboard (tareas por estado, proyecto, usuario) |

### Sistema

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Healthcheck: `{ status: 'ok', ts }` |

---

## 6. Socket.io — Tiempo real

El servidor Socket.io corre en el mismo puerto `3005` que la API HTTP. La conexión requiere un JWT válido en `socket.handshake.auth.token`.

### Rooms

| Room | Quién entra | Cuándo |
|------|-------------|--------|
| `alzak_global` | Todos los usuarios autenticados | Al conectar |
| `user_{email}` | Cada usuario en su room privado | Al conectar |
| `task_{id}` | Quién abre el chat de esa tarea | Evento `join_task` |

### Eventos servidor → cliente

| Evento | Room | Payload | Qué hace en el cliente |
|--------|------|---------|------------------------|
| `task_updated` | `alzak_global` | `{ id, status?, prioridad?, fecha_entrega?, ... }` | Mueve tarjeta Kanban sin recargar |
| `task_created` | `alzak_global` | — | Refresca board y cola de revisión |
| `notification_alert` | `alzak_global` o `user_{email}` | `{ tipo, id_tarea }` | Refresca badge + tono Web Audio API |
| `new_note` | `task_{id}` | `TaskNota` | Burbuja aparece en el chat del otro usuario |
| `typing_start` | `task_{id}` (otros) | `{ taskId, userName }` | Muestra "X está escribiendo…" |
| `typing_stop` | `task_{id}` (otros) | `{ taskId }` | Oculta indicador de escritura |
| `user_force_logout` | `user_{email}` | — | Cierra sesión del usuario eliminado |
| `user_role_changed` | `user_{email}` | `{ email, role }` | Actualiza rol en sesión + Toast |

### Eventos cliente → servidor (relay)

| Evento | Payload | Acción del servidor |
|--------|---------|---------------------|
| `join_task` | `taskId` | `socket.join('task_{taskId}')` |
| `leave_task` | `taskId` | `socket.leave('task_{taskId}')` |
| `typing_start` | `{ taskId, userName }` | Reenvía a `task_{taskId}` excepto al emisor |
| `typing_stop` | `{ taskId }` | Reenvía a `task_{taskId}` excepto al emisor |

### Flujo: Admin mueve tarea a "Completada"

```
Admin UI → PATCH /tareas/:id/status { status: "Completada" }
         → Backend actualiza DB
         → emitTaskUpdated({ id, status: "Completada" }) → alzak_global
         → Todos los clientes conectados actualizan la tarjeta en su tablero
```

### Flujo: Notificación instantánea con tipo

```
User escribe nota → POST /tareas/:id/notas
                  → INSERT task_notas
                  → io.emit('new_note', nota) → room task_{id}   [chat en vivo]
                  → INSERT db_notifications
                  → emitNotifAlert(null, { tipo: 'nota', id_tarea })  → alzak_global
                  → cliente recibe payload tipado → refresh badge + sonido
```

---

## 7. Frontend — Páginas y módulos

### `/login`
- Diseño en dos columnas: **logo Alzak Foundation** (WebP transparente) + divisor vertical + branding "Alzak Flow / by Alzak Foundation"
- Formulario email + contraseña → `POST /auth/login`
- Token guardado en `localStorage` (`alzak_token`, `alzak_user`)
- **Dev Bypass** visible en desarrollo: acceso por rol sin backend

---

### `/dashboard` — BI Ejecutivo
- **KPIs**: Tareas totales / Completadas / En Proceso / Vencidas
- **Gráfica de barras**: tareas por proyecto (agrupadas por estado)
- **Gráfica de dona**: distribución de carga por proyecto
- **Mis actividades recientes**: tareas propias del usuario
- **Tareas vencidas**: alertas de deadline
- Filtros: período (7d / 30d / 90d / Todo) + proyecto
- Datos desde `GET /api/stats` (admin) o calculados del store (user)

---

### `/procesador` — Procesador de Minutas IA _(admin+)_
**Paso 1 — Ingresar minuta:**
- Textarea libre o upload de archivo (PDF / DOCX → `/upload/texto`)
- Selector de proyecto y responsable principal
- Botón `✨ Procesar con IA` → envía a Gemini / Groq

**Paso 2 — Staging Area (validación):**
- Tarjetas editables por tarea extraída: descripción, responsable, prioridad, fecha
- `Aprobar` → pasa a cola de Revisión + notificación
- `✕` → descartar tarea individual
- `✅ Aprobar todo` → batch atómico (idempotente con `session_key`)

---

### `/revision` — Cola de Revisión _(admin+)_
- Tareas en estado `Pendiente Revisión` esperando aprobación final
- Vista card (mobile) / tabla (desktop)
- Edición inline de campos antes de aprobar
- `Aprobar` → tarea pasa a Kanban + email al responsable + socket `task_created`
- `Rechazar` → elimina la tarea + socket `task_created` (refresca listas)
- `Aprobar todo` con guard de idempotencia (no duplica si se llama dos veces)

---

### `/tareas` — Kanban Board _(todos los roles)_
**Tab Board:**
- **Admin/superadmin**: swimlanes por proyecto con 3 columnas (Pendiente / En Proceso / Completada)
- **User**: 3 columnas con sus tareas asignadas
- Sincronización en tiempo real: otra sesión mueve tarjeta → se mueve en tu tablero
- Alertas deadline: ≤ 2 días → ámbar | vencida → rojo
- Buscador + filtro por prioridad
- `+ Nueva tarea` (admin+) → `NewTaskModal`
- Clic en tarjeta → `TaskModal` completo
- Auto-apertura por URL param: `/tareas?open=42` (desde notificaciones)
- Deep-link con focus al chat: `/tareas?open=42&focus=notas` → scroll suave automático al chat

**Tab Historial:**
- Tareas completadas agrupadas por fecha de completado

**Tab Lista Maestra** _(admin+)_:
- Vista tabla plana de todas las tareas
- Exportar a PDF (con logo corporativo)

---

### `/proyectos` — Gestión de proyectos _(admin+)_
- Lista con filtros de estado (Activo / Completado / Inactivo)
- Buscador libre
- Estadísticas: Total / Activos / Completados / Inactivos
- Vista mobile: cards | Vista desktop: tabla
- Modal crear/editar: código (inmutable), nombre, financiador, empresa, estado

---

### `/usuarios` — Gestión de usuarios _(admin+)_
- Tarjetas con avatar, rol (badge color), email, estado activo
- Filtros: rol + estado + buscador
- Modal crear: nombre, correo, contraseña, rol
- Modal editar: cambiar rol (SuperAdmin únicamente)
- Eliminar: confirmación + Socket.io `user_force_logout` al afectado
- Cambio de rol: `PATCH /users/:correo/rol` → socket `user_role_changed`

---

### `/notas` — Centro de notas _(todos los roles)_
- **Panel izquierdo**: lista de tareas (admin ve todas, user ve las suyas)
- **Panel derecho**: chat de la tarea seleccionada
  - Burbujas de conversación (propio: derecha azul | otro: izquierda gris)
  - **Optimistic UI**: el mensaje aparece al instante antes de que el servidor responda
  - **Tiempo real**: la contraparte ve la burbuja sin recargar (Socket.io)
  - **Typing indicator**: "X está escribiendo…" con 3 puntos animados
  - Indicador `_pending` (spinner) → `_error` (rojo 2s) en caso de fallo
  - Auto-scroll al último mensaje

---

### `/perfil` — Perfil de usuario
- Avatar con iniciales, nombre, rol, email
- Resumen: total asignadas / completadas / en proceso / vencidas
- Barra de progreso de completado
- Tareas recientes
- Botón cerrar sesión

---

### `/admin/logs` — Audit Log _(solo superadmin)_
- Tabla de logs de actividad
- Widget **System Health**: estado de API, DB, IA y Auth

---

### Panel de Notificaciones (campana en sidebar)
- **Datos reales** de `db_notifications` vía `GET /api/notifications`
- **RBAC**: `user` ve solo sus asignaciones · `admin/superadmin` ve globales + propias
- **Tipos con icono**: asignacion 📋 · auditoria 🔍 · ingesta 🤖 · nota 💬 · completada ✅ · sistema ⚙️
- **Vista por defecto**: solo no leídas. Toggle "Ver historial" para ver leídas
- **Marcar leída**: clic en ítem → `PATCH /:id/leer` (optimistic UI)
- **Marcar todas leídas**: botón → `PATCH /leer-todo` (optimistic UI + confirmación DB)
- **Deep-linking**:
  - Notificación tipo `nota` → `/tareas?open={id_tarea}&focus=notas` (scroll al chat)
  - Notificación tipo `asignacion` → `/tareas?open={id_tarea}` (abre el modal)
- **Tiempo real**: socket `notification_alert { tipo, id_tarea }` → refresh instantáneo + tono Web Audio API
- **Polling de respaldo**: cada 30 segundos
- **Badge**: contador con máximo 99+, se resetea al marcar todo leído
- **Estado vacío**: "Todo al día ✅" cuando no hay pendientes
- **Singleton pattern**: una sola instancia del panel para evitar conflicto de listeners

---

## 8. Hooks personalizados

| Hook | Módulo | Responsabilidad |
|------|--------|-----------------|
| `useSocket` | Global | Singleton `socket.io-client` con JWT, lazy-init browser-only |
| `useTaskNotes` | Chat | Fetch notas, optimistic UI, socket `new_note`, typing debounced 3s |
| `useTaskBoard` | Tareas | Filtros Kanban, modal, auto-open URL param, chatFocus para deep-link |
| `useNotasUnread` | Tareas | Conteo `{ [id_tarea]: count }` de notas no leídas por tarea |
| `useRevision` | Revisión | Approve/reject/approveAll con idempotency lock (`useRef`) |
| `useProcesador` | Procesador | Stepper 2 pasos, llamada IA, staging |
| `useProyectos` | Proyectos | CRUD + filtros + Zod validation |
| `useUsuarios` | Usuarios | CRUD usuarios + cambio de rol |
| `useUsuariosPage` | Usuarios | Estado UI: modal, búsqueda, filtros |
| `useDashboardBI` | Dashboard | KPIs, filtros, datos de stats API |
| `useListaMaestra` | Tareas | Vista tabla + export PDF (jsPDF + autoTable + logo) |

---

## 9. Contextos React (estado global)

### `AuthContext`
```typescript
{
  user: { email, nombre, role } | null
  login(email, password): Promise<{ ok, error? }>
  loginMock(role): void          // Dev Bypass sin backend
  logout(): void                 // limpia token + desconecta socket
  isAuthenticated: boolean
  isLoading: boolean
}
```
Escucha via Socket.io:
- `user_force_logout` → logout automático (cuenta eliminada)
- `user_role_changed` → actualiza rol en localStorage + dispara `alzak:role_changed`

### `TaskStoreContext`
```typescript
{
  tasks: TaskWithMeta[]
  loading: boolean
  updateStatus(id, status): void        // optimistic + fire-and-forget API
  createTask(data): TaskWithMeta        // optimistic local
  refresh(): Promise<void>
  revisionTasks: RevisionTask[]
  revisionCount: number
  refreshRevision(): Promise<void>
  newIngestedFiles: string[]            // archivos Drive nuevos
  clearNewIngestedFiles(): void
}
```
Escucha via Socket.io:
- `task_updated` → aplica delta en el store sin recargar
- `task_created` → llama `refresh()` + `refreshRevision()`

### `NotificationContext`
```typescript
{
  notifications: DBNotification[]
  unreadCount: number
  loading: boolean
  refresh(): Promise<void>
  markRead(id): Promise<void>           // optimistic → PATCH /:id/leer
  markAllRead(): Promise<void>          // optimistic → PATCH /leer-todo + confirm DB
  addNotification(n): void             // local (sin DB)
}
```
Escucha via Socket.io:
- `notification_alert { tipo, id_tarea }` → `refresh()` + tono Web Audio API (si pestaña activa)
- Polling de respaldo: `setInterval(refresh, 30_000)`

### `ProjectStoreContext`
```typescript
{
  projects: MockProject[]
  createProject(p): void
  updateProject(id, updates): void
  deleteProject(id): void
}
```

### `StagingContext`
```typescript
{
  stagedTasks: StagingTask[]
  hasPending: boolean
  addStagedTasks(tasks[]): void
  updateStagedTask(id, updates): void
  removeTask(stagingId): void
  clearAll(): void
}
```

### `UserStoreContext`
```typescript
{
  users: User[]
  loading: boolean
  refresh(): Promise<void>
}
```

---

## 10. Sistema de roles RBAC

```
superadmin (3) > admin (2) > user (1)
```

### Acceso por ruta

| Ruta | user | admin | superadmin |
|------|:----:|:-----:|:----------:|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/tareas` | ✅ solo propias | ✅ todas | ✅ todas |
| `/notas` | ✅ propias | ✅ todas | ✅ todas |
| `/perfil` | ✅ | ✅ | ✅ |
| `/procesador` | ❌ | ✅ | ✅ |
| `/revision` | ❌ | ✅ | ✅ |
| `/proyectos` | ❌ | ✅ | ✅ |
| `/usuarios` | ❌ | ✅ | ✅ |
| `/admin/logs` | ❌ | ❌ | ✅ |

### Acceso a acciones

| Acción | user | admin | superadmin |
|--------|:----:|:-----:|:----------:|
| Ver/cambiar estado de sus tareas | ✅ | ✅ | ✅ |
| Ver todas las tareas | ❌ | ✅ | ✅ |
| Crear tarea manual | ❌ | ✅ | ✅ |
| Procesar minuta con IA | ❌ | ✅ | ✅ |
| Aprobar/rechazar staging y revisión | ❌ | ✅ | ✅ |
| CRUD proyectos | ❌ | ✅ | ✅ |
| CRUD usuarios | ❌ | ✅ | ✅ |
| Cambiar rol de usuario | ❌ | ❌ | ✅ |
| Eliminar proyectos | ❌ | ❌ | ✅ |
| Ver Audit Log | ❌ | ❌ | ✅ |

### Notificaciones por rol

| Tipo | user | admin/superadmin |
|------|:----:|:----------------:|
| Asignación (sus tareas) | ✅ | ✅ |
| Nota de admin en su tarea | ✅ | — |
| Nota de user en cualquier tarea | — | ✅ |
| Auditoría / Ingesta IA | ❌ | ✅ |

---

## 11. Flujo de procesamiento de minutas

```
1. Admin sube PDF/DOCX o pega texto en /procesador
2. Si archivo: POST /upload/texto → extrae texto (mammoth/pdf-parse)
3. POST /procesar-reunion → Google Gemini o Groq Llama 3.3
4. IA devuelve JSON: { id_proyecto, resumen, tareas[] }
5. Backend valida id_proyecto contra lista de IDs válidos (fallback: "1111")
6. Inserta en meetings + tasks (estado: "Pendiente Revisión")
7. Socket: emitTaskCreated() → cola de revisión se actualiza en todos los admins

── REVISIÓN ──
8. Admin revisa en /revision: edita campos si necesario
9. Aprobar tarea:
   - UPDATE estado_tarea → "Pendiente"
   - INSERT db_notifications (responsable + admins)
   - emitNotifAlert(correo, { tipo: 'asignacion', id_tarea }) → badge instantáneo
   - emitTaskCreated() → aparece en Kanban de todos
   - queueApprovedTask() → email consolidado al responsable
10. Rechazar: DELETE tarea

── KANBAN (tiempo real) ──
11. Responsable mueve tarea → PATCH /tareas/:id/status
    - emitTaskUpdated({ id, status }) → tablero de todos se actualiza
12. Admin escribe nota → POST /tareas/:id/notas
    - emit new_note al room task_{id}   → chat del responsable al instante
    - INSERT db_notifications para el responsable
    - emitNotifAlert(responsable, { tipo: 'nota', id_tarea })
13. Responsable hace clic en notificación tipo 'nota':
    - Navega a /tareas?open={id_tarea}&focus=notas
    - TaskModal se abre y hace scroll automático al chat
```

---

## 12. Docker — Despliegue

### Servicios

```yaml
# backend/docker-compose.yml

db-tunnel:    # Túnel SSH a MySQL DigitalOcean → localhost:3306
  healthcheck: nc -z 127.0.0.1 3306

api:          # Express + Socket.io — network_mode: host — puerto 3005
  depends_on: db-tunnel (healthy)

frontend:     # Next.js standalone — puerto 3001
  depends_on: api
```

### Comandos

```bash
# Primer despliegue o después de cambios de código
cd backend
docker compose build --no-cache api frontend
docker compose up -d

# Solo reiniciar (sin cambios de código)
docker compose restart

# Logs en vivo
docker logs alzak_flow_api -f
docker logs alzak_frontend -f

# Estado
docker ps
```

### Logs de arranque esperados (API)

```
🚀 ALZAK FLOW OPERATIVO
🔗 DB → localhost:3306
🔐 Auth JWT activo
🔌 Socket.io activo (JWT rooms: alzak_global · user_{email} · task_{id})
📡 Escuchando en 0.0.0.0:3005

✅ Tablas core OK: users, projects, meetings, tasks
   Tablas soporte OK: pending_emails, db_notifications, task_notas
✅ Estructura de DB validada y actualizada
```

---

## 13. Variables de entorno

### `backend/.env`

```bash
# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=usuario_mysql
DB_PASS=contraseña_mysql
DB_NAME=nombre_db

# Servidor en producción
DB_HOST_PROD=ip.servidor.digitalocean
DB_USER_PROD=usuario_prod
DB_PASS_PROD=contraseña_prod

# Túnel SSH
SSH_HOST=ip.servidor.digitalocean
SSH_USER=root
SSH_LOCAL_DB_PORT=3306
SSH_REMOTE_DB_PORT=3306

# JWT
JWT_SECRET=clave-secreta-muy-segura

# IA
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...

# Email (nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=correo@alzak.org
EMAIL_PASS=app-password

# Backend
PORT=3005
```

> **El archivo `.env` no se versiona.** Mantener en servidor o gestor de secretos.

---

## 14. Base de datos

La migración se ejecuta automáticamente al arrancar el backend. No requiere scripts manuales.

### Tabla `users`
```sql
email           VARCHAR(255) PRIMARY KEY
nombre_complete VARCHAR(255)
role            ENUM('superadmin', 'admin', 'user')
password_hash   VARCHAR(255)          -- bcrypt
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabla `projects`
```sql
id_proyecto     VARCHAR(50) PRIMARY KEY
nombre_proyecto VARCHAR(255)
empresa         VARCHAR(255)
financiador     VARCHAR(255)
estado          VARCHAR(50) DEFAULT 'Activo'
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabla `meetings`
```sql
id                INT AUTO_INCREMENT PRIMARY KEY
id_proyecto       VARCHAR(50)
resumen_ejecutivo TEXT
texto_original    LONGTEXT
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabla `tasks`
```sql
id                 INT AUTO_INCREMENT PRIMARY KEY
id_meeting         INT REFERENCES meetings(id)
id_proyecto        VARCHAR(50)
tarea_descripcion  TEXT
responsable_nombre VARCHAR(255)
responsable_correo VARCHAR(255)
prioridad          ENUM('Alta', 'Media', 'Baja') DEFAULT 'Media'
estado_tarea       VARCHAR(50) DEFAULT 'Pendiente Revisión'
fecha_inicio       DATE
fecha_entrega      DATE
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabla `db_notifications`
```sql
id                  INT AUTO_INCREMENT PRIMARY KEY
tipo                VARCHAR(50)    -- asignacion | auditoria | ingesta | nota | completada | sistema
titulo              VARCHAR(255)
mensaje             TEXT
id_tarea            INT
id_meeting          INT
destinatario_correo VARCHAR(255)   -- NULL = broadcast a admins (alzak_global)
leido               TINYINT(1) DEFAULT 0
created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabla `task_notas`
```sql
id              INT AUTO_INCREMENT PRIMARY KEY
id_tarea        INT NOT NULL
usuario_correo  VARCHAR(255) NOT NULL
usuario_nombre  VARCHAR(255) NOT NULL
mensaje         TEXT NOT NULL
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_tarea (id_tarea)
```

### Tabla `pending_emails`
```sql
id                  INT AUTO_INCREMENT PRIMARY KEY
destinatario_correo VARCHAR(255)
destinatario_nombre VARCHAR(255)
subject             VARCHAR(255)
body_html           TEXT
sent                TINYINT(1) DEFAULT 0
created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## 15. Dev Bypass — credenciales de prueba

En la pantalla de login hay un panel **Dev Bypass** para desarrollo sin backend:

| Rol | Nombre | Email |
|-----|--------|-------|
| `superadmin` | Carlos Carranza | c.carranza@alzak.org |
| `admin` | Alejandra Puerto | a.puerto@alzak.org |
| `user` | Lina Salcedo | l.salcedo@alzak.org |

Llama a `loginMock(role)` → inyecta usuario en `AuthContext` sin petición HTTP.

---

## 16. Historial de versiones

### v1.0 — `659c4c6`
Backup inicial: backend Express monolítico + frontend Next.js básico.

### v2.0 — `a7cc8c8` — Fases 2–5
- Dashboard RBAC con sidebar colapsable y bottom tabs mobile
- Kanban interactivo con swimlanes, historial y alertas de deadline
- Staging Area IA en 2 pasos con edición inline
- CRUD completo de proyectos y usuarios
- `/notas` — chat centralizado por tarea
- Sistema de notificaciones con badge y panel animado
- Toast system 4 tipos

### v3.0 — `327c5c7`
- Migración a **Node.js 22** en Docker
- Arquitectura modular (`backend/src/`): controllers, routes, services, middleware
- Auto-migración de DB al arrancar
- `CLAUDE.md` — constitución de arquitectura (átomos, hooks, Zod)

### v4.0 — `208318c` — Socket.io Tiempo Real
- **Socket.io v4** integrado con autenticación JWT por handshake
- Rooms: `alzak_global` · `user_{email}` · `task_{id}`
- **Kanban en tiempo real**: `task_updated` mueve tarjetas en todos los clientes
- **Chat bidireccional**: `new_note` — burbuja aparece al instante en la contraparte
- **Typing indicators**: "X está escribiendo…" con debounce 3s
- **Alertas sonoras**: tono Web Audio API al recibir notificación
- **Gestión de cuentas en vivo**: `user_force_logout` y `user_role_changed`
- Nuevo endpoint `PATCH /users/:correo/rol` (solo superadmin)
- Optimistic UI con estados `_pending` / `_error` en burbujas de chat
- `/revision` — página dedicada para la cola de aprobación
- Lista Maestra con export PDF (jsPDF + autoTable)
- Dashboard BI con KPIs en tiempo real desde API

### v5.0 — `HEAD` — Identidad Visual + Notificaciones Completas
- **Logo corporativo** (WebP transparente) en sidebar (4 variantes responsive), login, favicon, metadata y PDFs exportados
- **Login rediseñado**: dos columnas — logo izquierda + divisor + "Alzak Flow / by Alzak Foundation" derecha
- **PDF con logo**: conversión WebP→PNG via `<canvas>` para compatibilidad con jsPDF (sin fondo negro)
- **Panel de notificaciones** completamente funcional con datos reales de `db_notifications`:
  - RBAC: `user` ve sus asignaciones · `admin` ve globales + propias
  - Vista de no-leídas por defecto + toggle historial de leídas
  - Marcar individual (`PATCH /:id/leer`) y todas (`PATCH /leer-todo`) con optimistic UI
  - Badge contador en tiempo real (máx 99+)
  - Estado vacío "Todo al día ✅"
  - **Deep-linking**: notificación tipo `nota` → abre tarea y hace scroll al chat; tipo `asignacion` → abre modal de tarea
  - Socket `notification_alert` actualizado con payload `{ tipo, id_tarea }`
  - Polling de respaldo cada 30 segundos
- **Nuevos endpoints**: `GET /notas-sin-leer` · `PATCH /leer-tarea/:taskId`
- **`useNotasUnread`**: hook para conteo de notas no leídas por tarea
- **`useTaskBoard`**: soporte para `chatFocus` — scroll automático al chat desde deep-link
- **`sharp`**: añadido a dependencies para optimización de imágenes en Next.js standalone
- **Bug fix**: panel de notificaciones como singleton (un listener por instancia) — evita el patrón "ghost listener" donde dos instancias del mismo componente compiten por el mismo `mousedown` en `document`, cerrando el panel antes de que el clic se procese

---

## Repositorio

**GitHub:** [github.com/carforck/Appflow](https://github.com/carforck/Appflow)

---

*Alzak Foundation — Sistema de Gestión de Investigación Clínica*
