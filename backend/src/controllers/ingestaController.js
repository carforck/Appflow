/**
 * src/controllers/ingestaController.js
 * Ingesta automática de minutas desde Google Apps Script (Google Drive).
 * Autenticación: api_key en el body (sin JWT).
 * Las tareas se guardan con estado_tarea = 'Pendiente Revisión'.
 */
const axios = require('axios');
const pool  = require('../config/db');

// ── Helpers (misma lógica que meetingController) ──────────────────────────────

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
 * Prepara el texto para Groq con estrategia multi-sección:
 *  1. Texto corto (<= MAX) → devuelve completo.
 *  2. Largo → extrae TODAS las secciones de compromisos del documento entero.
 *  3. Aún largo → filtra por nombres del equipo.
 *  4. Fallback → últimos MAX chars.
 */
function prepareText(raw, userRows) {
  const texto = raw.trim();

  if (texto.length <= MAX_PROMPT_CHARS) return texto;

  // Extraer TODAS las secciones de compromisos/tareas
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
    const chunks = sectionStarts.map((start, i) => {
      const nextStart = sectionStarts[i + 1] ?? (start + 8000);
      return texto.slice(start, Math.min(nextStart, start + 8000));
    });

    const combined = chunks.join('\n\n[...]\n\n');
    console.log(`✂️  Multi-sección: ${chunks.length} sección(es) → ${combined.length} chars`);

    if (combined.length <= MAX_PROMPT_CHARS) return combined;

    // Filtrar por nombres del equipo
    const firstNames = userRows
      .map((u) => u.nombre_complete.split(' ')[0].toLowerCase())
      .filter((n) => n.length > 2);
    const relevant = chunks.filter((c) =>
      firstNames.some((name) => c.toLowerCase().includes(name))
    );
    if (relevant.length > 0) {
      const filtrado = relevant.join('\n\n[...]\n\n');
      if (filtrado.length <= MAX_PROMPT_CHARS) return filtrado;
      return filtrado.slice(0, MAX_PROMPT_CHARS) + '\n\n[... truncado ...]';
    }

    return combined.slice(0, MAX_PROMPT_CHARS) + '\n\n[... truncado ...]';
  }

  console.log(`✂️  Sin secciones → últimos ${MAX_PROMPT_CHARS} chars`);
  return '[... inicio truncado — compromisos desde el final del documento ...]\n\n'
       + texto.slice(-MAX_PROMPT_CHARS);
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function resolveUser(nombre, userRows) {
  if (!nombre || nombre.toLowerCase() === 'por asignar') {
    return { nombre_complete: 'Por asignar', correo: '' };
  }
  const lower     = nombre.toLowerCase().trim();
  const byExact   = userRows.find((u) => u.nombre_complete.toLowerCase() === lower);
  if (byExact) return byExact;
  const byStart   = userRows.find((u) => u.nombre_complete.toLowerCase().startsWith(lower.split(' ')[0]));
  if (byStart) return byStart;
  const byContain = userRows.find((u) =>
    u.nombre_complete.toLowerCase().includes(lower) ||
    lower.split(' ').some((p) => p.length > 3 && u.nombre_complete.toLowerCase().includes(p))
  );
  return byContain ?? { nombre_complete: nombre, correo: '' };
}

// ── Controlador ───────────────────────────────────────────────────────────────

async function ingestaAuto(req, res) {
  const INGESTA_KEY = process.env.INGESTA_API_KEY;
  const { api_key, archivo = {}, secciones = {}, meta = {} } = req.body;

  // ── Autenticación por api_key ─────────────────────────────────────────────
  if (!INGESTA_KEY || api_key !== INGESTA_KEY) {
    console.warn(`🚫 Ingesta rechazada — api_key inválido`);
    return res.status(401).json({ error: 'api_key inválido o no configurado' });
  }

  // ── Selección de texto (prioridad: notas_gemini → transcripcion → texto_completo) ──
  const rawText = secciones.notas_gemini?.trim()
    || secciones.transcripcion?.trim()
    || secciones.texto_completo?.trim()
    || '';

  if (!rawText) {
    return res.status(400).json({ error: 'Se requiere al menos un campo en secciones con contenido' });
  }

  const fuenteTexto = secciones.notas_gemini  ? 'notas_gemini'
                    : secciones.transcripcion  ? 'transcripcion'
                    : 'texto_completo';

  const nombreArchivo = archivo.nombre ?? 'sin nombre';
  console.log(`📥 Ingesta Drive: "${nombreArchivo}" | fuente: ${fuenteTexto} | ${rawText.length} chars`);

  try {
    // ── 1. Contexto desde DB ──────────────────────────────────────────────────
    const [[projectRows], [userRows]] = await Promise.all([
      pool.query("SELECT id_proyecto, nombre_proyecto, empresa, financiador FROM projects WHERE estado = 'Activo' ORDER BY id_proyecto ASC"),
      pool.query('SELECT email, nombre_complete FROM users ORDER BY nombre_complete ASC'),
    ]);

    const VALID_IDS = new Set(projectRows.map((r) => r.id_proyecto));

    // Contexto enriquecido: ID + Nombre + [Empresa / Financiador] como aliases
    const projectContext = projectRows.map((p) => {
      const hints = [p.empresa, p.financiador].filter(Boolean).join(' / ');
      return hints ? `• ${p.id_proyecto}: ${p.nombre_proyecto} [${hints}]` : `• ${p.id_proyecto}: ${p.nombre_proyecto}`;
    }).join('\n');
    const userContext = userRows.map((u) => `• ${u.nombre_complete} <${u.email}>`).join('\n');

    const hoy    = new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const hoyISO = new Date().toISOString().split('T')[0];
    const responsable = meta.responsable_sugerido ?? '';

    // ── 2. Preparar texto ─────────────────────────────────────────────────────
    const textoGroq = prepareText(rawText, userRows);
    console.log(`🤖 Groq ingesta | texto=${textoGroq.length} chars | ${projectRows.length} proyectos | ${userRows.length} usuarios`);

    // ── 3. Llamada a Groq ─────────────────────────────────────────────────────
    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:       'llama-3.3-70b-versatile',
        max_tokens:  4096,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `Eres un PM Senior de Alzak Foundation. Hoy es ${hoy} (${hoyISO}).

═══ PROYECTOS ACTIVOS (única fuente de verdad) ═══
${projectContext}

═══ EQUIPO ═══
${userContext}

═══ MAPEO SEMÁNTICO (match contra lista viva — obligatorio) ═══
SOLO usa 6024 si el texto menciona EXPLÍCITAMENTE: VSR, VRS, virus sincicial, MSD, Casa del Niño, Hospital Erasmo.
SOLO usa 0025 si el texto menciona: App Seguimiento, aplicación móvil, seguimiento app, 0025.
SOLO usa 25923 si el texto menciona: Nirsevimab, Beyfortus, anticuerpo monoclonal RSV.
⛔ PROHIBIDO usar 6024 como proyecto por defecto — si no hay coincidencia clara → usa "1111".
Regla de oro: busca primero empresa y financiador de la lista; si coinciden → ese es el id_proyecto.

═══ REGLAS ═══
1. "id_proyecto" DEBE ser un ID exacto de la lista. NUNCA lo inventes.
2. Si no identificas el proyecto con certeza → usa "1111" (comodín).
3. "responsable" DEBE ser nombre exacto del equipo.
${responsable
  ? `4. Si no se especifica responsable, asignar a "${responsable}".`
  : '4. Si no hay responsable, usar "Por asignar".'}
5. Extrae TODAS las tareas, acciones y compromisos sin excepción.
6. Fechas relativas: "próxima semana"→${addDays(7)}, "dos semanas"→${addDays(14)}, sin fecha→${addDays(7)}.`,
          },
          {
            role: 'user',
            content: `Analiza esta minuta y extrae CADA tarea y compromiso.

MINUTA:
"""
${textoGroq}
"""

Responde ÚNICAMENTE con este JSON exacto:
{
  "id_proyecto": "ID exacto del proyecto principal de la sesión",
  "resumen": "resumen ejecutivo de 2-3 oraciones",
  "tareas": [
    {
      "id_proyecto": "ID exacto del proyecto de ESTA tarea (si la reunión toca varios proyectos; si no hay certeza usa el id_proyecto principal)",
      "descripcion": "descripción accionable",
      "responsable": "nombre exacto del equipo",
      "prioridad": "Alta|Media|Baja",
      "fecha": "YYYY-MM-DD",
      "nota": "contexto breve (máx 80 chars)"
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

    if (!VALID_IDS.has(dataIA.id_proyecto)) {
      console.warn(`⚠️ ID inválido "${dataIA.id_proyecto}" → reasignando a 1111`);
      dataIA.id_proyecto = '1111';
    }

    console.log(`✅ Groq extrajo ${dataIA.tareas.length} tareas → proyecto ${dataIA.id_proyecto}`);

    // ── 4. Guardar en DB (estado: 'Pendiente Revisión') ───────────────────────
    const resumenConFuente = `[Drive: ${nombreArchivo}] ${dataIA.resumen}`;
    const textoOriginal    = JSON.stringify({
      archivo,
      fuenteTexto,
      preview: rawText.slice(0, 3000),
    });

    const [resMeeting] = await pool.query(
      'INSERT INTO meetings (id_proyecto, resumen_ejecutivo, texto_original) VALUES (?, ?, ?)',
      [dataIA.id_proyecto, resumenConFuente, textoOriginal]
    );
    const meetingId = resMeeting.insertId;

    for (const t of dataIA.tareas) {
      const user = resolveUser(t.responsable, userRows);
      // Cada tarea puede tener su propio id_proyecto; fallback al proyecto de la sesión
      const taskProyId = VALID_IDS.has(t.id_proyecto) ? t.id_proyecto : dataIA.id_proyecto;
      await pool.query(
        `INSERT INTO tasks
         (id_meeting, id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo,
          prioridad, fecha_entrega, estado_tarea)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente Revisión')`,
        [
          meetingId,
          taskProyId,
          t.descripcion,
          user.nombre_complete,
          user.email || null,
          ['Alta', 'Media', 'Baja'].includes(t.prioridad) ? t.prioridad : 'Media',
          t.fecha ?? addDays(7),
        ]
      );
    }

    console.log(`💾 ${dataIA.tareas.length} tareas en Pendiente Revisión (meeting #${meetingId})`);

    // ── 5. Notificación en DB para admins ─────────────────────────────────────
    try {
      await pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_meeting)
         VALUES ('ingesta', ?, ?, ?)`,
        [
          `Nueva minuta: ${nombreArchivo}`,
          `${dataIA.tareas.length} tarea${dataIA.tareas.length !== 1 ? 's' : ''} extraída${dataIA.tareas.length !== 1 ? 's' : ''} · Proyecto ${dataIA.id_proyecto} · Fuente: ${fuenteTexto}`,
          meetingId,
        ]
      );
      console.log(`🔔 Notificación creada para meeting #${meetingId}`);
    } catch (notifErr) {
      // No crítico — el flujo continúa aunque falle la notificación
      console.warn(`⚠️ No se pudo crear notificación:`, notifErr.message);
    }

    res.json({
      status:         'queued',
      meetingId,
      proyecto:       dataIA.id_proyecto,
      tareas_creadas: dataIA.tareas.length,
      fuente_texto:   fuenteTexto,
    });
  } catch (error) {
    const detalle = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('❌ ERROR INGESTA-AUTO:', detalle);
    res.status(500).json({ error: 'Fallo en el servidor', detalle });
  }
}

module.exports = { ingestaAuto };
