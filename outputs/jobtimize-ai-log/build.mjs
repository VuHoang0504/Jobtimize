import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire('C:/Users/duong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { FileBlob, SpreadsheetFile } = await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const dir = 'C:/Users/duong/Desktop/Jobtimize/outputs/jobtimize-ai-log';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load('C:/Users/duong/Downloads/SWT301_AI_Log_CaseStudy.xlsx'));
console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:2000})).ndjson);
try {
 const preview=await wb.render({sheetName:'Thông tin nhóm',range:'B18:G29',scale:1.5,format:'png'});
 await fs.writeFile(`${dir}/before.png`,new Uint8Array(await preview.arrayBuffer()));
} catch(e) { console.log('Preview:',e.message); }
const edits={};
function set(sheet,cell,value) { (edits[sheet]??={})[cell]=value; }
const members=['Nguyễn Văn An','Trần Thị Bình','Lê Minh Cường','Phạm Thu Dung'];
const g='Thông tin nhóm';
set(g,'C19','Jobtimize');
set(g,'C20','React 18, Vite, Tailwind CSS; Node.js, Express; SQL Server; JWT, bcrypt; Node test, Playwright.');
set(g,'C21','https://github.com/VuHoang0504/Jobtimize');
set(g,'C22','Nền tảng tuyển dụng: tìm việc, quản lý CV, ứng tuyển, ATS, AI matching, skill gap, phỏng vấn và thanh toán PayOS. Nhật ký tháng 10/2026 được tái dựng từ code; phân công, prompt và kết quả minh họa là giả lập.');
const modules=[
 ['Xác thực và quản trị','OTP, JWT, phân quyền, tài khoản và báo cáo quản trị.'],
 ['Việc làm & công ty','Tìm việc, bộ lọc, đăng tin, KYC và hồ sơ doanh nghiệp.'],
 ['CV & AI','CV nhiều phiên bản, phân tích CV, matching, skill gap và khóa học.'],
 ['Tuyển dụng & PayOS','Ứng tuyển, lời mời, lịch phỏng vấn, thông báo và PayOS.']
];
modules.forEach((v,i)=>{set(g,`B${26+i}`,members[i]);set(g,`C${26+i}`,v[0]);set(g,`D${26+i}`,v[1]);set(g,`E${26+i}`,'Minh họa 10/2026');});
const parts=[
 {
  title:'Part1 — Phân tích yêu cầu và thiết kế kiểm thử', start:1,
  tasks:[
   ['Xác thực OTP và JWT','authController.js; otpStore.js','Đọc TTL 10 phút, tách register/reset_password; bỏ giả định khóa sau 5 lần sai.','Đối chiếu test_otp.js và authMiddleware.js.'],
   ['Tìm việc và bộ lọc','jobController.js; test_job_browse.js','Tách tìm kiếm, phân trang và danh mục; không dùng quy tắc của website sách.','Đối chiếu query và test_job_browse.js.'],
   ['CV và chấm điểm kỹ năng','aiMatchingService.js; cvNormalization.js','Chỉ tính kỹ năng đã xác nhận; trọng số bắt buộc 2, tùy chọn 1.','Đọc compareSkills và các trạng thái NotReady/NoCriteria.'],
   ['Ứng tuyển và lịch phỏng vấn','recruitmentController.js; paymentController.js','Thêm quyền sở hữu, phiên bản và điều kiện lịch ở tương lai.','Đối chiếu route, kiểm tra version và giao dịch SQL.']
  ],
  added:[['Lập ma trận OTP, email lỗi và JWT hết hạn.','test_otp.js; test_jwt_security.js'],['Lập ca tìm việc theo từ khóa, danh mục, địa điểm.','test_job_browse.js; jobController.js'],['Lập ca CV chưa Ready, thiếu kỹ năng và alias.','test_cv_normalization.js; aiMatchingService.js'],['Lập ca lịch phỏng vấn, quyền sở hữu và PayOS.','test_schedule_idor.js; test_payos_setup.js']],
  changed:[['Chuẩn hóa expected theo HTTP và JSON thực.','authController.js'],['Tách khách, Candidate, Employer và Admin.','authMiddleware.js'],['Phân biệt chưa tính được điểm với điểm 0.','aiMatchingService.js'],['Gắn điều kiện SQL/SMTP cho ca tích hợp.','test_otp.js; test_database_schema.js']],
  fixed:[['Sửa giả định OTP dùng chung cho mọi mục đích.','otpStore.js'],['Sửa giả định matching dùng kỹ năng chưa xác nhận.','aiMatchingService.js'],['Sửa expected sai quyền: xét 401, 403, 404 theo route.','authMiddleware.js; recruitmentController.js'],['Sửa dữ liệu lịch thiếu múi giờ và lịch quá khứ.','recruitmentController.js']],
  removed:[['Loại ca giỏ hàng, đơn sách khỏi phạm vi Jobtimize.','N/A - tài liệu kiểm thử'],['Bỏ giả định Spring Boot, MySQL và JUnit.','server/package.json'],['Bỏ quy tắc khóa tài khoản 30 phút chưa có căn cứ.','authController.js'],['Bỏ expected điểm matching 0 khi CV chưa sẵn sàng.','aiMatchingService.js']],
  prompts:[
   ['Dựa vào authController.js và otpStore.js, thiết kế EP/BVA cho OTP đăng ký và reset mật khẩu. Nêu tiền điều kiện, đầu vào, HTTP và tác động DB. Không thêm rule ngoài code.','AI đề xuất OTP hết hạn và sai mã nhưng gộp hai mục đích.','Tách register/reset_password; thêm SMTP lỗi và không lộ OTP.','Đối chiếu saveOtp/getOtpRecord và assertion trong test_otp.js.'],
   ['Đọc jobController.js và test_job_browse.js của Jobtimize. Liệt kê điều kiện tìm kiếm, lọc và phân trang; ghi rõ trường hợp không có dữ liệu.','AI gợi ý tìm theo sách và giá do thiếu ngữ cảnh ban đầu.','Cung cấp đúng controller; sửa dữ liệu thành tin tuyển dụng.','Kiểm tra tên tham số, SQL và expected trong script thực.'],
   ['Đọc compareSkills trong aiMatchingService.js. Thiết kế ca cho CV chưa Ready, không có yêu cầu, kỹ năng bắt buộc và tùy chọn. Tính expected bằng tay.','AI chia đều trọng số và dùng kỹ năng chưa xác nhận.','Sửa trọng số 2:1 và chỉ nhận verified; giữ null khi chưa tính.','Ví dụ giả lập: khớp kỹ năng bắt buộc, thiếu tùy chọn => 67%.'],
   ['Đọc scheduleInterview trong recruitmentController.js. Thiết kế bảng quyết định cho applicationId/invitationId, quyền sở hữu, trạng thái tin, version và múi giờ.','AI thiếu tình huống gửi cả hai ID và version cũ.','Bổ sung XOR của hai ID, 409 khi xung đột, ngày có múi giờ.','So từng nhánh guard và điều kiện trong transaction SQL.']
  ],
  reflection:[
   'Nguyễn Văn An phân tích OTP/JWT và quyền truy cập. Trần Thị Bình lập điều kiện tìm việc/đăng tin. Lê Minh Cường phân tích CV và công thức matching. Phạm Thu Dung lập bảng quyết định tuyển dụng/thanh toán. Đầu ra là bộ ca minh họa bám các script có trong repo.',
   'AI hỗ trợ liệt kê phân vùng, giá trị biên và soạn khung ca kiểm thử. Nhóm đọc controller, middleware và script để quyết định expected. Các prompt và kết quả trong nhật ký được tái dựng phục vụ case study.',
   '1. AI giả định OTP đăng ký dùng được cho reset mật khẩu; code tách khóa theo purpose. 2. AI chấm đều mọi kỹ năng; compareSkills dùng trọng số 2 cho bắt buộc và 1 cho tùy chọn. Nhóm sửa cả hai trước khi chốt ca.',
   'Cần phân biệt unit test có mock và integration test cần SQL Server. Tên trường, quyền sở hữu và trạng thái CV phải đọc từ code. Nhóm thống nhất tiền điều kiện và bộ dữ liệu minh họa trước khi viết expected.',
   'Nguyễn Văn An: OTP/JWT và tổng hợp báo cáo, 5 giờ. Trần Thị Bình: tìm việc và doanh nghiệp, 4 giờ. Lê Minh Cường: CV/matching, 5 giờ. Phạm Thu Dung: tuyển dụng/PayOS, 4 giờ. Thời lượng và phân công là dữ liệu minh họa.',
   'Cung cấp đoạn code liên quan ngay trong prompt. Gắn mỗi ca với điều kiện trong controller và script hiện có. Review chéo expected, nhất là trạng thái chưa sẵn sàng và lỗi phân quyền.'
  ]
 },
 {
  title:'Part2 — Kiểm thử đơn vị và hồi quy dịch vụ',start:8,
  tasks:[
   ['Mock OTP, DB và SMTP','test_otp.js; emailService.js','Mock nodemailer và executeQuery; không gửi email thật.','Kiểm tra assertion 503, không lưu/lộ OTP khi gửi lỗi.'],
   ['Kiểm tra dữ liệu doanh nghiệp','test_employer_account.js; employerProfile.js','Tách chuẩn hóa hồ sơ, validation và ca phụ thuộc database.','Đối chiếu helper và test_employer_account.js.'],
   ['Chuẩn hóa kỹ năng và CV','test_cv_normalization.js; cvNormalization.js','Thêm alias, phủ định kỹ năng và dữ liệu thiếu.','Đọc expected của suite normalization, không suy từ AI.'],
   ['Thanh toán và email tuyển dụng','test_payos_setup.js; test_recruitment_email.js','Mock gateway/email; phân biệt stub kết quả với kiểm tra lời gọi.','Kiểm tra hợp đồng hàm và side effect trong suite.']
  ],
  added:[['Ghi nhận suite OTP dùng node:test và strict assert.','test_otp.js'],['Ghi nhận ca hồi quy hồ sơ nhà tuyển dụng.','test_employer_account.js'],['Ghi nhận ca chuẩn hóa CV và kỹ năng.','test_cv_normalization.js'],['Ghi nhận suite PayOS và email tuyển dụng.','test_payos_setup.js; test_recruitment_email.js']],
  changed:[['Tách SMTP giả lập khỏi cấu hình gửi thật.','test_otp.js; mail.js'],['Dùng dữ liệu hồ sơ doanh nghiệp theo schema thật.','employerProfile.js'],['Gắn expected normalization với taxonomy và alias.','cvNormalization.js'],['Kiểm tra tác động email thay vì chỉ status code.','test_recruitment_email.js']],
  fixed:[['Sửa mock SMTP để kiểm tra accepted rỗng.','test_otp.js'],['Sửa test nhầm ESM cho module server CommonJS.','server/package.json'],['Sửa expected nhận nhầm kỹ năng trong câu phủ định.','cvNormalization.js'],['Sửa giả định mọi PayOS lỗi đều là thanh toán thành công.','payosService.js; paymentService.js']],
  removed:[['Bỏ JUnit/Mockito khỏi mô tả stack kiểm thử.','server/package.json'],['Bỏ SMTP thật khỏi kịch bản unit test.','test_otp.js'],['Bỏ assertion chỉ kiểm tra chuỗi có tên kỹ năng.','test_cv_normalization.js'],['Bỏ dữ liệu khóa API thật khỏi ví dụ kiểm thử.','test_payos_setup.js']],
  prompts:[
   ['Đọc test_otp.js. Giải thích cách mock nodemailer và require.cache cho DB trong CommonJS. Thiết kế ca SMTP thiếu cấu hình, timeout và không có accepted recipient.','AI đề xuất gửi OTP thật để xác minh, gây phụ thuộc mạng.','Dùng transporter giả; kiểm tra code lỗi và store thay vì gửi thật.','Đối chiếu các subtest và cấu trúc res giả trong suite OTP.'],
   ['Dựa vào employerProfile.js và test_employer_account.js, đề xuất dữ liệu hợp lệ/không hợp lệ cho hồ sơ doanh nghiệp. Phân biệt helper thuần và xử lý HTTP.','AI trộn validation frontend với điều kiện backend.','Tách tầng kiểm thử, chỉ giữ trường và giới hạn có trong code.','Đối chiếu helper thực và assertion có trong script.'],
   ['Đọc cvNormalization.js và suite test_cv_normalization.js. Đề xuất ca alias kỹ năng, Unicode tiếng Việt, câu phủ định và kỹ năng không có bằng chứng.','AI dùng includes nên có nguy cơ nhận sai từ con và câu phủ định.','Dùng canonicalSkill/positiveMention; giữ evidence khi xác nhận.','So expected với alias và logic chuẩn hóa thực.'],
   ['Đọc test_payos_setup.js và test_recruitment_email.js. Giải thích stub và kiểm tra interaction bằng node:test, không gọi gateway hoặc SMTP thật.','AI gợi ý mock thư viện Java và gọi dịch vụ ngoài.','Chuyển sang CommonJS, stub đúng dependency và dữ liệu gửi.','So tên hàm, payload và assertion với các script thực.']
  ],
  reflection:[
   'Nguyễn Văn An rà soát test_otp.js và mock DB/SMTP. Trần Thị Bình rà soát employerProfile và suite tài khoản doanh nghiệp. Lê Minh Cường rà soát normalization CV. Phạm Thu Dung rà soát PayOS/email. Ghi nhận cách kiểm thử Node, không dùng JUnit.',
   'AI giải thích Arrange-Act-Assert, stub và interaction test, hỗ trợ soạn dữ liệu lỗi. Nhóm sửa cú pháp về CommonJS và giữ mock đúng dependency. Kết quả pass/fail minh họa chỉ mô tả case study, không thay thế lần chạy test thực.',
   '1. AI đề xuất dùng import trong script CommonJS của server; nhóm sửa theo require/module.exports. 2. AI dùng so khớp includes cho kỹ năng, bỏ sót phủ định và alias; nhóm kiểm tra positiveMention và taxonomy trước khi đặt expected.',
   'Mock require.cache cần có trước khi nạp controller. SMTP có thể trả accepted rỗng mà không throw. Dữ liệu CV tiếng Việt cần giữ UTF-8 và phân biệt kỹ năng được nhắc đến với kỹ năng đã xác nhận.',
   'Nguyễn Văn An: mock OTP/SMTP, 6 giờ. Trần Thị Bình: validation doanh nghiệp, 4 giờ. Lê Minh Cường: normalization và evidence, 5 giờ. Phạm Thu Dung: PayOS/email, 5 giờ. Review chéo An–Bình và Cường–Dung; số giờ minh họa.',
   'Chuẩn bị mock trước khi nạp module, khôi phục biến môi trường sau test. Tránh phụ thuộc SMTP/gateway thật ở unit test. Ưu tiên assertion tác động quan trọng và nhánh lỗi thay vì tuyên bố coverage chưa đo.'
  ]
 },
 {
  title:'Part3 — Kiểm thử tích hợp và luồng nhiều vai trò',start:16,
  tasks:[
   ['Tích hợp JWT và phân quyền','test_jwt_security.js; authMiddleware.js','Kiểm tra Bearer, tài khoản Active và quyền theo role.','So route bảo vệ và truy vấn Users/UserRoles/Roles.'],
   ['Luồng đăng tin và KYC','test_post_job_ui.mjs; test_employer_account_ui.mjs','Chuẩn bị doanh nghiệp, danh mục và trạng thái KYC phù hợp.','Kịch bản minh họa đối chiếu trang đăng tin và controller.'],
   ['CV, phiên bản và skill gap','test_cv_analysis.js; test_skill_gap.js','Dùng DB thử riêng; stub model; kiểm tra CV Ready và quyền sở hữu.','Đối chiếu harness SQL và AI provider giả trong script.'],
   ['Lời mời, lịch và thông báo','test_schedule_idor.js; test_notifications.js','Tách hai employer, kiểm tra version và giao dịch/outbox.','Đối chiếu ownership, 409 và bộ script tích hợp.']
  ],
  added:[['Ghi nhận kiểm thử JWT và tài khoản bị khóa.','test_jwt_security.js'],['Ghi nhận kịch bản UI đăng tin và tài khoản doanh nghiệp.','test_post_job_ui.mjs; test_employer_account_ui.mjs'],['Ghi nhận harness tích hợp CV với DB thử riêng.','test_cv_analysis.js'],['Ghi nhận script IDOR lịch và tích hợp thông báo.','test_schedule_idor.js; test_notifications.js']],
  changed:[['Tách token theo người dùng và vai trò.','authMiddleware.js'],['Bổ sung tiền điều kiện doanh nghiệp và danh mục.','test_post_job_ui.mjs'],['Dùng phản hồi AI xác định để kiểm tra persistence.','test_cv_analysis.js'],['Đưa thông báo vào cùng giao dịch nghiệp vụ.','notificationStore.js; recruitmentController.js']],
  fixed:[['Sửa dữ liệu thiếu Bearer trong header.','authMiddleware.js'],['Sửa giả định Candidate có quyền đăng tin.','employerRoutes.js'],['Sửa chọn nhầm CV không thuộc ứng viên.','cvAnalysisService.js'],['Sửa dữ liệu version cũ và thời gian thiếu múi giờ.','recruitmentController.js']],
  removed:[['Bỏ H2/MySQL khỏi mô tả tích hợp.','database/schema.sql'],['Bỏ dùng chung token cho mọi vai trò.','test_schedule_idor.js'],['Bỏ gọi model ngoài trong ca tích hợp xác định.','test_cv_analysis.js'],['Bỏ gửi email thật trong suite thông báo cô lập.','test_notifications.js']],
  prompts:[
   ['Đọc authMiddleware.js của Jobtimize. Thiết kế ca tích hợp cho thiếu Bearer, token sai/hết hạn, user không Active và sai role. Không giả định endpoint refresh token.','AI chỉ giải mã token mà bỏ kiểm tra trạng thái user trong DB.','Bổ sung truy vấn Active và phân biệt authenticate/authorize.','So các nhánh 401/403 của middleware và route thực.'],
   ['Đọc PostJobPage.jsx và employerRoutes.js. Mô tả luồng Employer đăng tin, dữ liệu danh mục và điều kiện doanh nghiệp. Viết tiền điều kiện cho test UI.','AI mặc định tài khoản bất kỳ được đăng tin.','Dùng Employer riêng; bổ sung dữ liệu doanh nghiệp và danh mục.','Đối chiếu test_post_job_ui.mjs và trang đăng tin.'],
   ['Đọc test_cv_analysis.js. Giải thích cách tạo DB thử duy nhất, stub provider và kiểm tra upload, xác nhận phiên bản CV, matching. Nêu bước cleanup.','AI đề xuất tái dùng DB ứng dụng và gọi AI thật.','Giữ DB JobtimizeCVTest riêng và phản hồi model giả xác định.','Kiểm tra guard tên DB, stub generateContent và cleanup trong suite.'],
   ['Đọc recruitmentController.js và test_schedule_idor.js. Thiết kế ca employer khác truy cập lịch, version cũ, lời mời chưa Accepted, thời gian quá khứ và notification outbox.','AI thiếu quyền sở hữu và xung đột đồng thời.','Lấy owner từ req.user, dùng version và kiểm tra transaction.','Đối chiếu điều kiện WHERE, khóa SQL và enqueue thực.']
  ],
  reflection:[
   'Nhóm mô tả luồng đăng nhập theo role, đăng tin, CV phiên bản, skill gap, lời mời và lịch phỏng vấn. Các ca được gắn với test_jwt_security.js, test_post_job_ui.mjs, test_cv_analysis.js, test_schedule_idor.js và test_notifications.js.',
   'AI giúp nối tiền điều kiện giữa UI, API và database, đề xuất ca âm và cleanup. Nhóm kiểm tra route, quyền sở hữu và schema trước khi chấp nhận. Kết quả minh họa không khẳng định đã chạy SQL/SMTP/model thật.',
   '1. AI đề xuất H2 thay SQL Server nên không phù hợp cú pháp và hành vi transaction của dự án. 2. AI bỏ version khi hẹn lịch, dẫn tới không kiểm tra được 409 do dữ liệu cũ. Nhóm sửa môi trường và payload theo code.',
   'Tích hợp cần SQL Server, sqlcmd và dữ liệu cho đủ vai trò. UI cần Vite/API chạy đúng cổng. Các thời điểm phỏng vấn phải ở tương lai so với đồng hồ kiểm thử và có múi giờ, dù ngày nhật ký thuộc tháng 10/2026.',
   'Nguyễn Văn An: JWT/role và test report, 5 giờ. Trần Thị Bình: luồng đăng tin/KYC, 5 giờ. Lê Minh Cường: tích hợp CV/skill gap, 6 giờ. Phạm Thu Dung: lời mời/lịch/thông báo, 6 giờ. Phân công và thời lượng minh họa.',
   'Chuẩn bị seed cho từng role, tách DB dùng thử và fixture có owner rõ ràng. Stub AI/email cho ca xác định. Kiểm tra cleanup và xung đột version ngay từ thiết kế, sau đó mới mở rộng sang UI.'
  ]
 },
 {
  title:'Part4 — Hệ thống, bảo mật và tổng kết hồi quy',start:24,
  tasks:[
   ['Hồi quy xác thực và quản trị','test_auth_regression.js; admin_regression_cases.js','Tách ca API và ca quản trị; không khẳng định kết quả chưa chạy.','Bộ kết quả giả lập dùng cho nhật ký, đối chiếu script thật.'],
   ['Hồi quy tìm việc và giao diện','test_job_category_ui.mjs; test_job_browse.js','Dùng dữ liệu tin tuyển dụng có danh mục và trạng thái rõ ràng.','Đối chiếu UI danh mục, bộ lọc và script browse.'],
   ['Hồi quy CV, editor và AI','test_cv_editor_ui.mjs; test_skill_gap_ui.mjs','Kiểm tra phiên bản, kỹ năng xác nhận và trạng thái AI lỗi.','Đối chiếu CVBuilderPage và SkillGapAnalysisPage.'],
   ['Bảo mật và thông báo/PayOS','test_p0_security.js; benchmark_notifications.js','Tách regression bảo mật khỏi benchmark; không gọi đây là k6.','Đọc script IDOR, PayOS và benchmark thông báo hiện có.']
  ],
  added:[['Tổng hợp phạm vi hồi quy xác thực và admin.','test_auth_regression.js; admin_regression_cases.js'],['Tổng hợp ca giao diện danh mục/tìm việc.','test_job_category_ui.mjs; test_job_browse.js'],['Tổng hợp ca CV editor, builder và skill gap.','test_cv_editor_ui.mjs; test_cv_builder.mjs'],['Ghi nhận bảo mật và benchmark thông báo.','test_p0_security.js; benchmark_notifications.js']],
  changed:[['Ưu tiên OTP/JWT và kiểm soát quyền trong regression.','test_otp.js; test_jwt_security.js'],['Đối chiếu bộ lọc UI với query backend.','JobBrowseMenu.jsx; jobController.js'],['Tách AI không sẵn sàng khỏi kết quả điểm thấp.','MatchScoreBadge.jsx; aiMatchingService.js'],['Tách trạng thái thanh toán từ server và giao diện.','paymentController.js; EmployerPricingPage.jsx']],
  fixed:[['Sửa báo cáo lẫn 401 với 403.','authMiddleware.js'],['Sửa ca thử tìm việc dùng dữ liệu hết hạn sai kỳ vọng.','test_job_browse.js'],['Sửa expected 0% khi CV chưa xác nhận.','aiMatchingService.js'],['Sửa giả định mở return URL đủ chứng minh thanh toán.','paymentController.js; payosService.js']],
  removed:[['Bỏ tuyên bố Newman/collection có trong repo khi chưa có.','N/A - báo cáo kiểm thử'],['Bỏ kết luận chịu 100 user đồng thời chưa đo.','benchmark_notifications.js'],['Bỏ tỷ lệ coverage không có báo cáo đo.','N/A - báo cáo kiểm thử'],['Bỏ token, SMTP password và API key khỏi log minh họa.','N/A - dữ liệu kiểm thử']],
  prompts:[
   ['Dựa vào scripts kiểm thử của Jobtimize, lập checklist hồi quy Auth/Admin/Employer/Candidate. Phân loại test cần SQL, API, trình duyệt và test có mock. Không tự tạo kết quả chạy.','AI gán mọi script là unit test và báo pass khi chưa có output.','Tách môi trường, ghi kết quả case study là giả lập.','Đọc đầu mỗi script và npm scripts trước khi tổng hợp.'],
   ['Đọc test_job_browse.js và test_job_category_ui.mjs. Thiết kế kiểm tra tìm việc theo danh mục/từ khóa và giao diện khi không có kết quả.','AI dùng dữ liệu không kiểm soát nên expected không ổn định.','Chuẩn hóa fixture có trạng thái tin, danh mục và địa điểm rõ ràng.','So route jobs, hook danh mục và assertion UI trong repo.'],
   ['Đọc test_cv_editor_ui.mjs, test_skill_gap_ui.mjs và aiMatchingService.js. Thiết kế hồi quy đổi CV/phiên bản, CV chưa Ready và provider lỗi.','AI coi thiếu dữ liệu là 0% và bỏ CV version trong kết quả.','Giữ trạng thái NotReady/Unavailable, metadata CV và kỹ năng verified.','Đối chiếu compareSkills, CVBuilderPage và SkillGapAnalysisPage.'],
   ['Đọc test_p0_security.js, test_schedule_idor.js, test_payos_setup.js và benchmark_notifications.js. Lập checklist an toàn, nêu giới hạn của benchmark, không suy ra tải 100 user.','AI đề xuất kết luận hiệu năng từ một lần gọi API.','Giữ benchmark đúng phạm vi thông báo, tách bảo mật và thanh toán.','So script hiện có; không ghi số đo thời gian hay tải chưa thu thập.']
  ],
  reflection:[
   'Nhóm tổng hợp regression cho Auth/Admin, tìm việc/Employer, CV/AI và tuyển dụng/PayOS. Bổ sung kiểm tra quyền sở hữu, trạng thái không sẵn sàng và điều kiện môi trường. Hồ sơ chỉ mô tả tính năng và script đã có trong code.',
   'AI hỗ trợ lập checklist, gom nhóm rủi ro và viết tóm tắt. Nhóm kiểm tra tên file, route, điều kiện DB và ý nghĩa trạng thái. Không dùng gợi ý AI làm bằng chứng cho hiệu năng, coverage hay thanh toán thành công.',
   '1. AI khẳng định 100 người dùng đồng thời từ ví dụ k6 dù repo chỉ có benchmark thông báo; nhóm bỏ kết luận. 2. AI coi return URL là bằng chứng PayOS đã trả tiền; nhóm chuyển sang trạng thái được server xác minh.',
   'Không phải mọi script đều chạy độc lập: một số cần API, SQL và browser. Test AI thật có tính bất định. Dữ liệu ngày phỏng vấn cần được tính từ đồng hồ chạy test. Cần tách kết quả minh họa và log chạy thật để tránh hiểu nhầm.',
   'Nguyễn Văn An: Auth/Admin và tổng hợp báo cáo, 5 giờ. Trần Thị Bình: tìm việc và UI, 5 giờ. Lê Minh Cường: CV/editor/skill gap, 6 giờ. Phạm Thu Dung: bảo mật, thông báo và PayOS, 6 giờ. Toàn bộ số giờ là minh họa.',
   'Lưu output thật cùng phiên bản code khi chạy regression sau này. Chuẩn hóa seed và môi trường trước buổi test. Dùng benchmark đúng mục tiêu, không suy rộng. Yêu cầu AI nêu giả định và review expected trước khi kết luận.'
  ]
 }
];
parts.forEach((p,index)=>{
 const sheet=`Part${index+1}`;
 set(sheet,'B2',p.title);
 set(sheet,'B3','Nhật ký tháng 10/2026 tái dựng từ code Jobtimize. Prompt, phân công và kết quả minh họa là giả lập; không phải bằng chứng chạy test.');
 set(sheet,'B95',`SWT301 | Jobtimize | Part${index+1} | Tháng 10/2026`);
 const date=offset=>`${String(Math.min(31,p.start+offset)).padStart(2,'0')}/10/2026`;
 // Fill the ten existing audit rows with concise text that fits fixed heights.
 const labels=[['OTP/JWT','Tìm việc và bộ lọc','CV và matching','Lịch và thanh toán'],['Mock OTP/SMTP','Hồ sơ doanh nghiệp','Chuẩn hóa CV','PayOS và email'],['JWT và phân quyền','Đăng tin và KYC','CV và skill gap','Lịch và thông báo'],['Auth và Admin','Tìm việc và UI','CV editor và AI','Bảo mật và PayOS']][index];
 const files=[['otpStore.js','jobController.js','cvNormalization.js','paymentService.js'],['test_otp.js','employerProfile.js','cvNormalization.js','payosService.js'],['authMiddleware.js','employerRoutes.js','cvNormalization.js','notificationStore.js'],['authMiddleware.js','jobController.js','cvNormalization.js','payosService.js']][index];
 for(let i=0;i<10;i++){
  const t=p.tasks[i%4], row=8+i, second=i>=4;
  const vals=[date(Math.floor(i/2)),members[i%4],i%2?'GitHub Copilot':'ChatGPT',`${second?'Review':'Thiết kế'}: ${labels[i%4]}`,files[i%4],second?'Low':'Medium',`Sửa expected; xem Prompt #${i%4+1}.`,'Đối chiếu code.'];
  vals.forEach((v,j)=>set(sheet,`${String.fromCharCode(66+j)}${row}`,v));
 }
 for(const [key,start] of [['added',23],['changed',30],['fixed',37],['removed',44]]){
  p[key].forEach((v,i)=>{
   const r=start+i;
   set(sheet,`B${r}`,date(3+Math.floor(i/2)));set(sheet,`C${r}`,members[i]);
   const firstFile=v[1].split(';')[0];
   set(sheet,`D${r}`,v[0]);set(sheet,`G${r}`,firstFile.length<=22?firstFile:`Xem Prompt #${i+1}`);
   set(sheet,`H${r}`,'Dữ liệu minh họa.');
  });
 }
 p.prompts.forEach((v,i)=>{
  const r=53+i*5;set(sheet,`C${r}`,members[i]);set(sheet,`D${r}`,i%2?'GitHub Copilot':'ChatGPT');
  set(sheet,`E${r}`,v[0]);set(sheet,`D${r+1}`,v[1]);set(sheet,`D${r+2}`,v[2]);set(sheet,`D${r+3}`,v[3]);
 });
 [77,80,83,86,89,92].forEach((r,i)=>set(sheet,`B${r}`,p.reflection[i]));
});
// Every value is authored with the spreadsheet API. The final packaging step keeps
// the original template XML and transplants only these values, to preserve styles.
for(const [name,cells] of Object.entries(edits)){
 const sheet=wb.worksheets.getItem(name);
 for(const [address,value] of Object.entries(cells))sheet.getRange(address).values=[[value]];
}
wb.recalculate();
console.log((await wb.inspect({kind:'table',sheetId:'Thông tin nhóm',range:'B19:G22',maxChars:2000,tableMaxRows:4,tableMaxCols:6})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
for(const name of ['Thông tin nhóm','Part1','Part2','Part3','Part4']){
 try {
  const preview=await wb.render({sheetName:name,range:name==='Thông tin nhóm'?'B18:G29':'B50:I71',scale:1,format:'png'});
  await fs.writeFile(`${dir}/${name==='Thông tin nhóm'?'group':name}.png`,new Uint8Array(await preview.arrayBuffer()));
 }catch(e){console.log('Render',name,e.message);}
}
for(const [label,range] of [['audit','B7:I17'],['reflection','B74:I92']]) {
 const preview=await wb.render({sheetName:'Part4',range,scale:1,format:'png'});
 await fs.writeFile(`${dir}/${label}.png`,new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(`${dir}/authored.xlsx`);
await fs.writeFile(`${dir}/edits.json`,JSON.stringify(edits,null,2));
console.log('Authored cells:',Object.values(edits).reduce((a,c)=>a+Object.keys(c).length,0));
