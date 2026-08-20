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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import categoryApi from "../../api/categoryApi";

interface Category {
  _id: string;
  name: string;
  description: string;
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  // Lấy danh sách danh mục
  const fetchCategories = async () => {
    setLoading(true);

    try {
      const response = await categoryApi.getAllCategories();

      setCategories(response.data.result || []);
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể tải danh sách danh mục!",
      });
    } finally {
      setLoading(false);
    }
  };

  // Xóa danh mục
  const handleDelete = async (id: string) => {
    try {
      await categoryApi.deleteCategory(id);

      notification.success({
        message: "Thành công",
        description: "Xóa danh mục thành công!",
      });

      fetchCategories();
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể xóa danh mục!",
      });
    }
  };

  // Thêm / sửa danh mục
  const handleSave = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
      };

      if (editingCategory) {
        // Cập nhật danh mục
        await categoryApi.updateCategory(
          editingCategory._id,
          payload
        );

        notification.success({
          message: "Thành công",
          description: "Cập nhật danh mục thành công!",
        });
      } else {
        // Tạo danh mục
        await categoryApi.createCategory(payload);

        notification.success({
          message: "Thành công",
          description: "Tạo danh mục thành công!",
        });
      }

      setIsModalVisible(false);
      setEditingCategory(null);

      fetchCategories();
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể lưu danh mục!",
      });
    }
  };

  // Hiển thị Modal
  const showModal = (category?: Category) => {
    setEditingCategory(category || null);
    setIsModalVisible(true);
  };

  // Đóng Modal
  const closeModal = () => {
    setIsModalVisible(false);
    setEditingCategory(null);
  };

  // Load danh sách khi component chạy
  useEffect(() => {
    fetchCategories();
  }, []);

  // Cột bảng
  const columns = [
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
    },

    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
    },

    {
      title: "Hành động",
      key: "action",

      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            Sửa
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Danh sách danh mục"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
        >
          Thêm danh mục
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={categories}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={
          editingCategory
            ? "Sửa danh mục"
            : "Thêm danh mục"
        }
        open={isModalVisible}
        onCancel={closeModal}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={handleSave}
          initialValues={
            editingCategory
              ? {
                  name: editingCategory.name,
                  description:
                    editingCategory.description,
                }
              : {}
          }
        >
          {/* Tên danh mục */}
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập tên danh mục!",
              },
            ]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          {/* Mô tả */}
          <Form.Item
            label="Mô tả"
            name="description"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập mô tả!",
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Nhập mô tả danh mục"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
          >
            Lưu
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};

export default CategoryList;