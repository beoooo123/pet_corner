import React, { useEffect, useState } from "react";
import { Breadcrumb } from "antd";
import { useLocation, Link, useParams } from "react-router-dom";
import { Typography } from "antd";
import productsApi from "../api/productsApi";
import blogApi from "../api/blogApi";

const { Title } = Typography;

// Existing mappings remain the same
const adminPageNameMapping: { [key: string]: string } = {
  admin: "Admin",
  dashboard: "Dashboard",
  categories: "Quản lý danh mục",
  blogcategories: "Quản lý danh mục bài viết",
  products: "Quản lý sản phẩm",
  blogs: "Quản lý bài viết",
  brands: "Quản lý thương hiệu",
  tags: "Quản lý tags",
  employees: "Quản lý nhân viên",
  orders: "Quản lý đơn hàng",
  services: "Quản lý dịch vụ",
  users: "Quản lý người dùng",
  settings: "Cài đặt hệ thống",
  posts: "Quản lý bài viết",
  bookings: "Quản lí lịch hẹn",
  revenue: "Quản lí doanh thu",
  coupon: "Quản lí mã giảm giá",
};

const publicPageNameMapping: { [key: string]: string } = {
  "": "Trang chủ",
  product: "Sản phẩm",
  contact: "Liên hệ",
  detail: "Chi tiết sản phẩm",
  info: "Dịch vụ Spa",
  blogs: "Bài viết",
  "about-us": "Về chúng tôi",
  service: "Đặt lịch Spa",
  cart: "Giỏ hàng",
  checkout: "Thanh toán",
  userprofile: "Hồ sơ người dùng",
  account: "Tài khoản của tôi",
  "address": "Địa chỉ của tôi",
  order: "Đơn hàng của tôi",
  booking: "Lịch hẹn của tôi",
  "change-password": "Đổi mật khẩu",
  "orders": "Đơn hàng",
  "bookings": "Lịch hẹn",
  
};

            <>
              <Breadcrumb.Item>
                <Link to="/product" className={linkStyles}>
                  {product.category_id?.name || "Danh mục không xác định"}
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <span className="text-black max-w-[150px] sm:max-w-none truncate inline-block align-bottom">
                  {product.name}
                </span>
              </Breadcrumb.Item>
            </>
          ) : (
            <Breadcrumb.Item>
              <span className={currentPageStyles}>Chi tiết sản phẩm</span>
</Breadcrumb.Item>
          )
        ) : isBlogDetailPage ? (
          blog ? (
            <>
              <Breadcrumb.Item>
                <Link to="/blogs" className={linkStyles}>
                  {blog.blog_category_id?.name || "Bài viết"}
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <span className="text-black max-w-[150px] sm:max-w-none truncate inline-block align-bottom">
                  {blog.title}
                </span>
              </Breadcrumb.Item>
            </>
          ) : (
            <Breadcrumb.Item>
              <span className={currentPageStyles}>Chi tiết bài viết</span>
            </Breadcrumb.Item>
          )
        ) : (
          pathnames.map((value, index) => {
            const last = index === pathnames.length - 1;
            const to = `/${pathnames.slice(0, index + 1).join("/")}`;
            const displayName = getDisplayName(value);

            return last ? (
              <Breadcrumb.Item key={to}>
                <span className="text-black max-w-[150px] sm:max-w-none truncate inline-block align-bottom">
                  {displayName}
                </span>
              </Breadcrumb.Item>
            ) : (
              <Breadcrumb.Item key={to}>
                <Link to={to} className={linkStyles}>
                  {displayName}
                </Link>
              </Breadcrumb.Item>
            );
          })
        )}
      </Breadcrumb>
    </div>
  );

  // Không hiển thị navigation trên các route cụ thể
  if (
    location.pathname === "/admin" ||
    location.pathname === "/admin/dashboard" ||
    location.pathname === "/"
  ) {
    return null;
  }

  // Hiển thị trạng thái loading hoặc lỗi
  if ((isDetailPage || isBlogDetailPage) && loading) {
    return (
      <div className="p-4 text-center text-gray-600">
        <div className="animate-pulse">Đang tải...</div>
      </div>
    );
  }

  if ((isDetailPage || isBlogDetailPage) && error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return isAdminPage ? adminLayout : publicLayout;
};

export default Navigation;
