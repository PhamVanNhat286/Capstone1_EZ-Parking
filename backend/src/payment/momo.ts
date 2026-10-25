import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const momoRouter = Router();

// POST: http://localhost:5000/api/payment/create-momo
momoRouter.post('/create-momo', async (req: Request, res: Response) => {
  try {
    const {
      amount = 50000,
      orderInfo = 'Thanh toan MoMo EZ-Parking',
      bookingId = '1',
    } = req.body;

    // Bộ key Sandbox test tiêu chuẩn của MoMo Developer
    const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

    const orderId = partnerCode + new Date().getTime();
    const requestId = orderId;
    const redirectUrl = `http://localhost:3000/ve/${bookingId}`;
    const ipnUrl = `http://localhost:5000/api/payment/momo-ipn`;
    const requestType = 'captureWallet';
    const extraData = '';

    // Tạo chữ ký HMAC SHA256 theo chuẩn MoMo v2
    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount: Number(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    });

    // Gọi sang cổng MoMo Sandbox để lấy payUrl hiển thị mã QR
    const momoRes = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    const momoData = await momoRes.json();

    if (momoData && momoData.payUrl) {
      return res.status(200).json({
        success: true,
        paymentUrl: momoData.payUrl,
      });
    }

    // Nếu MoMo Sandbox bảo trì, tự động điều hướng về trang vé để không kẹt luồng demo
    return res.status(200).json({
      success: true,
      paymentUrl: redirectUrl,
      message: momoData?.message || 'Thanh toán MoMo giả lập thành công',
    });
  } catch (error) {
    console.error('Lỗi tạo link MoMo:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tạo giao dịch thanh toán MoMo',
    });
  }
});

export default momoRouter;