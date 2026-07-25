import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  notification,
} from "antd";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import userApi from "../../api/userApi";

const { Option } = Select;

interface User {
  key: string;
  _id: string;
  fullname: string;
  email: string;
  avatar: string;
  phone_number: string;
  createdAt: string;
  status: string;
  role: string;
}

const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const UserList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data } = await userApi.getAllUsers();
        const fetchedUsers = data.result.map((user: any) => ({
          key: user._id,
          _id: user._id,
          fullname: user.fullname || "Chưa đặt tên",
          email: user.email,
          avatar: user.avatar || "",
          phone_number: user.phone_number || "Chưa có",
          createdAt: new Date(user.createdAt).toLocaleDateString("vi-VN"),
          status: user.status === "active" ? "Hoạt động" : "Bị khóa",
          role: user.role || "USER",
        }));
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSearchAndFilter = (searchValue: string, statusValue: string | null) => {
    setSearchText(searchValue);
    setStatusFilter(statusValue);

    const normalizedSearchText = removeAccents(searchValue.toLowerCase());

    let filtered = users;

    if (searchValue) {
      filtered = filtered.filter(user => {
        const normalizedFullname = removeAccents(user.fullname.toLowerCase());
        const normalizedEmail = removeAccents(user.email.toLowerCase());
        return (
          normalizedFullname.includes(normalizedSearchText) ||
          normalizedEmail.includes(normalizedSearchText)
        );
      });
    }

    if (statusValue) {
      filtered = filtered.filter(user => user.status === statusValue);
    }

    setFilteredUsers(filtered);
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      render: (_: any, __: User, index: number) => index + 1,
    },
    {
      title: "Ảnh",
      key: "avatar",
      width: 100,
      render: (text: string, record: User) => (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "#e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {record.avatar ? (
            <img
              src={record.avatar}
              alt={record.fullname}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  '<span style="font-size: 20px; color: #888;">👤</span>';
              }}
            />
          ) : (
            <span style={{ fontSize: 20, color: "#888" }}>👤</span>
          )}
        </div>
      ),
    },
    {
      title: "Họ tên",
      dataIndex: "fullname",
      key: "fullname",
      width: 400,
      render: (text: string, record: User) => (
        <span style={{ whiteSpace: "pre-line" }}>
          {text}
          <br />
          {record.email}
        </span>
      ),
    },
    { title: "Số điện thoại", dataIndex: "phone_number", key: "phone_number" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 200,
      render: (status: string) => {
        let color = "";
        switch (status) {
          case "Hoạt động":
            color = "green";
            break;
          case "Bị khóa":
            color = "red";
            break;
          default:
            color = "gray";
        }
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 100,
    },
    {
      title: "Tính năng",
      key: "action",
      width: 150,
      render: (_: any, record: User) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
          </Button>
        </Space>
      ),
    },
  ];

  const handleEdit = (record: User) => {
    setSelectedUser(record);
    setIsModalVisible(true);
    form.setFieldsValue({
      fullname: record.fullname,
      email: record.email,
      phone_number: record.phone_number,
      status: record.status,
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const updatedData = {
        status: values.status === "Hoạt động" ? "active" : "inactive",
      };
      const { data } = await userApi.update(selectedUser?._id, updatedData);
      const updatedUsers = users.map((u) =>
        u.key === selectedUser?.key ? { ...u, status: values.status } : u
      );
      setUsers(updatedUsers);
      setFilteredUsers(
        updatedUsers.filter(user => {
          const normalizedFullname = removeAccents(user.fullname.toLowerCase());
          const normalizedEmail = removeAccents(user.email.toLowerCase());
          const normalizedSearchText = removeAccents(searchText.toLowerCase());
          const matchesSearch = searchText
            ? normalizedFullname.includes(normalizedSearchText) ||
              normalizedEmail.includes(normalizedSearchText)
            : true;
          const matchesStatus = statusFilter ? user.status === statusFilter : true;
          return matchesSearch && matchesStatus;
        })
      );
      setIsModalVisible(false);
      notification.success({
        message: "Thành công",
        description: "Trạng thái người dùng đã được cập nhật thành công!",
        placement: "topRight",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      notification.error({
        message: "Lỗi",
        description: "Có lỗi khi cập nhật trạng thái người dùng!",
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
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearchAndFilter(e.target.value, statusFilter)}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Lọc trạng thái"
              style={{ width: 150 }}
              allowClear
              onChange={(value) => handleSearchAndFilter(searchText, value)}
            >
              <Option value="Hoạt động">Hoạt động</Option>
              <Option value="Bị khóa">Bị khóa</Option>
            </Select>
          </div>
        }
        bordered={false} 
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
            position: ["bottomRight"],
            className: "custom-pagination",
          }}
          className="overflow-x-auto"
        />
      </Card>

      <Modal
        title="Thông tin người dùng"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
      >
        {selectedUser && (
          <Form form={form} layout="vertical">
            <Form.Item label="ID người dùng" name="_id">
              <Input value={selectedUser._id} disabled />
            </Form.Item>
            <Form.Item label="Tên tài khoản" name="fullname">
              <Input disabled />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input disabled />
            </Form.Item>
            <Form.Item label="Số điện thoại" name="phone_number">
              <Input disabled />
            </Form.Item>
            <Form.Item label="Ngày đăng ký">
              <Input value={selectedUser.createdAt} disabled />
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
    </motion.div>
  );
};

export default UserList;