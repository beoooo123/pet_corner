import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, message, Spin } from "antd";
import categoryApi from "../../api/categoryApi";

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onReload: () => void;
  category?: {
    _id: string;
    name: string;
    description?: string;
  } | null;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onReload,
  category,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category && visible) {
      form.setFieldsValue({
        name: category.name,
        description: category.description || "",
      });
    } else {
      form.resetFields();
    }
  }, [category, visible, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const data = {
        name: values.name,
        description: values.description || "",
      };

      if (category) {
        await categoryApi.update(category._id, data);
        message.success("Cập nhật danh mục thành công!");
      } else {
        await categoryApi.create(data);
        message.success("Thêm danh mục thành công!");
      }

      onReload();
      onClose();
      form.resetFields();
    } catch (error) {
      console.error("Submit error:", error);
      message.error("Lỗi khi lưu danh mục!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={category ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={600}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập tên danh mục!",
              },
              {
                min: 2,
                message: "Tên danh mục phải có ít nhất 2 ký tự!",
              },
            ]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả danh mục"
          >
            <Input.TextArea
              rows={5}
              placeholder="Nhập mô tả danh mục"
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CategoryModal;