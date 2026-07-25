import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  applyCoupon,
  createCoupon,
  deleteCouponById,
  getActiveCoupons,
  getAllCoupon,
  getCouponById,
  updateCoupon
} from '../controllers/coupon.controllers.js';
// import { getAllBrands, getBrandById, insertBrand, updateBrand } from '../controllers/brand.controllers.js';

const couponRouter = Router();

// http://localhost:3000/api/v1/coupons
couponRouter.get('/coupons', getAllCoupon);
couponRouter.get('/coupons/active', getActiveCoupons);
couponRouter.get('/coupons/:id', getCouponById);
couponRouter.post('/coupons', verifyToken, requireAdmin, createCoupon);
couponRouter.delete('/coupons/:id', verifyToken, requireAdmin, deleteCouponById);
couponRouter.patch('/coupons/:id', verifyToken, requireAdmin, updateCoupon);
couponRouter.post('/coupons/apply', verifyToken, applyCoupon);
// couponRouter.post('/brands', verifyToken, requireAdmin, insertBrand);
// couponRouter.patch('/brands/:id', verifyToken, requireAdmin, updateBrand);
// categoryRouter.delete('/categories/:id', protectRoute, requireAdmin, toggleCategory);

export default couponRouter;
