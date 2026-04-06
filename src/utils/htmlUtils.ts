// =====================================================
// HTML 처리 유틸
// 태그 인라인 하이라이트, HTML 안전 처리
// =====================================================

/**
 * HTML 태그를 제거하고 순수 텍스트만 반환
 * content 필드(순수 텍스트)와 richText 필드(HTML) 간 동기화에 사용
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
}

/**
 * 사용자 입력 HTML에서 허용된 태그만 남기고 나머지는 제거 (간단 sanitizer)
 * 허용: <b> <strong> <i> <em> <u> <s> <br>
 * 개인 로컬 앱이므로 최소한의 sanitize만 적용
 */
export function sanitizeRichText(html: string): string {
  // script, style, 이벤트 핸들러 속성 제거
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

/**
 * 텍스트에서 #태그와 @태그를 색상 강조 HTML로 변환
 * 비편집 모드에서 dangerouslySetInnerHTML에 사용
 */
export function applyTagHighlightHtml(html: string): string {
  return html.replace(
    /([#@])([\w가-힣]+)/g,
    (_, prefix, name) => {
      const cls = prefix === '#'
        ? 'color:#3b82f6;font-weight:500'   // 파랑 (해시태그)
        : 'color:#22c55e;font-weight:500'   // 초록 (멘션)
      return `<span style="${cls}">${prefix}${name}</span>`
    }
  )
}

/**
 * 일반 텍스트(비 HTML)에서 #태그/@태그를 하이라이트한 HTML 반환
 * richText가 없을 때 사용
 */
export function textToHighlightedHtml(text: string): string {
  // XSS 방지: <, > 먼저 이스케이프
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return applyTagHighlightHtml(escaped)
}

/**
 * richText(HTML)에 태그 하이라이트를 추가로 적용
 * 이미 <b>/<i> 등이 있는 HTML에 #태그 색상을 더함
 */
export function richTextToHighlightedHtml(richText: string): string {
  return applyTagHighlightHtml(richText)
}
