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
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import brandApi from "../../api/brandApi";

const { Title } = Typography;

interface Brand {
  key: string;
  id: string;
  name: string;
}

const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const BrandManager: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);

  const [searchText, setSearchText] = useState("");

  const [form] = Form.useForm();

  // =========================
  // LẤY DANH SÁCH BRAND
  // =========================
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await brandApi.getAll();

        const brandData = response.data.result.map((brand: any) => ({
          key: brand._id,
          id: brand._id,
          name: brand.brand_name || brand.name,
        }));

        setBrands(brandData);
        setFilteredBrands(brandData);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách brand:", error);

        notification.error({
          message: "Lỗi",
          description: "Không thể lấy danh sách thương hiệu!",
          placement: "topRight",
        });
      }
    };

    fetchBrands();
  }, []);

  // =========================
  // TÌM KIẾM
  // =========================
  const handleSearch = (value: string) => {
    setSearchText(value);

    const normalizedSearchText = removeAccents(value.toLowerCase());

    const filtered = brands.filter((brand) => {
      const normalizedBrandName = removeAccents(
        brand.name.toLowerCase()
      );

      return normalizedBrandName.includes(normalizedSearchText);
    });

    setFilteredBrands(filtered);
  };

  // =========================
  // SỬA BRAND
  // =========================
  const handleEdit = (record: Brand) => {
    setSelectedBrand(record);

    form.setFieldsValue({
      name: record.name,
    });

    setIsEditModalVisible(true);
  };

  // =========================
  // XÓA BRAND
  // =========================
  const handleDelete = (record: Brand) => {
    Modal.confirm({
      title: "Xác nhận",
      content: "Bạn có chắc muốn xóa thương hiệu này?",
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",

      onOk: async () => {
        try {
          await brandApi.delete(record.id);

          const updatedBrands = brands.filter(
            (brand) => brand.key !== record.key
          );

          setBrands(updatedBrands);
          setFilteredBrands(updatedBrands);

          notification.success({
            message: "Thành công",
            description: "Thương hiệu đã được xóa thành công!",
            placement: "topRight",
            duration: 2,
          });
        } catch (error) {
          console.error("Lỗi khi xóa brand:", error);

          Modal.error({
            title: "Lỗi",
            content: "Không thể xóa thương hiệu!",
          });
        }
      },
    });
  };

  // =========================
  // LƯU CHỈNH SỬA
  // =========================
  const handleEditModalOk = () => {
    form.validateFields().then(async (values) => {
      if (!selectedBrand) return;

      try {
        await brandApi.update(selectedBrand.id, {
          brand_name: values.name,
        });

        const updatedBrands = brands.map((brand) =>
          brand.key === selectedBrand.key
            ? {
                ...brand,
                name: values.name,
              }
            : brand
        );

        setBrands(updatedBrands);
        setFilteredBrands(updatedBrands);

        setIsEditModalVisible(false);

        notification.success({
          message: "Thành công",
          description: "Thương hiệu đã được cập nhật thành công!",
          placement: "topRight",
          duration: 2,
        });
      } catch (error) {
        console.error("Lỗi khi cập nhật brand:", error);

        Modal.error({
          title: "Lỗi",
          content: "Không thể cập nhật thương hiệu!",
        });
      }
    });
  };

  // =========================
  // MỞ MODAL THÊM
  // =========================
  const handleAddModalOpen = () => {
    form.resetFields();
    setIsAddModalVisible(true);
  };

  // =========================
  // THÊM BRAND
  // =========================
  const handleAddModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const response = await brandApi.create({
          brand_name: values.name,
        });

        const brandId =
          response.brand?._id ||
          response.data?._id ||
          response._id;

        if (!brandId) {
          throw new Error("Không tìm thấy ID trong response");
        }

        const newBrand: Brand = {
          key: brandId,
          id: brandId,
          name: values.name,
        };

        const updatedBrands = [...brands, newBrand];

        setBrands(updatedBrands);
        setFilteredBrands(updatedBrands);

        setIsAddModalVisible(false);

        form.resetFields();

        notification.success({
          message: "Thành công",
          description: "Thương hiệu đã được thêm thành công!",
          placement: "topRight",
          duration: 2,
        });
      } catch (error) {
        console.error("Lỗi khi thêm brand:", error);

        Modal.error({
          title: "Lỗi",
          content: "Không thể thêm thương hiệu!",
        });
      }
    });
  };

  // =========================
  // ĐÓNG MODAL
  // =========================
  const handleModalCancel = () => {
    setIsEditModalVisible(false);
    setIsAddModalVisible(false);

    form.resetFields();
    setSelectedBrand(null);
  };

  // =========================
  // COLUMNS
  // =========================
  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 70,
      align: "left" as const,

      render: (_: any, __: Brand, index: number) => index + 1,
    },

    {
      title: "Tên thương hiệu",
      dataIndex: "name",
      key: "name",
      width: 300,
      align: "left" as const,
    },

    {
      title: "Chức năng",
      key: "action",
      width: 150,
      align: "left" as const,

      render: (_: any, record: Brand) => (
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
    },
  ];

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
      }}
    >
      <Card
        title={
          <div className="flex items-center gap-4">
            <Input
              placeholder="Tìm kiếm..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: 200,
              }}
            />
          </div>
        }
        bordered={false}
        className="shadow-sm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddModalOpen}
          >
            Thêm thương hiệu
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredBrands}
          pagination={{
            pageSize: 10,
          }}
          className="overflow-x-auto"
        />
      </Card>

      {/* =========================
          MODAL SỬA
      ========================= */}
      <Modal
        title="Chỉnh sửa thương hiệu"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={handleModalCancel}
        okText="Lưu & Đóng"
        cancelText="Hủy bỏ"
      >
        {selectedBrand && (
          <Form form={form} layout="vertical">
            <Form.Item label="ID">
              <Input value={selectedBrand.id} disabled />
            </Form.Item>

            <Form.Item
              label="Tên thương hiệu"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập tên thương hiệu!",
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* =========================
          MODAL THÊM
      ========================= */}
      <Modal
        title="Thêm mới thương hiệu"
        open={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={handleModalCancel}
        okText="Thêm mới"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên thương hiệu"
            name="name"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập tên thương hiệu!",
              },
            ]}
          >
            <Input placeholder="Nhập tên thương hiệu..." />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default BrandManager;