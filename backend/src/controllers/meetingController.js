/**
 * src/controllers/meetingController.js
 * Procesador de minutas con Groq (Llama 3.3 70B).
 * Modo preview=true → extrae tareas sin persistir (para staging en frontend).
 * Modo preview=false → extrae + persiste en DB (flujo completo).
 */
const axios = require('axios');
const pool  = require('../config/db');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Prioridades de sección de minuta — el primero que se encuentre "gana" */
const SECTION_PATTERNS = [
  /compromisos?\s*[:\n]/i,
  /tareas?\s*[:\n]/i,
  /acuerdos?\s*[:\n]/i,
  /action\s+items?\s*[:\n]/i,
  /pendientes?\s*[:\n]/i,
  /responsabilidades?\s*[:\n]/i,
  /pr[oó]ximos?\s+pasos?\s*[:\n]/i,
  /seguimiento\s*[:\n]/i,
];

// llama-3.3-70b-versatile tiene una ventana de contexto de 128k tokens.
// 50k chars ≈ 31k tokens de texto puro — cómodo bajo el límite del modelo.
const MAX_PROMPT_CHARS = 50_000;

/**
 * Prepara un texto largo para Groq con estrategia "multi-sección":
 *  1. Si cabe en MAX_PROMPT_CHARS → devuelve el texto completo (sin truncar).
 *  2. Si es largo → extrae TODAS las secciones de compromisos/tareas del doc entero.
 *  3. Si aún excede → filtra por nombres del equipo.
 *  4. Fallback: últimos MAX_PROMPT_CHARS chars (compromisos suelen estar al final).
 */
function prepareTextForGroq(raw, userRows, responsable) {
  const texto = raw.trim();

  // Caso 1: documento corto — enviar completo sin ningún truncado
  if (texto.length <= MAX_PROMPT_CHARS) return texto;

  // Caso 2: documento largo — extraer TODAS las secciones de compromisos
  const sectionStarts = [];
  for (const pat of SECTION_PATTERNS) {
    const globalPat = new RegExp(pat.source, 'gi');
    let m;
    while ((m = globalPat.exec(texto)) !== null) {
      sectionStarts.push(m.index);
    }
  }

  if (sectionStarts.length > 0) {
    sectionStarts.sort((a, b) => a - b);

    // Extraer desde cada sección hasta la próxima (o hasta +8k chars)
    const chunks = sectionStarts.map((start, i) => {
      const nextStart = sectionStarts[i + 1] ?? (start + 8000);
      return texto.slice(start, Math.min(nextStart, start + 8000));
    });

    const combined = chunks.join('\n\n[...]\n\n');
    console.log(`✂️  Multi-sección: ${chunks.length} sección(es) detectadas → ${combined.length} chars`);

    if (combined.length <= MAX_PROMPT_CHARS) return combined;

    // Aún excede → filtrar chunks por nombres del equipo
    const firstNames = userRows
      .map((u) => u.nombre_complete.split(' ')[0].toLowerCase())
      .filter((n) => n.length > 2);
    if (responsable) firstNames.push(responsable.split(' ')[0].toLowerCase());

    const relevant = chunks.filter((c) =>
      firstNames.some((name) => c.toLowerCase().includes(name))
    );
    if (relevant.length > 0) {
      const filtrado = relevant.join('\n\n[...]\n\n');
      console.log(`✂️  Multi-sección filtrada por nombres: ${relevant.length}/${chunks.length} chunks → ${filtrado.length} chars`);
      if (filtrado.length <= MAX_PROMPT_CHARS) return filtrado;
      return filtrado.slice(0, MAX_PROMPT_CHARS) + '\n\n[... truncado ...]';
    }

    return combined.slice(0, MAX_PROMPT_CHARS) + '\n\n[... truncado ...]';
  }

  // Caso 3: sin secciones detectadas — últimos MAX_PROMPT_CHARS chars
  // (los compromisos suelen aparecer al final de las minutas)
  console.log(`✂️  Sin secciones detectadas → últimos ${MAX_PROMPT_CHARS} chars`);
  return '[... inicio truncado — compromisos desde el final del documento ...]\n\n'
       + texto.slice(-MAX_PROMPT_CHARS);
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function buildProjectContext(rows) {
  // ID + Nombre + [Empresa / Financiador] — permite que la IA mapee por alias/keywords
  return rows.map((p) => {
    const hints = [p.empresa, p.financiador].filter(Boolean).join(' / ');
    return hints
      ? `• ${p.id_proyecto}: ${p.nombre_proyecto} [${hints}]`
      : `• ${p.id_proyecto}: ${p.nombre_proyecto}`;
  }).join('\n');
}

function buildUserContext(rows) {
  return rows.map((u) => `• ${u.nombre_complete} <${u.correo}>`).join('\n');
}

/**
 * Busca el usuario más cercano en la lista por nombre parcial.
 * Prioridad: coincidencia exacta > comienza con > contiene.
 */
function resolveUser(nombre, userRows) {
  if (!nombre || nombre.toLowerCase() === 'por asignar') {
    return { nombre_complete: 'Por asignar', correo: '' };
  }
  const lower = nombre.toLowerCase().trim();
  const byExact  = userRows.find((u) => u.nombre_complete.toLowerCase() === lower);
  if (byExact) return byExact;
  const byStart  = userRows.find((u) => u.nombre_complete.toLowerCase().startsWith(lower.split(' ')[0]));
  if (byStart) return byStart;
  const byContain = userRows.find((u) =>
    u.nombre_complete.toLowerCase().includes(lower) ||
    lower.split(' ').some((part) => part.length > 3 && u.nombre_complete.toLowerCase().includes(part))
  );
  return byContain ?? { nombre_complete: nombre, correo: '' };
}

// ── Controlador principal ─────────────────────────────────────────────────────

async function procesarReunion(req, res) {
  const { texto, responsable_sugerido = '', preview = false } = req.body;
  if (!texto?.trim()) return res.status(400).json({ error: 'Falta el texto de la minuta' });

  try {
    // ── 1. Cargar contexto real desde DB ─────────────────────────────────────
    const [[projectRows], [userRows]] = await Promise.all([
      pool.query("SELECT id_proyecto, nombre_proyecto, empresa, financiador FROM projects WHERE estado = 'Activo' ORDER BY id_proyecto ASC"),
      pool.query('SELECT email, nombre_complete FROM users ORDER BY nombre_complete ASC'),
    ]);

    const VALID_IDS      = new Set(projectRows.map((r) => r.id_proyecto));
    const projectContext = buildProjectContext(projectRows);
    const userContext    = buildUserContext(userRows);

    const hoy = new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const hoyISO = new Date().toISOString().split('T')[0];

    // ── 2. Reducir el texto si viene de una transcripción larga ─────────────
    const textoGroq = prepareTextForGroq(texto, userRows, responsable_sugerido);
    console.log(`🤖 Groq preview=${preview} | ${projectRows.length} proyectos | ${userRows.length} usuarios | texto=${textoGroq.length} chars`);

    // ── 3. Llamada a Groq con contexto completo ───────────────────────────────
    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:      'llama-3.3-70b-versatile',
        max_tokens: 4096,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `Eres un PM Senior de Alzak Foundation, experto en investigación clínica. Hoy es ${hoy} (${hoyISO}).

═══ PROYECTOS ACTIVOS (única fuente de verdad) ═══
${projectContext}

═══ EQUIPO ALZAK FOUNDATION ═══
${userContext}

═══ MAPEO SEMÁNTICO (match contra lista viva — obligatorio) ═══
SOLO usa 6024 si el texto menciona EXPLÍCITAMENTE: VSR, VRS, virus sincicial, MSD, Casa del Niño, Hospital Erasmo.
SOLO usa 0025 si el texto menciona: App Seguimiento, aplicación móvil, seguimiento app, 0025.
SOLO usa 25923 si el texto menciona: Nirsevimab, Beyfortus, anticuerpo monoclonal RSV.
⛔ PROHIBIDO usar 6024 como proyecto por defecto — si no hay coincidencia clara → usa "1111".
Regla de oro: busca primero empresa y financiador de la lista; si coinciden → ese es el id_proyecto.

═══ REGLAS CRÍTICAS ═══
1. "id_proyecto" DEBE ser un ID exacto de la lista anterior. NUNCA inventes un ID.
2. Si no identificas el proyecto con certeza → usa "1111" (comodín).
3. "responsable" DEBE ser el nombre exacto de un miembro del equipo.
${responsable_sugerido
  ? `4. Si alguien dice "yo", "nosotros" o no se especifica → asignar a "${responsable_sugerido}".`
  : '4. Si no se menciona responsable → escribe "Por asignar".'}
5. Usa empresa/financiador del listado como alias para identificar el proyecto.

═══ EXTRACCIÓN EXHAUSTIVA (obligatorio) ═══
• Extrae ABSOLUTAMENTE TODAS las tareas, acciones, compromisos y pendientes — sin omitir ninguno.
• No hay límite de número de tareas. Una reunión de 2 horas puede tener 15-25 tareas.
• Cada persona con una responsabilidad = una tarea individual separada.
• Incluye tareas implícitas ("hay que revisar X", "se necesita actualizar Y").
• Fechas relativas → calcula desde hoy (${hoyISO}):
  - "próxima semana" → ${addDays(7)}
  - "en dos semanas" → ${addDays(14)}
  - "fin de mes" → último día del mes actual
  - "urgente" / "hoy" → ${hoyISO}
  - Sin fecha explícita → asigna 7 días por defecto`,
          },
          {
            role: 'user',
            content: `Analiza EXHAUSTIVAMENTE la siguiente minuta de reunión. Extrae CADA tarea, compromiso y pendiente sin excepción. No omitas ninguna responsabilidad mencionada, aunque sea implícita.

MINUTA:
"""
${textoGroq}
"""

Responde ÚNICAMENTE con este JSON exacto (sin texto adicional antes ni después):
{
  "id_proyecto": "ID exacto del proyecto principal de la sesión",
  "resumen": "resumen ejecutivo de 2-3 oraciones que capture los puntos clave",
  "tareas": [
    {
      "id_proyecto": "ID exacto del proyecto de ESTA tarea (puede diferir si la reunión toca varios proyectos; si no hay certeza usa el id_proyecto principal)",
      "descripcion": "descripción específica, accionable y completa de la tarea",
      "responsable": "nombre exacto del miembro del equipo",
      "prioridad": "Alta|Media|Baja",
      "fecha": "YYYY-MM-DD",
      "nota": "contexto o razón de esta tarea (máx 80 chars)"
    }
  ]
}`,
          },
        ],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const dataIA = JSON.parse(groqRes.data.choices[0].message.content);

    // ── 3. Validación de proyecto ─────────────────────────────────────────────
    if (!VALID_IDS.has(dataIA.id_proyecto)) {
      console.warn(`⚠️  ID inválido "${dataIA.id_proyecto}" → reasignando a 1111`);
      dataIA.id_proyecto = '1111';
    }

    const proyNombre = projectRows.find((p) => p.id_proyecto === dataIA.id_proyecto)?.nombre_proyecto
                    ?? dataIA.id_proyecto;

    console.log(`✅ Groq extrajo ${dataIA.tareas.length} tareas → proyecto ${dataIA.id_proyecto}`);

    // ── 4a. PREVIEW: devolver tareas resueltas sin persistir ──────────────────
    if (preview) {
      const tareasPreview = dataIA.tareas.map((t) => {
        const user = resolveUser(t.responsable, userRows);
        // Cada tarea puede pertenecer a un proyecto distinto si la IA lo detectó
        const taskId = VALID_IDS.has(t.id_proyecto) ? t.id_proyecto : dataIA.id_proyecto;
        const taskNombre = projectRows.find((p) => p.id_proyecto === taskId)?.nombre_proyecto ?? taskId;
        return {
          id_proyecto:        taskId,
          nombre_proyecto:    taskNombre,
          tarea_descripcion:  t.descripcion,
          responsable_nombre: user.nombre_complete,
          responsable_correo: user.email,
          prioridad:          ['Alta', 'Media', 'Baja'].includes(t.prioridad) ? t.prioridad : 'Media',
          fecha_entrega:      t.fecha ?? addDays(7),
          status_inicial:     'Pendiente',
          ai_nota:            t.nota ?? '',
        };
      });

      return res.json({
        status:  'preview',
        proyecto: dataIA.id_proyecto,
        resumen:  dataIA.resumen,
        tareas:   tareasPreview,
      });
    }

    // ── 4b. PERSISTIR: insertar meeting + tareas en DB ────────────────────────
    console.log(`💾 Guardando ${dataIA.tareas.length} tareas en DB...`);

    const [resMeeting] = await pool.query(
      'INSERT INTO meetings (id_proyecto, resumen_ejecutivo, texto_original) VALUES (?, ?, ?)',
      [dataIA.id_proyecto, dataIA.resumen, texto]
    );
    const meetingId = resMeeting.insertId;

    for (const t of dataIA.tareas) {
      const user = resolveUser(t.responsable, userRows);
      await pool.query(
        `INSERT INTO tasks
         (id_meeting, id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo, prioridad, fecha_entrega)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          meetingId,
          dataIA.id_proyecto,
          t.descripcion,
          user.nombre_complete,
          user.email || null,
          ['Alta', 'Media', 'Baja'].includes(t.prioridad) ? t.prioridad : 'Media',
          t.fecha ?? addDays(7),
        ]
      );
    }

    console.log('✅ Proceso completado');
    res.json({
      status:         'success',
      meetingId,
      proyecto:       dataIA.id_proyecto,
      tareas_creadas: dataIA.tareas.length,
    });
  } catch (error) {
    const detalle = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('❌ ERROR PROCESAR-REUNION:', detalle);
    res.status(500).json({ error: 'Fallo en el servidor', detalle });
  }
}

module.exports = { procesarReunion };
