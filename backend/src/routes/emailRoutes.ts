// API endpoints

import { Router } from 'express';
import { verifyEmailHandler } from '../controllers/emailController.js';

const router = Router();

// endpoint to verify an email address
router.post('/verify', verifyEmailHandler);

export default router;