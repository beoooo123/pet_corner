import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Typography,
  Button,
  Divider,
  notification,
} from "antd";
import {
  UserOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  StarOutlined,
  TagOutlined,
  HomeOutlined,
  PictureOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate } from "react-router-dom";
import React from "react";
import Navigation from "../navigation";
import SubMenu from "antd/es/menu/SubMenu";
import loginApi from "../../api/login";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const navigate = useNavigate();

  // Lấy thông tin user từ localStorage
  const userData = localStorage.getItem("userData");
  const user = userData ? JSON.parse(userData) : null;

  useEffect(() => {
    const updateTime = () => {
      const today = new Date();
      const weekday = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
      ];
      const day = weekday[today.getDay()];

      let dd = today.getDate().toString();
      let mm = (today.getMonth() + 1).toString();
      const yyyy = today.getFullYear();
      const h = today.getHours();
      const m = today.getMinutes().toString().padStart(2, "0");
      const s = today.getSeconds().toString().padStart(2, "0");

      if (parseInt(dd) < 10) dd = "0" + dd;
      if (parseInt(mm) < 10) mm = "0" + mm;

      const dateStr = `${day}, ${dd}/${mm}/${yyyy}`;
      const timeStr = `${h} giờ ${m} phút ${s} giây`;

      setCurrentDate(dateStr);
      setCurrentTime(timeStr);
    };

    updateTime();
    const timerId = setInterval(updateTime, 1000);
    return () => clearInterval(timerId);
  }, []);
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      console.log("Storage event:", event);
      if (event.key === "accessToken" && event.newValue === null) {
        notification.info({
          message: "Phiên đăng nhập đã hết",
          description: "Vui lòng đăng nhập lại.",
          placement: "topRight",
          duration: 2,
        });
        localStorage.clear();
        navigate("/login");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [navigate]);

  // Danh sách menu đầy đủ cho admin
  const adminMenuItems = [
    {
      key: "3",
      icon: <AppstoreOutlined />,
      label: "Quản lý danh mục",
      path: "/admin/categories",
    },
    {
      key: "14",
      icon: <PictureOutlined />,
      label: "Quản lý banner",
      path: "/admin/banners",
    },
    {
      key: "15",
      icon: <ReadOutlined />,
      label: "Tài liệu giải thích",
      path: "/docs",
    },
    {
      key: "4",
      icon: <ShoppingOutlined />,
      label: "Quản lý sản phẩm",
      path: "/admin/products",
    },
    {
      key: "7",
      icon: <StarOutlined />,
      label: "Quản lý thương hiệu",
      path: "/admin/brands",
    },
    {
      key: "8",
      icon: <TagOutlined />,
      label: "Quản lý tags",
      path: "/admin/tags",
    },
    {
      key: "12",
      icon: <UserOutlined />,
      label: "Quản lý người dùng",
      path: "/admin/users",
    },
  ];

  // Danh sách menu cho employee (loại bỏ các menu nhạy cảm)
  const employeeMenuItems = adminMenuItems.filter((item) =>
    ["1", "9", "3", "4", "5", "6", "7", "10", "14", "15", "16", "17"].includes(item.key)
  );

  // Chọn danh sách menu dựa trên vai trò
  const menuItems = user?.role === "admin" ? adminMenuItems : employeeMenuItems;

  const handleMenuClick = (e) => {
    const selectedMenu = menuItems.find((item) => item.key === e.key);
    if (selectedMenu) {
      navigate(selectedMenu.path);
    }
  };

  const handleLogout = async () => {
    try {
      await loginApi.logout();
      localStorage.setItem("logoutEvent", Date.now().toString());
      localStorage.clear();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // quay lại trang web user
  const handleBackToUserSite = () => {
    navigate("/");
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="bg-white shadow-md fixed top-0 left-0 h-screen z-10"
        style={{
          overflow: "auto", // Allow scrolling within the sidebar if content overflows
        }}
      >
        <div className="p-4 flex items-center space-x-2">
          <Avatar
            size={40}
            src={user?.avatar || "https://via.placeholder.com/40"}
          />
          {!collapsed && (
            <div>
              <Text strong className="block">
                {user?.role === "admin" ? "Quản lý" : "Nhân viên"}
              </Text>
              <Text className="text-xs text-gray-500">
                Chào mừng bạn trở lại
              </Text>
            </div>
          )}
        </div>
        <Divider className="my-1" />
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={["1"]}
          onClick={handleMenuClick}
          className="border-r-0"
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 80 : 200, // Adjust margin based on collapsed state
          transition: "margin-left 0.2s", // Smooth transition when collapsing/expanding
        }}
      >
        <Header className="bg-white px-4 flex items-center shadow-sm fixed top-0 w-full z-9">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg mr-96"
          />
          <div className="flex items-center justify-center flex-1">
            <Button
              className="mr-24"
              type="text"
              icon={<HomeOutlined />}
              onClick={handleBackToUserSite}
            >
              Quay lại trang web
            </Button>
            <div className="text-sm mr-24">
              <span>
                {currentDate} - {currentTime}
              </span>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            />
          </div>
        </Header>
        <Content
          className="p-6 bg-gray-50"
          style={{
            marginTop: 64, // Offset for the fixed header
            minHeight: "calc(100vh - 64px)", // Ensure content takes up remaining height
            overflowY: "auto", // Allow scrolling in the content area
          }}
        >
          <Navigation />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
