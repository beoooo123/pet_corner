import { BookingStatus } from '../enums/booking.enum.js';
import { ObjectId } from 'mongoose';

export interface IBooking {
  _id: ObjectId;
  userId: ObjectId;
  serviceId: ObjectId;
  booking_date: Date;
  status: BookingStatus;
  created_at: Date;
  updated_at: Date;
}
