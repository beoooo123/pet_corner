import React, { useState, useEffect } from "react";
import { Card, Row, Col, Table, Tag, Statistic, message } from "antd";
import {
  UserOutlined,
  ExceptionOutlined,
  CalendarOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { Typography } from "antd";
import { Link } from "react-router-dom";
import userApi from "../../api/userApi";
import productsApi from "../../api/productsApi";
import orderApi from "../../api/orderApi";
import orderDetailApi from "../../api/orderDetailApi";
import moment from "moment";

const tableContainerStyle = {
  overflowY: "auto",
} as React.CSSProperties;

const { Text } = Typography;

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [canceledAppointments, setCanceledAppointments] = useState(0);
  const [currentPageOrders, setCurrentPageOrders] = useState(1);
  const [newCustomers, setNewCustomers] = useState<Customer[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPageHotProducts, setCurrentPageHotProducts] = useState(1);

  interface Customer {
    avatar?: string;
    fullname?: string;
    name?: string;
    status?: string;
    totalQuantity?: number;
  }

  interface Product {
    orderDetailId: string;
    productId: string | null;
    productName: string;
    productPrice: number;
    productImage: string | null;
    quantity: number;
    totalPrice: number;
  }

  interface Order {
    key: string;
    orderId: string;
    shortId: string;
    fullname: string;
    paymentType: string;
    delivery: string;
    total: string;
    status: "PENDING" | "PROCESSING" | "SHIPPING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    products?: Product[];
  }

  useEffect(() => {
    const updateTime = () => {
      const today = new Date();
      const weekday = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
      ];
      const day = weekday[today.getDay()];
      let dd = today.getDate().toString().padStart(2, "0");
      let mm = (today.getMonth() + 1).toString().padStart(2, "0");
      const yyyy = today.getFullYear();
      const h = today.getHours();
      const m = today.getMinutes().toString().padStart(2, "0");
      const s = today.getSeconds().toString().padStart(2, "0");

      setCurrentDate(`${day}, ${dd}/${mm}/${yyyy}`);
      setCurrentTime(`${h} giờ ${m} phút ${s} giây`);
    };

    updateTime();
    const timerId = setInterval(updateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const usersResponse = await userApi.getAllUsers();
        setTotalUsers(usersResponse.data.result?.length || 0);

        const loyalUsers = await userApi.getLoyalUsers();
        const limitedCustomers = (loyalUsers.data.result || []).slice(0, 4).map((customer: any) => ({
          ...customer,
          totalQuantity: customer.totalQuantity || 0
        }));
        setNewCustomers(limitedCustomers);

        const pendingOrders = await orderApi.getPendingOrders();
        const recentOrders = pendingOrders.data.result || [];

        const formattedOrders = recentOrders.map((order: any, index: number) => ({
          key: index.toString(),
          orderId: order.orderId || `ORDER${index}`,
          shortId: order.orderId ? `**${order.orderId.slice(-4)}` : "N/A",
          paymentType: order.paymentType || "Không xác định",
          delivery: order.delivery || "Không xác định",
          total: order.totalPrice || "0 VNĐ",
          fullname: order.fullname || "Khách vãng lai",
          status: order.status || "PENDING",
          products: order.products || []
        }));

        setOrders(formattedOrders);
        setTotalOrders(recentOrders.length);

        const outOfStockResponse = await productsApi.getProductOutStock();
        const outOfStockItems = outOfStockResponse.data.result || [];
        const formattedOutOfStockItems = outOfStockItems.map(
          (product: any) => ({
            key: product._id,
            _id: product._id,
            name: product.name,
            image: product.image_url?.[0] || "https://via.placeholder.com/64",
            images: product.image_url || [],
            quantity: product.quantity || 0,
            status: product.status,
            price: product.price,
            category: product.category_id?.name || "Không xác định",
            brand: product.brand_id?.brand_name || "Không có thương hiệu",
            tag: product.tag_id?.tag_name || "Không có thẻ",
          })
        );
        setOutOfStockProducts(formattedOutOfStockItems);

        const hotProductsResponse = await productsApi.getHotproducts();
        const hotProductsItems = hotProductsResponse.data.result || [];
        const formattedHotProducts = hotProductsItems.map((product: any) => ({
          key: product._id,
          _id: product._id,
          shortId: product._id ? `**${product._id.slice(-4)}` : "N/A",
          name: product.name,
          image: product.image_url?.[0] || "https://via.placeholder.com/64",
          images: product.image_url || [],
          quantity: product.quantity || 0,
          price: product.price,
          quantity_sold: product.quantity_sold || 0,
          category: product.category_id?.name || "Không xác định",
          brand: product.brand_id?.brand_name || "Không có thương hiệu",
          tag: product.tag_id?.tag_name || "Không có thẻ",
        }));
        setHotProducts(formattedHotProducts);

        const allBookingsResponse = await orderDetailApi.getAllBookings();
        const allBookings = allBookingsResponse.data || [];
        setTotalAppointments(allBookings.length);

        const cancelledBookingsResponse = await orderDetailApi.getCancelled();
        if (cancelledBookingsResponse) {
          const cancelledBookings = cancelledBookingsResponse.data || [];
          setCanceledAppointments(cancelledBookings.length);
        } else {
          setCanceledAppointments(0);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu dashboard:", error);
        message.error("Lỗi khi tải dữ liệu dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const ordersColumns = [
    {
      title: "ID đơn hàng",
      dataIndex: "shortId",
      key: "shortId",
      width: 80,
    },
    {
      title: "Khách hàng",
      dataIndex: "fullname",
      key: "fullname",
      width: 150,
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 200,
    },
    {
      title: "Giao hàng",
      dataIndex: "delivery",
      key: "delivery",
      width: 200,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      width: 100,
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_: any, record: Order) => (
        <Link to={`/admin/orders?orderId=${record.orderId}`}>
          <RightOutlined className="text-blue-500" />
        </Link>
      ),
    },
  ];

  const productColumns = [
    {
      title: "Mã SP",
      dataIndex: "shortId",
      key: "shortId",
      width: 100,
    },
    { title: "Tên", dataIndex: "name", key: "name", width: 150 },
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 80,
      render: (text) => (
        <img src={text || "https://via.placeholder.com/64"} alt="Sản phẩm" className="object-cover w-16 h-16" />
      ),
    },
    {
      title: "Số lượng đã bán",
      dataIndex: "quantity_sold",
      key: "quantity_sold",
      width: 100,
      render: (quantity_sold: number) => quantity_sold || 0,
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      width: 100,
      render: (price) => `${price?.toLocaleString() || 0} VNĐ`,
    },
    { title: "Danh mục", dataIndex: "category", key: "category", width: 100 },
    { title: "Thương hiệu", dataIndex: "brand", key: "brand", width: 100 },
    {
      title: "Thẻ",
      dataIndex: "tag",
      key: "tag",
      width: 100,
      render: (tag) => (tag ? <Tag color="blue">{tag}</Tag> : "Không có"),
    },
  ];

  const customerColumns = [
    {
      title: "Khách hàng",
      dataIndex: "fullname",
      key: "fullname",
      render: (_: any, record: Customer) => (
        <div className="flex items-center space-x-2">
          <img
            src={
              record.avatar ||
              "https://img.lovepik.com/png/20231127/young-businessman-3d-cartoon-avatar-portrait-character-digital_708913_wh860.png"
            }
            alt="avatar"
            className="rounded-full w-8 h-8"
          />
          <Text>{record.fullname || record.name || "Không xác định"}</Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => <Text className="text-sm text-blue-600">{status || "Hoạt động"}</Text>,
    },
    {
      title: "Đơn hoàn thành",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      render: (totalQuantity: number) => <Text>{totalQuantity || 0}</Text>,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={8} lg={8}>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <a href="/admin/users">
                <Card bordered={false} className="shadow-sm">
                  <Statistic
                    title="Tổng số người dùng"
                    value={totalUsers}
                    prefix={
                      <UserOutlined className="mr-2 text-xl text-cyan-500" />
                    }
                    suffix="tài khoản"
                    loading={loading}
                  />
                </Card>
              </a>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <a href="/admin/products?status=out_of_stock">
                <Card bordered={false} className="shadow-sm">
                  <Statistic
                    title="Hết hàng"
                    value={outOfStockProducts.length}
                    prefix={
                      <ExceptionOutlined className="mr-2 text-xl text-yellow-500" />
                    }
                    suffix="sản phẩm"
                    loading={loading}
                  />
                </Card>
              </a>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <a href="/admin/bookings">
                <Card bordered={false} className="shadow-sm">
                  <Statistic
                    title="Tổng lịch hẹn"
                    value={totalAppointments}
                    prefix={
                      <CalendarOutlined className="mr-2 text-xl text-green-500" />
                    }
                    suffix="lịch hẹn"
                    loading={loading}
                  />
                </Card>
              </a>
            </motion.div>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <Card
              title="ĐƠN HÀNG ĐANG CHỜ"
              bordered={false}
              className="shadow-sm"
            >
              <div style={tableContainerStyle}>
                <Table
                  columns={ordersColumns}
                  dataSource={orders}
                  pagination={{
                    current: currentPageOrders,
                    pageSize: 4,
                    onChange: (page) => setCurrentPageOrders(page),
                    total: orders.length,
                  }}
                  className="overflow-x-auto"
                  loading={loading}
                  size="small"
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title="KHÁCH HÀNG THÂN THIẾT"
              bordered={false}
              className="shadow-sm"
            >
              <div style={tableContainerStyle}>
                <Table
                  columns={customerColumns}
                  dataSource={newCustomers}
                  pagination={false}
                  className="overflow-x-auto"
                  loading={loading}
                  size="small"
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Card
          title="SẢN PHẨM BÁN CHẠY"
          bordered={false}
          className="mb-6 shadow-sm"
        >
          <Table
            columns={productColumns}
            dataSource={hotProducts}
            pagination={{
              current: currentPageHotProducts,
              pageSize: 4,
              onChange: (page) => setCurrentPageHotProducts(page),
              total: hotProducts.length,
            }}
            className="overflow-x-auto"
            loading={loading}
          />
        </Card>
      </div>
    </motion.div>
  );
};

export default Dashboard;
