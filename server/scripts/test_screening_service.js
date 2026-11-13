const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateScreening, parseCertificates, SCREENING_THRESHOLDS } = require('../src/services/screeningService');

const mockSkills = [
  { SkillID: 1, SkillName: 'Node.js', IsMandatory: 1 },
  { SkillID: 2, SkillName: 'React.js', IsMandatory: 1 },
  { SkillID: 3, SkillName: 'Docker', IsMandatory: 0 }
];

test('parseCertificates handles arrays, json strings, and comma-separated strings', () => {
  assert.deepEqual(parseCertificates(['AWS', 'IELTS']), ['AWS', 'IELTS']);
  assert.deepEqual(parseCertificates('["AWS", "IELTS"]'), ['AWS', 'IELTS']);
  assert.deepEqual(parseCertificates('AWS, IELTS'), ['AWS', 'IELTS']);
  assert.deepEqual(parseCertificates(null), []);
});

test('CV not ready or missing places candidate in ReviewNeeded', () => {
  const context = { version: { Status: 'Processing', VersionNumber: 1 }, data: null };
  const res = evaluateScreening(context, { ScreeningLevel: 'Balanced' }, mockSkills);
  assert.equal(res.resultGroup, 'ReviewNeeded');
  assert.equal(res.screeningScore, 0);
  assert.ok(res.reasons.some(r => r.includes('đang được xử lý')));
});

test('3 screening levels evaluate correct thresholds (Relaxed 50%, Balanced 70%, Strict 85%)', () => {
  // Total weight: Node (2) + React (2) + Docker (1) = 5
  // Matched: Node (2) + Docker (1) = 3 -> 3/5 = 60%
  const candidateCV = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: [
        { skillId: 1, name: 'Node.js', verified: true, evidence: '3 years Node.js' },
        { skillId: 3, name: 'Docker', verified: true, evidence: 'Docker containerization' }
      ],
      educations: [{ school: 'BK', degree: 'BS', gpa: 3.5, gpaScale: 4 }],
      certifications: []
    }
  };

  // Under Relaxed (50% threshold): score 60% >= 50%
  // In Relaxed, missing mandatory skill (React) does not force ReviewNeeded
  const resRelaxed = evaluateScreening(candidateCV, { ScreeningLevel: 'Relaxed' }, mockSkills);
  assert.equal(resRelaxed.screeningScore, 60);
  assert.equal(resRelaxed.resultGroup, 'Passed');

  // Under Balanced (70% threshold): score 60% < 70% -> Failed
  const resBalanced = evaluateScreening(candidateCV, { ScreeningLevel: 'Balanced' }, mockSkills);
  assert.equal(resBalanced.screeningScore, 60);
  assert.equal(resBalanced.resultGroup, 'Failed');

  // Candidate with Node (2) + React (2) = 4/5 = 80% (has both mandatory skills)
  const candidate80 = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: [
        { skillId: 1, name: 'Node.js', verified: true, evidence: 'Node' },
        { skillId: 2, name: 'React.js', verified: true, evidence: 'React' }
      ],
      educations: [],
      certifications: []
    }
  };

  // Under Balanced (70% threshold): 80% >= 70% and no missing mandatory -> Passed
  const resBalanced80 = evaluateScreening(candidate80, { ScreeningLevel: 'Balanced' }, mockSkills);
  assert.equal(resBalanced80.screeningScore, 80);
  assert.equal(resBalanced80.resultGroup, 'Passed');

  // Under Strict (85% threshold): 80% < 85% -> Failed
  const resStrict = evaluateScreening(candidate80, { ScreeningLevel: 'Strict' }, mockSkills);
  assert.equal(resStrict.screeningScore, 80);
  assert.equal(resStrict.resultGroup, 'Failed');
});

test('missing mandatory skill at Balanced/Strict forces ReviewNeeded when score >= threshold', () => {
  // Custom skills where mandatory is 1 item and preferred are 3 items
  // Skills: Python (Mandatory, 2), SQL (Pref, 1), Git (Pref, 1), Linux (Pref, 1) -> Total 5
  // Matched: SQL (1) + Git (1) + Linux (1) = 3/5 = 60%. But let's say total is 10:
  // Say mandatory is weight 2, and we have 8 preferred skills -> matched 8 preferred = 8/10 = 80%.
  const skills = [
    { SkillID: 10, SkillName: 'Java', IsMandatory: 1 },
    { SkillID: 11, SkillName: 'Spring', IsMandatory: 0 },
    { SkillID: 12, SkillName: 'SQL', IsMandatory: 0 },
    { SkillID: 13, SkillName: 'Docker', IsMandatory: 0 },
    { SkillID: 14, SkillName: 'AWS', IsMandatory: 0 },
    { SkillID: 15, SkillName: 'Kafka', IsMandatory: 0 },
    { SkillID: 16, SkillName: 'Redis', IsMandatory: 0 },
    { SkillID: 17, SkillName: 'CI/CD', IsMandatory: 0 }
  ];
  // Total weight: Java(2) + 7*1 = 9. If candidate has all 7 preferred = 7/9 = 78% >= 70%
  const candidate = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: [
        { skillId: 11, name: 'Spring', verified: true },
        { skillId: 12, name: 'SQL', verified: true },
        { skillId: 13, name: 'Docker', verified: true },
        { skillId: 14, name: 'AWS', verified: true },
        { skillId: 15, name: 'Kafka', verified: true },
        { skillId: 16, name: 'Redis', verified: true },
        { skillId: 17, name: 'CI/CD', verified: true }
      ],
      educations: [],
      certifications: []
    }
  };

  const resBalanced = evaluateScreening(candidate, { ScreeningLevel: 'Balanced' }, skills);
  assert.equal(resBalanced.screeningScore, 78);
  // Missing Java (mandatory) -> ReviewNeeded
  assert.equal(resBalanced.resultGroup, 'ReviewNeeded');
  assert.ok(resBalanced.reasons.some(r => r.includes('kỹ năng bắt buộc: Java')));
});

test('GPA validation: below threshold fails, missing GPA results in ReviewNeeded, scales convert properly', () => {
  const criteriaScale4 = {
    ScreeningLevel: 'Relaxed',
    MinGPA: 3.2,
    GPAScale: 4
  };

  // 1. Missing GPA in CV -> ReviewNeeded
  const noGpaCandidate = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: mockSkills.map(s => ({ skillId: s.SkillID, name: s.SkillName, verified: true })),
      educations: [{ school: 'ĐH Quốc Gia', degree: 'Kỹ sư' }]
    }
  };
  const resNoGpa = evaluateScreening(noGpaCandidate, criteriaScale4, mockSkills);
  assert.equal(resNoGpa.resultGroup, 'ReviewNeeded');
  assert.equal(resNoGpa.gpaResult.status, 'Missing');

  // 2. GPA below threshold (3.0 < 3.2) -> Failed
  const lowGpaCandidate = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: mockSkills.map(s => ({ skillId: s.SkillID, name: s.SkillName, verified: true })),
      educations: [{ school: 'ĐH Quốc Gia', degree: 'Kỹ sư', gpa: 3.0, gpaScale: 4 }]
    }
  };
  const resLowGpa = evaluateScreening(lowGpaCandidate, criteriaScale4, mockSkills);
  assert.equal(resLowGpa.resultGroup, 'Failed');
  assert.equal(resLowGpa.gpaResult.status, 'Below');

  // 3. GPA scale 10 converted to scale 4: 8.5/10 -> 3.4/4 >= 3.2 -> Passed
  const scale10Candidate = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: mockSkills.map(s => ({ skillId: s.SkillID, name: s.SkillName, verified: true })),
      educations: [{ school: 'ĐH Bách Khoa', degree: 'Kỹ sư', gpa: 8.5, gpaScale: 10 }]
    }
  };
  const resScale10 = evaluateScreening(scale10Candidate, criteriaScale4, mockSkills);
  assert.equal(resScale10.resultGroup, 'Passed');
  assert.equal(resScale10.gpaResult.status, 'Passed');
});

test('mandatory certificates: all must match case-insensitively, missing leads to ReviewNeeded', () => {
  const criteria = {
    ScreeningLevel: 'Relaxed',
    MandatoryCertificates: ['AWS Certified Solutions Architect', 'IELTS 7.0']
  };

  // Candidate with both certs (case-insensitive & accent variations)
  const fullCertCandidate = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: mockSkills.map(s => ({ skillId: s.SkillID, name: s.SkillName, verified: true })),
      certifications: [
        { name: 'aws certified solutions architect - associate', year: '2023' },
        { name: 'IELTS 7.0 Academic', year: '2022' }
      ]
    }
  };
  const resFull = evaluateScreening(fullCertCandidate, criteria, mockSkills);
  assert.equal(resFull.resultGroup, 'Passed');
  assert.equal(resFull.certsResult.status, 'Passed');

  // Candidate missing IELTS -> ReviewNeeded
  const partialCertCandidate = {
    version: { Status: 'Ready', VersionNumber: 1 },
    data: {
      skills: mockSkills.map(s => ({ skillId: s.SkillID, name: s.SkillName, verified: true })),
      certifications: [
        { name: 'AWS Certified Solutions Architect' }
      ]
    }
  };
  const resPartial = evaluateScreening(partialCertCandidate, criteria, mockSkills);
  assert.equal(resPartial.resultGroup, 'ReviewNeeded');
  assert.equal(resPartial.certsResult.status, 'Missing');
  assert.deepEqual(resPartial.certsResult.missing, ['IELTS 7.0']);
});

