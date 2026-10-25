const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing GEMINI_API_KEY:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');

const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  console.log('\n=== TEST 1: LUYỆN PHỎNG VẤN (TẠO CÂU HỎI) ===');
  const qPrompt = `
Bạn là chuyên gia phỏng vấn tuyển dụng. Hãy tạo 2 câu hỏi phỏng vấn cho vị trí "Backend Developer (Node.js)".
Trả về định dạng JSON:
{
  "questions": [
    { "id": 1, "type": "Technical", "question": "Nội dung câu hỏi", "hint": "Gợi ý trả lời" }
  ]
}
Chỉ trả về JSON thuần túy.
`;
  const qRes = await model.generateContent(qPrompt);
  console.log('Phản hồi câu hỏi phỏng vấn:\n', qRes.response.text());

  console.log('\n=== TEST 2: ĐÁNH GIÁ PHỎNG VẤN AI ===');
  const evalPrompt = `
Bạn là giám khảo phỏng vấn. Hãy đánh giá câu trả lời sau:
Câu hỏi: "Node.js xử lý bất đồng bộ như thế nào?"
Câu trả lời: "Node.js dùng Event Loop với kiến trúc non-blocking I/O và libuv để điều phối các tác vụ bất đồng bộ."
Trả về JSON:
{
  "overallScore": 90,
  "summary": "Nhận xét ngắn",
  "strengths": ["Điểm mạnh"]
}
Chỉ trả về JSON thuần túy.
`;
  const evalRes = await model.generateContent(evalPrompt);
  console.log('Phản hồi đánh giá phỏng vấn:\n', evalRes.response.text());

  console.log('\n=== TEST 3: PHÂN TÍCH VÀ TRÍCH XUẤT CV (CV PARSING) ===');
  const cvPrompt = `
Trích xuất thông tin ứng viên từ đoạn văn sau:
"Nguyễn Văn An, Kỹ sư phần mềm. Email: an.nguyen@gmail.com, SĐT: 0987654321. Địa chỉ: Cầu Giấy, Hà Nội.
Kỹ năng: Node.js, Express.js, React.js, Docker, PostgreSQL. 2 năm kinh nghiệm tại FPT Software."
Trả về JSON:
{
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "headline": "...",
  "skills": { "hardSkills": [] }
}
Chỉ trả về JSON thuần túy.
`;
  const cvRes = await model.generateContent(cvPrompt);
  console.log('Phản hồi trích xuất CV:\n', cvRes.response.text());

  console.log('\n>>> KẾT LUẬN: GEMINI API KEY HOẠT ĐỘNG HOÀN HẢO CHO CẢ PHÂN TÍCH CV VÀ LUYỆN PHỎNG VẤN AI!');
}

runTest().catch((err) => {
  console.error('Lỗi kiểm tra Gemini:', err.message);
  process.exit(1);
});
