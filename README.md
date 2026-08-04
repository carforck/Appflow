# Alzak Flow — Manual de Vuelo

> **v7.0** — Guía técnica completa para el equipo de desarrollo.
> Cubre stack, arquitectura, endpoints, socket, base de datos, despliegue y flujos de negocio.

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Base de datos](#6-base-de-datos)
7. [Backend — API REST completa](#7-backend--api-rest-completa)
8. [Socket.io — Tiempo real](#8-socketio--tiempo-real)
9. [Frontend — Páginas y módulos](#9-frontend--páginas-y-módulos)
10. [Contextos React](#10-contextos-react)
11. [Hooks personalizados](#11-hooks-personalizados)
12. [Sistema de roles RBAC](#12-sistema-de-roles-rbac)
13. [Flujo de procesamiento de minutas (IA)](#13-flujo-de-procesamiento-de-minutas-ia)
14. [Flujo de revisión y aprobación](#14-flujo-de-revisión-y-aprobación)
15. [Sistema de correos y recordatorios](#15-sistema-de-correos-y-recordatorios)
16. [Docker — Despliegue](#16-docker--despliegue)
17. [Git — Repositorios y deploy](#17-git--repositorios-y-deploy)
18. [Dev Bypass — credenciales de prueba](#18-dev-bypass--credenciales-de-prueba)
19. [Convenciones de código](#19-convenciones-de-código)
20. [Historial de versiones](#20-historial-de-versiones)

---

## 1. Descripción general

**Alzak Flow** centraliza la operación de estudios clínicos de Alzak Foundation:

| Módulo | Qué hace |
|--------|----------|
| **Procesador IA** | Extrae tareas de minutas de reunión (PDF, DOCX o texto) usando Gemini / Groq |
| **Matriz de Revisión** | Cola donde admins revisan, editan y aprueban tareas antes de enviarlas al equipo |
| **Kanban** | Tablero de trabajo por estados (Pendiente → En Proceso → Completada) con drag visual |
| **Chat de notas** | Comunicación por tarea, bidireccional en tiempo real con indicador "está escribiendo" |
| **Notificaciones** | Centro de notificaciones RBAC con Web Audio, polling + WebSocket. Estado de lectura independiente por admin (junction table) |
| **Recordatorios diarios** | Cron 8:00 AM (Bogotá) — envía correo HTML a responsables con tareas vencidas y próximas a vencer (≤ 3 días) |
| **Dashboard BI** | KPIs, gráficas Recharts, heatmap de actividad |
| **Proyectos / Usuarios** | CRUD completo con control de acceso por rol |

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE (Vercel — Next.js 14 SSR/CSR)                      │
│  Browser → HTTPS → alzakserver.tail94787f.ts.net            │
└────────────────────────┬───────────────────────────────────-┘
                         │ REST + WebSocket (Socket.io)
┌────────────────────────▼────────────────────────────────────┐
│  NGINX (puerto 443 — TLS cert Tailscale / Let's Encrypt)    │
│  proxy_pass → localhost:3005 + WebSocket upgrade            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  API (Docker — Express + Socket.io — puerto 3005)           │
│  network_mode: host · Tailscale Funnel → acceso público     │
└────────────────────────┬────────────────────────────────────┘
                         │ MySQL2 pool (10 conn)
┌────────────────────────▼────────────────────────────────────┐
│  TÚNEL SSH (Docker db-tunnel)                               │
│  localhost:3306 → SSH → DigitalOcean MySQL 8                │
└─────────────────────────────────────────────────────────────┘
```

**Acceso externo (Tailscale Funnel):**
- `tailscale funnel --bg --https=443 http://localhost:3005` expone el backend públicamente en `https://alzakserver.tail94787f.ts.net` sin requerir cliente Tailscale en los navegadores de los usuarios.
- El cert TLS proviene de Let's Encrypt vía `tailscale cert alzakserver.tail94787f.ts.net` y es confiable en todos los browsers.
- Nginx actúa como reverse proxy: termina TLS, setea headers `X-Real-IP` y gestiona el upgrade de WebSocket.

**Flujo de autenticación:**
```
Login → POST /auth/login → JWT (8h) →
  Headers: Authorization: Bearer <token>
  Socket:  socket.auth.token = token
```

---

## 3. Stack tecnológico

### Frontend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 14.2.35 | Framework App Router, SSR/CSR |
| React | 18 | UI library |
| TypeScript | 5 | Tipado estricto (`strict: true`) |
| Tailwind CSS | 3.4.1 | Estilos + tokens de diseño |
| socket.io-client | 4.8.3 | WebSocket cliente |
| next-themes | 0.4.6 | Dark/Light mode |
| Recharts | 3.8.1 | Gráficas BI |
| Zod | 4.3.6 | Validación de formularios |
| driver.js | 1.4.0 | Tour de onboarding primer login |
| jsPDF + autoTable | — | Export PDF Lista Maestra |
| sharp | 0.33.5 | Optimización imágenes (standalone) |

### Backend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | 22 (Alpine) | Runtime |
| Express | 4.18 | HTTP server + routing |
| Socket.io | 4.8.1 | WebSocket servidor con JWT |
| MySQL2 | 3.0 | Cliente MySQL con pool |
| jsonwebtoken | 9.0.3 | JWT (8h expiry) |
| bcryptjs | 3.0.3 | Hash de contraseñas |
| nodemailer | 6.10.1 | Envío de correos consolidados |
| @google/generative-ai | 0.24.1 | Gemini API |
| axios | 1.15.0 | Llamadas a Groq API |
| multer | 2.1.1 | Upload PDF/DOCX |
| mammoth | 1.12.0 | DOCX → texto |
| pdf-parse | 1.1.1 | PDF → texto |
| nodemon | 3.1.14 | Watch mode desarrollo |
| node-cron | — | Cron jobs (recordatorio diario 8 AM) |

### Infraestructura

| Componente | Tecnología |
|-----------|-----------|
| Base de datos | MySQL 8 en DigitalOcean |
| Túnel BD | SSH inverso en contenedor Alpine |
| Servidor | Docker Compose (3 servicios) |
| Frontend deploy | Vercel (rama `master` de `carforck/Appflow`, root dir `frontend/`) |
| Acceso externo | Tailscale Funnel + Nginx TLS (`alzakserver.tail94787f.ts.net`) |

---

## 4. Estructura de carpetas

```
alzak-flow/
├── README.md                     ← Este archivo
├── CLAUDE.md                     ← Constitución de arquitectura frontend
│
├── backend/
│   ├── index.js                  ← Entry point: Express + Socket.io + JWT + auto-migrate
│   ├── package.json
│   ├── Dockerfile                ← Node 22 Alpine
│   ├── Dockerfile.tunnel         ← SSH tunnel Alpine
│   ├── docker-compose.yml        ← 3 servicios: db-tunnel, api, frontend
│   ├── .env                      ← Variables de entorno (NO commitear)
│   └── src/
│       ├── config/
│       │   ├── db.js             ← Pool MySQL2 (10 conn, keep-alive 60s)
│       │   ├── migrate.js        ← Auto-migración schema al arrancar
│       │   └── socket.js         ← Singleton Socket.io + helpers de emit
│       ├── middleware/
│       │   └── auth.js           ← JWT authMiddleware + requireRole()
│       ├── controllers/
│       │   ├── authController.js          ← login, forgot/reset password
│       │   ├── taskController.js          ← CRUD tareas + socket emit
│       │   ├── notesController.js         ← Chat notas + new_note socket
│       │   ├── notificationController.js  ← Notificaciones RBAC
│       │   ├── userController.js          ← CRUD usuarios + toggleActivo
│       │   ├── projectController.js       ← CRUD proyectos
│       │   ├── meetingController.js       ← Procesador IA (Gemini/Groq)
│       │   ├── ingestaController.js       ← Ingesta Google Drive
│       │   ├── uploadController.js        ← PDF/DOCX → texto
│       │   ├── statsController.js         ← KPIs + heatmap BI
│       │   ├── logsController.js          ← Audit log
│       │   └── emailController.js         ← Gestión emails pendientes
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── taskRoutes.js
│       │   ├── userRoutes.js
│       │   ├── projectRoutes.js
│       │   ├── notificationRoutes.js
│       │   ├── meetingRoutes.js
│       │   ├── minutasRoutes.js
│       │   ├── uploadRoutes.js
│       │   ├── emailRoutes.js
│       │   ├── statsRoutes.js
│       │   └── logsRoutes.js
│       ├── services/
│       │   ├── emailService.js     ← Cola + consolidación + envío nodemailer
│       │   └── reminderService.js  ← Recordatorio diario: vencidas + próximas (≤ 3 días)
│       ├── jobs/
│       │   └── dailyReminder.js    ← node-cron 8:00 AM (America/Bogota)
│       └── utils/
│           └── logActivity.js    ← Helper audit log
│
└── frontend/
    ├── package.json
    ├── next.config.mjs           ← output: standalone, rewrites dev proxy
    ├── tailwind.config.ts        ← Tokens alzak-blue, alzak-gold
    ├── tsconfig.json             ← strict: true, @/* alias
    ├── .env.local                ← NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
    ├── Dockerfile                ← Next.js standalone Node 22
    ├── app/
    │   ├── layout.tsx            ← Root: ThemeProvider
    │   ├── page.tsx              ← Redirect → /dashboard o /login
    │   ├── globals.css           ← Variables CSS, glass morphism, kanban-scroll
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── reset-password/page.tsx
    │   └── (dashboard)/
    │       ├── layout.tsx        ← Auth guard + todos los Providers + useTour()
    │       ├── dashboard/page.tsx
    │       ├── procesador/page.tsx
    │       ├── tareas/page.tsx
    │       ├── revision/page.tsx
    │       ├── proyectos/page.tsx
    │       ├── usuarios/page.tsx
    │       ├── notas/page.tsx
    │       ├── perfil/page.tsx
    │       └── admin/logs/page.tsx
    ├── components/
    │   ├── Navigation.tsx        ← Sidebar + Drawer mobile + Bottom tabs + Bell
    │   ├── TaskModal.tsx         ← Modal completo tarea + chat
    │   ├── NewTaskModal.tsx      ← Crear tarea manual
    │   ├── NotificationPanel.tsx ← Panel notif RBAC + deep-link
    │   ├── Toast.tsx             ← Sistema toasts 4 tipos
    │   ├── ThemeToggle.tsx
    │   ├── dashboard/
    │   ├── procesador/
    │   ├── revision/
    │   │   ├── RevisionRow.tsx           ← Fila tabla desktop con 3 comboboxes
    │   │   ├── ApproveAllModal.tsx       ← Resumen por responsable antes de aprobar
    │   │   └── AddRevisionTaskModal.tsx  ← Formulario agregar tarea manual
    │   ├── tareas/
    │   ├── proyectos/
    │   ├── usuarios/
    │   └── ui/                   ← Átomos: Button, Input, Modal, Badge...
    ├── context/                  ← 8 contextos React (ver sección 10)
    ├── hooks/                    ← 16 hooks personalizados (ver sección 11)
    ├── schemas/
    │   └── proyecto.ts           ← Zod: ProjectFormSchema, StatusEnum
    └── lib/
        ├── api.ts                ← authFetch() + backendBase()
        ├── mockData.ts           ← Tipos TypeScript del dominio
        ├── pdfUtils.ts           ← Export PDF jsPDF + autoTable + logo
        └── textParser.ts         ← Parser texto local
```

---

## 5. Variables de entorno

### Backend (`backend/.env`)

```bash
# ── Base de datos (MySQL DigitalOcean vía túnel SSH) ─────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin
DB_PASS=<password>
DB_NAME=alzak_flow_db

# ── API & Seguridad ──────────────────────────────────────────────
JWT_SECRET=<clave-secreta-larga>
PORT=3005

# ── Inteligencia Artificial ──────────────────────────────────────
GROQ_API_KEY=gsk_...              # Groq (Llama 3.3) — fallback si Gemini falla
# GEMINI_API_KEY=AIza...          # Opcional si se usa Gemini directo

# ── Email (Gmail con App Password) ──────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=asistenteti@alzakfoundation.org
SMTP_PASS=<gmail-app-password>    # No es la contraseña normal, es App Password
SMTP_FROM=asistenteti@alzakfoundation.org

# ── Túnel SSH → DigitalOcean ─────────────────────────────────────
SSH_HOST=100.94.25.96
SSH_USER=root
SSH_PORT=22
SSH_REMOTE_DB_HOST=127.0.0.1
SSH_REMOTE_DB_PORT=3306
SSH_LOCAL_DB_PORT=3306
SSH_PRIVATE_KEY_B64=<clave-privada-en-base64>
```

> **Importante:** el campo `SSH_PRIVATE_KEY_B64` es la clave privada SSH codificada en base64.
> Generarla con: `base64 -w 0 ~/.ssh/id_ed25519`

### Frontend (`frontend/.env.local`)

```bash
# URL del backend (con protocolo, sin barra final)
# Producción (Tailscale):  https://alzakserver.tail94787f.ts.net
# Desarrollo local:        http://localhost:3005
NEXT_PUBLIC_API_URL=https://alzakserver.tail94787f.ts.net
NEXT_PUBLIC_SOCKET_URL=https://alzakserver.tail94787f.ts.net
```

> Estas variables se inyectan en el bundle en tiempo de build.
> Cambiarlas requiere rebuild en Vercel (no basta con cambiar en el panel si el build ya está cacheado).

---

## 6. Base de datos

**Motor:** MySQL 8 en DigitalOcean  
**Acceso:** túnel SSH inverso → `localhost:3306` dentro del contenedor

### Auto-migración

Al arrancar el backend, `src/config/migrate.js` ejecuta automáticamente:
1. Verifica existencia de tablas core (`users`, `projects`, `meetings`, `tasks`)
2. Añade columnas faltantes con `ALTER TABLE IF NOT EXISTS`
3. Crea tablas de soporte si no existen: `pending_emails`, `db_notifications`, `task_notas`, `activity_logs`, `password_resets`, `notification_reads`
4. **No bloquea el arranque** — solo loguea errores

### Esquema completo

```sql
-- ── USUARIOS ────────────────────────────────────────────────────
CREATE TABLE users (
  correo           VARCHAR(255) PRIMARY KEY,
  nombre_completo  VARCHAR(255),
  role             ENUM('superadmin', 'admin', 'user') DEFAULT 'user',
  password_hash    VARCHAR(255),
  activo           TINYINT(1) DEFAULT 1,   -- 0 = inhabilitado (bloquea login)
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── PROYECTOS ───────────────────────────────────────────────────
CREATE TABLE projects (
  id_proyecto      VARCHAR(50) PRIMARY KEY,
  nombre_proyecto  VARCHAR(255) NOT NULL,
  empresa          VARCHAR(255),
  financiador      VARCHAR(255),
  estado           VARCHAR(50) DEFAULT 'Activo',   -- 'Activo' | 'Cerrado'
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── REUNIONES (minutas procesadas) ──────────────────────────────
CREATE TABLE meetings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  id_proyecto      VARCHAR(50),
  session_key      VARCHAR(255) UNIQUE,  -- Idempotencia del procesador
  resumen_ejecutivo TEXT,
  texto_original   LONGTEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── TAREAS ──────────────────────────────────────────────────────
CREATE TABLE tasks (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  id_meeting           INT,               -- NULL = tarea manual (sin procesador)
  id_proyecto          VARCHAR(50),
  tarea_descripcion    TEXT NOT NULL,
  responsable_nombre   VARCHAR(255),
  responsable_correo   VARCHAR(255),
  prioridad            ENUM('Alta', 'Media', 'Baja') DEFAULT 'Media',
  estado_tarea         VARCHAR(50) DEFAULT 'Pendiente',
    -- Valores: 'Pendiente Revisión' | 'Pendiente' | 'En Proceso' | 'Completada'
  fecha_inicio         DATE,              -- Se autocompleta al llegar a revisión
  fecha_entrega        DATE,
  fecha_finalizacion   DATETIME,          -- Se llena al pasar a 'Completada'
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_meeting) REFERENCES meetings(id) ON DELETE SET NULL,
  FOREIGN KEY (id_proyecto) REFERENCES projects(id_proyecto) ON DELETE SET NULL
);

-- ── NOTAS/CHAT POR TAREA ─────────────────────────────────────────
CREATE TABLE task_notas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_tarea        INT NOT NULL,
  usuario_correo  VARCHAR(255),
  usuario_nombre  VARCHAR(255),
  mensaje         TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tarea (id_tarea),
  FOREIGN KEY (id_tarea) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ── NOTIFICACIONES ───────────────────────────────────────────────
CREATE TABLE db_notifications (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  tipo                  VARCHAR(50),
    -- 'asignacion' | 'auditoria' | 'ingesta' | 'nota' | 'completada' | 'sistema'
  titulo                VARCHAR(255),
  mensaje               TEXT,
  leido                 TINYINT(1) DEFAULT 0,
  id_tarea              INT,
  id_meeting            INT,
  destinatario_correo   VARCHAR(255),
    -- NULL = broadcast para todos los admin
    -- email = notificación privada RBAC
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── LECTURA DE NOTIFICACIONES GLOBALES (per-usuario) ───────────
-- Estado de lectura independiente para cada admin en notificaciones
-- con destinatario_correo IS NULL (broadcast). Sin esta tabla, marcar
-- una notificación como leída afectaría el badge de todos los admins.
CREATE TABLE notification_reads (
  id_notification  INT          NOT NULL,
  user_email       VARCHAR(255) NOT NULL,
  read_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notification, user_email),
  INDEX idx_user (user_email)
);
-- Nota: leido en db_notifications solo aplica a notificaciones privadas.
-- Para globales (destinatario_correo IS NULL), el estado leído = existe
-- una fila en notification_reads con ese (id_notification, user_email).

-- ── COLA DE EMAILS ───────────────────────────────────────────────
CREATE TABLE pending_emails (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  destinatario_correo   VARCHAR(255),
  destinatario_nombre   VARCHAR(255),
  id_tarea              INT,
  tarea_descripcion     TEXT,
  proyecto_nombre       VARCHAR(255),
  prioridad             VARCHAR(50),
  fecha_entrega         DATE,
  enviado               TINYINT(1) DEFAULT 0,
  sent_at               DATETIME,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── RESET DE CONTRASEÑA ──────────────────────────────────────────
CREATE TABLE password_resets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255),
  code        VARCHAR(10),          -- 6 dígitos, expira 15 min
  expires_at  DATETIME,
  used        TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── AUDIT LOG ───────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_correo  VARCHAR(255),
  usuario_nombre  VARCHAR(255),
  usuario_role    VARCHAR(50),
  accion          VARCHAR(100),     -- 'Create' | 'Update' | 'Delete' | 'Login'
  modulo          VARCHAR(100),     -- 'Tareas' | 'Proyectos' | 'Usuarios' | ...
  detalle         TEXT,
  ip_address      VARCHAR(100),
  entity_id       INT,
  entity_type     VARCHAR(50),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cómo identificar tareas manuales vs procesador

```sql
-- Tareas del procesador IA
SELECT * FROM tasks WHERE id_meeting IS NOT NULL;

-- Tareas agregadas manualmente por admin
SELECT * FROM tasks WHERE id_meeting IS NULL;
```

---

## 7. Backend — API REST completa

**Base URL:** `https://alzakserver.tail94787f.ts.net`  
**Auth:** `Authorization: Bearer <JWT>` en todos los endpoints (excepto `/auth/*` y `/health`)  
**Content-Type:** `application/json` (excepto uploads multipart)

### 7.1 Sistema

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | `{ status: 'ok', ts: ISO8601 }` |

### 7.2 Autenticación (`/auth`)

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | `{ correo, password }` | Retorna `{ token, user }` |
| POST | `/auth/forgot-password` | `{ email }` | Envía código OTP al correo |
| POST | `/auth/verify-reset-code` | `{ email, code }` | Valida código (15 min TTL) |
| POST | `/auth/reset-password` | `{ email, code, newPassword }` | Actualiza contraseña |

> Login retorna 403 si `activo = 0` (usuario inhabilitado).

### 7.3 Tareas (`/tareas`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/tareas` | Todos | Lista tareas activas. `user` → solo las propias. Params: `?prioridad=Alta&proyecto=ID&page=1&limit=500` |
| POST | `/tareas/crear` | admin+ | Crear tarea. Admins crean en `Pendiente`, users en `Pendiente Revisión` |
| POST | `/tareas/commit-staging` | admin+ | Aprobar batch del procesador IA (idempotente por `session_key`) |
| GET | `/tareas/notas-resumen` | admin+ | Conteo de notas por tarea |
| GET | `/tareas/revision` | admin+ | Cola de revisión (`estado = 'Pendiente Revisión'`) |
| POST | `/tareas/revision` | admin+ | Crear tarea directamente en revisión (manual, `id_meeting = NULL`) |
| PATCH | `/tareas/:id/revision` | admin+ | Editar campos de tarea en revisión |
| PATCH | `/tareas/:id/aprobar` | admin+ | Aprueba → `Pendiente` + socket + notif + email queue |
| DELETE | `/tareas/:id` | admin+ | Rechaza/elimina tarea (solo si está en revisión) |
| PATCH | `/tareas/:id` | admin+ | Actualizar prioridad, fecha, responsable (Lista Maestra). No acepta tareas en revisión |
| PATCH | `/tareas/:id/status` | Todos | Cambiar estado Kanban. Emite `task_updated` socket |
| GET | `/tareas/:id/notas` | Todos | Listar notas del chat de tarea |
| POST | `/tareas/:id/notas` | Todos | Agregar nota. Emite `new_note` socket a `task_{id}` |

### 7.4 Usuarios (`/users`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/users` | admin+ | Lista todos los usuarios con campo `activo` |
| DELETE | `/users/:correo` | admin+ | Eliminar usuario. Emite `user_force_logout` |
| PATCH | `/users/:correo/rol` | superadmin | Cambiar rol. Emite `user_role_changed` |
| PATCH | `/users/:correo/activo` | admin+ | Toggle activo/inactivo. Si inhabilita → emite `user_force_logout` |

### 7.5 Proyectos (`/api/projects`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/projects` | Todos | Lista proyectos |
| POST | `/api/projects` | admin+ | Crear proyecto |
| PUT | `/api/projects/:id` | admin+ | Actualizar proyecto |
| DELETE | `/api/projects/:id` | superadmin | Eliminar proyecto |

### 7.6 Procesador IA

| Método | Ruta | Rol | Body | Descripción |
|--------|------|-----|------|-------------|
| POST | `/procesar-reunion` | admin+ | `{ id_proyecto, texto }` | Extrae tareas con Gemini/Groq → retorna `{ tareas[], resumen }` |
| POST | `/upload/texto` | admin+ | `multipart: file` (PDF/DOCX) | Extrae texto del archivo → retorna `{ texto }` |
| GET | `/api/minutas` | admin+ | — | Lista minutas procesadas |
| POST | `/api/minutas/ingesta-auto` | api_key | `{ api_key, ... }` | Ingesta automática desde Google Drive |

### 7.7 Notificaciones (`/api/notifications`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/notifications` | Todos | Notificaciones del usuario (RBAC: propias + broadcast admin) |
| PATCH | `/api/notifications/:id/leer` | Todos | Marcar una notificación como leída |
| PATCH | `/api/notifications/leer-todo` | Todos | Marcar todas como leídas |
| GET | `/api/notifications/notas-sin-leer` | Todos | `{ [taskId]: count }` notas no leídas |
| PATCH | `/api/notifications/leer-tarea/:taskId` | Todos | Marcar leídas todas las notas de una tarea |

### 7.8 Stats / BI (`/api/stats`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/stats/dashboard` | admin+ | KPIs por estado, proyecto y usuario |
| GET | `/api/stats/actividad-heatmap` | admin+ | Heatmap actividad últimos 90 días |

### 7.9 Logs (`/api/logs`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/logs` | superadmin | Logs de actividad paginados. Params: `?page=1&limit=50&modulo=Tareas` |
| GET | `/api/logs/stats` | superadmin | Resumen estadístico de actividad |

---

## 8. Socket.io — Tiempo real

**Puerto:** mismo que la API REST (3005)  
**Auth:** `socket.handshake.auth.token = JWT`

### 8.1 Rooms

| Room | Quién entra | Cuándo |
|------|-------------|--------|
| `alzak_global` | Todos los autenticados | Al conectar |
| `user_{email}` | Solo ese usuario | Al conectar (privado) |
| `task_{id}` | Usuarios en ese chat | Evento `join_task` |
| `admins` | admin + superadmin | Al conectar |
| `superadmins` | Solo superadmins | Al conectar |

### 8.2 Eventos servidor → cliente

| Evento | Room destino | Payload | Qué hace el cliente |
|--------|-------------|---------|---------------------|
| `task_updated` | `alzak_global` | `{ id, status?, prioridad?, fecha_entrega?, responsable_nombre?, responsable_correo? }` | Mueve/actualiza tarjeta Kanban en tiempo real |
| `task_created` | `alzak_global` | — | Refresca el board y la cola de revisión |
| `notification_alert` | `admins` o `user_{email}` | `{ tipo, id_tarea?, titulo?, preview?, autor? }` | Actualiza badge + reproduce tono Web Audio. Las notificaciones globales solo van al room `admins` (no a todos los usuarios) |
| `new_note` | `task_{id}` | `TaskNota` completo | Aparece burbuja nueva en el chat |
| `typing_start` | `task_{id}` (excepto emisor) | `{ taskId, userName }` | Muestra "X está escribiendo…" |
| `typing_stop` | `task_{id}` (excepto emisor) | `{ taskId }` | Oculta indicador de escritura |
| `user_force_logout` | `user_{email}` | — | Cierra sesión y redirige a `/login` |
| `user_role_changed` | `user_{email}` | `{ email, role }` | Actualiza rol en AuthContext sin re-login |
| `active_users_update` | `superadmins` | `[{ email, nombre, role, connectedAt }]` | Actualiza lista de usuarios activos en tiempo real |

### 8.3 Eventos cliente → servidor

| Evento | Payload | Acción servidor |
|--------|---------|-----------------|
| `join_task` | `taskId` | `socket.join('task_{taskId}')` |
| `leave_task` | `taskId` | `socket.leave('task_{taskId}')` |
| `typing_start` | `{ taskId, userName }` | Reenvía a `task_{taskId}` (broadcast, sin emisor) |
| `typing_stop` | `{ taskId }` | Reenvía a `task_{taskId}` (broadcast, sin emisor) |

---

## 9. Frontend — Páginas y módulos

### Rutas (App Router Next.js 14)

| Ruta | Archivo | Rol mínimo | Descripción |
|------|---------|-----------|-------------|
| `/` | `app/page.tsx` | — | Redirect inteligente → `/dashboard` o `/login` |
| `/login` | `app/(auth)/login/page.tsx` | Público | Logo + formulario + dev bypass |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Público | Flujo OTP reset password |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | user | KPIs + gráficas + heatmap actividad |
| `/procesador` | `app/(dashboard)/procesador/page.tsx` | admin | IA 2 pasos: texto → staging → aprobar |
| `/tareas` | `app/(dashboard)/tareas/page.tsx` | user | Kanban + Historial + Lista Maestra |
| `/revision` | `app/(dashboard)/revision/page.tsx` | admin | Matriz de revisión tabular |
| `/proyectos` | `app/(dashboard)/proyectos/page.tsx` | admin | CRUD proyectos |
| `/usuarios` | `app/(dashboard)/usuarios/page.tsx` | admin | CRUD usuarios + toggle activo |
| `/notas` | `app/(dashboard)/notas/page.tsx` | user | Chat centralizado todas las tareas |
| `/perfil` | `app/(dashboard)/perfil/page.tsx` | user | Perfil + resumen de actividad |
| `/admin/logs` | `app/(dashboard)/admin/logs/page.tsx` | superadmin | Audit log + System Health |

### Layout del dashboard (`app/(dashboard)/layout.tsx`)

Envuelve todas las rutas del dashboard con:
- **Auth guard** → redirige a `/login` si no hay JWT válido
- **Todos los Providers** → Auth, TaskStore, ProjectStore, UserStore, Notification, StagingContext, NotasUnread, Sidebar
- **useTour()** → Tour de onboarding Driver.js en primer login

### Deep-link de notificaciones

Las notificaciones de tipo `nota` generan una URL con parámetros:
```
/tareas?open={taskId}&focus=notas
```
- `open` → abre `TaskModal` con esa tarea
- `focus=notas` → hace scroll automático al chat y activa `join_task` en socket

---

## 10. Contextos React

| Contexto | Estado principal | Responsabilidad |
|---------|----------------|-----------------|
| `AuthContext` | `user`, `token`, `isAuthenticated` | JWT decode, login/logout, listeners `user_force_logout` y `user_role_changed` |
| `TaskStoreContext` | `tasks[]`, `revisionTasks[]`, `loading` | Fetch inicial + listener `task_updated` / `task_created`, refresh on-demand |
| `NotificationContext` | `notifications[]`, `unreadCount` | Fetch + polling cada 30s + listener `notification_alert` + Web Audio API |
| `ProjectStoreContext` | `projects[]` | CRUD proyectos, usado en comboboxes y filtros |
| `StagingContext` | `stagedTasks[]`, `hasPending` | Tareas pendientes de aprobación del procesador IA |
| `UserStoreContext` | `users[]`, `loading` | Lista de usuarios para selects y asignaciones |
| `NotasUnreadContext` | `{ [taskId]: number }` | Conteo de notas no leídas por tarea (badge en TaskModal) |
| `SidebarContext` | `collapsed`, `mobileOpen` | Estado UI del sidebar (colapsado/expandido/mobile) |

---

## 11. Hooks personalizados

| Hook | Archivo | Responsabilidad principal |
|------|---------|--------------------------|
| `useSocket` | `hooks/useSocket.ts` | Singleton socket.io-client con JWT. Lazy-init solo en browser |
| `useTaskNotes` | `hooks/useTaskNotes.ts` | Fetch notas, optimistic UI, socket `new_note`, typing debounced 3s |
| `useTaskBoard` | `hooks/useTaskBoard.ts` | Kanban: filtros estado/proyecto/responsable, modal control, URL params deep-link |
| `useRevision` | `hooks/useRevision.ts` | Cola revisión: approve, reject, approveAll, rejectAll, addManualTask. Guards anti-concurrencia con `useRef` |
| `useProcesador` | `hooks/useProcesador.ts` | Stepper 2 pasos: upload/texto → IA → staging |
| `useProyectos` | `hooks/useProyectos.ts` | CRUD proyectos + filtros + validación Zod |
| `useUsuarios` | `hooks/useUsuarios.ts` | CRUD usuarios + cambio de rol |
| `useUsuariosPage` | `hooks/useUsuariosPage.ts` | UI state de la página usuarios: modal, búsqueda, toggle activo con rollback optimista |
| `useDashboardBI` | `hooks/useDashboardBI.ts` | KPIs, gráficas Recharts, filtros período/proyecto |
| `useListaMaestra` | `hooks/useListaMaestra.ts` | Tabla plana todas las tareas + export PDF con jsPDF |
| `useNotasUnread` | `hooks/useNotasUnread.ts` | Fetch conteo notas no leídas. Expone `markRead(taskId)` |
| `useActividadHeatmap` | `hooks/useActividadHeatmap.ts` | Datos heatmap últimos 90 días desde `/api/stats/actividad-heatmap` |
| `useLogs` | `hooks/useLogs.ts` | Fetch audit logs paginados (solo superadmin) |
| `useNotifToast` | `hooks/useNotifToast.ts` | Sistema toasts 4 tipos (success, error, warning, info) |
| `useNotasResumen` | `hooks/useNotasResumen.ts` | Resumen conteos notas por tarea |
| `useTour` | `hooks/useTour.ts` | Onboarding Driver.js. Detecta primer login por `localStorage('alzak_tour_v1')`. Pasos adaptados por rol (user vs admin). Lazy-load del bundle de driver.js |

---

## 12. Sistema de roles RBAC

```
superadmin  ───┐
admin       ───┼──▶  Herencia: superadmin puede todo lo de admin y user
user        ───┘
```

| Acción / Ruta | user | admin | superadmin |
|--------------|:----:|:-----:|:----------:|
| Ver `/dashboard` (KPIs globales) | ❌ solo propios | ✅ | ✅ |
| Ver `/tareas` (todas) | ❌ solo propias | ✅ | ✅ |
| Cambiar estado Kanban | ✅ | ✅ | ✅ |
| Notas en cualquier tarea | ✅ propias | ✅ | ✅ |
| `/procesador` | ❌ | ✅ | ✅ |
| `/revision` | ❌ | ✅ | ✅ |
| `/proyectos` | ❌ | ✅ | ✅ |
| `/usuarios` | ❌ | ✅ | ✅ |
| Inhabilitar usuario | ❌ | ✅ | ✅ |
| Cambiar rol de usuario | ❌ | ❌ | ✅ |
| Eliminar proyecto | ❌ | ❌ | ✅ |
| `/admin/logs` | ❌ | ❌ | ✅ |

**Implementación:**
- **Backend:** `authMiddleware` verifica JWT. `requireRole('admin', 'superadmin')` en rutas protegidas
- **Frontend:** `useAuth().user.role` controla qué se renderiza. El layout redirige a `/tareas` si el rol es `user` e intenta acceder a rutas admin

---

## 13. Flujo de procesamiento de minutas (IA)

```
1. Admin navega a /procesador
   │
   ├─ Sube archivo PDF/DOCX
   │    POST /upload/texto (multipart)
   │    → mammoth (DOCX) o pdf-parse (PDF) → texto plano
   │
   └─ O pega texto directamente
   │
2. POST /procesar-reunion { id_proyecto, texto }
   │
   ├─ Backend llama a Gemini API (primario)
   │    Si falla → Groq Llama 3.3 (fallback)
   │
   ├─ IA retorna JSON: { id_proyecto, resumen, tareas[] }
   │    cada tarea: { tarea_descripcion, responsable_nombre,
   │                  responsable_correo, prioridad, fecha_entrega }
   │
3. Frontend recibe tareas → StagingContext
   │    Paso 2: Admin revisa en la Staging Area (puede editar)
   │
4. Admin aprueba → POST /tareas/commit-staging
   │    { id_proyecto, resumen, tareas[], session_key }
   │
   ├─ Backend: INSERT meetings + tasks (estado: 'Pendiente Revisión')
   │    - session_key evita duplicados (caché 30s + verificación BD)
   │    - fecha_inicio = fecha del servidor (CURDATE())
   │
   └─ Socket: emitTaskCreated() → cola revisión actualiza en todos los admins
```

---

## 14. Flujo de revisión y aprobación

```
MATRIZ DE REVISIÓN (/revision)
│
├─ Tabla por tarea con columnas editables inline:
│   - ID Proyecto (combobox: busca por ID o nombre, solo activos)
│   - Nombre Proyecto (combobox independiente: misma búsqueda)
│   - Empresa / Financiador (cascada automática al elegir proyecto)
│   - Descripción (textarea con auto-save en onBlur)
│   - Responsable (combobox: busca por nombre o correo, solo activos)
│   - Prioridad (pills Alta/Media/Baja)
│   - Fecha inicio / Fecha fin (date inputs)
│
├─ Identificadores visuales:
│   - Pill "✏️ Manual" en tareas agregadas por admin (id_meeting = NULL)
│   - Fila en rojo si falta Proyecto o Responsable al intentar aprobar
│
├─ Botón "➕ Agregar tarea":
│   Abre AddRevisionTaskModal → crea tarea con id_meeting = NULL
│   Aparece al tope de la lista
│
├─ Botón "🗑 Eliminar todo":
│   Confirmación inline de 2 pasos → DELETE todas las tareas en revisión
│
└─ Botón "✅ Aprobar todo":
    1. Valida que TODAS las filas tengan Proyecto y Responsable
       Si no → marca filas en rojo + scroll automático a la primera
    2. Abre ApproveAllModal: resumen por responsable
    3. Admin confirma → PATCH /tareas/:id/aprobar por cada tarea
       - estado → 'Pendiente'
       - INSERT db_notifications
       - emitNotifAlert() → badge + sonido
       - queueApprovedTask() → email consolidado (debounce 10s)
```

---

## 15. Sistema de correos y recordatorios

### 15.1 Correos de aprobación (consolidados)

**Diseño:** un solo correo HTML por persona, sin importar cuántas tareas se aprueben.

```
Por cada aprobación:
  queueApprovedTask() → INSERT pending_emails (enviado = 0)
  scheduleEmailSend() → reinicia debounce 10 segundos

Después de 10s sin más aprobaciones:
  sendConsolidatedEmails()
    1. SELECT * FROM pending_emails WHERE enviado = 0
    2. GROUP BY destinatario_correo
    3. Envía UN correo HTML por destinatario
       - Tabla: Tarea | Proyecto | Prioridad | Fecha entrega
       - Colores de prioridad (rojo/amarillo/verde)
    4. UPDATE enviado = 1
```

**Consecuencia práctica:**
- 10 tareas aprobadas para Carlos en < 10s → Carlos recibe **1 correo**
- 10 tareas aprobadas, pausa > 10s, 5 más → Carlos recibe **2 correos**

**Modo dry-run:** si `SMTP_HOST/SMTP_USER/SMTP_PASS` no están en `.env`, los correos se loguean en consola sin error.

---

### 15.2 Recordatorio diario de tareas (cron)

**Horario:** 8:00 AM hora Colombia (`America/Bogota`, UTC-5), todos los días.  
**Archivo:** `src/jobs/dailyReminder.js` → `src/services/reminderService.js`  
**Arranque:** `scheduleDailyReminder()` se llama una sola vez en `index.js` al iniciar el servidor.

```
Cada día a las 8:00 AM:
  sendDailyReminders()
    1. Consulta tasks con estado ≠ 'Completada' y responsable_correo NOT NULL
       - Tareas vencidas:          fecha_entrega < HOY
       - Próximas a vencer (≤ 3d): fecha_entrega BETWEEN HOY y HOY+3

    2. GROUP BY responsable_correo

    3. Para cada responsable con tareas en alguna categoría:
       Envía UN correo HTML con dos secciones:
         🔴 "Tareas vencidas"      — fecha en rojo
         🟡 "Próximas a vencer"   — días restantes en badge
       Tabla: Descripción | Proyecto | Prioridad | Fecha entrega

    4. Loguea en consola: enviados / sin correo / dry-run
```

**Modo dry-run:** igual que en 15.1 — si SMTP no está configurado, imprime los correos que se enviarían sin lanzar error.

---

## 16. Docker — Despliegue

### Servicios en `docker-compose.yml`

| Servicio | Imagen | Puerto | Rol |
|---------|--------|--------|-----|
| `db-tunnel` | Alpine SSH | 127.0.0.1:3306 | Túnel SSH → MySQL DigitalOcean |
| `api` | Node 22 Alpine | 3005 (network_mode: host) | Express + Socket.io |
| `frontend` | Node 22 Alpine | 3001 | Next.js standalone |

### Comandos esenciales

```bash
cd backend/

# ── Primer despliegue ────────────────────────────────────────────
docker compose build --no-cache
docker compose up -d

# ── Actualizar solo el backend (cambio de código) ────────────────
docker compose up -d --build api

# ── Actualizar solo el frontend ──────────────────────────────────
docker compose up -d --build frontend

# ── Ver logs en vivo ─────────────────────────────────────────────
docker logs alzak_flow_api -f
docker logs alzak_frontend -f
docker logs alzak_tunnel -f

# ── Estado de contenedores ───────────────────────────────────────
docker ps

# ── Reiniciar sin rebuild ─────────────────────────────────────────
docker compose restart api
```

### Log de arranque esperado (API)

```
🚀 ALZAK FLOW OPERATIVO
🔗 DB → localhost:3306 (alzak_flow_db)
🔐 Auth JWT activo
🔌 Socket.io activo (JWT rooms: alzak_global · user_{email} · task_{id})
📡 Escuchando en 0.0.0.0:3005
✅ Tablas core: users, projects, meetings, tasks
✅ Tablas soporte: pending_emails, db_notifications, task_notas, activity_logs, password_resets, notification_reads
✅ DB validada y actualizada
📅 [cron] Recordatorio diario programado — 8:00 AM (America/Bogota)
```

---

## 17. Git — Repositorios y deploy

El proyecto se respalda en **tres repositorios git** con roles distintos:

| Repo | Remote | Rama | Propósito |
|------|--------|------|-----------|
| **Raíz** (`/alzak-flow/`) | `carforck/Appflow.git` (GitHub) | `master` | **Fuente de verdad** (backend + frontend). **Vercel despliega desde aquí** (root dir = `frontend/`) |
| **Backup empresa** (`/alzak-flow/`) | `alzak-foundation/alzak-flow` (GitLab interno) | `master` | Respaldo íntegro en la infraestructura de Alzak (`gitlab.alzakserver.org`, SSH puerto 2222) |
| **Espejo frontend** (`/alzak-flow/frontend/`) | `asistenteti-star/Appflow2026.git` (GitHub) | `main` | Espejo histórico solo del frontend. **NO dispara deploys** |

> **Aclaración importante (corregida):** Vercel está conectado al repo **raíz `carforck/Appflow`**
> con *root directory* = `frontend/`. Pushear a `master` de ese repo **es** lo que dispara el deploy.
> El repo `asistenteti-star/Appflow2026` NO está conectado a Vercel — es solo un espejo.

### Flujo de commit y respaldo

```bash
cd /home/admin-alzak/proyectos/alzak-flow

# 1. Commit (backend y/o frontend, todo va al repo raíz)
git add -A
git commit -m "feat: descripción"

# 2. Push a los repos que respaldan TODO el proyecto
git push origin master        # → carforck/Appflow  → dispara Vercel (frontend)
git push gitlab master        # → GitLab interno (backup empresa)

# 3. Si tocaste backend: rebuild Docker
cd backend && docker compose up -d --build api && cd ..

# 4. (Opcional) sincronizar el espejo solo-frontend
cd frontend && git add -A && git commit -m "sync" && git push origin main && cd ..
```

**Configurar el remote de GitLab interno** (una sola vez; usa token o SSH key registrada):

```bash
# Vía HTTPS con Personal Access Token (CA interna → sslVerify off en LAN):
git remote add gitlab https://oauth2:<TOKEN>@gitlab.alzakserver.org/alzak-foundation/alzak-flow.git
git config http.https://gitlab.alzakserver.org/.sslVerify false

# Vía SSH (puerto 2222, requiere clave registrada en GitLab):
git remote add gitlab ssh://git@gitlab.alzakserver.org:2222/alzak-foundation/alzak-flow.git
```

---

## 18. Dev Bypass — credenciales de prueba

En la pantalla de login existe un panel **Dev Bypass** que permite entrar sin backend:

| Rol | Nombre | Email |
|-----|--------|-------|
| superadmin | Carlos Carranza | c.carranza@alzak.org |
| admin | Alejandra Puerto | a.puerto@alzak.org |
| user | Lina Salcedo | l.salcedo@alzak.org |

Llama a `loginMock(role)` en `AuthContext` → inyecta usuario ficticio sin HTTP.
Útil para desarrollo de UI sin necesitar el backend activo.

---

## 19. Convenciones de código

### Arquitectura de componentes (3 capas)

```
Átomos     components/ui/          → Sin lógica, solo props/estilos
Moléculas  components/<feature>/   → Hooks + átomos, sin API directa
Páginas    app/(dashboard)/*/      → Solo orquestan hook + moléculas
```

**Límites:** máx 150 líneas en moléculas, máx 80 líneas en páginas.

### TypeScript

- `any` está prohibido — usar `unknown` + type guard o el tipo correcto
- `as any` está prohibido — usar Zod `.safeParse()` en boundaries externos
- Non-null assertion `!` solo con guard previo documentado
- Todos los formularios validan con **Zod** (`.safeParse()`, nunca `.parse()`)

### Tailwind

- Clases completas siempre: `text-white` ✅ — `text-${color}` ❌
- Dark mode: siempre par de clases: `text-slate-800 dark:text-white`
- Tap targets mínimo 44px en móvil
- Sin scroll horizontal en ningún breakpoint

### Tokens de diseño

| Token | Valor | Uso |
|-------|-------|-----|
| `alzak-blue` | `#1a365d` | Color corporativo principal |
| `alzak-gold` | `#eab308` | Acento dorado, dark mode highlights |
| Bordes cards | `rounded-[16px]` / `rounded-[20px]` | Cards y modales |
| Bordes inputs | `rounded-xl` (12px) | Inputs y botones |
| Glassmorphism | clase `glass` + `style={{ background: 'var(--sidebar-bg)' }}` | Cards del layout |

### Accesibilidad (WCAG 2.1 AA)

- `<button>` sin texto visible → siempre `aria-label`
- `<input>` → siempre `<label>` asociado
- Errores → `aria-invalid` + `aria-describedby` + `role="alert"`
- Todos los flujos completables solo con teclado
- `Escape` siempre cierra modales y dropdowns

### Scripts disponibles

```bash
# Backend
cd backend
npm run dev     # nodemon (watch mode)
npm run start   # producción

# Frontend
cd frontend
npm run dev     # Next.js -p 3001
npm run build   # Build + type check
npm run lint    # ESLint
```

---

## 20. Historial de versiones

| Versión | Cambios principales |
|---------|---------------------|
| **v7.0** | Recordatorio diario cron (8 AM Bogotá) con tareas vencidas y próximas a vencer. Notificaciones independientes por admin: tabla `notification_reads` (junction) — cada admin tiene su propio estado de lectura sin afectar a los demás. Room `admins` en Socket.io para alertas globales. Comboboxes de proyecto con búsqueda en todos los filtros (Dashboard, Lista Maestra, Revisión). Z-index fixes para dropdowns. Tailscale Funnel + Nginx TLS en producción |
| **v6.0** | Manual de vuelo completo. Matriz de revisión: comboboxes duales (ID+Nombre), scroll completo, solo activos, pill "✏️ Manual", fecha_inicio automática, botón Eliminar todo, modal Agregar tarea, modal confirmación Aprobar todo |
| **v5.0** | Socket.io tiempo real, identidad visual corporativa (logo WebP), notificaciones completas con Web Audio, tour onboarding Driver.js |
| **v4.0** | Filtros admin en Kanban (Proyecto + Responsable), pills de columna interactivos en móvil, inhabilitación de usuario con force-logout |
| **v3.0** | Matriz de Revisión tabular, cola de aprobación con validación, email consolidado con debounce |
| **v2.0** | Dashboard BI con Recharts, Lista Maestra con export PDF, Historial de completadas |
| **v1.0** | Kanban básico, procesador IA (Gemini/Groq), chat de notas, RBAC completo |
