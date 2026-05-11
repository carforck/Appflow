const { Router }                                       = require('express');
const { getUsers, deleteUser, updateUserRole, toggleActivo } = require('../controllers/userController');
const { authMiddleware, requireRole }                  = require('../middleware/auth');

const router = Router();
router.get('/',                 authMiddleware,                                    getUsers);
router.delete('/:correo',       authMiddleware, requireRole('admin','superadmin'), deleteUser);
router.patch('/:correo/rol',    authMiddleware, requireRole('superadmin'),         updateUserRole);
router.patch('/:correo/activo', authMiddleware, requireRole('admin','superadmin'), toggleActivo);

module.exports = router;
