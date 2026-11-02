import React from "react";

// Icon Xe 4 chỗ (Sedan) - Kiểu dáng xe con 4 chỗ thon gọn, 2 hàng kính
export function Sedan4SeatsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Khung thân xe 4 chỗ */}
      <path d="M4 14h16c.6 0 1-.4 1-1v-2.2c0-.7-.5-1.4-1.2-1.6L16.5 8.5C16.1 8.2 15.6 8 15 8H8.5c-.6 0-1.1.2-1.5.5L3.8 11.2C3.3 11.4 3 11.9 3 12.5V13c0 .6.4 1 1 1z" />
      {/* 2 khoang kính cho 4 chỗ */}
      <path d="M8.5 8.2L6.5 11h5V8.2" />
      <path d="M12.5 8.2V11h3.5l-1.5-2.8" />
      {/* 2 bánh xe */}
      <circle cx="7" cy="15.5" r="2" />
      <circle cx="17" cy="15.5" r="2" />
    </svg>
  );
}

// Icon Xe 7 chỗ (SUV) - Kiểu dáng xe SUV / Crossover 7 chỗ gầm cao, giá nóc thể thao, 3 hàng kính
export function Suv7SeatsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Giá nóc thể thao đặc trưng xe SUV 7 chỗ */}
      <line x1="7" y1="5.5" x2="16.5" y2="5.5" strokeWidth="2" />
      <line x1="8.5" y1="5.5" x2="8.5" y2="7" />
      <line x1="15" y1="5.5" x2="15" y2="7" />
      {/* Thân xe SUV 7 chỗ: nóc cao, đuôi thẳng đứng, gầm cao */}
      <path d="M3 14h18c.6 0 1-.4 1-1v-4c0-.7-.5-1.3-1.1-1.5L17.5 6.8C17.1 6.6 16.6 6.5 16 6.5H7.5c-.6 0-1.1.2-1.5.5L3.5 9.2C3.2 9.5 3 9.8 3 10.3V13c0 .6.4 1 1 1z" />
      {/* 3 khoang kính cho 3 hàng ghế của xe 7 chỗ */}
      <path d="M7 7.2L5.5 9.8h3V7.2" />
      <path d="M9.5 7.2v2.6h3.5V7.2" />
      <path d="M14 7.2v2.6h2.5l-1-2.6" />
      {/* 2 bánh xe lớn gầm cao */}
      <circle cx="7" cy="15.5" r="2.2" />
      <circle cx="17" cy="15.5" r="2.2" />
    </svg>
  );
}

// Icon Xe điện (EV)
export function EvCarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 14h18c.6 0 1-.4 1-1v-2.5c0-.7-.5-1.4-1.2-1.6L16.8 8.4C16.4 8.1 15.9 8 15.3 8H8.2c-.6 0-1.1.2-1.5.5L4 11.2C3.4 11.4 3 12 3 12.6V13c0 .6.4 1 1 1z" />
      <circle cx="7" cy="15.5" r="2" />
      <circle cx="17" cy="15.5" r="2" />
      {/* Biểu tượng tia sét sạc pin xe điện */}
      <path d="M12.5 4.5l-2.5 3.5h2.5l-1.5 3.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
