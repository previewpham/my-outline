// =====================================================
// 날짜 처리 유틸 (2그룹 기능)
// !(YYYY-MM-DD) 형식 파싱, 포맷, 필터 판정
// =====================================================

/** content에서 !(YYYY-MM-DD) 패턴을 추출하여 날짜 문자열 반환 */
export function parseDateFromContent(content: string): string | null {
  const match = content.match(/!\((\d{4}-\d{2}-\d{2})\)/)
  return match ? match[1] : null
}

/** content 안의 !(날짜)를 새 날짜로 교체하거나 제거 */
export function setDateInContent(content: string, date: string | null): string {
  if (date === null) {
    return content.replace(/\s*!\(\d{4}-\d{2}-\d{2}\)/, '').trim()
  }
  if (/!\(\d{4}-\d{2}-\d{2}\)/.test(content)) {
    return content.replace(/!\(\d{4}-\d{2}-\d{2}\)/, `!(${date})`)
  }
  return `${content} !(${date})`
}

/** 지원하는 날짜 표시 형식 (4번 기능) */
export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD.MM.YYYY' | 'relative'

/** 날짜 문자열을 지정된 형식으로 포맷 */
export function formatDateLabel(dateStr: string, format: DateFormat = 'relative'): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')

  if (format === 'relative') {
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return '오늘'
    if (diff === 1) return '내일'
    if (diff === -1) return '어제'
    if (diff > 1 && diff < 8) return `${diff}일 후`
    if (diff < -1 && diff > -8) return `${Math.abs(diff)}일 전`
    // 범위 벗어나면 절대 날짜로 fallback
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`
  if (format === 'DD.MM.YYYY') return `${d}.${m}.${y}`

  return `${y}-${m}-${d}`
}

/** 날짜의 상태 판정: 지난것/오늘/미래 */
export function getDateStatus(dateStr: string): 'overdue' | 'today' | 'future' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  if (date.getTime() === today.getTime()) return 'today'
  if (date < today) return 'overdue'
  return 'future'
}

export type DateFilter = 'all' | 'today' | 'this-week' | 'overdue'

// =====================================================
// 반복 날짜 파싱 (2번 기능)
// !(매일) !(매주 월요일) !(매월 1일) 형식
// =====================================================

const WEEKDAY_KR: Record<string, number> = {
  '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6,
}
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export type RecurrenceType = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceInfo {
  type: RecurrenceType
  dayOfWeek?: number   // 0=일 ~ 6=토 (weekly)
  dayOfMonth?: number  // 1-31 (monthly)
  label: string        // 한국어 표시 레이블
}

/** content에서 반복 패턴을 파싱 */
export function parseRecurrenceFromContent(content: string): RecurrenceInfo | null {
  // !(매일)
  if (/!\(매일\)/.test(content)) {
    return { type: 'daily', label: '매일' }
  }
  // !(매주 월요일) — 일/월/화/수/목/금/토요일
  const weeklyMatch = content.match(/!\(매주\s+(일|월|화|수|목|금|토)요일\)/)
  if (weeklyMatch) {
    const dayOfWeek = WEEKDAY_KR[weeklyMatch[1]] ?? 1
    return { type: 'weekly', dayOfWeek, label: `매주 ${weeklyMatch[1]}요일` }
  }
  // !(매월 N일)
  const monthlyMatch = content.match(/!\(매월\s+(\d{1,2})일\)/)
  if (monthlyMatch) {
    const dayOfMonth = parseInt(monthlyMatch[1], 10)
    return { type: 'monthly', dayOfMonth, label: `매월 ${dayOfMonth}일` }
  }
  return null
}

/** 오늘 기준으로 다음 반복 날짜를 계산 */
export function getNextRecurrenceDate(recurrence: RecurrenceInfo): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (recurrence.type === 'daily') {
    const next = new Date(today)
    next.setDate(today.getDate() + 1)
    return toDateStr(next)
  }

  if (recurrence.type === 'weekly' && recurrence.dayOfWeek !== undefined) {
    const next = new Date(today)
    const currentDay = today.getDay()
    let diff = (recurrence.dayOfWeek - currentDay + 7) % 7
    if (diff === 0) diff = 7  // 오늘이 해당 요일이면 다음 주
    next.setDate(today.getDate() + diff)
    return toDateStr(next)
  }

  if (recurrence.type === 'monthly' && recurrence.dayOfMonth !== undefined) {
    const next = new Date(today)
    if (today.getDate() >= recurrence.dayOfMonth) {
      next.setMonth(today.getMonth() + 1)
    }
    next.setDate(recurrence.dayOfMonth)
    return toDateStr(next)
  }

  return toDateStr(today)
}

/** 반복 배지에 표시할 다음 날짜 힌트 */
export function formatRecurrenceHint(recurrence: RecurrenceInfo): string {
  const nextDate = getNextRecurrenceDate(recurrence)
  const label = formatDateLabel(nextDate)
  return label  // "내일", "이번 주 화요일", "다음달 1일" 등
}

/** 다음 반복 날짜 힌트 (요일명 포함) */
export function formatNextRecurrenceLabel(recurrence: RecurrenceInfo): string {
  const nextDate = getNextRecurrenceDate(recurrence)
  const date = new Date(nextDate + 'T00:00:00')
  const dayName = WEEKDAY_LABELS[date.getDay()]
  const label = formatDateLabel(nextDate)
  if (label === '내일' || label === '오늘') return label
  return `${label} (${dayName})`
}

/** YYYY-MM-DD 문자열로 변환 */
function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 날짜 문자열이 필터 조건에 해당하는지 판정 */
export function isDateInFilter(dateStr: string, filter: DateFilter): boolean {
  if (filter === 'all') return true

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')

  if (filter === 'today') {
    return date.getTime() === today.getTime()
  }
  if (filter === 'overdue') {
    return date < today
  }
  if (filter === 'this-week') {
    // 이번 주 월요일 ~ 일요일
    const startOfWeek = new Date(today)
    const day = today.getDay()
    startOfWeek.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    return date >= startOfWeek && date <= endOfWeek
  }
  return false
}
