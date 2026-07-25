import { Router } from 'express';
import {
  getAllProduct,
  getNewProduct,
  getProductById,
  insertProduct,
  updateProduct,
  getSaleProduct,
  getHotProduct,
  uploadProductImage,
  getProductByCategoryID,
  getProductActive,
  getProductByTagId,
  toggleProduct,
  toggleProductStatus,
  getProductRelated,
  getProductOutStock,
  deleteProduct
} from '../controllers/product.controllers.js';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { get } from 'http';
import { verifyToken } from '../middlewares/verifyToken.js';
import uploader from '../config/cloudinary.config.js';

const productRouter = Router();
// http://localhost:5000/api/products

productRouter.get('/products', getAllProduct);
productRouter.get('/products/status/active', getProductActive);
productRouter.get('/products/:id', getProductById);
productRouter.get('/newproducts', getNewProduct);
productRouter.get('/saleproducts', getSaleProduct);
productRouter.get('/hotproducts', getHotProduct);
productRouter.get('/outproducts', getProductOutStock);
productRouter.post('/products', verifyToken, requireAdmin, uploader.array('images_url', 12), insertProduct);
productRouter.patch('/products/:id', verifyToken, requireAdmin, uploader.array('images_url', 12), updateProduct);
productRouter.patch('/products/status/:id', verifyToken, requireAdmin, toggleProduct);
productRouter.patch('/products/toggle-status/:id', verifyToken, requireAdmin, toggleProductStatus);
productRouter.patch(
  '/products/uploadimage/:id',
  verifyToken,
  requireAdmin,
  uploader.array('images_url', 12),
  uploadProductImage
);
productRouter.get('/products/cate/:id', getProductByCategoryID);
productRouter.get('/products/tags/:id', getProductByTagId);
productRouter.get('/products/:id/related', getProductRelated);
productRouter.delete('/products/:id', verifyToken, requireAdmin, deleteProduct);
// productRouter.patch("/products/:id/toggle-status", toggleProductStatus);
export default productRouter;
