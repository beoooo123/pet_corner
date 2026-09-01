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

const Navigation: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { id } = useParams<{ id: string }>();
  const isAdminPage = location.pathname.startsWith("/admin");
  const isDetailPage = location.pathname.startsWith("/detail");
  const isBlogDetailPage = location.pathname.startsWith("/blogs/");

  const [product, setProduct] = useState<{
    name: string;
    category_id: { name: string };
  } | null>(null);
  const [blog, setBlog] = useState<{
    title: string;
    blog_category_id?: { name: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch product details for /detail/:id
    if (isDetailPage && id) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await productsApi.getProductByID(id);
          console.log("Product API response:", response.data);
          setProduct(response.data.product);
        } catch (err: any) {
          setError(
            `Không thể tải thông tin sản phẩm: ${
              err.message || "Lỗi không xác định"
            }`
          );
          setProduct(null);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }

    // Fetch blog details for /blogs/:id
    if (isBlogDetailPage && id) {
      const fetchBlog = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await blogApi.getBlogById(id);
          setBlog(response.data.data);
        } catch (err: any) {
          setError(
            `Không thể tải thông tin bài viết: ${
              err.message || "Lỗi không xác định"
            }`
          );
          setBlog(null);
        } finally {
          setLoading(false);
        }
      };
      fetchBlog();
    }
  }, [id, isDetailPage, isBlogDetailPage]);
const containerStyles = {
    admin: "bg-white p-4 rounded-lg shadow-sm mb-4 overflow-x-auto",
    public:
      "px-4 sm:px-6 md:px-8 lg:px-[154px] py-2 sm:py-3 md:py-4 text-sm sm:text-base overflow-x-auto",
  };

  const breadcrumbStyles = {
    admin: "mb-2 sm:mb-3 whitespace-nowrap",
    public: "whitespace-nowrap",
  };

  const titleStyles = {
    admin: "text-lg sm:text-xl md:text-2xl m-0 text-black truncate",
  };

  const getDisplayName = (name: string) => {
    if (isAdminPage) {
      return (
        adminPageNameMapping[name.toLowerCase()] ||
        name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ")
      );
    } else {
      return (
        publicPageNameMapping[name.toLowerCase()] ||
        name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ")
      );
    }
  };

  // Xác định tên trang hiện tại
  const currentPageName =
    isDetailPage && product
      ? product.name
      : isBlogDetailPage && blog
      ? blog.title
      : getDisplayName(pathnames[pathnames.length - 1] || "");

  const linkStyles =
    "text-gray-500 hover:text-gray-700 transition-colors duration-200";
  const currentPageStyles = "text-black";

  const adminLayout = (
    <div className={containerStyles.admin}>
      <Breadcrumb className={breadcrumbStyles.admin} separator=">">
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          return last ? (
            <Breadcrumb.Item key={to}>
              <span className={currentPageStyles}>{getDisplayName(value)}</span>
            </Breadcrumb.Item>
          ) : (
            <Breadcrumb.Item key={to}>
              <Link to={to} className={linkStyles}>
                {getDisplayName(value)}
              </Link>
            </Breadcrumb.Item>
          );
        })}
      </Breadcrumb>
      <Title level={3} className={titleStyles.admin}>
        {currentPageName}
      </Title>
    </div>
  );

  const publicLayout = (
    <div className={containerStyles.public}>
      <Breadcrumb className={breadcrumbStyles.public} separator="/">
        <Breadcrumb.Item>
          <Link to="/" className={linkStyles}>
            Trang chủ
          </Link>
        </Breadcrumb.Item>

        {isDetailPage ? (
          product ? (
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
