# Hướng dẫn Khởi tạo Database SQL Server cho Jobtimize

Hệ thống **Jobtimize** sử dụng **Microsoft SQL Server** với cơ sở dữ liệu `JobtimizeDB`.

## 1. Khởi chạy bằng SQL Server Management Studio (SSMS) hoặc Azure Data Studio
1. Mở SSMS và kết nối đến SQL Server Instance của bạn (ví dụ: `localhost` hoặc `.` hoặc `localhost\SQLEXPRESS`).
2. Mở file [database/schema.sql](file:///c:/Users/duong/Desktop/Jobtimize/database/schema.sql) và nhấn **Execute (F5)** để tạo CSDL `JobtimizeDB` cùng các bảng quan hệ.
3. Mở file [database/seed.sql](file:///c:/Users/duong/Desktop/Jobtimize/database/seed.sql) và nhấn **Execute (F5)** để nạp dữ liệu Roles, Kỹ năng IT chuẩn (Taxonomy), Khóa học gợi ý và tài khoản Admin mặc định.

## 2. Tài khoản Quản trị mặc định (Admin Seed):
- **Email:** `admin@jobtimize.vn`
- **Mật khẩu:** `Admin@123`

## 3. Cấu hình biến môi trường kết nối Backend (.env)
Trong thư mục `server/.env`, cấu hình các thông số phù hợp với SQL Server của bạn:
```env
PORT=5000
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_NAME=JobtimizeDB
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=JobtimizeSecretKey_2024_Super_Secure_JWT_Key!
```
*(Nếu sử dụng Windows Authentication, có thể cấu hình connection string hoặc driver tương ứng)*.
