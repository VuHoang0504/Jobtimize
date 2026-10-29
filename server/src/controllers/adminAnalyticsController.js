const service = require('../services/adminAnalyticsService');
const sendError = (res, error) => { console.error('Admin report:', error.message); return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tạo báo cáo.' }); };
exports.getAnalyticsReport = async (req, res) => {
  try { return res.json({ success: true, data: await service.analytics(req.query) }); } catch (error) { return sendError(res, error); }
};
exports.getTransactions = async (req, res) => {
  try { return res.json({ success: true, data: await service.transactions(req.query) }); } catch (error) { return sendError(res, error); }
};
exports.exportReport = async (req, res) => {
  try {
    const kind = req.query.kind || 'summary';
    if (!['summary', 'transactions'].includes(kind)) return res.status(400).json({ success: false, message: 'Loại báo cáo không hợp lệ.' });
    let rows, period, source;
    if (kind === 'transactions') {
      const data = await service.transactions(req.query, true); period = data.period; source = data.source;
      rows = [['Nguồn dữ liệu', source.label], ...(source.isDemo ? [['Lưu ý', 'DỮ LIỆU MẪU - Không dùng để đối soát thanh toán thực tế']] : []), ['Mã giao dịch', 'Doanh nghiệp', 'Gói dịch vụ', 'Số tiền (VND)', 'Phương thức', 'Trạng thái', 'Ngày thanh toán (Việt Nam)'], ...data.transactions.map(tx => [tx.transactionCode, tx.companyName, tx.packageName, tx.amount, tx.paymentMethod, tx.paymentStatus, tx.startDate])];
    } else {
      const data = await service.analytics(req.query); period = data.period; source = data.source;
      rows = [['BÁO CÁO JOBTIMIZE', 'Từ ngày', period.fromDate, 'Đến hết ngày', period.toDate], ['Múi giờ', period.timezone], ['Nguồn doanh thu', source.isDemo ? 'DỮ LIỆU MẪU - Không dùng để đối soát thanh toán thực tế' : 'Giao dịch xác nhận thành công, tính theo ngày thanh toán'],
        ['Doanh thu kỳ (VND)', data.kpi.periodRevenue], ['Doanh thu toàn hệ thống (VND)', data.kpi.totalRevenue], ['Số giao dịch thành công trong kỳ', data.kpi.periodOrders], ['Doanh nghiệp trả phí trong kỳ', data.kpi.payingEmployers], ['Doanh thu trung bình / doanh nghiệp trả phí (VND)', data.kpi.arpu], ['Tổng người dùng', data.kpi.totalUsers], ['Tổng ứng viên', data.kpi.totalCandidates], ['Tổng nhà tuyển dụng', data.kpi.totalEmployers], ['Tổng tin', data.kpi.totalJobs], ['Tổng ứng tuyển', data.kpi.totalApplications], ['Điểm phù hợp trung bình trong kỳ', data.kpi.avgMatchScore], ['Tăng trưởng doanh thu (%)', data.kpi.revenueGrowthRate ?? 'Chưa có kỳ gốc'], ['Tăng trưởng người dùng (%)', data.kpi.userGrowthRate ?? 'Chưa có kỳ gốc'], ['Tăng trưởng tin (%)', data.kpi.jobGrowthRate ?? 'Chưa có kỳ gốc'], ['Kỳ so sánh từ ngày', period.previousFrom], ['Kỳ so sánh đến trước ngày', period.previousToExclusive], ['Người dùng mới', data.kpi.periodNewUsers], ['Tin mới', data.kpi.periodNewJobs], ['Lượt ứng tuyển', data.kpi.periodApplications],
        [], ['Kỳ', 'Doanh thu (VND)', 'Giao dịch', 'Ứng viên mới', 'Nhà tuyển dụng mới', 'Người dùng mới', 'Tin mới', 'Ứng tuyển'], ...data.timeline.map(row => [row.fullLabel, row.revenue, row.orders, row.newCandidates, row.newEmployers, row.newUsers, row.jobs, row.applications]),
        [], ['Gói dịch vụ', 'Số giao dịch', 'Doanh thu'], ...data.packagesBreakdown.map(row => [row.packageName, row.subscriptionCount, row.totalRevenue]),
        [], ['Phương thức', 'Số giao dịch', 'Doanh thu'], ...data.paymentMethodsBreakdown.map(row => [row.method, row.count, row.totalAmount]),
        [], ['Ngành nghề', 'Tin mới'], ...data.jobsByCategory.map(row => [row.categoryName, row.jobCount]), [], ['Địa điểm', 'Tin mới'], ...data.jobsByLocation.map(row => [row.location, row.jobCount])];
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="jobtimize-${source.isDemo ? 'demo-' : ''}${kind}-${period.fromDate}-${period.toDate}.csv"`);
    res.set('Cache-Control', 'no-store');
    return res.send(service.csv(rows));
  } catch (error) { return sendError(res, error); }
};
