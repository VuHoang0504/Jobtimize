/**
 * Seed 50 realistic Vietnamese QA / QC applicants for Job 10
 * (Chuyên viên Kiểm thử Tự động QA / QC Engineer - KMS Technology Đà Nẵng)
 *
 * Distribution target:
 *   Passed       ~20  (TS + SQL Server, Score >= 70%, GPA >= 2.8, ISTQB + TOEIC)
 *   ReviewNeeded ~20  (missing TS, or missing cert, or missing GPA)
 *   Failed       ~10  (skill score < 70%  OR  GPA < 2.8)
 *
 * Uses executeQuery throughout to avoid mssql request parameter name collision.
 * MandatoryCertificates: 'TOEIC' (without score) so fold+includes works for
 * any cert name containing "TOEIC" (e.g. "TOEIC 850", "TOEIC 790", …).
 */
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { executeQuery } = require('../src/config/db');
const screeningService = require('../src/services/screeningService');

const JOB_ID = 10;

const CANDIDATES = [
  // ══════════════════════════════════════════════════════════════════
  // GROUP 1 — PASSED  (20)
  // All have TypeScript + SQL Server + GPA >= 2.8 + ISTQB + TOEIC
  // ══════════════════════════════════════════════════════════════════
  {
    n: '01', fullName: 'Nguyễn Đức Anh', email: 'qa.demo01@jobtimize.vn',
    phone: '0905112233', location: 'Đà Nẵng',
    headline: 'Senior Automation QA Engineer | Playwright, TypeScript, CI/CD',
    desiredSalary: 28000000, status: 'Offered', daysAgo: 14,
    skills: ['TypeScript','SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.65, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Công nghệ Thông tin',
    certs: [
      { name: 'ISTQB Advanced Test Automation Engineer', evidence: 'ISTQB Advanced Level Test Automation' },
      { name: 'ISTQB Foundation Level (CTFL)',           evidence: 'ISTQB Foundation Level 2022' },
      { name: 'TOEIC 850',                              evidence: 'IIG Vietnam TOEIC 850' }
    ],
    expYears: 4, company: 'FPT Software Da Nang', hasDeepReview: true
  },
  {
    n: '02', fullName: 'Trần Thị Thu Trang', email: 'qa.demo02@jobtimize.vn',
    phone: '0905223344', location: 'Đà Nẵng',
    headline: 'Automation Test Lead | TypeScript, Cypress, Playwright',
    desiredSalary: 26000000, status: 'Interviewing', daysAgo: 13,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.52, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Cử nhân Kỹ thuật Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation Certified Tester' },
      { name: 'TOEIC 790',                     evidence: 'TOEIC 790 Listening & Reading' }
    ],
    expYears: 3.5, company: 'Enclave Da Nang', hasDeepReview: true,
    interview: { daysFromNow: 1, type: 'Offline',
      location: 'Văn phòng KMS Technology - Tầng 5, Tòa nhà F-Home, 16 Lý Thường Kiệt, Hải Châu, Đà Nẵng',
      notes: 'Phỏng vấn kỹ thuật trực tiếp với Technical Lead & HR. Mang laptop để làm bài live coding.' }
  },
  {
    n: '03', fullName: 'Lê Hoàng Minh', email: 'qa.demo03@jobtimize.vn',
    phone: '0905334455', location: 'Đà Nẵng',
    headline: 'Software QA / QC Specialist | Automation Frameworks & SQL',
    desiredSalary: 24000000, status: 'Interviewing', daysAgo: 12,
    skills: ['TypeScript','SQL Server','Docker','PostgreSQL'],
    gpa: 3.40, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Công nghệ Thông tin',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'Certified Tester Foundation Level' },
      { name: 'TOEIC 730',                     evidence: 'TOEIC Certificate 730' }
    ],
    expYears: 3, company: 'LogiGear Da Nang', hasDeepReview: true,
    interview: { daysFromNow: 2, type: 'Online',
      location: 'https://meet.google.com/kms-qa-interview-03',
      notes: 'Phỏng vấn kỹ thuật vòng 1. Trọng tâm: Playwright & TypeScript architecture.' }
  },
  {
    n: '04', fullName: 'Phạm Bảo Ngọc', email: 'qa.demo04@jobtimize.vn',
    phone: '0905445566', location: 'Đà Nẵng',
    headline: 'Automation QA Engineer | End-to-End Testing & Performance',
    desiredSalary: 25000000, status: 'Interviewing', daysAgo: 11,
    skills: ['TypeScript','SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.75, gpaScale: 4,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Kỹ sư Công nghệ Thông tin',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Certified Tester' },
      { name: 'TOEIC 820',                     evidence: 'TOEIC 820 IIG Vietnam' }
    ],
    expYears: 3, company: 'Axon Active Da Nang',
    interview: { daysFromNow: 3, type: 'Online',
      location: 'https://teams.microsoft.com/l/meetup-join/kms-qa-04',
      notes: 'Phỏng vấn chuyên sâu API Automation & CI/CD Pipeline.' }
  },
  {
    n: '05', fullName: 'Đặng Quốc Huy', email: 'qa.demo05@jobtimize.vn',
    phone: '0905556677', location: 'Đà Nẵng',
    headline: 'Senior QC Engineer | Test Automation & Database Verification',
    desiredSalary: 27000000, status: 'Interviewing', daysAgo: 11,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.25, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Điện tử Viễn thông',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 680',                     evidence: 'TOEIC 680' }
    ],
    expYears: 4, company: 'mgm technology partners Vietnam',
    interview: { daysFromNow: 4, type: 'Offline',
      location: 'KMS Da Nang Office - Phòng họp Sơn Trà',
      notes: 'Phỏng vấn năng lực quản lý dự án kiểm thử và performance testing.' }
  },
  {
    n: '06', fullName: 'Vũ Thị Thanh Thảo', email: 'qa.demo06@jobtimize.vn',
    phone: '0905667788', location: 'Đà Nẵng',
    headline: 'Automation Test Engineer | TypeScript, Selenium, Postman',
    desiredSalary: 22000000, status: 'Interviewing', daysAgo: 10,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 3.48, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 715',                     evidence: 'TOEIC Certificate 715' }
    ],
    expYears: 2.5, company: 'NeoLab Vietnam',
    interview: { daysFromNow: 5, type: 'Online',
      location: 'https://meet.google.com/kms-qa-interview-06',
      notes: 'Technical interview vòng 1 qua Google Meet.' }
  },
  {
    n: '07', fullName: 'Hoàng Gia Bảo', email: 'qa.demo07@jobtimize.vn',
    phone: '0905778899', location: 'Đà Nẵng',
    headline: 'QA Automation Engineer | CI/CD, Playwright, SQL',
    desiredSalary: 23000000, status: 'Interviewing', daysAgo: 10,
    skills: ['TypeScript','SQL Server','Docker'],
    gpa: 3.10, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Kỹ sư Kỹ thuật Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 700',                     evidence: 'TOEIC 700' }
    ],
    expYears: 2.5, company: 'Paradox Da Nang',
    interview: { daysFromNow: 6, type: 'Online',
      location: 'https://meet.google.com/kms-qa-interview-07',
      notes: 'Phỏng vấn năng lực tự động hóa kiểm thử web.' }
  },
  {
    n: '08', fullName: 'Bùi Mai Phương', email: 'qa.demo08@jobtimize.vn',
    phone: '0905889900', location: 'Đà Nẵng',
    headline: 'Mid-level Automation QA | TypeScript, SQL Server, Python',
    desiredSalary: 22000000, status: 'Screening', daysAgo: 9,
    skills: ['TypeScript','SQL Server','Python','PostgreSQL'],
    gpa: 3.32, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation Level' },
      { name: 'TOEIC 750',                     evidence: 'TOEIC 750' }
    ],
    expYears: 2.5, company: 'SmartDev Da Nang'
  },
  {
    n: '09', fullName: 'Đỗ Văn Hùng', email: 'qa.demo09@jobtimize.vn',
    phone: '0905990011', location: 'Huế',
    headline: 'Software Tester & Automation Specialist | Web & Backend QA',
    desiredSalary: 21000000, status: 'Screening', daysAgo: 9,
    skills: ['TypeScript','SQL Server','Docker','PostgreSQL'],
    gpa: 3.15, gpaScale: 4,
    school: 'Đại học Khoa Học Huế', degree: 'Cử nhân Khoa học Máy tính',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 670',                     evidence: 'TOEIC 670' }
    ],
    expYears: 2, company: 'Hue Software Center'
  },
  {
    n: '10', fullName: 'Lý Thu Hà', email: 'qa.demo10@jobtimize.vn',
    phone: '0914112233', location: 'Đà Nẵng',
    headline: 'QC Engineer | Automation & Manual Testing, Playwright',
    desiredSalary: 24000000, status: 'Screening', daysAgo: 8,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 3.55, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation Level' },
      { name: 'TOEIC 810',                     evidence: 'TOEIC 810' }
    ],
    expYears: 3, company: 'FPT Software Da Nang'
  },
  {
    n: '11', fullName: 'Ngô Tuấn Khang', email: 'qa.demo11@jobtimize.vn',
    phone: '0914223344', location: 'Đà Nẵng',
    headline: 'Automation QA Engineer | TypeScript, SQL Server, Docker',
    desiredSalary: 20000000, status: 'Screening', daysAgo: 8,
    skills: ['TypeScript','SQL Server','Docker'],
    gpa: 2.95, gpaScale: 4,
    school: 'Đại học FPT Đà Nẵng', degree: 'Kỹ sư Kỹ thuật Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 660',                     evidence: 'TOEIC 660' }
    ],
    expYears: 2, company: 'Co-well Asia Da Nang'
  },
  {
    n: '12', fullName: 'Dương Mỹ Linh', email: 'qa.demo12@jobtimize.vn',
    phone: '0914334455', location: 'Đà Nẵng',
    headline: 'QA Engineer | Test Architecture & CI Integration',
    desiredSalary: 25000000, status: 'Screening', daysAgo: 7,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.60, gpaScale: 4,
    school: 'Đại học Bách Khoa Hà Nội', degree: 'Kỹ sư CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 780',                     evidence: 'TOEIC 780' }
    ],
    expYears: 3, company: 'BAP IT Da Nang'
  },
  {
    n: '13', fullName: 'Phan Đình Trọng', email: 'qa.demo13@jobtimize.vn',
    phone: '0914445566', location: 'Đà Nẵng',
    headline: 'Automation QA Engineer | Playwright, SQL Server, API',
    desiredSalary: 27000000, status: 'Offered', daysAgo: 7,
    skills: ['TypeScript','SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.28, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 690',                     evidence: 'TOEIC 690' }
    ],
    expYears: 3.5, company: 'Evolable Asia Da Nang'
  },
  {
    n: '14', fullName: 'Trịnh Kim Ngân', email: 'qa.demo14@jobtimize.vn',
    phone: '0914556677', location: 'Đà Nẵng',
    headline: 'Senior QA/QC Engineer | Automation & Security Testing',
    desiredSalary: 29000000, status: 'Offered', daysAgo: 6,
    skills: ['TypeScript','SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.70, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Thạc sĩ Khoa học Máy tính',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 860',                     evidence: 'TOEIC 860' }
    ],
    expYears: 4.5, company: 'Orient Software Da Nang'
  },
  {
    n: '15', fullName: 'Lâm Thế Vinh', email: 'qa.demo15@jobtimize.vn',
    phone: '0914667788', location: 'Quảng Nam',
    headline: 'Automation Tester | Web & API Automation with TypeScript',
    desiredSalary: 19000000, status: 'Applied', daysAgo: 6,
    skills: ['TypeScript','SQL Server','PostgreSQL'],
    gpa: 3.05, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 655',                     evidence: 'TOEIC 655' }
    ],
    expYears: 2, company: 'Danang Web Solutions'
  },
  {
    n: '16', fullName: 'Hồ Quỳnh Nga', email: 'qa.demo16@jobtimize.vn',
    phone: '0914778899', location: 'Đà Nẵng',
    headline: 'QC Automation Engineer | Data & Database Testing',
    desiredSalary: 23000000, status: 'Applied', daysAgo: 5,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.42, gpaScale: 4,
    school: 'Đại học Kinh Tế - ĐH Đà Nẵng', degree: 'Cử nhân Hệ thống Thông tin Quản lý',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 725',                     evidence: 'TOEIC 725' }
    ],
    expYears: 3, company: 'DAC Data Da Nang'
  },
  {
    n: '17', fullName: 'Tạ Văn Cường', email: 'qa.demo17@jobtimize.vn',
    phone: '0914889900', location: 'Đà Nẵng',
    headline: 'Software QA Tester | TypeScript, SQL Server',
    desiredSalary: 20000000, status: 'Applied', daysAgo: 5,
    skills: ['TypeScript','SQL Server','Docker'],
    gpa: 2.90, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Cơ điện tử',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 670',                     evidence: 'TOEIC 670' }
    ],
    expYears: 2, company: 'Seatech Da Nang'
  },
  {
    n: '18', fullName: 'Lương Thị Thảo', email: 'qa.demo18@jobtimize.vn',
    phone: '0914990011', location: 'Đà Nẵng',
    headline: 'Mid Automation QC | Test Architecture & Automation',
    desiredSalary: 24000000, status: 'Applied', daysAgo: 4,
    skills: ['TypeScript','SQL Server','Python','PostgreSQL'],
    gpa: 3.38, gpaScale: 4,
    school: 'Đại học Công Nghệ Thông Tin ĐHQG HCM', degree: 'Kỹ sư Kỹ thuật Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 740',                     evidence: 'TOEIC 740' }
    ],
    expYears: 3, company: 'Green Global Da Nang'
  },
  {
    n: '19', fullName: 'Võ Hoài Nam', email: 'qa.demo19@jobtimize.vn',
    phone: '0983112233', location: 'Đà Nẵng',
    headline: 'QA Automation Engineer | Performance & Integration',
    desiredSalary: 22000000, status: 'Applied', daysAgo: 3,
    skills: ['TypeScript','SQL Server','Docker','PostgreSQL'],
    gpa: 3.20, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Điện tử',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 710',                     evidence: 'TOEIC 710' }
    ],
    expYears: 2.5, company: 'AgilityIO Da Nang'
  },
  {
    n: '20', fullName: 'Cao Hồng Nhung', email: 'qa.demo20@jobtimize.vn',
    phone: '0983223344', location: 'Đà Nẵng',
    headline: 'Automation QC Specialist | TypeScript, SQL Server, Python',
    desiredSalary: 21000000, status: 'Applied', daysAgo: 2,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 3.12, gpaScale: 4,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 680',                     evidence: 'TOEIC 680' }
    ],
    expYears: 2, company: 'Asia Pacific Solutions'
  },

  // ══════════════════════════════════════════════════════════════════
  // GROUP 2 — REVIEW NEEDED  (20)
  //   2A: Missing mandatory TypeScript (has SQL Server)   – 6
  //   2B: Missing mandatory certificate (ISTQB or TOEIC)  – 7
  //   2C: GPA not found in CV (null)                      – 5
  //   2D: Borderline / rejected early                     – 2
  // ══════════════════════════════════════════════════════════════════
  {
    n: '21', fullName: 'Nguyễn Hải Đăng', email: 'qa.demo21@jobtimize.vn',
    phone: '0983334455', location: 'Đà Nẵng',
    headline: 'Automation Test Engineer | Python, PyTest, SQL Server',
    desiredSalary: 22000000, status: 'Interviewing', daysAgo: 12,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.30, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 720',                     evidence: 'TOEIC 720' }
    ],
    expYears: 3, company: 'FPT Software Da Nang',
    interview: { daysFromNow: 3, type: 'Online',
      location: 'https://meet.google.com/kms-qa-interview-21',
      notes: 'Đánh giá khả năng học TypeScript và tư duy kiểm thử tự động.' }
  },
  {
    n: '22', fullName: 'Trần Quốc Toàn', email: 'qa.demo22@jobtimize.vn',
    phone: '0983445566', location: 'Đà Nẵng',
    headline: 'Python Automation QA | PyTest, Robot Framework, SQL Server',
    desiredSalary: 21000000, status: 'Screening', daysAgo: 11,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.15, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Kỹ sư Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 690',                     evidence: 'TOEIC 690' }
    ],
    expYears: 2.5, company: 'Danang Telecom Software'
  },
  {
    n: '23', fullName: 'Lê Thị Diệu Hiền', email: 'qa.demo23@jobtimize.vn',
    phone: '0983556677', location: 'Huế',
    headline: 'QA Specialist | Backend Testing & Python Automation',
    desiredSalary: 20000000, status: 'Screening', daysAgo: 10,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.40, gpaScale: 4,
    school: 'Đại học Khoa Học Huế', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 740',                     evidence: 'TOEIC 740' }
    ],
    expYears: 2.5, company: 'Hue IT Center'
  },
  {
    n: '24', fullName: 'Phạm Tuấn Anh', email: 'qa.demo24@jobtimize.vn',
    phone: '0983667788', location: 'Đà Nẵng',
    headline: 'Backend QC Tester | Database & Python Scripting',
    desiredSalary: 19000000, status: 'Applied', daysAgo: 9,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.20, gpaScale: 4,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 680',                     evidence: 'TOEIC 680' }
    ],
    expYears: 2, company: 'SmartDev Da Nang'
  },
  {
    n: '25', fullName: 'Vũ Minh Châu', email: 'qa.demo25@jobtimize.vn',
    phone: '0983778899', location: 'Đà Nẵng',
    headline: 'Automation QA | Python Selenium & SQL Testing',
    desiredSalary: 19000000, status: 'Applied', daysAgo: 8,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.05, gpaScale: 4,
    school: 'Đại học FPT Đà Nẵng', degree: 'Kỹ sư Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB CTFL' },
      { name: 'TOEIC 700',                     evidence: 'TOEIC 700' }
    ],
    expYears: 2, company: 'LogiGear Da Nang'
  },
  {
    n: '26', fullName: 'Đặng Hữu Phúc', email: 'qa.demo26@jobtimize.vn',
    phone: '0983889900', location: 'Quảng Nam',
    headline: 'Software Tester | Data Quality & Automation Scripting',
    desiredSalary: 18000000, status: 'Applied', daysAgo: 7,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 3.25, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Hệ thống',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 660',                     evidence: 'TOEIC 660' }
    ],
    expYears: 2, company: 'Quang Nam High Tech'
  },
  {
    n: '27', fullName: 'Hoàng Thùy Dương', email: 'qa.demo27@jobtimize.vn',
    phone: '0983990011', location: 'Đà Nẵng',
    headline: 'Mid Automation QA | TypeScript, Playwright, SQL Server',
    desiredSalary: 23000000, status: 'Interviewing', daysAgo: 10,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.35, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Kỹ thuật Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Certified Tester' }
      // No TOEIC → ReviewNeeded
    ],
    expYears: 3, company: 'Enclave Da Nang',
    interview: { daysFromNow: 2, type: 'Online',
      location: 'https://meet.google.com/kms-qa-interview-27',
      notes: 'Phỏng vấn kỹ thuật + kiểm tra năng lực Tiếng Anh chuyên ngành.' }
  },
  {
    n: '28', fullName: 'Bùi Tiến Dũng', email: 'qa.demo28@jobtimize.vn',
    phone: '0935112233', location: 'Đà Nẵng',
    headline: 'Automation Test Engineer | TypeScript & SQL Server',
    desiredSalary: 22000000, status: 'Screening', daysAgo: 9,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.10, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Kỹ sư CNTT',
    certs: [{ name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' }],
    expYears: 2.5, company: 'FPT Software Da Nang'
  },
  {
    n: '29', fullName: 'Đỗ Thị Tuyết Mai', email: 'qa.demo29@jobtimize.vn',
    phone: '0935223344', location: 'Đà Nẵng',
    headline: 'QC Engineer | Automation Testing & SQL Verification',
    desiredSalary: 21000000, status: 'Screening', daysAgo: 8,
    skills: ['TypeScript','SQL Server','Docker'],
    gpa: 3.50, gpaScale: 4,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [{ name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' }],
    expYears: 2, company: 'BAP IT Da Nang'
  },
  {
    n: '30', fullName: 'Lý Hoàng Long', email: 'qa.demo30@jobtimize.vn',
    phone: '0935334455', location: 'Đà Nẵng',
    headline: 'Automation QA | Playwright & Cypress with TypeScript',
    desiredSalary: 23000000, status: 'Screening', daysAgo: 7,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 3.20, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [{ name: 'TOEIC 750', evidence: 'TOEIC 750 Listening & Reading' }],
    expYears: 2.5, company: 'Axon Active Da Nang'
  },
  {
    n: '31', fullName: 'Ngô Thị Bích Phượng', email: 'qa.demo31@jobtimize.vn',
    phone: '0935445566', location: 'Đà Nẵng',
    headline: 'QA Specialist | Test Automation & Regression Test',
    desiredSalary: 24000000, status: 'Applied', daysAgo: 6,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: 3.45, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [{ name: 'TOEIC 800', evidence: 'TOEIC 800 IIG Vietnam' }],
    expYears: 3, company: 'SmartDev Da Nang'
  },
  {
    n: '32', fullName: 'Phan Văn Tài', email: 'qa.demo32@jobtimize.vn',
    phone: '0935556677', location: 'Đà Nẵng',
    headline: 'Automation QA Engineer | Docker, SQL Server, TypeScript',
    desiredSalary: 22000000, status: 'Applied', daysAgo: 5,
    skills: ['TypeScript','SQL Server','Docker','PostgreSQL'],
    gpa: 3.15, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Kỹ sư Phần mềm',
    certs: [{ name: 'TOEIC 720', evidence: 'TOEIC 720' }],
    expYears: 2.5, company: 'Paradox Da Nang'
  },
  {
    n: '33', fullName: 'Trương Mỹ Hạnh', email: 'qa.demo33@jobtimize.vn',
    phone: '0935667788', location: 'Đà Nẵng',
    headline: 'Software Tester | TypeScript, Automation & API',
    desiredSalary: 20000000, status: 'Applied', daysAgo: 4,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 3.40, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [],
    expYears: 2, company: 'LogiGear Da Nang'
  },
  {
    n: '34', fullName: 'Dương Đình Luật', email: 'qa.demo34@jobtimize.vn',
    phone: '0935778899', location: 'Đà Nẵng',
    headline: 'Senior Automation Tester | TypeScript, Docker, SQL Server',
    desiredSalary: 25000000, status: 'Screening', daysAgo: 6,
    skills: ['TypeScript','SQL Server','Python','Docker'],
    gpa: null, gpaScale: null,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Công nghệ Thông tin',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 700',                     evidence: 'TOEIC 700' }
    ],
    expYears: 3.5, company: 'FPT Software Da Nang'
  },
  {
    n: '35', fullName: 'Lâm Nhật Minh', email: 'qa.demo35@jobtimize.vn',
    phone: '0935889900', location: 'Đà Nẵng',
    headline: 'Mid Automation QA Engineer | Playwright & SQL Server',
    desiredSalary: 23000000, status: 'Screening', daysAgo: 5,
    skills: ['TypeScript','SQL Server','Docker','PostgreSQL'],
    gpa: null, gpaScale: null,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Cử nhân Kỹ thuật Phần mềm',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 730',                     evidence: 'TOEIC 730' }
    ],
    expYears: 3, company: 'NeoLab Vietnam'
  },
  {
    n: '36', fullName: 'Võ Thị Khánh Linh', email: 'qa.demo36@jobtimize.vn',
    phone: '0935990011', location: 'Đà Nẵng',
    headline: 'Automation QC | TypeScript & SQL Server',
    desiredSalary: 21000000, status: 'Applied', daysAgo: 4,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: null, gpaScale: null,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 680',                     evidence: 'TOEIC 680' }
    ],
    expYears: 2, company: 'Co-well Asia Da Nang'
  },
  {
    n: '37', fullName: 'Hồ Văn Quý', email: 'qa.demo37@jobtimize.vn',
    phone: '0977112233', location: 'Quảng Nam',
    headline: 'Software QA Specialist | Automation & Test Design',
    desiredSalary: 20000000, status: 'Applied', daysAgo: 3,
    skills: ['TypeScript','SQL Server','Docker'],
    gpa: null, gpaScale: null,
    school: 'Đại học Duy Tân', degree: 'Kỹ sư CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 660',                     evidence: 'TOEIC 660' }
    ],
    expYears: 2, company: 'Danang Solutions'
  },
  {
    n: '38', fullName: 'Nguyễn Thanh Thảo', email: 'qa.demo38@jobtimize.vn',
    phone: '0977223344', location: 'Đà Nẵng',
    headline: 'QA Specialist | TypeScript, SQL Server & PostgreSQL',
    desiredSalary: 22000000, status: 'Applied', daysAgo: 2,
    skills: ['TypeScript','SQL Server','Python','PostgreSQL'],
    gpa: null, gpaScale: null,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Tin học',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 710',                     evidence: 'TOEIC 710' }
    ],
    expYears: 2.5, company: 'Orient Software Da Nang'
  },
  {
    n: '39', fullName: 'Đào Trọng Tín', email: 'qa.demo39@jobtimize.vn',
    phone: '0977334455', location: 'Huế',
    headline: 'Junior Automation QA | TypeScript & SQL Server',
    desiredSalary: 18000000, status: 'Rejected', daysAgo: 6,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 3.0, gpaScale: 4,
    school: 'Đại học Khoa Học Huế', degree: 'Cử nhân CNTT',
    certs: [{ name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' }],
    expYears: 1.5, company: 'Hue Web Lab'
  },
  {
    n: '40', fullName: 'Châu Kim Yến', email: 'qa.demo40@jobtimize.vn',
    phone: '0977445566', location: 'Đà Nẵng',
    headline: 'Software Tester | Python & SQL Server',
    desiredSalary: 18000000, status: 'Rejected', daysAgo: 5,
    skills: ['SQL Server','Python','Docker','PostgreSQL'],
    gpa: 2.95, gpaScale: 4,
    school: 'Đại học Sư Phạm ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [{ name: 'TOEIC 650', evidence: 'TOEIC 650' }],
    expYears: 1.5, company: 'Green Global Da Nang'
  },

  // ══════════════════════════════════════════════════════════════════
  // GROUP 3 — FAILED  (10)
  // ══════════════════════════════════════════════════════════════════
  {
    n: '41', fullName: 'Nguyễn Văn Bình', email: 'qa.demo41@jobtimize.vn',
    phone: '0977556677', location: 'Đà Nẵng',
    headline: 'Manual QC Tester looking to switch to Automation',
    desiredSalary: 16000000, status: 'Applied', daysAgo: 4,
    skills: ['Docker','PostgreSQL'],
    gpa: 3.0, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Cử nhân CNTT',
    certs: [{ name: 'TOEIC 600', evidence: 'TOEIC 600' }],
    expYears: 1.5, company: 'Local IT Shop'
  },
  {
    n: '42', fullName: 'Trần Thị Thu Cúc', email: 'qa.demo42@jobtimize.vn',
    phone: '0977667788', location: 'Đà Nẵng',
    headline: 'Manual Software Tester | Test Case Execution',
    desiredSalary: 15000000, status: 'Applied', daysAgo: 4,
    skills: ['SQL Server'],
    gpa: 3.1, gpaScale: 4,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Cử nhân Tin học',
    certs: [],
    expYears: 1, company: 'Freelance Testing'
  },
  {
    n: '43', fullName: 'Lê Đức Hạnh', email: 'qa.demo43@jobtimize.vn',
    phone: '0977778899', location: 'Đà Nẵng',
    headline: 'Junior Web Tester | Basic TypeScript',
    desiredSalary: 15000000, status: 'Applied', daysAgo: 3,
    skills: ['TypeScript'],
    gpa: 2.9, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Cử nhân CNTT',
    certs: [],
    expYears: 1, company: 'Web Starter'
  },
  {
    n: '44', fullName: 'Phạm Quang Khải', email: 'qa.demo44@jobtimize.vn',
    phone: '0977889900', location: 'Đà Nẵng',
    headline: 'Fresher Software Tester | TypeScript & Docker Basics',
    desiredSalary: 16000000, status: 'Screening', daysAgo: 3,
    skills: ['TypeScript','Docker'],
    gpa: 3.0, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [],
    expYears: 0.5, company: 'Internship at Da Nang Tech'
  },
  {
    n: '45', fullName: 'Vũ Thị Hoài', email: 'qa.demo45@jobtimize.vn',
    phone: '0977990011', location: 'Đà Nẵng',
    headline: 'Junior QC Intern | SQL Server & Python Basics',
    desiredSalary: 15000000, status: 'Screening', daysAgo: 2,
    skills: ['SQL Server','Python'],
    gpa: 3.2, gpaScale: 4,
    school: 'Đại học Sư Phạm ĐH Đà Nẵng', degree: 'Cử nhân Sư phạm Tin',
    certs: [],
    expYears: 0.5, company: 'Intern at SoftDaNang'
  },
  {
    n: '46', fullName: 'Hoàng Văn Lộc', email: 'qa.demo46@jobtimize.vn',
    phone: '0966112233', location: 'Đà Nẵng',
    headline: 'Junior QC Tester | TypeScript & SQL Basics',
    desiredSalary: 16000000, status: 'Rejected', daysAgo: 5,
    skills: ['TypeScript','Docker'],
    gpa: 2.85, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Cử nhân CNTT',
    certs: [],
    expYears: 1, company: 'Outsourcing Team'
  },
  {
    n: '47', fullName: 'Bùi Thị Kim Oanh', email: 'qa.demo47@jobtimize.vn',
    phone: '0966223344', location: 'Đà Nẵng',
    headline: 'QC Engineer | TypeScript, SQL Server & Python',
    desiredSalary: 21000000, status: 'Rejected', daysAgo: 5,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 2.45, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 700',                     evidence: 'TOEIC 700' }
    ],
    expYears: 2, company: 'LogiGear Da Nang'
  },
  {
    n: '48', fullName: 'Đỗ Hữu Nghĩa', email: 'qa.demo48@jobtimize.vn',
    phone: '0966334455', location: 'Đà Nẵng',
    headline: 'Automation QA | TypeScript, SQL Server, Docker',
    desiredSalary: 22000000, status: 'Rejected', daysAgo: 4,
    skills: ['TypeScript','SQL Server','Docker','PostgreSQL'],
    gpa: 2.38, gpaScale: 4,
    school: 'Đại học Bách Khoa - ĐH Đà Nẵng', degree: 'Kỹ sư Điện tử',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 670',                     evidence: 'TOEIC 670' }
    ],
    expYears: 2.5, company: 'SmartDev Da Nang'
  },
  {
    n: '49', fullName: 'Lý Gia Hân', email: 'qa.demo49@jobtimize.vn',
    phone: '0966445566', location: 'Đà Nẵng',
    headline: 'Tester Fresher | Automation Enthusiast',
    desiredSalary: 15000000, status: 'Rejected', daysAgo: 3,
    skills: ['TypeScript','SQL Server','Python'],
    gpa: 2.55, gpaScale: 4,
    school: 'Đại học Sư Phạm Kỹ Thuật ĐH Đà Nẵng', degree: 'Cử nhân CNTT',
    certs: [
      { name: 'ISTQB Foundation Level (CTFL)', evidence: 'ISTQB Foundation' },
      { name: 'TOEIC 660',                     evidence: 'TOEIC 660' }
    ],
    expYears: 1, company: 'Software Intern'
  },
  {
    n: '50', fullName: 'Nguyễn Phúc Thịnh', email: 'qa.demo50@jobtimize.vn',
    phone: '0966556677', location: 'Đà Nẵng',
    headline: 'Manual Tester Fresher',
    desiredSalary: 14000000, status: 'Rejected', daysAgo: 2,
    skills: ['PostgreSQL'],
    gpa: 2.20, gpaScale: 4,
    school: 'Đại học Duy Tân', degree: 'Cử nhân CNTT',
    certs: [],
    expYears: 0.5, company: 'Tech Intern'
  }
];

// Pre-canned deep reviews
const DEEP_REVIEWS = {
  '01': {
    summary: 'Ứng viên xuất sắc thuộc nhóm [Đạt] với điểm kỹ năng 100%. Đáp ứng vượt trội toàn bộ 5 kỹ năng, chứng chỉ ISTQB Advanced và TOEIC 850.',
    details: {
      strengths: [
        'Thành thạo toàn diện: TypeScript, SQL Server, Python, Docker, PostgreSQL.',
        'ISTQB Advanced Level Test Automation + TOEIC 850 — năng lực quốc tế nổi bật.',
        'Tốt nghiệp Giỏi (GPA 3.65/4) ĐH Bách Khoa Đà Nẵng.',
        'Kinh nghiệm triển khai CI/CD pipeline thực tế trên Docker tại FPT Software.'
      ],
      concerns: [
        'Lương kỳ vọng (28 tr) ở dải cao — cần thương lượng ngân sách.',
        'Cần xác nhận định hướng gắn bó dài hạn tại Đà Nẵng.'
      ],
      stabilityAndFit: 'Lịch sử công tác ổn định 4 năm tại FPT Software, thăng tiến rõ ràng về chuyên môn.',
      interviewQuestions: [
        { question: 'Bạn tối ưu thời gian chạy regression test bằng kỹ thuật nào trong CI/CD?', purpose: 'Đo kinh nghiệm tối ưu pipeline thực chiến.' },
        { question: 'Mô tả cách bạn thiết kế Page Object Model kết hợp Fixtures trong Playwright TypeScript.', purpose: 'Đánh giá tư duy kiến trúc framework.' },
        { question: 'Khi phát hiện bug nghiêm trọng trước giờ release, bạn xử lý với Dev Lead & PO như thế nào?', purpose: 'Đánh giá kỹ năng giao tiếp & quản lý rủi ro.' }
      ]
    }
  },
  '02': {
    summary: 'Ứng viên rất tiềm năng thuộc nhóm [Đạt] với điểm kỹ năng 86%. Đáp ứng 2 kỹ năng bắt buộc, ISTQB Foundation và TOEIC 790.',
    details: {
      strengths: [
        'Vững vàng TypeScript + SQL Server — 2 kỹ năng cốt lõi của vị trí.',
        'GPA 3.52/4, ISTQB Foundation, TOEIC 790 — hồ sơ hoàn chỉnh về tiêu chí định lượng.',
        'Kinh nghiệm 3.5 năm, có thể đảm nhận vai trò Test Lead trong nhóm nhỏ.'
      ],
      concerns: ['Chưa có kinh nghiệm sâu với PostgreSQL.'],
      stabilityAndFit: 'Làm việc tại Enclave 3+ năm — tính cam kết cao, phong cách làm việc quốc tế.',
      interviewQuestions: [
        { question: 'Bạn giải quyết flaky tests trong Playwright bằng chiến lược nào?', purpose: 'Đo hiểu biết sâu về automation pitfalls.' },
        { question: 'Làm sao kiểm thử data integrity trên SQL Server qua automation?', purpose: 'Kiểm tra kỹ năng backend/database testing.' }
      ]
    }
  },
  '03': {
    summary: 'Ứng viên phù hợp thuộc nhóm [Đạt] với điểm kỹ năng 86%. TypeScript, SQL Server, Docker; GPA 3.40 và chứng chỉ quốc tế.',
    details: {
      strengths: [
        'Thành thạo TypeScript, SQL Server testing, container hóa môi trường test với Docker.',
        'ISTQB Foundation + TOEIC 730; GPA 3.40 từ ĐH Bách Khoa Đà Nẵng.'
      ],
      concerns: ['Python automation còn ở mức cơ bản.'],
      stabilityAndFit: 'Mục tiêu rõ ràng: phát triển thành Senior Automation QA — phù hợp lộ trình tại KMS.',
      interviewQuestions: [
        { question: 'Bạn tích hợp automation vào Git pull request flow như thế nào?', purpose: 'Đánh giá hiểu biết DevOps testing.' },
        { question: 'Kinh nghiệm mock API service trong automation test của bạn?', purpose: 'Đo kỹ năng cô lập lỗi trong môi trường test.' }
      ]
    }
  }
};

// ─── Main seed function ──────────────────────────────────────────────────────
async function seed() {
  console.log('═══ START SEEDING 50 QA DEMO APPLICANTS FOR JOB', JOB_ID, '═══');

  // 1. Verify Job 10
  const jobRes = await executeQuery(
    'SELECT JobID, EmployerID, Title FROM JobPostings WHERE JobID = @JobID',
    { JobID: JOB_ID }
  );
  if (!jobRes.recordset.length) throw new Error(`JobID ${JOB_ID} not found.`);
  const job = jobRes.recordset[0];
  console.log(`Target job: [${job.JobID}] "${job.Title}" (EmployerID: ${job.EmployerID})`);

  // 2. Configure skill requirements
  await executeQuery('DELETE FROM JobSkillRequirements WHERE JobID = @JobID', { JobID: JOB_ID });
  const skillsToInsert = [
    { SkillID: 4,  IsMandatory: 1 },
    { SkillID: 10, IsMandatory: 1 },
    { SkillID: 7,  IsMandatory: 0 },
    { SkillID: 14, IsMandatory: 0 },
    { SkillID: 11, IsMandatory: 0 }
  ];
  for (const s of skillsToInsert) {
    await executeQuery(
      'INSERT INTO JobSkillRequirements (JobID, SkillID, IsMandatory) VALUES (@JobID, @SkillID, @IsMandatory)',
      { JobID: JOB_ID, SkillID: s.SkillID, IsMandatory: s.IsMandatory }
    );
  }
  console.log('Configured 5 skill requirements (TypeScript & SQL Server mandatory).');

  // 3. Configure screening criteria
  const criteriaData = {
    ScreeningLevel: 'Balanced', MinGPA: 2.8, GPAScale: 4,
    // 'TOEIC' (without score) → fold+includes match works for 'TOEIC 850', 'TOEIC 790' etc.
    MandatoryCertificates: JSON.stringify(['ISTQB Foundation', 'TOEIC']),
    Version: 1
  };
  const existCrit = await executeQuery(
    'SELECT CriteriaID FROM JobScreeningCriteria WHERE JobID = @JobID',
    { JobID: JOB_ID }
  );
  if (existCrit.recordset.length === 0) {
    await executeQuery(
      'INSERT INTO JobScreeningCriteria (JobID,Version,ScreeningLevel,MinGPA,GPAScale,MandatoryCertificates,IsActive) VALUES(@JobID,@Version,@ScreeningLevel,@MinGPA,@GPAScale,@MandatoryCertificates,1)',
      { JobID: JOB_ID, Version: 1, ScreeningLevel: criteriaData.ScreeningLevel,
        MinGPA: criteriaData.MinGPA, GPAScale: criteriaData.GPAScale,
        MandatoryCertificates: criteriaData.MandatoryCertificates }
    );
    console.log('Inserted active JobScreeningCriteria.');
  } else {
    await executeQuery(
      'UPDATE JobScreeningCriteria SET ScreeningLevel=@ScreeningLevel, MinGPA=@MinGPA, GPAScale=@GPAScale, MandatoryCertificates=@MandatoryCertificates, IsActive=1 WHERE JobID=@JobID',
      { JobID: JOB_ID, ScreeningLevel: criteriaData.ScreeningLevel,
        MinGPA: criteriaData.MinGPA, GPAScale: criteriaData.GPAScale,
        MandatoryCertificates: criteriaData.MandatoryCertificates }
    );
    console.log('Updated active JobScreeningCriteria.');
  }

  // 4. Load skill requirements + taxonomy for evaluation
  const reqSkillsRes = await executeQuery(
    'SELECT jsr.SkillID, jsr.IsMandatory, st.SkillName FROM JobSkillRequirements jsr JOIN SkillTaxonomy st ON jsr.SkillID = st.SkillID WHERE jsr.JobID = @JobID',
    { JobID: JOB_ID }
  );
  const requiredSkills = reqSkillsRes.recordset;

  const taxRes = await executeQuery('SELECT SkillID, SkillName, NormalizedName FROM SkillTaxonomy', {});
  const taxonomy = taxRes.recordset;

  // 5. Clean up any previous demo accounts (cascading order)
  console.log('Cleaning up previous demo data...');
  const cleanupStatements = [
    `DELETE FROM AIDeepReviews WHERE ApplicationID IN (
       SELECT ja.ApplicationID FROM JobApplications ja
       JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
       JOIN Users u ON cp.UserID = u.UserID WHERE u.Email LIKE 'qa.demo%')`,
    `DELETE FROM Interviews WHERE ApplicationID IN (
       SELECT ja.ApplicationID FROM JobApplications ja
       JOIN CandidateProfiles cp ON ja.ProfileID = cp.ProfileID
       JOIN Users u ON cp.UserID = u.UserID WHERE u.Email LIKE 'qa.demo%')`,
    `DELETE FROM JobApplications WHERE ProfileID IN (
       SELECT cp.ProfileID FROM CandidateProfiles cp
       JOIN Users u ON cp.UserID = u.UserID WHERE u.Email LIKE 'qa.demo%')`,
    `DELETE FROM CVDocumentVersions WHERE ProfileID IN (
       SELECT cp.ProfileID FROM CandidateProfiles cp
       JOIN Users u ON cp.UserID = u.UserID WHERE u.Email LIKE 'qa.demo%')`,
    `DELETE FROM CVs WHERE ProfileID IN (
       SELECT cp.ProfileID FROM CandidateProfiles cp
       JOIN Users u ON cp.UserID = u.UserID WHERE u.Email LIKE 'qa.demo%')`,
    `DELETE FROM CandidateProfiles WHERE UserID IN (SELECT UserID FROM Users WHERE Email LIKE 'qa.demo%')`,
    `DELETE FROM UserRoles WHERE UserID IN (SELECT UserID FROM Users WHERE Email LIKE 'qa.demo%')`,
    `DELETE FROM Users WHERE Email LIKE 'qa.demo%'`
  ];
  for (const sql of cleanupStatements) {
    await executeQuery(sql, {});
  }

  // 6. Shared password hash
  const passwordHash = await bcrypt.hash('Demo@123456', 10);
  const summary = { Passed: 0, ReviewNeeded: 0, Failed: 0 };

  console.log(`Creating ${CANDIDATES.length} candidate applications...`);

  for (let i = 0; i < CANDIDATES.length; i++) {
    const c = CANDIDATES[i];
    const idx = i + 1;

    // A. User
    const uIns = await executeQuery(
      'INSERT INTO Users (Email,PasswordHash,FullName,Phone,AvatarUrl,IsEmailVerified,Status) OUTPUT INSERTED.UserID VALUES(@Email,@PasswordHash,@FullName,@Phone,@AvatarUrl,1,@Status)',
      {
        Email: c.email, PasswordHash: passwordHash, FullName: c.fullName,
        Phone: c.phone, AvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=qa-${c.n}`,
        Status: 'Active'
      }
    );
    const userId = uIns.recordset[0].UserID;

    // B. Role
    await executeQuery(
      'INSERT INTO UserRoles(UserID,RoleID) VALUES(@UserID,@RoleID)',
      { UserID: userId, RoleID: 3 }
    );

    // C. CandidateProfile
    const bio = `Chuyên viên kiểm thử phần mềm ${c.expYears} năm kinh nghiệm tại Đà Nẵng.`;
    const pIns = await executeQuery(
      'INSERT INTO CandidateProfiles(UserID,Headline,Bio,DesiredSalary,CurrentLocation,IsLookingForJob) OUTPUT INSERTED.ProfileID VALUES(@UserID,@Headline,@Bio,@DesiredSalary,@CurrentLocation,1)',
      { UserID: userId, Headline: c.headline, Bio: bio, DesiredSalary: c.desiredSalary, CurrentLocation: c.location }
    );
    const profileId = pIns.recordset[0].ProfileID;

    // D. CV
    const cvName = `CV_${c.fullName.replace(/\s+/g,'_')}_QA.pdf`;
    const cvIns = await executeQuery(
      'INSERT INTO CVs(ProfileID,Title,FileUrl,CvType,IsPrimary) OUTPUT INSERTED.CVID VALUES(@ProfileID,@Title,@FileUrl,@CvType,1)',
      { ProfileID: profileId, Title: `CV ${c.fullName} - Automation QA`, FileUrl: `/uploads/cv/${cvName}`, CvType: 'OnlineBuilder' }
    );
    const cvId = cvIns.recordset[0].CVID;

    // E. ConfirmedJson
    const skillsList = c.skills.map(sn => {
      const t = taxonomy.find(x => x.SkillName.toLowerCase() === sn.toLowerCase());
      return { name: sn, skillId: t ? t.SkillID : null, canonicalName: t ? t.SkillName : sn,
        evidence: `Áp dụng ${sn} trong dự án automation tại ${c.company}.`, verified: true, source: 'builder' };
    });
    const educations = c.school ? [{
      school: c.school, degree: c.degree, gpa: c.gpa, gpaScale: c.gpaScale,
      startYear: '2019', endYear: '2023',
      evidence: c.gpa != null ? `GPA: ${c.gpa}/${c.gpaScale}` : 'Tốt nghiệp đại học'
    }] : [];
    const certifications = (c.certs || []).map(cert => ({
      name: cert.name, issuer: cert.name.includes('TOEIC') ? 'IIG Vietnam' : 'ISTQB GASQ',
      year: '2023', evidence: cert.evidence
    }));
    const confirmedJson = JSON.stringify({
      personal: { fullName: c.fullName, email: c.email, phone: c.phone, headline: c.headline, location: c.location },
      skills: skillsList, educations, certifications,
      experiences: [{ company: c.company, role: c.headline.split('|')[0].trim(),
        startDate: '06/2021', endDate: 'Hiện tại', description: 'Automation testing dự án quốc tế.' }]
    });

    // F. CVDocumentVersions
    const vIns = await executeQuery(
      'INSERT INTO CVDocumentVersions(CVID,ProfileID,VersionNumber,ContentHash,SourceType,OriginalName,Status,ConfirmedJson,ConfirmedAt) OUTPUT INSERTED.VersionID VALUES(@CVID,@ProfileID,@VersionNumber,@ContentHash,@SourceType,@OriginalName,@Status,@ConfirmedJson,SYSUTCDATETIME())',
      {
        CVID: cvId, ProfileID: profileId, VersionNumber: 1,
        ContentHash: crypto.createHash('sha256').update(confirmedJson).digest('hex'),
        SourceType: 'builder', OriginalName: cvName, Status: 'Ready', ConfirmedJson: confirmedJson
      }
    );
    const versionId = vIns.recordset[0].VersionID;

    // G. Evaluate screening
    const candidateContext = {
      version: { VersionNumber: 1, Status: 'Ready' },
      data: JSON.parse(confirmedJson)
    };
    const eval_ = screeningService.evaluateScreening(candidateContext, criteriaData, requiredSkills);
    summary[eval_.resultGroup] = (summary[eval_.resultGroup] || 0) + 1;

    // H. AppliedAt timestamp
    const appliedAt = new Date();
    appliedAt.setDate(appliedAt.getDate() - c.daysAgo);
    appliedAt.setHours(9 + (idx % 8), (idx * 7) % 60, 0, 0);

    // I. JobApplications
    const aIns = await executeQuery(
      `INSERT INTO JobApplications(JobID,ProfileID,CVID,CVVersionID,MatchScore,Status,AppliedAt,
         ScreeningResultGroup,ScreeningScore,ScreeningDetailsJson,CriteriaVersion)
       OUTPUT INSERTED.ApplicationID
       VALUES(@JobID,@ProfileID,@CVID,@CVVersionID,@MatchScore,@Status,@AppliedAt,
         @ScreeningResultGroup,@ScreeningScore,@ScreeningDetailsJson,@CriteriaVersion)`,
      {
        JobID: JOB_ID, ProfileID: profileId, CVID: cvId, CVVersionID: versionId,
        MatchScore: eval_.screeningScore, Status: c.status, AppliedAt: appliedAt,
        ScreeningResultGroup: eval_.resultGroup, ScreeningScore: eval_.screeningScore,
        ScreeningDetailsJson: JSON.stringify(eval_), CriteriaVersion: 1
      }
    );
    const applicationId = aIns.recordset[0].ApplicationID;

    // J. Interview (if any)
    if (c.interview) {
      const iDate = new Date();
      iDate.setDate(iDate.getDate() + c.interview.daysFromNow);
      iDate.setHours(c.interview.type === 'Offline' ? 9 : 14, 30, 0, 0);
      await executeQuery(
        'INSERT INTO Interviews(ApplicationID,InterviewDate,InterviewType,LocationOrLink,Notes,Status,Version) VALUES(@ApplicationID,@InterviewDate,@InterviewType,@LocationOrLink,@Notes,@Status,@Version)',
        { ApplicationID: applicationId, InterviewDate: iDate, InterviewType: c.interview.type,
          LocationOrLink: c.interview.location, Notes: c.interview.notes, Status: 'Scheduled', Version: 1 }
      );
    }

    // K. Pre-cached AIDeepReview
    if (DEEP_REVIEWS[c.n]) {
      const dr = DEEP_REVIEWS[c.n];
      await executeQuery(
        'INSERT INTO AIDeepReviews(ApplicationID,CVVersionID,CriteriaVersion,Summary,DetailsJson) VALUES(@ApplicationID,@CVVersionID,@CriteriaVersion,@Summary,@DetailsJson)',
        { ApplicationID: applicationId, CVVersionID: versionId, CriteriaVersion: 1,
          Summary: dr.summary, DetailsJson: JSON.stringify(dr.details) }
      );
    }

    if (idx % 10 === 0) console.log(`  ${idx}/50 candidates created...`);
  }

  console.log('═══ SEEDING COMPLETE ═══');
  console.log('Total applications:', CANDIDATES.length);
  console.log('Distribution:', summary);
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
