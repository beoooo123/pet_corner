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
import blogCategoryApi from '../../api/blogCategoryApi';

const { Option } = Select;

interface BlogCategory {
  key: string;
  _id: string;
  name: string;
  description: string;
  status: string;
}

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const BlogCategoryList: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBlogCategories();
  }, []);

  const fetchBlogCategories = async () => {
    setLoading(true);
    try {
      const response = await blogCategoryApi.getAll();
      const fetchedCategories = (response.data.result || []).map((category: any) => ({
        key: category._id,
        _id: category._id,
        name: category.name,
        description: category.description,
        status: category.status === 'active' ? 'Hoạt động' : 'Bị khóa',
      }));
      setCategories(fetchedCategories);
      setFilteredCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching blog categories:', error);
      notification.error({
        message: 'Lỗi',
        description: 'Lỗi khi tải danh sách danh mục bài viết!',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    const normalizedSearchText = removeAccents(value.toLowerCase());

    const filtered = categories.filter((category) => {
      const normalizedName = removeAccents(category.name.toLowerCase());
      return normalizedName.includes(normalizedSearchText);
    });

    setFilteredCategories(filtered);
  };

  const handleEdit = (record: BlogCategory) => {
    setSelectedCategory(record);
    setIsEditModalVisible(true);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status,
    });
  };

  const handleDelete = (record: BlogCategory) => {
    Modal.confirm({
      title: 'Xác nhận',
      content: `Bạn có chắc chắn muốn xóa danh mục "${record.name}"?`,
      okText: 'Đồng ý',
      cancelText: 'Hủy bỏ',
      onOk: async () => {
        try {
          await blogCategoryApi.delete(record._id);
          notification.success({
            message: 'Thành công',
            description: 'Danh mục bài viết đã được xóa thành công!',
            placement: 'topRight',
          });
          fetchBlogCategories();
        } catch (error: any) {
          console.error('Error deleting blog category:', error);
          const errorMessage = error.response?.data?.message || 'Không thể xóa danh mục!';
          notification.error({
            message: 'Lỗi',
            description: errorMessage,
            placement: 'topRight',
          });
        }
      },
    });
  };

  const handleEditModalOk = async () => {
    try {
      const values = await form.validateFields();
      await blogCategoryApi.update(selectedCategory?._id, {
        name: values.name,
        description: values.description,
        status: values.status === 'Hoạt động' ? 'active' : 'inactive',
      });
      setIsEditModalVisible(false);
      notification.success({
        message: 'Thành công',
        description: 'Thông tin danh mục đã được cập nhật thành công!',
        placement: 'topRight',
      });
      fetchBlogCategories();
    } catch (error) {
      console.error('Error updating blog category:', error);
      notification.error({
        message: 'Lỗi',
        description: 'Có lỗi khi cập nhật thông tin danh mục!',
        placement: 'topRight',
      });
    }
  };

  const handleAddModalOk = async () => {
    try {
      const values = await form.validateFields();
      const response = await blogCategoryApi.create({
        name: values.name,
        description: values.description || '',
      });
      if (!response.success) {
        throw new Error(response.message || 'Tạo danh mục thất bại!');
      }
      setIsAddModalVisible(false);
      form.resetFields();
      notification.success({
        message: 'Thành công',
        description: 'Danh mục bài viết đã được tạo thành công!',
        placement: 'topRight',
      });
      fetchBlogCategories();
    } catch (error: any) {
      console.error('Error adding blog category:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi khi tạo danh mục!';
      notification.error({
        message: 'Lỗi',
        description: errorMessage,
        placement: 'topRight',
      });
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_: any, __: BlogCategory, index: number) => index + 1,
    },
    { title: 'Tên danh mục', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Hoạt động' ? 'success' : 'error'}>{status}</Tag>
      ),
    },
    {
      title: 'Tính năng',
      key: 'action',
      width: 120,
      render: (_: any, record: BlogCategory) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} size="small" />
        </Space>
      ),
    },
  ];

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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalVisible(true)}>
            Tạo mới danh mục
          </Button>
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
        title="Chỉnh sửa danh mục bài viết"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
      >
        {selectedCategory && (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Tên danh mục"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên danh mục!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Mô tả danh mục" name="description">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item
              label="Trạng thái"
              name="status"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
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
        title="Tạo mới danh mục bài viết"
        open={isAddModalVisible}
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
          <Form.Item label="Mô tả danh mục" name="description">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default BlogCategoryList;
