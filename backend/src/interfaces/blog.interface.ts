import { BlogStatus } from '../enums/blog.enum.js';

export interface IBlog {
  _id: string;
  blog_category_id?: string;
  image_url: string;
  title: string;
  author: string;
  content: string;
  status: BlogStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
