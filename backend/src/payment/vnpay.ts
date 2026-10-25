import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const vnpayRouter = Router();

function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();
  for (let i = 0; i < keys.length; i++) {
    sorted[keys[i]] = encodeURIComponent(obj[keys[i]]).replace(/%20/g, '+');
  }
  return sorted;
}

// POST: http://localhost:5000/api/payment/create-vnpay
vnpayRouter.post('/create-vnpay', (req: Request, res: Response) => {
  try {
    const {
      amount = 50000,
      orderInfo = 'Thanh toan dat cho EZ-Parking',
      bookingId = '1',
    } = req.body;

    // Điền mã Sandbox VNPay của bạn vào đây (hoặc đặt trong file .env của backend)
    const tmnCode = process.env.VNP_TMN_CODE || 'JIWYD9G6';
    const secretKey = process.env.VNP_HASH_SECRET || 'LNJZYKQBQFEXIHTHBQYFAWQLVHERXOXN';
    let vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = `http://localhost:3000/ve/${bookingId}`;

    const date = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const createDate =
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds());

    const orderId = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    let vnp_Params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: Number(amount) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = Object.keys(vnp_Params)
      .map((key) => `${key}=${vnp_Params[key]}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    vnpUrl +=
      '?' +
      Object.keys(vnp_Params)
        .map((key) => `${key}=${vnp_Params[key]}`)
        .join('&');

    return res.status(200).json({
      success: true,
      paymentUrl: vnpUrl,
    });
  } catch (error) {
    console.error('Lỗi tạo link VNPay:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tạo link thanh toán VNPay',
    });
  }
});

export default vnpayRouter;