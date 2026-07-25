import mongoose, { Schema, model } from 'mongoose';
import category from './category.model.js';
import { ProductStatus } from '../enums/product.enum.js';
import { IProduct } from '../interfaces/product.interface.js';
import brand from './brand.model.js';
import tag from './tag.model.js';

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: String,
      required: true
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: category,
      autoPopulate: true,
      required: [true, 'category_id is required']
    },
    image_url: [String],
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: brand,
      autoPopulate: true,
      required: [true, 'brand_id is required']
    },
    tag_id: {
      type: Schema.Types.ObjectId,
      ref: tag,
      autoPopulate: true
    },
    status: {
      type: String,
      enum: ProductStatus,
      default: ProductStatus.AVAILABLE
    },
    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    quantity_sold: {
      type: Number,
      min: 0,
      default: 0
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  { timestamps: true }
);

const productModel = mongoose.models.product || model('product', productSchema);

export default productModel;
