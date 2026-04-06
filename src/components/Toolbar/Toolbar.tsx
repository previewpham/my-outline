// =====================================================
// 상단 툴바 컴포넌트
// 뷰 전환, 다크모드 토글, 문서 제목, 검색, 내보내기 포함
// =====================================================

import { useState, useRef, useEffect } from 'react'
import { useDocumentStore, useActiveDocument } from '../../store/documentStore'
import { countWords } from '../../utils/nodeUtils'
import { exportAsText, exportAsMarkdown, exportAsOpml } from '../../utils/exportUtils'

export function Toolbar() {
  const doc = useActiveDocument()
  const {
    viewMode,
    setViewMode,
    theme,
    tagFilter,
    setTagFilter,
    setTheme,
    searchQuery,
    setSearchQuery,
    renameDocument,
    focusMode,
    toggleFocusMode,
    setPresentationMode,
  } = useDocumentStore()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  // 텍스트 복사 완료 피드백
  const [copiedText, setCopiedText] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const wordCount = doc ? countWords(doc.nodes) : 0

  // 내보내기 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!exportOpen) return
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  function startEditTitle() {
    if (!doc) return
    setTitleValue(doc.title)
    setEditingTitle(true)
  }

  function commitTitle() {
    if (doc && titleValue.trim()) {
      renameDocument(doc.id, titleValue.trim())
    }
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitTitle()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  // ─── 내보내기 핸들러 ───

  async function handleCopyText() {
    if (!doc) return
    await exportAsText(doc.nodes, doc.title)
    setExportOpen(false)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  function handleExportMarkdown() {
    if (!doc) return
    exportAsMarkdown(doc.nodes, doc.title)
    setExportOpen(false)
  }

  function handleExportOpml() {
    if (!doc) return
    exportAsOpml(doc.nodes, doc.title)
    setExportOpen(false)
  }

  function handleExportPng() {
    const btn = document.querySelector<HTMLButtonElement>('[data-mindmap-export]')
    btn?.click()
    setExportOpen(false)
  }

  return (
    <header className="
      flex items-center gap-2 px-3 py-2
      border-b border-gray-200 dark:border-gray-700
      bg-white dark:bg-gray-900
      flex-shrink-0
    ">
      {/* 문서 제목 */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            className="
              w-full text-base font-semibold
              bg-transparent border-b border-primary-500
              outline-none text-gray-800 dark:text-gray-100
            "
          />
        ) : (
          <button
            onClick={startEditTitle}
            className="
              text-base font-semibold truncate
              text-gray-800 dark:text-gray-100
              hover:text-primary-600 dark:hover:text-primary-400
              transition-colors
            "
            title="클릭하여 제목 수정"
          >
            {doc?.title ?? 'MyOutline'}
          </button>
        )}
      </div>

      {/* 단어 수 */}
      <span className="hidden md:block text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {wordCount.toLocaleString()}자
      </span>

      {/* 태그 필터 활성 뱃지 */}
      {tagFilter && (
        <button
          onClick={() => setTagFilter('')}
          className="
            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0
            bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400
            hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors
          "
          title="태그 필터 해제"
        >
          {tagFilter} ✕
        </button>
      )}

      {/* 검색창 */}
      <div className="relative flex-shrink-0">
        <svg
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5"
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="검색..."
          className="
            pl-7 pr-3 py-1 text-sm rounded-md
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-gray-300
            placeholder-gray-400 dark:placeholder-gray-600
            border border-transparent focus:border-primary-500
            outline-none w-32 md:w-48
            transition-all
          "
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}
      </div>

      {/* 아웃라인 / 마인드맵 뷰 토글 */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 flex-shrink-0">
        <button
          onClick={() => setViewMode('outline')}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-all
            ${viewMode === 'outline'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
          `}
          title="아웃라인 뷰"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
            <rect x="4" y="7" width="10" height="1.5" rx="0.75" />
            <rect x="4" y="11" width="10" height="1.5" rx="0.75" />
          </svg>
          <span className="hidden md:inline">아웃라인</span>
        </button>
        <button
          onClick={() => setViewMode('mindmap')}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-all
            ${viewMode === 'mindmap'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
          `}
          title="마인드맵 뷰"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2" />
            <circle cx="2.5" cy="4" r="1.5" />
            <circle cx="13.5" cy="4" r="1.5" />
            <circle cx="2.5" cy="12" r="1.5" />
            <circle cx="13.5" cy="12" r="1.5" />
            <line x1="6.2" y1="6.8" x2="3.8" y2="5.2" />
            <line x1="9.8" y1="6.8" x2="12.2" y2="5.2" />
            <line x1="6.2" y1="9.2" x2="3.8" y2="10.8" />
            <line x1="9.8" y1="9.2" x2="12.2" y2="10.8" />
          </svg>
          <span className="hidden md:inline">마인드맵</span>
        </button>
      </div>

      {/* ─── 내보내기 드롭다운 ─── */}
      <div ref={exportRef} className="relative flex-shrink-0">
        <button
          onClick={() => setExportOpen(!exportOpen)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium
            transition-colors
            ${exportOpen
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }
          `}
          title="내보내기"
        >
          {/* 복사 완료 피드백 */}
          {copiedText ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 8l4 4 8-8" />
              </svg>
              <span className="hidden md:inline text-green-600 dark:text-green-400">복사됨!</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v8M5 7l3 3 3-3" />
                <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
              </svg>
              <span className="hidden md:inline">내보내기</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
                className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`}>
                <path d="M2 3l3 4 3-4H2z" />
              </svg>
            </>
          )}
        </button>

        {exportOpen && (
          <div className="
            absolute right-0 top-full mt-1 z-50
            w-52 bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-xl py-1
            text-sm
          ">
            {/* 섹션: 클립보드 */}
            <div className="px-3 pt-1.5 pb-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">클립보드</span>
            </div>
            <button
              onClick={handleCopyText}
              className="
                w-full text-left px-3 py-2 flex items-center gap-2.5
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
              "
            >
              <span className="text-base">📋</span>
              <div>
                <div className="font-medium">텍스트로 복사</div>
                <div className="text-xs text-gray-400">들여쓰기 포함 일반 텍스트</div>
              </div>
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            {/* 섹션: 파일 저장 */}
            <div className="px-3 pt-0.5 pb-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">파일 저장</span>
            </div>
            <button
              onClick={handleExportMarkdown}
              className="
                w-full text-left px-3 py-2 flex items-center gap-2.5
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
              "
            >
              <span className="text-base">📄</span>
              <div>
                <div className="font-medium">Markdown (.md)</div>
                <div className="text-xs text-gray-400">헤딩·체크박스 포함</div>
              </div>
            </button>
            <button
              onClick={handleExportOpml}
              className="
                w-full text-left px-3 py-2 flex items-center gap-2.5
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
              "
            >
              <span className="text-base">🗂</span>
              <div>
                <div className="font-medium">OPML (.opml)</div>
                <div className="text-xs text-gray-400">아웃라이너 앱 호환 포맷</div>
              </div>
            </button>

            {/* 마인드맵 뷰일 때만 PNG 옵션 표시 */}
            {viewMode === 'mindmap' && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button
                  onClick={handleExportPng}
                  className="
                    w-full text-left px-3 py-2 flex items-center gap-2.5
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors
                  "
                >
                  <span className="text-base">🖼</span>
                  <div>
                    <div className="font-medium">PNG 이미지</div>
                    <div className="text-xs text-gray-400">마인드맵 캔버스 캡처</div>
                  </div>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── 아웃라인 전용 버튼 ─── */}
      {viewMode === 'outline' && (
        <>
          {/* 집중 모드 토글 */}
          <button
            onClick={toggleFocusMode}
            className={`
              flex-shrink-0 w-8 h-8 flex items-center justify-center
              rounded-md transition-colors
              ${focusMode
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            title={focusMode ? '집중 모드 해제' : '집중 모드 (선택 항목 강조)'}
          >
            {focusMode ? (
              /* 눈 아이콘 (활성) */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              /* 눈 + 슬래시 아이콘 (비활성) */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>

          {/* 프레젠테이션 모드 */}
          <button
            onClick={() => setPresentationMode(true)}
            className="
              flex-shrink-0 w-8 h-8 flex items-center justify-center
              rounded-md text-gray-500 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors
            "
            title="프레젠테이션 모드"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>
        </>
      )}

      {/* 다크모드 토글 */}
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="
          flex-shrink-0 w-8 h-8 flex items-center justify-center
          rounded-md text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
        "
        title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
      >
        {theme === 'light' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>
    </header>
  )
}
