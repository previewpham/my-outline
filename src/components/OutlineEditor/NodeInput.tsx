// =====================================================
// 노드 텍스트 입력 컴포넌트
//
// 기능:
//   - 비편집 모드: 일반 div (크로스 노드 텍스트 선택 가능)
//     → #태그/@태그 인라인 컬러 하이라이트
//     → richText(볼드/이탤릭 HTML) 렌더링
//   - 편집 모드: contentEditable
//     → Ctrl+B 볼드, Ctrl+I 이탤릭
//     → Ctrl+1/2/3 헤딩 레벨 전환
//     → 한글 IME isComposing 체크
// =====================================================

import { useEffect, useRef, useState } from 'react'
import type { HeadingLevel } from '../../types'
import { useDocumentStore } from '../../store/documentStore'
import {
  stripHtml,
  sanitizeRichText,
  textToHighlightedHtml,
  richTextToHighlightedHtml,
} from '../../utils/htmlUtils'

interface NodeInputProps {
  nodeId: string
  content: string
  richText: string
  color: string | null
  completed: boolean
  headingLevel: HeadingLevel
  isSelected: boolean
  onFocus: () => void
}

export function NodeInput({
  nodeId,
  content,
  richText,
  color,
  completed,
  headingLevel,
  isSelected,
  onFocus,
}: NodeInputProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const {
    updateNodeContent,
    updateNodeRichText,
    addNodeAfter,
    deleteNode,
    setNodeHeading,
    indentNode: indent,
    outdentNode: outdent,
    undo,
    multiSelectedIds,
    bulkIndent,
    bulkOutdent,
  } = useDocumentStore()

  // isSelected가 true가 되면 즉시 편집 모드 진입 (새 노드 추가 시)
  useEffect(() => {
    if (isSelected) setIsEditing(true)
  }, [isSelected])

  // 편집 모드 진입 시: innerHTML 초기화 + 포커스
  useEffect(() => {
    if (!isEditing) return
    const el = divRef.current
    if (!el) return

    // richText가 있으면 HTML로, 없으면 plain text로 초기화
    el.innerHTML = richText || escapeHtml(content)
    el.focus()

    // 커서를 텍스트 끝으로 이동
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [isEditing])

  // 편집 중 내용 변경 시 content(순수 텍스트) + richText(HTML) 동기화
  function handleInput() {
    const el = divRef.current
    if (!el) return
    const html = sanitizeRichText(el.innerHTML)
    const plain = stripHtml(html)
    updateNodeContent(nodeId, plain)   // 태그 파싱·검색용 plain text 저장
    updateNodeRichText(nodeId, html)   // 서식 보존용 HTML 저장
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // 한글 IME 조합 중에는 단축키 무시
    if (e.nativeEvent.isComposing || e.key === 'Process') return

    // Enter: 다음 형제 노드 추가
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      addNodeAfter(nodeId)
      return
    }

    // Tab: 들여쓰기
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      multiSelectedIds.length > 1 ? bulkIndent() : indent(nodeId)
      return
    }

    // Shift+Tab: 내어쓰기
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      multiSelectedIds.length > 1 ? bulkOutdent() : outdent(nodeId)
      return
    }

    // Backspace: 빈 노드 삭제
    if (e.key === 'Backspace') {
      const text = divRef.current?.textContent ?? ''
      if (text === '') {
        e.preventDefault()
        deleteNode(nodeId)
        return
      }
    }

    // Ctrl+Z / Cmd+Z: 실행취소
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }

    // ─── 서식 단축키 ───

    // Ctrl+B: 볼드
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      document.execCommand('bold')
      handleInput() // DOM 변경 후 스토어 동기화
      return
    }

    // Ctrl+I: 이탤릭
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      document.execCommand('italic')
      handleInput()
      return
    }

    // Ctrl+U: 밑줄
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault()
      document.execCommand('underline')
      handleInput()
      return
    }

    // Ctrl+1/2/3: 헤딩 레벨 전환
    if ((e.ctrlKey || e.metaKey) && (e.key === '1' || e.key === '2' || e.key === '3')) {
      e.preventDefault()
      const level = Number(e.key) as 1 | 2 | 3
      // 이미 같은 레벨이면 일반 텍스트로 토글
      setNodeHeading(nodeId, headingLevel === level ? null : level)
      return
    }

    // Ctrl+0: 헤딩 해제 (일반 텍스트)
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault()
      setNodeHeading(nodeId, null)
      return
    }
  }

  // ─── 스타일 계산 ───

  const textStyle: React.CSSProperties = {
    color: color ?? undefined,
    textDecoration: completed ? 'line-through' : undefined,
    opacity: completed ? 0.5 : 1,
  }

  // 헤딩 레벨별 폰트 클래스
  const headingClass = getHeadingClass(headingLevel)
  const baseClass = `flex-1 min-w-0 break-words leading-relaxed text-gray-900 dark:text-gray-100 ${headingClass}`

  // ─── 비편집 모드 렌더링 ───
  if (!isEditing) {
    // 표시할 HTML 생성: richText 있으면 서식 보존, 없으면 plain text에 태그 하이라이트
    const displayHtml = richText
      ? richTextToHighlightedHtml(richText)
      : textToHighlightedHtml(content)

    return (
      <div
        className={`${baseClass} cursor-text whitespace-pre-wrap`}
        style={textStyle}
        dangerouslySetInnerHTML={{ __html: displayHtml || '<span style="color:#d1d5db">항목 입력...</span>' }}
        onClick={() => { onFocus(); setIsEditing(true) }}
      />
    )
  }

  // ─── 편집 모드 렌더링 ───
  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={() => setIsEditing(false)}
      className={`${baseClass} outline-none whitespace-pre-wrap`}
      style={textStyle}
    />
  )
}

// ─── 헬퍼 함수 ───

/** 헤딩 레벨에 맞는 Tailwind 폰트 클래스 반환 */
function getHeadingClass(level: HeadingLevel): string {
  switch (level) {
    case 1: return 'text-2xl font-bold'
    case 2: return 'text-xl font-semibold'
    case 3: return 'text-base font-semibold'
    default: return 'text-sm md:text-base font-normal'
  }
}

/** 텍스트의 <, > 등 HTML 특수문자 이스케이프 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
