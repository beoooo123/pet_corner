import dotenv from 'dotenv';
import { Router } from 'express';
import { createPayment, verifyPaymentReturn } from '../controllers/payment.controllers.js';

dotenv.config();

const paymentRouter = Router();

paymentRouter.post('/create_payment', createPayment);
paymentRouter.get('/verify_payment', verifyPaymentReturn);

export default paymentRouter;
