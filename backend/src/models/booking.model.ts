import mongoose, { Schema, model } from 'mongoose';
import { IBooking } from '../interfaces/booking.interface.js';
import user from './user.model.js';
import service from './service.model.js';
import { BookingStatus } from '../enums/booking.enum.js';
const bookingSchema: Schema<IBooking> = new Schema<IBooking>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: user
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: service
  },
  booking_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: BookingStatus,
    default: BookingStatus.PENDING
  }
});

const bookingModel = mongoose.models.booking || model('booking', bookingSchema);

export default bookingModel;
