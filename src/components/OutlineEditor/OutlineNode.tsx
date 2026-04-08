// =====================================================
// 아웃라인 단일 노드 컴포넌트 (재귀 렌더링)
// 체크박스, 접기/펼치기, 드래그 핸들, 다중 선택 하이라이트 포함
// =====================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { OutlineNode as NodeType } from '../../types'
import { NODE_COLORS } from '../../types'
import { useDocumentStore } from '../../store/documentStore'
import type { HeadingLevel } from '../../types'
import { NodeInput } from './NodeInput'
import { NoteEditor } from './NoteEditor'
import { Lightbox } from './Lightbox'
import { useSelectionContext } from './SelectionContext'
import { processImageFile } from '../../utils/imageUtils'

interface OutlineNodeProps {
  node: NodeType
  depth: number
  searchQuery: string
}

export function OutlineNode({ node, depth, searchQuery }: OutlineNodeProps) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  // 라이트박스: 열린 이미지 인덱스 (null=닫힘)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // 이미지 업로드 중 로딩 상태
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    selectedNodeId,
    setSelectedNode,
    toggleNodeCollapse,
    toggleNodeComplete,
    setNodeColor,
    setNodeHeading,
    deleteNode,
    addNodeImage,
    removeNodeImage,
    multiSelectedIds,
    clearMultiSelected,
    focusMode,
  } = useDocumentStore()

  // 이미지 배열 (images 필드가 없는 구 데이터도 안전하게 처리)
  const images = node.images ?? []

  // 선택 컨텍스트 (OutlineEditor에서 제공)
  const { onNodeMouseDown, onNodeMouseEnter, onNodeContextMenu, onNodeFocusIn, noteOpenRequestId, checkAndConsumeDragSelectEnd } = useSelectionContext()

  // 컨텍스트 메뉴에서 "메모 편집" 클릭 시 이 노드의 노트를 자동으로 열기
  useEffect(() => {
    if (noteOpenRequestId === node.id) {
      setNoteOpen(true)
    }
  }, [noteOpenRequestId, node.id])

  // 이미지 파일 선택 처리
  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setImageUploading(true)
    try {
      for (const file of Array.from(files)) {
        const image = await processImageFile(file)
        addNodeImage(node.id, image)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '이미지 업로드 실패')
    } finally {
      setImageUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 드래그앤드롭 이미지 업로드
  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    handleImageFiles(e.dataTransfer.files)
  }

  const isSelected = selectedNodeId === node.id
  // 다중 선택 여부
  const isMultiSelected = multiSelectedIds.includes(node.id)
  const hasChildren = node.children.length > 0

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const matchesSearch = searchQuery
    ? node.content.toLowerCase().includes(searchQuery.toLowerCase())
    : false

  const handleSelect = useCallback(() => {
    // 드래그 선택이 방금 끝난 경우 → 선택 유지 (해제하지 않음)
    if (checkAndConsumeDragSelectEnd()) return
    setSelectedNode(node.id)
    // 편집 포커스를 잡으면 다중 선택은 해제
    if (multiSelectedIds.length > 0) clearMultiSelected()
  }, [node.id, setSelectedNode, multiSelectedIds.length, clearMultiSelected, checkAndConsumeDragSelectEnd])

  const indentPx = Math.min(depth * 20, 300)

  // ─── 노드 행 배경 클래스 결정 ───
  // 우선순위: 다중선택 > 검색 하이라이트 > 편집 선택 > hover
  let rowBg = 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
  if (isMultiSelected) {
    rowBg = 'bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-400 dark:border-blue-500'
  } else if (matchesSearch) {
    rowBg = 'bg-yellow-50 dark:bg-yellow-900/20'
  } else if (isSelected) {
    rowBg = 'bg-primary-50 dark:bg-primary-900/20'
  }

  // 집중 모드: 선택되지 않은 노드는 흐리게
  const dimmed = focusMode && !isSelected && multiSelectedIds.length === 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group transition-opacity duration-150 ${dimmed ? 'opacity-25 hover:opacity-70' : 'opacity-100'}`}
    >
      {/* 노드 행 */}
      <div
        className={`flex items-start gap-1 py-0.5 pr-2 rounded-md ${rowBg}`}
        style={{ paddingLeft: `${indentPx + 4}px` }}
        // 마우스 다운: 다중 선택 시작
        onMouseDown={(e) => onNodeMouseDown(node.id, e)}
        // 마우스 진입: 드래그 중 범위 확장
        onMouseEnter={() => onNodeMouseEnter(node.id)}
        // 우클릭: 컨텍스트 메뉴
        onContextMenu={(e) => {
          e.preventDefault()
          onNodeContextMenu(node.id, e)
        }}
      >
        {/* 드래그 핸들 */}
        <button
          {...attributes}
          {...listeners}
          className="
            flex-shrink-0 w-4 h-5 flex items-center justify-center
            text-gray-300 dark:text-gray-600
            opacity-0 group-hover:opacity-100
            cursor-grab active:cursor-grabbing
            hover:text-gray-500 dark:hover:text-gray-400
            mt-0.5
          "
          tabIndex={-1}
          aria-label="드래그 핸들"
          // 드래그 핸들 mousedown은 선택 시작 이벤트로 올라가지 않게 차단
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="2.5" r="1.2" />
            <circle cx="7" cy="2.5" r="1.2" />
            <circle cx="3" cy="7" r="1.2" />
            <circle cx="7" cy="7" r="1.2" />
            <circle cx="3" cy="11.5" r="1.2" />
            <circle cx="7" cy="11.5" r="1.2" />
          </svg>
        </button>

        {/* 접기/펼치기 버튼 */}
        <button
          onClick={() => toggleNodeCollapse(node.id)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`
            flex-shrink-0 w-4 h-5 flex items-center justify-center
            text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-transform mt-0.5
            ${!hasChildren ? 'invisible' : ''}
          `}
          tabIndex={-1}
          aria-label={node.collapsed ? '펼치기' : '접기'}
        >
          <svg
            width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
            className={`transition-transform ${node.collapsed ? '' : 'rotate-90'}`}
          >
            <path d="M2 1l4 3-4 3V1z" />
          </svg>
        </button>

        {/* 완료 체크박스 */}
        <button
          onClick={() => toggleNodeComplete(node.id)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`
            flex-shrink-0 w-4 h-4 mt-1 rounded border
            flex items-center justify-center transition-colors
            ${node.completed
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
            }
          `}
          tabIndex={-1}
          aria-label="완료 체크"
        >
          {node.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4l3 3 5-6" />
            </svg>
          )}
        </button>

        {/* 노드 불릿(점) + 줌인 버튼 */}
        <span className="flex-shrink-0 relative flex items-center justify-center mt-2">
          {/* 일반 상태: 불릿 점 */}
          <span
            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:opacity-0 transition-opacity"
            style={{ backgroundColor: node.color ?? undefined }}
          />
          {/* 호버 시: 줌인 버튼 */}
          <button
            onClick={(e) => { e.stopPropagation(); onNodeFocusIn(node.id) }}
            onMouseDown={(e) => e.stopPropagation()}
            title="포커스 뷰"
            className="
              absolute inset-0 flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-opacity
              text-gray-400 hover:text-primary-500 dark:hover:text-primary-400
              w-4 h-4 -translate-x-1 -translate-y-0.5
            "
            tabIndex={-1}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 2h4v4l-1.5-1.5-3 3-1-1 3-3L10 2zM2 10l1.5 1.5 3-3 1 1-3 3L6 14H2v-4z" />
            </svg>
          </button>
        </span>

        {/* 텍스트 입력 */}
        <NodeInput
          nodeId={node.id}
          content={node.content}
          richText={node.richText ?? ''}
          color={node.color}
          completed={node.completed}
          headingLevel={node.headingLevel ?? null}
          isSelected={isSelected}
          onFocus={handleSelect}
        />

        {/* 메모 아이콘 (메모가 있으면 표시) */}
        {node.note && (
          <button
            onClick={() => setNoteOpen(true)}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600 mt-1"
            title="메모 보기"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h12v10H8l-4 3V2z" />
            </svg>
          </button>
        )}

        {/* 이미지 첨부 버튼 (호버 시 노출) */}
        <label
          className="
            opacity-0 group-hover:opacity-100 flex-shrink-0
            w-5 h-5 flex items-center justify-center
            text-gray-400 hover:text-primary-500 dark:hover:text-primary-400
            rounded hover:bg-gray-100 dark:hover:bg-gray-700
            cursor-pointer mt-0.5 transition-all
          "
          title="이미지 첨부"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="1" y="1" width="14" height="14" rx="3" />
            <path d="M1 10l4-4 4 4 2-2 4 4" />
            <circle cx="11.5" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
        </label>

        {/* 더보기 메뉴 버튼 */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            onMouseDown={(e) => e.stopPropagation()}
            className="
              opacity-0 group-hover:opacity-100
              w-5 h-5 flex items-center justify-center
              text-gray-400 hover:text-gray-600
              dark:text-gray-600 dark:hover:text-gray-400
              rounded hover:bg-gray-100 dark:hover:bg-gray-700
              mt-0.5
            "
            tabIndex={-1}
            aria-label="옵션"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>

          {colorPickerOpen && (
            <div
              className="
                absolute right-0 top-6 z-50
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg p-2 w-44
              "
              onMouseLeave={() => setColorPickerOpen(false)}
            >
              {/* 메모 토글 */}
              <button
                onClick={() => { setNoteOpen(true); setColorPickerOpen(false) }}
                className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded"
              >
                📝 메모 {noteOpen ? '닫기' : '추가'}
              </button>

              {/* 이미지 첨부 */}
              <label
                className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded cursor-pointer flex items-center gap-1"
                onClick={() => setColorPickerOpen(false)}
              >
                🖼 이미지 첨부
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleImageFiles(e.target.files) }}
                />
              </label>

              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

              {/* 헤딩 레벨 선택 */}
              <div className="text-xs text-gray-400 px-2 mb-1">헤딩 스타일</div>
              <div className="flex gap-1 px-2 mb-1">
                {([null, 1, 2, 3] as (HeadingLevel)[]).map((level) => {
                  const label = level === null ? '본문' : `H${level}`
                  const isActive = (node.headingLevel ?? null) === level
                  return (
                    <button
                      key={label}
                      onClick={() => { setNodeHeading(node.id, level); setColorPickerOpen(false) }}
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

              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              <div className="text-xs text-gray-400 px-2 mb-1">색상</div>
              <div className="flex flex-wrap gap-1 px-2">
                {NODE_COLORS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => { setNodeColor(node.id, value); setColorPickerOpen(false) }}
                    title={label}
                    className={`
                      w-5 h-5 rounded-full border-2
                      ${node.color === value ? 'border-gray-800 dark:border-white' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: value ?? '#e5e7eb' }}
                  />
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              <button
                onClick={() => { deleteNode(node.id); setColorPickerOpen(false) }}
                className="w-full text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded"
              >
                🗑 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 메모 에디터 */}
      <div style={{ paddingLeft: `${indentPx + 28}px` }}>
        <NoteEditor
          nodeId={node.id}
          note={node.note}
          isOpen={noteOpen}
          onClose={() => setNoteOpen(false)}
        />
        {node.note && !noteOpen && (
          <p
            className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 line-clamp-1 mt-0.5"
            onClick={() => setNoteOpen(true)}
          >
            {node.note}
          </p>
        )}

        {/* ─── 이미지 썸네일 스트립 ─── */}
        {(images.length > 0 || imageUploading) && (
          <div
            className="flex flex-wrap gap-1.5 mt-1.5 pb-1"
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {images.map((img, i) => (
              <div key={img.id} className="relative group/img flex-shrink-0">
                <button
                  onClick={() => setLightboxIndex(i)}
                  className="
                    w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700
                    hover:border-primary-400 transition-colors
                  "
                  title={img.name}
                >
                  <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                </button>
                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeNodeImage(node.id, img.id) }}
                  className="
                    absolute -top-1 -right-1 w-4 h-4
                    bg-red-500 text-white rounded-full
                    flex items-center justify-center
                    opacity-0 group-hover/img:opacity-100
                    transition-opacity text-[10px]
                    hover:bg-red-600
                  "
                  title="이미지 삭제"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* 업로딩 스피너 */}
            {imageUploading && (
              <div className="w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <svg className="animate-spin w-5 h-5 text-primary-500" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {/* 추가 버튼 (드롭존) */}
            <label
              className="
                w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
                flex flex-col items-center justify-center gap-0.5
                cursor-pointer text-gray-400 dark:text-gray-500
                hover:border-primary-400 hover:text-primary-400
                transition-colors flex-shrink-0
              "
              title="이미지 추가 (또는 드래그앤드롭)"
              onDrop={handleImageDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="1" width="12" height="12" rx="2" />
                <path d="M1 9l3-3 3 3 2-2 4 4" />
                <circle cx="10" cy="4" r="1" fill="currentColor" />
              </svg>
              <span className="text-[9px]">추가</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)}
              />
            </label>
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxIndex !== null && images.length > 0 && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* 자식 노드들 */}
      {hasChildren && !node.collapsed && (
        <div className="outline-node-children" style={{ marginLeft: `${indentPx + 20}px` }}>
          <SortableContext
            items={node.children.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {node.children.map((child) => (
              <OutlineNode
                key={child.id}
                node={child}
                depth={depth + 1}
                searchQuery={searchQuery}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}
