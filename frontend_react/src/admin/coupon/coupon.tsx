import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  Space,
  notification,
  Form,
  DatePicker,
  InputNumber,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import couponApi from "../../api/couponApi";
import moment from "moment";

const { RangePicker } = DatePicker;

interface Coupon {
  _id: string;
  coupon_code: string;
  discount_value: number;
  min_order_value: number;
  start_date: string;
  end_date: string;
  usage_limit: number;
  used_count: number;
}

const CouponList: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const response = await couponApi.getAllCoupons();
      setCoupons(response.data.result || []);
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể tải danh sách mã giảm giá!",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await couponApi.deleteCoupon(id);
      notification.success({
        message: "Thành công",
        description: "Xóa mã giảm giá thành công!",
      });
      fetchCoupons();
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể xóa mã giảm giá!",
      });
    }
  };

  const handleSave = async (values: any) => {
    try {
      const payload = {
        ...values,
        discount_value: Number(values.discount_value), // Đảm bảo giá trị là số
        date_range: values.date_range.map((date: moment.Moment) =>
          date.toISOString()
        ), // Chuyển đổi ngày sang định dạng ISO
      };

      if (editingCoupon) {
        // Update coupon
        await couponApi.updateCoupon(editingCoupon._id, payload);
        notification.success({
          message: "Thành công",
          description: "Cập nhật mã giảm giá thành công!",
        });
      } else {
        // Create new coupon
        await couponApi.createCoupon(payload);
        notification.success({
          message: "Thành công",
          description: "Tạo mã giảm giá thành công!",
        });
      }
      setIsModalVisible(false);
      fetchCoupons();
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể lưu mã giảm giá!",
      });
    }
  };

  const showModal = (coupon?: Coupon) => {
    setEditingCoupon(coupon || null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingCoupon(null);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const columns = [
    {
      title: "Mã giảm giá",
      dataIndex: "coupon_code",
      key: "coupon_code",
    },
    {
      title: "Giá trị giảm",
      dataIndex: "discount_value",
      key: "discount_value",
      render: (value: number) => `${value.toLocaleString()} VNĐ`,
    },
    {
      title: "Giá trị đơn hàng tối thiểu",
      dataIndex: "min_order_value",
      key: "min_order_value",
      render: (value: number) => `${value.toLocaleString()} VNĐ`,
    },
    {
      title: "Thời gian hiệu lực",
      key: "date_range",
      render: (_: any, record: Coupon) =>
        `${moment(record.start_date).format("DD/MM/YYYY")} - ${moment(
          record.end_date
        ).format("DD/MM/YYYY")}`,
    },
    {
      title: "Số lần sử dụng",
      dataIndex: "used_count",
      key: "used_count",
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: Coupon) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            type="primary"
          >
            Sửa
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
            danger
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Danh sách mã giảm giá"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
        >
          Thêm mã giảm giá
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={coupons}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingCoupon ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
        visible={isModalVisible}
        onCancel={closeModal}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={handleSave}
          initialValues={
            editingCoupon
              ? {
                  ...editingCoupon,
                  date_range: [
                    moment(editingCoupon.start_date),
                    moment(editingCoupon.end_date),
                  ],
                }
              : {}
          }
        >
          <Form.Item
            label="Mã giảm giá"
            name="coupon_code"
            rules={[{ required: true, message: "Vui lòng nhập mã giảm giá!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Giá trị giảm (%)"
            name="discount_value"
            rules={[{ required: true, message: "Vui lòng nhập giá trị giảm!" }]}
          >
            <InputNumber
              min={0}
              max={100}
              style={{ width: "100%" }}
              formatter={(value) => `${value}%`} // Hiển thị giá trị với ký hiệu %
              parser={(value) =>
                value ? parseFloat(value.replace("%", "")) : 0
              } // Loại bỏ ký hiệu % khi gửi lên
            />
          </Form.Item>
          <Form.Item
            label="Giá trị đơn hàng tối thiểu (VNĐ)"
            name="min_order_value"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập giá trị đơn hàng tối thiểu!",
              },
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              formatter={(value) => `${value} VNĐ`} // Hiển thị giá trị với đơn vị VNĐ
              parser={(value) => value?.replace(" VNĐ", "").replace(/\./g, "")} // Loại bỏ đơn vị VNĐ khi gửi lên
            />
          </Form.Item>
          <Form.Item
            label="Thời gian hiệu lực"
            name="date_range"
            rules={[
              { required: true, message: "Vui lòng chọn thời gian hiệu lực!" },
            ]}
          >
            <RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Số lần sử dụng"
            name="usage_limit"
            rules={[
              { required: true, message: "Vui lòng nhập số lần sử dụng!" },
            ]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Lưu
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};

export default CouponList;

export const createCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Request body:", req.body);

    const {
      coupon_code,
      discount_value,
      date_range,
      min_order_value,
      usage_limit,
      used_count,
      score,
    } = req.body as {
      coupon_code: string;
      discount_value: number;
      date_range: [string, string];
      min_order_value?: number;
      usage_limit?: number;
      used_count?: number;
      score?: number;
    };

    // Kiểm tra các trường bắt buộc
    if (
      !coupon_code ||
      !discount_value ||
      !date_range ||
      date_range.length !== 2
    ) {
      res.status(400).json({
        success: false,
        message: "Thiếu các trường bắt buộc hoặc date_range không hợp lệ",
      });
      return;
    }

    const [start_date, end_date] = date_range;

    // Tạo mã giảm giá mới
    const newCoupon = await couponModel.create({
      coupon_code,
      discount_value,
      min_order_value: min_order_value || 0, // Giá trị mặc định là 0
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      usage_limit: usage_limit || 1, // Giá trị mặc định là 1
      used_count: used_count || 0, // Giá trị mặc định là 0
      score: score || 0, // Giá trị mặc định là 0
    });

    res.status(201).json({
      success: true,
      message: "Tạo mã giảm giá thành công",
      coupon: newCoupon,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error creating coupon: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      details: errorMessage,
    });
  }
};
