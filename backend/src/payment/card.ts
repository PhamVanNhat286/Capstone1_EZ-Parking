import { Router, Request, Response } from 'express';

const cardRouter = Router();

// POST: http://localhost:5000/api/payment/create-card
cardRouter.post('/create-card', (req: Request, res: Response) => {
  try {
    const { amount = 50000, cardNumber, cardHolder, expiryDate, cvv, bookingId = '1' } = req.body;

    // Xóa khoảng trắng trong số thẻ để kiểm tra
    const cleanCardNumber = (cardNumber || '').replace(/\s+/g, '');

    if (!cleanCardNumber || !cardHolder) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ số thẻ và tên chủ thẻ!',
      });
    }

    if (cleanCardNumber.length < 16) {
      return res.status(400).json({
        success: false,
        message: 'Số thẻ không hợp lệ (Phải đủ 16 chữ số)!',
      });
    }

    // Trả về kết quả thành công và điều hướng sang trang vé
    return res.status(200).json({
      success: true,
      message: 'Thanh toán thẻ thành công!',
      transactionId: `CARD_${Date.now()}`,
      redirectUrl: `/ve/${bookingId}`,
    });
  } catch (error) {
    console.error('Lỗi thanh toán thẻ:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý giao dịch thẻ ngân hàng',
    });
  }
});

export default cardRouter;