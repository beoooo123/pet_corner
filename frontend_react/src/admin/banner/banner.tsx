import React, { useEffect, useState } from "react";
import { Card, Button, Table, Modal, Space, Tag, notification, Image } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import bannerApi from "../../api/bannerApi";
import BannerModal from "../components/bannerModal";

interface Banner {
  key: string;
  _id: string;
  title: string;
  image_url: string;
  link_url: string;
  order: number;
  status: string;
}

const BannerList: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await bannerApi.getAll();
      const bannerList = response.data.data || [];
      const formatted = bannerList
        .map((banner: any) => ({
          key: banner._id,
          _id: banner._id,
          title: banner.title,
          image_url: banner.image_url,
          link_url: banner.link_url,
          order: banner.order,
          status: banner.status,
        }))
        .sort((a: Banner, b: Banner) => a.order - b.order);
      setBanners(formatted);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách banner:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi tải danh sách banner!",
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  };

  const showModal = (banner?: Banner) => {
    setEditingBanner(banner || null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingBanner(null);
  };

  const handleDelete = (record: Banner) => {
    Modal.confirm({
      title: "Xác nhận",
      content: `Bạn có chắc chắn muốn xóa banner "${record.title || record._id}"?`,
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          await bannerApi.delete(record._id);
          notification.success({
            message: "Thành công",
            description: "Đã xóa banner thành công!",
            placement: "topRight",
          });
          fetchBanners();
        } catch (error) {
          console.error("Error deleting banner:", error);
          notification.error({
            message: "Lỗi",
            description: "Không thể xóa banner!",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleToggleStatus = async (record: Banner) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    try {
      await bannerApi.toggleStatus(record._id, newStatus);
      notification.success({
        message: "Thành công",
        description: "Cập nhật trạng thái banner thành công!",
        placement: "topRight",
      });
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner status:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi cập nhật trạng thái banner!",
        placement: "topRight",
      });
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const current = banners[index];
    const target = banners[targetIndex];

    try {
      await bannerApi.reorder([
        { id: current._id, order: target.order },
        { id: target._id, order: current.order },
      ]);
      fetchBanners();
    } catch (error) {
      console.error("Error reordering banner:", error);
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi cập nhật thứ tự banner!",
        placement: "topRight",
      });
    }
  };

  const columns = [
    {
      title: "Thứ tự",
      key: "order",
      width: 100,
      render: (_: any, _record: Banner, index: number) => (
        <Space>
          <span>{index + 1}</span>
          <Button
            icon={<ArrowUpOutlined />}
            size="small"
            disabled={index === 0}
            onClick={() => handleMove(index, "up")}
          />
          <Button
            icon={<ArrowDownOutlined />}
            size="small"
            disabled={index === banners.length - 1}
            onClick={() => handleMove(index, "down")}
          />
        </Space>
      ),
    },
    {
      title: "Ảnh",
      dataIndex: "image_url",
      key: "image_url",
      width: 180,
      render: (text: string) => (
        <Image src={text} alt="Banner" className="h-20 w-32 object-cover" />
      ),
    },
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    { title: "Đường dẫn", dataIndex: "link_url", key: "link_url" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Space,
  Tag,
  notification,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import categoryApi from "../../api/categoryApi";
import CategoryModal from "../components/categoryModal";

interface Category {
  key: string;
  _id: string;
  name: string;
  description: string;
  order: number;
  status: string;
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);

    try {
      const response = await categoryApi.getAll();

      const categoryList = response.data.data || [];

      const formatted = categoryList
        .map((category: any) => ({
          key: category._id,
          _id: category._id,
          name: category.name,
          description: category.description,
          order: category.order,
          status: category.status,
        }))
        .sort(
          (a: Category, b: Category) =>
            a.order - b.order
        );

      setCategories(formatted);
    } catch (error) {
      console.error(
        "Lỗi khi lấy danh sách danh mục:",
        error
      );

      notification.error({
        message: "Lỗi",
        description:
          "Lỗi khi tải danh sách danh mục!",
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  };

  const showModal = (category?: Category) => {
    setEditingCategory(category || null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingCategory(null);
  };

  const handleDelete = (record: Category) => {
    Modal.confirm({
      title: "Xác nhận",
      content: `Bạn có chắc chắn muốn xóa danh mục "${record.name}"?`,
      okText: "Đồng ý",
      cancelText: "Hủy bỏ",

      onOk: async () => {
        try {
          await categoryApi.delete(record._id);

          notification.success({
            message: "Thành công",
            description:
              "Đã xóa danh mục thành công!",
            placement: "topRight",
          });

          fetchCategories();
        } catch (error) {
          console.error(
            "Error deleting category:",
            error
          );

          notification.error({
            message: "Lỗi",
            description:
              "Không thể xóa danh mục!",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleToggleStatus = async (
    record: Category
  ) => {
    const newStatus =
      record.status === "active"
        ? "inactive"
        : "active";

    try {
      await categoryApi.toggleStatus(
        record._id,
        newStatus
      );

      notification.success({
        message: "Thành công",
        description:
          "Cập nhật trạng thái danh mục thành công!",
        placement: "topRight",
      });

      fetchCategories();
    } catch (error) {
      console.error(
        "Error toggling category status:",
        error
      );

      notification.error({
        message: "Lỗi",
        description:
          "Lỗi khi cập nhật trạng thái danh mục!",
        placement: "topRight",
      });
    }
  };

  const handleMove = async (
    index: number,
    direction: "up" | "down"
  ) => {
    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= categories.length
    ) {
      return;
    }

    const current = categories[index];
    const target = categories[targetIndex];

    try {
      await categoryApi.reorder([
        {
          id: current._id,
          order: target.order,
        },
        {
          id: target._id,
          order: current.order,
        },
      ]);

      fetchCategories();
    } catch (error) {
      console.error(
        "Error reordering category:",
        error
      );

      notification.error({
        message: "Lỗi",
        description:
          "Lỗi khi cập nhật thứ tự danh mục!",
        placement: "topRight",
      });
    }
  };

  const columns = [
    {
      title: "Thứ tự",
      key: "order",
      width: 150,

      render: (
        _: any,
        _record: Category,
        index: number
      ) => (
        <Space>
          <span>{index + 1}</span>

          <Button
            icon={<ArrowUpOutlined />}
            size="small"
            disabled={index === 0}
            onClick={() =>
              handleMove(index, "up")
            }
          />

          <Button
            icon={<ArrowDownOutlined />}
            size="small"
            disabled={
              index === categories.length - 1
            }
            onClick={() =>
              handleMove(index, "down")
            }
          />
        </Space>
      ),
    },

    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
    },

    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
    },

    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",

      render: (status: string) => (
        <Tag
          color={
            status === "active"
              ? "success"
              : "error"
          }
        >
          {status === "active"
            ? "Hoạt động"
            : "Bị khóa"}
        </Tag>
      ),
    },

    {
      title: "Chức năng",
      key: "action",
      width: 180,

      render: (
        _: any,
        record: Category
      ) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() =>
              showModal(record)
            }
          />

          <Button
            size="small"
            onClick={() =>
              handleToggleStatus(record)
            }
          >
            {record.status === "active"
              ? "Khóa"
              : "Mở"}
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() =>
              handleDelete(record)
            }
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
        title="Quản lý danh mục"
        bordered={false}
        className="shadow-sm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Thêm danh mục
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
          pagination={false}
          className="overflow-x-auto"
        />
      </Card>

      <CategoryModal
        visible={isModalVisible}
        onClose={closeModal}
        onReload={fetchCategories}
        category={editingCategory}
      />
    </motion.div>
  );
};

export default CategoryList;

export default BannerList;
