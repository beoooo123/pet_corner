import mongoose, { Schema, model } from 'mongoose';
import user from '../models/user.model.js';
import { IOrder } from '../interfaces/order.interface.js';
import { OrderStatus, PaymentStatus } from '../enums/order.enum.js';
import paymentType from '../models/paymentType.model.js';
import delivery from './delivery.model.js';
import coupon from '../models/coupon.model.js';
import { DeliveryStatus } from '../enums/delivery.enum.js';
import { BookingStatus } from '../enums/booking.enum.js';


