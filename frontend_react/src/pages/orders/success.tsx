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
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    const responseCode = queryParams.get("vnp_ResponseCode");
    const orderId = queryParams.get("vnp_TxnRef");

    if (!responseCode || !orderId) {
      setIsInvalidAccess(true);

      message.warning("Truy cập không hợp lệ.");
      return;
    }

    paymentApi
      .verifyPayment(Object.fromEntries(queryParams.entries()))
      .then((res) => {
        if (res.verified && res.payment_status === "PAID") {
          message.success("Thanh toán thành công!");

          dispatch(clearProduct());

          setTimeout(() => {
            navigate("/userprofile/orders");
          }, 2000);
        } else {
          message.error("Thanh toán thất bại");

          setTimeout(() => {
            navigate("/cancel");
          }, 1000);
        }
      })
      .catch((error) => {
        console.log("Lỗi thanh toán:", error);

        message.error("Có lỗi xảy ra khi thanh toán.");
      });
  }, [location]);

  const handleContinueShopping = () => {
    navigate("/");
  };

  if (isInvalidAccess) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Truy cập không hợp lệ</h2>

        <p>Vui lòng quay lại trang mua hàng.</p>

        <Button type="primary" onClick={handleContinueShopping}>
          Tiếp tục mua hàng
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Loader />
    </div>
  );
};

export default SuccessPage;