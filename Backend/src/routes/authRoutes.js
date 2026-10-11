import express from 'express';
import { getMe, login, logout, register } from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';


const authRoutes = express.Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', getMe);

export default authRoutes;