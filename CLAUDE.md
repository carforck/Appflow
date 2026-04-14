# CLAUDE.md — Constitución de Alzak Flow

> Este archivo es la norma fundamental del proyecto. Toda decisión de arquitectura de frontend debe respetarla.
> Antes de escribir cualquier componente, leer esta guía.

## Stack declarado

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS 3 + variables CSS propias (`globals.css`) |
| Validación | **Zod** — única fuente de verdad para schemas |
| Runtime scripts | Node v22 |

---

## Arquitectura de componentes — Tres capas

### Capa 1: Átomos (`components/ui/`)
Componentes de UI puros. Sin lógica de negocio. Solo props y estilos.

```
components/ui/
  Button.tsx     # Variantes: primary | secondary | ghost
  Input.tsx      # Input con label, error y soporte a11y
  Badge.tsx      # StatusBadge para estados de entidades
  Modal.tsx      # Overlay + contenedor con header y close
```

**Reglas de átomos:**
- Extienden los HTML attributes nativos (`ButtonHTMLAttributes`, etc.)
- Exponen variantes vía prop `variant`, nunca clases condicionales en el consumer
- Cero llamadas a contexto o hooks de dominio

**Reglas de accesibilidad (WCAG 2.1 AA) — obligatorias en todos los átomos:**
- `<button>` sin texto visible → siempre `aria-label`
- `<input>` siempre enlazado a su `<label>` via `htmlFor` / `id`
- Errores de formulario → `aria-invalid="true"` + `aria-describedby` apuntando al mensaje
- Mensajes de error → `role="alert"` para anuncio a lectores de pantalla
- Focus visible: nunca `outline: none` sin reemplazar por `focus-visible:ring-*`
- Orden de tabulación lógico; sin `tabIndex > 0`
- Contraste mínimo: 4.5:1 texto normal, 3:1 texto grande (≥ 18px bold o ≥ 24px)

---

### Capa 2: Moléculas (`components/<feature>/`)
Componentes de feature. Usan hooks + átomos. Sin llamadas directas a APIs.

```
components/proyectos/
  ProjectStats.tsx    # 4 cards de métricas
  ProjectFilters.tsx  # Búsqueda + filtros de estado
  ProjectCard.tsx     # Card mobile de un proyecto
  ProjectTable.tsx    # Tabla desktop con filas
  ProjectForm.tsx     # Formulario crear/editar (con Zod)
```

**Reglas de moléculas:**
- Reciben datos y callbacks via props — no acceden a contextos globales directamente
- Composición de átomos + lógica de presentación local
- Máximo 150 líneas; si supera, dividir

---

### Capa 3: Páginas (`app/(dashboard)/<ruta>/page.tsx`)
**Orquestadores delgados.** Solo importan el hook y las moléculas.

```tsx
// Regla de oro: la página no tiene useState ni useEffect
export default function ProyectosPage() {
  const { ... } = useProyectos();   // toda la lógica aquí
  return (
    <>
      <ProjectStats ... />
      <ProjectFilters ... />
      <ProjectTable ... />
      <Modal ...><ProjectForm ... /></Modal>
    </>
  );
}
```

**Límite: máximo 80 líneas por página.**

---

## Hooks personalizados (`hooks/`)

Toda la lógica de estado, filtros, efectos y operaciones CRUD vive en hooks.

```
hooks/
  useProyectos.ts    # filtrado, CRUD, validación Zod
  useTareas.ts       # (futuro)
  useUsuarios.ts     # (futuro)
```

**Reglas de hooks:**
- Un hook por feature/entidad
- Devuelve datos derivados listos para consumir (no raw state)
- Llaman a contextos globales (AuthContext, ProjectStoreContext, etc.)
- No contienen JSX

---

## Validación con Zod (`schemas/`)

Todo formulario tiene su schema en `schemas/<entidad>.ts`.

```
schemas/
  proyecto.ts    # ProjectFormSchema, ProjectStatusEnum, STATUS_LABEL, STATUS_COLOR
  tarea.ts       # (futuro)
  usuario.ts     # (futuro)
```

**Reglas de Zod:**
- Siempre `.safeParse()` — nunca `.parse()` sin try/catch
- Los errores se mapean a `Record<string, string>` antes de renderizar
- Los labels y colores de status viven en el schema, no en los componentes
- Un schema es la única fuente de verdad de una entidad

---

## Diseño — Mobile First

1. Diseñar móvil primero, luego extender con `sm:`, `lg:`
2. En móvil: Cards apiladas. En desktop: Tabla.
3. Tap targets mínimos de **44px** (botones, links de acción)
4. Sin scroll horizontal en ningún breakpoint
5. El patrón `sm:hidden` / `hidden sm:block` separa vistas

---

## Estilo visual

| Token | Valor |
|-------|-------|
| Azul corporativo | `alzak-blue` (#1a365d) |
| Dorado acento | `alzak-gold` (#eab308) |
| Borde cards | `rounded-[16px]` / `rounded-[20px]` |
| Borde inputs/botones | `rounded-xl` (12px) |
| Glassmorphism | clase `glass` + `style={{ background: 'var(--sidebar-bg)' }}` |

**Dark mode:** siempre par de clases (`text-slate-800 dark:text-white`).

---

## Convenciones de nombres

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes | PascalCase | `ProjectCard.tsx` |
| Hooks | camelCase + prefijo `use` | `useProyectos.ts` |
| Schemas | camelCase entidad | `proyecto.ts` |
| Páginas | `page.tsx` (Next.js) | — |

---

## Anti-patrones prohibidos

| Prohibido | Alternativa |
|-----------|-------------|
| `useState` / `useEffect` en `page.tsx` | Extraer a hook |
| Lógica de negocio en átomos UI | Mover a hook o molécula |
| Validación manual de formularios | Usar Zod `.safeParse()` |
| Componentes >200 líneas sin dividir | Extraer sub-componentes |
| Estilos inline arbitrarios | Tailwind o variables CSS |
| Fetch a API dentro de un componente | Hook o Server Component |

---

## Estándares de Calidad Internacional

> Principios adoptados de las guías de Midudev y las especificaciones WCAG / TypeScript team.
> Estas reglas elevan el código de funcional a clase mundial.

---

### A11y — Accesibilidad (WCAG 2.1 nivel AA)

La accesibilidad no es opcional. Se verifica antes de cada merge.

**Semántica HTML:**
```tsx
// MAL — div sin rol
<div onClick={handleEdit}>Editar</div>

// BIEN — elemento interactivo nativo
<button onClick={handleEdit}>Editar</button>

// BIEN — región con landmark
<main>, <nav>, <section aria-labelledby="titulo">, <article>
```

**ARIA — cuándo y cómo:**
```tsx
// Botón icono sin texto visible
<button aria-label="Cerrar modal">×</button>

// Estado expandible
<button aria-expanded={open} aria-controls="menu-id">Menú</button>

// Mensajes de error en formularios
<input aria-invalid={!!error} aria-describedby="campo-error" />
<p id="campo-error" role="alert">{error}</p>
```

**Navegación por teclado:**
- Todo flujo debe completarse sin ratón
- Modales: el foco entra al modal y queda atrapado (`focus trap`) hasta cerrar
- `Escape` siempre cierra modales y dropdowns
- `focus-visible:ring-2 focus-visible:ring-alzak-blue/50` en todos los interactivos

**Contraste mínimo (alzak-blue sobre blanco = 9.7:1 ✓, alzak-gold sobre dark = 4.8:1 ✓):**
- Texto normal (< 18px): ratio **4.5:1**
- Texto grande (≥ 18px o bold ≥ 14px): ratio **3:1**
- Componentes de UI (bordes de inputs en estado error): **3:1**

**Checklist antes de marcar un componente como terminado:**
- [ ] Todos los `<input>` tienen `<label>` asociado
- [ ] Todos los botones tienen nombre accesible
- [ ] Los colores no son el único indicador de estado (también ícono o texto)
- [ ] El componente es usable solo con teclado (`Tab`, `Enter`, `Space`, `Escape`)
- [ ] No hay `outline: none` sin alternativa visible

---

### Tailwind Patterns — Rendimiento y Mantenibilidad

**Regla de oro: Tailwind solo purga clases completas y estáticas.**

```tsx
// MAL — clase dinámica que el purger no detecta
const color = isDark ? 'text-' + 'white' : 'text-' + 'slate-800';

// BIEN — clases completas en el código fuente
const color = isDark ? 'text-white' : 'text-slate-800';
```

**Tokens de diseño — única fuente de verdad:**

En `globals.css` se definen las variables CSS del sistema (patrón equivalente al `@theme` de Tailwind v4):
```css
/* globals.css — design tokens del sistema */
:root {
  --background:  #f1f5f9;
  --sidebar-bg:  rgba(255, 255, 255, 0.90);
  --bottom-bar:  rgba(255, 255, 255, 0.94);
  /* Añadir aquí nuevos tokens antes de usarlos en componentes */
}
```

En `tailwind.config.ts` se mapean los colores de marca:
```ts
// tailwind.config.ts — NO agregar colores aquí sin añadirlos al sistema de diseño
alzak: { blue: '#1a365d', gold: '#eab308', light: '#f8fafc', dark: '#0f172a' }
```

> **Migración a Tailwind v4:** cuando se actualice, los tokens de `tailwind.config.ts`
> migran directamente a la directiva `@theme` en `globals.css`.
> Diseñar con eso en mente: un token = una variable CSS.

**`@layer` para utilities personalizadas:**
```css
/* globals.css */
@layer utilities {
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
}
```

**Purging — qué no hacer:**
- No generar clases con template literals fragmentados
- No usar `style={{}}` para valores que tienen equivalente en Tailwind
- Usar `style={{}}` solo para valores verdaderamente dinámicos (ej. `background: var(--sidebar-bg)`)

---

### TypeScript Avanzado — Tipado de Clase Mundial

**Regla absoluta: `any` es un error de compilación en este proyecto.**

```jsonc
// tsconfig.json — flags recomendados
{
  "strict": true,           // ya activo
  "noImplicitAny": true,    // ya incluido en strict
  "noUncheckedIndexedAccess": true  // añadir: acceso seguro a arrays
}
```

**Tipos genéricos para respuestas de API:**
```typescript
// lib/types.ts
interface ApiResponse<T> {
  data:    T;
  success: boolean;
  error?:  string;
}

// Estado asíncrono discriminado — nunca `isLoading: boolean` suelto
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error';   error: string };

// Uso
const [state, setState] = useState<AsyncState<MockProject[]>>({ status: 'idle' });
```

**Branded types para IDs — evitar mezclar IDs de entidades distintas:**
```typescript
// lib/types.ts
type ProjectId = string & { readonly __brand: 'ProjectId' };
type UserId    = string & { readonly __brand: 'UserId' };

// El compilador rechaza pasar un UserId donde se espera un ProjectId
function getProject(id: ProjectId): MockProject { ... }
```

**Tipos condicionales para permisos (Tareas y Usuarios):**
```typescript
type UserRole = 'superadmin' | 'admin' | 'user';

// Permisos derivados del rol — sin if/else en runtime
type CanManageUsers<R extends UserRole>   = R extends 'superadmin' | 'admin' ? true : false;
type CanDeleteProject<R extends UserRole> = R extends 'superadmin' ? true : false;

// Props condicionales según rol
type AdminOnlyProps<R extends UserRole> = CanManageUsers<R> extends true
  ? { onDelete: () => void }
  : { onDelete?: never };
```

**Discriminated unions para estados de Tarea:**
```typescript
// En lugar de múltiples booleans sueltos
type TareaState =
  | { status: 'Pendiente';   startedAt?: never;  completedAt?: never }
  | { status: 'En Proceso';  startedAt: string;  completedAt?: never }
  | { status: 'Completada';  startedAt: string;  completedAt: string };

// El compilador garantiza que completedAt solo existe en Completada
```

**Prohibiciones de TypeScript en este proyecto:**

| Prohibido | Alternativa |
|-----------|-------------|
| `any` | `unknown` + type guard, o el tipo correcto |
| `as any` | `as UnknownType` + validar con Zod |
| `// @ts-ignore` | Corregir el tipo o usar `// @ts-expect-error` con comentario |
| `object` genérico | Interface o `Record<string, unknown>` |
| Non-null assertion `!` sin justificación | Optional chaining `?.` o guard previo |
