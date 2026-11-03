from pathlib import Path
from copy import deepcopy
import hashlib,json,zipfile,re
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

base=Path(__file__).parent
source=Path(r'C:\Users\duong\Downloads\Ke_hoach_RBL_Manuscript_Quan_ly_Thu_vien (1).docx')
target=base/'Ke_hoach_RBL_Manuscript_Jobtimize.docx'
digest=hashlib.sha256(source.read_bytes()).hexdigest()
d=Document(source)
with zipfile.ZipFile(source) as z:
 inventory={x.filename:{'size':x.file_size,'sha256':hashlib.sha256(z.read(x.filename)).hexdigest(),'mode':'editable' if x.filename=='word/document.xml' else 'preserve'} for x in z.infolist()}
(base/'reference-parts.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
(base/'artifact.md').write_text(f'''# RBL Jobtimize template contract
Reference: {source}
SHA256: {digest}
One section, US Letter 8.5 by 11 inches. Margins top/bottom 0.6 inches and left/right 0.65 inches. Exact sectPr retained.
Source roles: Arial 10 pt body; title direct 18 pt bold blue 1F4E79; Heading 1 16 pt blue, Heading 2 13 pt blue, Heading 3 11 pt blue. Source numbering, lists, spacing, table grids and borders retained.
Source contains 138 body paragraphs and 36 tables, no drawings, content controls or field instructions; two explicit page breaks.
Content flow: title and metadata, 13-item contents, overview, domain, competencies, assignments, four SWR tracks, four SWT tracks, timetable, AI log, manuscript structure, rubric, templates, publication plan, prompts.
Editable slots: word/document.xml body p by source index and tbl by source index. Rewrite domain, rules, sample datasets, prompts and manuscript titles. Preserve generic teaching criteria where relevant. Metadata may gain rows using cloned source rows. Assignment table maps five members and cross-review responsibilities. Timetable maps ten phases to October 2026. Additional measurement and source paragraphs may clone source paragraph roles.
All other package parts, relationships, styles, numbering, header/footer and settings are preserve-only, recorded in reference-parts.json. Do not change page geometry or insert unrelated decoration.
Rendering: canonical render_docx.py attempted. Runtime lacks LibreOffice and Word; reference page count and native pagination cannot be verified on this host. Keep source-derived layout and perform structural checks; disclose this limitation on delivery.
''',encoding='utf-8')

def put(p,text):
    # Preserve the first text run's formatting, and all paragraph properties.
    runs=p.runs
    if runs:
        runs[0].text=text
        for r in runs[1:]:r.text=''
    else:p.add_run(text)

P={
1:'KẾ HOẠCH TRIỂN KHAI RBL INSIGHT VÀ MANUSCRIPT DRAFT',
2:'Đề tài Jobtimize — Nền tảng tuyển dụng ứng dụng AI cho SWR302 và SWT301',
9:'Bài toán chung: Nền tảng tuyển dụng Jobtimize',
11:'Phân công nhóm và cơ chế kiểm chứng',
14:'Quy trình RBL Insight trong tháng 10/2026',
23:'Nhóm 03 sử dụng Jobtimize làm case study để nghiên cứu cách AI hỗ trợ phân tích yêu cầu và thiết kế kiểm thử cho nền tảng tuyển dụng. Trọng tâm SWT301 là so sánh test case do AI sinh với bộ ca thủ công trên các nghiệp vụ OTP/JWT, ứng tuyển, CV matching và lịch phỏng vấn. Phần SWR302 bổ trợ việc chuẩn hóa requirement, user story và use case. Sản phẩm gồm dataset có expected result, prompt log, bảng đánh giá, phân tích lỗi và kế hoạch manuscript 4–6 trang.',
25:'Kiểm chứng output AI bằng controller, service, middleware và script kiểm thử thực tế của Jobtimize.',
26:'Xây dựng dữ liệu có cấu trúc, tách yêu cầu đã triển khai, tiêu chí nghiên cứu đề xuất và kết quả thực nghiệm.',
27:'Lưu prompt, phiên bản code, output gốc, nhận xét và phần chỉnh sửa của từng thành viên.',
28:'Đánh giá chất lượng test case và unit test trước và sau khi con người hiệu chỉnh.',
29:'Chuẩn bị dữ liệu và manuscript để giảng viên xem xét khả năng mở rộng nghiên cứu sau môn học.',
31:'2. Bài toán chung: Nền tảng tuyển dụng Jobtimize',
32:'Jobtimize kết nối ứng viên và nhà tuyển dụng, có quản trị viên quản lý tài khoản và nội dung. Frontend dùng React 18, Vite và Tailwind CSS; backend dùng Node.js, Express và SQL Server. Hệ thống có đăng ký/xác thực OTP, JWT, tìm việc, CV nhiều phiên bản, ứng tuyển, ATS, AI matching, skill gap, lời mời, lịch phỏng vấn, thông báo và thanh toán PayOS. Nghiên cứu tập trung vào các nhánh nghiệp vụ có thể kiểm chứng từ code, không đánh đồng AI dùng để hỗ trợ kiểm thử với dịch vụ AI đang tích hợp trong sản phẩm.',
34:'Khách có thể tìm và xem tin tuyển dụng; ứng viên đăng nhập để lưu tin, quản lý hồ sơ và ứng tuyển.',
35:'Ứng viên quản lý nhiều CV, chọn CV chính, tạo CV online và xác nhận dữ liệu kỹ năng trước khi đối chiếu với tin tuyển dụng.',
36:'Nhà tuyển dụng quản lý hồ sơ doanh nghiệp, KYC, đăng tin, tìm ứng viên và quản lý hồ sơ trong ATS.',
37:'AI matching đối chiếu kỹ năng đã xác nhận với yêu cầu tuyển dụng; skill gap chỉ ra kỹ năng thiếu và gợi ý khóa học.',
38:'Nhà tuyển dụng gửi lời mời, đặt lịch phỏng vấn; ứng viên phản hồi theo trạng thái và phiên bản dữ liệu.',
39:'Hệ thống lưu thông báo, hỗ trợ email tuyển dụng và xử lý gói dịch vụ/thanh toán PayOS ở phía server.',
40:'Admin quản lý người dùng, kiểm duyệt doanh nghiệp/nội dung và xem báo cáo phân tích. JWT, vai trò và quyền sở hữu được kiểm tra ở backend.',
44:'4. Phân công nhóm và cơ chế kiểm chứng',
45:'Nhóm 03 gồm 5 thành viên, dùng một repository Jobtimize và bộ dữ liệu chung. Mỗi người phụ trách một module, đồng thời tham gia một cặp review chéo. Phần SWR302 cung cấp requirement có thể kiểm thử; phần SWT301 sử dụng cùng rule để thiết kế và đánh giá test. Phạm vi nghiên cứu chính gồm xác thực, ứng tuyển, matching và lịch phỏng vấn; PayOS, thông báo và admin là phạm vi hồi quy bổ trợ.',
49:'Câu hỏi nghiên cứu: Với cùng mô tả Jobtimize, prompt có ngữ cảnh code và checklist INVEST có tạo user story rõ actor, đúng quyền và acceptance criteria kiểm thử được tốt hơn prompt đơn giản không?',
51:'Chuẩn bị mô tả Jobtimize 300–500 từ, nêu ba vai trò Candidate, Employer, Admin và các điều kiện CV/OTP.',
56:'Chọn 10–15 user story hợp lệ, gắn với rule và file nguồn; lưu cả bản AI gốc lẫn bản sửa.',
58:'Câu hỏi nghiên cứu: AI phát hiện được requirement mơ hồ về matching, phản hồi API và quyền truy cập của Jobtimize đến mức nào?',
60:'Tạo 30–50 requirement cho Jobtimize, có câu rõ và câu mơ hồ; ghi rõ câu nào là tiêu chí đề xuất chưa có trong code.',
65:'Tính accuracy và precision/recall cho nhãn Ambiguous; thống kê rewrite được chấp nhận, không coi nhãn nhóm là chân lý tuyệt đối.',
67:'Câu hỏi nghiên cứu: AI xác định đúng actor, main flow và nhánh lỗi của ứng tuyển, xác nhận CV và đặt lịch phỏng vấn hay không?',
69:'Chuẩn bị mô tả Jobtimize và trích đoạn route/controller liên quan, loại bỏ bí mật và dữ liệu cá nhân.',
71:'Viết specification cho 3 use case: Apply Job, Confirm CV và Schedule Interview; nêu tiền điều kiện, hậu điều kiện và nhánh lỗi.',
73:'Kiểm tra AI có nhầm quyền Candidate/Employer/Admin, thiếu điều kiện CV Ready, quyền sở hữu hoặc version hay không.',
76:'Câu hỏi nghiên cứu: Trong Jobtimize, chiến lược prompt nào cho requirement đúng nghiệp vụ và dễ kiểm thử nhất khi giữ cùng input?',
83:'Rút ra prompt template cho Jobtimize, ghi rõ giới hạn áp dụng đối với domain khác.',
85:'Với Jobtimize, SWT301 tập trung vào test case cho OTP/JWT và ứng tuyển, giá trị biên của matching và lịch phỏng vấn, unit test Node.js và test smell. Các script hiện có gồm test_otp.js, test_cv_normalization.js, test_cv_analysis.js, test_schedule_idor.js và test_payos_setup.js. Nghiên cứu dùng code làm căn cứ xác định expected, đồng thời lập tiêu chí nghiệp vụ thủ công để tránh chỉ sao chép lỗi hiện có của implementation.',
86:'6.1. Nhánh SWT301 thứ nhất: AI sinh test case xác thực và ứng tuyển',
87:'Câu hỏi nghiên cứu RQ1: Prompt có ngữ cảnh code giúp AI sinh test case đúng nghiệp vụ, đủ ca âm và ít trùng lặp hơn prompt chỉ mô tả chức năng hay không?',
89:'Viết requirement cho OTP đăng ký/reset mật khẩu, kiểm tra JWT và POST /api/jobs/apply, gắn với rule BR01–BR04.',
90:'Dùng hai chiến lược prompt P0 và P1 để sinh ít nhất 20 test case mỗi chiến lược; yêu cầu đủ ID, tiền điều kiện, input, bước chạy, expected và type.',
91:'Nhóm tự thiết kế ít nhất 10 ca thủ công trước khi xem AI output, sau đó review độc lập để tạo bộ tham chiếu.',
92:'So sánh từng bộ ca AI với bộ tham chiếu theo rule và nhánh nghiệp vụ; chuẩn hóa các ca tương đương trước khi đếm.',
93:'Chấm correctness, testability, completeness và trùng lặp. Các lỗi khác nhau 401/403/404/409 phải có điều kiện cụ thể.',
94:'Chốt bộ test cuối sau review; giữ liên kết từ test case đến output AI gốc và lý do sửa.',
95:'6.2. Nhánh SWT301 thứ hai: AI sinh test biên matching và lịch phỏng vấn',
96:'Câu hỏi nghiên cứu RQ2: AI có xác định đúng biên điểm matching, trạng thái CV và điều kiện thời gian/version của lịch phỏng vấn không?',
98:'Mô tả matching: trọng số kỹ năng bắt buộc 2, tùy chọn 1; chỉ nhận kỹ năng verified và CV Ready; kết quả làm tròn bằng Math.round.',
99:'Tạo ca 0%, 100%, một phần kỹ năng, không có tiêu chí, CV chưa Ready; thêm lịch quá khứ, đúng thời điểm hiện tại, tương lai và thiếu múi giờ.',
100:'Thiết kế input gồm trạng thái CV, tập kỹ năng, yêu cầu tuyển dụng, now cố định, interviewDate, version và expected status/score.',
101:'Tính expected bằng tay từ rule; phân biệt null/NotReady/NoCriteria với điểm 0 của CV đã sẵn sàng.',
102:'Tính tỷ lệ expected đúng và tỷ lệ nhánh biên được bao phủ; mẫu số là bộ rule/biên đã chốt trước.',
103:'Phân tích lỗi AI khi chia đều trọng số, dùng kỹ năng chưa xác nhận, bỏ qua múi giờ hoặc version cũ.',
104:'6.3. Nhánh SWT301 thứ ba: AI sinh unit test bằng Node.js',
105:'Câu hỏi nghiên cứu RQ3: Unit test do AI sinh có chạy được, assert đúng và phát hiện được nhánh lỗi quan trọng sau bao nhiêu chỉnh sửa?',
107:'Chọn getOtpRecord/verifyOtp trong otpStore.js và compareSkills trong aiMatchingService.js, cô lập các dependency không thuộc phạm vi.',
108:'Yêu cầu AI dùng node:test, node:assert/strict và CommonJS đúng với server; tham khảo test_otp.js và test_cv_normalization.js.',
109:'Chạy trong môi trường cô lập; mock DB, SMTP và AI provider. Không gửi email hoặc gọi gateway thật trong unit test.',
110:'Lưu lệnh chạy, số ca, kết quả, lỗi nạp module, assert sai, fixture thiếu và thời gian sửa; giữ output gốc trước hiệu chỉnh.',
111:'Sửa test khi cần, ghi người sửa và lý do; không sửa implementation chỉ để làm assertion sai của AI thành đúng.',
112:'Đo executability, assertion correctness và mức bao phủ rule. Chỉ ghi line/branch coverage khi có công cụ và báo cáo đo thực.',
114:'Câu hỏi nghiên cứu RQ4: AI phát hiện test smell trong script Node.js của Jobtimize có phù hợp với đánh giá độc lập của hai thành viên không?',
116:'Chuẩn bị 20–30 đoạn test từ script Jobtimize hoặc biến thể phục vụ nghiên cứu; tách rõ code gốc và code được cài smell.',
117:'Xét bốn smell: Assertion Roulette, Eager Test, Mystery Guest và Resource Optimism; mô tả quy tắc gán nhãn trước khi chạy AI.',
118:'Hai thành viên dán nhãn độc lập trước khi xem output AI; lưu bất đồng và kết quả thống nhất sau review.',
119:'Yêu cầu AI phân tích từng đoạn test, chỉ ra vị trí, bằng chứng và gợi ý refactor.',
120:'So sánh AI label với nhãn thống nhất; tính precision/recall riêng cho mỗi smell, cho phép nhiều nhãn trên một mẫu.',
121:'Ghi lỗi false positive/false negative; không coi mọi dependency tích hợp hoặc nhiều assertion đều mặc định là smell.',
122:'7. Quy trình RBL Insight trong tháng 10/2026',
124:'AI Audit Log ghi ngày, thành viên, công cụ/model, prompt, output, đánh giá, phần sửa và kết quả kiểm chứng. Nhóm dùng file SWT301_AI_Log_Jobtimize_5ThanhVien.xlsx để tổng hợp theo Part1–Part4. Nhật ký tái dựng hoặc dữ liệu minh họa phải được phân biệt với log thực nghiệm thu thập khi chạy, vì chỉ dữ liệu kiểm chứng mới được dùng để kết luận trong manuscript.',
128:'11.1. Problem Statement của nhóm Jobtimize',
129:'11.2. Bảng Requirement Dataset minh họa',
130:'11.3. Bảng Test Case minh họa',
132:'Nhóm 03 chỉ cân nhắc nâng cấp sau khi có dataset truy vết được, kết quả đo lặp lại và phản biện của giảng viên. Mức từ 80/100 trong rubric là điều kiện xem xét nội bộ, không phải bảo đảm bài được chấp nhận. Hướng mở rộng gồm nhiều lần chạy AI, thêm module hoặc thêm domain và đối chiếu related work.',
}
for i,text in P.items():put(d.paragraphs[i],text)

def cell(t,r,c,text):
    obj=d.tables[t].cell(r,c)
    put(obj.paragraphs[0],text)
    for p in obj.paragraphs[1:]:put(p,'')
def table(t,rows):
    assert len(rows)==len(d.tables[t].rows),(t,len(rows))
    done=set()
    for r,values in enumerate(rows):
        for c,text in enumerate(values):
            tc=d.tables[t].cell(r,c)._tc
            if tc in done:continue
            cell(t,r,c,text);done.add(tc)

table(0,[['Mục tiêu tài liệu\nKế hoạch RBL của Nhóm 03 cho Jobtimize: phân tích yêu cầu, thiết kế kiểm thử có AI hỗ trợ, xây dựng dataset, đối chiếu với code, đo chất lượng output và chuẩn bị manuscript draft. Trọng tâm thực hiện là SWT301; SWR302 cung cấp các hoạt động phân tích yêu cầu liên quan.']])
table(1,[['Hạng mục','Nội dung'],['Đối tượng áp dụng','Nhóm 03, lớp SE1701; trọng tâm SWT301, liên hệ SWR302'],['Bài toán chung','Jobtimize — Nền tảng tuyển dụng ứng dụng AI'],['Định hướng','RBL Insight, AI Audit Log và manuscript draft'],['Sản phẩm cuối','Dataset, bộ test, log thực nghiệm, bảng đánh giá và manuscript 4–6 trang'],['Vai trò AI','Hỗ trợ sinh/phân tích output; nhóm chịu trách nhiệm xác định expected và kiểm chứng']])
for label,value in [('Giảng viên hướng dẫn','Lê Thị Bích Tra — traltb@fe.edu.vn'),('Thời gian triển khai','01/10/2026–31/10/2026'),('Repository','https://github.com/VuHoang0504/Jobtimize')]:
    t=d.tables[1];row=deepcopy(t.rows[-1]._tr);t._tbl.append(row)
    put(t.rows[-1].cells[0].paragraphs[0],label);put(t.rows[-1].cells[1].paragraphs[0],value)
table(2,[['Cách triển khai của nhóm\nTừ cùng một mô tả và phiên bản code Jobtimize, nhóm thiết kế bộ tham chiếu thủ công, dùng AI tạo output ban đầu, kiểm tra lỗi, đo chất lượng trước/sau hiệu chỉnh và rút ra insight. Không sử dụng số liệu minh họa làm kết quả thực nghiệm.']])
table(4,[['Actor','Quyền hạn/chức năng chính'],['Candidate','Quản lý hồ sơ/CV, lưu tin, ứng tuyển, xem matching/skill gap, phản hồi lời mời và lịch phỏng vấn.'],['Employer','Quản lý doanh nghiệp/KYC, đăng tin, ATS, tìm ứng viên, gửi lời mời, hẹn phỏng vấn và mua gói dịch vụ.'],['Admin','Quản lý tài khoản, kiểm duyệt doanh nghiệp/nội dung và xem báo cáo quản trị.'],['System và dịch vụ tích hợp','Kiểm tra JWT/role, tính matching, xử lý thông báo, email và xác minh thanh toán. Đây là thành phần hỗ trợ, không phải tài khoản người dùng.']])
table(5,[['Mã rule','Nội dung rule và căn cứ'],['BR01','OTP tách theo email đã chuẩn hóa và purpose. TTL mặc định 10 phút; getOtpRecord loại mã khi now > expiresAt, nên phải kiểm tra cả mốc bằng. Nguồn: otpStore.js.'],['BR02','API bảo vệ yêu cầu Bearer JWT hợp lệ và user Active. Thiếu/xấu token trả 401; không thuộc role cho phép trả 403. Nguồn: authMiddleware.js.'],['BR03','Ứng tuyển dùng Candidate đã xác thực; tin phải Published và còn hạn; CV không archived và thuộc hồ sơ ứng viên. Nguồn: jobRoutes.js, jobController.js.'],['BR04','Ứng tuyển trùng hoặc CV thay đổi version trong quá trình gửi có thể trả 409. Hồ sơ lưu CVVersionID và chi tiết matching. Nguồn: jobController.js.'],['BR05','Matching cần CV Ready và dữ liệu xác nhận. Kỹ năng bắt buộc có trọng số 2, tùy chọn 1; chỉ tính kỹ năng verified. Điểm = round(earned/total × 100). Không có tiêu chí trả NoCriteria và null. Nguồn: aiMatchingService.js.'],['BR06','Đặt lịch nhận đúng một applicationId hoặc invitationId, kiểm tra owner, trạng thái và version; ngày phải ở tương lai và có múi giờ; Online yêu cầu http/https. Nguồn: recruitmentController.js.'],['BR07','Giá gói lấy từ DB; thanh toán được server xác minh và xử lý kích hoạt. Không dùng return URL làm bằng chứng trả tiền. Nguồn: paymentController.js, payosService.js, paymentService.js.']])
table(7,[['Thành viên hoặc hoạt động','Phạm vi','Nhiệm vụ và đầu ra'],['A — Đỗ Minh Tuấn Anh','Auth và quản trị','Trưởng nhóm; OTP/JWT, ma trận quyền, tích hợp báo cáo và kiểm tra truy vết kết quả.'],['B — Bì Lê Vũ Hoàng','Việc làm và doanh nghiệp','Requirement tìm việc/đăng tin/KYC; test dữ liệu đầu vào và luồng Employer.'],['C — Nguyễn Thành Phước','CV và AI matching','Bộ dữ liệu kỹ năng, rule trọng số/Ready, ca biên và so sánh expected bằng tay.'],['D — Mai Xuân Quý','Tuyển dụng và PayOS','Ca ứng tuyển, lời mời, lịch, owner/version và hồi quy thanh toán.'],['E — Phạm Tuấn Khôi','Dữ liệu và đánh giá thực nghiệm','Chuẩn hóa dataset, dán nhãn test smell, tổng hợp metric và biên tập phương pháp/giới hạn.'],['Review chéo','A với B; C với D; E tổng hợp','Hai người đánh giá độc lập; lưu bất đồng trước khi thống nhất nhãn.'],['SWR302 liên quan','User story, requirement, use case','Dùng cùng rule Jobtimize làm input để thiết kế test SWT301.'],['SWT301 trọng tâm','Test design, unit test, test smell','Đối chiếu AI với bộ tham chiếu; kiểm chứng trong môi trường phù hợp và viết manuscript.']])
for t,text in {8:'AI Assisted User Story Generation for Jobtimize',10:'Detecting Ambiguous Requirements in an AI Recruitment Platform',12:'Prompt Based Use Case Modeling for Jobtimize',14:'Comparing Prompting Strategies for Jobtimize Requirements',16:'Evaluating AI Generated Authentication and Job Application Test Cases',18:'AI Assisted Boundary Test Design for CV Matching and Interview Scheduling',20:'Assessing AI Generated Node.js Unit Tests in Jobtimize',22:'Detecting Test Smells in Jobtimize Node.js Tests'}.items():
 table(t,[[f'Tên manuscript draft gợi ý\n{text}']])
cell(13,1,1,'Ít nhất 3 actor người dùng: Candidate, Employer, Admin')
cell(13,2,1,'Ít nhất 10 use case thuộc các module đã triển khai')
cell(13,3,1,'Apply Job, Confirm CV và Schedule Interview')
cell(17,1,1,'Ít nhất 20 ca mỗi chiến lược P0/P1; lưu số thực tế khi chạy')
cell(17,2,1,'Ít nhất 10 ca tham chiếu viết trước khi xem AI output')
cell(17,3,1,'OTP/JWT và ứng tuyển qua POST /api/jobs/apply')
cell(17,4,1,'Bảng correctness, rule coverage, duplicate rate và lỗi đặc trưng')
cell(19,1,1,'Ít nhất 20 ca cho matching và lịch phỏng vấn')
cell(19,2,1,'Ready/NotReady/NoCriteria; 0/67/100%; past/now/future; version cũ')
cell(19,3,1,'Input có now cố định, CV version, skills, criteria và expected score/status')
cell(19,4,1,'Tỷ lệ expected đúng, mức bao phủ biên và phân tích lỗi')
cell(21,1,1,'Ít nhất 2 hàm hoặc nhóm hàm từ otpStore/compareSkills')
cell(21,2,1,'Ít nhất 8 unit test; dùng node:test và node:assert/strict')
cell(21,3,1,'Lệnh chạy, log nguyên bản, output AI và test sau hiệu chỉnh')
cell(21,4,1,'Executability, assertion correctness, số chỉnh sửa và lỗi dependency')
cell(23,1,1,'20–30 đoạn test gốc/biến thể có nguồn và ID')
cell(23,2,1,'4 loại smell; một mẫu có thể có nhiều nhãn')
cell(23,3,1,'Test code, nhãn của hai người, nhãn thống nhất, AI label và lý do')
cell(23,4,1,'Precision/recall theo smell, false positive/negative và ví dụ')

periods=['01–03/10/2026','04–06/10/2026','07–09/10/2026','10–12/10/2026','13–15/10/2026','16–18/10/2026','19–21/10/2026','22–24/10/2026','25–28/10/2026','29–31/10/2026']
activities=[
('Chốt scope Jobtimize, rule và phân công 5 người.','Đăng ký đề tài và phạm vi','Góp ý giới hạn nghiên cứu.'),
('Viết problem statement, RQ và ma trận rule–file.','Problem statement và RQ1–RQ4','Duyệt câu hỏi và expected nền.'),
('Thiết kế P0/P1 và mẫu AI Audit Log.','Prompt v1, output thử','Kiểm tra ngữ cảnh và format.'),
('Tạo dataset và bộ tham chiếu thủ công.','Dataset v1 và nhãn độc lập','Review rule, mẫu số và bất đồng.'),
('Chạy thí nghiệm chính, lưu model/config và code revision.','Output gốc, log và bảng chấm','Kiểm tra quy trình có thể lặp lại.'),
('Tính metric, phân loại lỗi và review chéo.','Bảng kết quả thực và error analysis','Kiểm tra phép tính và kết luận.'),
('Viết manuscript lần 1 theo khung 4–6 trang.','Draft v1, bảng và ví dụ','Phản biện phương pháp và minh chứng.'),
('Chỉnh sửa bộ test và chuẩn hóa phần so sánh.','Draft v2 và bảng phản hồi','Kiểm tra thay đổi sau review.'),
('Hoàn thiện discussion, validity, references và log.','Manuscript final và dataset final','Rà soát nhất quán giữa dữ liệu và claim.'),
('Trình bày, phản biện và lập kế hoạch mở rộng.','Slide, demo, submission checklist','Đánh giá theo rubric, góp ý hướng nâng cấp.')]
table(24,[['Giai đoạn','Hoạt động chính','Sản phẩm nộp','Vai trò giảng viên']]+[[p,*a] for p,a in zip(periods,activities)])
cell(25,1,1,'Ngày/giờ thực tế; dùng DD/MM/YYYY, các mốc kế hoạch thuộc 10/2026.')
cell(25,2,1,'Tên công cụ, model/version và cấu hình nếu truy cập được; không tự đoán phiên bản.')
cell(25,3,1,'Sinh requirement, test OTP/matching, unit test hoặc phân tích test smell của Jobtimize.')
cell(25,5,1,'Lưu output gốc với ID và đường dẫn minh chứng; tách output thử và output chính thức.')
cell(25,6,1,'Ghi rule bị sai/thiếu, trạng thái hoặc assertion không hợp lệ; dẫn file/ca tham chiếu.')
cell(25,7,1,'Ghi phần sửa, người sửa và lý do; giữ bản trước/sau để đo công sức hiệu chỉnh.')
table(26,[['Phần','Nội dung cần viết cho Jobtimize'],['Title','Evaluating AI Generated Test Cases for the Jobtimize Recruitment Platform. Chốt tên theo phạm vi và kết quả thực thu được.'],['Abstract','150–200 từ: bối cảnh tuyển dụng, RQ, P0/P1, dataset, phương pháp đánh giá và phát hiện. Chỉ điền số đo sau thực nghiệm.'],['1. Introduction','Rủi ro sai rule ở OTP, ứng tuyển, matching và lịch; lý do đánh giá AI; mục tiêu và RQ chính.'],['2. Related Work','Tổng hợp 3–5 nghiên cứu về AI sinh test, oracle và test smell; phân biệt kết quả nghiên cứu Java với hệ Node.js.'],['3. Methodology','Phiên bản code, dataset, bộ tham chiếu độc lập, P0/P1, số lần lặp, model/config, tiêu chí chấm và xử lý bất đồng.'],['4. Experiment / Case Study','Kiến trúc React–Express–SQL Server; module chọn; fixture có owner/version; mock SMTP/model và DB thử riêng.'],['5. Results and Discussion','Bảng metric thực, ví dụ lỗi 401/403, OTP boundary, trọng số 2:1 và version. Phân biệt output AI gốc và sau sửa.'],['6. Threats to Validity','Một dự án, mẫu nhỏ, nhãn chủ quan, biến thiên AI, rò rỉ bộ tham chiếu và nguy cơ dùng code làm oracle duy nhất.'],['7. Conclusion','Trả lời RQ dựa trên số đo; nêu khi nào cần human review và phạm vi chưa thể khái quát.'],['References','Tối thiểu 5 tài liệu theo IEEE/APA; gồm nghiên cứu, tài liệu kỹ thuật và snapshot repository.']])
cell(27,1,3,'Phạm vi rộng, thiếu actor/rule hoặc không gắn với Jobtimize.')
cell(27,2,2,'Dataset đủ số lượng, có ID, nguồn, rule và expected/nhãn; phân biệt dữ liệu thử và thực.')
cell(27,4,2,'Giữ input chung khi so P0/P1; có bộ tham chiếu độc lập, tiêu chí chấm và số lần lặp rõ.')
cell(27,5,2,'Có số đo thực, mẫu số rõ, ví dụ sai/thiếu và phân tích công sức sửa.')
table(28,[['Mục','Nội dung'],['Tên nhóm','Nhóm 03 — lớp SE1701 — SWT301'],['Tên chủ đề','Đánh giá AI hỗ trợ thiết kế kiểm thử cho nền tảng tuyển dụng Jobtimize'],['Bối cảnh','Jobtimize dùng React, Express và SQL Server; xử lý xác thực, CV, ứng tuyển và tuyển dụng nhiều vai trò.'],['Vấn đề','AI có thể sinh ca nhanh nhưng dễ sai điều kiện owner/version, OTP purpose và weighted matching; cần kiểm chứng bằng rule và bộ tham chiếu.'],['Câu hỏi nghiên cứu','RQ chính: bổ sung code/rule vào prompt có cải thiện correctness và rule coverage của test case so với prompt mô tả đơn giản không?'],['Dữ liệu đầu vào','Rule BR01–BR07, route/controller/service chọn, bộ tham chiếu ít nhất 10 ca, output AI P0/P1 và script liên quan.'],['Kết quả mong đợi','Dataset có truy vết, bảng so sánh P0/P1, log chỉnh sửa, error analysis và manuscript draft 4–6 trang.']])
table(29,[['ID','Requirement','Human Label','AI Label','Đúng/Sai','AI Rewrite','Ghi chú'],['REQ01','Hệ thống tìm việc nhanh.','Ambiguous','Chưa chạy','Chưa chấm','Đề xuất: P95 ≤ 2 giây với 20 request đồng thời trên môi trường và dataset đã chốt.','Tiêu chí nghiên cứu đề xuất; chưa phải SLA đã đạt.'],['REQ02','Matching chỉ tính kỹ năng verified, trọng số bắt buộc 2 và tùy chọn 1.','Clear','Chưa chạy','Chưa chấm','Không cần viết lại.','Đối chiếu compareSkills.'],['REQ03','AI luôn đưa ra ứng viên phù hợp.','Ambiguous','Chưa chạy','Chưa chấm','Hiển thị skill score và kỹ năng khớp/thiếu của CV Ready; không diễn giải thành xác suất tuyển dụng.','Cần tách score kỹ năng với quyết định tuyển dụng.']])
table(30,[['TC ID','Feature','Scenario','Pre-condition','Input','Steps','Expected Result','Type'],['TC01','OTP','Đúng thời điểm hết TTL','Lưu OTP đăng ký; cố định now.','now = expiresAt','Lưu OTP, đặt đồng hồ, gọi getOtpRecord.','Record còn tồn tại vì code chỉ loại khi now > expiresAt.','Boundary'],['TC02','CV match','Khớp kỹ năng bắt buộc','CV Ready; kỹ năng A verified.','Yêu cầu A bắt buộc, B tùy chọn.','Gọi compareSkills với fixture.','Ready; điểm 67%; A khớp, B thiếu.','Positive'],['TC03','Interview','Dữ liệu version cũ','Employer sở hữu hồ sơ; có lịch version 2.','Gửi version 1; ngày tương lai có múi giờ.','Gửi yêu cầu đổi lịch với version cũ.','409; không cập nhật lịch hoặc tạo thông báo thành công.','Negative']])
cell(31,1,2,'Nhóm được xem xét nội bộ khi đạt từ 80/100 và có dữ liệu kiểm chứng.')
cell(31,2,2,'Danh mục hạng mục cần nâng cấp của Nhóm 03.')
cell(31,4,1,'Tăng dataset, lặp lại nhiều lần, thêm module hoặc domain đối chứng; thu thập dữ liệu thực.')
cell(31,5,1,'Giảng viên cùng nhóm xác định seminar/hội nghị phù hợp sau khi kiểm tra chất lượng và yêu cầu hiện hành.')
table(32,[['Prompt mẫu\nAct as a business analyst for Jobtimize, an AI-assisted recruitment platform built with React, Express and SQL Server. Generate 20 user stories for Candidate, Employer and Admin. Cover authentication, CV confirmation, job application, interview scheduling and subscriptions. Use As a [role], I want [goal], so that [benefit] with Given-When-Then acceptance criteria. Use only the supplied rules. Mark proposals separately.'],['Prompt mẫu\nReview these Jobtimize user stories using INVEST. Check actor permissions, CV Ready state, verified skills, ownership and version conflicts. Explain each issue and rewrite the story with measurable acceptance criteria. Do not invent implemented limits or successful experiment results.']])
table(33,[['Prompt mẫu\nFor each supplied Jobtimize requirement, classify Clear or Ambiguous. Explain whether actor, action, condition and expected result are testable. If ambiguous, propose a measurable rewrite and label any new threshold as a proposal. Return ID, original text, label, reason, rewrite and supporting code/rule. Do not assume response-time SLAs from the implementation.']])
table(34,[['Prompt mẫu\nAct as a QA engineer for Jobtimize. Using BR01–BR06 and the supplied otpStore.js, jobController.js, aiMatchingService.js and recruitmentController.js excerpts, generate at least 20 tests. Include positive, negative, boundary and role/ownership cases. Return ID, rule, precondition, input, steps, expected HTTP or return value, side effect and type. Check OTP purpose and exact expiry, verified skills with weights 2:1, CV version, interview timezone and stale version. Do not fabricate endpoints.']])
table(35,[['Prompt mẫu\nAnalyze the supplied Jobtimize CommonJS node:test code for Assertion Roulette, Eager Test, Mystery Guest and Resource Optimism. Return sample ID, smell labels, exact evidence, reason and a minimal refactor. Multiple labels are allowed. Do not classify every integration dependency or every group of related assertions as a smell. Preserve the behavior and do not call external SMTP, AI or payment services.']])

# Add a reproducible measurement protocol using the source paragraph roles.
anchor=d.paragraphs[122]._p
def before(anchor,text,style):
    original=next(p for p in d.paragraphs if p.style.name==style and p.text)
    p=deepcopy(original._p)
    from docx.text.paragraph import Paragraph
    put(Paragraph(p,d._body),text)
    anchor.addprevious(p)
before(anchor,'6.5. Thiết kế so sánh và chỉ số đánh giá','Heading 2')
for text in [
 'P0 chỉ cung cấp mô tả chức năng. P1 bổ sung cùng mô tả, rule và trích đoạn code. Mỗi chiến lược chạy tối thiểu 3 lần với cùng model/cấu hình và cùng yêu cầu số ca. Gán run ID, lưu output đầy đủ và không đưa bộ tham chiếu cho AI trước khi sinh. Dữ liệu nghiên cứu dự kiến gồm ít nhất 120 test case thô: 2 chiến lược × 3 lần × 20 ca. Đây là thiết kế thu thập, không phải số ca đã kiểm chứng.',
 'Correctness = số ca có expected đúng / tổng ca được chấm. Rule coverage = số rule/nhánh trong ma trận tham chiếu được kiểm tra hợp lệ / tổng rule/nhánh đã chốt. Duplicate rate = số ca lặp dư / tổng ca thô; giữ lại một ca đại diện cho mỗi nhóm tương đương.',
 'Executability = số unit test nạp và chạy được / tổng test sinh. Pass rate được báo cáo riêng, vì test pass vẫn có thể có assertion sai. Với nhãn mơ hồ/test smell, dùng precision = TP/(TP+FP), recall = TP/(TP+FN); mẫu số bằng 0 ghi N/A. Tổng hợp theo từng run và module trước khi tính trung bình, kèm khoảng min–max.',
 'Mỗi output được hai thành viên chấm độc lập; Phạm Tuấn Khôi tổng hợp bất đồng để cả nhóm thống nhất theo rule. Lưu thời gian và số chỉnh sửa ở bước human review. Chỉ so sánh prompt khi cùng input, môi trường và tiêu chí. Kết quả trên Jobtimize không đủ để suy ra độ chính xác AI nói chung.'
]:before(anchor,text,'Normal')

# Append evidence and verified reading sources without changing the 13-section outline.
from docx.text.paragraph import Paragraph
last=d.paragraphs[-1]
def append(text,style):
    sample=next(p for p in d.paragraphs if p.style.name==style and p.text)
    node=deepcopy(sample._p)
    d._body._body.insert(len(d._body._body)-1,node)
    put(Paragraph(node,d._body),text)
append('13.5. Nguồn minh chứng và tài liệu nền','Heading 2')
for text in [
 'Nguồn mã: https://github.com/VuHoang0504/Jobtimize. Khi thực nghiệm, ghi commit/revision và môi trường để tái lập. Controller xác định API/side effect; service xác định rule; script kiểm thử chỉ được coi là bằng chứng chạy khi kèm log thực.',
 'Minh chứng ưu tiên: server/scripts/test_otp.js; test_cv_normalization.js; test_cv_analysis.js; test_schedule_idor.js; test_payos_setup.js. test_cv_analysis.js dùng database thử riêng và provider giả; không chạy ca tích hợp trên database đang sử dụng.',
 '[1] M. Chen et al., Evaluating Large Language Models Trained on Code, 2021. https://arxiv.org/abs/2107.03374. Dùng để phân biệt mã sinh ra với tính đúng chức năng.',
 '[2] ChatUniTest: A Framework for LLM-Based Test Generation, 2023. https://arxiv.org/abs/2305.04764. Tham khảo quy trình sinh, kiểm tra và sửa test; cần đánh giá lại trên stack Node.js.',
 '[3] Node.js, Test runner. https://nodejs.org/api/test.html. Tài liệu kỹ thuật cho node:test; ghi phiên bản Node khi chạy.',
 '[4] Node.js, Assert. https://nodejs.org/api/assert.html. Tài liệu kỹ thuật cho assertion dùng trong các suite Jobtimize.',
 '[5] OWASP, Insecure Direct Object Reference Prevention Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html. Tham chiếu cho ca owner và truy cập đối tượng khác.'
]:append(text,'Normal')

# Repeated table headers and non-splitting rows help long source-derived tables.
for t in d.tables:
    if len(t.rows)>1:
        pr=t.rows[0]._tr.get_or_add_trPr()
        if pr.find(qn('w:tblHeader')) is None:pr.append(OxmlElement('w:tblHeader'))
    for row in t.rows:
        pr=row._tr.get_or_add_trPr()
        if pr.find(qn('w:cantSplit')) is None:pr.append(OxmlElement('w:cantSplit'))

intermediate=base/'working.docx'
d.save(intermediate)
# Preserve all template package parts except the intended body edits.
with zipfile.ZipFile(source) as src,zipfile.ZipFile(intermediate) as edited,zipfile.ZipFile(target,'w') as out:
    for info in src.infolist():out.writestr(info,edited.read(info.filename) if info.filename=='word/document.xml' else src.read(info.filename))

final=Document(target)
text='\n'.join(p.text for p in final.paragraphs)+'\n'+'\n'.join(c.text for t in final.tables for r in t.rows for c in r.cells)
for term in ['Thư viện','thư viện','Library','Borrow Book','Return Book','Fine Calculation','CalculateFine','Student/Reader','Librarian']:
    assert term not in text,term
for name in ['Đỗ Minh Tuấn Anh','Bì Lê Vũ Hoàng','Nguyễn Thành Phước','Mai Xuân Quý','Phạm Tuấn Khôi']:assert name in text
assert len(final.sections)==1
with zipfile.ZipFile(source) as a,zipfile.ZipFile(target) as b:
    assert a.namelist()==b.namelist()
    for f in a.namelist():
        if f!='word/document.xml':assert a.read(f)==b.read(f),f
    from lxml import etree
    for f in ['word/document.xml']:
        aa=etree.fromstring(a.read(f));bb=etree.fromstring(b.read(f))
        assert etree.tostring(aa.find('.//'+qn('w:sectPr')))==etree.tostring(bb.find('.//'+qn('w:sectPr')))
assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
(base/'content.txt').write_text(text,encoding='utf-8')
print(json.dumps({'output':str(target),'paragraphs':len(final.paragraphs),'tables':len(final.tables),'words':len(text.split()),'template_other_parts_identical':True,'library_terms_remaining':False},ensure_ascii=False))
