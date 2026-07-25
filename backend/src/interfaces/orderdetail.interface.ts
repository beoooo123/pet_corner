import { ObjectId } from 'mongoose';
import { IOrder } from './order.interface.js';
import { IProduct } from './product.interface.js';
import { IService } from './service.interface.js';

export interface IOrderDetail {
  _id: ObjectId;
  orderID: IOrder;
  productID?: IProduct;
  serviceID?: IService;
  quantity?: number;
  isRated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
