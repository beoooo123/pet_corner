import { UserRoles, UserStatus } from '../enums/user.enum.js';
import { IProduct } from './product.interface.js';
import { Document } from 'mongoose';

export interface IAddress {
  name: string;
  phone: string;
  address: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  googleId: string | undefined;
  email: string;
  fullname: string;
  password: string | undefined;
  phone_number: string;
  address: IAddress[];
  status: UserStatus;
  role: UserRoles;
  avatar: string;
  cart: IProduct[];
  reset_password_token: string;
  reset_password_expires: Date | null;
  refreshToken: string;
  dateOfBirth: string;
  createdAt: Date;
  updatedAt: Date;
  otp: string;
  otpExpiry: Date;
  isVerified: boolean;
}
