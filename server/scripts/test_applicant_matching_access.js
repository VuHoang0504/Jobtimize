const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applicantMatchDetails } = require('../src/services/applicantMatchingAccess');

test('locked employer receives neither matching score nor analysis', () => {
  const result = applicantMatchDetails({ MatchScore: 90, MatchDetailsJson: '{"summary":"Private assessment"}' }, false);
  assert.equal(result.MatchScore, null);
  assert.equal(result.matchAnalysis, null);
  assert.equal(JSON.stringify(result).includes('Private assessment'), false);
  assert.equal(JSON.stringify(result).includes('MatchDetailsJson'), false);
});

test('unlocked employer receives saved application analysis including zero scores', () => {
  const analysis = { cvVersion: 2, matchedSkills: [], missingSkills: [{ skillName: 'SQL' }] };
  const result = applicantMatchDetails({ MatchScore: 0, MatchDetailsJson: JSON.stringify(analysis) }, true);
  assert.equal(result.MatchScore, 0);
  assert.deepEqual(result.matchAnalysis, analysis);
});

test('legacy or malformed analysis does not break applicant review', () => {
  for (const value of [null, 'invalid', 'null', '[]', '42']) {
    const result = applicantMatchDetails({ MatchScore: null, MatchDetailsJson: value }, true);
    assert.equal(result.matchAnalysis, null);
    assert.equal(result.MatchScore, null);
  }
});

test('unlocked employer receives screening group and details', () => {
  const applicant = {
    MatchScore: 85,
    ScreeningScore: 85,
    ScreeningResultGroup: 'Passed',
    ScreeningDetailsJson: JSON.stringify({ resultGroup: 'Passed', screeningScore: 85, reasons: ['Đạt kỹ năng'] })
  };
  const unlocked = applicantMatchDetails(applicant, true);
  assert.equal(unlocked.ScreeningResultGroup, 'Passed');
  assert.equal(unlocked.ScreeningScore, 85);
  assert.equal(unlocked.screeningDetails?.resultGroup, 'Passed');

  const locked = applicantMatchDetails(applicant, false);
  assert.equal(locked.ScreeningResultGroup, null);
  assert.equal(locked.ScreeningScore, null);
  assert.equal(locked.screeningDetails, null);
});
