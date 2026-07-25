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
import VerifyOtp from "./pages/verifyOTP/verifyOTP";
import Search from "./pages/search/search";
import NotFound from "./pages/404/404"; // Import trang 404

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
        { path: "", element: <CategoryList /> },
        { path: "categories", element: <CategoryList /> },
        { path: "products", element: <ProductList /> },
        { path: "brands", element: <BrandManager /> },
        { path: "tags", element: <TagManager /> },
        { path: "banners", element: <BannerList /> },
        { path: "users", element: <UserList /> },
      ],
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
