import { CookieOptions, Request, Response, RequestHandler, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import userModel from '../models/user.model.js'; // Adjust the path according to your project structure
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js'; // Adjust the path according to your project structure
import ENV_VARS from '../config/config.js';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { IUser } from '../interfaces/user.interface.js';
import { UserRoles, UserStatus } from '../enums/user.enum.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
interface User {
  _id: string;
  role: string;
  status: string;
}
export interface CustomRequest extends Request {
  user?: IUser;
}

// Hàm tạo mã màu hex ngẫu nhiên
const getRandomHexColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
export const signupController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullname } = req.body;

    // Kiểm tra đầu vào
    if (!email || !password || !fullname) {
      res.status(400).json({
        success: false,
        message: 'Please provide an email, password and fullname'
      });
      return;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
      return;
    }

    if (fullname.length < 3) {
      res.status(400).json({
        success: false,
        message: 'Họ và tên phải có ít nhất 3 ký tự'
      });
      return;
    }

    // Kiểm tra email đã tồn tại
    const existingUserByEmail = await userModel.findOne({ email });
    if (existingUserByEmail) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Mã hóa mật khẩu
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Tạo URL avatar từ ui-avatars với màu nền ngẫu nhiên
    const randomBackgroundColor = getRandomHexColor(); // Sinh màu ngẫu nhiên
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullname
    )}&background=${randomBackgroundColor}&color=fff&size=256`;

    // Tạo OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5phút
    // Tạo user mới
    const newUser = new userModel({
      email,
      password: hashedPassword,
      fullname,
      avatar: avatarUrl, // Lưu URL avatar
      otp,
      otpExpiry,
      isVerified: false
    });

    await newUser.save();
    // Gửi mail otp
    const message = `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn trong ${otpExpiry}`;
    await sendEmail(email, 'Xác thực email của bạn', message, '');

    res.status(201).json({
      success: true,
      user: { ...newUser._doc, password: '' }
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error signing up: ${error.message}`);
    } else {
      console.error('Error signing up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
// Xác thực OTP
export const verifyOTPController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email và OTP là bắt buộc' });
      return;
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'Email không tồn tại' });
      return;
    }
    if (user.otp !== otp || new Date() > user.otpExpiry) {
      res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn' });
      return;
    }
    // xác thực thành công
    user.otp = null;
    user.otpExpiry = null;
    user.isVerified = true;
    user.status = UserStatus.ACTIVE;
    await user.save();

    generateAccessToken(user._id, res);

    res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công, mời bạn đăng nhập',
      user: { ...user._doc, password: '' }
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error verifying OTP: ${error.message}`);
    } else {
      console.error('Error verifying OTP:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Login
export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('Email', email);
    console.log('Password', password);
    const user = await userModel
      .findOne({ email })
      .select('-reset_password_token -reset_password_expires -refreshToken');
    if (!user) {
      res.status(404).json({ success: false, message: 'Email này chưa được đăng ký!' });
      return;
    }
    if (user.status === 'inactive') {
      res.status(401).json({ success: false, message: 'Tài khoản của bạn đã bị khóa!' });
      return;
    }

    if (user.status === UserStatus.INACTIVE) {
      res.status(401).json({ success: false, message: 'Tài khoản của bạn đã bị khóa!' });
      return;
    }

    if (user.status === UserStatus.PENDING) {
      res.status(403).json({ success: false, message: 'Vui lòng xác thực email bằng OTP trước khi đăng nhập!' });
      return;
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Mật khẩu không đúng!' });
      return;
    }
    const { password: pass, ...userData } = user.toObject();
    userData.role = user.role || 'user';
    userData.status = user.status || 'active';
    const accessToken = await generateAccessToken(user._id, res);
    const refreshToken = await generateRefreshToken(user._id, res);
    await userModel.findByIdAndUpdate(user._id, { refreshToken }, { new: true });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: ENV_VARS.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(200).json({ success: true, userData: userData, accessToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
export const logoutController = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Error logging out: ${error.message}`);
    } else {
      console.log('Error logging out:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
export const authCheckController = async (
  req: Request & { user?: { _id: string; email: string; role: string }; token?: string },
  res: Response
): Promise<void> => {
  try {
    console.log('req.user', req.user);
    res.status(200).json({ success: true, user: req.user, token: req.token });
  } catch (error) {
    if (error instanceof Error) {
      console.log('Error in authCheck controller', error.message);
    } else {
      console.log('Error in authCheck controller', error);
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const forgotPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    console.log('email', email);
    if (!email) {
      res.status(400).json({ success: false, message: 'Please provide an email' });
      return;
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'User with this email does not exist' });
      return;
    }

    const resetToken = crypto.randomBytes(6).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpire = Date.now() + 3 * 60 * 1000; // **3 phút**

    user.reset_password_token = resetPasswordToken;
    user.reset_password_expires = resetPasswordExpire;
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/passwordreset/${resetToken}`;
    const message = `
			Mã xác nhận của bạn là: ${resetToken}
    `;

    try {
      await sendEmail(user.email, 'Reset Your PetShop Password', message, '');
      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error(`Error in forgotPasswordController: ${error}`);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      res.status(400).json({ success: false, message: 'Mã xác nhận và mật khẩu mới là bắt buộc' });
      return;
    }

    // Hash resetToken để so sánh với token đã lưu trong DB
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    console.log(hashedToken, 'hashedToken');
    // Tìm user có token hợp lệ và chưa hết hạn
    const user = await userModel.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() } // Kiểm tra xem token còn hạn không
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn' });
      return;
    }
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);
    // Cập nhật mật khẩu mới
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Mật khẩu đã được cập nhật thành công' });
  } catch (error) {
    console.error('Error in resetPasswordController:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
  try {
    const cookie = req.cookies as { refreshToken?: string };

    if (!cookie.refreshToken) {
      res.status(401).json({ success: false, message: 'No refresh token in cookies' });
      return;
    }

    if (!ENV_VARS.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      res.status(500).json({ success: false, message: 'Internal Server Error' });
      return;
    }

    console.log('Received refresh token:', cookie.refreshToken);

    let decoded;
    try {
      decoded = jwt.verify(cookie.refreshToken, ENV_VARS.JWT_SECRET) as jwt.JwtPayload;
      console.log('Decoded token payload:', decoded);
    } catch (error) {
      console.error('JWT Verification Error:', error);
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    if (!decoded) {
      res.status(401).json({ success: false, message: 'Invalid token payload' });
      return;
    }

    const user = await userModel.findOne({
      _id: decoded.userId,
      refreshToken: cookie.refreshToken
    });

    if (!user) {
      res.status(403).json({ success: false, message: 'User not found or token mismatch' });
      return;
    }

    const accessToken = await generateAccessToken(user._id, res);
    res.status(200).json({ success: true, newAccessToken: accessToken });
  } catch (error) {
    console.error('Error in refreshTokenController:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
// GOOGLE LOGIN
export const googleLogin: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;
  try {
    console.log('Received idToken:', idToken);
    if (!idToken) {
      res.status(400).json({ success: false, message: 'No idToken provided' });
      return;
    }

    // Xác thực idToken với Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload() as unknown as TokenPayload;
    const { sub: googleId, email, name, picture: avatar } = payload;

    // Tìm hoặc tạo user
    let user = (await userModel.findOne({ googleId })) || (await userModel.findOne({ email }));

    if (user) {
      // Kiểm tra trạng thái user
      if (user.status === 'inactive') {
        res.status(401).json({ success: false, message: 'Tài khoản của bạn đã bị khóa!' });
        return;
      }
      if (user.status === 'pending') {
        res.status(403).json({ success: false, message: 'Vui lòng xác thực email bằng OTP trước khi đăng nhập!' });
        return;
      }

      // Cập nhật googleId nếu user chưa có
      if (!user.googleId) {
        user.googleId = googleId;
      }
    } else {
      // Tạo user mới
      user = new userModel({
        googleId,
        email,
        fullname: name,
        avatar,
        role: 'user',
        status: 'active'
      });
    }

    // Lưu user vào database (nếu có thay đổi hoặc user mới)
    await user.save();

    // Tạo refreshToken và accessToken sau khi user đã được lưu
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    const accessToken = await generateAccessToken(user._id, res);
    const refreshToken = await generateRefreshToken(user._id, res);

    // Lưu refreshToken vào database
    user.refreshToken = refreshToken;
    await user.save();

    // Chuẩn bị dữ liệu trả về
    const userData = {
      id: user._id.toString(),
      email: user.email,
      fullname: user.fullname,
      avatar: user.avatar,
      role: user.role || 'user',
      status: user.status || 'active'
    };

    // Đặt cookie cho refreshToken
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: ENV_VARS.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    // Trả về phản hồi
    res.json({ success: true, accessToken, user: userData });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(401).json({ success: false, message: `Invalid Google token or server error: ${errorMessage}` });
  }
};

// Check role and status
export const checkRoleStatus = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({ success: false, message: 'JWT_SECRET is not defined' });
      return;
    }

    // Xác thực JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload & { userId: string };
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    // Tìm user trong database
    const user = await userModel.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Kiểm tra status
    if (user.status !== UserStatus.ACTIVE) {
      res.status(403).json({ success: false, message: 'User is not active' });
      return;
    }

    // Gắn user vào req
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

// kiểm tra role ADMIN
export const checkAdminRole = (req: CustomRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== UserRoles.ADMIN) {
    res.status(403).json({ success: false, message: 'Access denied. Admin role required' });
    return;
  }
  next();
};
