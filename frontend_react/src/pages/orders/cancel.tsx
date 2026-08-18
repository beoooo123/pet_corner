import React from "react";
import { Typography, Button, Space } from "antd";

const { Title, Text } = Typography;

const SuccessPage = () => {
  const handleContact = () => {
    alert("Đang chuyển đến trang hỗ trợ...");
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 20px",
        minHeight: "400px",
      }}
    >
      <Space direction="vertical" size="large">
        <Title level={2} style={{ color: "#52c41a" }}>
          Đặt hàng thành công!
        </Title>

        <Text style={{ fontSize: "16px" }}>
          Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được tiếp nhận
          và đang được xử lý.
        </Text>

        <Button
          type="primary"
          size="large"
          onClick={handleContact}
        >
          Liên hệ hỗ trợ
        </Button>
      </Space>
    </div>
  );
};

export default SuccessPage;