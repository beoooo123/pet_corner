import sendEmail from './sendEmail.js';
import ServiceModel from '../models/service.model.js';
import userModel from '../models/user.model.js';
import orderModel from '../models/order.model.js';
import ENV_VARS from '../config/config.js';

interface BookingEmailData {
  recipientEmail: string;
  customerName?: string;
  orderDetails: Array<{
    serviceId: string | null;
    booking_date: Date | null;
    petName: string | null;
    petType: string | null;
  }>;
  orderId: string;
  isCancellation?: boolean;
}

const sendBookingEmail = async ({
  recipientEmail,
  customerName,
  orderDetails,
  orderId,
  isCancellation = false,
  subject: customSubject,
  html: customHtml
}: BookingEmailData & { subject?: string; html?: string }): Promise<void> => {
  console.log('Input data:', { recipientEmail, customerName, orderDetails, orderId, isCancellation });

  let finalOrderId = orderId;
  let finalCustomerName = customerName || 'Khách hàng';

  try {
    const order = await orderModel.findById(orderId);
    if (order) {
      finalOrderId = order._id.toString();
      const user = await userModel.findById(order.userID).select('fullname');
      if (user && user.fullname) {
        finalCustomerName = user.fullname;
      } else {
        finalCustomerName = order.fullname || order.infoUserGuest?.fullName || 'Khách hàng';
        console.log(`No fullname found for userID: ${order.userID}`);
      }
    } else {
      throw new Error(`Order with ID ${orderId} not found`);
    }
  } catch (error) {
    console.error(`Error fetching order for orderId ${orderId}:`, error);
    throw error;
  }

  const servicePromises = orderDetails.map(async (detail) => {
    let serviceName = 'Không xác định';
    let servicePrice: number | string = 'Chờ xác nhận';
    let duration: number | string = 'Không xác định';

    try {
      if (detail.serviceId) {
        const service = await ServiceModel.findById(detail.serviceId).select('service_name service_price duration');
        if (service) {
          serviceName = service.service_name;
          servicePrice = service.service_price;
          duration = service.duration;
        }
      }
    } catch (error) {
      console.error(`Error fetching service for serviceId ${detail.serviceId}:`, error);
    }

    return {
      ...detail,
      service_name: serviceName,
      service_price: servicePrice,
      duration: duration,
      customerName: finalCustomerName
    };
  });

  const enrichedOrderDetails = await Promise.all(servicePromises);

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Không xác định';
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
  };

  const formatPrice = (price: number | string) => {
    if (typeof price === 'number') {
      return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    }
    return price;
  };

  console.log('Final data:', { finalCustomerName, finalOrderId });

  const subject = customSubject || (isCancellation ? 'Thông báo hủy lịch đặt dịch vụ' : 'Xác nhận đặt lịch thành công');

  const text = `Kính gửi ${finalCustomerName},

${isCancellation ? 'Lịch đặt dịch vụ của bạn đã được hủy thành công' : 'Cảm ơn bạn đã đặt lịch với chúng tôi! Dưới đây là thông tin chi tiết về lịch hẹn của bạn'}:

${enrichedOrderDetails
  .map(
    (detail) =>
      `- Dịch vụ: ${detail.service_name}\n- Thời gian: ${formatDateTime(detail.booking_date)}\n- Thú cưng: ${detail.petName || 'N/A'} (${detail.petType || 'N/A'})\n- Thời gian dự tính: ${detail.duration} phút`
  )
  .join('\n\n')}
- Địa điểm: ${ENV_VARS.ADDRESS}
- Mã đặt lịch: ${finalOrderId}

Nếu bạn cần thêm thông tin hoặc hỗ trợ, vui lòng liên hệ với chúng tôi qua số ${ENV_VARS.HOTLINE} hoặc email ${ENV_VARS.EMAIL_USER}.

Trân trọng,
Pet Heaven
Hotline: ${ENV_VARS.HOTLINE}
Email: ${ENV_VARS.EMAIL_USER}`;

  const html =
    customHtml ||
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #333; text-align: center;">${isCancellation ? 'Thông báo hủy lịch đặt dịch vụ' : 'Xác nhận đặt lịch thành công'}</h2>
      <p style="color: #555; line-height: 1.6;">Kính gửi <strong>${finalCustomerName}</strong>,</p>
      <p style="color: #555; line-height: 1.6;">
        ${isCancellation ? 'Lịch đặt dịch vụ của bạn đã được hủy thành công.' : 'Cảm ơn bạn đã đặt lịch với chúng tôi! Dưới đây là thông tin chi tiết về lịch hẹn của bạn:'}
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        ${enrichedOrderDetails
          .map(
            (detail) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; width: 30%;">Dịch vụ:</td>
                <td style="padding: 10px; border: 1px solid #e0e0e0;">${detail.service_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Thời gian:</td>
                <td style="padding: 10px; border: 1px solid #e0e0e0;">${formatDateTime(detail.booking_date)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Thú cưng:</td>
                <td style="padding: 10px; border: 1px solid #e0e0e0;">${detail.petName || 'N/A'} (${detail.petType || 'N/A'})</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Thời gian dự kiến:</td>
                <td style="padding: 10px; border: 1px solid #e0e0e0;">${detail.duration} phút</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Giá dịch vụ:</td>
                <td style="padding: 10px; border: 1px solid #e0e0e0;"> Giá sẽ được tính tại shop dựa vào khối lượng của pet</td>
              </tr>
            `
          )
          .join('')}
        <tr>
          <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Địa điểm:</td>
          <td style="padding: 10px; border: 1px solid #e0e0e0;">${ENV_VARS.ADDRESS}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Mã đặt lịch:</td>
          <td style="padding: 10px; border: 1px solid #e0e0e0;">${finalOrderId}</td>
        </tr>
      </table>
      <p style="color: #555; line-height: 1.6;">
        Nếu bạn cần thêm thông tin hoặc hỗ trợ, vui lòng liên hệ với chúng tôi qua hotline <strong>${ENV_VARS.HOTLINE}</strong> hoặc email <strong>${ENV_VARS.EMAIL_USER}</strong>.
      </p>
      <p style="color: #555; text-align: center;">Trân trọng,<br><strong>Pet Heaven</strong></p>
    </div>
  `;

  try {
    await sendEmail(recipientEmail, subject, text, html);
    console.log(`${isCancellation ? 'Cancellation' : 'Booking'} email sent to:`, recipientEmail);
  } catch (error) {
    console.error(`Error sending ${isCancellation ? 'cancellation' : 'booking'} email:`, error);
    throw error;
  }
};

export default sendBookingEmail;
