import React, { useState, useEffect } from 'react';
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
  DatePicker,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import orderApi from '../../api/orderApi';
import moment from 'moment';
import 'moment/locale/vi';
import { CSVLink } from 'react-csv';

const { Option } = Select;
const { RangePicker } = DatePicker;

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
  fullname: string;
  phone?: string;
  orderDate?: string;
  product: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED' | 'CASH_ON_DELIVERY';
  quantity?: number;
  price?: string;
  products?: Product[];
}

interface FilterParams {
  status?: string;
  paymentStatus?: string;
  dateRange?: [moment.Moment, moment.Moment] | null;
  search?:	stats
}

const OrderList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getAll();
      console.log('Full API response:', response);

      if (!response.data || !response.data.result) {
        console.error('API response is missing data or result:', response);
        message.error('Không thể tải danh sách đơn hàng');
        setOrders([]);
        return;
      }

      const orderDetails = response.data.result;

      // Group order details by orderId
      const groupedOrders: { [key: string]: any } = {};

      orderDetails.forEach((detail: any) => {
        const orderId = detail.orderId._id;
        if (!groupedOrders[orderId]) {
          groupedOrders[orderId] = {
            orderId: orderId,
            orderDate: detail.orderId.order_date,
            status: detail.orderId.status,
            paymentStatus: detail.orderId.payment_status || 'UNPAID',
            fullname: detail.orderId.userID?.fullname || 'Không xác định',
            phone: detail.orderId.userID?.phone || 'Chưa nhập số điện thoại',
            total_price: detail.orderId.total_price,
            products: [],
          };
        }

        groupedOrders[orderId].products.push({
          orderDetailId: detail._id,
          productId: detail.productId?._id || null,
          productName: detail.productId?.name || 'Không xác định',
          productPrice: detail.product_price || 0,
          productImage: null,
          quantity: detail.quantity || 0,
          totalPrice: detail.total_price || 0,
        });
      });

      let formattedOrders: Order[] = Object.values(groupedOrders).map((order: any, index: number) => ({
        key: order.orderId || `order-${index}`,
        orderId: order.orderId || `ORDER${index}`,
        fullname: order.fullname,
        phone: order.phone,
        product: order.products.map((p: Product) => p.productName).join(', ') || 'Không xác định',
        status: (order.status || 'PENDING').toUpperCase() as Order['status'],
        paymentStatus: (order.paymentStatus || 'UNPAID').toUpperCase() as Order['paymentStatus'],
        quantity: order.products.reduce((sum: number, p: Product) => sum + p.quantity, 0) || 0,
        price: order.total_price?.toString() || '0',
        orderDate: order.orderDate ? moment(order.orderDate).format('DD/MM/YYYY HH:mm') : 'Không xác định',
        products: order.products,
      }));

      // Sort orders by orderDate in descending order (most recent first)
      formattedOrders = formattedOrders.sort((a, b) => {
        const dateA = a.orderDate !== 'Không xác định' ? moment(a.orderDate, 'DD/MM/YYYY HH:mm') : moment(0);
        const dateB = b.orderDate !== 'Không xác định' ? moment(b.orderDate, 'DD/MM/YYYY HH:mm') : moment(0);
        return dateB.valueOf() - dateA.valueOf();
      });

      const filteredOrders = applyFilters(formattedOrders);
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error fetching orders:', error.response?.data || error.message);
      message.error(
        error.response?.status === 404
          ? 'Không tìm thấy API đơn hàng'
          : 'Tải danh sách đơn hàng thất bại'
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (orderList: Order[]): Order[] => {
    return orderList.filter((order) => {
      let matches = true;

      if (filters.status) {
        matches = matches && order.status === filters.status;
      }

      if (filters.paymentStatus) {
        matches = matches && order.paymentStatus === filters.paymentStatus;
      }

      if (filters.dateRange) {
        const orderDate = moment(order.orderDate, 'DD/MM/YYYY HH:mm');
        matches = matches && orderDate.isBetween(filters.dateRange[0], filters.dateRange[1], 'day', '[]');
      }

      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        matches = matches && (
          searchRegex.test(order.orderId) ||
          searchRegex.test(order.fullname)
        );
      }

      return matches;
    });
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({ ...prev, status: status || undefined }));
  };

  const handlePaymentStatusFilter = (paymentStatus: string) => {
    setFilters((prev) => ({ ...prev, paymentStatus: paymentStatus || undefined }));
  };

  const handleDateRangeFilter = (dates: any) => {
    setFilters((prev) => ({ ...prev, dateRange: dates }));
  };

  const handleView = (record: Order) => {
    setSelectedOrder(record);
    form.setFieldsValue({ status: record.status });
    setIsModalVisible(true);
  };

  const handleDeleteAll = () => {
    if (selectedRows.length === 0) {
      message.warning('Vui lòng chọn ít nhất một đơn hàng để xóa!');
      return;
    }
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa ${selectedRows.length} đơn hàng đã chọn?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await Promise.all(selectedRows.map((id) => orderApi.delete(id)));
          message.success('Xóa đơn hàng thành công');
          await fetchOrders();
          setSelectedRows([]);
        } catch (error) {
          console.error('Error deleting orders:', error.response?.data || error.message);
          message.error('Xóa đơn hàng thất bại');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (selectedOrder) {
        await orderApi.updateOrderStatus(selectedOrder.orderId, values.status);
        message.success('Cập nhật trạng thái đơn hàng thành công');
        await fetchOrders();
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error('Error updating order status:', error.response?.data || error.message);
      message.error('Cập nhật trạng thái đơn hàng thất bại');
    }
  };

  const columns = [
    {
      title: (
        <Checkbox
          onChange={(e) => {
            const keys = e.target.checked ? orders.map((o) => o.key) : [];
            setSelectedRows(keys);
          }}
          checked={selectedRows.length === orders.length && orders.length > 0}
          indeterminate={selectedRows.length > 0 && selectedRows.length < orders.length}
        />
      ),
      dataIndex: 'checkbox',
      width: 50,
      render: (_: any, record: Order) => (
        <Checkbox
          checked={selectedRows.includes(record.key)}
          onChange={(e) => {
            const keys = e.target.checked
              ? [...selectedRows, record.key]
              : selectedRows.filter((k) => k !== record.key);
            setSelectedRows(keys);
          }}
        />
      ),
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text: string) => (
        <span className="text-[14px] font-normal text-gray-700">
          {text ? text.substring(0, 8) : 'N/A'}...
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'fullname',
      key: 'fullname',
      render: (text: string) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-sm text-blue-500">{text ? text.charAt(0).toUpperCase() : '?'}</span>
          </div>
          <span className="ml-3 text-[14px] font-normal text-gray-700">{text || 'Không xác định'}</span>
        </div>
      ),
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'product',
      key: 'product',
      render: (text: string) => (
        <span className="text-[14px] font-normal text-gray-700">{text}</span>
      ),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          PENDING: { color: 'warning', text: 'Chờ xử lý' },
          PROCESSING: { color: 'processing', text: 'Đang xử lý' },
          SHIPPING: { color: 'blue', text: 'Đang vận chuyển' },
          SHIPPED: { color: 'cyan', text: 'Đã giao hàng' },
          DELIVERED: { color: 'success', text: 'Đã giao' },
          CANCELLED: { color: 'error', text: 'Đã hủy' },
        };
        return (
          <Tag
            color={statusConfig[status]?.color}
            className="px-3 py-0.5 text-[13px] font-normal rounded-full"
          >
            {statusConfig[status]?.text || status}
          </Tag>
        );
      },
    },
    {
      title: 'Trạng thái thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (paymentStatus: string) => {
        const paymentStatusConfig = {
          UNPAID: { color: 'error', text: 'Chưa thanh toán' },
          PAID: { color: 'success', text: 'Đã thanh toán' },
          FAILED: { color: 'warning', text: 'Thanh toán thất bại' },
          CASH_ON_DELIVERY: { color: 'blue', text: 'Thanh toán khi nhận hàng' },
        };
        return (
          <Tag
            color={paymentStatusConfig[paymentStatus]?.color}
            className="px-3 py-0.5 text-[13px] font-normal rounded-full"
          >
            {paymentStatusConfig[paymentStatus]?.text || paymentStatus}
          </Tag>
        );
      },
    },
    {
      title: 'Tính năng',
      key: 'action',
      render: (_: any, record: Order) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
          className="bg-blue-400 hover:bg-blue-500 rounded-md"
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <Input.Search
                  placeholder="Tìm kiếm đơn hàng..."
                  allowClear
                  enterButton
                  onSearch={handleSearch}
                  className="rounded-lg"
                />
              </div>
              <Space wrap>
                <Select
                  placeholder="Lọc trạng thái"
                  allowClear
                  style={{ width: 150 }}
                  onChange={handleStatusFilter}
                  className="text-[14px]"
                >
                  <Option value="PENDING">Chờ xử lý</Option>
                  <Option value="PROCESSING">Đang xử lý</Option>
                  <Option value="SHIPPING">Đang vận chuyển</Option>
                  <Option value="SHIPPED">Đã giao hàng</Option>
                  <Option value="DELIVERED">Đã giao</Option>
                  <Option value="CANCELLED">Đã hủy</Option>
                </Select>
                <Select
                  placeholder="Lọc trạng thái thanh toán"
                  allowClear
                  style={{ width: 180 }}
                  onChange={handlePaymentStatusFilter}
                  className="text-[14px]"
                >
                  <Option value="UNPAID">Chưa thanh toán</Option>
                  <Option value="PAID">Đã thanh toán</Option>
                  <Option value="FAILED">Thanh toán thất bại</Option>
                  <Option value="CASH_ON_DELIVERY">Thanh toán khi nhận hàng</Option>
                </Select>
                <RangePicker
                  onChange={handleDateRangeFilter}
                  format="DD/MM/YYYY"
                  className="text-[14px]"
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchOrders()}
                  className="border border-gray-100 hover:border-gray-200 rounded-md text-[14px]"
                >
                  Làm mới
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteAll}
                  disabled={selectedRows.length === 0}
                  className="bg-red-50 hover:bg-red-100 border border-gray-100 rounded-md text-[14px]"
                >
                  Xóa ({selectedRows.length})
                </Button>
                <CSVLink
                  data={orders}
                  filename="orders.csv"
                  className="flex items-center text-[14px] text-gray-700 hover:text-gray-900"
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
            dataSource={orders}
            loading={loading}
            pagination={{
              total: orders.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng ${total} đơn hàng`,
            }}
            className="overflow-hidden rounded-lg"
            rowClassName="hover:bg-gray-50"
            scroll={{ x: true }}
          />
        </Card>

        <Modal
          title={
            <div className="flex items-center gap-3">
              <EyeOutlined className="text-blue-400" />
              <span className="text-[16px] font-medium text-gray-800">Chi tiết đơn hàng</span>
            </div>
          }
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
          okText="Lưu thay đổi"
          cancelText="Hủy bỏ"
          width={600}
          className="top-8"
        >
          <AnimatePresence>
            {selectedOrder && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-4 text-[15px]">Thông tin đơn hàng</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[13px] text-gray-500">Mã đơn hàng</p>
                          <p className="text-[14px] font-normal text-gray-700">{selectedOrder.orderId}</p>
                        </div>
                        <div>
                          <p className="text-[13px] text-gray-500">Ngày đặt</p>
                          <p className="text-[14px] font-normal text-gray-700">{selectedOrder.orderDate}</p>
                        </div>
                        <div>
                          <p className="text-[13px] text-gray-500">Khách hàng</p>
                          <p className="text-[14px] font-normal text-gray-700">{selectedOrder.fullname}</p>
                        </div>
                        {/* <div>
                          <p className="text-[13px] text-gray-500">Số điện thoại</p>
                          <p className="text-[14px] font-normal text-gray-700">{selectedOrder.phone || 'Chưa nhập số điện thoại'}</p>
                        </div> */}
                        <div>
                          <p className="text-[13px] text-gray-500">Trạng thái thanh toán</p>
                          <p className="text-[14px] font-normal text-gray-700">
                            {selectedOrder.paymentStatus === 'PAID' ? 'Đã thanh toán' :
                             selectedOrder.paymentStatus === 'UNPAID' ? 'Chưa thanh toán' :
                             selectedOrder.paymentStatus === 'FAILED' ? 'Thanh toán thất bại' :
                             selectedOrder.paymentStatus === 'CASH_ON_DELIVERY' ? 'Thanh toán khi nhận hàng' :
                             'Không xác định'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    {selectedOrder?.products && selectedOrder.products.length > 0 ? (
                      <div className="p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                        <h3 className="font-medium text-gray-800 mb-4 text-[15px]">Danh sách sản phẩm</h3>
                        {selectedOrder.products.map((product: Product, index: number) => (
                          <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-[13px] text-gray-500">ID Sản phẩm</p>
                              <p className="text-[14px] font-normal text-gray-700">{product.productId || 'Không xác định'}</p>
                            </div>
                            <div>
                              <p className="text-[13px] text-gray-500">Tên sản phẩm</p>
                              <p className="text-[14px] font-normal text-gray-700">{product.productName || 'Không xác định'}</p>
                            </div>
                            <div>
                              <p className="text-[13px] text-gray-500">Số lượng</p>
                              <p className="text-[14px] font-normal text-gray-700">{product.quantity || '0'}</p>
                            </div>
                            <div>
                              <p className="text-[13px] text-gray-500">Giá</p>
                              <p className="text-[14px] font-normal text-gray-700">{product.productPrice || '0'} VNĐ</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-[14px] text-gray-500">Không có sản phẩm trong đơn hàng</p>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Form form={form} layout="vertical">
                      <Form.Item
                        label="Cập nhật trạng thái đơn hàng"
                        name="status"
                        rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                      >
                        <Select className="w-full text-[14px]">
                          <Option value="PENDING">Chờ xử lý</Option>
                          <Option value="PROCESSING">Đang xử lý</Option>
                          <Option value="SHIPPING">Đang vận chuyển</Option>
                          <Option value="SHIPPED">Đã giao hàng</Option>
                          <Option value="DELIVERED">Đã giao</Option>
                          <Option value="CANCELLED">Đã hủy</Option>
                        </Select>
                      </Form.Item>
                    </Form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Modal>
      </div>
    </motion.div>
  );
};

export default OrderList;