# Quản lý tuyển dụng

## Luồng lời mời

1. Nhà tuyển dụng vào **Tìm kiếm ứng viên**, chọn hồ sơ và **Gửi lời mời ứng tuyển** cho một tin đang mở.
2. Ứng viên nhận email và thông báo trên chuông. Nhà tuyển dụng cũng có thông báo xác nhận lời mời đã gửi.
3. Ứng viên vào **Lời mời & lịch phỏng vấn**, chọn **Quan tâm** hoặc **Từ chối**. Quan tâm không tự tạo đơn ứng tuyển.
4. Nhà tuyển dụng xem **Lời mời đã gửi**, lọc **Quan tâm**, chọn **Hẹn phỏng vấn**. Điền thời gian, hình thức, đường dẫn cuộc họp có thật hoặc địa điểm, và thông tin liên hệ.
5. Ứng viên nhận email, thông báo và chọn **Xác nhận tham gia** hoặc **Không thể tham gia** trên website.
6. Khi cần đổi lịch, hai bên liên hệ qua email/điện thoại. Nhà tuyển dụng cập nhật lịch hiện tại; trạng thái trở về **Chờ xác nhận lịch**. Phản hồi từ phiên bản lịch cũ bị từ chối.

Không có chat, bảng hội thoại, đồng bộ lịch ngoài hoặc tự tạo đường dẫn Google Meet. Mỗi nguồn lời mời/hồ sơ giữ một lịch hiện tại; cập nhật lịch không tạo thêm bản ghi lịch sử.

## Luồng ứng tuyển chủ động

Ứng viên nộp CV → số hồ sơ và số hồ sơ mới ở **Quản lý tin tuyển dụng** tăng → **Xét duyệt hồ sơ** → xem CV đã nộp → duyệt vào xét tuyển / từ chối → hẹn phỏng vấn → ứng viên xác nhận → xác nhận ứng tuyển / từ chối.

Khi xét duyệt, xác nhận ứng tuyển hoặc từ chối, ứng viên nhận thông báo và hệ thống gửi email cập nhật. Từ chối hồ sơ sẽ hủy lịch đang chờ/đã xác nhận của hồ sơ đó. Tin đóng/hết hạn không nhận lời mời mới hoặc lịch mới. Chỉ chủ sở hữu được thao tác.

## Thay đổi cơ sở dữ liệu

Migration: `database/schema.sql` (có thể chạy nhiều lần).

| Bảng hiện có | Trường mới | Mục đích |
| --- | --- | --- |
| CandidateInvitations | RespondedAt DATETIME2 NULL | Thời điểm quan tâm/từ chối |
| CandidateInvitations | Version INT DEFAULT 1 | Ngăn phản hồi lời mời cũ sau khi gửi lại |
| Interviews | InvitationID INT NULL | Khóa ngoại tới lời mời, cho phép hẹn mà không tạo đơn ứng tuyển |
| Interviews | Status NVARCHAR(20) DEFAULT 'Pending' | Pending, Confirmed, Declined, Cancelled |
| Interviews | RespondedAt DATETIME2 NULL | Thời điểm phản hồi lịch |
| Interviews | Version INT DEFAULT 1 | Ngăn xác nhận nhầm phiên bản lịch sau khi đổi |

Thêm khóa ngoại `FK_Interviews_Invitation` và chỉ mục `IX_Interviews_Invitation(InvitationID, InterviewID DESC)`. Không thêm bảng mới. `CandidateInvitations.Status` đã có sẵn: Sent, Accepted, Declined. Dùng lại `Notifications` và `NotificationOutbox` cho thông báo.

Với database cũ chưa có `Interviews.InterviewType`, migration cũng bổ sung cột `NVARCHAR(20) NOT NULL DEFAULT 'Online'`. Cột này vốn đã có trong schema khởi tạo mới; lịch cũ nhận giá trị mặc định `Online` và có thể được nhà tuyển dụng điều chỉnh lại.

## Cấu hình và triển khai

- Chạy `npm --prefix server run db:recruitment` để cập nhật database đang cấu hình; không chạy lại schema/seed trên database đang dùng.
- Backend cũng tự chạy migration này khi khởi tạo dịch vụ thông báo; khởi động lại backend sau khi cập nhật mã.
- Đặt `FRONTEND_URL` là URL website thực tế để email liên kết đúng trang. Đăng nhập xong ứng viên được trả về lời mời/lịch vừa mở.
- Cấu hình SMTP theo `server/.env.example`. Thiếu cấu hình, SMTP từ chối hoặc gửi lỗi sẽ báo chưa gửi email, dữ liệu vẫn được lưu trên website. Không báo thành công giả lập.
- Thông báo dùng worker và cơ chế lấy dữ liệu định kỳ có sẵn: worker xử lý khoảng 5 giây/lần, chuông cập nhật 30 giây/lần, khi mở chuông hoặc quay lại cửa sổ. Không cần WebSocket hay mở thêm cổng.

## Kiểm thử

- `npm run build`
- `npm --prefix server run test:otp`
- `npm --prefix server run test:notifications` — database SQL Server tạm, tách biệt; gồm phản hồi đồng thời, phân quyền, xét duyệt, thông báo, hẹn/đổi lịch và xác nhận phiên bản.
- `node --test server/scripts/test_recruitment_email.js` — SMTP giả lập, kiểm tra thành công, từ chối, lỗi, liên kết và escape HTML.
- `node --test server/scripts/test_recruitment_ui.mjs` — Vite chạy trước; `RECRUITMENT_UI_BASE` đổi URL nếu cần. API giả lập, kiểm tra thao tác và ảnh desktop/mobile trong `.cache/recruitment-tests/`.

Khi chọn **Xác nhận ứng tuyển**, nhà tuyển dụng phải đồng ý hộp thoại trước khi gửi. Ứng viên thấy **Ứng tuyển thành công, kiểm tra email** trong danh sách đã ứng tuyển và nhận email, thông báo tương ứng. Dùng lại giá trị trạng thái `Offered` hiện có, không đổi schema database.

## Gửi email tiếp sau khi xác nhận

Hộp xác nhận hiển thị ngay trong website, gồm ứng viên, vị trí, email và hai nút Quay lại / Gửi xác nhận. Hủy hoặc Escape không gửi; khi đang gửi, nút được khóa.

Hồ sơ đã xác nhận có nút **Gửi thông báo mới**. Nhà tuyển dụng nhập tiêu đề (tối đa 160 ký tự), nội dung (tối đa 5.000 ký tự), kiểm tra người nhận và chọn **Gửi email**. Có thể gửi các email tiếp theo bằng cách mở lại form. Khi gửi lỗi, giữ lại nội dung để thử lại.

API `POST /api/employer/applications/:applicationId/email` chỉ cho phép chủ sở hữu tin gửi đến ứng viên của hồ sơ có trạng thái `Offered`. Người nhận lấy từ database, không lấy từ nội dung request. Email đặt Reply-To theo email nhà tuyển dụng để ứng viên trả lời trực tiếp. Không lưu hội thoại hoặc lịch sử nội dung email và không thêm trường/bảng database.
