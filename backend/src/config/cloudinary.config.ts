import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';
import { Request } from 'express';

dotenv.config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Hàm lấy tên thư mục từ route
const getFolderFromRoute = (req: Request): string => {
  const folderActive = ['products', 'categories', 'users', 'orders', 'reviews', 'blogs', 'banners'];

  // Lấy route và làm sạch nó
  const route = req.originalUrl
    .replace('/api/v1/', '') // Loại bỏ phần /api/v1/
    .split('/')[0] // Chỉ lấy phần đầu tiên của route (ví dụ: products từ products/123)
    .split('?')[0]; // Loại bỏ query params nếu có (ví dụ: products?key=value)

  // Kiểm tra xem route có nằm trong danh sách folderActive không
  if (!folderActive.includes(route)) {
    throw new Error(`Route ${route} is not supported for file upload`);
  }

  return `uploads/${route}`;
};

// Hàm tạo public_id sạch, không chứa ký tự gây tạo thư mục con
const generatePublicId = (originalName: string): string => {
  // Lấy tên file gốc, loại bỏ phần mở rộng
  const nameWithoutExtension = originalName.split('.')[0];
  // Thay thế các ký tự không mong muốn (như /) để tránh tạo thư mục con
  const cleanName = nameWithoutExtension.replace(/[^a-zA-Z0-9-_]/g, '_');
  // Thêm timestamp để tránh trùng lặp
  return `${cleanName}_${Date.now()}`;
};

// Cấu hình CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = getFolderFromRoute(req);
    const publicId = generatePublicId(file.originalname);

    // Banner là ảnh rộng-thấp (kiểu hero banner), không dùng crop vuông như các resource khác
    const transformation =
      folder === 'uploads/banners'
        ? [{ width: 1600, height: 500, crop: 'fill', gravity: 'auto', quality: 'auto' }]
        : [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }];

    return {
      folder: folder, // Thư mục chính (ví dụ: uploads/products)
      public_id: publicId, // Tên file sạch, không gây tạo thư mục con
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation
    };
  }
});

// Khởi tạo multer với storage
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn file size: 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only images (jpg, png, webp) are allowed'));
    }
    cb(null, true);
  }
});

export { cloudinary };
export default upload;
