# Jobtimize - AI-Powered Recruitment Platform 🚀

Nền tảng tuyển dụng thông minh tích hợp AI, lấy cảm hứng từ TopCV & LinkedIn, hỗ trợ tính toán tự động **Match Score (%)** giữa CV và JD, phát hiện **Lỗ hổng kỹ năng (Skill Gap)** và đề xuất **Lộ trình khóa học (Courses)** bù đắp thiếu hụt.

---

## 1. Cấu trúc Dự án (Monorepo)

```
Jobtimize/
├── client/                     # Frontend (React + Vite + Tailwind CSS + Lucide Icons)
│   ├── src/
│   │   ├── components/         # Navbar, Footer, MatchScoreBadge, Modal
│   │   ├── context/            # AuthContext (JWT Authentication & Google Mock Login)
│   │   ├── pages/
│   │   │   ├── auth/           # LoginPage, RegisterPage
│   │   │   ├── candidate/      # CandidateDashboard (CVs, Applications, Saved Jobs), SkillGapAnalysisPage
│   │   │   ├── employer/       # EmployerDashboard, PostJobPage, EmployerATSPage (Xếp hạng AI)
│   │   │   └── jobs/           # JobDetailPage (JD, 1-Click Apply, Widget AI Matching & Courses)
│   │   ├── services/           # api.js (Axios Client với Interceptors)
│   │   ├── App.jsx             # React Router v6
│   │   └── main.jsx
│   └── package.json
│
├── server/                     # Backend (Node.js + Express + MS SQL Server)
│   ├── src/
│   │   ├── config/             # db.js (Kết nối MS SQL Server mssql pool)
│   │   ├── controllers/        # authController, jobController, candidateController, employerController, categoryController
│   │   ├── middleware/         # authMiddleware (JWT & Roles), uploadMiddleware (Multer)
│   │   ├── routes/             # authRoutes, jobRoutes, candidateRoutes, employerRoutes, categoryRoutes
│   │   ├── services/           # aiMatchingService.js (Thuật toán Weighted AI Matching & Course Recommendation)
│   │   ├── utils/              # authHelper.js (bcrypt, jwt)
│   │   └── server.js           # Express App Entry
│   ├── uploads/                # Lưu trữ file CV tải lên
│   ├── .env                    # Cấu hình kết nối SQL Server (sa / 123)
│   └── package.json
│
└── database/
    ├── schema.sql              # DDL Script tạo CSDL JobtimizeDB trên SSMS
    ├── seed.sql                # Dữ liệu ban đầu (Roles, Ngành nghề, Từ điển Kỹ năng, Khóa học gợi ý)
    └── README.md
```

---

## 2. Hướng dẫn Khởi chạy Hệ thống

### Bước 1: Khởi tạo Database trên SQL Server Management Studio (SSMS)
1. Mở SSMS, đăng nhập với tài khoản:
   - **Authentication:** SQL Server Authentication
   - **Login:** `sa`
   - **Password:** `123`
2. Mở file [database/schema.sql](file:///c:/Users/duong/Desktop/Jobtimize/database/schema.sql) và nhấn **Execute (F5)** để tạo CSDL `JobtimizeDB` và các bảng.
3. Mở file [database/seed.sql](file:///c:/Users/duong/Desktop/Jobtimize/database/seed.sql) và nhấn **Execute (F5)** để nạp dữ liệu danh mục ngành nghề, kỹ năng IT chuẩn và khóa học mẫu.

### Bước 2: Cài đặt Dependencies & Khởi chạy Backend Server
Mở Terminal tại thư mục `server/`:
```bash
cd server
npm install
npm run dev
```
👉 Server sẽ lắng nghe tại: `http://localhost:5000`

### Bước 3: Cài đặt Dependencies & Khởi chạy React Frontend
Mở một cửa sổ Terminal khác tại thư mục `client/`:
```bash
cd client
npm install
npm run dev
```
👉 Truy cập ứng dụng tại: `http://localhost:3000`

---

## 3. Các Tính năng Cốt lõi Đã Xây dựng

### A. Authentication & Quản lý Người dùng:
- **Đăng ký tài khoản:** Phân biệt rõ vai trò **Ứng viên** hoặc **Nhà tuyển dụng**, băm mật khẩu an toàn với `bcrypt`.
- **Đăng nhập:** Hỗ trợ form email/password và nút **Đăng nhập 1-Click giả lập Google OAuth** cho cả 2 vai trò.
- **Bật/Tắt trạng thái tìm việc (IsLookingForJob):** Nút gạt nhanh ngay trên Navigation bar và Dashboard ứng viên.

### B. Dành cho Ứng viên (Job Seeker):
- **Tìm kiếm & Lọc việc làm:** Tìm theo từ khóa, địa điểm, ngành nghề với giao diện chuẩn TopCV/LinkedIn.
- **Quản lý nhiều phiên bản CV (UC-C05, UC-C06):** Tải lên file PDF/DOCX, xem file, xóa CV, đặt làm CV chính mặc định.
- **1-Click Apply (UC-C13):** Chọn nhanh CV mặc định để nộp đơn, hệ thống tự động tính toán điểm AI Match Score ngay tại thời điểm ứng tuyển.
- **Lưu việc làm yêu thích (UC-C10):** Đánh dấu lưu và quản lý danh sách việc làm đã lưu.
- **AI Skill Gap & Lộ trình học (UC-C11, UC-C12, UC-AI01):** Phân tích các kỹ năng đã đạt vs kỹ năng còn thiếu trên thị trường, tự động đề xuất khóa học tương ứng từ Coursera/Udemy để bù đắp.

### C. Dành cho Nhà tuyển dụng (Employer ATS):
- **Đăng tin tuyển dụng (UC-E05):** Soạn thảo JD, mức lương, khu vực và gắn thẻ các kỹ năng yêu cầu (với tùy chọn Bắt buộc / Ưu tiên).
- **Hệ thống Quản lý Ứng viên ATS thông minh (UC-E08):** Tự động sắp xếp các ứng viên đã nộp theo thứ hạng **Match Score (%)** từ cao xuống thấp.
- **Xem CV & Đổi trạng thái tuyển dụng:** Chuyển đổi linh hoạt giữa các trạng thái `Applied` -> `Screening` -> `Interviewing` -> `Offered` -> `Rejected`.
- **Lên lịch phỏng vấn (UC-E10):** Điền thời gian, link họp Google Meet/Zoom và gửi thông báo trực tiếp cho ứng viên.
