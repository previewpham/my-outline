// =====================================================
// 태그 패널 컴포넌트 (5번 기능)
// 전체 태그 목록, 클릭 필터링, 일괄 이름 변경
// =====================================================

import { useState, useMemo } from 'react'
import { useDocumentStore, useActiveDocument } from '../../store/documentStore'
import { flattenTree } from '../../utils/nodeUtils'

export function TagPanel() {
  const doc = useActiveDocument()
  const { tagFilter, setTagFilter, renameTag, toggleTagPanel } = useDocumentStore()

  // 이름 변경 상태: 태그 문자열 → 편집 중인 새 이름
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // 전체 노드에서 태그 수집 및 카운트
  const tagStats = useMemo(() => {
    if (!doc) return []
    const allNodes = flattenTree(doc.nodes)
    const countMap = new Map<string, number>()
    for (const node of allNodes) {
      for (const tag of node.tags) {
        countMap.set(tag, (countMap.get(tag) ?? 0) + 1)
      }
    }
    // # 태그와 @ 태그 분리, 각각 이름순 정렬
    return [...countMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag))
  }, [doc])

  const hashTags = tagStats.filter(({ tag }) => tag.startsWith('#'))
  const mentionTags = tagStats.filter(({ tag }) => tag.startsWith('@'))

  function startEdit(tag: string) {
    setEditingTag(tag)
    setEditValue(tag.slice(1))  // # or @ 제거
  }

  function commitRename(oldTag: string) {
    const prefix = oldTag[0]
    const newTag = `${prefix}${editValue.trim()}`
    if (editValue.trim() && newTag !== oldTag) {
      renameTag(oldTag, newTag)
      // 현재 필터가 변경된 태그면 필터도 업데이트
      if (tagFilter === oldTag) setTagFilter(newTag)
    }
    setEditingTag(null)
  }

  function handleFilterClick(tag: string) {
    setTagFilter(tagFilter === tag ? '' : tag)
  }

  if (!doc) return null

  return (
    <aside className="
      w-56 h-full flex flex-col flex-shrink-0
      border-l border-gray-200 dark:border-gray-700
      bg-white dark:bg-gray-900
      overflow-hidden
    ">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">태그</span>
        <button
          onClick={toggleTagPanel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded"
          title="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>

      {/* 필터 초기화 */}
      {tagFilter && (
        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setTagFilter('')}
            className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 2l6 6M8 2L2 8" />
            </svg>
            필터 해제 ({tagFilter})
          </button>
        </div>
      )}

      {/* 태그 목록 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto py-1">
        {tagStats.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6 px-3">
            아직 태그가 없습니다.<br/>
            <span className="opacity-70">#태그 또는 @멘션을 입력하세요</span>
          </p>
        ) : (
          <>
            {/* #해시태그 섹션 */}
            {hashTags.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  #태그
                </div>
                {hashTags.map(({ tag, count }) => (
                  <TagRow
                    key={tag}
                    tag={tag}
                    count={count}
                    isActive={tagFilter === tag}
                    isEditing={editingTag === tag}
                    editValue={editValue}
                    onFilterClick={() => handleFilterClick(tag)}
                    onEditStart={() => startEdit(tag)}
                    onEditChange={setEditValue}
                    onEditCommit={() => commitRename(tag)}
                    onEditCancel={() => setEditingTag(null)}
                  />
                ))}
              </div>
            )}

            {/* @멘션 섹션 */}
            {mentionTags.length > 0 && (
              <div className={hashTags.length > 0 ? 'mt-2' : ''}>
                <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  @멘션
                </div>
                {mentionTags.map(({ tag, count }) => (
                  <TagRow
                    key={tag}
                    tag={tag}
                    count={count}
                    isActive={tagFilter === tag}
                    isEditing={editingTag === tag}
                    editValue={editValue}
                    onFilterClick={() => handleFilterClick(tag)}
                    onEditStart={() => startEdit(tag)}
                    onEditChange={setEditValue}
                    onEditCommit={() => commitRename(tag)}
                    onEditCancel={() => setEditingTag(null)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단: 총 태그 수 */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          고유 태그 {tagStats.length}개
        </span>
      </div>
    </aside>
  )
}

// ─── 개별 태그 행 컴포넌트 ───

interface TagRowProps {
  tag: string
  count: number
  isActive: boolean
  isEditing: boolean
  editValue: string
  onFilterClick: () => void
  onEditStart: () => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
}

function TagRow({
  tag, count, isActive, isEditing, editValue,
  onFilterClick, onEditStart, onEditChange, onEditCommit, onEditCancel,
}: TagRowProps) {
  const prefix = tag[0]  // '#' 또는 '@'
  const isHash = prefix === '#'

  return (
    <div className={`
      group flex items-center gap-1 px-3 py-1 mx-1 rounded-md cursor-pointer
      ${isActive
        ? 'bg-blue-50 dark:bg-blue-900/20'
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }
    `}>
      {isEditing ? (
        /* 이름 변경 인풋 */
        <div className="flex-1 flex items-center gap-1">
          <span className={`text-xs font-medium flex-shrink-0 ${isHash ? 'text-blue-500' : 'text-green-500'}`}>
            {prefix}
          </span>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditCommit()
              if (e.key === 'Escape') onEditCancel()
            }}
            onBlur={onEditCommit}
            className="
              flex-1 text-xs border border-blue-400 rounded px-1 py-0.5
              bg-white dark:bg-gray-800 dark:border-blue-600
              text-gray-800 dark:text-gray-200 outline-none min-w-0
            "
          />
        </div>
      ) : (
        /* 태그 표시 + 필터 */
        <button
          onClick={onFilterClick}
          className="flex-1 flex items-center gap-1.5 text-left min-w-0"
          title={`${tag} 필터`}
        >
          <span className={`text-xs font-semibold flex-shrink-0 ${isHash ? 'text-blue-500 dark:text-blue-400' : 'text-green-500 dark:text-green-400'}`}>
            {prefix}
          </span>
          <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
            {tag.slice(1)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 tabular-nums">
            {count}
          </span>
        </button>
      )}

      {/* 이름 변경 버튼 (hover 시 표시) */}
      {!isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditStart() }}
          className="
            opacity-0 group-hover:opacity-100 flex-shrink-0
            p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
            transition-opacity
          "
          title="이름 변경"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M11 2l3 3-9 9H2v-3l9-9z" />
          </svg>
        </button>
      )}
    </div>
  )
}
