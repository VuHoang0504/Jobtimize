const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = (apiKey && apiKey.trim().length > 10) ? new GoogleGenerativeAI(apiKey.trim()) : null;

// Preferred model list to try in order (Top latest & smartest Gemini models)
const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro'
];

/**
 * Helper to clean and parse JSON response from Gemini
 */
const parseCleanJSON = (text) => {
  if (!text) return null;
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(cleaned);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        console.error('Regex fallback JSON parse failed:', e.message);
      }
    }
    throw new Error('AI trả về định dạng không hợp lệ, vui lòng thử lại.');
  }
};

/**
 * Extract raw text from uploaded file (.pdf, .docx, .doc, .txt)
 */
const extractTextFromFile = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File không tồn tại trên hệ thống');
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    if (typeof pdfParse === 'function') {
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text || '';
    }
    if (pdfParse && pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: dataBuffer });
      try {
        const result = await parser.getText();
        return result.text || '';
      } finally {
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
    }
    if (pdfParse && typeof pdfParse.default === 'function') {
      const pdfData = await pdfParse.default(dataBuffer);
      return pdfData.text || '';
    }
    throw new Error('Không thể đọc file PDF do thiếu module phân tích phù hợp.');
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  }

  throw new Error(`Định dạng ${ext} chưa hỗ trợ đọc nội dung tự động.`);
};

/**
 * Call Gemini with multi-model fallback (supports text prompts, multimodal content arrays, custom API key, and preferred model selection)
 */
const callGeminiWithFallback = async (promptOrParts, customApiKey = null, preferredModel = null) => {
  const activeGenAI = (customApiKey && customApiKey.trim().length > 10)
    ? new GoogleGenerativeAI(customApiKey.trim())
    : genAI;

  if (!activeGenAI) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY hợp lệ. Vui lòng cung cấp API key trong cài đặt hoặc file .env');
  }

  // If a specific model is preferred (e.g. gemini-2.0-pro-exp-02-05 or custom 3.x ID), try it first
  const modelsToTry = preferredModel && preferredModel.trim()
    ? [preferredModel.trim(), ...CANDIDATE_MODELS.filter(m => m !== preferredModel.trim())]
    : CANDIDATE_MODELS;

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = activeGenAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptOrParts);
      const text = result.response.text();
      if (text) {
        return parseCleanJSON(text);
      }
    } catch (err) {
      console.warn(`[Gemini Attempt] Model ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối với Gemini AI Model');
};

/**
 * Extract comprehensive CV data directly from Image using Gemini Multimodal / Vision
 */
const parseCVFromImage = async (filePath, mimeType = 'image/jpeg', skillTaxonomyList = [], customApiKey = null, preferredModel = null) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File hình ảnh không tồn tại trên hệ thống');
  }

  const sampleSkills = skillTaxonomyList.slice(0, 50).map(s => s.SkillName).join(', ');
  const imageBuffer = fs.readFileSync(filePath);
  const base64Data = imageBuffer.toString('base64');

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || 'image/jpeg'
    }
  };

  const prompt = `
Bạn là chuyên gia phân tích và trích xuất hồ sơ ứng viên (Senior AI Resume/CV Parser) hàng đầu.
Hãy quan sát và đọc kỹ toàn bộ nội dung trong hình ảnh CV đính kèm.

Từ điển kỹ năng tham khảo của hệ thống: [${sampleSkills}]

Yêu cầu trích xuất chuẩn mực:
1. Thông tin cá nhân cốt lõi:
   - Họ và tên đầy đủ (viết hoa chuẩn mực).
   - Email liên hệ và Số điện thoại.
   - Khu vực sinh sống: Chỉ lấy Quận/Huyện, Tỉnh/Thành phố (ví dụ: "Cầu Giấy, Hà Nội" hoặc "Quận 1, TP. Hồ Chí Minh").
   - Đường dẫn liên kết: LinkedIn, GitHub, Portfolio cá nhân / Website (nếu có).
2. Tóm tắt bản thân / Mục tiêu nghề nghiệp (Summary/Bio):
   - Đoạn văn ngắn 3-4 câu tóm tắt điểm mạnh, số năm kinh nghiệm nổi bật, giá trị mang lại và định hướng phát triển.
3. Kinh nghiệm làm việc (Work Experience):
   - Sắp xếp theo thứ tự thời gian đảo ngược (mới nhất ở trên cùng).
   - Bao gồm: Tên chức danh, Tên công ty, Thời gian làm việc (Tháng/Năm), Mô tả chi tiết trách nhiệm và thành tựu (kèm con số, % nếu có).
4. Học vấn (Education):
   - Tên trường Đại học/Cao đẳng, Chuyên ngành, Năm tốt nghiệp hoặc khoảng thời gian, Điểm GPA (nếu có).
5. Kỹ năng (Skills):
   - Phân loại rõ ràng: Kỹ năng cứng (Hard skills), Kỹ năng mềm (Soft skills), Ngoại ngữ (Languages kèm trình độ/chứng chỉ).
6. Thông tin bổ sung (Additional Information):
   - Dự án tiêu biểu (Projects: Tên dự án, vai trò, công nghệ, kết quả).
   - Chứng chỉ & Giải thưởng (Certifications & Awards: Tên, đơn vị cấp, năm).
   - Hoạt động ngoại khóa (Activities: Tên hoạt động, vai trò, mô tả).
   - Người tham chiếu (References: Tên, chức vụ, đơn vị, liên hệ).

Trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown chào hỏi thừa) có cấu trúc chính xác sau:
{
  "fullName": "Họ và tên ứng viên",
  "email": "Email của ứng viên",
  "phone": "Số điện thoại",
  "location": "Quận/Huyện, Tỉnh/Thành phố",
  "links": {
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "headline": "Chức danh / Vị trí chuyên môn",
  "bio": "Đoạn văn tóm tắt bản thân / mục tiêu nghề nghiệp (3-4 câu)",
  "skills": {
    "hardSkills": ["Kỹ năng chuyên môn 1", "Kỹ năng chuyên môn 2"],
    "softSkills": ["Kỹ năng mềm 1", "Kỹ năng mềm 2"],
    "languages": [
      { "language": "Tiếng Anh", "level": "IELTS 7.0 / Thành thạo" }
    ]
  },
  "experiences": [
    {
      "company": "Tên công ty",
      "position": "Chức danh",
      "duration": "06/2022 - Hiện tại",
      "description": "Mô tả trách nhiệm chính và thành tựu cụ thể"
    }
  ],
  "educations": [
    {
      "school": "Tên trường",
      "major": "Chuyên ngành",
      "year": "2020 - 2024",
      "gpa": "3.5/4.0"
    }
  ],
  "additionalInfo": {
    "projects": [
      {
        "name": "Tên dự án",
        "role": "Vai trò",
        "technologies": "React, Node.js",
        "description": "Kết quả và mô tả dự án"
      }
    ],
    "certifications": [
      { "name": "Tên chứng chỉ / Giải thưởng", "issuer": "Đơn vị cấp", "year": "2023" }
    ],
    "activities": [
      { "name": "Tên hoạt động / CLB", "role": "Thành viên / Trưởng ban", "description": "Mô tả đóng góp" }
    ],
    "references": [
      { "name": "Họ tên người tham chiếu", "position": "Chức vụ", "company": "Công ty / Trường", "contact": "SĐT hoặc Email" }
    ]
  }
}
`;

  try {
    return await callGeminiWithFallback([prompt, imagePart], customApiKey, preferredModel);
  } catch (err) {
    console.warn('Gemini image CV parse failed, returning fallback:', err.message);
    return {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      links: { linkedin: '', github: '', portfolio: '' },
      headline: 'Chuyên viên / Kỹ sư',
      bio: 'Hồ sơ được trích xuất từ hình ảnh CV.',
      skills: {
        hardSkills: ['Chuyên môn', 'Công nghệ'],
        softSkills: ['Giao tiếp', 'Làm việc nhóm'],
        languages: [{ language: 'Tiếng Việt', level: 'Bản ngữ' }]
      },
      experiences: [],
      educations: [],
      additionalInfo: { projects: [], certifications: [], activities: [], references: [] }
    };
  }
};

/**
 * 1. AI JD Generator (Trợ lý AI hỗ trợ Nhà tuyển dụng viết JD)
 */
const generateJD = async ({ title, categoryName, level, skills, additionalNotes }, customApiKey = null, preferredModel = null) => {
  const prompt = `
Bạn là chuyên gia tư vấn tuyển dụng nhân sự (HR Tech Specialist) chuyên nghiệp.
Nhiệm vụ của bạn là soạn thảo một bản Mô tả Công việc (Job Description - JD) hoàn chỉnh, hấp dẫn và chuẩn mực bằng Tiếng Việt.

Thông tin đầu vào:
- Vị trí / Tiêu đề tuyển dụng: ${title || 'Chưa chỉ định'}
- Ngành nghề / Lĩnh vực: ${categoryName || 'Công nghệ thông tin'}
- Cấp bậc mong muốn: ${level || 'Mọi cấp bậc (Fresher/Junior/Middle/Senior)'}
- Kỹ năng trọng tâm / Công nghệ: ${skills || 'Theo vị trí'}
- Yêu cầu hoặc ghi chú bổ sung: ${additionalNotes || 'Không có'}

Hãy trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm bất kỳ văn bản chào hỏi nào ngoài JSON) có đúng cấu trúc sau:
{
  "description": "Nêu mục tiêu vị trí, các nhiệm vụ và trách nhiệm chính hàng ngày (dạng gạch đầu dòng rõ ràng, mạch lạc)...",
  "requirements": "Yêu cầu về kinh nghiệm, kỹ năng chuyên môn, kỹ năng mềm, bằng cấp/ngoại ngữ...",
  "benefits": "Các chế độ đãi ngộ, lương thưởng, bảo hiểm, môi trường làm việc, cơ hội thăng tiến...",
  "suggestedSkills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3", "Kỹ năng 4", "Kỹ năng 5"],
  "suggestedSalaryRange": "Ví dụ: 15 - 25 triệu VNĐ (hoặc Thỏa thuận)"
}
`;

  try {
    return await callGeminiWithFallback(prompt, customApiKey, preferredModel);
  } catch (err) {
    console.warn('Gemini JD call failed, using intelligent fallback generator:', err.message);
    return {
      description: `- Tham gia nghiên cứu, thiết kế và phát triển các tính năng cho sản phẩm tại vị trí ${title}.\n- Phối hợp chặt chẽ với các thành viên trong nhóm (Product Owner, UI/UX Designer, QA) theo quy trình Agile/Scrum.\n- Tối ưu hóa hiệu năng, độ tin cậy và khả năng mở rộng của hệ thống.\n- Viết mã nguồn sạch, dễ bảo trì và tham gia review code của các đồng nghiệp.`,
      requirements: `- Có từ 1-3 năm kinh nghiệm làm việc thực tế ở vị trí tương đương (${title}).\n- Thành thạo các công nghệ: ${skills || 'JavaScript, SQL, Git, RESTful API'}.\n- Khả năng tư duy logic, giải quyết vấn đề tốt và chủ động trong công việc.\n- Kỹ năng giao tiếp và làm việc nhóm hiệu quả.`,
      benefits: `- Mức thu nhập cạnh tranh, đánh giá tăng lương định kỳ.\n- Thưởng tháng 13, thưởng hiệu quả dự án và các dịp lễ tết.\n- Đầy đủ chế độ BHXH, BHYT theo Luật Lao động và gói bảo hiểm sức khỏe cao cấp.\n- Môi trường làm việc trẻ trung, năng động, hỗ trợ thiết bị làm việc hiện đại.`,
      suggestedSkills: (skills ? skills.split(',').map(s => s.trim()) : ['JavaScript', 'React', 'Node.js', 'SQL Server', 'Git']),
      suggestedSalaryRange: '15 - 30 triệu VNĐ'
    };
  }
};

/**
 * 2. AI CV Parser & Comprehensive Skill Extraction
 */
const parseCVWithAI = async (rawText, skillTaxonomyList = [], customApiKey = null, preferredModel = null) => {
  const sampleSkills = skillTaxonomyList.slice(0, 50).map(s => s.SkillName).join(', ');

  const prompt = `
Bạn là chuyên gia phân tích và trích xuất hồ sơ ứng viên (Senior AI Resume/CV Parser) chuẩn xác.
Dưới đây là nội dung văn bản trích xuất từ file CV của ứng viên:
"""
${rawText.slice(0, 12000)}
"""

Từ điển kỹ năng tham khảo của hệ thống: [${sampleSkills}]

Yêu cầu trích xuất chi tiết & chuẩn mực:
1. Thông tin cá nhân (Contact Information):
   - Họ và tên đầy đủ (viết to, rõ ràng, viết hoa chuẩn mực).
   - Số điện thoại, Email liên hệ.
   - Khu vực sinh sống: Chỉ lấy Quận/Huyện, Tỉnh/Thành phố (ví dụ: "Cầu Giấy, Hà Nội" hoặc "Quận 1, TP. Hồ Chí Minh").
   - Đường dẫn liên kết: LinkedIn, GitHub, Portfolio cá nhân / Website (nếu có).
2. Tóm tắt bản thân / Mục tiêu nghề nghiệp (Summary / Objective):
   - Đoạn văn ngắn 3-4 câu tóm tắt điểm mạnh, số năm kinh nghiệm, giá trị mang lại và định hướng nghề nghiệp.
3. Kinh nghiệm làm việc (Work Experience):
   - Sắp xếp theo thứ tự thời gian đảo ngược (mới nhất ở trên cùng).
   - Mỗi mốc gồm: Tên chức danh, Tên công ty, Thời gian làm việc (Tháng/Năm), Mô tả trách nhiệm chính và thành tựu đo lường được.
4. Học vấn (Education):
   - Tên trường Đại học/Cao đẳng, Chuyên ngành, Năm tốt nghiệp hoặc khoảng thời gian, Điểm GPA (nếu có).
5. Kỹ năng (Skills):
   - Phân loại rõ ràng:
     + Hard skills: Công cụ, phần mềm chuyên ngành, ngôn ngữ lập trình, kiến thức nghiệp vụ.
     + Soft skills: Quản lý thời gian, thuyết trình, giải quyết vấn đề, làm việc nhóm.
     + Languages: Ngoại ngữ và mức độ thành thạo/chứng chỉ (ví dụ: "Tiếng Anh - IELTS 7.0").
6. Thông tin bổ sung (Additional Information):
   - Dự án tiêu biểu (Projects: Tên, vai trò, công nghệ, kết quả).
   - Chứng chỉ & Giải thưởng (Certifications & Awards: Tên, đơn vị cấp, năm).
   - Hoạt động ngoại khóa (Activities: Tên hoạt động, vai trò, mô tả).
   - Người tham chiếu (References: Tên, chức vụ, đơn vị, liên hệ).

Trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown chào hỏi ngoài JSON) có đúng cấu trúc:
{
  "fullName": "Họ và tên ứng viên",
  "email": "Email của ứng viên",
  "phone": "Số điện thoại",
  "location": "Quận/Huyện, Tỉnh/Thành phố",
  "links": {
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "headline": "Chức danh / Vị trí chuyên môn",
  "bio": "Đoạn văn tóm tắt bản thân / mục tiêu nghề nghiệp (3-4 câu)",
  "skills": {
    "hardSkills": ["Kỹ năng chuyên môn 1", "Kỹ năng chuyên môn 2"],
    "softSkills": ["Kỹ năng mềm 1", "Kỹ năng mềm 2"],
    "languages": [
      { "language": "Tiếng Anh", "level": "IELTS 7.0 / Thành thạo" }
    ]
  },
  "experiences": [
    {
      "company": "Tên công ty",
      "position": "Chức danh",
      "duration": "06/2022 - Hiện tại",
      "description": "Mô tả trách nhiệm chính và thành tựu"
    }
  ],
  "educations": [
    {
      "school": "Tên trường Đại học/Cao đẳng",
      "major": "Chuyên ngành",
      "year": "2020 - 2024",
      "gpa": "3.5/4.0"
    }
  ],
  "additionalInfo": {
    "projects": [
      {
        "name": "Tên dự án",
        "role": "Vai trò",
        "technologies": "React, Node.js",
        "description": "Kết quả và mô tả dự án"
      }
    ],
    "certifications": [
      { "name": "Tên chứng chỉ / Giải thưởng", "issuer": "Đơn vị cấp", "year": "2023" }
    ],
    "activities": [
      { "name": "Tên hoạt động / CLB", "role": "Vai trò", "description": "Mô tả" }
    ],
    "references": [
      { "name": "Họ tên người tham chiếu", "position": "Chức danh", "company": "Công ty", "contact": "SĐT/Email" }
    ]
  }
}
`;

  try {
    return await callGeminiWithFallback(prompt, customApiKey, preferredModel);
  } catch (err) {
    console.warn('Gemini CV parse failed, using heuristic fallback extractor:', err.message);
    
    // Heuristic extraction
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawText.match(/(0|\+84)[0-9]{8,10}/);
    
    const matchedSkills = [];
    skillTaxonomyList.forEach(s => {
      const sName = s.SkillName.toLowerCase();
      if (rawText.toLowerCase().includes(sName)) {
        matchedSkills.push(s.SkillName);
      }
    });

    return {
      fullName: '',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: '',
      links: { linkedin: '', github: '', portfolio: '' },
      headline: 'Chuyên viên Công nghệ / Kỹ sư phần mềm',
      bio: rawText.slice(0, 350).replace(/\s+/g, ' ').trim() || 'Ứng viên đam mê công nghệ và mong muốn đóng góp giá trị cho doanh nghiệp.',
      skills: {
        hardSkills: matchedSkills.length > 0 ? matchedSkills.slice(0, 8) : ['JavaScript', 'SQL Server', 'Git'],
        softSkills: ['Giao tiếp', 'Làm việc nhóm', 'Giải quyết vấn đề'],
        languages: [{ language: 'Tiếng Việt', level: 'Bản ngữ' }]
      },
      experiences: [],
      educations: [],
      additionalInfo: { projects: [], certifications: [], activities: [], references: [] }
    };
  }
};

/**
 * 3. AI Mock Interview - Step 1: Generate Questions
 */
const generateInterviewQuestions = async ({ jobTitle, requirements, level = 'Middle', numberOfQuestions = 4 }) => {
  const prompt = `
Bạn là Trưởng ban Phỏng vấn (Tech Lead & Senior HR Manager).
Hãy tạo bộ câu hỏi phỏng vấn thực tế bằng Tiếng Việt cho ứng viên ứng tuyển vị trí:
- Vị trí: ${jobTitle}
- Cấp bậc: ${level}
- Yêu cầu công việc / Kỹ năng liên quan: ${requirements || 'Tiêu chuẩn ngành'}
- Số lượng câu hỏi: ${numberOfQuestions} câu

Bộ câu hỏi cần bao gồm:
1. Câu hỏi kỹ thuật / chuyên môn (Technical / Hard Skills)
2. Câu hỏi tình huống / hành vi thực tế (Behavioral / Problem-solving theo mô hình STAR)

Hãy trả về DUY NHẤT một chuỗi JSON thuần túy với cấu trúc:
{
  "jobTitle": "${jobTitle}",
  "questions": [
    {
      "id": 1,
      "type": "Technical",
      "question": "Nội dung câu hỏi số 1...",
      "hint": "Gợi ý những điểm chính mà ứng viên nên tập trung khi trả lời..."
    },
    {
      "id": 2,
      "type": "Behavioral",
      "question": "Nội dung câu hỏi số 2...",
      "hint": "Gợi ý..."
    }
  ]
}
`;

  try {
    return await callGeminiWithFallback(prompt);
  } catch (err) {
    console.warn('Gemini question generator failed, using smart interview pool fallback:', err.message);
    
    // Dynamic realistic question generator
    const defaultPool = [
      {
        id: 1,
        type: 'Technical',
        question: `Bạn hãy giới thiệu về kiến trúc tổng quan và luồng xử lý dữ liệu trong một dự án liên quan đến ${jobTitle} mà bạn từng tham gia gần đây nhất?`,
        hint: 'Trình bày rõ các tầng kiến trúc (Frontend, Backend API, Database), các công nghệ chủ chốt và cách bạn tổ chức mã nguồn.'
      },
      {
        id: 2,
        type: 'Technical',
        question: `Khi gặp sự cố hiệu năng (bottleneck) hoặc lỗi nghiêm trọng trong môi trường Production cho vị trí ${jobTitle}, quy trình bạn dùng để debug, định vị và giải quyết vấn đề là gì?`,
        hint: 'Nêu các bước kiểm tra log, phân tích thời gian phản hồi, tối ưu query CSDL hoặc caching.'
      },
      {
        id: 3,
        type: 'Behavioral',
        question: `Hãy kể về một lần bạn và đồng nghiệp (hoặc cấp trên) có quan điểm bất đồng về giải pháp kỹ thuật. Bạn đã xử lý tình huống đó như thế nào để đi đến thống nhất chung?`,
        hint: 'Áp dụng mô hình STAR: Nêu bối cảnh (Situation), nhiệm vụ (Task), cách bạn lắng nghe và trao đổi (Action), và kết quả dự án (Result).'
      },
      {
        id: 4,
        type: 'Behavioral',
        question: `Khi phải đối mặt với deadline gấp hoặc yêu cầu sản phẩm thay đổi liên tục, bạn sắp xếp thứ tự ưu tiên các công việc và quản lý thời gian như thế nào?`,
        hint: 'Tập trung vào kỹ năng phân bổ mức độ khẩn cấp/quan trọng và khả năng giao tiếp minh bạch với team.'
      },
      {
        id: 5,
        type: 'Technical',
        question: `Để đảm bảo tính bảo mật và an toàn dữ liệu cho hệ thống ở vị trí ${jobTitle}, bạn thường áp dụng những nguyên tắc hoặc giải pháp kỹ thuật nào?`,
        hint: 'Đề cập đến xác thực token/JWT, mã hóa mật khẩu, kiểm tra quyền hạn (Role-based access) và chống các lỗ hổng như SQL Injection/XSS.'
      }
    ];

    return {
      jobTitle: jobTitle,
      questions: defaultPool.slice(0, numberOfQuestions)
    };
  }
};

/**
 * 3. AI Mock Interview - Step 2: Evaluate Answers
 */
const evaluateInterview = async ({ jobTitle, qaList }) => {
  const qaContent = qaList.map((item, index) => `
Câu hỏi ${index + 1} (${item.type || 'Chung'}): "${item.question}"
Câu trả lời của ứng viên: "${item.answer || '(Ứng viên bỏ trống câu trả lời)'}"
`).join('\n---\n');

  const prompt = `
Bạn là Chuyên gia Đánh giá Phỏng vấn cấp cao. Hãy chấm điểm và đưa ra nhận xét chi tiết, công tâm, mang tính xây dựng cho buổi phỏng vấn thử vị trí "${jobTitle}".

Dưới đây là danh sách câu hỏi và câu trả lời của ứng viên:
${qaContent}

Hãy phân tích và trả về DUY NHẤT một chuỗi JSON thuần túy với cấu trúc:
{
  "overallScore": 85,
  "summary": "Nhận xét tổng quan và ấn tượng chung về buổi phỏng vấn của ứng viên...",
  "strengths": [
    "Điểm mạnh 1 nổi bật",
    "Điểm mạnh 2..."
  ],
  "weaknesses": [
    "Điểm cần cải thiện 1",
    "Điểm cần cải thiện 2..."
  ],
  "detailedFeedback": [
    {
      "questionId": 1,
      "question": "Câu hỏi...",
      "score": 80,
      "candidateAnswer": "Câu trả lời...",
      "comment": "Nhận xét chi tiết cho câu trả lời này...",
      "suggestedAnswer": "Gợi ý câu trả lời mẫu chuẩn mực theo phương pháp STAR..."
    }
  ],
  "improvementTips": [
    "Lời khuyên cải thiện kỹ năng giao tiếp...",
    "Khóa học hoặc kiến thức nên bổ sung..."
  ]
}
`;

  try {
    return await callGeminiWithFallback(prompt);
  } catch (err) {
    console.warn('Gemini evaluation failed, using intelligent grading fallback:', err.message);

    // Calculate score based on answers length and presence
    let totalScore = 0;
    const detailedFeedback = qaList.map((q, idx) => {
      const ans = (q.answer || '').trim();
      let qScore = 50;
      let comment = 'Câu trả lời còn khá ngắn gọn, nên bổ sung thêm các ví dụ thực tế và số liệu chứng minh.';

      if (!ans) {
        qScore = 20;
        comment = 'Bạn chưa đưa ra câu trả lời cho câu hỏi này. Hãy thử liên hệ với các dự án hoặc kiến thức đã học.';
      } else if (ans.length > 150) {
        qScore = 85;
        comment = 'Câu trả lời tương đối chi tiết, thể hiện được tư duy logic và kinh nghiệm thực tiễn.';
      } else if (ans.length > 50) {
        qScore = 70;
        comment = 'Bạn đã nắm được ý chính, nếu bổ sung rõ hơn về kết quả đạt được (mô hình STAR) thì câu trả lời sẽ thuyết phục hơn.';
      }

      totalScore += qScore;

      return {
        questionId: q.id || idx + 1,
        question: q.question,
        score: qScore,
        candidateAnswer: ans || '(Chưa có câu trả lời)',
        comment: comment,
        suggestedAnswer: `Để trả lời xuất sắc câu hỏi này cho vị trí ${jobTitle}, bạn nên nêu rõ:\n1. Tình huống (Situation): Bối cảnh cụ thể mà bạn từng gặp.\n2. Nhiệm vụ (Task): Trách nhiệm và thách thức bạn phải đảm nhận.\n3. Hành động (Action): Các bước kỹ thuật, giải pháp cụ thể mà bạn đã triển khai.\n4. Kết quả (Result): Tác động tích cực và bài học rút ra.`
      };
    });

    const overallScore = Math.round(totalScore / (qaList.length || 1));

    return {
      overallScore: overallScore,
      summary: `Buổi phỏng vấn thử cho vị trí "${jobTitle}" đạt ${overallScore}/100 điểm. Bạn thể hiện được tinh thần cầu tiến và kiến thức nền tảng tốt. Cần rèn luyện thêm cách diễn đạt có cấu trúc (STAR) để tạo ấn tượng mạnh mẽ hơn với nhà tuyển dụng.`,
      strengths: [
        'Nắm bắt đúng trọng tâm của các câu hỏi phỏng vấn.',
        'Có thái độ tự tin, cầu thị và phản hồi kịp thời.',
        'Thể hiện được kiến thức nền tảng về vị trí ứng tuyển.'
      ],
      weaknesses: [
        'Cần làm rõ hơn các số liệu hoặc kết quả đo lường được (Metrics).',
        'Một số câu trả lời kỹ thuật nên đi sâu hơn vào giải pháp xử lý tình huống thực tế.'
      ],
      detailedFeedback: detailedFeedback,
      improvementTips: [
        'Luyện tập trả lời theo phương pháp STAR (Situation - Task - Action - Result).',
        'Xem lại các câu hỏi phỏng vấn kỹ thuật cốt lõi trước mỗi buổi phỏng vấn thực tế.'
      ]
    };
  }
};

module.exports = {
  extractTextFromFile,
  generateJD,
  parseCVWithAI,
  parseCVFromImage,
  generateInterviewQuestions,
  evaluateInterview
};
