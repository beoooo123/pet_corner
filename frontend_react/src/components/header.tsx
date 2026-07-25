import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Input,
  Dropdown,
  Menu,
  Space,
  Typography,
  Badge,
  Avatar,
  Drawer,
  Button,
} from "antd";
import {
  FaTruck,
  FaGift,
  FaCheckCircle,
  FaShoppingCart,
  FaPhoneAlt,
  FaSearch,
  FaBars,
  FaAngleDown,
  FaTimes,
} from "react-icons/fa";
import { BsGeoAltFill } from "react-icons/bs";
import { Search } from "lucide-react";
import { useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { SearchContext } from "./searchContext";
import { setUserId } from "../redux/slices/cartslice";
import productsApi from "../api/productsApi";
import { UserOutlined } from "@ant-design/icons";
import loginApi from "../api/login";
import ENV_VARS from "../../config";
import clearLocalStorageExceptCarts from "../config/clearLocalStorage";

interface Product {
  _id: string;
  name: string;
  image_url: string;
  price: string;
}

interface User {
  fullname: string;
  avatar?: string;
  role: string;
}

export default function Header() {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: any) => state.cart.items);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const cartCount = cartItems.reduce(
    (count: any, item: any) => count + Number(item.quantity),
    0
  );
  const [open, setOpen] = useState(false);
  const [searchMobileOpen, setSearchMobileOpen] = useState(false);
  const [searchDesktopOpen, setSearchDesktopOpen] = useState(false);
  const [subMenu, setSubMenu] = useState(false);
  const { keyword, setKeyword } = useContext(SearchContext);
  const [user, setUser] = useState<User | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const navigate = useNavigate();

  const showDrawer = () => setOpen(true);
  const onClose = () => {
    setOpen(false);
    setSubMenu(false);
  };

  const showSearchMobile = () => setSearchMobileOpen(true);
  const closeSearchMobile = () => setSearchMobileOpen(false);

  const showSearchDesktop = () => setSearchDesktopOpen(true);
  const closeSearchDesktop = () => setSearchDesktopOpen(false);

  useEffect(() => {
    const storedHistory = localStorage.getItem("searchHistory");
    console.log("Loaded searchHistory from localStorage on mount:", storedHistory);
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory);
        } else {
          console.error("Invalid searchHistory format in localStorage");
          setSearchHistory([]);
        }
      } catch (error) {
        console.error("Error parsing searchHistory from localStorage:", error);
        setSearchHistory([]);
      }
    }
  }, []);

  const saveSearchHistory = (history: string[]) => {
    console.log("Saving searchHistory to localStorage:", history);
    localStorage.setItem("searchHistory", JSON.stringify(history));
  };

  const handleSearch = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue && !searchHistory.includes(trimmedValue)) {
      const newHistory = [trimmedValue, ...searchHistory].slice(0, 5);
      setSearchHistory(newHistory);
      saveSearchHistory(newHistory);
    }
  };

  const handleSearchSubmit = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      handleSearch(trimmedValue);
      setKeyword(trimmedValue);
      navigate(`/search?q=${encodeURIComponent(trimmedValue)}`);
      setSearchDesktopOpen(false);
      setSearchMobileOpen(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    if (value.trim()) {
      fetchSearchResults(value);
    } else {
      setSearchResults([]);
    }
  };

  const clearSearchHistory = () => {
    console.log("Clearing searchHistory");
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  const removeDiacritics = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  const fetchSearchResults = async (searchTerm: string) => {
    try {
      const response = await productsApi.getProductActive();
      const data = await response.data.result;
      console.log("Dữ liệu từ API:", data);

      const normalizedSearchTerm = removeDiacritics(searchTerm.toLowerCase());
      const filteredProducts = data.filter((product: Product) => {
        const normalizedProductName = removeDiacritics(
          product.name.toLowerCase()
        );
        return normalizedProductName.includes(normalizedSearchTerm);
      });

      console.log("Sản phẩm sau lọc:", filteredProducts);
      setSearchResults(filteredProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const accountID =
      localStorage.getItem("accountID")?.replace(/^"|"$/g, "") || "";

    if (!token || !accountID) {
      setIsUserLoaded(false);
      setUser(null);
      return;
    }

    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        console.log("User data in header.js:", parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Lỗi khi parse userData từ localStorage:", error);
      }
    }

    fetch(`${ENV_VARS.VITE_API_URL}/v1/users/${accountID}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to fetch user data: ${res.status} ${res.statusText}`
          );
        }
        return res.json();
      })
      .then((data) => {
        if (data.data) {
          setUser(data.data);
          localStorage.setItem("userData", JSON.stringify(data.data));
          dispatch(setUserId(accountID));
          setIsUserLoaded(true);
        }
      })
      .catch((err) => {
        console.error("Error fetching user:", err.message);
        setIsUserLoaded(false);
        if (err.message.includes("401")) {
          console.warn("Token có thể đã hết hạn, cần đăng nhập lại");
          clearLocalStorageExceptCarts();
          setUser(null);
          dispatch(setUserId(null));
          navigate("/login");
        }
      });
  }, [dispatch, navigate]);

  const handleLogout = async () => {
    try {
      await loginApi.logout();
      localStorage.setItem("logoutEvent", Date.now().toString());
      localStorage.clear();
      setUser(null);
      dispatch(setUserId(null));
      setIsUserLoaded(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const userMenu = (
    <Menu>
      {(user?.role === "admin" || user?.role === "employee") && (
        <Menu.Item key="1">
          <a href="/admin">
            <i className="fas fa-cog mr-2"></i>Quản lý website
          </a>
        </Menu.Item>
      )}
      <Menu.Item key="2">
        <a href={`/userprofile/account`}>
          <i className="fas fa-user mr-2"></i>Tài khoản
        </a>
      </Menu.Item>
      <Menu.Item key="3" onClick={handleLogout}>
        <a href="#">
          <i className="fas fa-sign-out-alt mr-2"></i>Đăng xuất
        </a>
      </Menu.Item>
    </Menu>
  );

  const searchDesktop = (
    <div
      className="w-[100%] bg-white shadow-lg rounded-lg border border-gray-200"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 1000,
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      <div className="p-4">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">TÌM KIẾM GẦN ĐÂY</h3>
            <Button
              type="link"
              icon={<FaTimes />}
              onClick={clearSearchHistory}
              className="text-red-500"
            >
              Xóa lịch sử
            </Button>
          </div>
          {searchHistory.length > 0 ? (
            <Space wrap className="mb-2">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  className="rounded-full bg-gray-100 px-4 py-2 hover:bg-gray-200"
                  onClick={() => handleSearchSubmit(item)} // Sửa để gọi handleSearchSubmit
                >
                  {item}
                </button>
              ))}
            </Space>
          ) : (
            <p className="text-gray-500">Không có lịch sử tìm kiếm.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-lg font-bold">KẾT QUẢ TÌM KIẾM</h3>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
              {searchResults.map((product) => (
                <div
                  key={product._id}
                  className="rounded bg-gray-50 p-4 shadow-md cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    console.log("Navigating to:", `/detail/${product._id}`);
                    navigate(`/detail/${product._id}`);
                    setSearchDesktopOpen(false);
                  }}
                >
                  <img
                    src={`${product.image_url[0]}`}
                    alt={product.name}
                    className="w-full h-32 object-cover mb-2"
                  />
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-[#22A6DF] font-bold">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(Number(product.price))}
                  </p>
                </div>
              ))}
            </div>
          ) : keyword.trim() ? (
            <p className="text-gray-500">Không tìm thấy sản phẩm nào.</p>
          ) : (
            <p className="text-gray-500">Nhập từ khóa để tìm kiếm.</p>
          )}
        </div>
      </div>
    </div>
  );

  const searchMobile = (
    <div className="p-4">
      <Input.Search
        placeholder="Tìm kiếm..."
        size="large"
        className="mb-4"
        onSearch={handleSearchSubmit}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">TÌM KIẾM GẦN ĐÂY</h3>
          <Button
            type="link"
            icon={<FaTimes />}
            onClick={clearSearchHistory}
            className="text-red-500"
          >
            Xóa lịch sử
          </Button>
        </div>
        {searchHistory.length > 0 ? (
          <Space wrap className="mb-2">
            {searchHistory.map((item, index) => (
              <button
                key={index}
                className="rounded-full bg-gray-100 px-4 py-2 hover:bg-gray-200"
                onClick={() => handleSearchSubmit(item)} // Sửa để gọi handleSearchSubmit
              >
                {item}
              </button>
            ))}
          </Space>
        ) : (
          <p className="text-gray-500">Không có lịch sử tìm kiếm.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-lg font-bold">KẾT QUẢ TÌM KIẾM</h3>
        {searchResults.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {searchResults.map((product) => (
              <div
                key={product._id}
                className="rounded bg-gray-50 p-4 cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  console.log("Navigating to:", `/detail/${product._id}`);
                  navigate(`/detail/${product._id}`);
                  setSearchMobileOpen(false);
                }}
              >
                <img
                  src={`${product.image_url[0]}`}
                  alt={product.name}
                  className="w-full h-32 object-cover mb-2"
                />
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-[#22A6DF] font-bold">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(Number(product.price))}
                </p>
              </div>
            ))}
          </div>
        ) : keyword.trim() ? (
          <p className="text-gray-500">Không tìm thấy sản phẩm nào.</p>
        ) : (
          <p className="text-gray-500">Nhập từ khóa để tìm kiếm.</p>
        )}
      </div>
    </div>
  );

  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { path: "/", label: "Trang chủ" },
    { path: "/product", label: "Sản phẩm" },
    { path: "/info", label: "Dịch vụ thú cưng" },
    { path: "/blogs", label: "Bài viết" },
    { path: "/about-us", label: "Giới thiệu" },
    { path: "/contact", label: "Liên hệ" },
  ];

  return (
    <>
      <header className="w-full">
        <div className="flex h-[34px] items-center justify-center bg-[#22A6DF] px-4 text-[10px] text-white sm:h-[34px] sm:px-[40px] sm:text-xs lg:px-[154px] lg:text-sm">
          <div className="flex items-center gap-1 text-xs sm:text-xs">
            <div className="flex items-center rounded-xl bg-black px-2 py-1 font-semibold">
              %15 Off
            </div>{" "}
            khi mua tại cửa hàng
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 sm:px-[40px] sm:py-4 lg:px-[154px]">
          <a href="/">
            <img
              src="/images/logo.jpg"
              alt="PetHeaven Logo"
              className="h-[40px] w-auto sm:h-[60px] lg:h-[100px]"
            />
          </a>

          <Dropdown
            overlay={searchDesktop}
            trigger={["click"]}
            open={searchDesktopOpen}
            onOpenChange={setSearchDesktopOpen}
            placement="bottomLeft"
            overlayClassName="search-dropdown"
          >
            <Input.Search
              placeholder="Tìm kiếm..."
              enterButton={
                <button
                  style={{
                    backgroundColor: "#22A6DF",
                    borderColor: "#22A6DF",
                    height: "32px",
                    width: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopRightRadius: "8px",
                    borderBottomRightRadius: "8px",
                  }}
                  onClick={showSearchDesktop}
                >
                  <FaSearch className="text-white" />
                </button>
              }
              className="custom-search hidden w-1/3 rounded-full md:flex"
              onSearch={handleSearchSubmit}
              value={keyword}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </Dropdown>

          <Space size={50} className="hidden xl:flex">
            <div className="flex flex-col items-center">
              <FaGift className="text-2xl text-[#22A6DF]" />
              <span>Miễn phí vận chuyển</span>
              <span className="text-xs text-gray-500">
                Cho đơn từ 200.000đ
              </span>
            </div>
            <div className="flex flex-col items-center">
              <FaCheckCircle className="text-2xl text-[#22A6DF]" />
              <span>Cam kết chất lượng</span>
              <span className="text-xs text-gray-500">Đổi trả trong 30 ngày</span>
            </div>
            <a href="/cart">
              <Badge count={cartCount}>
                <FaShoppingCart className="text-2xl" />
              </Badge>
            </a>
            {user ? (
              <Dropdown overlay={userMenu} trigger={["hover"]}>
                <div className="flex items-center cursor-pointer">
                  <Avatar
                    src={user.avatar ? `${user.avatar}` : undefined}
                    icon={!user.avatar && <UserOutlined />}
                    className="bg-[#22A6DF]"
                  />
                  <FaAngleDown className="ml-1 text-[#22A6DF]" />
                </div>
              </Dropdown>
            ) : (
              <a href="/login">
                <Avatar icon={<UserOutlined />} className="bg-[#22A6DF]" />
              </a>
            )}
          </Space>

          <Space size={50} className="flex items-center xl:hidden">
            <button
              className="rounded-full p-2 hover:bg-gray-100 md:hidden"
              onClick={showSearchMobile}
            >
              <Search className="h-6 w-6" />
            </button>
            <a href="/cart">
              <Badge count={cartCount}>
                <FaShoppingCart className="text-2xl" />
              </Badge>
            </a>
            {user ? (
              <Dropdown overlay={userMenu} trigger={["hover"]}>
                <div className="flex items-center cursor-pointer">
                  <Avatar
                    src={user.avatar ? `${user.avatar}` : undefined}
                    icon={!user.avatar && <UserOutlined />}
                    className="bg-[#22A6DF]"
                  />
                  <FaAngleDown className="ml-1 text-[#22A6DF]" />
                </div>
              </Dropdown>
            ) : (
              <a href="/login">
                <Avatar icon={<UserOutlined />} className="bg-[#22A6DF]" />
              </a>
            )}
          </Space>
        </div>

        <nav className="flex items-center justify-between bg-white px-4 text-black sm:px-[40px] lg:px-[154px]">
          <Space className="hidden items-center justify-between py-3 md:flex md:gap-[20px] lg:gap-[27px] xl:gap-[50px]">
            {menuItems.map((item) => (
              <a key={item.path} href={item.path} className="group relative">
                <Typography.Text
                  className={`text-sm font-bold transition-colors duration-300 lg:text-sm xl:text-lg relative z-10 ${currentPath === item.path
                      ? "text-[#22A6DF]"
                      : "text-black group-hover:text-[#22A6DF]"
                    }`}
                >
                  {item.label}
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] bg-[#22A6DF] transition-all duration-300 ${currentPath === item.path
                        ? "w-full"
                        : "w-0 group-hover:w-full"
                      }`}
                  ></span>
                </Typography.Text>
              </a>
            ))}
          </Space>

          <FaBars className="cursor-pointer md:hidden" onClick={showDrawer} />

          <Space className="whitespace-nowrap text-sm font-bold sm:text-xs lg:text-sm xl:text-base">
            <FaPhoneAlt className="mr-1" />
            24/7 Hỗ trợ: <span className="ml-1 text-[#22A6DF]">0853665735</span>
          </Space>
        </nav>

        <hr className="mt-[5px] border-dashed border-gray-300" />
      </header>

      <Drawer
        title="Tìm Kiếm"
        placement="top"
        onClose={closeSearchMobile}
        open={searchMobileOpen}
        height={700}
      >
        {searchMobile}
      </Drawer>

      <Drawer
        title={subMenu ? "Sản phẩm" : "Menu"}
        placement="left"
        onClose={onClose}
        open={open}
        width={300}
      >
        <Menu
          mode="vertical"
          items={[
            { key: "home", label: <a href="/">Trang chủ</a> },
            { key: "products", label: <a href="/product">Sản phẩm</a> },
            { key: "services", label: <a href="/info">Dịch vụ thú cưng</a> },
            { key: "blogs", label: <a href="/blogs">Bài viết</a> },
            { key: "about", label: <a href="/about-us">Giới thiệu</a> },
            { key: "contact", label: <a href="/contact">Liên hệ</a> },
          ]}
        />
      </Drawer>
    </>
  );
}