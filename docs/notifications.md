# Thông báo trong ứng dụng

## Luồng nghiệp vụ

| Sự kiện | Người nhận | Màn hình đích |
| --- | --- | --- |
| Candidate đăng nhập bằng mật khẩu hoặc Google | Chính Candidate đó | Tài khoản và bảo mật |
| Đăng xuất | Toast ở trang chủ, không lưu vào chuông khi đã thoát | Trang chủ |
| CV mặc định hoặc danh sách tin hợp lệ thay đổi | Candidate đang bật tìm việc | Tối đa 3 việc có điểm kỹ năng từ 70% |
| Ứng tuyển thành công | Chủ doanh nghiệp của tin | Đúng đơn ứng tuyển trong ATS |
| Đăng tin chờ duyệt | Chủ tin và các Admin hoạt động | Dashboard doanh nghiệp / popup duyệt tin |
| Admin duyệt, từ chối hoặc yêu cầu sửa tin | Chủ tin | Dashboard doanh nghiệp, kèm lý do |
| Doanh nghiệp gửi hồ sơ KYC | Các Admin hoạt động | Popup hồ sơ doanh nghiệp |
| Kết quả duyệt KYC, qua cả hai API hiện có | Doanh nghiệp tương ứng | KYC trong dashboard |
| Báo cáo vi phạm mới | Các Admin hoạt động | Đúng popup báo cáo |
| Báo cáo đã giải quyết hoặc bác bỏ | Các Admin khác | Đúng popup báo cáo; người xử lý đã có toast |
| Nhà tuyển dụng gửi/gửi lại lời mời | Candidate sở hữu hồ sơ | Tab Lời mời ứng tuyển |

## Dữ liệu và tính nhất quán

`database/notifications.sql` là migration bổ sung, có thể chạy lại. Nó tạo `NotificationOutbox`, `Notifications`, `NotificationRecommendationState` và chỉ mục tra cứu đơn ứng tuyển; đồng thời đảm bảo các cột kiểm duyệt mà server hiện có đã dùng. Không reset hay thay schema của các bảng nghiệp vụ.

Các thao tác đăng tin, ứng tuyển, gửi lời mời, nộp/duyệt KYC và xử lý báo cáo ghi dữ liệu cùng outbox trong một SQL transaction. Lỗi trước commit sẽ rollback cả hai. Worker mỗi 5 giây xử lý tối đa 50 sự kiện, khóa từng sự kiện và ghi thông báo cùng trạng thái đã xử lý trong một transaction. Khóa duy nhất `(UserID, EventKey)` ngăn thông báo trùng khi thử lại. Lỗi được lưu vào outbox, thử lại với thời gian chờ tăng dần tới 120 giây.

Đăng nhập không phụ thuộc khả năng ghi thông báo: client gửi sự kiện sau khi nhận phiên hợp lệ, tự thử lại mỗi 15 giây nếu chưa thành công. Backend lấy người nhận từ JWT, dùng hash phiên làm khóa chống trùng và không nhận UserID tùy ý từ client. Chuông dừng nhận phản hồi cũ khi đổi tài khoản, hủy request và dọn timer khi unmount.

Chuông cập nhật mỗi 30 giây khi tab hoạt động, khi mở chuông hoặc quay lại tab. Có bộ lọc tất cả/chưa đọc, 20 mục mỗi trang và đánh dấu đã đọc từng mục hoặc tất cả. API luôn lọc UserID và vai trò thực tế từ database.

## Gợi ý công việc

Chỉ CV `IsPrimary=1` của Candidate đang bật tìm việc được sử dụng. CV Builder đọc nội dung JSON; CV tải lên đọc nội dung file cục bộ qua trình trích xuất hiện có, tối đa 10 MB. Không tải URL ngoài hoặc đọc file vượt thư mục uploads. Nếu chưa có CV mặc định hoặc chưa đọc được nội dung CV thì không tạo gợi ý giả.

Điểm là mức khớp kỹ năng có trọng số: kỹ năng bắt buộc 2, kỹ năng còn lại 1. Chỉ lấy điểm thực từ 70% trước khi làm tròn, xếp điểm giảm dần, tối đa 3 tin. Không gộp nội dung các CV khác, không suy đoán từ hồ sơ chung. Tin phải Published, còn hạn, thuộc doanh nghiệp hoạt động và chưa được ứng tuyển. Gợi ý lỗi thời được ẩn; trạng thái đọc được giữ khi cùng CV và tin được xét lại.

Worker kiểm tra fingerprint nguồn mỗi 30 giây, chỉ trích xuất/chấm điểm khi CV, tiêu chí tin, trạng thái tin hoặc đơn ứng tuyển thay đổi. Mỗi lượt xử lý tối đa 20 hồ sơ thay đổi; hồ sơ đọc lỗi chờ 5 phút để không chặn các hồ sơ khác. Phần này không gọi AI trả phí và không thay thuật toán chấm điểm ATS hiện có.

## Chạy và kiểm thử

- Backend dùng database được đặt trong `server/.env`; bản local đang dùng `JobtimizeV2_Local`.
- Migration được gọi lúc backend khởi động; có thể chạy riêng: `npm --prefix server run db:notifications`.
- `npm run test:notifications`: kiểm thử API với SQL Server riêng và component React với API giả lập.
- Trên Windows, suite SQL tự tạo database `JobtimizeNotificationsTest_<8 ký tự hex>` qua `sqlcmd -E`, cấp quyền cho login ứng dụng, kiểm tra database trống trước khi nạp dữ liệu và dọn database do chính nó tạo sau khi chạy. Không chạy trên database ứng dụng.
- Với môi trường khác, tự tạo database trống theo đúng mẫu tên và cấp quyền, rồi đặt `NOTIFICATION_TEST_DB` trước khi chạy; suite không tự xóa database được cung cấp qua biến này.
- Kiểm thử hồi quy: `npm --prefix server run test:otp`, `npm --prefix server run test:ai`, `npm run test:cv`, `npm run build`. Export PDF cần cài Chromium bằng `npm run cv:browser`.

Các kiểm thử component kiểm tra trạng thái, điều hướng, polling và đổi tài khoản bằng React Test Renderer, không thay thế đánh giá bố cục trực quan trên trình duyệt.

## Rà soát và tối ưu bổ sung

- Khi đã lưu trạng thái đọc thành công, bấm thông báo mở màn hình đích ngay; việc tải lại danh sách chạy độc lập. Request chuông có timeout 10 giây. Đã có kiểm thử giữ request tải lại ở trạng thái chờ để xác nhận điều hướng vẫn hoạt động.
- Bộ chấm gợi ý gom yêu cầu kỹ năng theo JobID, chuẩn bị catalog một lần cho cả lượt xử lý và dùng lại biểu thức nhận diện kỹ năng đã biên dịch. Danh sách ứng tuyển cũng được gom theo ProfileID một lần.
- Alias dùng tên kỹ năng chuẩn, tránh nhận nhầm React Native thành React web, Node-RED thành Node.js hoặc C thành C#/.NET.
- Bộ đo `npm --prefix server run benchmark:notifications` dùng 1.000 tin và 20 CV giả lập, một lượt làm nóng và trung vị ba lượt đo. Trên máy này, thời gian CPU giảm từ 408,43 ms xuống khoảng 7–8 ms. Hash kết quả trên fixture giữ nguyên. Đây là phép đo phần chấm điểm, không gồm SQL, đọc file hay độ trễ mạng; không phải mức tăng tốc của toàn bộ website.
- Kết quả kiểm tra sau sửa: 13 kiểm thử backend thông báo, 8 kiểm thử component thông báo, 13 kiểm thử OTP, 8 kiểm thử AI và 8 kiểm thử CV đều qua. Build frontend và kiểm tra lỗi whitespace đều thành công.
