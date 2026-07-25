import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Space,
  Tag,
  notification,
  Select,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import deliveryApi from "../../api/deliveryApi";

const { Option } = Select;

interface Delivery {
  key: string;
  _id: string;
  delivery_name: string;
  description: string;
  delivery_fee: number;
  estimated_delivery_time: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const DeliveryList: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const response = await deliveryApi.getAllDelivery();
      const fetched = (response.data.data || []).map((d: any) => ({
        key: d._id,
        _id: d._id,
        delivery_name: d.delivery_name,
        description: d.description,
        delivery_fee: d.delivery_fee,
        estimated_delivery_time: d.estimated_delivery_time,
        status: d.status,
      }));
      setDeliveries(fetched);
      setFilteredDeliveries(fetched);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi tải danh sách phương thức vận chuyển!",
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const normalizedSearchText = removeAccents(value.toLowerCase());
    const filtered = deliveries.filter((d) =>
      removeAccents(d.delivery_name.toLowerCase()).includes(normalizedSearchText)
    );
    setFilteredDeliveries(filtered);
  };

  const handleEdit = (record: Delivery) => {
    setSelectedDelivery(record);
    setIsEditModalVisible(true);
    form.setFieldsValue({
      delivery_name: record.delivery_name,
      description: record.description,
      delivery_fee: record.delivery_fee,
      estimated_delivery_time: record.estimated_delivery_time
        ? dayjs(record.estimated_delivery_time)
        : null,
      status: record.status,
    });
  };

  const handleDelete = (record: Delivery) => {
    Modal.confirm({
      title: "Xác nhận",
      content: `Bạn có chắc chắn muốn xóa phương thức "${record.delivery_name}"?`,
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          await deliveryApi.delete(record._id);
          notification.success({
            message: "Thành công",
            description: "Đã xóa phương thức vận chuyển!",
            placement: "topRight",
          });
          fetchDeliveries();
        } catch (error: any) {
          console.error("Error deleting delivery:", error);
          notification.error({
            message: "Lỗi",
            description: error.response?.data?.message || "Không thể xóa!",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleEditModalOk = async () => {
    try {
      const values = await form.validateFields();
      await deliveryApi.update(selectedDelivery?._id, {
        ...values,
        estimated_delivery_time: values.estimated_delivery_time?.toISOString(),
      });
      setIsEditModalVisible(false);
      notification.success({
        message: "Thành công",
        description: "Đã cập nhật phương thức vận chuyển!",
        placement: "topRight",
      });
      fetchDeliveries();
    } catch (error: any) {
      console.error("Error updating delivery:", error);
      notification.error({
        message: "Lỗi",
        description: error.response?.data?.message || "Có lỗi khi cập nhật!",
        placement: "topRight",
      });
    }
  };

  const handleAddModalOk = async () => {
    try {
      const values = await form.validateFields();
      await deliveryApi.create({
        ...values,
        estimated_delivery_time: values.estimated_delivery_time?.toISOString(),
      });
      setIsAddModalVisible(false);
      form.resetFields();
      notification.success({
        message: "Thành công",
        description: "Đã tạo phương thức vận chuyển!",
        placement: "topRight",
      });
      fetchDeliveries();
    } catch (error: any) {
      console.error("Error adding delivery:", error);
      notification.error({
        message: "Lỗi",
        description: error.response?.data?.message || "Có lỗi khi tạo!",
        placement: "topRight",
      });
    }
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      render: (_: any, __: Delivery, index: number) => index + 1,
    },
    { title: "Tên phương thức", dataIndex: "delivery_name", key: "delivery_name" },
    { title: "Mô tả", dataIndex: "description", key: "description" },
    {
      title: "Phí vận chuyển",
      dataIndex: "delivery_fee",
      key: "delivery_fee",
      render: (fee: number) => `${fee?.toLocaleString() || 0} VNĐ`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag color="blue">{STATUS_LABELS[status] || status}</Tag>,
    },
    {
      title: "Tính năng",
      key: "action",
      width: 120,
      render: (_: any, record: Delivery) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  const renderFormFields = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        label="Tên phương thức"
        name="delivery_name"
        rules={[{ required: true, message: "Vui lòng nhập tên phương thức!" }]}
      >
        <Input placeholder="Ví dụ: Giao hàng tiêu chuẩn" />
      </Form.Item>
      <Form.Item label="Mô tả" name="description">
        <Input.TextArea rows={2} placeholder="Ví dụ: Giao trong 2-3 ngày" />
      </Form.Item>
      <Form.Item
        label="Phí vận chuyển (VNĐ)"
        name="delivery_fee"
        rules={[{ required: true, message: "Vui lòng nhập phí vận chuyển!" }]}
      >
        <InputNumber min={0} className="w-full" placeholder="0 = miễn phí" />
      </Form.Item>
      <Form.Item
        label="Ngày dự kiến giao (mốc tham khảo)"
        name="estimated_delivery_time"
        rules={[{ required: true, message: "Vui lòng chọn ngày dự kiến!" }]}
      >
        <DatePicker className="w-full" format="DD/MM/YYYY" />
      </Form.Item>
      <Form.Item label="Trạng thái" name="status">
        <Select placeholder="Chọn trạng thái">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <Option key={value} value={value}>
              {label}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title={
          <Input
            placeholder="Tìm kiếm..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
        }
        bordered={false}
        className="shadow-sm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ status: "pending", delivery_fee: 0 });
              setIsAddModalVisible(true);
            }}
          >
            Tạo mới phương thức
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredDeliveries}
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      <Modal
        title="Chỉnh sửa phương thức vận chuyển"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
      >
        {selectedDelivery && renderFormFields()}
      </Modal>

      <Modal
        title="Tạo mới phương thức vận chuyển"
        open={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={() => setIsAddModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
        width={600}
      >
        {renderFormFields()}
      </Modal>
    </motion.div>
  );
};

export default DeliveryList;
