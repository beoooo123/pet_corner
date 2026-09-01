import React, { useEffect, useState } from "react";
import { Card, Button, Table, Modal, Space, Tag, notification, Image, Input, Select } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import blogApi from "../../api/blogApi";
import BlogModal from "../components/blogModal";

const { Option } = Select;

interface Blog {
  key: string;
  _id: string;
  title: string;
  content: string;
  author: string;
  image_url: string;
  status: string;
  blog_category_id?: string | { _id: string; name?: string };
  createdAt: string;
}

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const BlogList: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await blogApi.getAllBlogs();
      const blogList = response.data.data || [];
      const formatted = blogList.map((blog: any) => ({
        key: blog._id,
        _id: blog._id,
        title: blog.title,
        content: blog.content,
        author: blog.author,
        image_url: blog.image_url,
        status: blog.status,
        blog_category_id: blog.blog_category_id,
        createdAt: blog.createdAt,
      }));
      setBlogs(formatted);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bài viết:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi tải danh sách bài viết!",
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchSearch = removeAccents(blog.title.toLowerCase()).includes(
      removeAccents(searchText.toLowerCase())
    );
    const matchStatus = statusFilter ? blog.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const showModal = (blog?: Blog) => {
    setEditingBlog(blog || null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingBlog(null);
  };

  const handleDelete = (record: Blog) => {
    Modal.confirm({
      title: "Xác nhận",
      content: `Bạn có chắc chắn muốn xóa bài viết "${record.title}"?`,
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          await blogApi.delete(record._id);
          notification.success({
            message: "Thành công",
            description: "Đã xóa bài viết thành công!",
            placement: "topRight",
          });
          fetchBlogs();
        } catch (error) {
          console.error("Error deleting blog:", error);
          notification.error({
            message: "Lỗi",
            description: "Không thể xóa bài viết!",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleToggleStatus = async (record: Blog) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    try {
      await blogApi.toggleStatus(record._id, newStatus);
      notification.success({
        message: "Thành công",
        description: "Cập nhật trạng thái bài viết thành công!",
        placement: "topRight",
      });
      fetchBlogs();
    } catch (error) {
      console.error("Error toggling blog status:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi cập nhật trạng thái bài viết!",
        placement: "topRight",
      });
    }
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "image_url",
      key: "image_url",
      width: 120,
      render: (text: string) =>
        text ? <Image src={text} alt="Blog" className="h-16 w-24 object-cover" /> : "Không có ảnh",
    },
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    { title: "Tác giả", dataIndex: "author", key: "author" },
    {
      title: "Danh mục",
      dataIndex: "blog_category_id",
      key: "blog_category_id",
      render: (category: any) =>
        typeof category === "object" && category?.name ? category.name : "Chưa phân loại",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : "error"}>
          {status === "active" ? "Hoạt động" : "Bị ẩn"}
        </Tag>
      ),
    },
    {
      title: "Chức năng",
      key: "action",
      width: 160,
      render: (_: any, record: Blog) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => showModal(record)} />
          <Button size="small" onClick={() => handleToggleStatus(record)}>
            {record.status === "active" ? "Ẩn" : "Hiện"}
          </Button>
          <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card
        title={
          <div className="flex items-center gap-4">
            <Input
              placeholder="Tìm theo tiêu đề..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 160 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            >
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Bị ẩn</Option>
            </Select>
          </div>
        }
        bordered={false}
        className="shadow-sm"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            Thêm bài viết
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredBlogs}
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      <BlogModal visible={isModalVisible} onClose={closeModal} onReload={fetchBlogs} blog={editingBlog} />
    </motion.div>
  );
};

export default BlogList;
