import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Checkbox,
  Modal,
  Input,
  Select,
  Tag,
  Form,
  message,
  Space,
} from "antd";

import {
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

import { motion, AnimatePresence } from "framer-motion";
import { CSVLink } from "react-csv";

import userApi from "../../api/userApi";

const { Option } = Select;

interface User {
  key: string;
  userId: string;
  fullname: string;
  email: string;
  phone?: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
}

interface FilterParams {
  status?: string;
  role?: string;
  search?: string;
}

const CustomerList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  // ==============================
  // Lấy danh sách khách hàng
  // ==============================
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await userApi.getAll();

      console.log("Danh sách khách hàng:", response);

      if (!response.data || !response.data.result) {
        message.error("Không thể tải danh sách khách hàng");
        setUsers([]);
        return;
      }

      const formattedUsers: User[] = response.data.result.map(
        (user: any, index: number) => ({
          key: user._id || `user-${index}`,
          userId: user._id || "",
          fullname: user.fullname || "Không xác định",
          email: user.email || "Không xác định",
          phone: user.phone || "Chưa cập nhật",
          role: user.role || "USER",
          status: user.status || "ACTIVE",
          createdAt: user.createdAt
            ? new Date(user.createdAt).toLocaleDateString("vi-VN")
            : "Không xác định",
        })
      );

      const filteredUsers = applyFilters(formattedUsers);

      setUsers(filteredUsers);
    } catch (error: any) {
      console.error("Lỗi lấy danh sách khách hàng:", error);

      message.error("Tải danh sách khách hàng thất bại");

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Lọc dữ liệu
  // ==============================
  const applyFilters = (userList: User[]) => {
    return userList.filter((user) => {
      let matches = true;

      if (filters.status) {
        matches = matches && user.status === filters.status;
      }

      if (filters.role) {
        matches = matches && user.role === filters.role;
      }

      if (filters.search) {
        const searchRegex = new RegExp(filters.search, "i");

        matches =
          matches &&
          (searchRegex.test(user.fullname) ||
            searchRegex.test(user.email) ||
            searchRegex.test(user.userId));
      }

      return matches;
    });
  };

  // ==============================
  // Tìm kiếm
  // ==============================
  const handleSearch = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      search: value,
    }));
  };

  // ==============================
  // Lọc trạng thái
  // ==============================
  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status || undefined,
    }));
  };

  // ==============================
  // Lọc quyền
  // ==============================
  const handleRoleFilter = (role: string) => {
    setFilters((prev) => ({
      ...prev,
      role: role || undefined,
    }));
  };

  // ==============================
  // Xem chi tiết
  // ==============================
  const handleView = (record: User) => {
    setSelectedUser(record);

    form.setFieldsValue({
      status: record.status,
    });

    setIsModalVisible(true);
  };

  // ==============================
  // Xóa nhiều khách hàng
  // ==============================
  const handleDeleteAll = () => {
    if (selectedRows.length === 0) {
      message.warning("Vui lòng chọn ít nhất một khách hàng");
      return;
    }

    Modal.confirm({
      title: "Xác nhận xóa",
      content: `Bạn có chắc chắn muốn xóa ${selectedRows.length} khách hàng?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",

      onOk: async () => {
        try {
          await Promise.all(
            selectedRows.map((id) => userApi.delete(id))
          );

          message.success("Xóa khách hàng thành công");

          setSelectedRows([]);

          await fetchUsers();
        } catch (error) {
          console.error("Lỗi xóa:", error);

          message.error("Xóa khách hàng thất bại");
        }
      },
    });
  };

  // ==============================
  // Cập nhật trạng thái
  // ==============================
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (selectedUser) {
        await userApi.updateStatus(
          selectedUser.userId,
          values.status
        );

        message.success(
          "Cập nhật trạng thái thành công"
        );

        setIsModalVisible(false);

        await fetchUsers();
      }
    } catch (error) {
      console.error("Lỗi cập nhật:", error);

      message.error(
        "Cập nhật trạng thái thất bại"
      );
    }
  };

  // ==============================
  // Cột bảng
  // ==============================
  const columns = [
    {
      title: (
        <Checkbox
          checked={
            selectedRows.length === users.length &&
            users.length > 0
          }
          indeterminate={
            selectedRows.length > 0 &&
            selectedRows.length < users.length
          }
          onChange={(e) => {
            const keys = e.target.checked
              ? users.map((user) => user.key)
              : [];

            setSelectedRows(keys);
          }}
        />
      ),

      width: 50,

      render: (_: any, record: User) => (
        <Checkbox
          checked={selectedRows.includes(record.key)}
          onChange={(e) => {
            const keys = e.target.checked
              ? [...selectedRows, record.key]
              : selectedRows.filter(
                  (key) => key !== record.key
                );

            setSelectedRows(keys);
          }}
        />
      ),
    },

    {
      title: "Mã khách hàng",
      dataIndex: "userId",

      render: (text: string) => (
        <span>
          {text.substring(0, 8)}...
        </span>
      ),
    },

    {
      title: "Khách hàng",
      dataIndex: "fullname",

      render: (text: string) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-blue-500">
              {text?.charAt(0).toUpperCase()}
            </span>
          </div>

          <span className="ml-3">
            {text}
          </span>
        </div>
      ),
    },

    {
      title: "Email",
      dataIndex: "email",
    },

    {
      title: "Số điện thoại",
      dataIndex: "phone",
    },

    {
      title: "Quyền",
      dataIndex: "role",

      render: (role: string) => (
        <Tag
          color={
            role === "ADMIN"
              ? "red"
              : "blue"
          }
        >
          {role}
        </Tag>
      ),
    },

    {
      title: "Trạng thái",
      dataIndex: "status",

      render: (status: string) => (
        <Tag
          color={
            status === "ACTIVE"
              ? "success"
              : "error"
          }
        >
          {status === "ACTIVE"
            ? "Hoạt động"
            : "Ngừng hoạt động"}
        </Tag>
      ),
    },

    {
      title: "Tính năng",

      render: (_: any, record: User) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          className="bg-blue-400"
        />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gray-50 min-h-screen"
    >
      <div className="max-w-7xl mx-auto">
        <Card
          bordered={false}
          className="shadow-sm bg-white rounded-lg"
          title={
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              
              <div className="flex-1 max-w-md">
                <Input.Search
                  placeholder="Tìm kiếm khách hàng..."
                  allowClear
                  enterButton
                  onSearch={handleSearch}
                />
              </div>

              <Space wrap>
                <Select
                  placeholder="Trạng thái"
                  allowClear
                  style={{ width: 150 }}
                  onChange={handleStatusFilter}
                >
                  <Option value="ACTIVE">
                    Hoạt động
                  </Option>

                  <Option value="INACTIVE">
                    Ngừng hoạt động
                  </Option>
                </Select>

                <Select
                  placeholder="Quyền"
                  allowClear
                  style={{ width: 120 }}
                  onChange={handleRoleFilter}
                >
                  <Option value="ADMIN">
                    ADMIN
                  </Option>

                  <Option value="USER">
                    USER
                  </Option>
                </Select>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchUsers}
                >
                  Làm mới
                </Button>

                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedRows.length === 0}
                  onClick={handleDeleteAll}
                >
                  Xóa ({selectedRows.length})
                </Button>

                <CSVLink
                  data={users}
                  filename="customers.csv"
                  className="flex items-center"
                >
                  <DownloadOutlined className="mr-2" />

                  Xuất CSV
                </CSVLink>
              </Space>
            </div>
          }
        >
          <Table
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={{
              total: users.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) =>
                `Tổng ${total} khách hàng`,
            }}
            scroll={{ x: true }}
          />
        </Card>

        {/* Modal chi tiết */}
        <Modal
          title="Chi tiết khách hàng"
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
          okText="Lưu thay đổi"
          cancelText="Hủy"
        >
          <AnimatePresence>
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <p>
                    <b>Mã khách hàng:</b>{" "}
                    {selectedUser.userId}
                  </p>

                  <p>
                    <b>Họ tên:</b>{" "}
                    {selectedUser.fullname}
                  </p>

                  <p>
                    <b>Email:</b>{" "}
                    {selectedUser.email}
                  </p>

                  <p>
                    <b>Số điện thoại:</b>{" "}
                    {selectedUser.phone}
                  </p>

                  <p>
                    <b>Quyền:</b>{" "}
                    {selectedUser.role}
                  </p>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                >
                  <Form.Item
                    label="Cập nhật trạng thái"
                    name="status"
                    rules={[
                      {
                        required: true,
                        message:
                          "Vui lòng chọn trạng thái",
                      },
                    ]}
                  >
                    <Select>
                      <Option value="ACTIVE">
                        Hoạt động
                      </Option>

                      <Option value="INACTIVE">
                        Ngừng hoạt động
                      </Option>
                    </Select>
                  </Form.Item>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </Modal>
      </div>
    </motion.div>
  );
};

export default CustomerList;