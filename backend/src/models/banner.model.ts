import mongoose, { Schema, model } from 'mongoose';
import { IBanner } from '../interfaces/banner.interface.js';
import { BannerStatus } from '../enums/banner.enum.js';

const bannerSchema: Schema<IBanner> = new Schema<IBanner>(
  {
    title: {
      type: String,
      default: ''
    },
    image_url: {
      type: String,
      required: true
    },
    link_url: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: BannerStatus,
      default: BannerStatus.ACTIVE
    }
  },
  { timestamps: true }
);

const bannerModel = mongoose.models.banner || model('banner', bannerSchema);

export default bannerModel;
