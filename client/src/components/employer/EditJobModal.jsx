import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Briefcase, 
  X, 
  Save, 
  Layers, 
  DollarSign, 
  MapPin, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Tag
} from 'lucide-react';

export default function EditJobModal({ isOpen, onClose, jobId, onJobUpdated }) {
  const [categories, setCategories] = useState([]);
  const [skillTaxonomy, setSkillTaxonomy] = useState([]);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && jobId) {
      loadData();
    }
  }, [isOpen, jobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const [catRes, skillRes, jobRes] = await Promise.all([
        api.get('/metadata/categories'),
        api.get('/metadata/skills'),
        api.get(`/employer/jobs/${jobId}/detail`)
      ]);

      if (catRes.data.success) setCategories(catRes.data.data);
      if (skillRes.data.success) setSkillTaxonomy(skillRes.data.data);

      if (jobRes.data.success) {
        const job = jobRes.data.data;
        setTitle(job.Title || '');
        setCategoryId(job.CategoryID || '');
        setSalaryRange(job.SalaryRange || '');
        setLocation(job.Location || '');
        setDescription(job.Description || '');
        setRequirements(job.Requirements || '');
        setSelectedSkills(job.skills || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải thông tin tin tuyển dụng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!title.trim() || !description.trim() || !requirements.trim()) {
      setError('Vui lòng điền đầy đủ Tiêu đề, Mô tả và Yêu cầu công việc.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(`/employer/jobs/${jobId}`, {
        title: title.trim(),
        categoryId: categoryId || null,
        salaryRange: salaryRange.trim(),
        location: location.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        skills: selectedSkills
      });

      if (res.data.success) {
        setSuccessMsg('Cập nhật nội dung tin tuyển dụng thành công!');
        if (onJobUpdated) onJobUpdated();
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi khi cập nhật tin tuyển dụng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center border border-blue-100 shadow-xs">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Chỉnh Sửa Tin Tuyển Dụng (UC-E06)
              </h2>
              <p className="text-xs text-gray-500">
                Cập nhật nội dung tuyển dụng, mức lương, quyền lợi và yêu cầu kỹ năng.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Đang tải chi tiết tin tuyển dụng...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tiêu đề vị trí tuyển dụng *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Senior Fullstack Engineer (React / Node.js)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Ngành nghề
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-brand-blue/20 outline-none"
                >
                  <option value="">-- Chọn ngành nghề --</option>
                  {categories.map((c) => (
                    <option key={c.CategoryID} value={c.CategoryID}>
                      {c.CategoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mức lương
                </label>
                <input
                  type="text"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  placeholder="25 - 40 triệu VNĐ"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Địa điểm làm việc
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Hà Nội, TP.HCM..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Mô tả công việc (Job Description) *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-xs leading-relaxed focus:ring-2 focus:ring-brand-blue/20 outline-none"
                placeholder="Mô tả trách nhiệm công việc..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Yêu cầu ứng viên (Requirements) *
              </label>
              <textarea
                rows={4}
                required
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-xs leading-relaxed focus:ring-2 focus:ring-brand-blue/20 outline-none"
                placeholder="Số năm kinh nghiệm, kỹ năng cần thiết..."
              />
            </div>

            {/* Skill Taxonomy tags */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Kỹ năng yêu cầu để đối chiếu hồ sơ
              </label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                {skillTaxonomy.map((skill) => {
                  const isSelected = selectedSkills.some(s => s.skillId === skill.SkillID);
                  const skillItem = selectedSkills.find(s => s.skillId === skill.SkillID);
                  return (
                    <button
                      type="button"
                      key={skill.SkillID}
                      onClick={() => toggleSkill(skill.SkillID)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>{skill.SkillName}</span>
                      {isSelected && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMandatory(skill.SkillID);
                          }}
                          className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase ${
                            skillItem?.isMandatory ? 'bg-amber-400 text-amber-950' : 'bg-blue-800 text-white'
                          }`}
                          title="Bấm để chuyển giữa Bắt buộc (Core) và Tùy chọn"
                        >
                          {skillItem?.isMandatory ? 'Bắt buộc' : 'Ưu tiên'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-dark text-white font-bold text-xs shadow-md shadow-brand-blue/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

