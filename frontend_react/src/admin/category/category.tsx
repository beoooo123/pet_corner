import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Space,
  Tag,
  notification,
  Select,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Typography } from 'antd';
import categoryApi from '../../api/categoryApi';

const { Title } = Typography;
const { Option } = Select;

interface Category {
  key: string;
  _id: string;
  name: string;
  description: string;
  status: string;
}

// Function to remove Vietnamese accents
const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const CategoryList: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          console.error("No token found in localStorage");
          return;
        }
        const response = await categoryApi.getAll();
        const fetchedCategories = response.data.result.map((category: any) => ({
          key: category._id,
          _id: category._id,
          name: category.name,
          description: category.description,
          status: category.status === "active" ? "Hoạt động" : "Bị khóa",
        }));
        setCategories(fetchedCategories);
        setFilteredCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Enhanced search functionality
  const handleSearch = (value: string) => {
    setSearchText(value);
    const normalizedSearchText = removeAccents(value.toLowerCase());

    const filtered = categories.filter(category => {
      const normalizedCategoryName = removeAccents(category.name.toLowerCase());
      return normalizedCategoryName.includes(normalizedSearchText);
    });

    setFilteredCategories(filtered);
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_: any, __: Category, index: number) => index + 1,
    },
    { title: 'Tên danh mục', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "Hoạt động" ? "success" : "error"}>{status}</Tag>
      ),
    },
    {
      title: "Tính năng",
      key: "action",
      width: 120,
      render: (_: any, record: Category) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
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

  const handleEdit = (record: Category) => {
    setSelectedCategory(record);
    setIsEditModalVisible(true);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status,
    });
  };

  const handleDelete = (record: Category) => {
    Modal.confirm({
      title: 'Xác nhận',
      content: `Bạn có chắc chắn muốn xóa danh mục "${record.name}"?`,
      okText: 'Đồng ý',
      cancelText: 'Hủy bỏ',
      onOk: async () => {
        try {
          await categoryApi.delete(record._id);
          const updatedCategories = categories.filter(category => category._id !== record._id);
          setCategories(updatedCategories);
          setFilteredCategories(updatedCategories);
          notification.success({
            message: "Thành công",
            description: "Danh mục đã được xóa thành công!",
            placement: "topRight",
          });
        } catch (error: any) {
          console.error("Error deleting category:", error);
          const errorMessage = error.response?.data?.message || "Không thể xóa danh mục!";
          notification.error({
            message: "Lỗi",
            description: errorMessage,
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleEditModalOk = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem("accessToken");
      const updatedData = {
        name: values.name,
        description: values.description,
        status: values.status === "Hoạt động" ? "active" : "inactive",
      };
      const response = await categoryApi.update(selectedCategory?._id, updatedData);
      const updatedCategories = categories.map((u) =>
        u.key === selectedCategory?.key
          ? { ...u, ...updatedData, status: values.status }
          : u
      );
      setCategories(updatedCategories);
      setFilteredCategories(updatedCategories);
      setIsEditModalVisible(false);
      notification.success({
        message: "Thành công",
        description: "Thông tin danh mục đã được cập nhật thành công!",
        placement: "topRight",
      });
    } catch (error) {
      console.error("Error updating category:", error);
      notification.error({
        message: "Lỗi",
        description: "Có lỗi khi cập nhật thông tin danh mục!",
        placement: "topRight",
      });
    }
  };

  const handleAddModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (!localStorage.getItem("accessToken")) {
        throw new Error("Bạn cần đăng nhập để thực hiện thao tác này!");
      }
      const newCategory = {
        name: values.name,
        description: values.description || "",
        status: "active",
      };
      const response = await categoryApi.create(newCategory);
      if (!response.success) {
        throw new Error(response.message || "Tạo danh mục thất bại!");
      }
      const addedCategoryData = response.user || response.data;
      const addedCategory = {
        key: addedCategoryData._id,
        _id: addedCategoryData._id,
        name: values.name,
        description: values.description,
        status: "Hoạt động",
      };
      const updatedCategories = [...categories, addedCategory];
      setCategories(updatedCategories);
      setFilteredCategories(updatedCategories);
      setIsAddModalVisible(false);
      form.resetFields();
      notification.success({
        message: "Thành công",
        description: "Danh mục đã được tạo thành công!",
        placement: "topRight",
      });
    } catch (error: any) {
      console.error("Error adding category:", error);
      const errorMessage = error.response?.data?.message || error.message || "Có lỗi khi tạo danh mục!";
      notification.error({
        message: "Lỗi",
        description: errorMessage,
        placement: "topRight",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title={
          <div className="flex items-center gap-4">
            <Input
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </div>
        }
        bordered={false}
        className="shadow-sm"
        extra={
          <div className="space-x-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddModalVisible(true)}
            >
              Tạo mới danh mục
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredCategories}
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa thông tin danh mục"
        visible={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
      >
        {selectedCategory && (
          <Form form={form} layout="vertical">
            <Form.Item label="ID danh mục" name="_id">
              <Input value={selectedCategory._id} disabled />
            </Form.Item>
            <Form.Item
              label="Tên danh mục"
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập tên danh mục!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Mô tả danh mục"
              name="description"
              rules={[{ required: true, message: "Vui lòng nhập mô tả!" }]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item
              label="Trạng thái"
              name="status"
              rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
            >
              <Select>
                <Option value="Hoạt động">Hoạt động</Option>
                <Option value="Bị khóa">Bị khóa</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal
        title="Tạo mới danh mục"
        visible={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={() => setIsAddModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Mô tả danh mục"
            name="description"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default CategoryList;