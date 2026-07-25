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
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : "error"}>
          {status === "active" ? "Hoạt động" : "Bị khóa"}
        </Tag>
      ),
    },
    {
      title: "Chức năng",
      key: "action",
      width: 160,
      render: (_: any, record: Banner) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => showModal(record)}
          />
          <Button size="small" onClick={() => handleToggleStatus(record)}>
            {record.status === "active" ? "Khóa" : "Mở"}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title="Quản lý banner trang chủ"
        bordered={false}
        className="shadow-sm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Thêm banner
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={banners}
          loading={loading}
          pagination={false}
          className="overflow-x-auto"
        />
      </Card>

      <BannerModal
        visible={isModalVisible}
        onClose={closeModal}
        onReload={fetchBanners}
        banner={editingBanner}
      />
    </motion.div>
  );
};

export default BannerList;
