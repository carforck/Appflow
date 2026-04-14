 # Alzak Flow

Sistema de gestión de tareas de investigación clínica para **Alzak Foundation**, con procesamiento de minutas por IA (Groq / Llama 3.3), Kanban interactivo, flujo de aprobación en staging area y RBAC completo.

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Backend — API REST](#5-backend--api-rest)
6. [Frontend — Páginas y módulos](#6-frontend--páginas-y-módulos)
7. [Contextos React (estado global)](#7-contextos-react-estado-global)
8. [Componentes reutilizables](#8-componentes-reutilizables)
9. [Sistema de roles RBAC](#9-sistema-de-roles-rbac)
10. [Flujo de procesamiento de minutas](#10-flujo-de-procesamiento-de-minutas)
11. [Configuración y variables de entorno](#11-configuración-y-variables-de-entorno)
12. [Instalación y ejecución](#12-instalación-y-ejecución)
13. [Acceso remoto y puertos](#13-acceso-remoto-y-puertos)
14. [Dev Bypass — credenciales de prueba](#14-dev-bypass--credenciales-de-prueba)
15. [Base de datos](#15-base-de-datos)
16. [Historial de versiones / fases](#16-historial-de-versiones--fases)

---

## 1. Descripción general

**Alzak Flow** automatiza la extracción y asignación de tareas a partir de minutas de reunión de estudios clínicos. El flujo es:

```
Minuta (texto libre)
       │
       ▼
  IA (Groq/Llama 3.3)
       │  extrae tareas estructuradas
       ▼
  Staging Area (validación Admin)
       │  editar · aprobar · descartar
       ▼
  Kanban Board  ──►  Notificación al responsable
       │
       ▼
  Historial de actividad
```

El sistema es **mock-first** en frontend (no requiere backend para desarrollo de UI) y se conecta al backend real cuando está disponible el túnel SSH a MySQL.

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE (Navegador)                                            │
│                                                                 │
│   Next.js 14 App Router  ·  React 18  ·  TypeScript             │
│   Tailwind CSS  ·  next-themes  ·  Recharts                     │
│   Puerto 3001  ·  0.0.0.0  (acceso LAN)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / fetch (authFetch)
                         │ Authorization: Bearer <JWT>
┌────────────────────────▼────────────────────────────────────────┐
│  BACKEND  (Express.js)                                          │
│                                                                 │
│   Node.js  ·  Express  ·  JWT (8h)  ·  bcryptjs                 │
│   Puerto 3000  ·  0.0.0.0                                       │
│                                                                 │
│   POST  /auth/login                                             │
│   GET   /users                                                  │
│   POST  /procesar-reunion   ──►  Groq API (Llama 3.3)           │
│   GET   /tareas                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ mysql2  ·  pool (10 conexiones)
                         │ 127.0.0.1:3307 (túnel SSH)
┌────────────────────────▼────────────────────────────────────────┐
│  BASE DE DATOS  (MySQL)                                         │
│                                                                 │
│   Servidor remoto  ·  Acceso vía túnel SSH en puerto local 3307 │
│   Tablas: users · meetings · tasks                              │
└─────────────────────────────────────────────────────────────────┘
```

### Conexión de red (acceso remoto)

| Servicio   | Host interno       | Puerto | Descripción                         |
|------------|--------------------|--------|-------------------------------------|
| Frontend   | `0.0.0.0`          | `3001` | Next.js dev server                  |
| Backend    | `0.0.0.0`          | `3000` | Express API                         |
| MySQL (túnel) | `127.0.0.1`     | `3307` | Túnel SSH al servidor de base de datos |
| Acceso LAN | `192.168.1.221`    | `3001` | URL de acceso desde la red local    |

---

## 3. Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14.2.35 | Framework App Router, SSR/SSG |
| React | 18 | UI components |
| TypeScript | 5 | Tipado estático |
| Tailwind CSS | 3.4 | Utilidades CSS |
| next-themes | 0.4.6 | Dark/Light mode |
| Recharts | 3.8.1 | Gráficas de progreso (SSR-safe) |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | LTS | Runtime |
| Express | 4.18 | HTTP server y routing |
| mysql2 | 3.x | Cliente MySQL con pool de conexiones |
| jsonwebtoken | 9.x | Autenticación JWT (8h expiry) |
| bcryptjs | 3.x | Hash de contraseñas |
| axios | 1.x | Cliente HTTP para Groq API |
| dotenv | 16.x | Variables de entorno |

### IA
| Servicio | Modelo | Uso |
|---|---|---|
| Groq | `llama-3.3-70b-versatile` | Extracción de tareas desde minuta de reunión |

---

## 4. Estructura de carpetas

```
alzak-flow/
├── backend/
│   ├── index.js              # API REST completa (257 líneas)
│   ├── package.json
│   └── .env                  # Variables de entorno (no versionado)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx         # Root layout (ThemeProvider, AuthProvider)
    │   ├── page.tsx           # Redirect: / → /dashboard o /login
    │   ├── globals.css        # Variables CSS, glass, animaciones
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx   # Login + Dev Bypass (3 roles)
    │   └── (dashboard)/
    │       ├── layout.tsx     # Guard auth, todos los Providers
    │       ├── dashboard/     # Métricas, gráficas Recharts
    │       ├── procesador/    # Procesador IA + Staging Area
    │       ├── tareas/        # Kanban Board + Historial
    │       ├── proyectos/     # CRUD 41 proyectos
    │       ├── usuarios/      # CRUD usuarios + toggle activo
    │       ├── notas/         # Chat centralizado de notas
    │       ├── perfil/        # Perfil de usuario + actividad
    │       └── admin/
    │           └── logs/      # Audit Log + System Health
    │
    ├── components/
    │   ├── Navigation.tsx     # Sidebar desktop + Drawer mobile + Bottom tabs
    │   ├── TaskModal.tsx      # Modal detalle de tarea con notas y AI context
    │   ├── NewTaskModal.tsx   # Modal crear nueva tarea
    │   ├── NotificationPanel.tsx # Panel de notificaciones animado
    │   ├── ProjectCharts.tsx  # BarChart + PieChart (Recharts)
    │   ├── Toast.tsx          # Sistema de toasts (4 tipos)
    │   └── ThemeToggle.tsx    # Botón dark/light mode
    │
    ├── context/
    │   ├── AuthContext.tsx        # Auth JWT + loginMock()
    │   ├── SidebarContext.tsx     # collapsed, mobileOpen
    │   ├── TaskStoreContext.tsx   # Tasks CRUD en memoria
    │   ├── StagingContext.tsx     # Tareas pendientes de validación IA
    │   ├── NotificationContext.tsx # Notificaciones con badge
    │   └── ProjectStoreContext.tsx # Proyectos CRUD en memoria
    │
    └── lib/
        ├── mockData.ts        # Tipos + datos mock (15 tareas, 41 proyectos,
        │                      # 16 usuarios, 20 logs, 7 notificaciones)
        └── api.ts             # authFetch() wrapper con JWT
```

---

## 5. Backend — API REST

Base URL: `http://localhost:3000`

### `POST /auth/login`
Autenticación de usuario. No requiere token.

**Body:**
```json
{
  "email": "usuario@alzak.org",
  "password": "contraseña"
}
```

**Respuesta exitosa (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "email": "usuario@alzak.org",
    "nombre": "Nombre Completo",
    "role": "admin"
  }
}
```

---

### `GET /users`
Lista usuarios activos. Requiere token JWT.

**Headers:** `Authorization: Bearer <token>`

**Respuesta (200):**
```json
{
  "status": "success",
  "users": [
    { "correo": "...", "nombre_completo": "...", "role": "user" }
  ]
}
```

---

### `POST /procesar-reunion`
Envía texto de reunión a **Groq (Llama 3.3)**, extrae tareas y las guarda en MySQL. Requiere rol `admin` o `superadmin`.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "texto": "Texto completo de la minuta de reunión...",
  "responsable_sugerido": "Nombre del responsable principal (opcional)"
}
```

**Respuesta exitosa (200):**
```json
{
  "status": "success",
  "meetingId": 42,
  "proyecto": "5024",
  "tareas_creadas": 3
}
```

**Proceso interno:**
1. Llama a `api.groq.com` con `llama-3.3-70b-versatile` en modo `json_object`
2. Valida que `id_proyecto` esté en la lista de 37 IDs válidos (fallback: `"1111"`)
3. Inserta en tabla `meetings` (resumen + texto original)
4. Por cada tarea: busca el correo del responsable en `users` por nombre similar, inserta en `tasks`

---

### `GET /tareas`
Retorna tareas con contexto de la reunión. RBAC aplicado en DB.

**Headers:** `Authorization: Bearer <token>`

**Query params opcionales:**
- `prioridad` — `Alta | Media | Baja`
- `proyecto` — ID de proyecto (ej: `5024`)

**RBAC:**
- `superadmin` / `admin`: ven todas las tareas
- `user`: solo ven sus propias tareas (`responsable_correo = email del token`)

**Respuesta (200):**
```json
{
  "status": "success",
  "total": 7,
  "tareas": [
    {
      "id": 1,
      "id_proyecto": "5024",
      "tarea_descripcion": "Preparar informe de avance...",
      "responsable_nombre": "Lina Salcedo",
      "responsable_correo": "lina.salcedo@alzak.org",
      "prioridad": "Alta",
      "status": "Pendiente",
      "fecha_entrega": "2026-04-20",
      "resumen_meeting": "Reunión de seguimiento Bayer 5024..."
    }
  ]
}
```

---

## 6. Frontend — Páginas y módulos

### `/` — Root redirect
Redirige a `/dashboard` si autenticado, a `/login` si no.

---

### `/login` — Autenticación
- Formulario email + contraseña → POST `/auth/login`
- Token guardado en `localStorage` (`alzak_token`, `alzak_user`)
- **Dev Bypass Panel** (visible solo en desarrollo): 3 botones de acceso rápido por rol sin necesidad de backend

---

### `/dashboard` — Panel principal
- Estadísticas globales: tareas por estado, proyectos activos
- **Gráfica de barras** agrupada por proyecto (Por Hacer / En Progreso / Hecho)
- **Gráfica de dona** distribución de carga por proyecto
- Filtros: período (30d / 90d / Todo) y proyecto
- Cargado con `next/dynamic({ ssr: false })` para compatibilidad Recharts

---

### `/procesador` — Procesador de Minutas con IA _(admin+)_
**Flujo en 2 pasos con stepper visual:**

**Paso 1 — Ingresar minuta:**
- Textarea de texto libre
- Selector de responsable principal (ayuda a la IA)
- Botón `✨ Procesar con IA` (simula llamada con delay 1.4s en modo mock)

**Paso 2 — Staging Area (validación):**
- Lista de tarjetas editables generadas por IA
- Cada tarjeta permite editar inline:
  - Descripción (textarea)
  - Responsable (buscador autocomplete de usuarios)
  - Prioridad (Alta / Media / Baja)
  - Fecha de entrega (date picker)
  - Estado inicial (Pendiente / En Proceso / Completada)
- Acciones por tarea: `Aprobar` → Kanban + Notificación | `✕` → Descartar
- Botones globales: `✅ Aprobar todo (N)` | `Descartar todo`
- Al aprobar: `createTask()` + `addNotification()` + `addToast("✅ Tarea aprobada y asignada a [Nombre]")`

---

### `/tareas` — Kanban Board + Historial
**Tab Board:**
- **Vista Admin** (`admin`/`superadmin`): swimlanes por proyecto con columnas Pendiente / En Proceso / Completada
- **Vista User**: 3 columnas simples con sus tareas asignadas
- Chips de estado inline en cada tarjeta (cambio sin abrir modal)
- Alertas de deadline: ≤ 2 días → `⚠️` ámbar | vencida → rojo
- Buscador por descripción, responsable o ID de proyecto
- Filtros de prioridad (Todas / Alta / Media / Baja)
- Botón `+ Nueva tarea` (solo admin+) → abre `NewTaskModal`
- Clic en tarjeta → abre `TaskModal` con detalle completo

**Tab Historial:**
- Tareas completadas agrupadas por fecha
- Cada entrada muestra: descripción, proyecto, responsable, prioridad, notas

---

### `/proyectos` — Gestión de proyectos _(admin+)_
- Lista de 41 proyectos activos, inactivos y completados
- **Vista mobile**: stack de tarjetas
- **Vista desktop**: tabla con columnas Código / Nombre / Financiador / Estado
- Filtros: búsqueda libre + filtro por estado
- Estadísticas: Total / Activos / Completados / Inactivos
- Modal crear: código (inmutable), nombre, financiador, estado
- Modal editar: mismos campos excepto código (read-only)

---

### `/usuarios` — CRUD de usuarios _(admin+)_
- Tarjetas de usuario con avatar, rol, email y toggle activo/inactivo
- Filtros por rol (superadmin / admin / user) y estado (activo / inactivo)
- Buscador por nombre o correo
- Modal crear/editar: nombre, correo (validación formato), rol por chips, switch activo
- Validación: no duplicar correo

---

### `/notas` — Centro de notas _(todos los roles)_
- **Panel izquierdo**: lista de tareas (admin ve todas, user ve las suyas)
- **Panel derecho**: chat de notas de la tarea seleccionada
  - Burbujas de conversación estilo chat (mensajes propios a la derecha)
  - Input de texto + botón Enviar
  - Auto-scroll al último mensaje
- **Resumen global** (solo admin): actividad reciente de los últimos 5 mensajes

---

### `/perfil` — Perfil de usuario _(todos los roles)_
- Avatar con iniciales, nombre, rol (con badge de color)
- Email y organización
- **Resumen de actividad**: total asignadas / completadas / en proceso / pendientes
- Barra de progreso de tasa de completado
- Lista de tareas completadas recientemente
- Botón `Cerrar sesión`

---

### `/admin/logs` — Audit Log _(solo superadmin)_
- Tabla de 20 entradas de log: usuario, correo, acción, módulo, detalle, timestamp
- Widget **System Health**: estado de API, Base de datos, IA (Groq) y Auth (JWT) con indicadores de latencia

---

## 7. Contextos React (estado global)

Todos los contextos se inicializan con datos mock y viven en memoria durante la sesión.

### `AuthContext`
```typescript
interface AuthContextType {
  user: { email; nombre; role } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(email, password): Promise<void>;   // → POST /auth/login
  loginMock(role: UserRole): void;         // Dev Bypass sin backend
  logout(): void;
}
```

### `TaskStoreContext`
```typescript
interface TaskStoreCtx {
  tasks: TaskWithMeta[];           // MockTarea + notas[] + completedAt
  updateStatus(id, status): void;  // Cambia estado, registra completedAt
  addNote(id, texto, autor): void; // Añade nota de seguimiento
  createTask(data: NewTaskData): TaskWithMeta; // Crea tarea aprobada
}
```

### `StagingContext`
```typescript
interface StagingCtx {
  stagedTasks: StagingTask[];      // Tareas pendientes de validación IA
  hasPending: boolean;
  addStagedTasks(tasks[]): void;   // Carga resultado del procesador
  updateStagedTask(id, updates): void; // Edición inline en validación
  removeTask(stagingId): void;     // Descartar una tarea
  clearAll(): void;                // Reiniciar staging
}
```

### `NotificationContext`
```typescript
interface NotificationCtx {
  notifications: MockNotification[];
  unreadCount: number;
  markRead(id): void;
  markAllRead(): void;
  addNotification(n): void;        // Disparado al aprobar tareas
}
```

### `ProjectStoreContext`
```typescript
interface ProjectStoreCtx {
  projects: MockProject[];         // 41 proyectos inicializados
  createProject(p): void;
  updateProject(id, updates): void;
}
```

### `SidebarContext`
```typescript
interface SidebarContextType {
  collapsed: boolean;              // Sidebar desktop colapsado
  mobileOpen: boolean;             // Drawer móvil abierto
  toggle(): void;
  toggleMobile(): void;
  closeMobile(): void;
}
```

---

## 8. Componentes reutilizables

### `Navigation`
Maneja los 3 modos de navegación:
- **Desktop expandido** (`w-64`): logo, nav items con label, campana de notificaciones, avatar → `/perfil`, logout
- **Desktop colapsado** (`w-[68px]`): solo iconos con tooltips
- **Mobile Top Bar**: hamburger, logo, campana, avatar
- **Mobile Drawer** (`w-72`, `z-60`): cubre pantalla, nav items + footer con logout
- **Mobile Bottom Tab Bar**: primeros 5 items del rol con iconos y etiquetas

### `NotificationPanel`
- Animación de entrada: `notif-in` (fade + slide + scale, `transform-origin: top right`)
- **Desktop**: posición `absolute left-full bottom-0 ml-3` (a la derecha del sidebar)
- **Mobile**: posición `fixed top-14 right-4` (debajo del header)
- Cierre: clic fuera, tecla Escape, botón ×

### `TaskModal`
- Deadline urgency badge (≤ 2 días → ámbar, vencida → rojo)
- 3 chips de estado con anillo activo
- Sección "Contexto IA" con `resumen_meeting`
- Lista de notas con autor y timestamp
- Añadir nota con Ctrl+Enter o botón

### `NewTaskModal`
- Selector de proyectos activos (filtrado del `ProjectStoreContext`)
- Buscador autocomplete de usuarios (MOCK_USERS)
- Chips de prioridad
- Date pickers (inicio + entrega con validación min)
- Validaciones: proyecto, descripción, responsable, fecha

### `Toast`
- 4 tipos: `success | info | warning | error`
- Auto-dismiss: 4500ms
- Posición: `fixed bottom-24 lg:bottom-5 right-4 z-[200]`

### `ProjectCharts`
- `ProgresoBarChart`: barras agrupadas por proyecto (3 colores por estado), cargado con `dynamic({ ssr: false })`
- `CargaPieChart`: dona con etiquetas de porcentaje, `PieLabelRenderProps`

---

## 9. Sistema de roles RBAC

```
superadmin (3) > admin (2) > user (1)
```

### Acceso por ruta

| Ruta | user | admin | superadmin |
|---|:---:|:---:|:---:|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/tareas` | ✅ (solo propias) | ✅ (todas) | ✅ (todas) |
| `/notas` | ✅ (propias) | ✅ (todas) | ✅ (todas) |
| `/perfil` | ✅ | ✅ | ✅ |
| `/procesador` | ❌ | ✅ | ✅ |
| `/proyectos` | ❌ | ✅ | ✅ |
| `/usuarios` | ❌ | ✅ | ✅ |
| `/admin/logs` | ❌ | ❌ | ✅ |

### Acceso a acciones

| Acción | user | admin | superadmin |
|---|:---:|:---:|:---:|
| Ver tareas propias | ✅ | ✅ | ✅ |
| Ver todas las tareas | ❌ | ✅ | ✅ |
| Cambiar estado de tarea | ✅ | ✅ | ✅ |
| Crear nueva tarea | ❌ | ✅ | ✅ |
| Procesar minuta con IA | ❌ | ✅ | ✅ |
| Aprobar/descartar staging | ❌ | ✅ | ✅ |
| CRUD usuarios | ❌ | ✅ | ✅ |
| CRUD proyectos | ❌ | ✅ | ✅ |
| Ver Audit Log | ❌ | ❌ | ✅ |

---

## 10. Flujo de procesamiento de minutas

### Modo producción (con backend + Groq)
```
1. Admin pega texto en /procesador → POST /procesar-reunion
2. Backend llama a Groq API (llama-3.3-70b-versatile, json_object)
3. IA retorna JSON: { id_proyecto, resumen, tareas[] }
4. Backend valida id_proyecto contra lista de 37 IDs válidos
5. Inserta en meetings + tasks en MySQL
6. Frontend muestra: "✅ X tareas creadas en proyecto Y"
```

### Modo mock (frontend sin backend)
```
1. Admin pega texto → simula delay 1.4s
2. Frontend analiza palabras clave del texto:
   - informe/reporte → tarea de informe
   - paciente/visita → seguimiento pacientes
   - consentimiento/crf → gestión documental
   - base de datos/ctms → actualización DB
   - reunión/comité → preparación reunión
   - farmacia/medicamento → control de medicamentos
   - protocolo/ética/irb → gestión regulatoria
3. Detecta urgencia ("urgente", "hoy", "asap") → prioridad Alta
4. Detecta proyecto por ID o nombre en el texto
5. Asigna el responsable pre-seleccionado
6. Carga StagingContext con las tareas extraídas

── STAGING AREA ──
7. Admin revisa cada tarjeta editando si es necesario
8. Aprobar una tarea:
   - TaskStoreContext.createTask() → aparece en Kanban
   - NotificationContext.addNotification() → badge en campana
   - Toast "✅ Tarea aprobada y asignada a [Nombre]"
9. Descartar → removeTask() del staging
10. "Aprobar todo" → procesa todas en secuencia
```

---

## 11. Configuración y variables de entorno

### Backend — `backend/.env`
```bash
# Base de datos MySQL (acceso por túnel SSH)
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=tu_usuario_mysql
DB_PASS=tu_contraseña_mysql
DB_NAME=nombre_de_la_base

# JWT
JWT_SECRET=clave-secreta-segura-en-produccion

# Groq IA
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **IMPORTANTE:** El archivo `.env` no debe versionarse. Añade `backend/.env` a `.gitignore`.

---

## 12. Instalación y ejecución

### Requisitos
- Node.js ≥ 18
- npm ≥ 9
- Túnel SSH activo hacia el servidor MySQL en el puerto 3307 (solo backend)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # edita las variables
node index.js
```

Salida esperada:
```
🚀 ALZAK FLOW OPERATIVO
🔗 DB vía túnel SSH en 127.0.0.1:3307
🔐 Auth JWT activo
📡 Escuchando en 0.0.0.0:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en: `http://192.168.1.221:3001` (o `localhost:3001`)

### Build de producción

```bash
cd frontend
npm run build
npm start
```

---

## 13. Acceso remoto y puertos

| URL | Descripción |
|---|---|
| `http://192.168.1.221:3001` | Frontend (acceso LAN) |
| `http://192.168.1.221:3001/login` | Página de login |
| `http://192.168.1.221:3001/dashboard` | Dashboard principal |
| `http://192.168.1.221:3000/auth/login` | API de autenticación |
| `http://192.168.1.221:3000/tareas` | API de tareas |

Para exponer externamente usar un proxy inverso (nginx) o servicio de túnel (ngrok, Cloudflare Tunnel).

---

## 14. Dev Bypass — credenciales de prueba

En la pantalla de login hay un panel de **Dev Bypass** con acceso inmediato sin backend:

| Rol | Nombre | Email |
|---|---|---|
| `superadmin` | Carlos Carranza | carlos.carranza@alzak.org |
| `admin` | Alejandra Puerto | alejandra.puerto@alzak.org |
| `user` | Lina Salcedo | lina.salcedo@alzak.org |

El bypass llama a `loginMock(role)` que inyecta un usuario ficticio en `AuthContext` sin hacer petición HTTP.

---

## 15. Base de datos

### Tabla `users`
```sql
correo          VARCHAR(255) PRIMARY KEY
nombre_completo VARCHAR(255)
role            ENUM('superadmin', 'admin', 'user')
password_hash   VARCHAR(255)   -- bcrypt
activo          TINYINT(1)     -- 1 = activo
```

### Tabla `meetings`
```sql
id              INT AUTO_INCREMENT PRIMARY KEY
id_proyecto     VARCHAR(50)    -- uno de los 37 IDs válidos
resumen_ejecutivo TEXT
texto_original  LONGTEXT
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabla `tasks`
```sql
id                   INT AUTO_INCREMENT PRIMARY KEY
id_meeting           INT REFERENCES meetings(id)
id_proyecto          VARCHAR(50)
tarea_descripcion    TEXT
responsable_nombre   VARCHAR(255)
responsable_correo   VARCHAR(255)
prioridad            ENUM('Alta', 'Media', 'Baja')
status               ENUM('Pendiente', 'En Proceso', 'Completada') DEFAULT 'Pendiente'
fecha_entrega        DATE
created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### IDs de proyecto válidos (37 proyectos)
```
25923, 2424, EXTERNO-1, 5024, 6124, EXTERNO-2, 6524, 0124, 0424, 2924,
3524, 0325, 1121, 1022, 1522, 1022-1, 1922, 2822, 0925, 1111, 1125,
0425, 1525, 2625, 6024, 0525, 1625, 2125, 2225, 1025, 2025, 1925,
0725, 3425, 4125, 3825, 0326
```

> `1111` = proyecto por defecto cuando la IA no puede identificar el proyecto

---

## 16. Historial de versiones / fases

### v1.0 — Commit `dea24c3`
Backup inicial: backend Express + frontend Next.js básico.

### v2.0 — Fases 2–5 — Commit `bd42f3f`

**Fase 2 — Dashboard profesional RBAC:**
- Sidebar colapsable desktop, bottom tab bar mobile
- Sistema RBAC con jerarquía `superadmin > admin > user`
- Dev Bypass con 3 roles en página de login
- Audit Log `/admin/logs` con System Health widget

**Fase 3 — Kanban interactivo + métricas:**
- Kanban con swimlanes por proyecto (admin) y vista personal (user)
- Chips de estado inline sin abrir modal
- Alertas de deadline urgencia (≤ 2 días) y vencida
- Historial de tareas completadas agrupado por fecha
- Dashboard con gráficas Recharts (BarChart + PieChart) cargadas con `next/dynamic`
- CRUD de usuarios completo con toggle activo/inactivo
- `TaskModal` con contexto IA, notas de seguimiento (Ctrl+Enter), Escape para cerrar

**Fase 4 — Comunicación, proyectos y mobile:**
- `NotificationCenter`: campana con badge en sidebar, panel con animación
- `/notas`: panel chat bidireccional por tarea, admin ve todos
- `/proyectos`: CRUD de 41 proyectos, filtros por estado, tabla desktop / cards mobile
- `/perfil`: resumen de actividad, tasa de completado, tareas recientes
- `NewTaskModal`: selector de proyectos activos, buscador de usuarios, prioridad, fechas
- Toast system: 4 tipos, auto-dismiss 4500ms
- Mobile-first: drawer lateral, bottom tabs, header con hamburger + avatar

**Fase 5 — Staging Area IA:**
- Procesador reescrito en 2 pasos con stepper visual
- `StagingContext`: estado global de tareas pendientes de validación
- Tarjetas editables inline: descripción, responsable, prioridad, fecha, estado inicial
- Flujo completo: aprobar → Kanban + notificación + toast
- Proyectos detectados automáticamente por ID/nombre en el texto
- Palabras clave para extracción: informe, visita, consentimiento, farmacia, protocolo, etc.
- Panel de notificaciones con animación `notif-in`, posicionamiento responsive

---

## Repositorio

**GitHub:** [github.com/carforck/Appflow](https://github.com/carforck/Appflow)

---

*Alzak Foundation — Sistema de Investigación Clínica*
