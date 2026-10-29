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
| **Ứng viên — Nguyễn Minh Anh** | `ungvien01@example.com` | `Candidate@123` | Frontend Developer, Hà Nội |
| **Ứng viên — Trần Hoàng Nam** | `ungvien02@example.com` | `Candidate@123` | Backend Developer, TP. Hồ Chí Minh |
| **Ứng viên — Lê Thu Hà** | `ungvien03@example.com` | `Candidate@123` | UI/UX Designer, Đà Nẵng |
| **Ứng viên (Candidate)** | *Tự đăng ký mới* | *Tùy chọn* | Hoặc dùng nút **Đăng nhập 1-Click giả lập Google** |

Ba tài khoản `ungvien01`–`ungvien03` đã được kích hoạt và có hồ sơ cơ bản. Email `example.com` chỉ dùng để đăng nhập kiểm thử, không nhận OTP.

Khi cài trên máy khác với database mới, sau khi cài dependencies và khởi tạo database, chạy lệnh sau từ thư mục gốc để tạo ba tài khoản này:

```bash
node server/scripts/seedDemoCandidates.js
```

Script bỏ qua email đã tồn tại, không ghi đè tài khoản hoặc mật khẩu hiện có.

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

### Không nhận được mã OTP qua email

- Cấu hình `EMAIL_USER` và `EMAIL_PASS` trong `server/.env`. Với Gmail, dùng App Password của chính tài khoản `EMAIL_USER`, không dùng mật khẩu đăng nhập thông thường. Xem [hướng dẫn App Password của Google](https://support.google.com/accounts/answer/185833).
- Chế độ `npm run dev` theo dõi cả `src` và `.env`, tự khởi động lại backend khi cấu hình thay đổi. Nếu vừa thêm cấu hình nodemon, dừng và chạy lại lệnh dev một lần để áp dụng. Với `npm start`, cần khởi động lại backend sau khi sửa `.env`. Biến môi trường của tiến trình được ưu tiên hơn `.env`.
- Chạy `npm --prefix server run check:smtp` để kiểm tra kết nối và xác thực (không gửi email). Trên Windows PowerShell nếu `npm.ps1` bị chặn, dùng `npm.cmd` thay cho `npm`.
- `EAUTH 535` nghĩa là máy chủ SMTP từ chối thông tin đăng nhập; kiểm tra tài khoản gửi và tạo lại App Password. Lỗi timeout cần kiểm tra kết nối đến máy chủ/cổng SMTP.
- Muốn dùng nhà cung cấp khác, cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` và tùy chọn `SMTP_FROM` theo `server/.env.example`.
- API chỉ báo thành công khi SMTP chấp nhận email; khi gửi thất bại, trả HTTP 503 và không cung cấp OTP qua API hoặc log. Mã cũ còn hạn vẫn dùng được nếu gửi lại thất bại. Nếu SMTP chấp nhận mà chưa thấy thư, kiểm tra mục Spam.
- Chạy `npm --prefix server run test:otp` để kiểm thử hồi quy bằng SMTP và database giả lập.
- OTP hiện được lưu trong bộ nhớ, có hiệu lực 10 phút và mất khi backend khởi động lại. Khi chạy nhiều backend, cần kho OTP dùng chung.

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

## Trình tạo CV trực tiếp

- Bảng bên trái chọn mẫu **Đơn giản / Chuyên nghiệp / Ấn tượng**, font, màu, cỡ chữ, giãn dòng và quản lý các mục. Bấm vào chữ trên trang A4 bên phải để nhập; rời ô nhập để phân trang lại. Kéo các mục trong cùng cột hoặc dùng nút lên/xuống.
- **Lưu CV** lưu phiên bản chỉnh sửa vào tài khoản. **Tải về** tải trực tiếp PDF của nội dung hiện tại, kể cả khi chưa lưu; không mở hộp thoại in. Tải PDF không tự lưu CV.
- Avatar riêng từng CV: JPG/PNG/WebP tối đa 5 MB, cắt vuông và căn chỉnh trước khi tải. Ảnh gốc không thay đổi avatar tài khoản. CV hỗ trợ giải thưởng, sở thích, hoạt động, người giới thiệu và thông tin thêm.
- Bốn font được phục vụ cục bộ trong `client/public/cv-fonts/` (kèm giấy phép). Font không tự dịch nội dung. Khi cập nhật các gói `@fontsource`, chạy `node scripts/copyCVFonts.mjs` để cập nhật font đóng gói.

### Cài đặt PDF trên máy phát triển / triển khai

Sau `npm run install:all`, chạy:

```bash
npm run cv:browser
```

Lệnh cài Chromium vào `.cache/ms-playwright/`. Có thể cấu hình `PLAYWRIGHT_BROWSERS_PATH` cho thư mục cài riêng; dùng cùng giá trị khi cài và khi chạy server. Trên Linux, cài thêm thư viện hệ thống theo hướng dẫn `playwright install-deps chromium`. Server cần quyền chạy Chromium và ghi `server/private/cv-avatars/`; giữ thư mục ảnh này trên ổ lưu trữ bền vững khi triển khai. Không đặt thư mục ảnh riêng dưới static uploads. Các ảnh đã thay vẫn được giữ để CV khác và thao tác hoàn tác không mất ảnh.

PDF sử dụng cùng bộ dựng HTML/CSS, font và quy tắc phân trang với xem trước. Triển khai kèm `shared/cv/` và `client/public/cv-fonts/` bên cạnh `server/` trong cùng cấu trúc monorepo. Máy chủ không tải tài nguyên bên ngoài khi tạo PDF. Không cần thay đổi schema: cấu hình mới nằm trong JSON `CvData`, CV cũ được chuẩn hóa khi mở.

### Kiểm tra CV

```bash
npm run test:cv
npm --prefix server run test:otp
# Chạy Vite trên 127.0.0.1:3000 trước khi chạy kiểm thử giao diện:
npm run test:cv:ui
```

Kiểm thử CV dùng dữ liệu giả lập, kiểm tra 12 tổ hợp mẫu/font, phân trang dài, font tiếng Việt, quyền ảnh, API xuất PDF và thao tác chỉnh sửa/lưu/mở lại. Không ghi vào database thật. Ảnh kiểm tra và PDF nằm trong `.cache/cv-tests/`.

### Dữ liệu mẫu cho menu việc làm

Chạy `npm run seed:browse` để bổ sung 19 tin tuyển dụng mẫu và các ngành nghề cho menu vị trí/lĩnh vực. Script chỉ thêm dữ liệu còn thiếu, chạy trong transaction và không tạo tin trùng khi chạy lại. Tin thuộc doanh nghiệp mẫu được ghi rõ là dữ liệu minh họa. Lệnh `npm run seed:jobs` cũng bao gồm bước này.

Danh sách nhóm và ánh xạ ngành dùng chung cho giao diện/API nằm trong `shared/jobBrowseGroups.json`. Nhóm Senior lọc theo cấp bậc trong chức danh; các nhóm còn lại lọc theo danh mục ngành nghề, độc lập với từ khóa tìm kiếm.

Kiểm tra sau khi đã chạy ứng dụng và seed:
- `node --test server/scripts/test_job_browse.js`: kiểm tra đọc trên cơ sở dữ liệu hiện tại, mỗi nhóm có ít nhất một tin đúng ngành.
- `node --test server/scripts/test_job_category_ui.mjs`: kiểm tra giao diện desktop/mobile với API giả lập; mặc định Vite ở cổng 3000, có thể đổi bằng `JOB_CATEGORY_TEST_URL`.

### Kết nối OpenAI cho các chức năng nội dung

Cấu hình trong `server/.env` (không thêm khóa vào client hoặc commit):

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_OUTPUT_TOKENS=8000
```

Khởi động lại API sau khi thay đổi cấu hình. OpenAI được nối vào soạn mô tả tuyển dụng, đọc CV dạng văn bản/tài liệu/hình ảnh, tạo câu hỏi và nhận xét phỏng vấn. Các chức năng đối chiếu kỹ năng, điểm phù hợp và gợi ý khóa học vẫn dùng dữ liệu/kỹ năng của hệ thống, không gọi mô hình cho từng tin tuyển dụng. Giao diện không hiển thị tên nhà cung cấp.

`AI_PROVIDER=auto` ưu tiên OpenAI nếu có khóa, tiếp theo Gemini, cuối cùng xử lý cục bộ khi không có khóa. `gemini` và `local` cho phép chọn rõ dịch vụ. Lỗi OpenAI được báo về chức năng thay vì trả kết quả mẫu hoặc chuyển CV sang nhà cung cấp khác. Model được chọn ở server qua `OPENAI_MODEL`.

- `npm run check:ai`: xem trạng thái cấu hình, không in khóa và không gọi dịch vụ.
- `npm run check:ai -- --live`: gửi yêu cầu kiểm tra tổng hợp nhỏ tới OpenAI, không gửi CV hoặc dữ liệu người dùng. Yêu cầu này sử dụng hạn mức API.
- `npm run test:ai`: kiểm tra độc lập bằng HTTP giả lập, không gọi nhà cung cấp.

Tích hợp dùng [Responses API và JSON mode](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), hỗ trợ ảnh mã hóa base64 và đặt `store: false`.

Lệnh `npm run check:ai` hiển thị cấu hình cả OpenAI và Gemini. `npm run check:ai -- --live` kiểm tra độc lập tất cả dịch vụ đã có khóa, vẫn tiếp tục nếu một dịch vụ lỗi. Có thể kiểm tra riêng bằng `npm run check:ai -- --live --provider=gemini` hoặc `--provider=openai`. Tham số kiểm tra không thay đổi dịch vụ website đang dùng; `AI_PROVIDER` quyết định dịch vụ thực tế. `GEMINI_MODEL` cho phép chọn model Gemini trên server.

### Model đang dùng cho website

Các chức năng soạn tin tuyển dụng, đọc CV và luyện phỏng vấn dùng cấu hình server: `AI_PROVIDER=gemini` và `GEMINI_MODEL=gemini-3-flash-preview`. Khởi động lại backend sau khi thay đổi cấu hình. Model được chọn rõ sẽ được sử dụng cho các chức năng này.

## Chuông thông báo

Chuông lưu thông báo thật theo tài khoản cho ứng tuyển, lời mời, duyệt tin, KYC, báo cáo vi phạm và đăng nhập Candidate. Gợi ý dùng CV mặc định, lấy tối đa 3 tin còn tuyển có mức khớp kỹ năng từ 70%. Có số chưa đọc, lọc, phân trang và đánh dấu đã đọc.

Backend tự áp dụng migration bổ sung khi khởi động. Có thể chạy riêng `npm --prefix server run db:notifications`; chạy kiểm thử bằng `npm run test:notifications`. Xem [luồng nghiệp vụ, cơ chế outbox và hướng dẫn kiểm thử](docs/notifications.md).

Admin date-filtered reports, CSV export, automatic Premium and confirmed-violation bans: [setup and verification](docs/admin-enhancements.md).
