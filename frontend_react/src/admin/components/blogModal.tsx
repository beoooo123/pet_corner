import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Modal, Form, Input, Select, Upload, Button, message, Spin } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import blogApi from "../../api/blogApi";
import blogCategoryApi from "../../api/blogCategoryApi";

const { Option } = Select;

interface BlogModalProps {
  visible: boolean;
  onClose: () => void;
  onReload: () => void;
  blog?: {
    _id: string;
    title: string;
    content: string;
    author: string;
    image_url: string;
    status: string;
    blog_category_id?: string | { _id: string; name?: string };
  } | null;
}

const BlogModal: React.FC<BlogModalProps> = ({ visible, onClose, onReload, blog }) => {
  const [form] = Form.useForm();
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await blogCategoryApi.getAll();
        const categoryData = Array.isArray(response.data.result) ? response.data.result : [];
        setCategories(categoryData);
      } catch (error) {
        console.error("Error fetching blog categories:", error);
        setCategories([]);
      }
    };

    if (visible) {
      fetchCategories();
    }
  }, [visible]);

  useEffect(() => {
    if (blog && visible) {
      form.setFieldsValue({
        title: blog.title,
        author: blog.author,
        status: blog.status,
        content: blog.content,
        blog_category_id:
          typeof blog.blog_category_id === "string" ? blog.blog_category_id : blog.blog_category_id?._id,
      });
      setImageFileList(
        blog.image_url
          ? [
              {
                uid: "-1",
                name: "blog.png",
                status: "done",
                url: blog.image_url,
              },
            ]
          : []
      );
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({ status: "active" });
      setImageFileList([]);
    }
  }, [blog, visible, form]);

  const handleImageChange = ({ fileList }: any) => {
    setImageFileList(fileList.slice(-1));
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", values.title || "");
      formData.append("author", values.author || "");
      formData.append("content", values.content || "");
      formData.append("blog_category_id", values.blog_category_id || "");
      formData.append("status", values.status || "active");

      const newFile = imageFileList[0];
      if (newFile?.originFileObj) {
        formData.append("image_url", newFile.originFileObj);
      }

      if (blog) {
        await blogApi.update(blog._id, formData);
        message.success("Cập nhật bài viết thành công!");
      } else {
        await blogApi.create(formData);
        message.success("Thêm bài viết thành công!");
      }
      onReload();
      onClose();
    } catch (error) {
      console.error("Submit blog error:", error);
      message.error("Lỗi khi lưu bài viết!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={blog ? "Chỉnh sửa bài viết" : "Thêm bài viết"}
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={800}
      confirmLoading={loading}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề bài viết!" }]}
          >
            <Input placeholder="Nhập tiêu đề bài viết" />
          </Form.Item>
          <Form.Item
            name="author"
            label="Tác giả"
            rules={[{ required: true, message: "Vui lòng nhập tên tác giả!" }]}
          >
            <Input placeholder="Nhập tên tác giả" />
          </Form.Item>
          <Form.Item name="blog_category_id" label="Danh mục">
            <Select placeholder="Chọn danh mục" allowClear>
              {categories.map((category) => (
                <Option key={category._id} value={category._id}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select>
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Bị ẩn</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: "Vui lòng nhập nội dung bài viết!" }]}
          >
            <ReactQuill
              theme="snow"
              value={form.getFieldValue("content")}
              onChange={(value) => form.setFieldsValue({ content: value })}
              placeholder="Nhập nội dung bài viết"
            />
          </Form.Item>
          <Form.Item label="Ảnh đại diện">
            <Upload
              listType="picture-card"
              fileList={imageFileList}
              onChange={handleImageChange}
              beforeUpload={() => false}
              maxCount={1}
            >
              {imageFileList.length < 1 && <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>}
            </Upload>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default BlogModal;
