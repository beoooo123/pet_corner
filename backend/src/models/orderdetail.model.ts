import mongoose, { Schema, model } from 'mongoose';
import order from './order.model.js';
import product from './product.model.js';
import service from './service.model.js';

const orderDetailSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: order, required: true },
    productId: { type: Schema.Types.ObjectId, ref: product, required: false, default: '' },
    serviceId: { type: Schema.Types.ObjectId, ref: service, required: false, default: '' },
    quantity: { type: Number, required: true },
    product_price: { type: Number, required: false },
    total_price: { type: Number, required: false },
    booking_date: { type: Date, required: false, default: '' },
    petName: { type: String, required: false, default: '' },
    petType: {
      type: String,
      required: false,
      default: ''
    },
    isRated: { type: Boolean, default: false },
    petWeight: { type: Number, require: false, default: '' },
    realPrice: { type: Number, require: false, default: '' },
  },
  { timestamps: true }
);

const orderDetailModel = mongoose.models.orderDetail || model('orderDetail', orderDetailSchema);

export default orderDetailModel;
