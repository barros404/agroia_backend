const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  authUser, 
  getUserProfile, 
  updateUserProfile,
  getUsers,
  getUserById
} = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Rotas públicas
router.post('/', registerUser);
router.post('/login', authUser);

// Rotas protegidas
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Rotas de admin
router.route('/')
  .get(protect, admin, getUsers);

router.route('/:id')
  .get(protect, admin, getUserById);

module.exports = router;
