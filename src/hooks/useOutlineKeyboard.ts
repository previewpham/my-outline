// =====================================================
// 아웃라인 편집기 키보드 단축키 훅
// Enter, Tab, Shift+Tab, Shift+Enter, Ctrl+Z 처리
// =====================================================

import { useCallback } from 'react'
import { useDocumentStore } from '../store/documentStore'

interface UseOutlineKeyboardOptions {
  nodeId: string
  onOpenNote?: () => void  // Shift+Enter 시 메모 패널 열기
}

export function useOutlineKeyboard({ nodeId, onOpenNote }: UseOutlineKeyboardOptions) {
  const {
    addNodeAfter,
    deleteNode,
    indentNode,
    outdentNode,
    undo,
  } = useDocumentStore()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Enter: 현재 노드 다음에 새 노드 추가
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        addNodeAfter(nodeId)
        return
      }

      // Shift+Enter: 메모 편집 모드 토글
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        onOpenNote?.()
        return
      }

      // Tab: 들여쓰기
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        indentNode(nodeId)
        return
      }

      // Shift+Tab: 내어쓰기
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        outdentNode(nodeId)
        return
      }

      // Backspace: 내용이 비어있으면 노드 삭제
      if (e.key === 'Backspace') {
        const target = e.currentTarget
        const text = target.textContent ?? ''
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
    },
    [nodeId, addNodeAfter, deleteNode, indentNode, outdentNode, undo, onOpenNote]
  )

  return { handleKeyDown }
}
