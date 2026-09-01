import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Home from "./pages/home/home";
import PageLayout from "./components/layout/PageLayout";
import Login from "./pages/login/login";
import SignUp from "./pages/signup/signup";
import Products from "./pages/product/product";
import DetailProduct from "./pages/detail/detail";
import Cart from "./pages/cart/cart";
import UserProfile from "./pages/userprofile/userprofile";
import AdminLayout from "./components/layout/AdminLayout";
import ProductList from "./admin/product/product";
import CategoryList from "./admin/category/category";
import UserList from "./admin/user/user";
import AboutUs from "./pages/about-us/about-us";
import BrandManager from "./admin/brand/brand";
import TagManager from "./admin/tag/tag";
import BannerList from "./admin/banner/banner";
import BlogList from "./admin/blog/blog";
import BlogCategoryList from "./admin/blog_category/blog_category";
import DocsPage from "./admin/docs/docs";
import VerifyOtp from "./pages/verifyOTP/verifyOTP";
import Search from "./pages/search/search";
import NotFound from "./pages/404/404"; // Import trang 404
import Dashboard from "./admin/dashboard/dashboard";
import Revenue from "./admin/revenue/revenue";
import CouponList from "./admin/coupon/coupon";
import DeliveryList from "./admin/delivery/delivery";
import PaymentTypeList from "./admin/paymentType/paymentType";
import OrderList from "./admin/order/order";
import Payment from "./pages/payment/payment";
import CancelPage from "./pages/orders/cancel";
import SuccessPage from "./pages/orders/success";
import Blog from "./pages/blog/blog";
import BlogDetail from "./pages/blogDetail/blogDetail";

interface User {
  id: string;
  email: string;
  fullname: string;
  avatar?: string;
  role: string;
  status: string;
}

const ProtectedRoute = ({
  children,
  allowedRole,
  path,
}: {
  children: JSX.Element;
  allowedRole?: string;
  path?: string;
}) => {
  const userData = localStorage.getItem("userData");
  const user: User | null = userData ? JSON.parse(userData) : null;
  return children;
};

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  return children;
};

function App() {
  const router = createBrowserRouter([
    {
      path: "/login",
      element: (
        <PublicRoute>
          <Login />
        </PublicRoute>
      ),
    },
    {
      path: "/signup",
      element: (
        <PublicRoute>
          <SignUp />
        </PublicRoute>
      ),
    },
    {
      path: "/verify-otp",
      element: (
        <PublicRoute>
          <VerifyOtp />
        </PublicRoute>
      ),
    },
    {
      path: "/admin",
      element: (
        <ProtectedRoute path="/admin">
          <AdminLayout />
        </ProtectedRoute>
      ),
      children: [
        { path: "", element: <Dashboard /> },
        { path: "dashboard", element: <Dashboard /> },
        { path: "revenue", element: <Revenue /> },
        { path: "categories", element: <CategoryList /> },
        { path: "products", element: <ProductList /> },
        { path: "brands", element: <BrandManager /> },
        { path: "tags", element: <TagManager /> },
        { path: "banners", element: <BannerList /> },
        { path: "blogs", element: <BlogList /> },
        { path: "blog-categories", element: <BlogCategoryList /> },
        { path: "coupon", element: <CouponList /> },
        { path: "deliveries", element: <DeliveryList /> },
        { path: "payment-types", element: <PaymentTypeList /> },
        { path: "orders", element: <OrderList /> },
        { path: "users", element: <UserList /> },
      ],
    },
    {
      path: "/docs",
      element: (
        <ProtectedRoute path="/docs">
          <DocsPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "",
      element: <PageLayout />,
      children: [
        {
          path: "/",
          element: (
            <PublicRoute>
              <Home />
            </PublicRoute>
          ),
        },
        {
          path: "/product",
          element: (
            <PublicRoute>
              <Products />
            </PublicRoute>
          ),
        },
        {
          path: "/detail/:id",
          element: (
            <PublicRoute>
              <DetailProduct />
            </PublicRoute>
          ),
        },
        {
          path: "/about-us",
          element: (
            <PublicRoute>
              <AboutUs />
            </PublicRoute>
          ),
        },
        {
          path: "/cart",
          element: (
            <PublicRoute>
              <Cart />
            </PublicRoute>
          ),
        },
        {
          path: "/checkout",
          element: (
            <PublicRoute>
              <Payment />
            </PublicRoute>
          ),
        },
        {
          path: "/cancel",
          element: (
            <PublicRoute>
              <CancelPage />
            </PublicRoute>
          ),
        },
        {
          path: "/success",
          element: (
            <PublicRoute>
              <SuccessPage />
            </PublicRoute>
          ),
        },
        {
          path: "/userprofile/*", // Route con cho userprofile
          element: (
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          ),
        },
        {
          path: "/search",
          element: (
            <PublicRoute>
              <Search />
            </PublicRoute>
          ),
        },
        {
          path: "/blogs",
          element: (
            <PublicRoute>
              <Blog />
            </PublicRoute>
          ),
        },
        {
          path: "/blogs/:id",
          element: (
            <PublicRoute>
              <BlogDetail />
            </PublicRoute>
          ),
        },
        { path: "*", element: <NotFound /> }, // Route 404 cho các trang con
      ],
    },
    {
      path: "*", // Route mặc định cho các đường dẫn không tồn tại
      element: <NotFound />, // Hiển thị trang 404
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
