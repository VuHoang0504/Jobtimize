# Kiểm thử hồi quy thông báo việc làm phù hợp

Ngày kiểm tra: **11/11/2026**, múi giờ Việt Nam. Dự án: `D:\SWP391\Jobtimize_V3`.

**Kết quả cuối: 136 kiểm thử đạt, 0 thất bại; frontend build thành công.** Trong các luồng đã kiểm thử, chưa phát hiện xung đột còn tồn tại sau các bản sửa bên dưới. Kết quả này có phạm vi giới hạn ở các kiểm thử tự động được liệt kê, không phải cam kết toàn bộ sản phẩm không còn lỗi.

## Các vấn đề đã tái hiện và sửa

1. **Thông báo trực tiếp và phiên đăng nhập:** phản hồi 401/403 của token cũ có thể dừng kết nối SSE sau khi token đã đổi. Kết nối nay kiểm tra token hiện tại, bỏ qua phản hồi của kết nối đã hủy và kết nối lại bằng token mới. Bài kiểm thử tái hiện đã thất bại trước bản sửa và đạt sau bản sửa.
2. **Thông báo mới và phân trang:** khi đang xem trang lịch sử, dữ liệu trang hiện tại không chứa việc làm mới nên popup không xuất hiện. API nay trả thêm `latestOpportunity`, áp dụng cùng điều kiện sở hữu và tính hợp lệ của hộp thư. Popup dùng dữ liệu này, giữ nguyên trang người dùng đang đọc. Đã kiểm tra cả component và API với `page=2`, cùng giới hạn quyền của nhà tuyển dụng.
3. **Thông báo và CV chưa xác nhận:** gợi ý `job_match` thông thường có thể còn hiện khi CV mặc định có phiên bản mới ở trạng thái `NeedsReview`. Cả gợi ý thông thường và thông báo đặc biệt nay đều yêu cầu phiên bản CV mới nhất ở trạng thái `Ready`. Đã tái hiện trên SQL thật trong database tạm và xác nhận thông báo cũ bị ẩn sau bản sửa.

Ngoài ra, bản V3 thiếu Chromium mà module xuất PDF CV yêu cầu. Đã cài bằng script sẵn có `node scripts/installCVBrowser.mjs`; bộ kiểm thử CV sau đó đạt toàn bộ, gồm PDF có chữ tiếng Việt, tải lên, trích xuất, xác nhận và lưu phiên bản CV đã ứng tuyển.

## Phạm vi và kết quả

| Nhóm kiểm thử | Đạt | Thất bại |
|---|---:|---:|
| Unit backend: OTP, AI adapter, chuẩn hóa CV, matching, skill gap, chữ ký PayOS, email và job alerts | 55 | 0 |
| CV: tải PDF/DOCX/ảnh, đọc và xác nhận, CV được chọn, snapshot ứng tuyển | 8 | 0 |
| Schema, khởi động API, tài khoản nhà tuyển dụng, đăng nhập Google giả lập và mật khẩu | 14 | 0 |
| SQL/API: thông báo, ATS, lời mời, phỏng vấn, KYC, kiểm duyệt, báo cáo vi phạm và thanh toán | 31 | 0 |
| React: chuông, popup, SSE, phân trang, chuyển phiên, đọc thông báo và báo cáo admin | 15 | 0 |
| Tìm kiếm, nhóm việc làm, danh mục và dữ liệu duyệt việc | 4 | 0 |
| JWT và dừng khởi động khi thiếu cấu hình bảo mật | 9 | 0 |
| **Tổng** | **136** | **0** |

Các tình huống quan trọng đã qua:

- Đối chiếu ngưỡng kỹ năng 70%, trọng số bắt buộc/tùy chọn và CV đã xác nhận; không tính kỹ năng chưa xác minh.
- Gửi đủ 105 ứng viên qua nhiều lô; người offline vẫn có thông báo lưu trong SQL.
- Cập nhật/duyệt lặp lại, thay đổi khoảng trắng, sửa nội dung rồi quay lại phiên bản cũ: giữ chống trùng và trạng thái đã đọc.
- Gửi thất bại giữa lô: rollback dữ liệu, giữ cursor để retry và hoàn thành sau khi lỗi được gỡ.
- Sửa tin và ứng tuyển đồng thời, hai worker gửi đồng thời: ATS giữ một đơn hợp lệ, chủ tin nhận thông báo ứng tuyển và ứng viên đã ứng tuyển không còn thấy gợi ý của tin đó.
- Tin đóng/hết hạn, đổi CV, CV chưa xác nhận, ứng viên tắt tìm việc hoặc tài khoản bị khóa: không lộ thông báo không hợp lệ trong API.
- Đọc thông báo của tài khoản khác, truy cập API/stream không đăng nhập, đổi vai trò và thu hồi quyền khi tài khoản bị khóa.
- Thanh toán: chữ ký, số tiền, chủ giao dịch, callback lặp, rollback quota và hai thanh toán đồng thời; không cộng quota trùng.
- Schema/index chạy lặp lại, phục hồi cột còn thiếu và giữ dữ liệu đã có.

## Cách ly dữ liệu và bằng chứng

Các bài kiểm thử ghi dữ liệu chỉ dùng database mới có tên ngẫu nhiên thuộc nhóm `JobtimizeNotificationsTest_*`, `JobtimizeCVTest_*`, `JobtimizeSchemaTest_*`, `JobtimizeAccountTest_*` và `JobtimizeBrowseTest_*`. Harness chỉ nạp các trường kết nối SQL, dùng tên database mặc định không tồn tại để ngăn truy cập nhầm database ứng dụng. Đã kiểm tra 9 database tạo trong các lượt kiểm thử này đều được dọn dẹp.

Tổng hợp và log trên máy nằm ở [summary.json](D:/SWP391/Jobtimize_V3/.cache/regression-20261111/summary.json) và [thư mục kiểm thử](D:/SWP391/Jobtimize_V3/.cache/regression-20261111). Các file `*-before.log` lưu lỗi tái hiện; các file `*-final.log` và `*-after*.log` ghi kết quả sau sửa. Các lỗi constraint và thông báo lỗi nhà cung cấp trong log là tình huống được chủ động tạo để kiểm tra rollback/fallback; kết quả kiểm thử cuối là 0 thất bại.

## Giới hạn còn lại

- Google, AI, SMTP và mạng thanh toán PayOS được giả lập trong kiểm thử tích hợp; kết quả không xác nhận cấu hình dịch vụ thật của môi trường triển khai.
- UI được kiểm tra bằng React component tests và production build; chưa kiểm chứng thủ công trên trình duyệt.
- Tín hiệu SSE và cơ chế đánh thức worker hiện dùng chung một tiến trình Node. Khi triển khai nhiều instance cần event bus dùng chung; polling 30 giây vẫn là cơ chế dự phòng.
- Build còn cảnh báo bundle JavaScript chính **819,09 kB**, gzip **209,33 kB**, vượt ngưỡng cảnh báo 500 kB của Vite.
- Kiểm thử API khởi động server tạm trên cổng ngẫu nhiên. Các thay đổi nằm trong V3; lượt kiểm thử không chuyển server đang chạy của bản khác sang V3.
