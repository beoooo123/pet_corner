import { CouponStatus } from '../enums/coupon.enum.js';
import { ICoupon } from '../interfaces/coupon.interface.js';
import mongoose, { Schema, model } from 'mongoose';

// Định nghĩa schema cho Coupon
const couponSchema: Schema<ICoupon> = new Schema<ICoupon>({
  coupon_code: {
    type: String,
    required: [true, 'Mã coupon là bắt buộc'],
    unique: true, // Đảm bảo mã coupon là duy nhất
    trim: true, // Loại bỏ khoảng trắng thừa
    uppercase: true
  },
  discount_value: {
    type: Number,
    required: [true, 'Giá trị giảm giá là bắt buộc'],
    min: [0, 'Giá trị giảm giá không được âm']
  },
  min_order_value: {
    type: Number,
    required: [true, 'Giá trị đơn hàng tối thiểu là bắt buộc'],
    min: [0, 'Giá trị đơn hàng tối thiểu không được âm']
  },
  start_date: {
    type: Date,
    required: [true, 'Ngày bắt đầu là bắt buộc']
  },
  end_date: {
    type: Date,
    required: true
  },
  usage_limit: {
    type: Number,
    required: [true, 'Số lần sử dụng tối đa là bắt buộc'],
    min: [1, 'Số lần sử dụng tối đa phải lớn hơn 0']
  },
  used_count: {
    type: Number,
    default: 0, // Mặc định là 0 khi tạo coupon mới
    min: [0, 'Số lần đã sử dụng không được âm']
  },
  status: {
    type: String,
    enum: CouponStatus,
    default: CouponStatus.ACTIVE
  }
});

const couponModel = mongoose.models.coupon || model('coupon', couponSchema);

export default couponModel;
