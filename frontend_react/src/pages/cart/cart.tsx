"use client";
import {
  increaseQuantity,
  decreaseQuantity,
  removeProduct,
  clearProduct,
  setUserId,
} from "../../redux/slices/cartslice";
import { useSelector, useDispatch } from "react-redux";
import React, { useEffect } from "react";
import {
  Button,
  Card,
  Input,
  Breadcrumb,
  Typography,
  Divider,
  Modal,
} from "antd";
import { useNavigate } from "react-router-dom";

const { TextArea } = Input;
const { Title, Text } = Typography;

const Cart: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: cartItems, userId } = useSelector(
    (state: { cart: { items: any[]; userId: string | null } }) => state.cart
  );

  useEffect(() => {
    const storedUserId = localStorage.getItem("accountID");
    if (storedUserId && !userId) {
      dispatch(setUserId(storedUserId));
    }
  }, [dispatch, userId]);

  const breadcrumbItems = [

  ];

  // Hàm xử lý tăng số lượng
  // Hàm xử lý tăng số lượng
  const handleIncrement = (id: string, stockQuantity: number) => {
    if (!userId || userId === "guest") {
      Modal.warning({
        title: "Yêu cầu đăng nhập",
        content: "Vui lòng đăng nhập để thực hiện thao tác này!",
        onOk: () => navigate("/login"),
      });
      return;
    }

    const item = cartItems.find((item) => item.id === id);
    console.log("Item in handleIncrement:", item);
    console.log("Current quantity:", item?.quantity, "Stock quantity:", stockQuantity);
    if (item && item.quantity >= stockQuantity) {
      Modal.warning({
        title: "Số lượng vượt quá tồn kho",
        content: `Số lượng tối đa có thể chọn là ${stockQuantity}!`,
      });
      return;
    }

    dispatch(increaseQuantity({ id }));
  };

  // Hàm xử lý giảm số lượng
  const handleDecrement = (id: string) => {
    if (!userId || userId === "guest") {
      Modal.warning({
        title: "Yêu cầu đăng nhập",
        content: "Vui lòng đăng nhập để thực hiện thao tác này!",
        onOk: () => navigate("/login"),
      });
      return;
    }

    const item = cartItems.find((item) => item.id === id);
    if (item && item.quantity <= 1) {
      return; // Không giảm nếu số lượng đã là 1
    }

    dispatch(decreaseQuantity({ id }));
  };

  // Hàm xóa sản phẩm với modal xác nhận
  const handleRemove = (id: string, name: string) => {
    if (!userId || userId === 'guest') {
      Modal.warning({
        title: "Yêu cầu đăng nhập",
        content: "Vui lòng đăng nhập để thực hiện thao tác này!",
        onOk: () => navigate("/login"),
      });
      return;
    }
    Modal.confirm({
      title: "Xác nhận xóa sản phẩm",
      content: `Bạn có chắc muốn xóa "${name}" khỏi giỏ hàng không?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk() {
        dispatch(removeProduct({ id }));
      },
    });
  };

  // Tính tổng tiền tạm tính
  const calculateSubtotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  // Xử lý khi nhấn "Tiến hành đặt hàng"
  const handleCheckout = () => {
    if (!userId || userId === 'guest') {
      Modal.warning({
        title: "Yêu cầu đăng nhập",
        content: "Vui lòng đăng nhập để tiến hành đặt hàng!",
        onOk: () => navigate("/login"),
      });
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-white px-4 sm:px-6 lg:px-8">
      <div className="py-4">
        <div className="mx-auto max-w-6xl">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl py-8">
        <div className="mb-6 flex flex-col justify-between sm:flex-row sm:items-center">
          <Title level={3} className="!mb-0 text-gray-800">
            Giỏ hàng của bạn
          </Title>
          <Text className="text-[#686868]">{`(${cartItems.length} sản phẩm)`}</Text>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            className={
              cartItems.length === 0 ? "lg:col-span-3" : "lg:col-span-2"
            }
          >
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100"
                    height="100"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-4"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <path d="M3 6h18"></path>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                    <path d="M10 14l4 4"></path>
                    <path d="M14 14l-4 4"></path>
                  </svg>
                  <Text className="text-lg text-gray-600">Giỏ hàng trống</Text>
                  <div className="mt-4">
                    <Button
                      size="large"
                      style={{
                        border: "1px solid #ccc",
                        color: "#333",
                        backgroundColor: "white",
                        transition: "border 0.3s, color 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#22A6DF";
                        e.currentTarget.style.border = "1px solid #22A6DF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#333";
                        e.currentTarget.style.border = "1px solid #ccc";
                      }}
                      onClick={() => navigate("/")}
                    >
                      Tiếp tục mua sắm
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              cartItems.map((item) => (
                <Card
                  key={item.id}
                  className="bg-white mb-4"
                  style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }}
                >
                  <div className="mb-4 border-b pb-4">
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <div className="h-28 w-28 overflow-hidden rounded-lg">
                        <img
                          src={`${item.image}`}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <Text
                              strong
                              className="block max-w-[500px] break-words text-lg text-gray-800"
                            >
                              {item.name}
                            </Text>
                          </div>
                          <Button
                            type="text"
                            danger
                            onClick={() => handleRemove(item.id, item.name)}
                          >
                            Xóa
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Text className="text-lg font-medium text-[#22A6DF]">
                            {(item.price * item.quantity).toLocaleString()}đ
                          </Text>
                          <div className="flex items-center gap-2">
                            <Button onClick={() => handleDecrement(item.id)} disabled={item.quantity <= 1}>
                              -
                            </Button>
                            <input
                              type="number"
                              className="w-4 border-none bg-white text-center text-gray-800 md:w-7"
                              min={1}
                              value={item.quantity}
                              readOnly
                            />
                            <Button
                              onClick={() => handleIncrement(item.id, item.stockQuantity)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="lg:col-span-1">
              <Card
                className="sticky top-4 bg-white"
                style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }}
              >
                <Title level={4} className="text-gray-800">
                  Thông tin đơn hàng
                </Title>
                <Divider />
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Text strong className="text-gray-800">
                      Tạm tính
                    </Text>
                    <Text strong className="text-xl text-[#22A6DF]">
                      {calculateSubtotal().toLocaleString()}đ
                    </Text>
                  </div>
                </div>
                <TextArea
                  placeholder="Ghi chú đơn hàng (không bắt buộc)"
                  className="mb-6 bg-white text-gray-800"
                  rows={4}
                />
                <div className="space-y-3">
                  <Button
                    type="primary"
                    size="large"
                    block
                    style={{
                      backgroundColor: "#22A6DF",
                      borderColor: "#22A6DF",
                    }}
                    onClick={handleCheckout}
                  >
                    Tiến hành đặt hàng
                  </Button>
                  <Button
                    size="large"
                    block
                    style={{
                      border: "1px solid #ccc",
                      color: "#333",
                      backgroundColor: "white",
                      transition: "border 0.3s, color 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#22A6DF";
                      e.currentTarget.style.border = "1px solid #22A6DF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#333";
                      e.currentTarget.style.border = "1px solid #ccc";
                    }}
                    onClick={() => navigate("/home")}
                  >
                    Tiếp tục mua sắm
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;