// Keep usable catalogue results while AI adds a deeper interpretation.
export function buildLearning(analysis, ai) {
  const ready = ai?.status === 'Ready';
  const identified = new Set((ready ? ai.requirements || [] : []).filter(skill => skill.status === 'matched').map(skill => String(skill.skillId)));
  const learningMap = new Map((analysis?.missingSkills || []).filter(skill => !identified.has(String(skill.skillId))).map(skill => [String(skill.skillId), skill]));
  for (const skill of ready ? ai.learningPriorities || [] : []) learningMap.set(String(skill.skillId), skill);
  const learning = [...learningMap.values()];
  const coursesByUrl = new Map();
  for (const course of [...(analysis?.recommendedCourses || []), ...(ready ? ai.recommendedCourses || [] : [])]) {
    const skills = (course.skills || []).filter(skill => learningMap.has(String(skill.skillId)));
    if (!skills.length) continue;
    const key = (course.Url || course.id).replace(/\/$/, '').toLowerCase();
    const old = coursesByUrl.get(key);
    const merged = new Map([...(old?.skills || []), ...skills].map(skill => [String(skill.skillId), skill]));
    coursesByUrl.set(key, { ...old, ...course, skills: [...merged.values()] });
  }
  const courses = [...coursesByUrl.values()];
  const covered = new Set(courses.flatMap(course => course.skills.map(skill => String(skill.skillId))));
  const searches = learning.filter(skill => !covered.has(String(skill.skillId))).map(skill => ({ ...skill, links: [
    { provider: 'Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill.skillName)}` },
    { provider: 'Udemy', url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill.skillName)}` }
  ] }));
  return { learning, courses, searches };
}
