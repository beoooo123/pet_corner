import mongoose, { Schema, model } from 'mongoose';
import { IService } from '../interfaces/service.interface.js';
import { ServiceStatus } from '../enums/service.enum.js';

const serviceSchema: Schema<IService> = new Schema<IService>(
  {
    service_name: { type: String, required: true, default: '' },
    description: { type: String, default: '' },
    duration: { type: Number, required: true, default: 0 },
    service_price: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: Object.values(ServiceStatus).filter((value) => typeof value === 'string'), // Lấy các giá trị của enum
      default: ServiceStatus.ACTIVE // Dùng giá trị từ enum
    }
  },
  { timestamps: true }
);

const ServiceModel = mongoose.models.Service || model<IService>('Service', serviceSchema);

export default ServiceModel;
