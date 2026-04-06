// =====================================================
// #태그, @태그 파싱 유틸
// =====================================================

/** 텍스트에서 #태그와 @태그를 추출 */
export function parseTags(content: string): string[] {
  const tagRegex = /[#@][\w가-힣]+/g
  const matches = content.match(tagRegex)
  return matches ? [...new Set(matches)] : []
}

/** 태그 유형 판별 */
export function getTagType(tag: string): 'hash' | 'mention' {
  return tag.startsWith('#') ? 'hash' : 'mention'
}

/** 텍스트에서 태그를 하이라이트된 HTML로 변환 (렌더링용) */
export function highlightTags(content: string): string {
  return content.replace(
    /([#@])([\w가-힣]+)/g,
    (_, prefix, name) => {
      const color = prefix === '#' ? 'text-blue-500' : 'text-green-500'
      return `<span class="${color} font-medium">${prefix}${name}</span>`
    }
  )
}

/** 태그로 노드 필터링 */
export function matchesTagFilter(tags: string[], filterTag: string): boolean {
  if (!filterTag) return true
  return tags.some((t) => t.toLowerCase() === filterTag.toLowerCase())
}

/** 노드 트리에서 모든 고유 태그를 수집 */
export function collectAllTags(nodes: { tags: string[]; children: unknown[] }[]): string[] {
  const set = new Set<string>()
  function walk(arr: { tags: string[]; children: unknown[] }[]) {
    for (const node of arr) {
      node.tags.forEach((t) => set.add(t))
      walk(node.children as { tags: string[]; children: unknown[] }[])
    }
  }
  walk(nodes)
  return [...set].sort()
}
