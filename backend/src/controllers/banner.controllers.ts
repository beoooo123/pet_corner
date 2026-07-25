import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bannerModel from '../models/banner.model.js';
import { BannerStatus } from '../enums/banner.enum.js';

export const getAllBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const banners = await bannerModel.find().sort({ order: 1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Error getAllBanners:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const getBannerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const banner = await bannerModel.findById(id);
    if (!banner) {
      res.status(404).json({ success: false, message: 'Không tìm thấy banner' });
      return;
    }
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    console.error('Error getBannerById:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const getBannersActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const banners = await bannerModel.find({ status: BannerStatus.ACTIVE }).sort({ order: 1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Error getBannersActive:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const insertBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh banner' });
      return;
    }

    const { title, link_url, status } = req.body;
    let { order } = req.body;

    if (order === undefined || order === '') {
      order = await bannerModel.countDocuments();
    }

    if (status && !Object.values(BannerStatus).includes(status as BannerStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái banner không hợp lệ' });
      return;
    }

    const newBanner = new bannerModel({
      title: title || '',
      image_url: req.file.path,
      link_url: link_url || '',
      order: Number(order),
      status: status || BannerStatus.ACTIVE
    });

    await newBanner.save();
    res.status(201).json({ success: true, message: 'Tạo banner thành công', data: newBanner });
  } catch (error) {
    console.error('Error insertBanner:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const updateBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    const { title, link_url, order, status } = req.body;

    if (status && !Object.values(BannerStatus).includes(status as BannerStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái banner không hợp lệ' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (link_url !== undefined) updateData.link_url = link_url;
    if (order !== undefined && order !== '') updateData.order = Number(order);
    if (status !== undefined) updateData.status = status;
    // Chỉ thay ảnh khi admin có upload file mới, không thì giữ nguyên ảnh cũ
    if (req.file) updateData.image_url = req.file.path;

    const updatedBanner = await bannerModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedBanner) {
      res.status(404).json({ success: false, message: 'Banner không tồn tại' });
      return;
    }

    res.status(200).json({ success: true, message: 'Cập nhật banner thành công', data: updatedBanner });
  } catch (error) {
    console.error('Error updateBanner:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const toggleBannerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const statusString = String(status).toLowerCase();
    if (!Object.values(BannerStatus).includes(statusString as BannerStatus)) {
      res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận "active" hoặc "inactive"'
      });
      return;
    }

    const banner = await bannerModel.findById(id);
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner không tồn tại' });
      return;
    }

    banner.status = statusString as BannerStatus;
    await banner.save();

    res.status(200).json({
      success: true,
      message: statusString === BannerStatus.INACTIVE ? 'Đã khóa banner' : 'Đã mở banner',
      data: banner
    });
  } catch (error) {
    console.error('Error toggleBannerStatus:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const reorderBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orders } = req.body as { orders: { id: string; order: number }[] };

    if (!Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({ success: false, message: 'Danh sách thứ tự không hợp lệ' });
      return;
    }

    await bannerModel.bulkWrite(
      orders.map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { order: item.order }
        }
      }))
    );

    res.status(200).json({ success: true, message: 'Cập nhật thứ tự banner thành công' });
  } catch (error) {
    console.error('Error reorderBanners:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

export const deleteBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const banner = await bannerModel.findById(id);
    if (!banner) {
      res.status(404).json({ success: false, message: 'Không tìm thấy banner' });
      return;
    }

    await bannerModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Xóa banner thành công' });
  } catch (error) {
    console.error('Error deleteBanner:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};
