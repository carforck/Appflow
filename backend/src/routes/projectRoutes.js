const { Router }                                              = require('express');
const { getProjects, createProject, updateProject, deleteProject } = require('../controllers/projectController');
const { authMiddleware, requireRole }                          = require('../middleware/auth');

const router = Router();

router.get('/',       authMiddleware,                                    getProjects);
router.post('/',      authMiddleware, requireRole('admin','superadmin'), createProject);
router.put('/:id',    authMiddleware, requireRole('admin','superadmin'), updateProject);
router.delete('/:id', authMiddleware, requireRole('admin','superadmin'), deleteProject);

module.exports = router;
