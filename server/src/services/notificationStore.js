const { randomUUID } = require('crypto');
const db = require('../config/db');

// The business write and outbox entry either both commit or both roll back.
async function withTransaction(work) {
  const { getPool, sql } = db;
  const transaction = new sql.Transaction(await getPool());
  await transaction.begin();
  const query = async (text, params = {}) => {
    const request = new sql.Request(transaction);
    Object.entries(params).forEach(([key, value]) => request.input(key, value));
    return request.query(text);
  };
  try {
    const result = await work(query);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
}

async function enqueue(query, type, payload, key = randomUUID()) {
  await query(`IF NOT EXISTS (SELECT 1 FROM NotificationOutbox WITH (UPDLOCK, HOLDLOCK) WHERE EventKey=@Key)
    INSERT NotificationOutbox(EventKey, EventType, Payload) VALUES(@Key, @Type, @Payload)`,
  { Key: key, Type: type, Payload: JSON.stringify(payload) });
}

async function putNotification(query, n) {
  await query(`IF NOT EXISTS (SELECT 1 FROM Notifications WITH (UPDLOCK, HOLDLOCK) WHERE UserID=@UserID AND EventKey=@Key)
    INSERT Notifications(UserID, RecipientRole, EventKey, Type, Title, Body, Href, JobID, CVID)
    VALUES(@UserID,@Role,@Key,@Type,@Title,@Body,@Href,@JobID,@CVID)
    ELSE UPDATE Notifications SET IsActive=1,Title=@Title,Body=@Body,Href=@Href WHERE UserID=@UserID AND EventKey=@Key`, {
    UserID: n.userId, Role: n.role, Key: n.key, Type: n.type,
    Title: n.title.slice(0, 160), Body: n.body.slice(0, 1200), Href: n.href,
    JobID: n.jobId || null, CVID: n.cvId || null
  });
}

module.exports = { withTransaction, enqueue, putNotification };
