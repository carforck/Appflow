const { Router } = require('express');
const {
  getUsers, createUser, updateUser,
  deleteUser, updateUserRole, toggleActivo, changePassword, adminResetPassword, getMyActivity,
} = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.get('/',                   authMiddleware,                                    getUsers);
router.post('/',                  authMiddleware, requireRole('admin','superadmin'), createUser);
router.get('/me/activity',        authMiddleware,                                    getMyActivity);
router.patch('/me/password',      authMiddleware,                                    changePassword);
router.patch('/:correo/password', authMiddleware, requireRole('admin','superadmin'), adminResetPassword);
router.patch('/:correo',          authMiddleware, requireRole('admin','superadmin'), updateUser);
router.delete('/:correo',         authMiddleware, requireRole('admin','superadmin'), deleteUser);
router.patch('/:correo/rol',      authMiddleware, requireRole('superadmin'),         updateUserRole);
router.patch('/:correo/activo',   authMiddleware, requireRole('admin','superadmin'), toggleActivo);

module.exports = router;
