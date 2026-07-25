import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  deleteDelivery,
  getAllDeliveries,
  getDeliveryById,
  insertDelivery,
  updateDelivery
} from '../controllers/delivery.controllers.js';

const deliveryRouter = Router();

deliveryRouter.get('/delivery', getAllDeliveries);
deliveryRouter.get('/delivery/:id', getDeliveryById);
deliveryRouter.post('/delivery', verifyToken, requireAdmin, insertDelivery);
deliveryRouter.patch('/delivery/:id', verifyToken, requireAdmin, updateDelivery);
deliveryRouter.delete('/delivery/:id', verifyToken, requireAdmin, deleteDelivery);

export default deliveryRouter;
