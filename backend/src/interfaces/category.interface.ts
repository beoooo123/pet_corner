import { CategoryStatus } from '../enums/category.enum.js';

export interface ICategory {
  _id: string;
  name: string;
  description: string;
  status: CategoryStatus;
}
