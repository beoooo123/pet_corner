import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Space,
  notification,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { Typography } from "antd";
import tagApi from "../../api/tagApi";

const { Title } = Typography;

interface Tag {
  key: string;
  id: string;
  name: string;
}

const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const TagManager: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await tagApi.getAll();
        const tagData = response.data.result.map((tag: any) => ({
          key: tag._id,
          id: tag._id,
          name: tag.tag_name || tag.name,
        }));
        setTags(tagData);
        setFilteredTags(tagData); 
      } catch (error) {
        console.error("Lỗi khi lấy danh sách tag:", error);
      }
    };
    fetchTags();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const normalizedSearchText = removeAccents(value.toLowerCase());
    
    const filtered = tags.filter(tag => {
      const normalizedTagName = removeAccents(tag.name.toLowerCase());
      return normalizedTagName.includes(normalizedSearchText);
    });
    
    setFilteredTags(filtered);
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 70, 
      render: (_: any, __: Tag, index: number) => index + 1,
      align: "left" as const,
    },
    {
      title: "Tên Tag",
      dataIndex: "name",
      key: "name",
      width: 300, 
      align: "left" as const,
    },
    {
      title: "Chức năng",
      key: "action",
      width: 150, 
      render: (_: any, record: Tag) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record)}
            size="small"
          />
        </Space>
      ),
      align: "left" as const, // Left aligned
    },
  ];

  const handleEdit = (record: Tag) => {
    setSelectedTag(record);
    form.setFieldsValue({ name: record.name });
    setIsEditModalVisible(true);
  };

  const handleDelete = (record: Tag) => {
    Modal.confirm({
      title: "Xác nhận",
      content: "Bạn có chắc muốn xóa tag này?",
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          await tagApi.delete(record.id);
          const updatedTags = tags.filter((t) => t.key !== record.key);
          setTags(updatedTags);
          setFilteredTags(updatedTags);
          notification.success({
            message: "Thành công",
            description: "Tag đã được xóa thành công!",
            placement: "topRight",
            duration: 2,
          });
        } catch (error) {
          console.error("Lỗi khi xóa tag:", error);
          Modal.error({ title: "Lỗi", content: "Không thể xóa tag!" });
        }
      },
    });
  };

  const handleEditModalOk = () => {
    form.validateFields().then(async (values) => {
      if (selectedTag) {
        try {
          await tagApi.update(selectedTag.id, { tag_name: values.name });
          const updatedTags = tags.map((t) =>
            t.key === selectedTag.key ? { ...t, name: values.name } : t
          );
          setTags(updatedTags);
          setFilteredTags(updatedTags);
          setIsEditModalVisible(false);
          notification.success({
            message: "Thành công",
            description: "Tag đã được cập nhật thành công!",
            placement: "topRight",
            duration: 2,
          });
        } catch (error) {
          console.error("Lỗi khi cập nhật tag:", error);
          Modal.error({ title: "Lỗi", content: "Không thể cập nhật tag!" });
        }
      }
    });
  };

  const handleAddModalOpen = () => {
    form.resetFields();
    setIsAddModalVisible(true);
  };

  const handleAddModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const response = await tagApi.create({ tag_name: values.name });
        const tagId = response.tag?._id || response.data?._id || response._id;
        if (!tagId) {
          throw new Error("Không tìm thấy ID trong response");
        }
        const newTag: Tag = {
          key: tagId,
          id: tagId,
          name: values.name,
        };
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        setFilteredTags(updatedTags);
        setIsAddModalVisible(false);
        form.resetFields();
        notification.success({
          message: "Thành công",
          description: "Tag đã được thêm thành công!",
          placement: "topRight",
          duration: 2,
        });
      } catch (error) {
        console.error("Lỗi khi thêm tag:", error);
        Modal.error({ title: "Lỗi", content: "Không thể thêm tag!" });
      }
    });
  };

  const handleModalCancel = () => {
    setIsEditModalVisible(false);
    setIsAddModalVisible(false);
    form.resetFields();
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
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 200 }}
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
              onClick={handleAddModalOpen}
            >
              Thêm Tag
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredTags}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      <Modal
        title="Chỉnh sửa Tag"
        visible={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={handleModalCancel}
        okText="Lưu & Đóng"
        cancelText="Hủy bỏ"
      >
        {selectedTag && (
          <Form form={form} layout="vertical">
            <Form.Item label="ID">
              <Input value={selectedTag.id} disabled />
            </Form.Item>
            <Form.Item
              label="Tên Tag"
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập tên tag!" }]}
            >
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="Thêm mới Tag"
        visible={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={handleModalCancel}
        okText="Thêm mới"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên Tag"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên tag!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default TagManager;