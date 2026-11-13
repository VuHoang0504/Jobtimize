# Quản lý và xóa hồ sơ KYC

Admin có nút **Xóa KYC** trong danh sách doanh nghiệp và chi tiết giấy phép. Hộp xác nhận nêu rõ thao tác xóa toàn bộ các lần nộp và giấy tờ KYC của doanh nghiệp, thu hồi trạng thái xác minh và yêu cầu nộp lại. Tài khoản, việc làm và gói dịch vụ được giữ nguyên.

API: `DELETE /api/admin/employers/:employerId/kyc`, chỉ dành Admin, JSON body `{ "expectedDocumentId": 123 }` là DocumentID mới nhất đã hiển thị khi mở xác nhận. Nếu có lần nộp mới, API trả 409 để Admin tải lại và kiểm tra.

Nếu dữ liệu trước đây đã có trạng thái Approved hoặc Rejected nhưng chưa lưu tài liệu, dùng `expectedDocumentId: null` để gỡ trạng thái đó. Không tạo hồ sơ giả; nếu đã có lần nộp mới trong lúc xác nhận thì vẫn bị chặn 409. Doanh nghiệp Pending và không có hồ sơ thì không hiện nút xóa.

Xóa hồ sơ, cập nhật trạng thái, ghi SystemLogs và enqueue thông báo nằm trong cùng transaction. DB vẫn dùng trạng thái `Pending` khi không có hồ sơ; UI hiển thị **Chưa nộp hồ sơ**, không đưa vào hàng chờ duyệt. Không cho duyệt khi không có tài liệu. Employer có thể upload lại và được xét duyệt bình thường.

Tệp cục bộ chỉ được dọn sau commit, trong `server/uploads/kyc`, khi không còn hồ sơ khác tham chiếu. Đường tải yêu cầu xác thực, quyền sở hữu hoặc Admin và tham chiếu DB còn tồn tại, nên tệp đã xóa không truy cập được qua URL cũ ngay cả khi dọn tệp bị chậm. Thông báo KYC cũ không được phát lại cho hồ sơ đã xóa.

Chạy `npm run test:kyc` để kiểm thử API trên database tạm riêng và hành vi hộp xác nhận. Các test bao gồm phân quyền, hồ sơ mới nộp, rollback, giữ dữ liệu khác, quyền xem tệp, nộp lại, file dùng chung, đường dẫn và hủy xác nhận.
