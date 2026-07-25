import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Upload, Button, message, Spin } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import bannerApi from "../../api/bannerApi";

const { Option } = Select;

interface BannerModalProps {
  visible: boolean;
  onClose: () => void;
  onReload: () => void;
  banner?: {
    _id: string;
    title: string;
    image_url: string;
    link_url: string;
    status: string;
  } | null;
}

const BannerModal: React.FC<BannerModalProps> = ({
  visible,
  onClose,
  onReload,
  banner,
}) => {
  const [form] = Form.useForm();
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (banner && visible) {
      form.setFieldsValue({
        title: banner.title,
        link_url: banner.link_url,
        status: banner.status,
      });
      setImageFileList(
        banner.image_url
          ? [
              {
                uid: "-1",
                name: "banner.png",
                status: "done",
                url: banner.image_url,
              },
            ]
          : []
      );
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({ status: "active" });
      setImageFileList([]);
    }
  }, [banner, visible, form]);

  const handleImageChange = ({ fileList }: any) => {
    setImageFileList(fileList.slice(-1));
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", values.title || "");
      formData.append("link_url", values.link_url || "");
      formData.append("status", values.status || "active");

      const newFile = imageFileList[0];
      if (newFile?.originFileObj) {
        formData.append("image_url", newFile.originFileObj);
      } else if (!banner) {
        message.error("Vui lòng chọn ảnh banner!");
        setLoading(false);
        return;
      }

      if (banner) {
        await bannerApi.update(banner._id, formData);
        message.success("Cập nhật banner thành công!");
      } else {
        await bannerApi.create(formData);
        message.success("Thêm banner thành công!");
      }
      onReload();
      onClose();
    } catch (error) {
      console.error("Submit banner error:", error);
      message.error("Lỗi khi lưu banner!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={banner ? "Chỉnh sửa banner" : "Thêm banner"}
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={600}
      confirmLoading={loading}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Tiêu đề">
            <Input placeholder="Nhập tiêu đề banner (chỉ hiển thị ở trang quản trị)" />
          </Form.Item>
          <Form.Item name="link_url" label="Đường dẫn khi click">
            <Input placeholder="https://... (để trống nếu không cần)" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select>
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Bị khóa</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Ảnh banner" required>
            <Upload
              listType="picture-card"
              fileList={imageFileList}
              onChange={handleImageChange}
              beforeUpload={() => false}
              maxCount={1}
            >
              {imageFileList.length < 1 && (
                <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default BannerModal;
