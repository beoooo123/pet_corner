import { Request, Response } from 'express';
import mongoose from 'mongoose';
import blogCategoryModel from '../models/blogCategory.model.js';
import { BlogCategoryStatus } from '../enums/blogCategory.enum.js';

export const getAllBlogCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await blogCategoryModel.find();
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error getAllBlogCategories:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const getBlogCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const blogCategory = await blogCategoryModel.findById(id);
    if (!blogCategory) {
      res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
      return;
    }
    res.status(200).json({ success: true, result: blogCategory });
  } catch (error) {
    console.error('Error getBlogCategoryById:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const getBlogCategoriesActive = async (req: Request, res: Response) => {
  try {
    const result = await blogCategoryModel.find({ status: BlogCategoryStatus.ACTIVE });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

export const insertBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên danh mục' });
      return;
    }

    const existingCategory = await blogCategoryModel.findOne({ name });
    if (existingCategory) {
      res.status(400).json({ success: false, message: 'Danh mục với tên này đã tồn tại' });
      return;
    }

    const newBlogCategory = new blogCategoryModel({
      name,
      description: description || ''
    });

    await newBlogCategory.save();
    res.status(201).json({ success: true, message: 'Tạo danh mục bài viết thành công', result: newBlogCategory });
  } catch (error) {
    console.error('Error insertBlogCategory:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const updateBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    const { name, description, status } = req.body;

    if (status && !Object.values(BlogCategoryStatus).includes(status as BlogCategoryStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái danh mục không hợp lệ' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updatedBlogCategory = await blogCategoryModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedBlogCategory) {
      res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: 'Cập nhật danh mục bài viết thành công', result: updatedBlogCategory });
  } catch (error) {
    console.error('Error updateBlogCategory:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const deleteBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const blogCategory = await blogCategoryModel.findById(id);
    if (!blogCategory) {
      res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
      return;
    }

    await blogCategoryModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Xóa danh mục bài viết thành công' });
  } catch (error) {
    console.error('Error deleteBlogCategory:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};
