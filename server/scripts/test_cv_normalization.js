const { test } = require('node:test');
const assert = require('node:assert/strict');
const normal = require('../src/services/cvNormalization');
const taxonomy = [{ SkillID: 1, SkillName: 'React.js', NormalizedName: 'react' }, { SkillID: 2, SkillName: 'Docker', NormalizedName: 'docker' }];

test('evidence normalization never invents skills or confuses substring/negation matches', () => {
  assert.equal(normal.positiveMention('JavaScript', 'Java'), false);
  assert.equal(normal.positiveMention('MySQL', 'SQL'), false);
  assert.equal(normal.positiveMention('React Native', 'React'), false);
  assert.equal(normal.positiveMention('Chưa có kinh nghiệm Docker', 'Docker'), false);
  assert.equal(normal.positiveMention('I do not know Docker', 'Docker'), false);
  assert.equal(normal.positiveMention('I know Docker', 'Docker'), true);
  assert.equal(normal.positiveMention('Không biết Docker, nhưng sử dụng React.js', 'React.js'), true);
  const source = 'Xây dựng giao diện với ReactJS. Chưa sử dụng Docker.';
  const result = normal.normalizeAnalysis({ personal: { fullName: 'Nguyễn Ánh' }, skills: [
    { name: 'ReactJS', evidence: 'Xây dựng giao diện với ReactJS.' },
    { name: 'Docker', evidence: 'Chưa sử dụng Docker.' },
    { name: 'Python', evidence: 'Có kinh nghiệm Python.' }
  ] }, taxonomy, source);
  assert.equal(result.skills[0].skillId, 1);
  assert.equal(result.skills[0].verified, true);
  assert.equal(result.skills[1].verified, false);
  assert.equal(result.skills[2].verified, false);
  assert.equal(result.warnings.length, 3);
  assert.equal(result.personal.fullName, '', 'Do not retain a name invented outside the source');
  assert.equal(result.confirmed, false);
});

test('builder normalization reads content fields only and respects hidden sections', () => {
  const result = normal.fromBuilder({ personal: { fullName: 'React Nguyễn', gender: 'Docker' }, summary: 'Python',
    design: { color: 'Docker', hidden: ['skills'] }, skills: { hardSkills: ['Docker'] } }, taxonomy);
  assert.deepEqual(result.skills, []);
  assert.equal(result.confirmed, true);
  const visible = normal.fromBuilder({ personal: { fullName: 'Nguyễn Ánh' }, skills: { hardSkills: ['React.js'] } }, taxonomy);
  assert.equal(visible.skills[0].skillId, 1);
  assert.equal(visible.skills[0].verified, true);
});
