import { CouponStatus } from '../enums/coupon.enum.js';
import { ObjectId } from 'mongoose';

export interface ICoupon {
  _id: ObjectId;
  coupon_code: string;
  discount_value: number;
  min_order_value: number;
  start_date: Date;
  end_date: Date;
  usage_limit: number;
  used_count: number;
  status: CouponStatus;
}
