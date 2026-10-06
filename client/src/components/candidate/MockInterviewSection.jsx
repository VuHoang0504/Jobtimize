import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Mic, 
  MicOff, 
  Play, 
  Send, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  RefreshCw, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Briefcase, 
  History, 
  FileText, 
  Zap,
  Check,
  Star,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from 'lucide-react';
import api from '../../services/api';

export default function MockInterviewSection() {
  // Mode: 'setup' | 'interviewing' | 'evaluating' | 'result' | 'history'
  const [step, setStep] = useState('setup');
  
  // Setup fields
  const [jobTitle, setJobTitle] = useState('Fullstack Web Developer');
  const [level, setLevel] = useState('Middle');
  const [numQuestions, setNumQuestions] = useState(4);
  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');

  // Interview state
  const [sessionData, setSessionData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Load saved jobs & history on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qJobTitle = params.get('jobTitle');
    const qJobId = params.get('jobId');
    if (qJobTitle) setJobTitle(qJobTitle);
    if (qJobId) setSelectedJobId(qJobId);

    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [savedRes, historyRes] = await Promise.all([
        api.get('/candidate/saved-jobs').catch(() => ({ data: { data: [] } })),
        api.get('/ai/interview/history').catch(() => ({ data: { data: [] } }))
      ]);

      if (savedRes.data?.success) {
        setSavedJobs(savedRes.data.data || []);
      }
      if (historyRes.data?.success) {
        setHistoryList(historyRes.data.data || []);
      }
    } catch (err) {
      console.error('Initial mock interview fetch error:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (step === 'interviewing') {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  // Speech to text setup
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ tính năng nhận diện giọng nói Speech-to-Text. Vui lòng nhập bằng bàn phím.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswers(prev => {
          const currentText = prev[currentIndex] || '';
          return {
            ...prev,
            [currentIndex]: currentText + ' ' + transcript
          };
        });
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to init speech recognition:', err);
      setIsRecording(false);
    }
  };

  // Start interview session
  const handleStartInterview = async () => {
    if (!jobTitle.trim() && !selectedJobId) {
      setError('Vui lòng nhập hoặc chọn vị trí muốn phỏng vấn');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post('/ai/interview/start', {
        jobTitle: jobTitle.trim(),
        jobId: selectedJobId || null,
        level,
        numberOfQuestions: numQuestions
      });

      if (res.data.success && res.data.data) {
        setSessionData(res.data.data);
        setCurrentIndex(0);
        setAnswers({});
        setTimerSeconds(0);
        setStep('interviewing');
      } else {
        setError(res.data.message || 'Không thể tạo bộ câu hỏi phỏng vấn');
      }
    } catch (err) {
      console.error('Start interview error:', err);
      setError(err.response?.data?.message || 'Có lỗi khi AI tạo câu hỏi phỏng vấn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Submit and Evaluate interview
  const handleSubmitInterview = async () => {
    if (!sessionData?.questions) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      setLoading(true);
      setStep('evaluating');
      setError('');

      const qaList = sessionData.questions.map((q, idx) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        answer: answers[idx] || ''
      }));

      const res = await api.post('/ai/interview/evaluate', {
        jobTitle: sessionData.jobTitle || jobTitle,
        qaList
      });

      if (res.data.success && res.data.data) {
        setEvaluation(res.data.data);
        setStep('result');
        // Refresh history
        fetchInitialData();
      } else {
        setError(res.data.message || 'Chấm điểm phỏng vấn thất bại');
        setStep('interviewing');
      }
    } catch (err) {
      console.error('Evaluate interview error:', err);
      setError(err.response?.data?.message || 'Có lỗi khi AI đánh giá bài phỏng vấn.');
      setStep('interviewing');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: SETUP INTERVIEW */}
      {step === 'setup' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6">
          
          {/* Header */}
          <div className="border-b border-gray-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Luyện Phỏng Vấn Thử Cùng AI (UC-C15)</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase tracking-wide">
                    Gemini AI
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  AI đóng vai trò Tech Lead & HR đặt câu hỏi thực tế, chấm điểm và gợi ý câu trả lời theo chuẩn STAR.
                </p>
              </div>
            </div>

            {historyList.length > 0 && (
              <button
                type="button"
                onClick={() => setStep('history')}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <History className="w-4 h-4 text-purple-600" />
                <span>Xem lịch sử luyện tập ({historyList.length})</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Target Job Title */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                1. Nhập vị trí công việc muốn luyện tập *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                    setSelectedJobId('');
                  }}
                  placeholder="Ví dụ: Frontend Developer, Backend Node.js, Product Manager, Business Analyst..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Quick Select from Saved Jobs */}
              {savedJobs.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-1.5">Hoặc chọn nhanh từ việc làm đã lưu của bạn:</p>
                  <div className="flex flex-wrap gap-2">
                    {savedJobs.slice(0, 4).map(sj => (
                      <button
                        key={sj.JobID}
                        type="button"
                        onClick={() => {
                          setJobTitle(sj.Title);
                          setSelectedJobId(sj.JobID);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                          selectedJobId === sj.JobID
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-200'
                        }`}
                      >
                        {sj.Title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                2. Cấp bậc phỏng vấn mong muốn
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-3 rounded-2xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="Intern / Fresher">Intern / Fresher (Người mới bắt đầu)</option>
                <option value="Junior (1-2 năm)">Junior (1 - 2 năm kinh nghiệm)</option>
                <option value="Middle (2-4 năm)">Middle (2 - 4 năm kinh nghiệm)</option>
                <option value="Senior (5+ năm)">Senior (5+ năm kinh nghiệm)</option>
                <option value="Tech Lead / Manager">Tech Lead / Quản lý</option>
              </select>
            </div>

            {/* Number of Questions */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                3. Số lượng câu hỏi
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full p-3 rounded-2xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value={3}>3 câu hỏi (Nhanh - 10 phút)</option>
                <option value={4}>4 câu hỏi (Tiêu chuẩn - 15 phút)</option>
                <option value={5}>5 câu hỏi (Chuyên sâu - 20 phút)</option>
              </select>
            </div>

          </div>

          {/* Highlights & Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-gray-800">Câu hỏi thực chiến</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Kết hợp câu hỏi chuyên môn và tình huống xử lý thực tế.</p>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-gray-800">Trả lời bằng giọng nói</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Hỗ trợ thu âm và chuyển đổi giọng nói thành văn bản tức thì.</p>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
              <Award className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-gray-800">Chấm điểm STAR</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Phân tích điểm mạnh, điểm yếu và gợi ý câu trả lời mẫu chuẩn mực.</p>
              </div>
            </div>
          </div>

          {/* CTA Start Button */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={handleStartInterview}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang chuẩn bị bộ câu hỏi...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt đầu buổi phỏng vấn AI</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* SECTION 2: INTERVIEWING SESSION */}
      {step === 'interviewing' && sessionData && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6 animate-in fade-in duration-200">
          
          {/* Top Bar with Timer and Progress */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-700 text-xs font-extrabold">
                Câu hỏi {currentIndex + 1} / {sessionData.questions.length}
              </span>
              <span className="text-xs font-bold text-gray-500">
                {sessionData.jobTitle}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>{formatTime(timerSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn thoát buổi phỏng vấn này không?')) {
                    setStep('setup');
                  }
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                Hủy bỏ
              </button>
            </div>
          </div>

          {/* Current Question Card */}
          {sessionData.questions[currentIndex] && (
            <div className="space-y-6">
              
              {/* Question Header & Content */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-blue-50/60 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                    <Bot className="w-4 h-4" />
                    <span>Người phỏng vấn AI hỏi:</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    sessionData.questions[currentIndex].type === 'Technical'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {sessionData.questions[currentIndex].type === 'Technical' ? 'Kỹ thuật / Chuyên môn' : 'Tình huống / Hành vi'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-gray-900 leading-relaxed">
                  "{sessionData.questions[currentIndex].question}"
                </h3>

                {sessionData.questions[currentIndex].hint && (
                  <div className="flex items-start gap-2 text-xs text-gray-500 pt-2 border-t border-purple-200/50">
                    <HelpCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <span><strong>Gợi ý AI:</strong> {sessionData.questions[currentIndex].hint}</span>
                  </div>
                )}
              </div>

              {/* Answer Input Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Câu trả lời của bạn:
                  </label>

                  {/* Speech to text button */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Đang thu âm... (Nhấn để dừng)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Nói qua Microphone</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={answers[currentIndex] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentIndex]: e.target.value })}
                  placeholder="Nhập hoặc nói câu trả lời của bạn tại đây... Hãy chia sẻ cụ thể theo mô hình STAR: Tình huống (Situation) -> Nhiệm vụ (Task) -> Hành động (Action) -> Kết quả (Result)..."
                  className="w-full p-4 rounded-2xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                <div className="flex gap-2">
                  {currentIndex < sessionData.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5"
                    >
                      <span>Câu tiếp theo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSubmitInterview}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hoàn thành & Nhận đánh giá AI</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* SECTION 3: EVALUATION LOADING */}
      {step === 'evaluating' && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-card space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto animate-bounce">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-gray-900">AI đang phân tích & chấm điểm buổi phỏng vấn...</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Hệ thống đang đối chiếu câu trả lời của bạn với tiêu chuẩn ngành, phân tích điểm mạnh, điểm yếu và gợi ý câu trả lời mẫu theo mô hình STAR.
          </p>
        </div>
      )}

      {/* SECTION 4: EVALUATION RESULT */}
      {step === 'result' && evaluation && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-8 animate-in fade-in duration-200">
          
          {/* Header Score Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-[11px] font-bold backdrop-blur-xs">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Báo cáo đánh giá Phỏng vấn AI
                </div>
                <h2 className="text-2xl font-black tracking-tight">{sessionData?.jobTitle || jobTitle}</h2>
                <p className="text-xs text-purple-100/80 leading-relaxed">
                  {evaluation.summary}
                </p>
              </div>

              {/* Overall Score Badge */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0 min-w-[140px]">
                <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Điểm tổng kết</span>
                <div className="text-4xl font-black text-amber-300 mt-1">
                  {evaluation.overallScore}
                  <span className="text-sm font-normal text-purple-200"> / 100</span>
                </div>
                <span className="mt-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-white/20 text-white">
                  {evaluation.overallScore >= 80 ? 'Xuất sắc ⭐' : evaluation.overallScore >= 65 ? 'Khá tốt 👍' : 'Cần cải thiện 💡'}
                </span>
              </div>
            </div>
          </div>

          {/* Strengths and Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Strengths */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>Điểm mạnh nổi bật ({evaluation.strengths?.length || 0})</span>
              </div>
              <ul className="space-y-2">
                {evaluation.strengths?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-emerald-950">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <ThumbsDown className="w-4 h-4 text-amber-600" />
                <span>Điểm cần cải thiện ({evaluation.weaknesses?.length || 0})</span>
              </div>
              <ul className="space-y-2">
                {evaluation.weaknesses?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-amber-950">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Detailed Question Feedback & STAR Sample Answers */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Chi tiết từng câu hỏi & Gợi ý câu trả lời chuẩn mực (STAR)
            </h3>

            <div className="space-y-4">
              {evaluation.detailedFeedback?.map((fb, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-gray-800">
                      Câu {idx + 1}: {fb.question}
                    </h4>
                    {fb.score !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold">
                        {fb.score} / 100 điểm
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="font-bold text-gray-500 uppercase text-[10px]">Câu trả lời của bạn:</span>
                      <p className="text-gray-700 mt-0.5 italic bg-white p-3 rounded-xl border border-gray-100">
                        {fb.candidateAnswer || '(Ứng viên chưa trả lời)'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-purple-700 uppercase text-[10px]">Nhận xét từ AI:</span>
                      <p className="text-gray-800 mt-0.5">{fb.comment}</p>
                    </div>

                    {fb.suggestedAnswer && (
                      <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-950 space-y-1">
                        <span className="font-bold text-purple-800 uppercase text-[10px] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          Gợi ý câu trả lời chuẩn (STAR Method):
                        </span>
                        <p className="leading-relaxed whitespace-pre-line">{fb.suggestedAnswer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('history')}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
            >
              <History className="w-4 h-4 text-purple-600" />
              <span>Xem lịch sử luyện tập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSessionData(null);
                setEvaluation(null);
                setStep('setup');
              }}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện tập lượt mới</span>
            </button>
          </div>

        </div>
      )}

      {/* SECTION 5: PRACTICE HISTORY */}
      {step === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-card space-y-6 animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-gray-900">Lịch Sử Luyện Phỏng Vấn AI</h3>
            </div>
            <button
              type="button"
              onClick={() => setStep('setup')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Luyện tập bài mới</span>
            </button>
          </div>

          {historyList.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs space-y-3">
              <Bot className="w-10 h-10 text-gray-300 mx-auto" />
              <p>Bạn chưa có lịch sử luyện phỏng vấn nào. Hãy bắt đầu buổi luyện tập đầu tiên ngay!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div
                  key={item.practiceId}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-purple-300 transition-all bg-gray-50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900">{item.jobTitle || 'Phỏng vấn thử AI'}</h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold">
                        {item.score || 0} / 100 điểm
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Ngày luyện: {new Date(item.practicedAt).toLocaleString('vi-VN')}
                    </p>
                    {item.feedback?.summary && (
                      <p className="text-xs text-gray-600 line-clamp-1 max-w-xl">{item.feedback.summary}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEvaluation(item.feedback);
                      setJobTitle(item.jobTitle || 'Phỏng vấn thử');
                      setStep('result');
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-purple-50 hover:border-purple-200 text-xs font-bold text-gray-700 transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
