import { Router } from 'express';
import {
  getAllBlogCategories,
  getBlogCategoryById,
  getBlogCategoriesActive,
  insertBlogCategory,
  updateBlogCategory,
  deleteBlogCategory
} from '../controllers/blogCategory.controllers.js';
import { requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const blogCategoryRouter = Router();

// http://localhost:5000/api/v1/blogcategories

blogCategoryRouter.get('/blogcategories', getAllBlogCategories);
blogCategoryRouter.get('/blogcategories/status/active', getBlogCategoriesActive);
blogCategoryRouter.get('/blogcategories/:id', getBlogCategoryById);
blogCategoryRouter.post('/blogcategories', verifyToken, requireAdmin, insertBlogCategory);
blogCategoryRouter.patch('/blogcategories/:id', verifyToken, requireAdmin, updateBlogCategory);
blogCategoryRouter.delete('/blogcategories/:id', verifyToken, requireAdmin, deleteBlogCategory);

export default blogCategoryRouter;
