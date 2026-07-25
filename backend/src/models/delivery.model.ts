import mongoose, { Schema, model } from 'mongoose';
import { IDelivery } from '../interfaces/delivery.interface.js';
import { DeliveryStatus } from '../enums/delivery.enum.js';

const deliverySchema: Schema<IDelivery> = new Schema<IDelivery>(
  {
    delivery_name: { type: String, required: true },
    description: { type: String, default: '' },
    delivery_fee: { type: Number, required: true, default: 0 },
    estimated_delivery_time: { type: Date }, // Corrected typo here
    status: { type: String, enum: DeliveryStatus, default: DeliveryStatus.PENDING }
  },
  { timestamps: true }
);

const deliveryModel = mongoose.models.delivery || model('delivery', deliverySchema);

export default deliveryModel;
