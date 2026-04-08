// =====================================================
// 아웃라인 편집기 루트 컴포넌트
// dnd-kit DnD + 다중 선택(드래그) + Tab 일괄 들여쓰기
// 포커스(줌인) 뷰 + 브레드크럼 + 우클릭 컨텍스트 메뉴
// =====================================================

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useDocumentStore, useActiveDocument } from '../../store/documentStore'
import { OutlineNode } from './OutlineNode'
import {
  removeNode,
  insertNodeAt,
  findNode,
  getRangeSelectedIds,
  findAncestorPath,
  filterTopLevelSelected,
} from '../../utils/nodeUtils'
import type { OutlineNode as OutlineNodeType } from '../../types'
import { SelectionContext } from './SelectionContext'
import { ContextMenu } from './ContextMenu'

export function OutlineEditor() {
  const doc = useActiveDocument()
  const {
    searchQuery,
    tagFilter,
    setSelectedNode,
    multiSelectedIds,
    setMultiSelected,
    clearMultiSelected,
    bulkIndent,
    bulkOutdent,
    focusedNodeId,
    setFocusedNode,
    addFirstNode,
    pasteNodes,
  } = useDocumentStore()

  // dnd-kit 드래그 상태
  const [activeId, setActiveId] = useState<string | null>(null)

  // 다중 선택 드래그 상태 (ref: 리렌더 없이 추적)
  const isSelectingRef = useRef(false)
  const anchorIdRef = useRef<string | null>(null)

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    x: number
    y: number
  } | null>(null)

  // 컨텍스트 메뉴에서 노트 열기 요청: 해당 nodeId의 OutlineNode가 감지하여 노트를 열도록
  const [noteOpenRequestId, setNoteOpenRequestId] = useState<string | null>(null)

  // ─── dnd-kit 센서 ───
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const allNodes = doc?.nodes ?? []

  // ─── 포커스 뷰: 특정 노드의 자식만 표시 ───
  const focusedNode = focusedNodeId ? findNode(allNodes, focusedNodeId) : null
  const focusedChildren = focusedNode?.children ?? null

  // 태그 필터 + 포커스 뷰 통합
  const sourceNodes = focusedChildren ?? allNodes
  const nodes = tagFilter
    ? sourceNodes.filter((n) =>
        n.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      )
    : sourceNodes

  // 포커스 뷰 브레드크럼 경로 (루트 → 포커스 노드)
  const breadcrumbPath = focusedNodeId
    ? (findAncestorPath(allNodes, focusedNodeId) ?? [])
    : []

  const activeNode = activeId ? findNode(allNodes, activeId) : null

  // ─── 다중 선택: 마우스 이벤트 핸들러 ───

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return
      isSelectingRef.current = true
      anchorIdRef.current = nodeId
      setMultiSelected([nodeId])
    },
    [setMultiSelected]
  )

  const handleNodeMouseEnter = useCallback(
    (nodeId: string) => {
      if (!isSelectingRef.current || !anchorIdRef.current) return
      const range = getRangeSelectedIds(allNodes, anchorIdRef.current, nodeId)
      setMultiSelected(range)
    },
    [allNodes, setMultiSelected]
  )

  // ─── 우클릭 컨텍스트 메뉴 ───

  const handleNodeContextMenu = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault()
      setContextMenu({ nodeId, x: e.clientX, y: e.clientY })
    },
    []
  )

  // ─── 줌인 (포커스 뷰 진입) ───

  const handleNodeFocusIn = useCallback(
    (nodeId: string) => {
      setFocusedNode(nodeId)
      clearMultiSelected()
    },
    [setFocusedNode, clearMultiSelected]
  )

  // 드래그 선택이 방금 끝났는지 추적
  const dragSelectEndedRef = useRef(false)

  // 복사된 노드 저장 (내부 클립보드)
  const clipboardRef = useRef<OutlineNodeType[]>([])

  // ─── 전역 마우스업 → 선택 종료 ───
  useEffect(() => {
    function onMouseUp() {
      if (isSelectingRef.current && useDocumentStore.getState().multiSelectedIds.length > 1) {
        dragSelectEndedRef.current = true
      }
      isSelectingRef.current = false
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  const checkAndConsumeDragSelectEnd = useCallback(() => {
    if (dragSelectEndedRef.current) {
      dragSelectEndedRef.current = false
      return true
    }
    return false
  }, [])

  // ─── 노드 없을 때 Enter → 첫 노드 생성 ───
  useEffect(() => {
    if (nodes.length > 0) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        addFirstNode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nodes.length, addFirstNode])

  // ─── 다중 선택 중 Tab/Shift+Tab + Ctrl+C 전역 키 핸들러 ───
  useEffect(() => {
    if (multiSelectedIds.length <= 1) return

    function onKeyDown(e: KeyboardEvent) {
      // Tab 들여쓰기/내어쓰기
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          bulkOutdent()
        } else {
          bulkIndent()
        }
        return
      }

      // Ctrl+C: 선택된 노드 복사
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // contentEditable에서 텍스트 선택 중이면 기본 동작 유지
        const activeEl = document.activeElement
        if (activeEl instanceof HTMLElement && activeEl.isContentEditable) return

        e.preventDefault()
        const allNodes = useDocumentStore.getState().documents.find(
          (d) => d.id === useDocumentStore.getState().activeDocumentId
        )?.nodes ?? []

        const selectedSet = new Set(multiSelectedIds)
        const topLevelIds = filterTopLevelSelected(allNodes, selectedSet)
        clipboardRef.current = topLevelIds
          .map((id) => findNode(allNodes, id))
          .filter((n): n is OutlineNodeType => n !== null)

        // 시스템 클립보드에 텍스트도 복사
        const text = clipboardRef.current.map((n) => n.content).join('\n')
        navigator.clipboard.writeText(text).catch(() => {})
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [multiSelectedIds, bulkIndent, bulkOutdent])

  // ─── Ctrl+V: 클립보드 노드 붙여넣기 (항상 활성) ───
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'v') return
      if (clipboardRef.current.length === 0) return

      // contentEditable에서 일반 텍스트 붙여넣기는 기본 동작 유지
      const activeEl = document.activeElement
      if (activeEl instanceof HTMLElement && activeEl.isContentEditable) return

      e.preventDefault()
      const state = useDocumentStore.getState()
      const afterId =
        state.multiSelectedIds[state.multiSelectedIds.length - 1] ??
        state.selectedNodeId ??
        null
      pasteNodes(clipboardRef.current, afterId)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pasteNodes])

  // ─── dnd-kit 이벤트 ───

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    clearMultiSelected()
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    useDocumentStore.getState().pushHistory()

    const currentNodes = useDocumentStore.getState().documents.find(
      (d) => d.id === useDocumentStore.getState().activeDocumentId
    )?.nodes ?? []

    const { nodes: withoutDragged, removed } = removeNode(currentNodes, active.id as string)
    if (!removed) return

    const updated = insertNodeAt(withoutDragged, over.id as string, removed, 'after')

    useDocumentStore.setState((state) => {
      const doc = state.documents.find((d) => d.id === state.activeDocumentId)
      if (doc) {
        doc.nodes = updated
        doc.updatedAt = Date.now()
      }
    })
  }

  // ─── 빈 영역 클릭 → 선택 전부 해제 ───
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      setSelectedNode(null)
      clearMultiSelected()
    }
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">문서를 선택하거나 새로 만드세요</p>
          <p className="text-sm">왼쪽 사이드바에서 문서를 선택하세요</p>
        </div>
      </div>
    )
  }

  return (
    <SelectionContext.Provider value={{
      onNodeMouseDown: handleNodeMouseDown,
      onNodeMouseEnter: handleNodeMouseEnter,
      onNodeContextMenu: handleNodeContextMenu,
      onNodeFocusIn: handleNodeFocusIn,
      noteOpenRequestId,
      checkAndConsumeDragSelectEnd,
    }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="h-full overflow-y-auto px-4 py-4 md:px-8 md:py-6 select-none"
          onClick={handleBackdropClick}
        >
          {/* ─── 포커스 뷰 브레드크럼 ─── */}
          {focusedNodeId && breadcrumbPath.length > 0 && (
            <div className="mb-4 flex items-center gap-1 flex-wrap">
              {/* 문서 루트로 돌아가기 */}
              <button
                onClick={() => setFocusedNode(null)}
                className="
                  text-xs text-primary-500 hover:text-primary-700
                  dark:text-primary-400 dark:hover:text-primary-300
                  hover:underline transition-colors
                "
              >
                {doc.title || '문서'}
              </button>

              {breadcrumbPath.map((ancestor, i) => {
                const isLast = i === breadcrumbPath.length - 1
                return (
                  <span key={ancestor.id} className="flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
                      className="text-gray-400 flex-shrink-0">
                      <path d="M2 1l4 3-4 3V1z" />
                    </svg>
                    {isLast ? (
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 max-w-[200px] truncate">
                        {ancestor.content || '(빈 항목)'}
                      </span>
                    ) : (
                      <button
                        onClick={() => setFocusedNode(ancestor.id)}
                        className="
                          text-xs text-primary-500 hover:text-primary-700
                          dark:text-primary-400 dark:hover:text-primary-300
                          hover:underline transition-colors max-w-[120px] truncate
                        "
                      >
                        {ancestor.content || '(빈 항목)'}
                      </button>
                    )}
                  </span>
                )
              })}

              {/* 포커스 뷰 탈출 버튼 */}
              <button
                onClick={() => setFocusedNode(null)}
                className="
                  ml-2 text-xs px-2 py-0.5 rounded-full
                  bg-gray-100 dark:bg-gray-700
                  text-gray-500 dark:text-gray-400
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  transition-colors
                "
              >
                ✕ 포커스 해제
              </button>
            </div>
          )}

          {/* ─── 검색 결과 안내 ─── */}
          {searchQuery && (
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                "{searchQuery}" 검색 결과
              </span>
            </div>
          )}

          {/* ─── 다중 선택 안내 배너 ─── */}
          {multiSelectedIds.length > 1 && (
            <div className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v2H2zm2 4h8v2H4zm2 4h4v2H6z" />
              </svg>
              <span>{multiSelectedIds.length}개 항목 선택됨</span>
              <span className="text-blue-400 dark:text-blue-500">— Tab 들여쓰기 / Shift+Tab 내어쓰기</span>
              <button
                onClick={(e) => { e.stopPropagation(); clearMultiSelected() }}
                className="ml-auto text-blue-400 hover:text-blue-600"
              >✕</button>
            </div>
          )}

          <SortableContext
            items={nodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            {nodes.map((node) => (
              <OutlineNode
                key={node.id}
                node={node}
                depth={0}
                searchQuery={searchQuery}
              />
            ))}
          </SortableContext>

          {nodes.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center mt-8">
              {focusedNodeId
                ? '이 항목에는 자식 노드가 없습니다. Enter 키로 추가하세요.'
                : 'Enter 키를 눌러 첫 항목을 추가하세요'}
            </p>
          )}

          <div className="h-32" onClick={handleBackdropClick} />
        </div>

        <DragOverlay>
          {activeNode && (
            <div className="bg-white dark:bg-gray-800 border border-primary-300 rounded-md shadow-lg px-3 py-1.5 text-sm opacity-90">
              {activeNode.content || '(빈 항목)'}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ─── 우클릭 컨텍스트 메뉴 ─── */}
      {contextMenu && (
        <ContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenNote={() => {
            // 해당 nodeId의 OutlineNode가 useEffect로 감지하여 노트를 열도록 요청
            setNoteOpenRequestId(contextMenu.nodeId)
            setContextMenu(null)
            // 짧은 딜레이 후 요청 초기화 (한 번만 발동)
            setTimeout(() => setNoteOpenRequestId(null), 300)
          }}
          onFocusIn={() => {
            handleNodeFocusIn(contextMenu.nodeId)
            setContextMenu(null)
          }}
        />
      )}
    </SelectionContext.Provider>
  )
}
