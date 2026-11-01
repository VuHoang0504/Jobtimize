# Database Jobtimize

SQL Server 2022. Thư mục này có hai file SQL dùng để khởi tạo:

- `schema.sql`: toàn bộ bảng, cột, khóa ngoại, ràng buộc và chỉ mục của web; bao gồm CV, thông báo, kiểm duyệt, thanh toán và phỏng vấn. Không thêm tài khoản hay dữ liệu nghiệp vụ.
- `seed.sql`: vai trò, ngành nghề, kỹ năng, khóa học, gói dịch vụ, tài khoản demo và việc làm mẫu. Chạy sau schema; không ghi đè tài khoản đã tồn tại.

## Khởi tạo bằng Node.js

Cấu hình kết nối SQL Server trong `server/.env`, sau đó chạy từ thư mục gốc:

```powershell
npm run db:init
```

Lệnh dùng `DB_NAME` trong môi trường, tạo database nếu chưa có, chạy `schema.sql` rồi `seed.sql`. Có lỗi SQL sẽ dừng và trả mã lỗi; không báo thành công khi thiếu bảng.

Chỉ tạo/cập nhật cấu trúc, không nạp dữ liệu:

```powershell
npm run db:init -- --schema-only
```

## Khởi tạo bằng SSMS

1. Kết nối SQL Server bằng tài khoản có quyền tạo database/bảng.
2. Chạy toàn bộ `schema.sql` để tạo `JobtimizeDB` và cấu trúc.
3. Chạy `seed.sql` nếu cần dữ liệu khởi tạo và demo.
4. Nếu dùng tên khác, đổi tên database ở đầu cả hai file và đặt `DB_NAME` tương ứng.

Schema có thể chạy lại: tạo thành phần còn thiếu, giữ bảng và bản ghi hiện có. Các lệnh migration cũ dùng chung schema này. Backend dùng schema này để cập nhật cấu trúc, không tự chèn dữ liệu demo khi khởi động. Các thay đổi schema về sau chỉ sửa trong `schema.sql`; dữ liệu khởi tạo sửa trong `seed.sql`.

Script bảo trì mật khẩu demo được giữ riêng tại `server/scripts/sql/update_demo_passwords.sql`, chỉ chạy khi chủ động cần; không thuộc luồng khởi tạo.

## Kiểm tra

```powershell
npm run test:db
npm --prefix server run test:notifications
npm run test:cv-analysis
npm run test:employer-account
npm --prefix server run test:otp
npm run build
```

`test:db` dùng database `JobtimizeSchemaTest_<id>` riêng, tự dọn sau kiểm thử. Kiểm tra tạo cấu trúc rỗng, nạp seed riêng, chạy lại không mất/trùng dữ liệu, cập nhật cột thiếu, `DB_NAME`, chế độ chỉ tạo cấu trúc và dừng khi SQL lỗi. Bộ kiểm thử SQL tích hợp cần SQL Server cục bộ, `sqlcmd` và quyền Windows Authentication để tạo/dọn database thử nghiệm.
