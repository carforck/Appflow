/**
 * Parser semántico para el Procesador de Minutas — Modo Texto Directo.
 *
 * Cascada de detección por línea (orden estricto):
 *   0. Ruido    — vacío o solo símbolos/separadores         → ignorar
 *   1. Usuario  — wordOverlap ≥ 80% con tabla users         → actualizar currentUser, skip
 *   2. Proyecto — keyword O wordOverlap stripped ≥ 60%      → actualizar currentProject, skip
 *   3. Tarea    — todo lo demás hereda el contexto activo
 */

import type { MockUser, MockProject, TareaPrioridad, TareaStatus } from '@/lib/mockData';
import type { StagingTask } from '@/context/StagingContext';

// ── Proyecto por defecto ──────────────────────────────────────────────────────

export const GENERAL_PROJECT: Pick<MockProject, 'id_proyecto' | 'nombre_proyecto'> = {
  id_proyecto:     '1111',
  nombre_proyecto: 'ACTIVIDADES GENERALES',
};

// ── Normalización ─────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const KEYWORD_RE = /\b(proyecto|unidad|programa|program)\b/gi;

/** Elimina keywords de contexto de una cadena normalizada para comparación limpia. */
function stripKeywords(s: string): string {
  return normalize(s).replace(KEYWORD_RE, '').replace(/\s+/g, ' ').trim();
}

/** Palabras de ≥ 3 chars comunes entre `a` y `b`, relativo al conjunto mayor. */
function wordOverlap(a: string, b: string): number {
  const aw = a.split(/\s+/).filter((w) => w.length >= 3);
  const bw = b.split(/\s+/).filter((w) => w.length >= 3);
  if (aw.length === 0 || bw.length === 0) return 0;
  const hits = aw.filter((w) => bw.includes(w)).length;
  return hits / Math.max(aw.length, bw.length);
}

// ── Filtro de ruido ───────────────────────────────────────────────────────────

function isNoise(line: string): boolean {
  return line.trim() === '' || /^[\s\-_*#=|•·.,:;!?/\\~]+$/.test(line.trim());
}

// ── Detectores ────────────────────────────────────────────────────────────────

const PROJECT_KEYWORDS = /\b(proyecto|unidad|programa|program)\b/i;

/** ≥ 80% overlap con algún usuario activo. Ignora líneas largas. */
export function detectUser(line: string, users: MockUser[]): MockUser | null {
  if (line.length > 55) return null;
  for (const u of users.filter((u) => u.activo)) {
    if (wordOverlap(normalize(line), normalize(u.nombre_completo)) >= 0.8) return u;
  }
  return null;
}

/**
 * Detecta si la línea es una cabecera de proyecto.
 *
 * Estrategia:
 *  1. Si la línea tiene keyword ("Proyecto …"), se limpia el keyword de ambos lados
 *     y se compara el resto → match ≥ 60% o substring exacto.
 *  2. Sin keyword, se compara directamente nombre completo → overlap ≥ 70%.
 *
 * Retorna el proyecto encontrado, GENERAL_PROJECT si hay keyword sin match, o null.
 */
export function detectProject(
  line: string,
  projects: MockProject[],
): typeof GENERAL_PROJECT | MockProject | null {
  const hasKeyword = PROJECT_KEYWORDS.test(line);
  const nl         = normalize(line);

  // Texto de búsqueda: sin keywords para comparar en igualdad de condiciones
  const searchClean = stripKeywords(line);

  // Log de diagnóstico (visible en consola del navegador mientras se prueba)
  if (hasKeyword) {
    console.log(
      `[Parser] Proyecto detect │ línea: "${line}" │ cleaned: "${searchClean}"`,
    );
    console.log(
      '[Parser] DB proyectos:',
      projects.map((p) => `[${p.id_proyecto}] "${p.nombre_proyecto}" → clean: "${stripKeywords(p.nombre_proyecto)}"`),
    );
  }

  let matched: MockProject | null = null;

  for (const p of projects) {
    // Saltar el proyecto GENERAL para evitar falso match por ID '0'
    if (p.id_proyecto === '0') continue;

    const pId    = normalize(p.id_proyecto);
    const pClean = stripKeywords(p.nombre_proyecto);

    // 1. ID numérico/alfanumérico exacto dentro de la línea
    if (pId.length >= 2 && nl.includes(pId)) {
      if (hasKeyword) console.log(`[Parser]   ✓ ID match: "${p.id_proyecto}"`);
      matched = p;
      break;
    }

    // 2. Substring: el texto limpio de la línea está contenido en el nombre limpio del proyecto (o viceversa)
    if (searchClean.length >= 3 && (pClean.includes(searchClean) || searchClean.includes(pClean))) {
      if (hasKeyword) console.log(`[Parser]   ✓ Substring match: "${p.nombre_proyecto}"`);
      matched = p;
      break;
    }

    // 3. Word overlap entre texto limpio y nombre limpio del proyecto ≥ 60%
    const score = wordOverlap(searchClean, pClean);
    if (hasKeyword) {
      console.log(`[Parser]   ? "${p.nombre_proyecto}" │ pClean: "${pClean}" │ overlap: ${score.toFixed(2)}`);
    }
    if (score >= 0.6) {
      if (hasKeyword) console.log(`[Parser]   ✓ Overlap match: "${p.nombre_proyecto}" (${score.toFixed(2)})`);
      matched = p;
      break;
    }
  }

  if (hasKeyword) return matched ?? GENERAL_PROJECT;
  if (matched)    return matched;
  return null;
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseTextToTasks(
  texto: string,
  users: MockUser[],
  projects: MockProject[],
): Omit<StagingTask, 'stagingId'>[] {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const fechaDefault = nextWeek.toISOString().slice(0, 10);

  let currentUser:    MockUser | null                             = null;
  let currentProject: typeof GENERAL_PROJECT | MockProject       = GENERAL_PROJECT;

  const tasks: Omit<StagingTask, 'stagingId'>[] = [];

  console.log(`[Parser] Iniciando — ${users.length} usuarios, ${projects.length} proyectos`);

  for (const rawLine of texto.split('\n')) {
    const line = rawLine.trim();

    // 0. Ruido → ignorar
    if (isNoise(line)) continue;

    // 1. ¿Es nombre de usuario?
    const matchedUser = detectUser(line, users);
    if (matchedUser) {
      console.log(`[Parser] 👤 Usuario: "${line}" → ${matchedUser.nombre_completo}`);
      currentUser = matchedUser;
      continue;
    }

    // 2. ¿Es cabecera de proyecto?
    const matchedProject = detectProject(line, projects);
    if (matchedProject !== null) {
      console.log(`[Parser] 📁 Proyecto: "${line}" → [${matchedProject.id_proyecto}] ${matchedProject.nombre_proyecto}`);
      currentProject = matchedProject;
      continue;
    }

    // 3. Es tarea — hereda el contexto activo
    console.log(`[Parser] ✅ Tarea: "${line.slice(0, 60)}" │ user: ${currentUser?.nombre_completo ?? '—'} │ proyecto: ${currentProject.nombre_proyecto}`);
    tasks.push({
      id_proyecto:        currentProject.id_proyecto,
      nombre_proyecto:    currentProject.nombre_proyecto,
      tarea_descripcion:  line,
      responsable_nombre: currentUser?.nombre_completo ?? '',
      responsable_correo: currentUser?.correo          ?? '',
      prioridad:          'Media' as TareaPrioridad,
      fecha_entrega:      fechaDefault,
      status_inicial:     'Pendiente' as TareaStatus,
      ai_nota:            undefined,
    });
  }

  console.log(`[Parser] Fin — ${tasks.length} tareas generadas`);
  return tasks;
}
