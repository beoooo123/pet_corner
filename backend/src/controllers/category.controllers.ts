import { Request, Response } from 'express';
import { IUser } from '../interfaces/user.interface.js';
import categoryModel from '../models/category.model.js';
import { CategoryStatus } from '../enums/category.enum.js';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const getAllCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await categoryModel.find();
    res.status(200).json({ success: true, result });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error category up: ${error.message}`);
    } else {
      console.error('Error category up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await categoryModel.findById(id);
    if (!category) {
      res.status(404).json({ message: 'Không tìm thấy danh mục' });
      return;
    }
    res.status(200).json({ message: 'Lấy danh mục thành công', category });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error category up: ${error.message}`);
      return;
    } else {
      console.error('Error category up:', error);
      return;
    }
  }
};
export const insertCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      res.status(400).json({
        success: false,
        message: 'Please provide an name and description product'
      });
    }
    const existingNameCategory = await categoryModel.findOne({ name });
    if (existingNameCategory) {
      res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    const newCategory = new categoryModel({
      name,
      description
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      user: { ...newCategory._doc }
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error category up: ${error.message}`);
    } else {
      console.error('Error category up:', error);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// vẫn để nó hoạt động ( những chuyển qua api khác)
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(id, 'ID');

    // Kiểm tra xem ID có hợp lệ không
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
      return;
    }

    const { name, description, status } = req.body;

    if (!name || !description || status === undefined) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên, mô tả và trạng thái danh mục'
      });
      return;
    }

    if (!Object.values(CategoryStatus).includes(status as CategoryStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái danh mục không hợp lệ' });
      return;
    }

    // Tìm và cập nhật danh mục
    const updatedCategory = await categoryModel.findByIdAndUpdate(
      id,
      { name, description, status },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      return;
    }

    res.status(200).json({ success: true, message: 'Danh mục được cập nhật thành công', category: updatedCategory });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Lỗi khi cập nhật danh mục: ${error.message}`);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    } else {
      console.error('Lỗi không xác định khi cập nhật danh mục:', error);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  }
};

export const toggleCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    console.log('ID Category:', id);
    console.log('Status Category:', status);

    if (!id) {
      res.status(400).json({ message: 'Vui lòng cung cấp ID danh mục' });
      return;
    }

    // Kiểm tra status có hợp lệ không
    const statusString = String(status).toLowerCase();
    if (!Object.values(CategoryStatus).includes(statusString as CategoryStatus)) {
      res.status(400).json({
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận "active" hoặc "inactive"'
      });
      return;
    }

    // Tìm danh mục theo ID
    const category = await categoryModel.findById(id);
    if (!category) {
      res.status(404).json({ message: 'Danh mục không tồn tại' });
      return;
    }

    // Chuyển đổi status sang boolean (inactive = true, active = false)
    const isHidden = statusString === CategoryStatus.INACTIVE;

    // Cập nhật trạng thái `isHidden`
    category.status = isHidden ? 'inactive' : 'active';
    await category.save();

    res.status(200).json({
      message: isHidden ? 'Danh mục đã được ẩn thành công' : 'Danh mục đã mở lại thành công',
      category
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái danh mục', error });
    return;
  }
};

export const getCategoriesActive = async (req: Request, res: Response) => {
  try {
    const result = await categoryModel.find({ status: CategoryStatus.ACTIVE });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

// Xóa category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await categoryModel.findById(id);
    if (!category) {
      res.status(404).json({ message: 'Không tìm thấy danh mục' });
      return;
    }

    await categoryModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error category up: ${error.message}`);
      return;
    } else {
      console.error('Error category up:', error);
      return;
    }
  }
};
