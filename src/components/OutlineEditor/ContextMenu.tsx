// =====================================================
// 우클릭 컨텍스트 메뉴 컴포넌트
//
// 기능:
//   - 줌인(포커스 뷰) 진입
//   - 텍스트 복사
//   - 완료 토글
//   - 노드 삭제
//   - 헤딩 레벨 변경 (H1/H2/H3/본문)
//   - 색상 변경
//   - 메모 토글
// =====================================================

import { useEffect, useRef } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import { findNode } from '../../utils/nodeUtils'
import { NODE_COLORS } from '../../types'
import type { HeadingLevel } from '../../types'

interface ContextMenuProps {
  nodeId: string
  x: number
  y: number
  onClose: () => void
  onOpenNote: () => void
  onFocusIn: () => void
}

export function ContextMenu({ nodeId, x, y, onClose, onOpenNote, onFocusIn }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    deleteNode,
    setNodeColor,
    setNodeHeading,
    toggleNodeComplete,
  } = useDocumentStore()

  // 현재 노드 데이터 읽기
  const node = useDocumentStore((s) => {
    const doc = s.documents.find((d) => d.id === s.activeDocumentId)
    if (!doc) return null
    return findNode(doc.nodes, nodeId)
  })

  // ─── 뷰포트 밖으로 나가지 않도록 위치 조정 ───
  const adjustedX = Math.min(x, window.innerWidth - 180)
  const adjustedY = Math.min(y, window.innerHeight - 360)

  // 외부 클릭 / ESC 키 → 닫기
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    // mousedown이 아닌 capture 단계에서 처리해야 외부 클릭 정확히 감지
    document.addEventListener('mousedown', handleMouseDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  if (!node) return null

  function handleCopy() {
    navigator.clipboard.writeText(node!.content).catch(() => {})
    onClose()
  }

  function handleToggleComplete() {
    toggleNodeComplete(nodeId)
    onClose()
  }

  function handleSetHeading(level: HeadingLevel) {
    setNodeHeading(nodeId, level)
    onClose()
  }

  function handleSetColor(color: string | null) {
    setNodeColor(nodeId, color)
    onClose()
  }

  function handleDelete() {
    deleteNode(nodeId)
    onClose()
  }

  function handleNote() {
    onOpenNote()
    onClose()
  }

  function handleFocusIn() {
    onFocusIn()
    onClose()
  }

  const currentHeading = node.headingLevel ?? null

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: adjustedX, top: adjustedY, zIndex: 9999 }}
      className="
        w-44 bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-xl py-1
        text-sm select-none
      "
      // 컨텍스트 메뉴 자체의 우클릭은 브라우저 메뉴 차단
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 줌인 (포커스 뷰) */}
      <MenuItem
        icon="🔍"
        label="포커스 뷰로"
        onClick={handleFocusIn}
      />

      {/* 복사 */}
      <MenuItem
        icon="📋"
        label="텍스트 복사"
        onClick={handleCopy}
      />

      {/* 완료 토글 */}
      <MenuItem
        icon={node.completed ? '↩️' : '✅'}
        label={node.completed ? '완료 해제' : '완료 표시'}
        onClick={handleToggleComplete}
      />

      {/* 메모 */}
      <MenuItem
        icon="📝"
        label="메모 편집"
        onClick={handleNote}
      />

      <Divider />

      {/* 헤딩 레벨 */}
      <div className="px-2 pt-1 pb-0.5">
        <span className="text-xs text-gray-400 dark:text-gray-500 px-1">헤딩 스타일</span>
        <div className="flex gap-1 mt-1">
          {([null, 1, 2, 3] as HeadingLevel[]).map((level) => {
            const label = level === null ? '본문' : `H${level}`
            const isActive = currentHeading === level
            return (
              <button
                key={label}
                onClick={() => handleSetHeading(level)}
                className={`
                  flex-1 text-xs py-1 rounded font-medium transition-colors
                  ${isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Divider />

      {/* 색상 */}
      <div className="px-2 pt-1 pb-1.5">
        <span className="text-xs text-gray-400 dark:text-gray-500 px-1">색상</span>
        <div className="flex flex-wrap gap-1 mt-1 px-1">
          {NODE_COLORS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleSetColor(value)}
              title={label}
              className={`
                w-5 h-5 rounded-full border-2 transition-transform hover:scale-110
                ${node.color === value ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent'}
              `}
              style={{ backgroundColor: value ?? '#e5e7eb' }}
            />
          ))}
        </div>
      </div>

      <Divider />

      {/* 삭제 */}
      <button
        onClick={handleDelete}
        className="
          w-full text-left px-3 py-1.5 flex items-center gap-2
          text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
          rounded transition-colors
        "
      >
        <span>🗑</span>
        <span>삭제</span>
      </button>
    </div>
  )
}

// ─── 헬퍼 UI 컴포넌트 ───

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        w-full text-left px-3 py-1.5 flex items-center gap-2
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-700
        rounded transition-colors
      "
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function Divider() {
  return <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
}
