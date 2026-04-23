/**
 * src/controllers/projectController.js
 *
 * Esquema real de la tabla projects (DigitalOcean):
 *   id_proyecto      VARCHAR(20) PK
 *   nombre_proyecto  TEXT
 *   estado           VARCHAR(50)   — 'Activo' | 'Cerrado'
 *   empresa          VARCHAR(100)
 *   financiador      VARCHAR(100)
 */
const pool = require('../config/db');

const SELECT_FIELDS = 'id_proyecto, nombre_proyecto, estado, empresa, financiador';

async function getProjects(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM projects ORDER BY nombre_proyecto ASC`
    );
    res.json({ status: 'success', total: rows.length, projects: rows });
  } catch (err) {
    console.error('❌ GET /api/projects:', err.message);
    res.status(500).json({ error: 'Error al obtener proyectos', detalle: err.message });
  }
}

async function createProject(req, res) {
  const { id_proyecto, nombre_proyecto, financiador, empresa, estado } = req.body;

  if (!id_proyecto?.trim() || !nombre_proyecto?.trim()) {
    return res.status(400).json({ error: 'id_proyecto y nombre_proyecto son requeridos' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id_proyecto FROM projects WHERE id_proyecto = ?',
      [id_proyecto.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe un proyecto con ese código' });
    }

    await pool.query(
      `INSERT INTO projects (id_proyecto, nombre_proyecto, financiador, empresa, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id_proyecto.trim(),
        nombre_proyecto.trim(),
        financiador?.trim() || null,
        empresa?.trim()    || null,
        estado             || 'Activo',
      ]
    );

    const [created] = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM projects WHERE id_proyecto = ?`,
      [id_proyecto.trim()]
    );

    console.log(`✅ Proyecto creado: ${id_proyecto.trim()} — ${nombre_proyecto.trim()}`);
    res.status(201).json({ status: 'success', project: created[0] });
  } catch (err) {
    console.error('❌ POST /api/projects:', err.message);
    res.status(500).json({ error: 'Error al crear proyecto', detalle: err.message });
  }
}

async function updateProject(req, res) {
  const { id } = req.params;
  const { nombre_proyecto, financiador, empresa, estado } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT id_proyecto FROM projects WHERE id_proyecto = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const fields = [];
    const values = [];
    if (nombre_proyecto?.trim()) { fields.push('nombre_proyecto = ?'); values.push(nombre_proyecto.trim()); }
    if (financiador !== undefined){ fields.push('financiador = ?');     values.push(financiador?.trim() || null); }
    if (empresa !== undefined)    { fields.push('empresa = ?');         values.push(empresa?.trim() || null); }
    if (estado)                   { fields.push('estado = ?');          values.push(estado); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(id);
    await pool.query(`UPDATE projects SET ${fields.join(', ')} WHERE id_proyecto = ?`, values);

    const [updated] = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM projects WHERE id_proyecto = ?`,
      [id]
    );

    console.log(`✏️  Proyecto actualizado: ${id}`);
    res.json({ status: 'success', project: updated[0] });
  } catch (err) {
    console.error('❌ PUT /api/projects/:id:', err.message);
    res.status(500).json({ error: 'Error al actualizar proyecto', detalle: err.message });
  }
}

async function deleteProject(req, res) {
  const { id } = req.params;
  try {
    // Bloquear si tiene tareas asociadas
    const [[{ taskCount }]] = await pool.query(
      'SELECT COUNT(*) AS taskCount FROM tasks WHERE id_proyecto = ?', [id]
    );
    if (taskCount > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el proyecto tiene ${taskCount} tarea(s) asociada(s). Reasígnalas o elimínalas primero.`,
      });
    }

    const [result] = await pool.query(
      'DELETE FROM projects WHERE id_proyecto = ?', [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    console.log(`🗑️  Proyecto eliminado: ${id}`);
    res.json({ status: 'deleted', id_proyecto: id });
  } catch (err) {
    console.error('❌ DELETE /api/projects/:id:', err.message);
    res.status(500).json({ error: 'Error al eliminar proyecto', detalle: err.message });
  }
}

module.exports = { getProjects, createProject, updateProject, deleteProject };
