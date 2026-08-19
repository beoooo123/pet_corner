import mongoose, { Schema, model } from 'mongoose';
import { IBanner } from '../interfaces/banner.interface.js';
import { BannerStatus } from '../enums/banner.enum.js';



const bannerModel = mongoose.models.banner || model('banner', bannerSchema);

export default bannerModel;
