import { Request, Response } from 'express';
import crypto from 'crypto';
import qs from 'qs';
import moment from 'moment';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import orderModel from '../models/order.model.js';
import { PaymentStatus } from '../enums/order.enum.js';

dotenv.config();

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    process.env.TZ = 'Asia/Ho_Chi_Minh';

    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');

    const ipAddr = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '';

    const tmnCode = process.env.VNP_TMNCODE as string;
    const secretKey = process.env.VNP_HASHSECRET as string;
    let vnpUrl = process.env.VNP_URL as string;
    // const returnUrl = process.env.VNP_RETURN_URL as string;
    // Gửi dữ liệu lên VNPAY
    const { orderId, amount, bankCode, language, returnUrl } = req.body;
    const locale = language || 'vn';
    const currCode = 'VND';

    let vnp_Params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh+toan+cho+ma+GD:${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: (amount || 0) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };

    if (bankCode) {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

    res.status(200).json({ success: true, url: vnpUrl });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



// Xác thực chữ ký VNPay gửi về (return URL) trước khi tin bất kỳ trạng thái thanh toán nào.
// Không dùng vnp_ResponseCode do client tự đọc từ URL để quyết định PAID/PENDING —
// chỉ tin sau khi tự tính lại hash bằng secretKey (secret không rời server) và khớp với vnp_SecureHash nhận được.
export const verifyPaymentReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const secretKey = process.env.VNP_HASHSECRET as string;
    const vnp_Params = { ...(req.query as Record<string, string>) };
    const receivedHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = sortObject(vnp_Params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const computedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (!receivedHash || computedHash !== receivedHash) {
      res.status(200).json({ success: true, verified: false, payment_status: PaymentStatus.PENDING });
      return;
    }

    const orderId = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const payment_status = responseCode === '00' ? PaymentStatus.PAID : PaymentStatus.PENDING;

    if (orderId && mongoose.isValidObjectId(orderId)) {
      await orderModel.findByIdAndUpdate(orderId, { payment_status });
    }

    res.status(200).json({ success: true, verified: true, payment_status });
  } catch (error) {
    console.error('Error verifying VNPay return:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
