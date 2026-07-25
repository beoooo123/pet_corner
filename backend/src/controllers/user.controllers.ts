/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import userModel from '../models/user.model.js';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { IAddress, IUser } from '../interfaces/user.interface.js';
import orderModel from '../models/order.model.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}
export const healthyCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    let now = Date.now();
    let convertDate = new Date(now).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    res.status(200).json({ success: true,ts: now, convertedDate: convertDate, message: 'User route is healthy' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
export const getAllUser = async (req: Request, res: Response) => {
  try {
    const result = await userModel.find().select('-password');
    res.status(200).json({ success: true, result });
    return;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error user up: ${error.message}`);
      return;
    } else {
      console.error('Error user up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching user: ${error.message}`);
    } else {
      console.error('Error fetching user:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
// Cập nhật user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(id, 'ID');
    const { email, fullname, phone_number, address, role, avatar, status, dateOfBirth } = req.body;

    // Không bắt buộc tất cả trường, chỉ cần ít nhất một trường để cập nhật

    if (!email && !fullname && !phone_number && !address && !role && !avatar && !status && !dateOfBirth) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ít nhất một thông tin để cập nhật'
      });
      return;
    }

    const updateData: Partial<IUser> = {};
    if (email) updateData.email = email;
    if (fullname) updateData.fullname = fullname;
    if (phone_number) updateData.phone_number = phone_number;
    if (address) updateData.address = address;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (req.file) {
      updateData.avatar = req.file.path; // URL của ảnh từ Cloudinary
    }

    const updatedUser = await userModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updatedUser) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    res.status(200).json({
      message: 'Người dùng đã được cập nhật thành công',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error user up: ${error.message}`);
    } else {
      console.error('Error user up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { _id } = req.user;
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      res.status(400).json({ message: 'Vui lòng cung cấp productId và quantity' });
      return;
    }

    const user = await userModel.findById(_id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    console.log(typeof productId, productId, 'productId từ req.body');
    console.log(user.cart, 'Giỏ hàng từ database');

    // So sánh ObjectId bằng cách chuyển cả hai thành chuỗi
    const alreadyProduct = user.cart.find((item: { product: mongoose.Types.ObjectId; quantity: number }) =>
      item.product.toString() === productId.toString()
    );
    console.log(alreadyProduct, 'alreadyProduct');

    if (alreadyProduct) {
      console.log('Đã tìm thấy sản phẩm trong giỏ hàng, cập nhật số lượng');
      alreadyProduct.quantity += quantity;
      await user.save();
      res.status(200).json({ message: 'Cập nhật giỏ hàng thành công', user });
    } else {
      console.log('Sản phẩm chưa có trong giỏ hàng, thêm mới');
      const response = await userModel.findByIdAndUpdate(
        _id,
        { $push: { cart: { product: productId, quantity } } },
        { new: true }
      );
      res.status(200).json({ message: 'Thêm sản phẩm vào giỏ hàng thành công', response });
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const addUserAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const newAddress: IAddress = req.body;

    // Validate dữ liệu địa chỉ mới
    if (!newAddress || typeof newAddress !== 'object' || !newAddress.name || !newAddress.phone || !newAddress.address) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu địa chỉ không hợp lệ! Yêu cầu các trường name, phone, address.'
      });
      return;
    }

    // Tìm user và thêm địa chỉ mới vào mảng address
    const user = await userModel.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    user.address = user.address || [];
    user.address.push(newAddress);

    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Thêm địa chỉ thành công',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error adding address: ${error.message}`);
      res.status(500).json({ success: false, message: `Lỗi server: ${error.message}` });
    } else {
      console.error('Error adding address:', error);
      res.status(500).json({ success: false, message: 'Lỗi server không xác định' });
    }
  }
};

export const updateUserAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, index } = req.params;
    const updatedAddress: IAddress = req.body;

    // Validate dữ liệu địa chỉ
    if (
      !updatedAddress ||
      typeof updatedAddress !== 'object' ||
      !updatedAddress.name ||
      !updatedAddress.phone ||
      !updatedAddress.address
    ) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu địa chỉ không hợp lệ! Yêu cầu các trường name, phone, address.'
      });
      return;
    }

    // Kiểm tra id hợp lệ
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ!'
      });
      return;
    }

    // Kiểm tra index hợp lệ
    const addressIndex = parseInt(index, 10);
    if (isNaN(addressIndex) || addressIndex < 0) {
      res.status(400).json({
        success: false,
        message: 'Index địa chỉ không hợp lệ!'
      });
      return;
    }

    // Tìm user
    const user = await userModel.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    // Kiểm tra index có nằm trong mảng address không
    if (!user.address || addressIndex >= user.address.length) {
      res.status(400).json({
        success: false,
        message: 'Địa chỉ không tồn tại!'
      });
      return;
    }

    // Cập nhật địa chỉ tại vị trí index
    user.address[addressIndex] = updatedAddress;
    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Cập nhật địa chỉ thành công',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error updating address: ${error.message}`);
      res.status(500).json({ success: false, message: `Lỗi server: ${error.message}` });
    } else {
      console.error('Error updating address:', error);
      res.status(500).json({ success: false, message: 'Lỗi server không xác định' });
    }
  }
};

export const deleteUserAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, index } = req.params;

    // Kiểm tra id hợp lệ
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ!'
      });
      return;
    }

    // Kiểm tra index hợp lệ
    const addressIndex = parseInt(index, 10);
    if (isNaN(addressIndex) || addressIndex < 0) {
      res.status(400).json({
        success: false,
        message: 'Index địa chỉ không hợp lệ!'
      });
      return;
    }

    // Tìm user
    const user = await userModel.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    // Kiểm tra index có nằm trong mảng address không
    if (!user.address || addressIndex >= user.address.length) {
      res.status(400).json({
        success: false,
        message: 'Địa chỉ không tồn tại!'
      });
      return;
    }

    // Xóa địa chỉ tại vị trí index
    user.address.splice(addressIndex, 1);
    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Xóa địa chỉ thành công',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error deleting address: ${error.message}`);
      res.status(500).json({ success: false, message: `Lỗi server: ${error.message}` });
    } else {
      console.error('Error deleting address:', error);
      res.status(500).json({ success: false, message: 'Lỗi server không xác định' });
    }
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Kiểm tra đầu vào
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới!'
      });
      return;
    }

    // Kiểm tra id hợp lệ
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ!'
      });
      return;
    }

    // Tìm user
    const user = await userModel.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng!'
      });
      return;
    }

    // Kiểm tra xem user có mật khẩu hay không
    if (!user.password) {
      res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn chưa có mật khẩu. Vui lòng thiết lập mật khẩu trước!'
      });
      return;
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcryptjs.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng!'
      });
      return;
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;

    // Lưu user với mật khẩu mới
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error changing password: ${error.message}`);
      res.status(500).json({ success: false, message: `Lỗi server: ${error.message}` });
    } else {
      console.error('Error changing password:', error);
      res.status(500).json({ success: false, message: 'Lỗi server không xác định' });
    }
  }
};

// Lấy danh sách người dùng mới
export const getNewUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Truy vấn người dùng mới trong 30 ngày qua
    const newUsers = await userModel
      .find({
        $or: [
          { createdAt: { $gte: thirtyDaysAgo } }, // Người dùng mới tạo
          { googleId: { $exists: true } } // Người dùng đăng nhập qua Google
        ]
      })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(4);

    res.status(200).json({ success: true, result: newUsers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching new users: ${error.message}`);
    } else {
      console.error('Error fetching new users:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, index } = req.params;

    // Kiểm tra id hợp lệ
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ!'
      });
      return;
    }

    // Kiểm tra index hợp lệ
    const addressIndex = parseInt(index, 10);
    if (isNaN(addressIndex) || addressIndex < 0) {
      res.status(400).json({
        success: false,
        message: 'Index địa chỉ không hợp lệ!'
      });
      return;
    }

    // Tìm user
    const user = await userModel.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    // Kiểm tra index có nằm trong mảng address không
    if (!user.address || addressIndex >= user.address.length) {
      res.status(400).json({
        success: false,
        message: 'Địa chỉ không tồn tại!'
      });
      return;
    }

    // Đặt tất cả địa chỉ thành không mặc định, sau đó đặt địa chỉ được chọn thành mặc định
    user.address = user.address.map((addr: any, idx: number) => ({
      ...addr,
      isDefault: idx === addressIndex
    }));

    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Đặt địa chỉ mặc định thành công',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error setting default address: ${error.message}`);
      res.status(500).json({ success: false, message: `Lỗi server: ${error.message}` });
    } else {
      console.error('Error setting default address:', error);
      res.status(500).json({ success: false, message: 'Lỗi server không xác định' });
    }
  }
};

// người dùng thân thiết
export const getLoyalUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const loyalUsers = await orderModel.aggregate([
      {
        $match: {
          status: 'DELIVERED',
          userID: { $ne: null }
        }
      },
      {
        $lookup: {
          from: 'orderdetails',
          localField: '_id',
          foreignField: 'orderId',
          as: 'orderDetails'
        }
      },
      {
        $unwind: '$orderDetails'
      },
      {
        $group: {
          _id: '$userID',
          totalQuantity: { $sum: '$orderDetails.quantity' },
          fullname: { $first: '$inforUserGuest.fullName' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          _id: 0, // Loại bỏ _id của group
          userId: '$_id',
          fullname: { $ifNull: ['$userInfo.fullname', '$fullname', 'Khách vãng lai'] },
          totalQuantity: 1,
          email: '$userInfo.email',
          createdAt: '$userInfo.createdAt'
          // Không cần khai báo password: 0 vì nó sẽ tự động bị loại bỏ
        }
      },
      {
        $sort: { totalQuantity: -1 }
      },
      {
        $limit: 4
      }
    ]);

    res.status(200).json({ success: true, result: loyalUsers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching loyal users: ${error.message}`);
    } else {
      console.error('Error fetching loyal users:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
