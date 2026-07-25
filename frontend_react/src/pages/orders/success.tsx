import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { message, Button } from "antd";
import paymentApi from "../../api/paymentApi";
import { clearProduct } from "../../redux/slices/cartslice";
import { useDispatch } from "react-redux";
import Loader from "../../components/LoaderPayment";

const SuccessPage = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isInvalidAccess, setIsInvalidAccess] = useState(false); // Trạng thái để kiểm tra truy cập không hợp lệ

  useEffect(() => {
    // Lấy query parameters từ URL
    const queryParams = new URLSearchParams(location.search);
    const responseCode = queryParams.get("vnp_ResponseCode"); // Mã phản hồi
    const orderId = queryParams.get("vnp_TxnRef"); // Mã đơn hàng

    // Kiểm tra xem có phải truy cập không hợp lệ hay không
    if (!responseCode || !orderId) {
      setIsInvalidAccess(true); // Đánh dấu là truy cập không hợp lệ
      message.warning(
        "Truy cập không hợp lệ. Vui lòng quay lại trang mua hàng."
      );
      return;
    }

    // Không tự quyết định thanh toán thành công/thất bại từ vnp_ResponseCode đọc trên URL
    // (ai cũng có thể tự sửa URL) — gửi nguyên toàn bộ query VNPay cho backend tự tính lại
    // vnp_SecureHash và xác nhận, backend mới là nơi quyết định + lưu payment_status thật.
    paymentApi
      .verifyPayment(Object.fromEntries(queryParams.entries()))
      .then((res) => {
        if (res.verified && res.payment_status === "PAID") {
          message.success(
            "Thanh toán thành công! Đơn hàng của bạn đã được xác nhận."
          );
          dispatch(clearProduct());
          setTimeout(() => navigate("/userprofile/orders"), 3000);
        } else if (res.verified) {
          message.error("Thanh toán thất bại");
          setTimeout(() => navigate("/cancel"), 1000);
        } else {
          message.error(
            "Không xác thực được giao dịch. Vui lòng liên hệ hỗ trợ nếu bạn đã thanh toán."
          );
          setTimeout(() => navigate("/"), 2000);
        }
      })
      .catch((error) => {
        console.error("Error verifying payment:", error);
        message.error("Có lỗi xảy ra khi xác thực thanh toán.");
        navigate("/");
      });
  }, [location, navigate, dispatch]);

  // Hàm xử lý khi người dùng nhấn nút "Tiếp tục mua hàng"
  const handleContinueShopping = () => {
    navigate("/"); // Chuyển hướng về trang chủ (hoặc /products)
  };

  // Nếu truy cập không hợp lệ, hiển thị thông báo và nút "Tiếp tục mua hàng"
  if (isInvalidAccess) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Truy cập không hợp lệ</h2>
        <p>Bạn không thể truy cập trang này trực tiếp.</p>
        <Button
          type="primary"
          className="m-2 px-8 py-6 bg-[#22A6DF] hover:bg-[#1890ff] hover:border-[#22A6DF] rounded-lg text-white text-xs sm:text-sm"
          onClick={handleContinueShopping}
        >
          Tiếp tục mua hàng
        </Button>
      </div>
    );
  }

  // Nếu truy cập hợp lệ, hiển thị thông báo xử lý
  return (
    <div>
      <h2>
        <Loader />
      </h2>
    </div>
  );
};

export default SuccessPage;
