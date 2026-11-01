const { aliases, fold } = require('./cvNormalization');

// Curated provider pages checked 2026-11-01. Prices, ratings and certificates
// are deliberately not copied: the provider remains the source of truth.
const catalogue = [
  ['Tailwind CSS From Scratch', 'Udemy · Brad Traversy', 'https://www.udemy.com/course/tailwind-from-scratch/', 'en', ['Tailwind CSS', 'Tailwind']],
  ['Communication Skills for University Success', 'Coursera · University of Sydney', 'https://www.coursera.org/learn/communication-skills', 'en', ['Communication', 'Communication Skills', 'Giao tiếp', 'Kỹ năng giao tiếp']],
  ['Đào tạo Microsoft Azure', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/azure/', 'en', ['Azure Cloud', 'Azure', 'Microsoft Azure'], 'catalog'],
  ['Các khóa học Redis University', 'Redis University', 'https://university.redis.io/', 'en', ['Redis'], 'catalog'],
  ['Google UX Design Professional Certificate', 'Coursera · Google', 'https://www.coursera.org/professional-certificates/google-ux-design', 'en', ['UI/UX (Figma)', 'Figma', 'UI/UX', 'UX Design']],
  ['Introduction to Containers with Docker, Kubernetes & OpenShift', 'Coursera · IBM', 'https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift', 'en', ['Docker', 'Kubernetes', 'OpenShift']],
  ['Introduction to Git and GitHub', 'Coursera · Google', 'https://www.coursera.org/learn/introduction-git-github', 'en', ['Git', 'GitHub']],
  ['Generative AI with Large Language Models', 'Coursera · DeepLearning.AI / AWS', 'https://www.coursera.org/learn/generative-ai-with-llms', 'en', ['Generative AI / LLM', 'Generative AI', 'LLM']],
  ['Java Programming: Solving Problems with Software', 'Coursera · Duke University', 'https://www.coursera.org/learn/java-programming', 'en', ['Java', 'Java / Spring Boot']],
  ['JavaScript cơ bản', 'F8', 'https://f8.edu.vn/courses/javascript-co-ban', 'vi', ['JavaScript']],
  ['JavaScript nâng cao', 'F8', 'https://f8.edu.vn/courses/javascript-nang-cao', 'vi', ['JavaScript']],
  ['Xây dựng website với ReactJS', 'F8', 'https://f8.edu.vn/courses/reactjs', 'vi', ['React.js']],
  ['Node & ExpressJS', 'F8', 'https://f8.edu.vn/courses/nodejs', 'vi', ['Node.js', 'Express.js', 'MongoDB', 'REST API', 'RESTful API']],
  ['HTML CSS từ Zero đến Hero', 'F8', 'https://f8.edu.vn/courses/html-css', 'vi', ['HTML', 'CSS', 'HTML/CSS', 'HTML5', 'CSS3']],
  ['Lập trình Python cơ bản', 'How Kteam', 'https://howkteam.vn/course/lap-trinh-python-co-ban-37', 'vi', ['Python']],
  ['Full Stack Open', 'University of Helsinki', 'https://fullstackopen.com/en/', 'en', ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'GraphQL']],
  ['Full Stack Open: TypeScript', 'University of Helsinki', 'https://fullstackopen.com/en/part9/', 'en', ['TypeScript']],
  ['Relational Database', 'freeCodeCamp', 'https://www.freecodecamp.org/learn/relational-database', 'en', ['PostgreSQL', 'SQL', 'Git', 'Bash']],
  ['Query and modify data with Transact-SQL', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/paths/get-started-querying-with-transact-sql/', 'en', ['SQL Server', 'SQL', 'T-SQL']],
  ['Get started with C#, Part 1', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/paths/get-started-c-sharp-part-1/', 'en', ['C#', 'C# / .NET Core', '.NET']],
  ['Programming for Everybody', 'Coursera · University of Michigan', 'https://www.coursera.org/learn/python', 'en', ['Python']],
  ['Supervised Machine Learning', 'Coursera · Stanford / DeepLearning.AI', 'https://www.coursera.org/learn/machine-learning', 'en', ['Machine Learning', 'Python']],
  ['AWS Cloud Practitioner Essentials', 'Coursera · AWS', 'https://www.coursera.org/learn/aws-cloud-practitioner-essentials', 'en', ['AWS Cloud']],
  ['Intro to SQL', 'Kaggle', 'https://www.kaggle.com/learn/intro-to-sql', 'en', ['SQL', 'BigQuery']],
  ['Pandas', 'Kaggle', 'https://www.kaggle.com/learn/pandas', 'en', ['Pandas']],
  ['Fundamentals of Project Planning and Management', 'Coursera · University of Virginia', 'https://www.coursera.org/learn/uva-darden-projects101', 'en', ['Project Management', 'Quản lý dự án']],
  ['Excel Skills for Business: Essentials', 'Coursera · Macquarie University', 'https://www.coursera.org/learn/excel-essentials', 'en', ['Excel', 'Microsoft Excel']],
  ['Foundations of Digital Marketing and E-commerce', 'Coursera · Google', 'https://www.coursera.org/learn/foundations-of-digital-marketing-and-e-commerce', 'en', ['Digital Marketing', 'Marketing', 'E-commerce']]
];

function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
function courseTerms(name) {
  const original = fold(name);
  // React Native is a different subject, not an alias of React for the web.
  if (/\breact\s*(?:\(\s*)?native\b/.test(original)) return [original];
  const plain = original.replace(/\([^)]*\)/g, ' ').replace(/^(?:ky nang|kien thuc|lap trinh)\s+/, '').replace(/\s+/g, ' ').trim();
  const groups = [
    ['express.js', 'expressjs', 'express'], ['rest api', 'restful api', 'rest apis', 'api rest'],
    ['azure cloud', 'azure', 'microsoft azure'], ['tailwind css', 'tailwind'],
    ['communication', 'communication skills', 'giao tiep', 'ky nang giao tiep']
  ];
  return [...new Set([original, plain, ...plain.split(/\s*\/\s*|\s*,\s*|\s*&\s*|\s+va\s+|\s+and\s+/)].filter(Boolean).flatMap(part => {
    const group = groups.find(items => items.includes(part));
    return [...aliases(part), ...(group || []).flatMap(aliases)];
  }))];
}

function recommendations(missingSkills, stored = []) {
  const results = new Map();
  for (const skill of missingSkills) {
    const terms = courseTerms(skill.skillName);
    const curated = catalogue.filter(entry => entry[4].some(tag => courseTerms(tag).some(term => terms.includes(term)))).map((entry, index) => ({
      CourseID: `curated-${index}-${skill.skillId}`, Title: entry[0], Provider: entry[1], Url: entry[2], Language: entry[3],
      IsFree: null, Price: null, CheckedAt: '2026-11-01', Source: 'curated', Kind: entry[5] || 'course'
    }));
    const database = stored.filter(course => Number(course.SkillID) === Number(skill.skillId)).map(course => ({ ...course, Source: 'database', Language: course.Language || 'unknown' }));
    for (const course of [...curated, ...database]) {
      if (!safeUrl(course.Url)) continue;
      const key = course.Url.replace(/\/$/, '').toLowerCase();
      const existing = results.get(key);
      if (existing) {
        if (!existing.skills.some(item => item.skillId === skill.skillId)) existing.skills.push(skill);
      } else results.set(key, { ...course, id: fold(key), skills: [skill] });
    }
  }
  return [...results.values()].sort((a, b) => Number(b.skills.some(s => s.isMandatory)) - Number(a.skills.some(s => s.isMandatory)));
}
function searchSuggestions(missingSkills, recommendedCourses = []) {
  const covered = new Set(recommendedCourses.flatMap(course => course.skills.map(skill => String(skill.skillId))));
  return missingSkills.filter(skill => !covered.has(String(skill.skillId))).map(skill => ({
    skillId: skill.skillId, skillName: skill.skillName,
    links: [
      { provider: 'Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill.skillName)}` },
      { provider: 'Udemy', url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill.skillName)}` }
    ]
  }));
}
module.exports = { recommendations, searchSuggestions, catalogue, safeUrl };
