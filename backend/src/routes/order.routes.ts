import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  createOrderAfterPayment,
  getAllOrders,
  getOrderById,
  getAvailableSlots,
  updateOrderStatus,
  updatePaymentStatus,
  cancelServiceBooking,
  getPendingOrders
} from '../controllers/order.controllers.js';

const orderRouter = Router();

orderRouter.get('/orders', verifyToken, getAllOrders);
orderRouter.get('/pendingOrders', verifyToken, getPendingOrders);
orderRouter.post('/orders', createOrderAfterPayment);
orderRouter.get('/orders/check/available-slots', getAvailableSlots);
orderRouter.get('/orders/:id', verifyToken, getOrderById);
orderRouter.patch('/orders/status/:id', verifyToken, updateOrderStatus);
orderRouter.patch('/orders/payment-status/:id', updatePaymentStatus);
orderRouter.post('/orders/cancel-booking', verifyToken, cancelServiceBooking);

export default orderRouter;
