import { Router } from 'express';
import {
  getAllBanners,
  getBannerById,
  getBannersActive,
  insertBanner,
  updateBanner,
  toggleBannerStatus,
  reorderBanners,
  deleteBanner
} from '../controllers/banner.controllers.js';
import { requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import uploader from '../config/cloudinary.config.js';

const bannerRouter = Router();

// http://localhost:5000/api/v1/banners

bannerRouter.get('/banners', verifyToken, requireAdmin, getAllBanners);
bannerRouter.get('/banners/status/active', getBannersActive);
bannerRouter.get('/banners/:id', verifyToken, requireAdmin, getBannerById);
bannerRouter.post('/banners', verifyToken, requireAdmin, uploader.single('image_url'), insertBanner);
bannerRouter.patch('/banners/reorder', verifyToken, requireAdmin, reorderBanners);
bannerRouter.patch('/banners/:id', verifyToken, requireAdmin, uploader.single('image_url'), updateBanner);
bannerRouter.patch('/banners/status/:id', verifyToken, requireAdmin, toggleBannerStatus);
bannerRouter.delete('/banners/:id', verifyToken, requireAdmin, deleteBanner);

export default bannerRouter;
