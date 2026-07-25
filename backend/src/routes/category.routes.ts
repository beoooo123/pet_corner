import { Router, Request, Response } from 'express';
import {
  getAllCategory,
  toggleCategory,
  insertCategory,
  updateCategory,
  getCategoryById,
  getCategoriesActive,
  deleteCategory
} from '../controllers/category.controllers.js';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const categoryRouter = Router();

// http://localhost:5000/api/v1/categories

categoryRouter.get('/categories', getAllCategory);
categoryRouter.get('/categories/status/active', getCategoriesActive);
categoryRouter.get('/categories/:id', getCategoryById);
categoryRouter.post('/categories', verifyToken, requireAdmin, insertCategory);
categoryRouter.patch('/categories/:id', verifyToken, requireAdmin, updateCategory);
categoryRouter.patch('/categories/status/:id', verifyToken, requireAdmin, toggleCategory);
categoryRouter.delete('/categories/:id', verifyToken, requireAdmin, deleteCategory);

export default categoryRouter;
