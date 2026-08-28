import mongoose, { Schema, model } from 'mongoose';
import user from '../models/user.model.js';
import { IOrder } from '../interfaces/order.interface.js';
import { OrderStatus, PaymentStatus } from '../enums/order.enum.js';
import paymentType from '../models/paymentType.model.js';
import delivery from './delivery.model.js';
import coupon from '../models/coupon.model.js';
import { DeliveryStatus } from '../enums/delivery.enum.js';
import { BookingStatus } from '../enums/booking.enum.js';

const orderSchema: Schema<IOrder> = new Schema<IOrder>(
  {
    userID: { type: Schema.Types.ObjectId, ref: user, required: false },
    fullname: { type: String, required: false },
    phone: { type: String, required: false },
    email: { type: String, required: false },
    paymentOrderCode: { type: Number, required: false },
    payment_typeID: { type: Schema.Types.ObjectId, ref: paymentType, default: null },
    deliveryID: { type: Schema.Types.ObjectId, ref: delivery, default: null },
    couponID: { type: Schema.Types.ObjectId, ref: coupon, default: null },
    order_date: { type: Date, default: Date.now },
    total_price: { type: Number, required: false },
    shipping_address: { type: String, required: false },
    payment_status: {
      type: String,
      enum: PaymentStatus,
      default: PaymentStatus.PENDING,
      required: false
    },
    status: {
      type: String,
      enum: [...Object.values(OrderStatus), null],
      default: null
    },
    bookingStatus: {
      type: String,
      enum: [...Object.values(BookingStatus), null],
      default: null
    }
  },
  { timestamps: true }
);

const orderModel = mongoose.models.Order || model<IOrder>('Order', orderSchema);

export default orderModel;
