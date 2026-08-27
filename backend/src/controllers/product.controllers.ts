/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;
import productModel from '../models/product.model.js';
import { ProductStatus, ProductStatusMapping } from '../enums/product.enum.js';
import categoryModel from '../models/category.model.js';
import tagModel from '../models/tag.model.js';
import { IProduct } from '../interfaces/product.interface.js';
import brandModel from '../models/brand.model.js';

const removeVietnameseTones = (str: string): string => {
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[đĐ]/g, (match) => (match === 'đ' ? 'd' : 'D'));
  return str.toLowerCase();
};

export const getAllProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, tag, status, brand, category, priceMin, priceMax, page = '1', limit = '10' } = req.query;
    const query: any = {};

    // 1. Lọc theo trạng thái (status)
    if (status && typeof status === 'string') {
      if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
        res.status(400).json({
          success: false,
          message: `Trạng thái không hợp lệ. Chỉ chấp nhận ${Object.values(ProductStatus).join(', ')}`
        });
        return;
      }
      query.status = status;
    }

    // 2. Lọc theo tag (tag_id)
    if (tag && typeof tag === 'string') {
      if (!mongoose.isValidObjectId(tag)) {
        res.status(400).json({ success: false, message: 'Tag ID không hợp lệ' });
        return;
      }
      const tagExists = await tagModel.findById(tag);
      if (!tagExists) {
        res.status(404).json({ success: false, message: `Tag với ID ${tag} không tồn tại` });
        return;
      }
      query.tag_id = tag;
    }

    // 3. Tìm kiếm theo tên sản phẩm (search) với hỗ trợ không dấu
    if (search && typeof search === 'string') {
      const searchNoTones = removeVietnameseTones(search);
      query.name = { $regex: searchNoTones, $options: 'i' }; // Tìm kiếm không phân biệt hoa/thường và không dấu
    }

    // 4. Lọc theo thương hiệu (brand_id)
    if (brand && typeof brand === 'string') {
      if (!mongoose.isValidObjectId(brand)) {
        res.status(400).json({ success: false, message: 'Brand ID không hợp lệ' });
        return;
      }
      const brandExists = await brandModel.findById(brand);
      if (!brandExists) {
        res.status(404).json({ success: false, message: `Brand với ID ${brand} không tồn tại` });
        return;
      }
      query.brand_id = brand;
    }

    // 5. Lọc theo danh mục (category_id)
    if (category && typeof category === 'string') {
      if (!mongoose.isValidObjectId(category)) {
        res.status(400).json({ success: false, message: 'Category ID không hợp lệ' });
        return;
      }
      const categoryExists = await categoryModel.findById(category);
      if (!categoryExists) {
        res.status(404).json({ success: false, message: `Category với ID ${category} không tồn tại` });
        return;
      }
      query.category_id = category;
    }

    // 6. Lọc theo khoảng giá (priceMin và priceMax)
    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin && typeof priceMin === 'string') {
        const min = parseFloat(priceMin);
        if (isNaN(min) || min < 0) {
          res.status(400).json({ success: false, message: 'Giá tối thiểu không hợp lệ' });
          return;
        }
        query.price.$gte = min;
      }
      if (priceMax && typeof priceMax === 'string') {
        const max = parseFloat(priceMax);
        if (isNaN(max) || max < 0) {
          res.status(400).json({ success: false, message: 'Giá tối đa không hợp lệ' });
          return;
        }
        query.price.$lte = max;
      }
      if (query.price.$gte !== undefined && query.price.$lte !== undefined && query.price.$gte > query.price.$lte) {
        res.status(400).json({ success: false, message: 'Giá tối thiểu không được lớn hơn giá tối đa' });
        return;
      }
    }

    // Phân trang
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    if (pageNum < 1 || limitNum < 1) {
      res.status(400).json({ success: false, message: 'Page và limit phải là số dương' });
      return;
    }
    const skip = (pageNum - 1) * limitNum;

    // Đếm tổng số sản phẩm phù hợp với điều kiện lọc
    const total = await productModel.countDocuments(query);

    // Thực hiện truy vấn với các điều kiện lọc và phân trang
    const result = await productModel
      .find(query)
      .populate('category_id', 'name')
      .populate('brand_id', 'brand_name')
      .populate('tag_id', 'tag_name')
      .skip(skip)
      .limit(limitNum);

    // Trả về kết quả
    res.status(200).json({
      success: true,
      message: result.length > 0 ? 'Lấy danh sách sản phẩm thành công' : 'Không tìm thấy sản phẩm phù hợp',
      result,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', (error as Error).message || error);
    res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id).populate('category_id').populate('brand_id').populate('tag_id');
    if (!product) {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      return;
    }
    res.status(200).json({ message: 'Lấy sản phẩm thành công', product });
  } catch (error) {
    res.status(500).json({ message: 'Error getting product', error });
  }
};
export const insertProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const images: string[] = [];
    const fileData = req.files;
    if (Array.isArray(fileData) && fileData.length > 0) {
      fileData.map((file) => {
        images.push(file?.path);
      });
    }
    console.log(fileData);
    const { name, description, price, category_id, tag_id, brand_id, status } = req.body;
    if (!mongoose.isValidObjectId(category_id)) {
      res.status(400).json({ message: 'Required field' });
      return;
    }

    const newProduct = new productModel<Partial<IProduct>>({
      name,
      description,
      price,
      category_id,
      image_url: images,
      tag_id,
      brand_id,
      status
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(id, 'ID');
    const {
      name,
      description,
      price,
      category_id,
      status,
      quantity,
      discount,
      brand_id,
      tag_id,
      existing_images,
      new_images
    } = req.body;

    if (!name || !price || !category_id || !status) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ các trường bắt buộc: name, price, category_id, status'
      });
      return;
    }

    const currentProduct = await productModel.findById(id);
    if (!currentProduct) {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      return;
    }

    // Khởi tạo danh sách ảnh từ dữ liệu hiện tại
    let images_url: string[] = [...(currentProduct.image_url || [])];

    // Xử lý ảnh cũ còn lại từ existing_images
    let keptImages: string[] = [];
    if (existing_images) {
      keptImages = typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images;
      if (!Array.isArray(keptImages)) keptImages = [];
    }

    // Xử lý ảnh mới từ req.files và new_images
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImagesPaths = req.files.map((file) => file.path);
      let newImagesIndices = [];
      if (new_images) {
        newImagesIndices = typeof new_images === 'string' ? JSON.parse(new_images) : new_images;
      }

      // Tạo danh sách ảnh cuối cùng
      const finalImages: string[] = [];
      const maxIndex = Math.max(images_url.length, ...newImagesIndices.map((ni: any) => ni.index));

      // Điền ảnh cũ và ảnh mới vào vị trí tương ứng
      for (let i = 0; i <= maxIndex; i++) {
        const newImageIndex = newImagesIndices.findIndex((ni: any) => ni.index === i);
        if (newImageIndex !== -1) {
          // Thay thế hoặc thêm ảnh mới tại vị trí chỉ định
          finalImages[i] = newImagesPaths[newImageIndex];
        } else if (i < images_url.length && keptImages.includes(images_url[i])) {
          // Giữ lại ảnh cũ nếu có trong keptImages
          finalImages[i] = images_url[i];
        }
      }

      // Cập nhật images_url
      images_url = finalImages.filter((img) => img !== undefined);
    } else {
      // Nếu không có ảnh mới, chỉ giữ lại ảnh trong existing_images
      images_url = keptImages;
    }

    console.log('Final images_url:', images_url);

    if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
      res.status(400).json({ success: false, message: 'Trạng thái sản phẩm không hợp lệ' });
      return;
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        category_id,
        image_url: images_url,
        brand_id,
        status,
        tag_id,
        quantity,
        discount
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      return;
    }

    res.status(200).json({ message: 'Cập nhật sản phẩm thành công', product: updatedProduct });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error product up: ${error.message}`);
    } else {
      console.error('Error product up:', error);
    }
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật sản phẩm' });
  }
};

export const getNewProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await productModel
      .find({
        $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
      })
      .sort({ createdAt: -1, updatedAt: -1 })
      .limit(10)
      .populate('category_id')
      .populate('brand_id');

    res.status(200).json({
      success: true,
      message: result.length > 0 ? 'Lấy sản phẩm mới thành công' : 'Chưa có sản phẩm mới',
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm mới', error });
  }
};

export const getSaleProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await productModel
      .find({
        discount: { $gt: 0 },
        $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
      })
      .populate('category_id')
      .populate('brand_id')
      .limit(10);

    res.status(200).json({
      success: true,
      message: result.length > 0 ? 'Lấy Sản Phẩm Giảm Giá Thành Công' : 'Chưa có sản phẩm giảm giá',
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm giảm giá', error });
  }
};

export const getHotProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await productModel
      .find({
        $or: [{ status: ProductStatus.AVAILABLE }, { status: { $exists: false } }, { status: null }]
      })
      .sort({ quantity_sold: -1, createdAt: -1 })
      .limit(10)
      .populate('category_id')
      .populate('brand_id')
      .populate('tag_id');

    res.status(200).json({
      success: true,
      message: result.length > 0 ? 'Lấy sản phẩm bán chạy thành công' : 'Chưa có sản phẩm bán chạy',
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm bán chạy', error });
  }
};

export const getProductByCategoryID = async (req: Request, res: Response): Promise<void> => {
  let categoryName = 'category'; // Giá trị mặc định nếu không lấy được name

  try {
    const { id } = req.params;
    console.log('Received category ID:', id); // Log để kiểm tra

    // Kiểm tra id có tồn tại không
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
      return;
    }

    // Kiểm tra tính hợp lệ của id
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
      return;
    }

    // Lấy thông tin category để lấy name
    const category = await categoryModel.findById(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: `Category with ID ${id} not found`
      });
      return;
    }

    categoryName = category.name || 'category'; // Lấy name của category, mặc định là 'category' nếu không có
    console.log('Category name:', categoryName); // Log để kiểm tra

    // Query sản phẩm
    const result = await productModel.find({ category_id: id });
    console.log('Query result:', result); // Log để kiểm tra

    // Kiểm tra kết quả
    if (!result || result.length === 0) {
      res.status(404).json({
        success: false,
        message: `No products found for category "${categoryName}" (ID: ${id})`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Lấy sản phẩm dành cho ${categoryName} thành công`,
      result
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi lấy sản phẩm dành cho ${categoryName}`
    });
  }
};

export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  console.log('Received files:', req.files); // Debug
  if (!req.files) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  res.status(200).json({ message: 'Upload images successfully', files: req.files });
};

export const getProductActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await productModel.find({ status: ProductStatus.AVAILABLE });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

export const getProductByTagId = async (req: Request, res: Response): Promise<void> => {
  let tagName = 'tag';
  try {
    const { id } = req.params;
    console.log('Received tag_id ID:', id);

    // Kiểm tra id có tồn tại không
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Tag ID is required'
      });
      return;
    }

    // Kiểm tra tính hợp lệ của id
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid Tag ID format'
      });
      return;
    }

    // Lấy thông tin tag để lấy name
    const tag = await tagModel.findById(id);
    if (!tag) {
      res.status(404).json({
        success: false,
        message: `Tag with ID ${id} not found`
      });
      return;
    }

    tagName = tag.tag_name || 'TAG';
    console.log('Category name:', tagName); // Log để kiểm tra

    // Query sản phẩm
    const result = await productModel.find({ tag_id: id });
    console.log('Query result:', result); // Log để kiểm tra

    // Kiểm tra kết quả
    if (!result || result.length === 0) {
      res.status(404).json({
        success: false,
        message: `No products found for tag "${tagName}" (ID: ${id})`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Lấy sản phẩm dành cho "${tagName}" thành công`,
      products: result
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi lấy sản phẩm dành cho ${tagName}`
    });
  }
};

export const getProductRelated = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;

    // Tìm sản phẩm theo ID
    const product = await productModel.findById(productId).lean();
    if (!product) {
      res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      return;
    }

    // Kiểm tra các trường cần thiết
    const { category_id, tag_id } = product;
    console.log(category_id, 'category_id');
    console.log(tag_id, 'tag_id');

    // Nếu không có tiêu chí nào để tìm sản phẩm liên quan
    if (!category_id && !tag_id) {
      res.status(200).json([]); // Trả về mảng rỗng
      return;
    }

    // Tạo điều kiện query cho sản phẩm liên quan
    const queryConditions: any[] = [];
    if (category_id) queryConditions.push({ category_id: category_id });
    if (tag_id) queryConditions.push({ tag_id: tag_id });
    console.log(queryConditions, 'SSS1111111111111');
    // Tìm sản phẩm liên quan
    const relatedProducts = await productModel
      .find({
        _id: { $ne: productId }, // Loại bỏ chính sản phẩm hiện tại
        $and: queryConditions // Tìm sản phẩm có ít nhất một trường khớp
      })
      .find({ status: ProductStatus.AVAILABLE })
      .limit(10) // Giới hạn số lượng sản phẩm trả về
      .lean();

    res.status(200).json(relatedProducts);
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm liên quan:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm liên quan' });
  }
};
export const toggleProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    console.log('ID Product:', id);
    console.log('Status Product:', status);

    if (!id) {
      res.status(400).json({ message: 'Vui lòng cung cấp ID sản phẩm' });
      return;
    }

    // Kiểm tra status có hợp lệ không
    const statusString = String(status).toLowerCase();
    if (!Object.values(ProductStatus).includes(statusString as ProductStatus)) {
      res.status(400).json({
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận ${ProductStatus.AVAILABLE}, ${ProductStatus.DISCONTINUED}, ${ProductStatus.OUT_OF_STOCK}  `
      });
      return;
    }

    // Tìm sản phẩm theo ID
    const product = await productModel.findById(id);
    if (!product) {
      res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      return;
    }
    product.status = statusString;
    await product.save();

    res.status(200).json({
      message: `Sản phẩm đã được chuyển trạng thái ${statusString} thành công`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái sản phẩm', error });
    return;
  }
};

export const toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('ID Product:', id);
    console.log('New Status:', status);

    if (!id) {
      res.status(400).json({ message: 'Vui lòng cung cấp ID sản phẩm' });
      return;
    }

    if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
      res.status(400).json({
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận ${Object.values(ProductStatus).join(', ')}`
      });
      return;
    }

    const product = await productModel.findById(id);
    if (!product) {
      res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      return;
    }

    product.status = status;
    await product.save();

    res.status(200).json({
      message: `Trạng thái sản phẩm đã được cập nhật thành ${status} thành công`,
      product
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái sản phẩm', error });
  }
};
export const getProductOutStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await productModel
      .find({ status: ProductStatus.OUT_OF_STOCK })
      .populate('category_id')
      .populate('brand_id')
      .populate('tag_id');
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id).populate('category_id').populate('brand_id').populate('tag_id');
    if (!product) {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      return;
    }
    await productModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Xóa sản phẩm thành công', product });
  } catch (error) {
    res.status(500).json({ message: 'Error getting product', error });
  }
};


// quản lí số lượng sản phẩm



