import { Request, Response } from 'express';
import mongoose from 'mongoose';
import blogModel from '../models/blog.model.js';
import { BlogStatus } from '../enums/blog.enum.js';

export const getAllBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const blogs = await blogModel.find().sort({ createdAt: -1 }).populate('blog_category_id', 'name');
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    console.error('Error getAllBlogs:', error);
    res.status(500).json({ success: false, message: 'Server error when fetching blogs' });
  }
};

export const getBlogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const blog = await blogModel.findById(id);

    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    console.error('Error getBlogById:', error);
    res.status(500).json({ success: false, message: 'Server error when fetching blog' });
  }
};

export const getActiveBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blogs = await blogModel
      .find({ status: BlogStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('blog_category_id', 'name');
    const total = await blogModel.countDocuments({ status: BlogStatus.ACTIVE });

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error getActiveBlogs:', error);
    res.status(500).json({ success: false, message: 'Server error when fetching active blogs' });
  }
};

export const createBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, author, blog_category_id, status } = req.body;

    if (!title || !content || !author) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề, tác giả và nội dung bài viết' });
      return;
    }

    if (blog_category_id && !mongoose.isValidObjectId(blog_category_id)) {
      res.status(400).json({ success: false, message: 'Danh mục bài viết không hợp lệ' });
      return;
    }

    if (status && !Object.values(BlogStatus).includes(status as BlogStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái bài viết không hợp lệ' });
      return;
    }

    const newBlog = new blogModel({
      title,
      content,
      author,
      blog_category_id: blog_category_id || undefined,
      image_url: req.file ? req.file.path : '',
      status: status || BlogStatus.ACTIVE
    });

    await newBlog.save();
    res.status(201).json({ success: true, message: 'Tạo bài viết thành công', data: newBlog });
  } catch (error) {
    console.error('Error createBlog:', error);
    res.status(500).json({ success: false, message: 'Server error when creating blog' });
  }
};

export const updateBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    const blog = await blogModel.findById(id);
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }

    const { title, content, author, blog_category_id, status } = req.body;

    if (blog_category_id && !mongoose.isValidObjectId(blog_category_id)) {
      res.status(400).json({ success: false, message: 'Danh mục bài viết không hợp lệ' });
      return;
    }

    if (status && !Object.values(BlogStatus).includes(status as BlogStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái bài viết không hợp lệ' });
      return;
    }

    // Giữ ảnh cũ nếu không upload ảnh mới
    let image_url = blog.image_url;
    if (req.file) {
      image_url = req.file.path; // Cập nhật URL mới từ Cloudinary
    }

    const updateData: Record<string, unknown> = { image_url };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (author !== undefined) updateData.author = author;
    if (blog_category_id !== undefined) updateData.blog_category_id = blog_category_id || undefined;
    if (status !== undefined) updateData.status = status;

    const updatedBlog = await blogModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, message: 'Cập nhật bài viết thành công', data: updatedBlog });
  } catch (error) {
    console.error('Error updateBlog:', error);
    res.status(500).json({ success: false, message: 'Server error when updating blog' });
  }
};

export const toggleBlogStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const statusString = String(status).toLowerCase();
    if (!Object.values(BlogStatus).includes(statusString as BlogStatus)) {
      res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận "active" hoặc "inactive"'
      });
      return;
    }

    const blog = await blogModel.findById(id);
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }

    blog.status = statusString as BlogStatus;
    await blog.save();

    res.status(200).json({
      success: true,
      message: statusString === BlogStatus.INACTIVE ? 'Đã ẩn bài viết' : 'Đã hiện bài viết',
      data: blog
    });
  } catch (error) {
    console.error('Error toggleBlogStatus:', error);
    res.status(500).json({ success: false, message: 'Server error when updating blog status' });
  }
};

export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const blog = await blogModel.findById(id);
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }

    await blogModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Xóa bài viết thành công' });
  } catch (error) {
    console.error('Error deleteBlog:', error);
    res.status(500).json({ success: false, message: 'Server error when deleting blog' });
  }
};
