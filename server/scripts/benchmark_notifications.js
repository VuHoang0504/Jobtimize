const { performance } = require('perf_hooks');
const { createHash } = require('crypto');
const matching = require('../src/services/notificationRecommendations');
const taxonomy = [
  { SkillID: 1, SkillName: 'React.js', NormalizedName: 'react' },
  { SkillID: 2, SkillName: 'Node.js', NormalizedName: 'nodejs' },
  { SkillID: 3, SkillName: 'SQL Server', NormalizedName: 'sqlserver' }
];
const jobs = Array.from({ length: 1000 }, (_, i) => ({ JobID: i + 1, Title: 'React.js Node.js SQL Server', Description: 'Software engineer', Requirements: 'React.js Node.js SQL Server' }));
const requirements = jobs.filter(j => j.JobID % 2).flatMap(j => taxonomy.map(skill => ({ ...skill, JobID: j.JobID, IsMandatory: true })));
const cvs = Array.from({ length: 20 }, (_, i) => i % 2 ? 'React.js Node.js SQL Server' : 'React.js Node.js');
const durations = []; let output;
for (let run = 0; run < 4; run++) {
  const start = performance.now();
  if (matching.prepareCatalog) {
    const catalog = matching.prepareCatalog(jobs, requirements, taxonomy);
    output = cvs.map(cv => matching.rankPreparedJobs(cv, catalog));
  } else output = cvs.map(cv => matching.rankJobs(cv, jobs, requirements, taxonomy));
  if (run) durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ jobs: jobs.length, cvs: cvs.length, medianMs: +durations[1].toFixed(2), resultHash: createHash('sha256').update(JSON.stringify(output)).digest('hex') }));
