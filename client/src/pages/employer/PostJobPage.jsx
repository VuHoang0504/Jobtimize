import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { PlusCircle, ArrowLeft, CheckCircle2, Sparkles, Layers, DollarSign, MapPin } from 'lucide-react';

export default function PostJobPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [skillTaxonomy, setSkillTaxonomy] = useState([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  
  // Selected Skills: Array of { skillId, isMandatory }
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AI JD Generator states
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiLevel, setAiLevel] = useState('Middle');
  const [aiNote, setAiNote] = useState('');
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');
  const [showAiBox, setShowAiBox] = useState(false);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, skillRes] = await Promise.all([
          api.get('/metadata/categories'),
          api.get('/metadata/skills')
        ]);
        if (catRes.data.success) {
          setCategories(catRes.data.data);
          if (catRes.data.data.length > 0) setCategoryId(catRes.data.data[0].CategoryID);
        }
        if (skillRes.data.success) setSkillTaxonomy(skillRes.data.data);
      } catch (err) {
        console.error('Fetch metadata error:', err);
      }
    };
    fetchMeta();
  }, []);

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev => {
      const exists = prev.find(s => s.skillId === skillId);
      if (exists) {
        return prev.filter(s => s.skillId !== skillId);
      } else {
        return [...prev, { skillId, isMandatory: true }];
      }
    });
  };

  const toggleMandatory = (skillId) => {
    setSelectedSkills(prev => prev.map(s => {
      if (s.skillId === skillId) {
        return { ...s, isMandatory: !s.isMandatory };
      }
      return s;
    }));
  };

  const handleGenerateJDWithAI = async () => {
    if (!title.trim()) {
      setError('Vui lòng nhập Tiêu đề vị trí công việc trước khi nhờ AI viết JD.');
      return;
    }

    setError('');
    setAiSuccessMsg('');
    setIsAiGenerating(true);

    try {
      const selectedCategoryObj = categories.find(c => String(c.CategoryID) === String(categoryId));
      const res = await api.post('/ai/generate-jd', {
        title,
        categoryName: selectedCategoryObj?.CategoryName || '',
        level: aiLevel,
        skills: selectedSkills.map(s => skillTaxonomy.find(t => t.SkillID === s.skillId)?.SkillName).filter(Boolean).join(', '),
        additionalNotes: aiNote
      });

      if (res.data.success && res.data.data) {
        const aiData = res.data.data;
        if (aiData.description) setDescription(aiData.description);
        if (aiData.requirements) setRequirements(aiData.requirements);
        if (aiData.suggestedSalaryRange && !salaryRange) setSalaryRange(aiData.suggestedSalaryRange);

        // Auto match suggested skills
        if (Array.isArray(aiData.suggestedSkills) && aiData.suggestedSkills.length > 0) {
          const matchedSkills = [];
          const lowerSuggested = aiData.suggestedSkills.map(s => s.toLowerCase());

          skillTaxonomy.forEach(st => {
            const sName = st.SkillName.toLowerCase();
            const sNorm = (st.NormalizedName || '').toLowerCase();
            if (lowerSuggested.some(ls => ls.includes(sName) || sName.includes(ls) || (sNorm && ls.includes(sNorm)))) {
              matchedSkills.push({ skillId: st.SkillID, isMandatory: true });
            }
          });

          if (matchedSkills.length > 0) {
            setSelectedSkills(prev => {
              const combined = [...prev];
              matchedSkills.forEach(ms => {
                if (!combined.some(c => c.skillId === ms.skillId)) {
                  combined.push(ms);
                }
              });
              return combined;
            });
          }
        }

        setAiSuccessMsg('✨ AI Gemini đã hoàn thiện bản mô tả công việc (JD), yêu cầu và gợi ý kỹ năng thành công!');
        setShowAiBox(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi khi AI soạn thảo JD. Vui lòng thử lại.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !description || !requirements) {
      setError('Vui lòng điền đầy đủ tiêu đề, mô tả và yêu cầu công việc');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/employer/jobs', {
        title,
        categoryId,
        salaryRange,
        location,
        description,
        requirements,
        skills: selectedSkills
      });

      if (res.data.success) {
        navigate('/employer/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng tin thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back button */}
      <div>
        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-green transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại Bảng điều khiển tuyển dụng
        </Link>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-card space-y-8">
        
        {/* Title */}
        <div className="border-b border-gray-100 pb-5">
          <div className="flex items-center gap-2 text-brand-green">
            <PlusCircle className="w-6 h-6" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Đăng Tin Tuyển Dụng Mới (UC-E05)
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Gắn thẻ kỹ năng chuẩn xác để thuật toán AI tự động xếp hạng Match Score các ứng viên tiềm năng nhất.
          </p>
        </div>

        {/* AI Assistant Banner */}
        <div className="bg-linear-to-r from-purple-50 to-blue-50 border border-purple-200/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  Trợ lý AI viết JD tự động
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                    Gemini AI
                  </span>
                </h3>
                <p className="text-xs text-gray-500">
                  Nhập tiêu đề vị trí và để AI tự động soạn thảo Mô tả, Yêu cầu và Gợi ý Kỹ năng chuẩn mực trong 3 giây.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAiBox(!showAiBox)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              {showAiBox ? 'Thu gọn trợ lý' : 'Mở Trợ lý AI'}
            </button>
          </div>

          {showAiBox && (
            <div className="pt-4 border-t border-purple-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Cấp bậc ứng viên</label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="Intern / Thực tập sinh">Intern / Thực tập sinh</option>
                  <option value="Fresher / Mới tốt nghiệp">Fresher / Mới tốt nghiệp</option>
                  <option value="Junior (1 - 2 năm)">Junior (1 - 2 năm)</option>
                  <option value="Middle (2 - 4 năm)">Middle (2 - 4 năm)</option>
                  <option value="Senior (5+ năm)">Senior (5+ năm)</option>
                  <option value="Tech Lead / Manager">Tech Lead / Manager</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Ghi chú thêm cho AI (Tùy chọn)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiNote}
                    onChange={(e) => setAiNote(e.target.value)}
                    placeholder="Ví dụ: Ưu tiên ứng viên biết Next.js, làm việc hybrid..."
                    className="flex-1 p-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={handleGenerateJDWithAI}
                    className="px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {isAiGenerating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang viết JD...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tạo JD ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {aiSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{aiSuccessMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Job Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tiêu đề vị trí công việc *
              </label>
              {!showAiBox && (
                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={handleGenerateJDWithAI}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAiGenerating ? 'AI đang tạo...' : 'Tạo nhanh bằng AI'}
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Senior Fullstack Developer (React.js / Node.js)"
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Ngành nghề (Category)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.CategoryID} value={cat.CategoryID}>
                    {cat.CategoryName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Địa điểm làm việc
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Hà Nội / TP.HCM / Remote"
                className="w-full p-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
              />
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Mức lương hiển thị
            </label>
            <input
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="Ví dụ: 25 - 40 Triệu hoặc Thỏa thuận"
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>

          {/* Skill Tagging with AI Matching (JobSkillRequirements) */}
          <div className="space-y-3 p-5 rounded-2xl bg-gray-50 border border-gray-200/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-purple" />
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Gắn thẻ Kỹ năng yêu cầu cho AI chấm điểm Match Score
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Nhấn vào kỹ năng để chọn/bỏ chọn. Đánh dấu kỹ năng cốt lõi (Bắt buộc) để AI nâng trọng số chấm điểm.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {skillTaxonomy.map((skill) => {
                const selected = selectedSkills.find(s => s.skillId === skill.SkillID);
                return (
                  <div
                    key={skill.SkillID}
                    className={`inline-flex items-center rounded-xl border text-xs font-bold transition-all overflow-hidden ${
                      selected
                        ? 'bg-brand-light border-brand-blue text-brand-blue shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.SkillID)}
                      className="px-3 py-1.5"
                    >
                      {selected ? '✓ ' : '+ '}{skill.SkillName}
                    </button>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => toggleMandatory(skill.SkillID)}
                        className={`px-2 py-1.5 text-[10px] border-l border-brand-blue/30 ${
                          selected.isMandatory ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                        title="Bấm để đổi Bắt buộc / Ưu tiên"
                      >
                        {selected.isMandatory ? 'Bắt buộc' : 'Ưu tiên'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Mô tả chi tiết công việc (Job Description) *
            </label>
            <textarea
              rows={6}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="- Tham gia phát triển hệ thống sản phẩm...&#10;- Phối hợp với Product Owner và Designer...&#10;- Tối ưu hiệu năng và trải nghiệm người dùng..."
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Yêu cầu ứng viên (Requirements) *
            </label>
            <textarea
              rows={6}
              required
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="- Tối thiểu 2 năm kinh nghiệm với React.js, JavaScript/TypeScript...&#10;- Thành thạo RESTful API, SQL Server hoặc MongoDB...&#10;- Kỹ năng làm việc nhóm Agile/Scrum..."
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-4 border-t border-gray-100">
            <Link
              to="/employer/dashboard"
              className="px-5 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Hủy bỏ
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 rounded-2xl bg-brand-green hover:bg-brand-greenDark text-white font-bold text-sm shadow-md shadow-brand-green/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Đang tạo tin...' : 'Đăng tin tuyển dụng ngay'}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
