import mongoose, { Schema, model } from 'mongoose';
import { IBlogCategory } from '../interfaces/blogCategory.interface.js';
import { BlogCategoryStatus } from '../enums/blogCategory.enum.js';

const blogCategorySchema: Schema<IBlogCategory> = new Schema<IBlogCategory>({
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: BlogCategoryStatus,
    default: BlogCategoryStatus.ACTIVE
  }
});

const blogCategoryModel = mongoose.models.blogCategory || model('blogCategory', blogCategorySchema);

export default blogCategoryModel;
