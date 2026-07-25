import { ObjectId } from 'mongoose';
import { IUser } from './user.interface.js';
import { OrderStatus, PaymentStatus } from '../enums/order.enum.js';
import { BookingStatus } from '../enums/booking.enum.js';
export interface IOrder {
  userID?: IUser;
  fullname?: string;
  phone?: string;
  payment_typeID?: ObjectId;
  deliveryID?: ObjectId;
  couponID?: ObjectId;
  order_date: Date;
  total_price: number;
  shipping_address: string;
  payment_status: PaymentStatus;
  paymentOrderCode: number;
  status: OrderStatus;
  bookingStatus?: BookingStatus;
  email?: string;
}
