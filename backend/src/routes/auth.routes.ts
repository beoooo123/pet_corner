import { Router, Request, Response } from 'express';
import {
  signupController,
  loginController,
  logoutController,
  authCheckController,
  forgotPasswordController,
  resetPasswordController,
  refreshTokenController,
  googleLogin,
  checkAdminRole,
  checkRoleStatus,
  verifyOTPController
} from '../controllers/auth.controllers.js';
import { protectRoute } from '../middlewares/protectRoute.js';

const authRouter = Router();

// http://localhost:5000/api/v1/auth

authRouter.post('/signup', signupController);
authRouter.post('/login', loginController);
authRouter.post('/logout', logoutController);
authRouter.get('/authCheck', checkRoleStatus, authCheckController);
authRouter.post('/forgotPassword', forgotPasswordController);
authRouter.post('/resetPassword', resetPasswordController);
authRouter.post('/refreshtoken', refreshTokenController);
authRouter.post('/google', googleLogin);
authRouter.post('/verify-otp', verifyOTPController);
// bảo vệ route admin
authRouter.get('/admin', checkRoleStatus, checkAdminRole, (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Welcome Admin' });
});
export default authRouter;
