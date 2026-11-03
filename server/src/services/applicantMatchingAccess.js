const { executeQuery } = require('../config/db');

async function canViewApplicantMatching(employerId) {
  const result = await executeQuery(`
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM PaymentTransactions pt
      JOIN SubscriptionPackages sp ON sp.PackageID = pt.PackageID
      WHERE pt.EmployerID = @EmployerID AND pt.Status = 'Success' AND sp.Price > 0
    ) OR EXISTS (
      SELECT 1 FROM EmployerSubscriptions es
      JOIN SubscriptionPackages sp ON sp.PackageID = es.PackageID
      WHERE es.EmployerID = @EmployerID AND sp.Price > 0
        AND es.StartDate <= GETDATE() AND es.EndDate > GETDATE()
    ) THEN 1 ELSE 0 END AS HasAccess`, { EmployerID: employerId });
  return Boolean(result.recordset[0]?.HasAccess);
}

function applicantMatchDetails(applicant, hasAccess) {
  if (!hasAccess) return { MatchScore: null, MatchDetailsJson: undefined, matchAnalysis: null };
  let analysis = null;
  try {
    const parsed = JSON.parse(applicant.MatchDetailsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) analysis = parsed;
  } catch (_) { /* Legacy applications can have a score without details. */ }
  return { MatchScore: applicant.MatchScore, MatchDetailsJson: undefined, matchAnalysis: analysis };
}

module.exports = { canViewApplicantMatching, applicantMatchDetails };
