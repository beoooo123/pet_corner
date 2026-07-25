import { ServiceStatus } from '../enums/service.enum.js';
import { ObjectId } from 'mongoose';

export interface IService {
  _id: ObjectId;
  service_name: string;
  description?: string;
  service_price: number;
  duration: number;
  status: ServiceStatus;
  create_at: Date;
  update_at: Date;
}
