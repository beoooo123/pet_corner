import React from "react";
import { Typography, Button, Space } from "antd";

const { Title, Text } = Typography;

const SuccessPage = () => {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <Space direction="vertical" size="large">
        <Title className="text-green-500" level={3}>
          Đặt hàng thành công
        </Title>

        <Text>
          Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được tiếp nhận và đang
          được xử lý.git
        </Text>

        <Button type="primary" size="large">
          Xem đơn hàng
        </Button>
      </Space>
    </div>
  );
};

export default SuccessPage;