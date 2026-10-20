import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "../components/layout/BottomNav";
import ToastContainer from "../components/ui/Toast";
import AuthGuard from "../components/layout/AuthGuard";

export const metadata: Metadata = {
  title: "EZ-Space Smart Parking",
  description: "Tìm kiếm và đặt chỗ đỗ xe dễ dàng",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="h-screen bg-slate-50 font-sans flex items-start justify-center overflow-hidden">
        <ToastContainer />
        <AuthGuard>
          <main className="w-full max-w-[430px] h-screen flex flex-col bg-white shadow-xl overflow-hidden">
            <div className="flex-1 overflow-y-auto h-full">
              {children}
            </div>
            <BottomNav />
          </main>
        </AuthGuard>
      </body>
    </html>
  );
}
