// =====================================================
// 노드 메모(description) 편집 컴포넌트
// Shift+Enter로 토글, 다중 줄 텍스트 지원
// =====================================================

import { useEffect, useRef } from 'react'
import { useDocumentStore } from '../../store/documentStore'

interface NoteEditorProps {
  nodeId: string
  note: string
  isOpen: boolean
  onClose: () => void
}

export function NoteEditor({ nodeId, note, isOpen, onClose }: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { updateNodeNote } = useDocumentStore()

  // 열릴 때 포커스
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Escape로 닫기
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
    // Shift+Enter로 닫기
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="mt-1 ml-1">
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(e) => updateNodeNote(nodeId, e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onClose}
        placeholder="메모를 입력하세요... (Esc 또는 Shift+Enter로 닫기)"
        rows={2}
        className="
          w-full text-sm text-gray-500 dark:text-gray-400
          bg-gray-50 dark:bg-gray-800
          border border-gray-200 dark:border-gray-600
          rounded-md px-2 py-1.5 resize-none
          focus:outline-none focus:ring-1 focus:ring-primary-500
          placeholder-gray-400 dark:placeholder-gray-600
        "
      />
    </div>
  )
}
