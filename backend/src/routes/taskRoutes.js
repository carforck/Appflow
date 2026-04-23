const { Router } = require('express');
const {
  getTareas, crearTarea, commitStaging,
  getTareasRevision, actualizarRevision, aprobarRevision, rechazarRevision,
  updateTask, updateTaskStatus,
} = require('../controllers/taskController');
const { getNotas, addNota } = require('../controllers/notesController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

// Tareas generales
router.get('/',                authMiddleware, getTareas);
router.post('/crear',          authMiddleware, crearTarea);
router.post('/commit-staging', authMiddleware, requireRole('admin', 'superadmin'), commitStaging);

// Actualización de campos (Lista Maestra) — admin/superadmin
router.patch('/:id',           authMiddleware, requireRole('admin', 'superadmin'), updateTask);
// Actualización de estado (Kanban drag & drop) — cualquier usuario autenticado
router.patch('/:id/status',    authMiddleware, updateTaskStatus);

// Chat de notas por tarea — cualquier usuario autenticado (RBAC en el controller)
router.get('/:id/notas',       authMiddleware, getNotas);
router.post('/:id/notas',      authMiddleware, addNota);

// Flujo de revisión — solo admin / superadmin
router.get('/revision',        authMiddleware, requireRole('admin', 'superadmin'), getTareasRevision);
router.patch('/:id/revision',  authMiddleware, requireRole('admin', 'superadmin'), actualizarRevision);
router.patch('/:id/aprobar',   authMiddleware, requireRole('admin', 'superadmin'), aprobarRevision);
router.delete('/:id',          authMiddleware, requireRole('admin', 'superadmin'), rechazarRevision);

module.exports = router;
