// The core lists render as soon as they arrive. Only enrichment needs both.
export function loadStudySections({ courses, assignments, activities, courseMap, applyCourseMap, reviews }) {
  const courseList = courses()
  const assignmentList = assignments()
  const activityList = courseList.then(activities)
  const enrichment = Promise.all([courseList, assignmentList])
    .then(([records]) => courseMap(records))
    .then(applyCourseMap)
  const reviewList = assignmentList.then(reviews)
  return Promise.allSettled([courseList, assignmentList, activityList, enrichment, reviewList])
}
