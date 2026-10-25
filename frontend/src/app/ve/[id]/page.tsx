'use client';

import React from 'react';
import { useSearchParams, useParams } from 'next/navigation';

export default function TicketDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Lấy mã phản hồi từ VNPay hoặc trạng thái thành công
  const responseCode = searchParams.get('vnp_ResponseCode');
  const amount = searchParams.get('vnp_Amount');
  const bankCode = searchParams.get('vnp_BankCode');

  // Kiểm tra xem giao dịch đã thành công chưa
  const isSuccess = responseCode === '00' || searchParams.get('success') === 'true';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-4">
        
        {isSuccess ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-emerald-600">Thanh toán thành công!</h1>
            <p className="text-slate-500 text-sm">Cảm ơn bạn đã sử dụng dịch vụ đặt chỗ EZ-Parking.</p>

            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm border border-slate-100">
              <div className="flex justify-between"><span className="text-slate-500">Mã vé / Đặt chỗ:</span><span className="font-semibold">#{params.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ngân hàng:</span><span className="font-semibold uppercase">{bankCode || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Số tiền:</span><span className="font-semibold text-emerald-600">{amount ? (Number(amount) / 100).toLocaleString('vi-VN') + ' đ' : '50.000 đ'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Trạng thái:</span><span className="text-emerald-600 font-medium">Đã thanh toán</span></div>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✕
            </div>
            <h1 className="text-2xl font-bold text-red-600">Không tìm thấy vé hoặc giao dịch thất bại</h1>
            <p className="text-slate-500 text-sm">Hãy kiểm tra lại lịch sử hoặc đặt chỗ mới.</p>
          </>
        )}

        <button
          onClick={() => window.location.href = '/lich-su'}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow-md transition mt-4"
        >
          Lịch sử đặt chỗ
        </button>
      </div>
    </div>
  );
}