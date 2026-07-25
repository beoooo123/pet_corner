import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  getAllPayments,
  getPaymentById,
  insertPayment,
  updatePayment,
  deletePayments
} from '../controllers/paymentType.controllers.js';

const paymentTypeRouter = Router();

paymentTypeRouter.get('/payments', getAllPayments);
paymentTypeRouter.get('/payments/:id', getPaymentById);
paymentTypeRouter.post('/payments', verifyToken, requireAdmin, insertPayment);
paymentTypeRouter.patch('/payments/:id', verifyToken, requireAdmin, updatePayment);
paymentTypeRouter.delete('/payments/:id', verifyToken, requireAdmin, deletePayments);

export default paymentTypeRouter;
