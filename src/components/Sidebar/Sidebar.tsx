// =====================================================
// 사이드바: 문서 목록 + 폴더 관리 + 휴지통
//
// 섹션 구조:
//   ⭐ 즐겨찾기
//   📁 폴더들 (생성/수정/삭제)
//   📄 기타 문서 (폴더 없음)
//   🗑 휴지통 (복원/영구삭제)
// =====================================================

import { useState, useRef, useEffect } from 'react'
import { useDocumentStore, useActiveDocument } from '../../store/documentStore'
import { collectAllTags } from '../../utils/tagUtils'
import type { Document, Folder } from '../../types'

export function Sidebar() {
  const {
    documents,
    folders,
    activeDocumentId,
    createDocument,
    trashDocument,
    restoreDocument,
    deleteDocument,
    emptyTrash,
    setActiveDocument,
    toggleStarDocument,
    moveDocumentToFolder,
    createFolder,
    deleteFolder,
    renameFolder,
    toggleFolderCollapse,
    tagFilter,
    setTagFilter,
  } = useDocumentStore()

  const doc = useActiveDocument()
  const allTags = doc ? collectAllTags(doc.nodes) : []

  // 활성(삭제 안 된) 문서 / 휴지통 문서 분리
  const activeDocs = documents.filter((d) => !d.deletedAt)
  const trashedDocs = documents.filter((d) => !!d.deletedAt)

  // 섹션별 문서
  const starredDocs = activeDocs.filter((d) => d.starred)
  const unfiledDocs = activeDocs.filter((d) => !d.starred && !d.folderId)

  // UI 상태
  const [trashOpen, setTrashOpen] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderNameValue, setFolderNameValue] = useState('')
  // 폴더 이동 드롭다운 열린 문서 ID
  const [folderPickerDocId, setFolderPickerDocId] = useState<string | null>(null)
  const folderPickerRef = useRef<HTMLDivElement>(null)

  // 폴더 이동 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!folderPickerDocId) return
    function handleClick(e: MouseEvent) {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setFolderPickerDocId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [folderPickerDocId])

  function formatDate(ts: number) {
    const diff = Date.now() - ts
    if (diff < 60000) return '방금 전'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
    return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  function startRenameFolder(folder: Folder) {
    setEditingFolderId(folder.id)
    setFolderNameValue(folder.name)
  }

  function commitFolderRename() {
    if (editingFolderId && folderNameValue.trim()) {
      renameFolder(editingFolderId, folderNameValue.trim())
    }
    setEditingFolderId(null)
  }

  function handleFolderNameKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitFolderRename()
    if (e.key === 'Escape') setEditingFolderId(null)
  }

  return (
    <aside className="
      w-56 flex-shrink-0 flex flex-col
      bg-gray-50 dark:bg-gray-900
      border-r border-gray-200 dark:border-gray-700
      h-full
    ">
      {/* ─── 헤더 ─── */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
          MyOutline
        </span>
        <div className="flex items-center gap-1">
          {/* 새 폴더 */}
          <button
            onClick={() => createFolder()}
            className="
              w-6 h-6 flex items-center justify-center
              text-gray-500 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-700
              rounded-md transition-colors
            "
            title="새 폴더 만들기"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 4h4l2 2h6v7H2V4z" />
              <line x1="8" y1="8" x2="8" y2="12" />
              <line x1="6" y1="10" x2="10" y2="10" />
            </svg>
          </button>
          {/* 새 문서 */}
          <button
            onClick={createDocument}
            className="
              w-6 h-6 flex items-center justify-center
              text-gray-500 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-700
              rounded-md transition-colors
            "
            title="새 문서 만들기"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── 문서 목록 ─── */}
      <div className="flex-1 overflow-y-auto py-1">

        {/* ── 즐겨찾기 섹션 ── */}
        {starredDocs.length > 0 && (
          <div className="mb-1">
            <SectionHeader label="⭐ 즐겨찾기" />
            {starredDocs.map((d) => (
              <DocItem
                key={d.id}
                doc={d}
                isActive={activeDocumentId === d.id}
                folders={folders}
                folderPickerDocId={folderPickerDocId}
                folderPickerRef={folderPickerRef}
                activeDocs={activeDocs}
                onSelect={() => setActiveDocument(d.id)}
                onStar={() => toggleStarDocument(d.id)}
                onTrash={() => trashDocument(d.id)}
                onFolderPicker={() => setFolderPickerDocId(folderPickerDocId === d.id ? null : d.id)}
                onMoveToFolder={(fid) => { moveDocumentToFolder(d.id, fid); setFolderPickerDocId(null) }}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* ── 폴더 섹션들 ── */}
        {folders.map((folder) => {
          const folderDocs = activeDocs.filter((d) => d.folderId === folder.id)
          return (
            <div key={folder.id} className="mb-1">
              {/* 폴더 헤더 */}
              <div className="group flex items-center gap-1 px-2 py-1 mx-1 rounded-md
                hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                {/* 접기/펼치기 */}
                <button
                  onClick={() => toggleFolderCollapse(folder.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
                    className={`transition-transform ${folder.collapsed ? '' : 'rotate-90'}`}>
                    <path d="M2 1l4 3-4 3V1z" />
                  </svg>
                </button>

                {/* 폴더명 (클릭하면 편집) */}
                {editingFolderId === folder.id ? (
                  <input
                    autoFocus
                    value={folderNameValue}
                    onChange={(e) => setFolderNameValue(e.target.value)}
                    onBlur={commitFolderRename}
                    onKeyDown={handleFolderNameKey}
                    className="
                      flex-1 text-xs font-medium bg-transparent
                      border-b border-primary-500 outline-none
                      text-gray-700 dark:text-gray-300
                    "
                  />
                ) : (
                  <button
                    onClick={() => startRenameFolder(folder)}
                    className="flex-1 text-left text-xs font-medium text-gray-600 dark:text-gray-400 truncate"
                    title="클릭하여 이름 수정"
                  >
                    📁 {folder.name}
                  </button>
                )}

                {/* 폴더에 새 문서 추가 */}
                <button
                  onClick={() => {
                    createDocument()
                    // 새로 만든 문서를 이 폴더로 이동
                    setTimeout(() => {
                      const state = useDocumentStore.getState()
                      const newest = state.documents
                        .filter((d) => !d.deletedAt)
                        .sort((a, b) => b.createdAt - a.createdAt)[0]
                      if (newest) state.moveDocumentToFolder(newest.id, folder.id)
                    }, 0)
                  }}
                  className="
                    opacity-0 group-hover:opacity-100
                    flex-shrink-0 w-4 h-4 flex items-center justify-center
                    text-gray-400 hover:text-primary-500
                    transition-all
                  "
                  title="이 폴더에 새 문서 추가"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="1" x2="5" y2="9" />
                    <line x1="1" y1="5" x2="9" y2="5" />
                  </svg>
                </button>

                {/* 폴더 삭제 */}
                <button
                  onClick={() => deleteFolder(folder.id)}
                  className="
                    opacity-0 group-hover:opacity-100
                    flex-shrink-0 w-4 h-4 flex items-center justify-center
                    text-gray-300 hover:text-red-400
                    transition-all
                  "
                  title="폴더 삭제 (문서는 기타로 이동)"
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="1" x2="8" y2="8" />
                    <line x1="8" y1="1" x2="1" y2="8" />
                  </svg>
                </button>
              </div>

              {/* 폴더 내 문서 */}
              {!folder.collapsed && folderDocs.map((d) => (
                <DocItem
                  key={d.id}
                  doc={d}
                  isActive={activeDocumentId === d.id}
                  folders={folders}
                  folderPickerDocId={folderPickerDocId}
                  folderPickerRef={folderPickerRef}
                  activeDocs={activeDocs}
                  indent
                  onSelect={() => setActiveDocument(d.id)}
                  onStar={() => toggleStarDocument(d.id)}
                  onTrash={() => trashDocument(d.id)}
                  onFolderPicker={() => setFolderPickerDocId(folderPickerDocId === d.id ? null : d.id)}
                  onMoveToFolder={(fid) => { moveDocumentToFolder(d.id, fid); setFolderPickerDocId(null) }}
                  formatDate={formatDate}
                />
              ))}
              {!folder.collapsed && folderDocs.length === 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-600 pl-8 py-1">
                  문서 없음
                </p>
              )}
            </div>
          )
        })}

        {/* ── 기타 문서 (폴더 없음, 즐겨찾기 아님) ── */}
        {(unfiledDocs.length > 0 || folders.length === 0) && (
          <div className="mb-1">
            {(starredDocs.length > 0 || folders.length > 0) && (
              <SectionHeader label="📄 문서" />
            )}
            {unfiledDocs.map((d) => (
              <DocItem
                key={d.id}
                doc={d}
                isActive={activeDocumentId === d.id}
                folders={folders}
                folderPickerDocId={folderPickerDocId}
                folderPickerRef={folderPickerRef}
                activeDocs={activeDocs}
                onSelect={() => setActiveDocument(d.id)}
                onStar={() => toggleStarDocument(d.id)}
                onTrash={() => trashDocument(d.id)}
                onFolderPicker={() => setFolderPickerDocId(folderPickerDocId === d.id ? null : d.id)}
                onMoveToFolder={(fid) => { moveDocumentToFolder(d.id, fid); setFolderPickerDocId(null) }}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* ── 휴지통 섹션 ── */}
        <div className="mt-2">
          <button
            onClick={() => setTrashOpen(!trashOpen)}
            className="
              w-full flex items-center justify-between
              px-3 py-1.5
              text-[10px] font-semibold uppercase tracking-wide
              text-gray-400 dark:text-gray-500
              hover:text-gray-600 dark:hover:text-gray-400
              transition-colors
            "
          >
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 4h10l-1 9H4L3 4z" />
                <path d="M6 4V2h4v2" />
                <line x1="1" y1="4" x2="15" y2="4" />
              </svg>
              휴지통
              {trashedDocs.length > 0 && (
                <span className="bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-1 text-[9px]">
                  {trashedDocs.length}
                </span>
              )}
            </span>
            <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor"
              className={`transition-transform ${trashOpen ? 'rotate-90' : ''}`}>
              <path d="M2 1l4 3-4 3V1z" />
            </svg>
          </button>

          {trashOpen && (
            <div className="pb-1">
              {trashedDocs.length === 0 ? (
                <p className="text-[10px] text-gray-400 dark:text-gray-600 px-4 py-1">
                  비어 있음
                </p>
              ) : (
                <>
                  {trashedDocs
                    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
                    .map((d) => (
                      <div
                        key={d.id}
                        className="group flex items-center gap-1.5 px-2 py-1.5 mx-1 rounded-md
                          text-gray-400 dark:text-gray-600
                          hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate leading-tight line-through opacity-60">
                            {d.title}
                          </p>
                          <p className="text-[9px] text-gray-400 leading-tight">
                            {formatDate(d.deletedAt!)}에 삭제
                          </p>
                        </div>
                        {/* 복원 */}
                        <button
                          onClick={() => restoreDocument(d.id)}
                          className="
                            opacity-0 group-hover:opacity-100
                            flex-shrink-0 px-1.5 py-0.5 text-[9px] rounded
                            bg-primary-100 dark:bg-primary-900/30
                            text-primary-600 dark:text-primary-400
                            hover:bg-primary-200 transition-all
                          "
                          title="복원"
                        >
                          복원
                        </button>
                        {/* 영구 삭제 */}
                        <button
                          onClick={() => deleteDocument(d.id)}
                          className="
                            opacity-0 group-hover:opacity-100
                            flex-shrink-0 w-4 h-4 flex items-center justify-center
                            text-gray-300 hover:text-red-400 transition-all
                          "
                          title="영구 삭제"
                        >
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="1" y1="1" x2="8" y2="8" />
                            <line x1="8" y1="1" x2="1" y2="8" />
                          </svg>
                        </button>
                      </div>
                    ))
                  }
                  {/* 휴지통 비우기 */}
                  <button
                    onClick={emptyTrash}
                    className="
                      w-full mt-1 text-[10px] text-red-400 hover:text-red-500
                      hover:bg-red-50 dark:hover:bg-red-900/20
                      px-4 py-1 text-left rounded transition-colors
                    "
                  >
                    🗑 휴지통 비우기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 태그 필터 패널 */}
      {allTags.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            태그
          </p>
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                className={`
                  text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors
                  ${tagFilter === tag
                    ? tag.startsWith('#')
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-500 text-white'
                    : tag.startsWith('#')
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
                  }
                `}
              >
                {tag}
              </button>
            ))}
            {tagFilter && (
              <button
                onClick={() => setTagFilter('')}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300"
              >
                ✕ 초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* 단축키 안내 */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-relaxed">
          Enter 새 항목 · Tab 들여쓰기<br />
          Shift+Tab 내어쓰기 · Ctrl+Z 취소
        </p>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────
// 헬퍼 컴포넌트들
// ─────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {label}
    </p>
  )
}

interface DocItemProps {
  doc: Document
  isActive: boolean
  folders: Folder[]
  folderPickerDocId: string | null
  folderPickerRef: React.RefObject<HTMLDivElement | null>
  activeDocs: Document[]
  indent?: boolean
  onSelect: () => void
  onStar: () => void
  onTrash: () => void
  onFolderPicker: () => void
  onMoveToFolder: (folderId: string | null) => void
  formatDate: (ts: number) => string
}

function DocItem({
  doc,
  isActive,
  folders,
  folderPickerDocId,
  folderPickerRef,
  indent,
  onSelect,
  onStar,
  onTrash,
  onFolderPicker,
  onMoveToFolder,
  formatDate,
}: DocItemProps) {
  return (
    <div
      className={`
        group flex items-center gap-1.5 py-1.5 mx-1 rounded-md cursor-pointer
        transition-colors relative
        ${indent ? 'pl-5 pr-2' : 'px-2'}
        ${isActive
          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
        }
      `}
      onClick={onSelect}
    >
      {/* 즐겨찾기 */}
      <button
        onClick={(e) => { e.stopPropagation(); onStar() }}
        className={`
          flex-shrink-0 transition-colors
          ${doc.starred ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100'}
          hover:text-yellow-400
        `}
        title={doc.starred ? '즐겨찾기 해제' : '즐겨찾기'}
      >
        <svg width="11" height="11" viewBox="0 0 16 16"
          fill={doc.starred ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1l1.9 3.8 4.2.6-3 3 .7 4.2L8 10.5l-3.8 2 .7-4.2-3-3 4.2-.6z" />
        </svg>
      </button>

      {/* 제목 + 날짜 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight">{doc.title}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-tight">
          {formatDate(doc.updatedAt)}
        </p>
      </div>

      {/* 폴더 이동 버튼 (폴더 있을 때만) */}
      {folders.length > 0 && (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); onFolderPicker() }}
            className="
              opacity-0 group-hover:opacity-100
              flex-shrink-0 w-4 h-4 flex items-center justify-center
              text-gray-300 hover:text-primary-400
              transition-all
            "
            title="폴더로 이동"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 4h4l2 2h6v7H2V4z" />
            </svg>
          </button>

          {/* 폴더 선택 드롭다운 */}
          {folderPickerDocId === doc.id && (
            <div
              ref={folderPickerRef}
              className="
                absolute right-0 top-5 z-50
                w-36 bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg py-1 text-xs
              "
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onMoveToFolder(null)}
                className={`
                  w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                  ${doc.folderId === null ? 'text-primary-500 font-medium' : 'text-gray-600 dark:text-gray-400'}
                `}
              >
                📄 폴더 없음
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onMoveToFolder(f.id)}
                  className={`
                    w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors truncate
                    ${doc.folderId === f.id ? 'text-primary-500 font-medium' : 'text-gray-600 dark:text-gray-400'}
                  `}
                >
                  📁 {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 삭제(휴지통) 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); onTrash() }}
        className="
          opacity-0 group-hover:opacity-100
          flex-shrink-0 w-4 h-4 flex items-center justify-center
          text-gray-300 dark:text-gray-600 hover:text-red-400
          rounded transition-all
        "
        title="휴지통으로 이동"
      >
        <svg width="9" height="10" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h8l-.8 8.5a1 1 0 01-1 .9H3.8a1 1 0 01-1-.9L2 3z" />
          <path d="M4 3V2h4v1" />
          <line x1="1" y1="3" x2="11" y2="3" />
        </svg>
      </button>
    </div>
  )
}
