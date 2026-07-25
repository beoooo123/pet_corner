import { ObjectId } from 'mongoose';
import { ProductStatus } from '../enums/product.enum.js';
import { ICategory } from './category.interface.js';
import { IBrand } from './brand.interface.js';
import { ITag } from './tag.interface.js';

export interface IProduct extends Document {
  _id: ObjectId;
  name: string;
  description: string;
  price: string;
  category_id: ICategory;
  image_url: string[];
  brand_id: IBrand;
  tag_id: ITag;
  createdAt: Date;
  updatedAt: Date;
  status: ProductStatus;
  discount: number;
  quantity_sold: number;
  quantity: number;
}
