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
import brandApi from "../../api/brandApi";

const { Title } = Typography;

interface Brand {
  key: string;
  id: string;
  brand_name: string;
}

  const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const BrandManager: React.FC = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchBrands = async () => {
    try {
      const response = await brandApi.getAll();
      const brandData = response.data.result.map((brand: any) => ({
        key: brand._id,
        id: brand._id,
        brand_name: brand.brand_name,
      }));
      setBrands(brandData);
      setFilteredBrands(brandData); 
    } catch (error) {
      console.error("Lỗi khi lấy danh sách brand:", error);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "logoutEvent") {
        setBrands([]); 
        setFilteredBrands([]);
        setSearchText('');
      }
    };
  
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const normalizedSearchText = removeAccents(value.toLowerCase());

    const filtered = brands.filter(brand => {
      const normalizedBrandName = removeAccents(brand.brand_name.toLowerCase());
      return normalizedBrandName.includes(normalizedSearchText);
    });

    setFilteredBrands(filtered);
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 70,
      render: (_: any, __: Brand, index: number) => index + 1,
      align: "left" as const,
    },
    {
      title: "Tên Brand",
      dataIndex: "brand_name",
      key: "brand_name",
      width: 300, 
      align: "left" as const, 
    },
    {
      title: "Chức năng",
      key: "action",
      width: 150, 
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
      align: "left" as const, 
    },
  ];

  const handleEdit = (record: Brand) => {
    setSelectedBrand(record);
    form.setFieldsValue({ brand_name: record.brand_name });
    setIsEditModalVisible(true);
  };

  const handleDelete = (record: Brand) => {
    Modal.confirm({
      title: "Xác nhận",
      content: "Bạn có chắc muốn xóa brand này?",
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          await brandApi.delete(record.id);
          const updatedBrands = brands.filter((b) => b.key !== record.key);
          setBrands(updatedBrands);
          setFilteredBrands(updatedBrands);
          notification.success({
            message: "Thành công",
            description: "Brand đã được xóa thành công!",
            placement: "topRight",
            duration: 2,
          });
        } catch (error) {
          console.error("Lỗi khi xóa brand:", error);
          Modal.error({ title: "Lỗi", content: "Không thể xóa brand!" });
        }
      },
    });
  };

  const handleEditModalOk = () => {
    form.validateFields().then(async (values) => {
      if (selectedBrand) {
        try {
          await brandApi.update(selectedBrand.id, {
            brand_name: values.brand_name,
          });
          const updatedBrands = brands.map((b) =>
            b.key === selectedBrand.key
              ? { ...b, brand_name: values.brand_name }
              : b
          );
          setBrands(updatedBrands);
          setFilteredBrands(updatedBrands);
          setIsEditModalVisible(false);
          notification.success({
            message: "Thành công",
            description: "Brand đã được cập nhật thành công!",
            placement: "topRight",
            duration: 2,
          });
        } catch (error) {
          console.error("Lỗi khi cập nhật brand:", error);
          Modal.error({ title: "Lỗi", content: "Không thể cập nhật brand!" });
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
        const response = await brandApi.create({
          brand_name: values.brand_name,
        });
        console.log("API Response:", response);

        const brandId =
          response?.data?._id ||
          response?._id ||
          response?.id ||
          response?.data?.id;

        if (brandId) {
          const newBrand: Brand = {
            key: brandId,
            id: brandId,
            brand_name: values.brand_name,
          };
          const updatedBrands = [...brands, newBrand];
          setBrands(updatedBrands);
          setFilteredBrands(updatedBrands);
        } else {
          console.warn(
            "Không tìm thấy ID trong response, làm mới danh sách từ server"
          );
          await fetchBrands();
        }

        setIsAddModalVisible(false);
        form.resetFields();
        notification.success({
          message: "Thành công",
          description: "Brand đã được thêm thành công!",
          placement: "topRight",
          duration: 2,
        });
      } catch (error) {
        console.error("Lỗi khi thêm brand:", error);
        Modal.error({
          title: "Lỗi", content

            : "Không thể thêm brand!"
        });
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
              style={{ width: 250 }}
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
            Thêm Brand
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredBrands}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      <Modal
        title="Chỉnh sửa Brand"
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
              label="Tên Brand"
              name="brand_name"
              rules={[{ required: true, message: "Vui lòng nhập tên brand!" }]}
            >
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="Thêm Brand"
        open={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={handleModalCancel}
        okText="Thêm"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên Brand"
            name="brand_name"
            rules={[{ required: true, message: "Vui lòng nhập tên brand!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default BrandManager;