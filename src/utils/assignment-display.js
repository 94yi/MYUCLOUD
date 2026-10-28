const GROUPS = [
  { key: 'overdue', label: '已截止未交' },
  { key: 'upcoming', label: '近期' },
  { key: 'later', label: '稍后' },
  { key: 'missed', label: '往期未交' },
  { key: 'completed', label: '已完成' },
]

export function groupAssignments(assignments) {
  const groups = GROUPS.map((group) => ({ ...group, assignments: [] }))
  const byKey = new Map(groups.map((group) => [group.key, group]))

  for (const assignment of assignments) {
    let key = 'later'
    if (assignment.isCompleted) key = 'completed'
    else if (assignment.level === 'overdue') key = 'overdue'
    else if (assignment.level === 'missed') key = 'missed'
    else if (['danger', 'warning'].includes(assignment.level)) key = 'upcoming'
    byKey.get(key).assignments.push(assignment)
  }

  return groups.filter((group) => group.assignments.length > 0)
}

export function formatRelativeDeadline(assignment) {
  if (assignment.isCompleted) return '已完成'
  const days = assignment.daysLeft
  if (!Number.isFinite(days)) return '未设置时间'
  if (days < 0) return `已截止 ${Math.abs(days)} 天`
  if (days === 0) return '今天截止'
  if (days === 1) return '明天截止'
  return `还剩 ${days} 天`
}
