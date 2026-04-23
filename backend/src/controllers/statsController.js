/**
 * statsController.js — KPIs y datos BI para el Dashboard
 * Endpoint: GET /api/stats/dashboard
 *
 * Acceso universal (auth requerida). Cuando role === 'user', todas las métricas
 * se filtran automáticamente por responsable_correo = req.user.email.
 *
 * Query params opcionales (solo admin+):
 *   project_id  — filtrar por id_proyecto
 *   prioridad   — Alta | Media | Baja
 *   date_from   — YYYY-MM-DD (fecha_entrega >=)
 *   date_to     — YYYY-MM-DD (fecha_entrega <=)
 */
const pool = require('../config/db');

async function getDashboardStats(req, res) {
  try {
    const { project_id, prioridad, date_from, date_to } = req.query;
    const isUser    = req.user.role === 'user';
    const userEmail = req.user.email;

    // ── Construir filtros WHERE dinámicos ─────────────────────────────────────
    // Siempre excluir 'Pendiente Revisión' — no son tareas activas
    const conditions = [`t.estado_tarea != 'Pendiente Revisión'`];
    const params     = [];

    // Para rol 'user': filtrar todas las métricas por su correo — nunca 403
    if (isUser) {
      conditions.push('t.responsable_correo = ?');
      params.push(userEmail);
    }

    if (project_id) { conditions.push('t.id_proyecto = ?');      params.push(project_id); }
    if (prioridad)  { conditions.push('t.prioridad = ?');         params.push(prioridad); }
    if (date_from)  { conditions.push('t.fecha_entrega >= ?');    params.push(date_from); }
    if (date_to)    { conditions.push('t.fecha_entrega <= ?');    params.push(date_to); }

    const WHERE = `WHERE ${conditions.join(' AND ')}`;

    // ── 1. KPIs principales ───────────────────────────────────────────────────
    const [kpiRows] = await pool.query(
      `SELECT
        COUNT(*)                                                              AS total,
        SUM(t.estado_tarea != 'Completada')                                  AS vigentes,
        SUM(t.estado_tarea = 'Completada')                                   AS completadas,
        SUM(t.estado_tarea != 'Completada' AND t.fecha_entrega < CURDATE())  AS vencidas,
        -- Tasa de avance: completadas / total (nunca sube a 100% artificial)
        ROUND(
          100.0 * SUM(t.estado_tarea = 'Completada')
          / NULLIF(COUNT(*), 0)
        , 1)                                                                  AS cumplimiento
       FROM tasks t ${WHERE}`,
      params
    );

    const kpi = kpiRows[0] ?? {};

    // ── 2. Donut de estados ───────────────────────────────────────────────────
    const [donutRows] = await pool.query(
      `SELECT
        SUM(t.estado_tarea = 'Pendiente')   AS pendiente,
        SUM(t.estado_tarea = 'En Proceso')  AS en_proceso,
        SUM(t.estado_tarea = 'Completada')  AS completada
       FROM tasks t ${WHERE}`,
      params
    );

    // ── 3. Barras apiladas 100% — por correo para evitar duplicados ───────────
    const [barRows] = await pool.query(
      `SELECT
        t.responsable_correo                               AS correo,
        MAX(t.responsable_nombre)                          AS nombre,
        COUNT(*)                                           AS total,
        SUM(t.estado_tarea = 'Pendiente')                  AS pendiente,
        SUM(t.estado_tarea = 'En Proceso')                 AS en_proceso,
        SUM(t.estado_tarea = 'Completada')                 AS completada
       FROM tasks t ${WHERE}
       GROUP BY t.responsable_correo
       ORDER BY total DESC
       LIMIT 10`,
      params
    );

    const stackedBars = barRows.map((r) => {
      const total = Number(r.total) || 1;
      return {
        nombre:        r.nombre ?? r.correo ?? 'Sin asignar',
        total:         Number(r.total),
        pendientePct:  Math.round((Number(r.pendiente)  / total) * 100),
        en_procesoPct: Math.round((Number(r.en_proceso) / total) * 100),
        completadaPct: Math.round((Number(r.completada) / total) * 100),
        pendiente:     Number(r.pendiente),
        en_proceso:    Number(r.en_proceso),
        completada:    Number(r.completada),
      };
    });

    // ── 4. Carga laboral ──────────────────────────────────────────────────────
    const [cargaRows] = await pool.query(
      `SELECT
        t.responsable_correo                                                    AS correo,
        MAX(t.responsable_nombre)                                               AS nombre,
        SUM(t.estado_tarea IN ('Pendiente', 'En Proceso'))                      AS vigentes,
        SUM(t.estado_tarea IN ('Pendiente', 'En Proceso')
            AND t.fecha_entrega < CURDATE())                                    AS vencidas_activas
       FROM tasks t ${WHERE}
       GROUP BY t.responsable_correo
       HAVING vigentes > 0
       ORDER BY vigentes DESC`,
      params
    );

    // ── 5. Tareas vencidas — con nombre_proyecto oficial ──────────────────────
    const vencidasConditions = [
      ...conditions,
      "t.fecha_entrega < CURDATE()",
      "t.estado_tarea != 'Completada'",
    ];
    const vencidasWhere = `WHERE ${vencidasConditions.join(' AND ')}`;

    const [vencidasRows] = await pool.query(
      `SELECT
        t.id,
        t.id_proyecto,
        COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto,
        t.tarea_descripcion,
        t.responsable_nombre, t.responsable_correo,
        t.prioridad, t.fecha_entrega,
        t.estado_tarea AS status,
        DATEDIFF(CURDATE(), t.fecha_entrega) AS dias_vencida
       FROM tasks t
       LEFT JOIN projects p ON t.id_proyecto = p.id_proyecto
       ${vencidasWhere}
       ORDER BY t.fecha_entrega ASC
       LIMIT 50`,
      params
    );

    res.json({
      kpi: {
        total:        Number(kpi.total)       || 0,
        vigentes:     Number(kpi.vigentes)    || 0,
        completadas:  Number(kpi.completadas) || 0,
        vencidas:     Number(kpi.vencidas)    || 0,
        cumplimiento: kpi.cumplimiento != null ? Number(kpi.cumplimiento) : null,
      },
      donut: {
        pendiente:  Number(donutRows[0]?.pendiente)  || 0,
        en_proceso: Number(donutRows[0]?.en_proceso) || 0,
        completada: Number(donutRows[0]?.completada) || 0,
      },
      stackedBars,
      cargaLaboral: cargaRows.map((r) => ({
        nombre:           r.nombre ?? r.correo ?? 'Sin asignar',
        vigentes:         Number(r.vigentes)         || 0,
        vencidas_activas: Number(r.vencidas_activas) || 0,
      })),
      tareas_vencidas: vencidasRows,
    });
  } catch (err) {
    console.error('❌ GET /api/stats/dashboard:', err.message);
    res.status(500).json({ error: 'Error al calcular estadísticas', detalle: err.message });
  }
}

module.exports = { getDashboardStats };
