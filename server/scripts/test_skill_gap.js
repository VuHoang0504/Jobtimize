const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recommendations, searchSuggestions, catalogue } = require('../src/services/courseRecommendations');
const { createRelevance } = require('../src/services/cvJobRelevance');
const { normalize, insightFailure } = require('../src/services/skillGapInsights');

test('AI failures expose actionable quota and configuration codes without provider secrets', () => {
  const quota = insightFailure({ status: 429, message: 'secret provider response' }, 'gemini');
  assert.equal(quota.status, 'Unavailable');
  assert.equal(quota.code, 'GEMINI_RATE_LIMITED');
  assert.match(quota.message, /hạn mức/);
  assert.ok(!JSON.stringify(quota).includes('secret'));
  assert.equal(insightFailure({ status: 403 }, 'gemini').code, 'GEMINI_ACCESS_DENIED');
  assert.equal(insightFailure({ status: 404 }, 'gemini').code, 'GEMINI_MODEL_NOT_FOUND');
  assert.match(insightFailure({ code: 'OPENAI_BILLING_REQUIRED' }, 'openai').message, /thanh toán/);
  assert.match(insightFailure(new Error('secret'), 'gemini').message, /tạm thời/);
});

test('course recommendations cover missing skills only and merge overlapping course pages', () => {
  const missing = [{ skillId: 1, skillName: 'Node.js', isMandatory: true }, { skillId: 2, skillName: 'Express.js', isMandatory: false }];
  const courses = recommendations(missing, [
    { CourseID: 1, Title: 'Unrelated', SkillID: 99, Url: 'https://example.org/unrelated' },
    { CourseID: 2, Title: 'Duplicate', SkillID: 1, Url: 'https://f8.edu.vn/courses/nodejs/' },
    { CourseID: 3, Title: 'Unsafe', SkillID: 1, Url: 'javascript:alert(1)' }
  ]);
  assert.ok(courses.some(course => course.Language === 'vi'));
  assert.ok(courses.some(course => course.Language === 'en'));
  assert.equal(courses.filter(course => course.Url.includes('f8.edu.vn')).length, 1);
  assert.equal(courses.find(course => course.Url.includes('f8.edu.vn')).skills.length, 2);
  assert.ok(courses.every(course => course.skills.every(skill => [1, 2].includes(skill.skillId))));
  assert.ok(!courses.some(course => ['Unsafe', 'Unrelated'].includes(course.Title)));
  assert.deepEqual(recommendations([]), []);
});

test('canonical skill aliases resolve courses without confusing unrelated skills or inventing prices', () => {
  const react = recommendations([{ skillId: 3, skillName: 'ReactJS' }]);
  assert.ok(react.some(course => course.Provider === 'F8'));
  assert.equal(recommendations([{ skillId: 4, skillName: 'React Native' }]).length, 0);
  assert.ok(recommendations([{ skillId: 5, skillName: 'TypeScript' }]).every(course => course.skills[0].skillId === 5));
  assert.ok(react.every(course => course.Price === null && course.IsFree === null && !course.Rating));
  assert.ok(catalogue.length >= 20);
});

test('course lookup accepts decorated and compound skill names and covers previous catalogue gaps', () => {
  for (const skillName of ['TypeScript (cơ bản)', 'NodeJS / ExpressJS', 'RESTful API', 'Tailwind CSS', 'Redis', 'Azure Cloud', 'Kỹ năng giao tiếp']) {
    assert.ok(recommendations([{ skillId: 'test', skillName }]).length > 0, skillName);
  }
  assert.equal(recommendations([{ skillId: 'native', skillName: 'React (Native)' }]).length, 0);
  const unknown = [{ skillId: 'unknown', skillName: 'Chuyên môn chưa có trong danh mục & kiểm thử' }];
  const searches = searchSuggestions(unknown, []);
  assert.equal(searches.length, 1);
  assert.equal(new URL(searches[0].links[0].url).searchParams.get('query'), unknown[0].skillName);
});

test('empty AI course arrays preserve existing recommendations; uncovered skills get explicit search links', async () => {
  const { buildLearning } = await import('../../client/src/utils/skillLearning.mjs');
  const skill = { skillId: 1, skillName: 'TypeScript' }, unknown = { skillId: 2, skillName: 'Unknown specialty' };
  const course = { id: 'course', Url: 'https://fullstackopen.com/en/part9/', skills: [skill] };
  const result = buildLearning({ missingSkills: [skill, unknown], recommendedCourses: [course] }, { status: 'Ready', requirements: [], learningPriorities: [], recommendedCourses: [] });
  assert.equal(result.courses.length, 1); assert.equal(result.learning.length, 2);
  assert.equal(result.searches.length, 1); assert.equal(result.searches[0].skillId, 2);
  const recognized = buildLearning({ missingSkills: [skill], recommendedCourses: [course] }, { status: 'Ready', requirements: [{ ...skill, status: 'matched' }], learningPriorities: [], recommendedCourses: [] });
  assert.equal(recognized.courses.length, 0); assert.equal(recognized.learning.length, 0);
});

test('related discovery retains zero-skill jobs in the CV category and uses roles without mixing unrelated occupations', () => {
  const taxonomy = [{ SkillID: 1, SkillName: 'React.js', CategoryID: 10 }];
  const relevance = createRelevance({ skills: [{ name: 'ReactJS', verified: true }], personal: { headline: 'Frontend Developer' } }, taxonomy);
  assert.equal(relevance({ matchedCount: 0, CategoryID: 10, Title: 'Java Engineer' }).related, true);
  assert.equal(relevance({ matchedCount: 0, CategoryID: 20, Title: 'Accountant' }).related, false);
  assert.equal(relevance({ matchedCount: 0, CategoryID: null, Title: 'Frontend Engineer' }).related, true);
  assert.equal(createRelevance({ skills: [], experiences: [{ role: 'Kế toán tổng hợp' }] }, [])({ Title: 'Kế toán doanh nghiệp', matchedCount: 0 }).related, true);
});

test('AI insights require real CV and job evidence, reject invented requirements and preserve missing skills for learning', () => {
  const taxonomy = [{ SkillID: 1, SkillName: 'React.js', NormalizedName: 'react' }, { SkillID: 2, SkillName: 'TypeScript', NormalizedName: 'typescript' }, { SkillID: 3, SkillName: 'Docker', NormalizedName: 'docker' }];
  const context = { taxonomy, cvData: { skills: [{ name: 'React.js', skillId: 1, verified: true, evidence: 'Built React.js interfaces.' }], experiences: [{ description: 'Deployed services with Docker.' }] }, job: { Description: 'Build React.js applications.', Requirements: 'TypeScript and Docker are required. REST API design is preferred.' } };
  const comparison = { criteriaSource: 'employer', matchedSkills: [{ skillId: 1, skillName: 'React.js', isMandatory: true }], missingSkills: [{ skillId: 2, skillName: 'TypeScript', isMandatory: true }, { skillId: 3, skillName: 'Docker', isMandatory: false }] };
  const result = normalize({ summary: 'Nhận xét theo CV.', requirements: [
    { skillName: 'React.js', cvEvidence: 'Invented React evidence' },
    { skillName: 'TypeScript', cvEvidence: 'Built TypeScript applications.', nextStep: 'Build a typed application.' },
    { skillName: 'Docker', cvEvidence: 'Deployed services with Docker.' },
    { skillName: 'REST API', jobEvidence: 'REST API design is preferred.', cvEvidence: '' },
    { skillName: 'Kubernetes', jobEvidence: 'Kubernetes is required.' }
  ] }, context, comparison);
  assert.equal(result.requirements.find(skill => skill.skillName === 'React.js').cvEvidence, 'Built React.js interfaces.');
  assert.equal(result.requirements.find(skill => skill.skillName === 'TypeScript').status, 'missing');
  assert.equal(result.requirements.find(skill => skill.skillName === 'Docker').status, 'matched');
  assert.ok(!result.requirements.some(skill => skill.skillName === 'Kubernetes'));
  assert.deepEqual(result.learningPriorities.map(skill => skill.skillName), ['TypeScript', 'REST API']);
  assert.throws(() => normalize({ summary: '', requirements: [] }, context, comparison));
});
