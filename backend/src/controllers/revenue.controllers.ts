import { Request, Response } from 'express';
import orderModel from '../models/order.model.js';
import bookingModel from '../models/booking.model.js';
import serviceModel from '../models/service.model.js';
import { BookingStatus } from '../enums/booking.enum.js';
import orderDetailModel from '../models/orderdetail.model.js';
import deliveryModel from '../models/delivery.model.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const getRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;

    // Kiểm tra đầu vào
    if (!from || !to) {
      res.status(400).json({ success: false, message: 'Thiếu tham số bắt buộc: from và to' });
      return;
    }

    const startDate = dayjs(from as string);
    const endDate = dayjs(to as string);

    if (!startDate.isValid() || !endDate.isValid()) {
      res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ cho from hoặc to' });
      return;
    }

    if (endDate.isAfter(dayjs())) {
      res.status(400).json({ success: false, message: 'Ngày kết thúc không thể ở tương lai' });
      return;
    }

    if (startDate.isBefore(dayjs().subtract(2, 'years'))) {
      res.status(400).json({ success: false, message: 'Ngày bắt đầu phải nằm trong 2 năm gần nhất' });
      return;
    }

    if (endDate.diff(startDate, 'month') < 1) {
      res.status(400).json({ success: false, message: 'Khoảng thời gian phải ít nhất 1 tháng' });
      return;
    }

    // Điều chỉnh ngày để bao gồm cả tháng đầy đủ
    const adjustedStartDate = startDate.startOf('month').toDate();
    const adjustedEndDate = endDate.endOf('month').toDate();

    // Điều kiện lọc cho đơn hàng
    const matchOrder: any = {
      payment_status: { $in: ['PAID', 'CASH_ON_DELIVERY'], $exists: true, $type: 'string' }, // Chỉ lấy PAID hoặc CASH_ON_DELIVERY
      status: { $ne: 'CANCELLED' }, // Loại bỏ CANCELLED
      createdAt: {
        $gte: adjustedStartDate,
        $lte: adjustedEndDate
      }
    };

    // 1. Lấy doanh thu bán hàng từ orderModel
    const orders = await orderModel.find(matchOrder).lean();
    const orderRevenueMap: Record<string, number> = {};

    // Nhóm và tính tổng doanh thu bán hàng (không bao gồm tiền ship)
    for (const order of orders) {
      const date = formatDate(order.createdAt);
      // Chỉ lấy total_price, không cộng tiền ship
      const totalOrderRevenue = order.total_price || 0;
      orderRevenueMap[date] = (orderRevenueMap[date] || 0) + totalOrderRevenue;

      // Thêm log để debug
      if (date === '2025-05') {
        console.log(`Order in ${date}:`, {
          orderId: order._id,
          createdAt: order.createdAt,
          payment_status: order.payment_status,
          status: order.status,
          total_price: order.total_price,
          totalOrderRevenue: totalOrderRevenue
        });
      }
    }

    // 2. Lấy doanh thu dịch vụ spa từ orderDetailModel
    const matchOrderDetail: any = {
      updatedAt: {
        $gte: adjustedStartDate,
        $lte: adjustedEndDate
      }
    };

    const orderDetails = await orderDetailModel
      .find(matchOrderDetail)
      .populate({
        path: 'orderId',
        match: { bookingStatus: BookingStatus.COMPLETED }
      })
      .lean();

    const bookingRevenueMap: Record<string, number> = {};

    // Nhóm và tính tổng doanh thu dịch vụ
    for (const detail of orderDetails) {
      if (!detail.orderId) continue;
      const date = formatDate(detail.updatedAt);
      bookingRevenueMap[date] = (bookingRevenueMap[date] || 0) + detail.realPrice;
    }

    // 3. Gộp kết quả
    const merged = mergeRevenue(orderRevenueMap, bookingRevenueMap);

    // Log kết quả cuối cùng
    console.log('Final Revenue Data:', merged);

    res.json({ success: true, data: merged });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi Server' });
    return;
  }
};

// Định dạng ngày cho nhóm theo tháng (YYYY-MM), đảm bảo múi giờ
const formatDate = (date: Date): string => {
  const adjustedDate = dayjs(date).tz('Asia/Ho_Chi_Minh');
  const year = adjustedDate.year();
  const month = String(adjustedDate.month() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Gộp dữ liệu doanh thu đơn hàng và dịch vụ
const mergeRevenue = (orderRevenueMap: Record<string, number>, bookingRevenueMap: Record<string, number>) => {
  const map: Record<string, { salesRevenue: number; serviceRevenue: number }> = {};

  // Thêm doanh thu bán hàng
  for (const date in orderRevenueMap) {
    map[date] = { salesRevenue: orderRevenueMap[date] || 0, serviceRevenue: 0 };
  }

  // Thêm doanh thu dịch vụ
  for (const date in bookingRevenueMap) {
    if (map[date]) {
      map[date].serviceRevenue = bookingRevenueMap[date] || 0;
    } else {
      map[date] = { salesRevenue: 0, serviceRevenue: bookingRevenueMap[date] || 0 };
    }
  }

  // Chuyển thành mảng, tính tổng và sắp xếp theo ngày
  const result = Object.keys(map)
    .map((date) => {
      const sales = map[date].salesRevenue;
      const service = map[date].serviceRevenue;
      return {
        date,
        salesRevenue: sales,
        serviceRevenue: service,
        totalRevenue: sales + service
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
};
