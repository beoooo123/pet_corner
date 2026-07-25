import React, { useState } from "react";
import { FaCheckDouble } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  GoogleOAuthProvider,
  GoogleLogin,
  GoogleCredentialResponse,
} from "@react-oauth/google";
import { Button, Row, Col, Typography, Input, Flex, notification } from "antd";
import "antd/dist/reset.css";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom"; // Thêm useNavigate
import signupApi from "../../api/signupApi"; // Điều chỉnh đường dẫn
import ENV_VARS from "../../../config";

const { Title, Text } = Typography;

interface FormData {
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface User {
  id: string;
  email: string;
  fullname: string;
  avatar?: string;
  role: string;
  status: string;
}

export default function SignUp() {
  const [formData, setFormData] = useState<FormData>({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate(); // Thêm navigate

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      notification.warning({
        message: "Lỗi xác nhận mật khẩu!",
        description: "Mật khẩu xác nhận không khớp!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (
      !formData.fullname.trim() &&
      !formData.email.trim() &&
      !formData.password.trim() &&
      !formData.confirmPassword.trim()
    ) {
      notification.warning({
        message: "Lỗi!",
        description: "Các thông tin không được để trống !",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (!formData.fullname.trim()) {
      notification.warning({
        message: "Lỗi!",
        description: "Họ và tên không được để trống!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (!formData.email.trim()) {
      notification.warning({
        message: "Lỗi!",
        description: "Email không được để trống!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (!formData.password.trim()) {
      notification.warning({
        message: "Lỗi!",
        description: "Mật khẩu không được để trống!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      notification.warning({
        message: "Lỗi!",
        description: "Vui lòng nhập email hợp lệ!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }

    if (formData.password.length < 6) {
      notification.warning({
        message: "Lỗi!",
        description: "Mật khẩu phải có ít nhất 6 ký tự!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await signupApi.signup({
        fullname: formData.fullname,
        email: formData.email,
        password: formData.password,
      }); // Thay fetch bằng signupApi.signup

      console.log("Response:", data); // Giữ nguyên console.log

      if (!data.success) {
        // Kiểm tra success thay vì response.ok
        throw new Error(data.message || "Đăng ký thất bại!");
      }

      notification.success({
        message: "Đăng ký thành công!",
        description: "Tài khoản của bạn đã được tạo thành công!",
        placement: "topRight",
        duration: 2,
        onClose: () => {
          setFormData({
            fullname: "",
            email: "",
            password: "",
            confirmPassword: "",
          });
          setTimeout(() => {
            navigate("/verify-otp", { state: { email: formData.email } }); // Dùng navigate thay window.location.href
          }, 2000);
        },
      });
    } catch (error) {
      console.error("Lỗi:", error); // Giữ nguyên console.log
      notification.error({
        message: "Đăng ký thất bại!",
        description: `Đã xảy ra lỗi: ${error.message}`,
        placement: "topRight",
        duration: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = (credentialResponse: GoogleCredentialResponse) => {
    const idToken = credentialResponse.credential;
    console.log("Sending idToken to backend:", idToken); // Giữ nguyên console.log
    signupApi
      .googleSignup(idToken) // Thay fetch bằng signupApi.googleSignup
      .then((response) => {
        const data = response.data; // Lấy data từ response
        console.log("Response status:", response.status); // Không có res.status trực tiếp, giữ log này để tương thích với ý định gốc
        console.log("Response headers:", response.headers); // Không có res.headers trực tiếp, giữ log này để tương thích với ý định gốc

        if (!data.success) {
          console.error("Login failed:", data.message); // Giữ nguyên console.log
          notification.error({
            message: "Đăng nhập thất bại!",
            description:
              data.message || "Có lỗi xảy ra khi đăng nhập bằng Google.",
            placement: "topRight",
            duration: 2,
          });
          return;
        }

        setUser({
          id: data.user.id,
          email: data.user.email,
          fullname: data.user.fullname,
          avatar: data.user.avatar,
          role: data.user.role,
          status: data.user.status,
        });
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("accountID", data.user.id);
        notification.success({
          message: "Đăng ký/Đăng nhập bằng Google thành công!",
          description: "Chào mừng bạn quay trở lại!",
          placement: "topRight",
          duration: 2,
          onClose: () => {
            setTimeout(() => {
              if (data.user.role === "admin") {
                navigate("/admin"); // Dùng navigate thay window.location.href
              } else {
                navigate("/"); // Dùng navigate thay window.location.href
              }
            }, 2000);
          },
        });
        setFormData({
          fullname: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      })
      .catch((err) => {
        console.error("Error:", err); // Giữ nguyên console.log
        notification.error({
          message: "Lỗi!",
          description: err.message || "Có lỗi xảy ra khi kết nối với Google.",
          placement: "topRight",
          duration: 2,
        });
      });
  };

  return (
    <div className="px-2 py-4 sm:px-5 sm:py-6">
      {/* Title */}
      <div className="mx-auto pb-4 text-center sm:pb-7">
        <Title level={4} className="text-xl sm:text-2xl">
          Đăng Ký
        </Title>
        <Flex justify="center" className="gap-1 sm:gap-2">
          <span
            onMouseEnter={(e) => {
              e.currentTarget.style.cursor = "pointer";
            }}
            onClick={() => navigate("/")} // Dùng navigate thay window.location.href
            className="text-sm sm:text-base"
          >
            Trang chủ
          </span>
          <span className="px-1 sm:px-2">/</span>
          <span className="text-base sm:text-lg">Đăng ký</span>
        </Flex>
      </div>

      <Row
        justify="center"
        className="mx-auto w-full max-w-[830px] flex-col gap-4 px-2 sm:gap-7 sm:px-0 lg:flex-row"
      >
        {/* Left */}
        <Col className="flex w-full flex-col justify-between gap-4 sm:gap-0 lg:w-[400px]">
          <div className="h-[200px] sm:h-1/2">
            <img
              src="/images/dog&cat.png"
              alt="Login form"
              className="h-full w-full bg-[#EAEAEA] object-cover"
            />
          </div>
          <div className="h-auto bg-[#EAEAEA] p-3 text-xs sm:h-1/2 sm:p-4 sm:text-sm">
            <Title level={5} className="text-sm sm:text-base">
              Quyền lợi thành viên
            </Title>
            <ul className="list-disc space-y-2 pl-4 sm:space-y-4">
              {[
                "Mua hàng nhanh chóng, dễ dàng",
                "Theo dõi đơn hàng, địa chỉ thanh toán dễ dàng",
                "Nhận nhiều ưu đãi",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-2">
                  <FaCheckDouble className="h-3 w-3 text-[#22A6DF] sm:h-4 sm:w-4" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Col>
        {/* Right */}
        <Col className="flex w-full flex-col justify-between shadow-inner lg:w-[400px] overflow-auto">
          <div>
            <div className="mb-3 flex h-10 sm:h-12">
              <button
                onClick={() => navigate("/login")} // Dùng navigate thay window.location.href
                className="h-full w-1/2 border border-[#686868] text-sm hover:border-[#22A6DF] hover:text-[#22A6DF] sm:text-base"
              >
                Đăng Nhập
              </button>
              <button className="h-full w-1/2 border-[#22A6DF] bg-[#22A6DF] text-sm text-white sm:text-base">
                Đăng ký
              </button>
            </div>

            <div className="p-3 sm:p-5">
              {["fullname", "email", "password", "confirmPassword"].map(
                (field, index) => (
                  <div key={index} className="mb-2 pb-2 text-sm sm:text-base">
                    <label htmlFor={field} className="font-bold uppercase">
                      {field === "fullname"
                        ? "Họ và Tên"
                        : field === "email"
                        ? "Email"
                        : field === "password"
                        ? "Mật khẩu"
                        : "Xác nhận mật khẩu"}{" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type={
                        field === "password" || field === "confirmPassword"
                          ? showPassword && field === "password"
                            ? "text"
                            : showConfirmPassword && field === "confirmPassword"
                            ? "text"
                            : "password"
                          : "text"
                      }
                      id={field}
                      placeholder={`Nhập ${
                        field === "fullname" ? "họ và tên" : field
                      }`}
                      value={formData[field as keyof typeof formData]}
                      onChange={handleChange}
                      className="mt-2 h-9 text-sm sm:h-10 sm:text-base"
                      suffix={
                        (field === "password" ||
                          field === "confirmPassword") && (
                          <span
                            onClick={() => {
                              if (field === "password") {
                                setShowPassword(!showPassword);
                              } else {
                                setShowConfirmPassword(!showConfirmPassword);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {field === "password" ? (
                              showPassword ? (
                                <EyeOutlined />
                              ) : (
                                <EyeInvisibleOutlined />
                              )
                            ) : showConfirmPassword ? (
                              <EyeOutlined />
                            ) : (
                              <EyeInvisibleOutlined />
                            )}
                          </span>
                        )
                      }
                    />
                  </div>
                )
              )}
            </div>

            <div className="flex flex-col items-center px-3 sm:px-5">
              <Flex
                justify="space-between"
                className="mb-2 w-full items-center"
              >
                <button
                  onClick={handleSubmit}
                  className="h-9 w-[46%] rounded-md bg-black text-xs text-white hover:bg-[#22A6DF] sm:h-10 sm:text-sm"
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                </button>
                <span className="my-auto px-1 text-sm sm:text-base">Hoặc</span>
                <GoogleOAuthProvider clientId={ENV_VARS.VITE_GOOGLE_CLIENT_ID}>
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    size="medium"
                    width={36}
                    type="standard"
                    onError={() => {
                      notification.error({
                        message: "Đăng nhập thất bại!",
                        description: "Có lỗi xảy ra khi đăng nhập bằng Google.",
                        placement: "topRight",
                        duration: 2,
                      });
                    }}
                  />
                </GoogleOAuthProvider>
              </Flex>
            </div>

            <div className="px-3 pt-3 text-center sm:px-5 sm:pt-5">
              <Text type="secondary" className="text-[10px] sm:text-xs">
                Pet Heaven cam kết bảo mật thông tin khách hàng.
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
