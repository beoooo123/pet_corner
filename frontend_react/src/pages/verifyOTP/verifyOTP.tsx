// VerifyOtp.js
import React, { useState } from "react";
import { Button, Typography, Input, notification } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { MailOutlined, LoadingOutlined } from "@ant-design/icons";
import signupApi from "../../api/signupApi";

const { Title, Text } = Typography;

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  if (!email) {
    navigate("/signup");
    return null;
  }

  // Xử lý gửi lại OTP
  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const { data } = await signupApi.resendOtp(email); // Giả sử có API này
      if (!data.success) {
        throw new Error(data.message || "Gửi lại OTP thất bại!");
      }

      notification.success({
        message: "Thành công!",
        description: "Mã OTP mới đã được gửi đến email của bạn.",
        placement: "topRight",
        duration: 2,
      });

      setResendCooldown(60); // Đặt cooldown 60 giây
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      notification.error({
        message: "Lỗi!",
        description: `Không thể gửi lại OTP: ${error.message}`,
        placement: "topRight",
        duration: 2,
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!otp.trim() || otp.length !== 6) {
      notification.warning({
        message: "Lỗi!",
        description: "OTP phải là 6 chữ số!",
        placement: "topRight",
        duration: 2,
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await signupApi.verifyOtp(email, otp);
      if (!data.success) {
        throw new Error(data.message || "Xác thực OTP thất bại!");
      }

      notification.success({
        message: "Xác thực thành công!",
        description: "Bạn có thể đăng nhập ngay bây giờ.",
        placement: "topRight",
        duration: 2,
        onClose: () => navigate("/login"),
      });
    } catch (error) {
      notification.error({
        message: "Xác thực thất bại!",
        description: `Đã xảy ra lỗi: ${error.message}`,
        placement: "topRight",
        duration: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 transform transition-all hover:shadow-xl">
        <div className="text-center mb-6">
          <MailOutlined className="text-4xl text-blue-500 mb-4" />
          <Title level={3} className="text-gray-800">
            Xác Thực OTP
          </Title>
          <Text className="text-gray-600">
            Vui lòng nhập mã OTP được gửi đến{" "}
            <span className="font-medium text-blue-600">{email}</span>
          </Text>
        </div>

        <div className="space-y-6">
          <Input
            placeholder="Nhập mã OTP (6 chữ số)"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // Chỉ cho nhập số
            maxLength={6}
            size="large"
            className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
            style={{
              letterSpacing: "0.5em",
              textAlign: "center",
              fontSize: "1.2rem",
            }}
          />

          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={loading}
            className="w-full rounded-lg h-12 bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {loading ? "Đang xác thực..." : "Xác Nhận"}
          </Button>

          <div className="text-center">
            <Text className="text-gray-600">Không nhận được mã?</Text>
            <Button
              type="link"
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              {resendLoading ? (
                <LoadingOutlined />
              ) : resendCooldown > 0 ? (
                `Gửi lại (${resendCooldown}s)`
              ) : (
                "Gửi lại OTP"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
