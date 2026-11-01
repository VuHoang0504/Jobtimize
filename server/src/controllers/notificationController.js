const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Lấy danh sách thông báo của tài khoản hiện tại
 */
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit, 10) || 30;
    const notifications = await notificationService.getUserNotifications(userId, limit);

    return res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Đánh dấu 1 thông báo đã đọc
 */
const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const ok = await notificationService.markAsRead(id, userId);
    return res.json({
      success: ok,
      message: ok ? 'Đã đánh dấu thông báo là đã đọc' : 'Không thể cập nhật thông báo'
    });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Đánh dấu tất cả thông báo đã đọc
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const ok = await notificationService.markAllAsRead(userId);

    return res.json({
      success: ok,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc'
    });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead
};

