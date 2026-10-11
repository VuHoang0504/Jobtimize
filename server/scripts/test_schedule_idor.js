const { executeQuery } = require('../src/config/db');
const http = require('http');

function sendRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  const loginB = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'career@vng.com.vn', password: 'Admin@123' });
  const tokenB = loginB.body?.data?.token;

  const jobA = (await executeQuery('SELECT TOP 1 JobID FROM JobPostings WHERE EmployerID = 1')).recordset[0];
  const cand = (await executeQuery('SELECT TOP 1 ProfileID FROM CandidateProfiles')).recordset[0];

  const appA = (await executeQuery(`
    INSERT INTO JobApplications (JobID, ProfileID, MatchScore, Status, AppliedAt)
    OUTPUT INSERTED.ApplicationID
    VALUES (@JobID, @ProfileID, 88, 'Applied', GETDATE())
  `, { JobID: jobA.JobID, ProfileID: cand.ProfileID })).recordset[0];

  // Pass valid ISO date
  const validIsoDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 19).replace('T', ' ');
  const postData = {
    applicationId: appA.ApplicationID,
    interviewDate: validIsoDate,
    interviewType: 'Online',
    locationOrLink: 'https://meet.google.com/test-idor',
    notes: 'Testing IDOR'
  };

  const idorRes = await sendRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/employer/interviews',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + tokenB,
      'Content-Length': Buffer.byteLength(JSON.stringify(postData))
    }
  }, postData);

  console.log('HTTP Status from Employer B scheduling on Employer A applicant (with formatted date):', idorRes.status);
  console.log('Response:', idorRes.body);

  // Cleanup
  await executeQuery('DELETE FROM Interviews WHERE ApplicationID = @AppID', { AppID: appA.ApplicationID });
  await executeQuery('DELETE FROM JobApplications WHERE ApplicationID = @AppID', { AppID: appA.ApplicationID });
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

