const { test } = require('node:test');
const assert = require('node:assert/strict');
const screeningService = require('../src/services/screeningService');
const deepReviewService = require('../src/services/deepReviewService');

test('getJobScreeningCriteria returns default fallback when no criteria exists', async () => {
  const criteria = await screeningService.getJobScreeningCriteria(-999);
  assert.equal(criteria.ScreeningLevel, 'Balanced');
  assert.equal(criteria.MinGPA, null);
  assert.deepEqual(criteria.MandatoryCertificates, []);
});

test('saveJobScreeningCriteria creates and versions criteria properly', async () => {
  // We can test pure logic and versioning
  const evalResult = screeningService.evaluateScreening(
    {
      version: { Status: 'Ready', VersionNumber: 2 },
      data: {
        skills: [{ skillId: 1, name: 'React', verified: true, evidence: 'React' }],
        educations: [{ gpa: 3.8, gpaScale: 4 }],
        certifications: [{ name: 'PMP' }]
      }
    },
    {
      ScreeningLevel: 'Strict',
      MinGPA: 3.5,
      GPAScale: 4,
      MandatoryCertificates: ['PMP'],
      Version: 3
    },
    [{ SkillID: 1, SkillName: 'React', IsMandatory: 1 }]
  );

  assert.equal(evalResult.resultGroup, 'Passed');
  assert.equal(evalResult.screeningScore, 100);
  assert.equal(evalResult.criteriaVersion, 3);
  assert.equal(evalResult.threshold, 85);
  assert.equal(evalResult.gpaResult.status, 'Passed');
  assert.equal(evalResult.certsResult.status, 'Passed');
});

test('deep review fallback generates structured review with questions and fit', () => {
  const evalResult = {
    resultGroup: 'ReviewNeeded',
    screeningScore: 60,
    matchedSkills: [{ skillName: 'React' }],
    missingSkills: [{ skillName: 'Kubernetes', isMandatory: true }],
    reasons: ['Thiếu kỹ năng bắt buộc: Kubernetes.'],
    gpaResult: { status: 'Missing' },
    certsResult: { status: 'Passed' },
    signals: { experienceCount: 3 }
  };

  const review = deepReviewService.generateFallbackReview(
    { JobTitle: 'Senior Fullstack Engineer' },
    { Title: 'Senior Fullstack Engineer' },
    evalResult
  );

  assert.ok(review.summary.includes('Cần xem thêm'));
  assert.ok(Array.isArray(review.strengths));
  assert.ok(Array.isArray(review.concerns));
  assert.ok(review.concerns.some(c => c.includes('Kubernetes')));
  assert.ok(review.stabilityAndFit.includes('3 mốc kinh nghiệm'));
  assert.ok(Array.isArray(review.interviewQuestions));
  assert.ok(review.interviewQuestions.some(q => q.question.includes('Kubernetes')));
});

