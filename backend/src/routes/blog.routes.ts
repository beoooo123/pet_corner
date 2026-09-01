import { Router } from 'express';
import {
  getAllBlogs,
  getBlogById,
  getActiveBlogs,
  createBlog,
  updateBlog,
  toggleBlogStatus,
  deleteBlog
} from '../controllers/blog.controllers.js';
import { requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import uploader from '../config/cloudinary.config.js';

const blogRouter = Router();

// http://localhost:5000/api/v1/blogs

blogRouter.get('/blogs', verifyToken, requireAdmin, getAllBlogs);
blogRouter.get('/blogs/status/active', getActiveBlogs);
blogRouter.get('/blogs/:id', getBlogById);
blogRouter.post('/blogs', verifyToken, requireAdmin, uploader.single('image_url'), createBlog);
blogRouter.patch('/blogs/status/:id', verifyToken, requireAdmin, toggleBlogStatus);
blogRouter.patch('/blogs/:id', verifyToken, requireAdmin, uploader.single('image_url'), updateBlog);
blogRouter.delete('/blogs/:id', verifyToken, requireAdmin, deleteBlog);

export default blogRouter;
