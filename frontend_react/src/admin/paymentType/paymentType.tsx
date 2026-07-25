import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Space,
  notification,
  Alert,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import paymentTypeApi from "../../api/paymentTypeApi";

// _id này đang được frontend (trang thanh toán) hardcode so sánh để nhận biết
// "Thanh toán khi nhận hàng" (COD) — xoá mục này sẽ làm hỏng logic checkout.
const COD_ID = "67d67442aeb5082f01074c28";

interface PaymentType {
  key: string;
  _id: string;
  payment_type_name: string;
  description: string;
}

const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const PaymentTypeList: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [filteredPaymentTypes, setFilteredPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  const fetchPaymentTypes = async () => {
    setLoading(true);
    try {
      const response = await paymentTypeApi.getAllPayment();
      const fetched = (response.data.data || []).map((p: any) => ({
        key: p._id,
        _id: p._id,
        payment_type_name: p.payment_type_name,
        description: p.description,
      }));
      setPaymentTypes(fetched);
      setFilteredPaymentTypes(fetched);
    } catch (error) {
      console.error("Error fetching payment types:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi tải danh sách phương thức thanh toán!",
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentTypes();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const normalizedSearchText = removeAccents(value.toLowerCase());
    const filtered = paymentTypes.filter((p) =>
      removeAccents(p.payment_type_name.toLowerCase()).includes(normalizedSearchText)
    );
    setFilteredPaymentTypes(filtered);
  };

  const handleEdit = (record: PaymentType) => {
    setSelectedPaymentType(record);
    setIsEditModalVisible(true);
    form.setFieldsValue({
      payment_type_name: record.payment_type_name,
      description: record.description,
    });
  };

  const handleDelete = (record: PaymentType) => {
    Modal.confirm({
      title: "Xác nhận",
      content:
        record._id === COD_ID
          ? `"${record.payment_type_name}" đang được hệ thống dùng để nhận biết đơn hàng thanh toán khi nhận hàng (COD). Xoá mục này có thể làm sai logic thanh toán ở trang checkout. Bạn vẫn muốn xoá?`
          : `Bạn có chắc chắn muốn xóa "${record.payment_type_name}"?`,
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          await paymentTypeApi.delete(record._id);
          notification.success({
            message: "Thành công",
            description: "Đã xóa phương thức thanh toán!",
            placement: "topRight",
          });
          fetchPaymentTypes();
        } catch (error: any) {
          console.error("Error deleting payment type:", error);
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
      await paymentTypeApi.update(selectedPaymentType?._id, values);
      setIsEditModalVisible(false);
      notification.success({
        message: "Thành công",
        description: "Đã cập nhật phương thức thanh toán!",
        placement: "topRight",
      });
      fetchPaymentTypes();
    } catch (error: any) {
      console.error("Error updating payment type:", error);
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
      await paymentTypeApi.create(values);
      setIsAddModalVisible(false);
      form.resetFields();
      notification.success({
        message: "Thành công",
        description: "Đã tạo phương thức thanh toán!",
        placement: "topRight",
      });
      fetchPaymentTypes();
    } catch (error: any) {
      console.error("Error adding payment type:", error);
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
      render: (_: any, __: PaymentType, index: number) => index + 1,
    },
    { title: "Tên phương thức", dataIndex: "payment_type_name", key: "payment_type_name" },
    { title: "Mô tả", dataIndex: "description", key: "description" },
    {
      title: "Tính năng",
      key: "action",
      width: 120,
      render: (_: any, record: PaymentType) => (
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
        name="payment_type_name"
        rules={[{ required: true, message: "Vui lòng nhập tên phương thức!" }]}
      >
        <Input placeholder="Ví dụ: Thanh toán khi nhận hàng" />
      </Form.Item>
      <Form.Item
        label="Mô tả"
        name="description"
        rules={[{ required: true, message: "Vui lòng nhập mô tả!" }]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Alert
        className="mb-4"
        type="warning"
        showIcon
        message="Lưu ý"
        description={`Mục "Thanh toán khi nhận hàng" (COD) đang được code ở trang thanh toán nhận diện qua _id cố định, không nên xoá — chỉ nên sửa tên/mô tả nếu cần.`}
      />
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
              setIsAddModalVisible(true);
            }}
          >
            Tạo mới phương thức
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredPaymentTypes}
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      <Modal
        title="Chỉnh sửa phương thức thanh toán"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
      >
        {selectedPaymentType && renderFormFields()}
      </Modal>

      <Modal
        title="Tạo mới phương thức thanh toán"
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

export default PaymentTypeList;
