import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { deleteBrand, getAllBrands, getBrandById, insertBrand, updateBrand } from '../controllers/brand.controllers.js';

const brandRouter = Router();

brandRouter.get('/brands', getAllBrands);
brandRouter.get('/brands/:id', getBrandById);
brandRouter.post('/brands', verifyToken, requireAdmin, insertBrand);
brandRouter.patch('/brands/:id', verifyToken, requireAdmin, updateBrand);
brandRouter.delete('/brands/:id', verifyToken, requireAdmin, deleteBrand);

export default brandRouter;
