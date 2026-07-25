import { ObjectId } from 'mongoose';

export interface IPaymentType {
  _id: ObjectId;
  payment_type_name: string;
  description: string;
}
