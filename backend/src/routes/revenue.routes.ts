import { Router } from 'express';
import { getRevenue } from '../controllers/revenue.controllers.js';

const router = Router();

router.get('/revenue', getRevenue);

export default router;
