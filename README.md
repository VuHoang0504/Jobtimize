# Jobtimize - AI-Powered Recruitment Platform 🚀

Nền tảng tuyển dụng thông minh tích hợp AI (lấy cảm hứng từ TopCV & LinkedIn), hỗ trợ tính toán tự động **Match Score (%)** giữa CV và JD, phát hiện **Lỗ hổng kỹ năng (Skill Gap)** và đề xuất **Lộ trình khóa học (Courses)** bù đắp thiếu hụt.

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
│   │   ├── controllers/        # authController, jobController, candidateController, employerController, categoryController, aiController
│   │   ├── middleware/         # authMiddleware (JWT & Roles), uploadMiddleware (Multer)
│   │   ├── routes/             # authRoutes, jobRoutes, candidateRoutes, employerRoutes, categoryRoutes, aiRoutes
│   │   ├── services/           # aiMatchingService.js (Thuật toán Weighted AI Matching & Course Recommendation)
│   │   ├── utils/              # authHelper.js (bcrypt, jwt)
│   │   └── server.js           # Express App Entry (Port 5000)
│   ├── scripts/
│   │   ├── initDb.js           # Script tự động tạo DB, chạy schema & nạp seed
│   │   └── seedJobs.js         # Nạp thêm dữ liệu JD mẫu đa dạng
│   ├── uploads/                # Lưu trữ file CV tải lên (PDF, DOCX)
│   ├── .env.example            # Mẫu biến môi trường
│   ├── .env                    # Cấu hình kết nối SQL Server (sa / 123)
│   └── package.json
│
├── database/
│   ├── schema.sql              # DDL Script tạo CSDL JobtimizeDB và toàn bộ cấu trúc bảng
│   ├── seed.sql                # Dữ liệu ban đầu (Roles, Ngành nghề, Từ điển Kỹ năng, Khóa học, JD mẫu)
│   └── README.md
│
├── docker-compose.yml          # Chạy MS SQL Server 2022 qua Docker (Dành cho macOS / Linux)
├── enable-sql-tcp.bat          # 1-Click mở cổng TCP 1433 & tắt bản SQL Server thừa (Windows)
├── fix-sql.ps1                 # Script PowerShell hỗ trợ mở cổng 1433 với quyền Admin
├── package.json                # Root package quản lý scripts monorepo
└── README.md
```

---

## 2. Hướng dẫn Khởi chạy Nhanh (Quick Start)

Dự án đã được tối ưu hóa để có thể chạy trên **bất kỳ máy tính nào** chỉ với 3 bước:

Note: database đổi tk: sa  mật khẩu: 123
Cách đổi: sercurity -> login -> sa rồi đổi mk

### Bước 1: Cấu hình Môi trường (`.env`)
Tại thư mục `server/`, tạo file `.env` từ file mẫu:
```bash
# Windows PowerShell:
Copy-Item server/.env.example server/.env

# Linux / macOS / Git Bash:
cp server/.env.example server/.env
```
*(File cấu hình mặc định sẵn kết nối `127.0.0.1`, cổng `1433`, user `sa`, mật khẩu `123`, CSDL `JobtimizeDB`)*.

---

### Bước 2: Chuẩn bị CSDL (Chọn 1 trong các cách sau)

#### 👉 Cách A: Dùng script tự động bằng Node.js (Khuyên dùng - Nhanh nhất)
Nếu máy bạn đã cài sẵn SQL Server:
```bash
npm run db:init
```
*(Script sẽ tự động kết nối SQL Server, tạo CSDL `JobtimizeDB`, chạy cấu trúc bảng `schema.sql` và nạp toàn bộ `seed.sql` mà **không cần mở SSMS**).*

> [!NOTE]
> **Dành cho Windows:** Nếu gặp lỗi `ConnectionError: Failed to connect to 127.0.0.1:1433`, hãy nhấp đúp vào file [enable-sql-tcp.bat](file:///c:/Users/duong/Desktop/Jobtimize/enable-sql-tcp.bat) ngoài thư mục gốc và chọn **Yes** khi Windows hỏi quyền Admin để kích hoạt cổng 1433.

#### 👉 Cách B: Dùng Docker (Dành cho macOS, Linux hoặc không muốn cài SQL Server)
```bash
docker compose up -d
npm run db:init
```

#### 👉 Cách C: Khởi tạo thủ công bằng SSMS
1. Mở SSMS, đăng nhập tài khoản: `sa` / `123`.
2. Mở file [database/schema.sql](file:///c:/Users/duong/Desktop/Jobtimize/database/schema.sql) và nhấn **Execute (F5)**.
3. Mở file [database/seed.sql](file:///c:/Users/duong/Desktop/Jobtimize/database/seed.sql) và nhấn **Execute (F5)**.

---

### Bước 3: Cài đặt Dependencies & Khởi chạy Toàn bộ Dự án

#### Cách 1: Khởi chạy 1-Click từ thư mục gốc
```bash
# Cài đặt toàn bộ dependencies cho cả backend và frontend
npm run install:all

# Khởi chạy song song cả Server (port 5000) và Client (port 3000)
npm run dev
```

#### Cách 2: Khởi chạy độc lập từng terminal
**Terminal 1 (Backend Server):**
```bash
cd server
npm install
npm run dev
```
👉 Server lắng nghe tại: `http://localhost:5000`

**Terminal 2 (Frontend React):**
```bash
cd client
npm install
npm run dev
```
👉 Truy cập ứng dụng tại: `http://localhost:3000`

---

## 3. Tài khoản Kiểm thử Mặc định (Demo Accounts)

Hệ thống đã nạp sẵn các tài khoản mẫu để bạn kiểm thử ngay lập tức:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@jobtimize.vn` | `Admin@123` | Quản lý hệ thống, duyệt KYC doanh nghiệp |
| **Nhà tuyển dụng (FPT Software)** | `hr@fpt-software.com` | `Admin@123` | Đăng tin, quản lý ATS xếp hạng AI |
| **Nhà tuyển dụng (VNG)** | `career@vng.com.vn` | `Admin@123` | Đăng tin JD Frontend & UI/UX |
| **Nhà tuyển dụng (KMS Tech)** | `career-dn@kms-technology.com` | `Admin@123` | Đăng tin JD .NET & QA Automation |
| **Nhà tuyển dụng (VinAI)** | `career@vinai.io` | `Admin@123` | Đăng tin JD Python & AI / MLOps |
| **Ứng viên (Candidate)** | *Tự đăng ký mới* | *Tùy chọn* | Hoặc dùng nút **Đăng nhập 1-Click giả lập Google** |

> [!TIP]
> Bạn có thể bấm vào nút **"Đăng nhập nhanh với tư cách Ứng viên / Nhà tuyển dụng"** ngay trên giao diện trang Đăng nhập mà không cần nhập mật khẩu.

---

## 4. Các Tính năng Cốt lõi của Nền tảng

### A. Dành cho Ứng viên (Job Seeker):
- **Tìm kiếm & Bộ lọc Việc làm thông minh:** Tìm việc theo từ khóa, ngành nghề (IT, AI & Data, Cloud/DevOps, UI/UX, QA), địa điểm (Hà Nội, TP.HCM, Đà Nẵng).
- **Quản lý CV Đa phiên bản (UC-C05, UC-C06):** Tải lên nhiều file CV (PDF, DOCX), xem trước CV, chọn CV chính làm mặc định.
- **Ứng tuyển 1-Click & Chấm điểm AI Match Score (UC-C13):** Khi ứng tuyển bằng CV mặc định, thuật toán AI sẽ tự động phân tích độ tương thích giữa kỹ năng trong CV và yêu cầu của JD, hiển thị điểm phần trăm trực quan.
- **Phân tích Lỗ hổng Kỹ năng (Skill Gap) & Lộ trình Học tập (UC-C11, UC-C12, UC-AI01):** Đối chiếu kỹ năng của ứng viên với yêu cầu thị trường, chỉ ra kỹ năng còn thiếu và đề xuất khóa học bù đắp chất lượng từ Coursera / Udemy.
- **Bật/Tắt Trạng thái Tìm việc (IsLookingForJob):** Nút gạt nhanh trên Navigation bar và Dashboard để cho phép nhà tuyển dụng tìm thấy hồ sơ.

### B. Dành cho Nhà tuyển dụng (Employer ATS):
- **Đăng tin Tuyển dụng (UC-E05):** Soạn thảo JD, mức lương, khu vực và gắn thẻ các kỹ năng yêu cầu (Bắt buộc / Ưu tiên).
- **Hệ thống Quản lý Ứng viên ATS thông minh (UC-E08):** Tự động sắp xếp các ứng viên đã nộp đơn theo thứ hạng **Match Score (%)** từ cao xuống thấp, giúp sàng lọc hồ sơ nhanh gấp 5 lần.
- **Quản lý Vòng Tuyển dụng:** Chuyển đổi trạng thái linh hoạt: `Applied` ➔ `Screening` ➔ `Interviewing` ➔ `Offered` ➔ `Rejected`.
- **Lên lịch Phỏng vấn (UC-E10):** Điền thời gian, link họp Google Meet/Zoom và gửi thông báo trực tiếp đến ứng viên.

### C. Quản trị & Xác thực (Admin & Auth):
- **Phân quyền người dùng:** Admin, Employer, Candidate với bảo mật mã hóa JWT & mật khẩu băm `bcrypt`.
- **Đăng nhập Google OAuth:** Hỗ trợ cả đăng nhập thực tế và đăng nhập 1-Click giả lập dành cho demo / testing.

---

## 5. Danh sách API Endpoints Chính

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản (Ứng viên / Doanh nghiệp) |
| `POST` | `/api/auth/login` | Public | Đăng nhập hệ thống, trả về JWT Token |
| `GET` | `/api/jobs` | Public | Lấy danh sách việc làm (tìm kiếm & phân trang) |
| `GET` | `/api/jobs/:id` | Public | Xem thông tin chi tiết một tin tuyển dụng |
| `POST` | `/api/candidate/cv/upload` | Candidate | Tải lên file CV (PDF / DOCX) |
| `POST` | `/api/jobs/:id/apply` | Candidate | Nộp đơn ứng tuyển 1-Click & tính AI Match Score |
| `GET` | `/api/ai/skill-gap` | Candidate | Phân tích Skill Gap & đề xuất khóa học |
| `POST` | `/api/employer/jobs` | Employer | Đăng tin tuyển dụng mới kèm kỹ năng yêu cầu |
| `GET` | `/api/employer/jobs/:id/candidates` | Employer | Xem danh sách ứng viên xếp hạng theo AI Match Score |
| `PUT` | `/api/employer/applications/:id/status`| Employer | Cập nhật trạng thái vòng tuyển dụng ứng viên |
| `GET` | `/api/metadata/categories` | Public | Lấy danh mục ngành nghề và từ điển kỹ năng |

---

## 6. Xử lý Sự cố Thường gặp (Troubleshooting)

### ❓ Lỗi: `ConnectionError: Failed to connect to 127.0.0.1:1433 - Could not connect (sequence)`
- **Nguyên nhân:** Khi cài đặt SQL Server trên Windows, giao thức TCP/IP trên cổng 1433 bị tắt mặc định.
- **Cách khắc phục:** Nhấp chuột phải vào file [enable-sql-tcp.bat](file:///c:/Users/duong/Desktop/Jobtimize/enable-sql-tcp.bat) và chọn **"Run as administrator"** (hoặc mở PowerShell Admin dán lệnh trong [fix-sql.ps1](file:///c:/Users/duong/Desktop/Jobtimize/fix-sql.ps1)), sau đó khởi động lại server.

### ❓ Lỗi: Chưa có dữ liệu việc làm hiển thị trên trang chủ
- **Cách khắc phục:** Mở terminal chạy lệnh:
  ```bash
  npm run db:init
  ```
  Lệnh này sẽ tự động nạp toàn bộ 13 tin tuyển dụng mẫu, các công ty và kỹ năng vào database.

### ❓ Lỗi: Xung đột cổng `EADDRINUSE: port 5000` hoặc `3000`
- **Cách khắc phục:** Đảm bảo không có tiến trình server hoặc client cũ đang chạy ngầm. Trên Windows PowerShell, bạn có thể tìm và tắt bằng:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
  ```

---

## 7. Công nghệ Sử dụng (Tech Stack)

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Axios, React Router v6.
- **Backend:** Node.js, Express.js, mssql (Tedious Driver), Multer, JsonWebToken, Bcrypt.js, Mammoth, Pdf-parse.
- **Database:** Microsoft SQL Server (Transact-SQL), Docker MSSQL 2022.
- **AI Engine:** Heuristic Weighted AI Matching Algorithm & Skill Gap Taxonomy Mapping.
