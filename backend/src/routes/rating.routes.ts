import { Router, Request, Response } from 'express';
import { protectRoute, requireAdmin } from '../middlewares/protectRoute.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { createRating, getRatingByProductId, getRatingByUserId, likeRating } from '../controllers/rate.controllers.js';
import { checkRoleStatus } from '../controllers/auth.controllers.js';

const rateRouter = Router();
// http://localhost:5000/api/v1/ratings

rateRouter.post('/ratings', verifyToken, createRating);
rateRouter.get('/ratings/:id', getRatingByProductId);
rateRouter.get('/ratings/user/:id', verifyToken, getRatingByUserId);
rateRouter.patch('/ratings/likes/:id', verifyToken, likeRating);
// rateRouter.get('/ratings/:id', getRatingID);
// rateRouter.post('/ratings', createRating);
// rateRouter.patch('/ratings/:id', updateRating);
// rateRouter.delete('/ratings/:id', deleteRating);
// // brandRouter.post('/brands', verifyToken, requireAdmin, insertBrand);
// // brandRouter.patch('/brands/:id', verifyToken, requireAdmin, updateBrand);
// // categoryRouter.delete('/categories/:id', protectRoute, requireAdmin, toggleCategory);

export default rateRouter;
