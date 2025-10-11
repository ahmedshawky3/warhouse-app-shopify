import express from 'express';
import {
  validateToken,
  checkAccess
} from '../controllers/tokenController.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/validate', validateToken);
router.get('/check-access', checkAccess);

export default router;

