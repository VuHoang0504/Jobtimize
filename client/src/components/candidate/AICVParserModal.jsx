import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Layers, 
  FolderGit2, 
  Users, 
  BookOpen
} from 'lucide-react';
import api from '../../services/api';

export default function AICVParserModal({ isOpen, onClose, onApplyExtractedData }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [activeAdditionalTab, setActiveAdditionalTab] = useState('projects');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setExtractedData(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError('Vui lòng chọn file CV (PDF, DOCX, DOC, ảnh PNG/JPG/WEBP hoặc TXT)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('cvFile', file);

      const res = await api.post('/ai/parse-cv', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success && res.data.data) {
        setExtractedData(res.data.data);
      } else {
        setError(res.data.message || 'Không thể trích xuất thông tin từ CV');
      }
    } catch (err) {
      console.error('Parse CV error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi phân tích CV. Vui lòng thử lại.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (extractedData && onApplyExtractedData) {
      onApplyExtractedData(extractedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Trợ lý AI Trích xuất Hồ sơ từ CV
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-gray-500">Tự động đọc nội dung CV và điền đầy đủ thông tin chuẩn vào hồ sơ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-700">

          {!extractedData ? (
            <div className="space-y-5">
              {/* File upload zone */}
              <div className="border-2 border-dashed border-purple-200 rounded-3xl p-8 text-center hover:border-purple-400 bg-purple-50/20 transition-all">
                <input
                  type="file"
                  id="ai-cv-file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="ai-cv-file" className="cursor-pointer flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-white text-purple-600 shadow-md flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    {file ? file.name : 'Nhấn để chọn file CV từ máy tính'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ PDF, Word, Ảnh (PNG, JPG, WEBP) & Text (Tối đa 10MB)</p>
                </label>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Supported File Formats Info */}
              <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100/80 space-y-2.5 text-xs text-gray-700">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Các định dạng file được website hỗ trợ:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-purple-100/60 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                    <div>
                      <p className="font-bold text-gray-800 text-[11px]">Tài liệu văn bản</p>
                      <p className="text-[11px] text-gray-500">PDF (.pdf), Word (.docx, .doc), Text (.txt)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-purple-100/60 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                    <div>
                      <p className="font-bold text-gray-800 text-[11px]">Hình ảnh CV / Thiết kế</p>
                      <p className="text-[11px] text-gray-500">PNG, JPG, JPEG, WEBP (Canva, ảnh chụp)</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 italic">⚡ Dung lượng tối đa: 10MB / file. Gemini AI hỗ trợ nhận diện trực quan đa phương thức.</p>
              </div>
            </div>
          ) : (
            /* Extracted Data Full Comprehensive Preview */
            <div className="space-y-6 animate-in fade-in duration-200 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>AI đã phân tích và cấu trúc hóa CV thành công! Vui lòng kiểm tra các trường thông tin:</span>
              </div>

              {/* 1. Contact Information Header */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/70 pb-3">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      {extractedData.fullName || 'Chưa nhận diện họ tên'}
                    </h2>
                    <p className="text-xs font-bold text-brand-blue mt-0.5">
                      {extractedData.headline || 'Chuyên viên / Kỹ sư'}
                    </p>
                  </div>
                  {extractedData.location && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs self-start sm:self-auto">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      {extractedData.location}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200/80">
                    <Mail className="w-4 h-4 text-brand-blue shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
                      <p className="font-semibold text-gray-800 truncate">{extractedData.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200/80">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Số điện thoại</p>
                      <p className="font-semibold text-gray-800 truncate">{extractedData.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200/80">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Khu vực sinh sống</p>
                      <p className="font-semibold text-gray-800 truncate">{extractedData.location || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Social / Portfolio Links */}
                {extractedData.links && (extractedData.links.linkedin || extractedData.links.github || extractedData.links.portfolio) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {extractedData.links.linkedin && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn: {extractedData.links.linkedin}
                      </span>
                    )}
                    {extractedData.links.github && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-800 border border-gray-200 text-[11px] font-semibold">
                        <Github className="w-3.5 h-3.5" /> GitHub: {extractedData.links.github}
                      </span>
                    )}
                    {extractedData.links.portfolio && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        <Globe className="w-3.5 h-3.5" /> Portfolio: {extractedData.links.portfolio}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Professional Summary / Objective */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-blue" />
                  Tóm tắt bản thân & Mục tiêu nghề nghiệp
                </h4>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-700 leading-relaxed whitespace-pre-line">
                  {extractedData.bio || 'Chưa có thông tin tóm tắt.'}
                </div>
              </div>

              {/* 3. Skills Categorized */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" />
                  Kỹ năng chuyên môn & Kỹ năng mềm
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Hard skills */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                    <p className="font-bold text-purple-900 text-[11px]">Kỹ năng cứng (Hard Skills):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(extractedData.skills?.hardSkills) ? extractedData.skills.hardSkills : (Array.isArray(extractedData.skills) ? extractedData.skills : [])).map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-white text-purple-800 border border-purple-200 text-[11px] font-semibold shadow-2xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Soft skills & Languages */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                    <p className="font-bold text-indigo-900 text-[11px]">Kỹ năng mềm & Ngoại ngữ:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedData.skills?.softSkills?.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-white text-indigo-800 border border-indigo-200 text-[11px] font-semibold shadow-2xs">
                          {s}
                        </span>
                      ))}
                      {extractedData.skills?.languages?.map((lang, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shadow-2xs">
                          🌐 {typeof lang === 'object' ? `${lang.language} (${lang.level})` : lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Work Experience */}
              {extractedData.experiences && extractedData.experiences.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-brand-blue" />
                    Kinh nghiệm làm việc ({extractedData.experiences.length})
                  </h4>
                  <div className="space-y-2.5">
                    {extractedData.experiences.map((exp, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                        <div className="flex flex-wrap justify-between items-start font-bold text-gray-900">
                          <span className="text-brand-blue">{exp.position}</span>
                          <span className="text-[11px] text-gray-500 font-medium bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-700 text-[11px]">{exp.company}</p>
                        {exp.description && <p className="text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Education */}
              {extractedData.educations && extractedData.educations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    Học vấn & Bằng cấp
                  </h4>
                  <div className="space-y-2.5">
                    {extractedData.educations.map((edu, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                        <div className="flex flex-wrap justify-between items-start font-bold text-gray-900">
                          <span className="text-emerald-700">{edu.school}</span>
                          <span className="text-[11px] text-gray-500 font-medium bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                            {edu.year}
                          </span>
                        </div>
                        {edu.major && <p className="text-gray-700 font-medium">Chuyên ngành: {edu.major}</p>}
                        {edu.gpa && <p className="text-emerald-600 font-bold text-[11px]">GPA: {edu.gpa}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Additional Information (Gộp 1 phần với Tabs) */}
              {extractedData.additionalInfo && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                    <Layers className="w-4 h-4 text-brand-purple" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase">Thông tin bổ sung</h4>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveAdditionalTab('projects')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeAdditionalTab === 'projects' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>Dự án ({extractedData.additionalInfo.projects?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdditionalTab('certifications')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeAdditionalTab === 'certifications' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Chứng chỉ & Giải thưởng ({extractedData.additionalInfo.certifications?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdditionalTab('activities')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeAdditionalTab === 'activities' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Hoạt động ({extractedData.additionalInfo.activities?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdditionalTab('references')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeAdditionalTab === 'references' ? 'bg-brand-blue text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Người tham chiếu ({extractedData.additionalInfo.references?.length || 0})</span>
                    </button>
                  </div>

                  {/* Tab Panel */}
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                    {activeAdditionalTab === 'projects' && (
                      <div className="space-y-2">
                        {extractedData.additionalInfo.projects?.length > 0 ? (
                          extractedData.additionalInfo.projects.map((proj, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
                              <p className="font-bold text-gray-900">{proj.name} {proj.role ? <span className="text-gray-500 font-normal">({proj.role})</span> : null}</p>
                              {proj.technologies && <p className="text-[11px] text-purple-700 font-medium">Công nghệ: {proj.technologies}</p>}
                              {proj.description && <p className="text-gray-600 leading-relaxed whitespace-pre-line">{proj.description}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 italic">Không tìm thấy thông tin dự án trong CV.</p>
                        )}
                      </div>
                    )}

                    {activeAdditionalTab === 'certifications' && (
                      <div className="space-y-2">
                        {extractedData.additionalInfo.certifications?.length > 0 ? (
                          extractedData.additionalInfo.certifications.map((cert, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-white border border-gray-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-800">{cert.name}</p>
                                {cert.issuer && <p className="text-[11px] text-gray-500">Cấp bởi: {cert.issuer}</p>}
                              </div>
                              {cert.year && <span className="text-[11px] font-semibold text-gray-400">{cert.year}</span>}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 italic">Không tìm thấy chứng chỉ hoặc giải thưởng trong CV.</p>
                        )}
                      </div>
                    )}

                    {activeAdditionalTab === 'activities' && (
                      <div className="space-y-2">
                        {extractedData.additionalInfo.activities?.length > 0 ? (
                          extractedData.additionalInfo.activities.map((act, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
                              <p className="font-bold text-gray-800">{act.name} {act.role ? <span className="text-gray-500 font-normal">({act.role})</span> : null}</p>
                              {act.description && <p className="text-gray-600 leading-relaxed">{act.description}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 italic">Không tìm thấy hoạt động ngoại khóa trong CV.</p>
                        )}
                      </div>
                    )}

                    {activeAdditionalTab === 'references' && (
                      <div className="space-y-2">
                        {extractedData.additionalInfo.references?.length > 0 ? (
                          extractedData.additionalInfo.references.map((ref, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 flex justify-between items-start">
                              <div>
                                <p className="font-bold text-gray-800">{ref.name}</p>
                                <p className="text-[11px] text-gray-500">{ref.position} - {ref.company}</p>
                              </div>
                              {ref.contact && <span className="text-[11px] font-semibold text-brand-blue">{ref.contact}</span>}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 italic">Sẽ cung cấp khi có yêu cầu (Hoặc không đề cập trong CV).</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Đóng
          </button>

          {!extractedData ? (
            <button
              onClick={handleParse}
              disabled={loading || !file}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích file...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu phân tích CV</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setExtractedData(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Phân tích file khác
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Áp dụng vào Hồ sơ</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
