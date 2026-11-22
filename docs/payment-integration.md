# VNPay va chuyen khoan ngan hang

Nhanh nay ghep hai phuong thuc thanh toan vao luong dat cho tren `develop`. Don dat cho phai duoc tao trong bang `reservations` va con trang thai `holding`.

## Cau hinh backend

Tao `backend/.env` theo `backend/.env.example` tren tung may. Khong commit file `.env`.

- `VNP_TMN_CODE`, `VNP_HASH_SECRET`: thong tin do VNPay cap. `VNP_PAYMENT_URL` mac dinh la cong sandbox; chi doi sang URL production khi VNPay da cap thong tin production.
- `PUBLIC_BACKEND_URL`: URL backend ma VNPay goi duoc. Khi chay local, IPN tu Internet khong goi duoc `localhost`.
- `SEPAY_API_TOKEN`: API token SePay v2. `SEPAY_BANK_ACCOUNT_NO`: so tai khoan nhan tien da lien ket voi SePay. Backend lay ten chu tai khoan va ma ngan hang truc tiep tu API.
- `FRONTEND_URL`: URL frontend de VNPay chuyen khach ve trang ket qua.

Khoi tao database bang `database/schema.sql` truoc. Luc backend khoi dong, hai bang `vnpay_payment_attempts` va `bank_payment_attempts` duoc tao them. Backend chi tao yeu cau thanh toan khi reservation con hieu luc va lay so tien coc tu database.

## Luong xu ly

1. Khach giu o do va chon VNPay hoac Banking trong man dat cho.
2. VNPay chuyen sang cong VNPay. Ket qua co chu ky hop le duoc ghi vao database. Banking tao VietQR voi ma chuyen khoan rieng, sau do backend doi soat qua SePay API v2.
3. Backend cap nhat `reservations` va `payments` trong mot giao dich database. Giao dich den sau khi het han giu cho duoc danh dau `late`, khong cap ve tu dong.
4. Frontend doc trang thai giao dich va hien thi ve khi da thanh cong.

Backend doi soat cac giao dich Banking dang cho moi 20 giay khi server chay. Chi chay frontend se khong du de xac nhan tien. Cac truong hop tien den muon hoac thanh toan trung can doi soat va hoan tra thu cong.

Truoc khi mo thanh toan production cho khach hang, can bat buoc xac thuc va kiem tra chu so huu reservation tren cac API giu cho/tao thanh toan, va thiet lap quy trinh xu ly tien den muon, thanh toan trung. Nhanh nay chua xu ly tu dong viec hoan tien.

API tham khao: [SePay API v2](https://developer.sepay.vn/vi/sepay-api/v2/gioi-thieu), [VNPay Payment](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).
