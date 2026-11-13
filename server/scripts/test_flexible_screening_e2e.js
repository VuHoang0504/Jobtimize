const { executeQuery } = require('../src/config/db');
const screeningService = require('../src/services/screeningService');
const flexibleEngine = require('../src/services/flexibleScreeningEngine');

async function runE2E() {
  console.log('--- Testing Flexible Screening E2E on Job 10 ---');

  // 1. Check Job 10
  const job = (await executeQuery('SELECT * FROM JobPostings WHERE JobID = 10')).recordset[0];
  if (!job) {
    console.error('Job 10 not found!');
    process.exit(1);
  }
  console.log(`Found Job 10: "${job.Title}", EmployerID: ${job.EmployerID}`);

  // 2. Test getJobScreeningCriteria
  const criteria = await screeningService.getJobScreeningCriteria(10);
  console.log(`Job 10 criteria: Version=${criteria.Version}, ScreeningLevel=${criteria.ScreeningLevel}, IsEnabled=${criteria.IsEnabled}`);
  console.log(`Config is present: ${Boolean(criteria.Config)}`);

  // 3. Test recalculating screening for all applications of Job 10
  console.log('Recalculating screening for Job 10 applicants...');
  const recalcRes = await screeningService.recalculateJobApplications(10);
  console.log(`Recalculated: total=${recalcRes.total}, processed=${recalcRes.processed}`);

  // 4. Inspect sample processed applications
  const sampleApps = (await executeQuery(`
    SELECT TOP 5 ApplicationID, ProfileID, ScreeningResultGroup, ScreeningScore, MatchScore, ScreeningDetailsJson
    FROM JobApplications
    WHERE JobID = 10
    ORDER BY ApplicationID ASC
  `)).recordset;

  console.log('\n--- Sample Applications Output ---');
  for (const app of sampleApps) {
    const details = app.ScreeningDetailsJson ? JSON.parse(app.ScreeningDetailsJson) : {};
    console.log(`App #${app.ApplicationID}: Group=${app.ScreeningResultGroup}, Score=${app.ScreeningScore}%`);
    console.log(`  - Matched Criteria: ${details.matchedCriteria?.length || 0}`);
    console.log(`  - Unmet Criteria: ${details.unmetCriteria?.length || 0}`);
    console.log(`  - Missing Data: ${details.missingDataCriteria?.length || 0}`);
    if (details.salaryInsight) {
      console.log(`  - Salary Insight: [${details.salaryInsight.label}] ${details.salaryInsight.note}`);
    }
    if (details.employmentInsights) {
      console.log(`  - Tenure: ${details.employmentInsights.formattedAvgTenure}, Hops: ${details.employmentInsights.jobHopsCount}, Gap: ${details.employmentInsights.hasCareerGap}`);
    }
  }

  // 5. Test Template CRUD
  console.log('\n--- Testing Filter Template Management ---');
  const templateName = `Test Template ${Date.now()}`;
  const savedTmpl = await screeningService.saveFilterTemplate(job.EmployerID, {
    templateName,
    description: 'E2E Template Test',
    configJson: flexibleEngine.DEFAULT_SCREENING_CONFIG
  });
  console.log(`Created Template: ID=${savedTmpl.TemplateID}, Name="${savedTmpl.TemplateName}"`);

  const tmplList = await screeningService.listFilterTemplates(job.EmployerID);
  console.log(`List templates count: ${tmplList.length}`);
  const found = tmplList.find(t => t.TemplateID === savedTmpl.TemplateID);
  if (!found) throw new Error('Saved template not found in list!');

  const delRes = await screeningService.deleteFilterTemplate(job.EmployerID, savedTmpl.TemplateID);
  console.log(`Deleted test template: ${delRes}`);

  console.log('\n✅ All E2E Flexible Screening tests completed successfully!');
  process.exit(0);
}

runE2E().catch(err => {
  console.error('E2E failed:', err);
  process.exit(1);
});

