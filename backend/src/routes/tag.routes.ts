import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { getAllTags, getTagById, insertTag, deleteTag, updateTag } from '../controllers/tag.controllers.js';

const tagRouter = Router();
// http://localhost:5000/api/v1/tags
tagRouter.get('/tags', getAllTags);
tagRouter.get('/tags/:id', getTagById);
tagRouter.post('/tags', verifyToken, requireAdmin, insertTag);
tagRouter.delete('/tags/:id', verifyToken, requireAdmin, deleteTag);
tagRouter.patch('/tags/:id', verifyToken, requireAdmin, updateTag);
// categoryRouter.delete('/categories/:id', protectRoute, requireAdmin, toggleCategory);

// brandRouter.get('/brands/:id', getBrandById);
// brandRouter.post('/brands', verifyToken, requireAdmin, insertBrand);
// brandRouter.patch('/brands/:id', verifyToken, requireAdmin, updateBrand);

export default tagRouter;
