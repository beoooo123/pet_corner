import React from "react";
import { Typography, Button, Space } from "antd";

const { Title, Text } = Typography;

const CancelPage = () => {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <Space direction="vertical" size="large">
        <Title className="text-red-400" level={3}>
          Huỷ đơn hàng thành công
        </Title>
        <Text>
          Huỷ đơn hàng thì sao? Hãy liên hệ với chúng tôi để được hỗ trợ tốt
          nhất.
        </Text>
        <Button type="primary" size="large">
          Liên hệ hỗ trợ
        </Button>
      </Space>
    </div>
  );
};

export default CancelPage;
