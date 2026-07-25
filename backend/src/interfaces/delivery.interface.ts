import { DeliveryStatus } from '../enums/delivery.enum.js';
import { ObjectId } from 'mongoose';

export interface IDelivery {
  _id: ObjectId;
  delivery_name: string;
  description: string;
  delivery_fee: number;
  estimated_delivery_time: Date;
  status: DeliveryStatus;
  created_at: Date;
  updated_at: Date;
}
