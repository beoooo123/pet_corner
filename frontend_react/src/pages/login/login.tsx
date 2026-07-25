import React, { useState, useEffect } from "react";

declare global {
  interface Window {
    google: any;
  }
}
import { useNavigate } from "react-router-dom";
import { FaCheckDouble } from "react-icons/fa6";
import {
  GoogleOAuthProvider,
  GoogleLogin,
  GoogleCredentialResponse,
} from "@react-oauth/google";
import {
  Button,
  Row,
  Col,
  Typography,
  Input,
  Flex,
  notification,
  Modal,
} from "antd";
import "antd/dist/reset.css";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import loginApi from "../../api/login";
import ENV_VARS from "../../../config";
import clearLocalStorageExceptCarts from "../../config/clearLocalStorage";
const { Title, Text } = Typography;

interface User {
  id: string;
  email: string;
  fullname: string;
  avatar?: string;
  role: string;
  status: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] =
    useState(false);
  const [isSending, setIsSending] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Check role & status
  useEffect(() => {
    const userData = localStorage.getItem("userData");
    const token = localStorage.getItem("accessToken");
    if (userData && token) {
      const parsedUser = JSON.parse(userData) as User;
      loginApi
        .authCheck(token)
        .then((response) => {
          if (response.data.success) {
            setUser(parsedUser);
            if (parsedUser.status !== "active") {
              notification.error({
                message: "Truy cập bị từ chối!",
                description: "Tài khoản của bạn không hoạt động.",
                placement: "topRight",
                duration: 2,
              });
              clearLocalStorageExceptCarts();
              setUser(null);
              navigate("/login");
            } else {
              navigate("/");
            }
          } else {
            clearLocalStorageExceptCarts();
            setUser(null);
            navigate("/login");
          }
        })
        .catch(() => {
          clearLocalStorageExceptCarts();
          setUser(null);
          navigate("/login");
        });
    } else {
      // localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!email.trim() && !password.trim()) {
      notification.error({
        message: "Lỗi!",
        description: "Các thông tin không được bỏ trống!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (!email.trim()) {
      notification.error({
        message: "Lỗi!",
        description: "Email không được bỏ trống!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (!password.trim()) {
      notification.error({
        message: "Lỗi!",
        description: "Mật khẩu không được bỏ trống!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      notification.warning({
        message: "Lỗi!",
        description: "Vui lòng nhập email hợp lệ!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await loginApi.login({ email, password });

      if (data.success) {
        const { userData, accessToken } = data;
        setUser(userData);
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("accountID", JSON.stringify(userData._id));
        localStorage.setItem("userData", JSON.stringify(userData));

        notification.success({
          message: "Đăng nhập thành công!",
          description: "Chào mừng bạn quay trở lại!",
          placement: "topRight",
          duration: 1.5,
          onClose: () => {
            // Luôn chuyển hướng đến trang chính (/)
            navigate("/");
          },
        });
      } else {
        throw new Error(data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      const errorMessage =
        error.message || "Có lỗi xảy ra trong quá trình đăng nhập.";
      if (errorMessage.includes("Vui lòng xác thực email bằng OTP")) {
        notification.warning({
          message: "Chưa xác thực tài khoản!",
          description:
            "Vui lòng kiểm tra email để nhập OTP xác thực trước khi đăng nhập.",
          placement: "topRight",
          duration: 3,
          onClose: () => {
            navigate("/verify-otp", { state: { email } });
          },
        });
      } else {
        notification.error({
          message: "Lỗi!",
          description: errorMessage,
          placement: "topRight",
          duration: 2,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      notification.warning({
        message: "Vui lòng nhập email!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    setIsSending(true);
    try {
      const { data } = await loginApi.forgotPassword(forgotEmail);
      if (data.success) {
        notification.success({
          message: "Kiểm tra email!",
          description: "Hãy kiểm tra hộp thư của bạn để đặt lại mật khẩu.",
          placement: "topRight",
          duration: 2,
        });
        setIsForgotPasswordModalOpen(false);
        setIsResetPasswordModalOpen(true);
      } else {
        throw new Error(data.message || "Không thể gửi yêu cầu!");
      }
    } catch (error) {
      notification.error({
        message: "Lỗi!",
        description: "Email không tồn tại!",
        placement: "topRight",
        duration: 2,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword) {
      notification.warning({
        message: "Vui lòng nhập mã xác nhận và mật khẩu mới!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }
    if (newPassword.length < 6) {
      notification.warning({
        message: "Lỗi!",
        description: "Mật khẩu phải có ít nhất 6 ký tự!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }

    setIsSending(true);
    try {
      const { data } = await loginApi.resetPassword({
        resetToken,
        newPassword,
      });
      if (data.success) {
        notification.success({
          message: "Mật khẩu đã được đặt lại thành công!",
          placement: "topRight",
          duration: 2,
        });
        setIsResetPasswordModalOpen(false);
        setForgotEmail("");
        setResetToken("");
        setNewPassword("");
      } else {
        throw new Error(data.message || "Không thể đặt lại mật khẩu!");
      }
    } catch (error) {
      notification.error({
        message: "Lỗi!",
        description: error.message,
        placement: "topRight",
        duration: 2,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleGoogleLogin = (credentialResponse: GoogleCredentialResponse) => {
    const idToken = credentialResponse.credential;
    loginApi
      .googleLogin(idToken)
      .then((response) => {
        const data = response.data;
        if (!data.success) {
          return Promise.reject(
            new Error(`Server error: ${data.message || "Unknown error"}`)
          );
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
        localStorage.setItem("userData", JSON.stringify(data.user));
        notification.success({
          message: "Đăng nhập bằng Google thành công!",
          description: "Chào mừng bạn quay trở lại!",
          placement: "topRight",
          duration: 2,
          onClose: () => {
            // Luôn chuyển hướng đến trang chính (/)
            navigate("/");
          },
        });
      })
      .catch((err) => {
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
          Đăng Nhập
        </Title>
        <Flex justify="center" className="gap-1 sm:gap-2">
          <span
            onMouseEnter={(e) => {
              e.currentTarget.style.cursor = "pointer";
            }}
            onClick={() => navigate("/")} // Thay window.location.href
            className="text-sm sm:text-base"
          >
            Trang chủ
          </span>
          <span className="px-1 sm:px-2">/</span>
          <span className="text-base sm:text-lg"> Đăng nhập</span>
        </Flex>
      </div>

      <Row
        justify="center"
        className="mx-auto min-h-[450px] w-full max-w-[830px] flex-col gap-4 overflow-hidden px-2 sm:gap-7 sm:px-0 lg:flex-row"
      >
        {/* Left */}
        <Col className="flex w-full flex-col justify-between gap-4 sm:gap-0 lg:w-[400px]">
          <div className="h-[200px] sm:h-1/2">
            <img
              src="/images/cat&dog.png"
              alt="Login form"
              className="h-full w-full bg-[#EAEAEA] object-cover"
            />
          </div>
          <div className="h-auto bg-[#EAEAEA] p-3 text-xs sm:h-1/2 sm:p-4 sm:text-sm">
            <Title level={5} className="text-sm sm:text-base">
              Quyền lợi thành viên
            </Title>
            <ul className="list-disc space-y-2 pl-4 sm:space-y-4">
              <li className="flex items-center gap-2">
                <FaCheckDouble className="h-3 w-3 shrink-0 text-[#22A6DF] sm:h-4 sm:w-4" />
                <span>Mua hàng nhanh chóng, dễ dàng</span>
              </li>
              <li className="flex items-center gap-2">
                <FaCheckDouble className="h-3 w-3 shrink-0 text-[#22A6DF] sm:h-4 sm:w-4" />
                <span>
                  Theo dõi chi tiết đơn hàng, địa chỉ thanh toán dễ dàng
                </span>
              </li>
              <li className="flex items-center gap-2">
                <FaCheckDouble className="h-3 w-3 shrink-0 text-[#22A6DF] sm:h-4 sm:w-4" />
                <span>Nhận nhiều chương trình ưu đãi từ chúng tôi</span>
              </li>
            </ul>
          </div>
        </Col>

        {/* Right */}
        <Col className="flex w-full flex-col justify-start shadow-inner lg:w-[400px] overflow-auto">
          <div>
            <div className="mb-3 flex h-10 sm:h-12">
              <button className="h-full w-1/2 rounded-none border-[#22A6DF] bg-[#22A6DF] text-sm text-white sm:text-base">
                Đăng Nhập
              </button>
              <button
                onClick={() => navigate("/signup")} // Thay window.location.href
                className="h-full w-1/2 rounded-none border border-[#686868] text-sm hover:border-[#22A6DF] hover:text-[#22A6DF] sm:text-base"
              >
                Đăng Ký
              </button>
            </div>
            <div className="p-3 sm:p-4">
              <div className="mb-2 pb-2 text-sm sm:text-base">
                <label htmlFor="email" className="font-bold uppercase">
                  Email <span className="text-red-600">*</span>
                </label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Nhập email của bạn"
                  className="mt-2 h-9 text-sm sm:h-10 sm:text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mb-2 pb-2 text-sm sm:text-base">
                <label htmlFor="password" className="font-bold uppercase">
                  Mật khẩu <span className="text-red-600">*</span>
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Nhập mật khẩu của bạn"
                  className="mt-2 h-9 text-sm sm:h-10 sm:text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  suffix={
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ cursor: "pointer" }}
                    >
                      {showPassword ? (
                        <EyeOutlined />
                      ) : (
                        <EyeInvisibleOutlined />
                      )}
                    </span>
                  }
                />
              </div>
              <div className="mb-3">
                <a
                  className="cursor-pointer text-sm sm:text-base"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                >
                  Quên mật khẩu?
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center px-2 sm:px-4 mb-4">
            <Flex
              justify="space-between"
              className="w-full max-w-[380px] items-center"
            >
              <Button
                type="primary"
                size="large"
                className="h-9 w-[46%] rounded-md bg-black text-xs text-white hover:bg-[#22A6DF] sm:h-10 sm:text-sm"
                onClick={handleLogin}
                loading={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
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

          <div className="px-3 pt-2 text-center sm:px-4 sm:pt-4">
            <Text type="secondary" className="text-[10px] sm:text-xs">
              Pet Heaven cam kết bảo mật và sẽ không tiết lộ thông tin khách
              hàng khi không có sự cho phép.
            </Text>
          </div>
        </Col>
      </Row>

      <Modal
        title="Quên Mật Khẩu"
        open={isForgotPasswordModalOpen}
        onCancel={() => setIsForgotPasswordModalOpen(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsForgotPasswordModalOpen(false)}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSending}
            onClick={handleForgotPassword}
          >
            Gửi
          </Button>,
        ]}
      >
        <p>Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.</p>
        <Input
          type="email"
          placeholder="Nhập email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
        />
      </Modal>

      <Modal
        title="Đặt Lại Mật Khẩu"
        open={isResetPasswordModalOpen}
        onCancel={() => setIsResetPasswordModalOpen(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsResetPasswordModalOpen(false)}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSending}
            onClick={handleResetPassword}
          >
            Đặt lại
          </Button>,
        ]}
      >
        <p>Nhập mã xác nhận và mật khẩu mới của bạn.</p>
        <Input
          className="mb-2"
          type="text"
          placeholder="Mã xác nhận"
          value={resetToken}
          onChange={(e) => setResetToken(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Mật khẩu mới"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Modal>
    </div>
  );
}
