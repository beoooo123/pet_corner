import { BlogCategoryStatus } from '../enums/blogCategory.enum.js';

export interface IBlogCategory {
  _id: string;
  name: string;
  description: string;
  status: BlogCategoryStatus;
}
