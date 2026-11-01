const { executeQuery } = require('../config/db');

/**
 * Tạo thông báo mới cho người dùng
 * @param {Object} params
 * @param {number} params.userId - UserID người nhận thông báo
 * @param {string} params.title - Tiêu đề thông báo
 * @param {string} params.message - Nội dung thông báo
 * @param {string} params.type - Loại thông báo: 'application' | 'job_approved' | 'job_rejected' | 'job_revision' | 'system'
 * @param {number} [params.relatedId] - ID đối tượng liên quan (JobID, ApplicationID...)
 * @param {string} [params.linkUrl] - Đường dẫn khi click vào thông báo
 */
const createNotification = async ({ userId, title, message, type = 'system', relatedId = null, linkUrl = null }) => {
  try {
    if (!userId || !title || !message) {
      console.warn('createNotification: Thiếu userId, title hoặc message');
      return null;
    }

    const result = await executeQuery(
      `INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, LinkUrl, IsRead, CreatedAt)
       OUTPUT INSERTED.NotificationID, INSERTED.UserID, INSERTED.Title, INSERTED.Message, INSERTED.Type, INSERTED.RelatedID, INSERTED.LinkUrl, INSERTED.IsRead, INSERTED.CreatedAt
       VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @LinkUrl, 0, GETDATE())`,
      {
        UserID: userId,
        Title: title,
        Message: message,
        Type: type,
        RelatedID: relatedId,
        LinkUrl: linkUrl
      }
    );

    return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error('Lỗi khi tạo thông báo createNotification:', error);
    return null;
  }
};

/**
 * Lấy danh sách thông báo của người dùng
 */
const getUserNotifications = async (userId, limit = 30) => {
  try {
    const result = await executeQuery(
      `SELECT TOP (@Limit) NotificationID, UserID, Title, Message, Type, RelatedID, LinkUrl, IsRead, CreatedAt
       FROM Notifications
       WHERE UserID = @UserID
       ORDER BY CreatedAt DESC`,
      { UserID: userId, Limit: limit }
    );
    return result.recordset || [];
  } catch (error) {
    console.error('Lỗi khi lấy thông báo getUserNotifications:', error);
    return [];
  }
};

/**
 * Đánh dấu 1 thông báo là đã đọc
 */
const markAsRead = async (notificationId, userId) => {
  try {
    await executeQuery(
      `UPDATE Notifications
       SET IsRead = 1
       WHERE NotificationID = @NotificationID AND UserID = @UserID`,
      { NotificationID: notificationId, UserID: userId }
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
    return false;
  }
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
const markAllAsRead = async (userId) => {
  try {
    await executeQuery(
      `UPDATE Notifications
       SET IsRead = 1
       WHERE UserID = @UserID AND IsRead = 0`,
      { UserID: userId }
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', error);
    return false;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};

