"use client";
import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Empty, Modal, message, Tabs } from "antd";
import { FaShoppingBag, FaEye, FaStar } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import userApi from "../api/userApi";
import orderDetailApi from "../api/orderDetailApi";
import orderApi from "../api/orderApi";

import { useDispatch } from "react-redux";
import { addToCart } from "../redux/slices/cartslice";

import ratingApi from "../api/ratingApi";
import { number } from "prop-types";
import paymentApi from "../api/paymentApi";
import ENV_VARS from "../../config";

interface User {
  _id: string;
  email: string;
  fullname: string;
  password: string;
  phone_number: string;
  role: string;
  avatar: string;
  reset_password_token: string | null;
  reset_password_expires: string | null;
  refreshToken: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface OrderItem {
  productId: any;
  orderDetailId: any;
  id: string;
  name: string;
  quantity: number;
  price: number;
  image_url: string[];
  isRated: boolean;
}

interface Rating {
  rating: number;
  comment: string;
  productId: string;
}

interface Order {
  id: string;
  orderDetailId: string;
  orderNumber: string;
  date: string;
  status: string;
  total: number;
  items: OrderItem[];
  paymentMethod: string;
  shippingAddress: string;
  deliveryFee: number;
  discountValue: number;
  payment_status: string;
  couponCode: string;
}

interface ProductRating {
  _id: {
    _id: string;
    productId: string;
    quantity: number;
    product_price: number;
    total_price: number;
  };
  score: number;
  userId: {
    _id: string;
    fullname: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
}

const ProductRatings = ({ productId }: { productId: string }) => {
  console.log(productId, "Thanh ne ProductID");
};

export default function OrderDetail() {
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  // Trong OrderDetail function, dưới các state hiện có
  const [isSelectProductModalVisible, setIsSelectProductModalVisible] =
    useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] =
    useState<Order | null>(null);
  // Rating
  const [selectedProductForReview, setSelectedProductForReview] =
    useState<OrderItem | null>(null);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("accessToken");
      const accountID = localStorage
        .getItem("accountID")
        ?.replace(/"/g, "")
        .trim();

      if (!token || !accountID) {
        setUser(null);
        setFetchLoading(false);
        return;
      }

      try {
        const userResponse = await userApi.getUserById(accountID);
        setUser(userResponse.data.data);

        const orderResponse = await orderDetailApi.getOrderByUserId(accountID);
        console.log("Order Response:", orderResponse);

        if (!orderResponse.data.success) {
          console.warn("API Error:", orderResponse.data.message);
          setOrders([]);
        } else {
          setOrders(orderResponse.data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setUser(null);
        setOrders([]);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleReorder = (order: Order) => {
    const cartItems = order.items.map((item) => ({
      item: {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image_url[0],
      },
      quantity: item.quantity,
    }));

    cartItems.forEach((cartItem) => {
      dispatch(addToCart(cartItem));
    });

    navigate("/checkout", {
      state: {
        reorderItems: cartItems,
        shippingAddress: order.shippingAddress,
        paymentMethodId: order.paymentMethod,
      },
    });
  };

  const confirmReorder = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success("Đơn hàng đã được đặt lại thành công!");
      setIsModalVisible(false);
    } catch (error) {
      message.error("Có lỗi xảy ra khi đặt lại đơn hàng.");
    } finally {
      setLoading(false);
    }
  };
  // Rating
  const handleShowReviewModal = (order: Order, productId: string) => {
    const product = order.items.find((item) => item.id === productId);
    if (product && !product.isRated) {
      setOrderDetailId(product.orderDetailId);
      setSelectedProductForReview(product);
      setIsReviewModalVisible(true);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedProductForReview || !orderDetailId) {
      message.error("Không tìm thấy sản phẩm hoặc đơn hàng để đánh giá.");
      return;
    }

    if (!comment.trim()) {
      message.error("Vui lòng nhập nhận xét để gửi đánh giá.");
      return;
    }

    setReviewLoading(true);

    try {
      const reviewData = {
        orderDetailId: orderDetailId,
        score: rating,
        content: comment.trim(),
      };

      const response = await ratingApi.createRating(reviewData);

      const responseData = response.data;

      if (responseData) {
        message.success("Đánh giá sản phẩm thành công!");
        setIsReviewModalVisible(false);
        setRating(5);
        setComment("");
        setSelectedProductForReview(null);
        setOrderDetailId(null);

        // Cập nhật orders để phản ánh isRated
        setOrders((prevOrders) =>
          prevOrders.map((order) => ({
            ...order,
            items: order.items.map((item) =>
              item.orderDetailId === orderDetailId
                ? { ...item, isRated: true }
                : item
            ),
          }))
        );
      } else {
        console.warn("API success false:", responseData.message);
        message.error(
          responseData.message || "Không thể gửi đánh giá. Vui lòng thử lại."
        );
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Lỗi hệ thống, vui lòng thử lại."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const confirmSubmitReview = () => {
    Modal.confirm({
      title: "Xác nhận gửi đánh giá",
      content: "Bạn có chắc chắn muốn gửi đánh giá này?",
      onOk: handleSubmitReview,
    });
  };

  // Rating
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalVisible(true);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    setLoading(true);
    try {
      const response = await orderApi.updateOrderStatus(
        orderToCancel.id,
        "CANCELLED"
      );
      if (response.success) {
        const updatedOrders = orders.map((o) =>
          o.id === orderToCancel.id ? { ...o, status: "CANCELLED" } : o
        );
        setOrders(updatedOrders);
        message.success("Đơn hàng đã được hủy thành công!");
        setIsCancelModalVisible(false);
      } else {
        message.error("Hủy đơn hàng thất bại: " + response.message);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi hủy đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  const showCancelConfirm = (order: Order) => {
    setOrderToCancel(order);
    setIsCancelModalVisible(true);
  };

  const statusColors = {
    PENDING: "blue",
    PROCESSING: "green",
    SHIPPING: "orange",
    DELIVERED: "green",
    CANCELLED: "red",
  };

  const statusText = {
    PENDING: "Chưa xác nhận",
    PROCESSING: "Đã xác nhận",
    SHIPPING: "Đang vận chuyển",
    DELIVERED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };

  const handlePayment = async (id: string, total: number) => {
    try {
      const paymentData = {
        orderId: id,
        amount: total,
        description: `Thanh toán đơn hàng ${id}`,
        returnUrl: `${ENV_VARS.VITE_VNPAY_URL}/success`,
        cancelUrl: `${ENV_VARS.VITE_VNPAY_URL}/cancel`,
      };

      const response = await paymentApi.create(paymentData);
      const checkoutUrl = response.url;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        message.error("Không thể tạo liên kết thanh toán.");
      }
    } catch (error) {
      console.error("Error creating payment link:", error);
      message.error("Có lỗi xảy ra khi tạo liên kết thanh toán.");
    }
  };

  const paymentStatusText = {
    PENDING: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    CASH_ON_DELIVERY: "Thanh toán khi nhận hàng",
  };

  const paymentStatusColors = {
    PENDING: "red",
    PAID: "green",
    CASH_ON_DELIVERY: "blue",
};

  const columns = [
    {
      title: "STT",
      key: "index",
      render: (_: any, __: any, index: number) => (
        <span className="font-medium text-gray-800">{index + 1}</span>
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "items",
      key: "items",
      width: "30%",
      render: (items: OrderItem[], record: Order) => {
        const maxItemsToShow = 2;
        const displayedItems = items.slice(0, maxItemsToShow);
        const remainingItems = items.length - maxItemsToShow;

        return (
          <div className="flex flex-col space-y-2">
            {displayedItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <img
                  src={`${item.image_url[0]}`}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
                <div>
                  <p className="font-medium text-gray-800">{item.name.slice(0, 20) + "..."}</p>
                  <p className="text-gray-500">Số lượng: {item.quantity}</p>
                </div>
              </div>
            ))}
            {remainingItems > 0 && (
              <Button
                type="link"
                onClick={() => handleViewDetails(record)}
                className="text-blue-500 p-0"
              >
                Xem thêm {remainingItems} sản phẩm
              </Button>
            )}
          </div>
        );
      },
    },
    {
      title: "Ngày đặt",
      dataIndex: "date",
      key: "date",
      render: (date: string) => (
        <span className="text-gray-600">
          {new Date(date).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      render: (total: number) => (
        <span className="text-blue-500 font-medium">
          {total.toLocaleString()}đ
        </span>
      ),
    },
    {
      title: "Trạng thái & Thanh toán",
      key: "status_payment",
      width: "18%",
      render: (_: any, record: Order) => (
        <div className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-1 md:space-x-2 items-start sm:items-center">
          <Tag
            color={statusColors[record.status]}
            className="flex items-center w-fit px-1 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <span className="break-words line-clamp-1">
              {statusText[record.status]}
            </span>
          </Tag>
          <Tag
            onClick={() =>
              record.payment_status === "PENDING" &&
              handlePayment(record.id, record.total)
            }
            color={paymentStatusColors[record.payment_status]}
            className={`flex items-center w-fit px-1 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full shadow-sm transition-all duration-200 hover:shadow-md ${
              record.payment_status === "PENDING"
                ? "cursor-pointer hover:bg-opacity-80"
                : "cursor-not-allowed opacity-75"
            }`}
          >
            <span className="break-words line-clamp-1">
              {paymentStatusText[record.payment_status]}
            </span>
          </Tag>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: Order) => {
        return (
          <div className="flex flex-col space-y-2">
            <Button
              type="primary"
              onClick={() => handleViewDetails(record)}
              className="bg-green-500 hover:bg-green-600 flex items-center"
              icon={<FaEye className="mr-2" />}
            >
              Xem chi tiết
            </Button>
            {record.status === "DELIVERED" && (
              <>
                <Button
                  type="primary"
                  onClick={() => handleReorder(record)}
                  className="bg-blue-500 hover:bg-blue-600 flex items-center"
                  icon={<FaShoppingBag className="mr-2" />}
                >
                  Mua lại
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setSelectedOrderForReview(record);
                    setIsSelectProductModalVisible(true);
                  }}
                  className="bg-purple-500 hover:bg-purple-600 flex items-center"
                  icon={<FaStar className="mr-2 text-yellow-400" />}
                >
                  Đánh giá
                </Button>
              </>
            )}
            {record.status === "PENDING" && (
              <Button
                danger
                onClick={() => showCancelConfirm(record)}
                className="flex items-center"
                icon={<MdCancel className="mr-2" />}
              >
                Huỷ
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const itemColumns = [
    {
      title: "Hình ảnh",
      dataIndex: "image_url",
      key: "image_url",
      render: (image_url: string[]) => (
        <img
          src={image_url[0]}
          alt="Sản phẩm"
          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
        />
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <span className="font-medium text-gray-800">{text}</span>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      render: (quantity: number) => <span>{quantity}</span>,
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      render: (price: number) => <span>{price.toLocaleString()}đ</span>,
    },
  ];

  const items = [
    { label: "Tất cả", key: "ALL" },
    { label: "Chưa xác nhận", key: "PENDING" },
    { label: "Đã xác nhận", key: "PROCESSING" },
    { label: "Đang vận chuyển", key: "SHIPPING" },
    { label: "Hoàn thành", key: "DELIVERED" },
    { label: "Đã hủy", key: "CANCELLED" },
  ];

  const filteredOrders = Array.isArray(orders)
    ? activeTab === items[0].key
      ? orders
      : orders.filter((order) => order.status === activeTab)
    : [];

  const subTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const calculateDiscount = (order: Order): number => {
    const subtotal = subTotal(order.items);
    const subtotalAfterDiscount = order.total - order.deliveryFee; // Tổng tiền sản phẩm sau khi giảm giá
    const discount = subtotal - subtotalAfterDiscount;
    return discount > 0 ? discount : 0; // Đảm bảo không trả về giá trị âm
  };

  return (
    <div className="w-full p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Đơn mua sản phẩm
        </h2>
        <p className="text-gray-600">Quản lý các đơn hàng sản phẩm của bạn</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        className="mb-4 custom-tabs"
      />

      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        loading={fetchLoading}
        pagination={{
          pageSize: 5,
          total: filteredOrders.length,
          showSizeChanger: false,
        }}
        className="border rounded-lg shadow-sm"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có đơn hàng sản phẩm nào"
            />
          ),
        }}
      />

      <Modal
        title="Xác nhận đặt lại đơn hàng"
        open={isModalVisible}
        onOk={confirmReorder}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn đặt lại đơn hàng này?</p>
        {selectedOrder && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">Chi tiết đơn hàng:</p>
            <p>Mã đơn hàng: {selectedOrder.orderNumber}</p>
            <p>Tổng tiền: {selectedOrder.total.toLocaleString()}đ</p>
          </div>
        )}
      </Modal>

      <Modal
        title="Xác nhận hủy đơn hàng"
        open={isCancelModalVisible}
        onOk={handleCancelOrder}
        onCancel={() => setIsCancelModalVisible(false)}
        confirmLoading={loading}
        okText="Xác nhận"
        cancelText="Hủy bỏ"
        okButtonProps={{ danger: true }}
      >
        <p>Bạn có chắc chắn muốn hủy đơn hàng này không?</p>
        {orderToCancel && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">Chi tiết đơn hàng:</p>
            <p>Mã đơn hàng: {orderToCancel.orderNumber}</p>
            <p>Tổng tiền: {orderToCancel.total.toLocaleString()}đ</p>
          </div>
        )}
      </Modal>

      <Modal
        title="Chi tiết đơn hàng"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p>
                  <strong>Mã đơn hàng:</strong> {selectedOrder.orderNumber}
                </p>
                <p>
                  <strong>Phương thức thanh toán:</strong>{" "}
                  {selectedOrder.paymentMethod}
                </p>
                <p>
                  <strong>Tổng tiền sản phẩm:</strong>{" "}
                  {subTotal(selectedOrder.items).toLocaleString()}đ
                </p>
                <p>
                  <strong>Phí vận chuyển:</strong>{" "}
                  {selectedOrder.deliveryFee === 0
                    ? "Miễn phí"
                    : `${selectedOrder.deliveryFee.toLocaleString()}đ`}
                </p>
                {selectedOrder.discountValue > 0 && (
                  <p>
                    <strong>
                      Voucher ({selectedOrder.couponCode}: giảm{" "}
                      {selectedOrder.discountValue}%):
                    </strong>{" "}
                    -{calculateDiscount(selectedOrder).toLocaleString()}đ
                  </p>
                )}
              </div>
              <div>
                <p>
                  <strong>Địa chỉ giao hàng:</strong>{" "}
                  {selectedOrder.shippingAddress}
                </p>
                <p>
                  <strong>Ngày đặt:</strong>{" "}
                  {new Date(selectedOrder.date).toLocaleDateString("vi-VN")}
                </p>
                <p>
                  <strong>Trạng thái:</strong>{" "}
                  {statusText[selectedOrder.status]}
                </p>
                <p>
                  <strong>Tổng tiền:</strong>{" "}
                  {selectedOrder.total.toLocaleString()}đ
                </p>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-medium text-lg mb-2">
                Sản phẩm trong đơn hàng:
              </h3>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                <Table
                  columns={itemColumns}
                  dataSource={selectedOrder.items}
                  rowKey="id"
                  pagination={false}
                  className="border rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        title="Đánh giá sản phẩm"
        open={isReviewModalVisible}
        onCancel={() => setIsReviewModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedProductForReview && (
          <div className="p-4">
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={selectedProductForReview.image_url[0]}
                alt={selectedProductForReview.name}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div>
                <h3 className="font-medium text-lg">
                  {selectedProductForReview.name}
                </h3>
                <p className="text-gray-500">
                  Giá: {selectedProductForReview.price.toLocaleString()}đ
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2">Đánh giá của bạn</p>
              <div className="flex space-x-2">
                {Array.from({ length: 5 }, (_, index) => index + 1).map(
                  (star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl focus:outline-none transition-colors ${
                        star <= rating ? "text-yellow-400" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2">Nhận xét của bạn</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button onClick={() => setIsReviewModalVisible(false)}>
                Hủy
              </Button>
              <Button
                type="primary"
                onClick={confirmSubmitReview}
                loading={reviewLoading}
                className="bg-purple-500 hover:bg-purple-600"
              >
                Gửi đánh giá
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Chọn sản phẩm để đánh giá"
        open={isSelectProductModalVisible}
        onCancel={() => setIsSelectProductModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrderForReview && (
          <div className="p-4">
            {selectedOrderForReview.items.length === 0 ? (
              <p>Không có sản phẩm nào để đánh giá.</p>
            ) : (
              <div className="space-y-4">
                {selectedOrderForReview.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.image_url[0]}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-gray-500">
                          Giá: {item.price.toLocaleString()}đ
                        </p>
                        {item.isRated && (
                          <div className="flex items-center space-x-2">
                            <p className="text-gray-400 text-sm">Đã đánh giá</p>
                            <Button
                              type="link"
                              onClick={() =>
                                navigate(`/detail/${item.productId}#reviews`)
                              }
                              className="text-blue-500 p-0"
                            >
                              Xem đánh giá
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {!item.isRated && (
                      <Button
                        type="primary"
                        onClick={() => {
                          setOrderDetailId(item.orderDetailId);
                          setSelectedProductForReview(item);
                          setIsSelectProductModalVisible(false);
                          setIsReviewModalVisible(true);
                        }}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        Chọn
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
