// =====================================================
// 앱 루트 컴포넌트
// 사이드바 + 툴바 + 에디터 레이아웃 조율
// =====================================================

import { useEffect, useState } from 'react'
import { useDocumentStore } from './store/documentStore'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Toolbar } from './components/Toolbar/Toolbar'
import { OutlineEditor } from './components/OutlineEditor/OutlineEditor'
import { MindMapView } from './components/MindMapView/MindMapView'
import { PresentationMode } from './components/PresentationMode/PresentationMode'
import { LoginPage } from './components/Auth/LoginPage'

export default function App() {
  const { theme, viewMode, documents, activeDocumentId, setActiveDocument, createDocument, presentationMode } = useDocumentStore()
  const { user, loading, setSession } = useAuthStore()

  // Supabase 세션 감지
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [setSession])

  // 다크모드 초기화
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // 활성 문서가 없으면 첫 번째 활성(비삭제) 문서로 설정
  useEffect(() => {
    const activeDocs = documents.filter((d) => !d.deletedAt)
    if (!activeDocumentId && activeDocs.length > 0) {
      setActiveDocument(activeDocs[0].id)
    }
    if (activeDocs.length === 0) {
      createDocument()
    }
  }, [activeDocumentId, documents, setActiveDocument, createDocument])

  // 모바일 사이드바 표시 여부
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <svg className="animate-spin w-8 h-8 text-primary-500" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  // 로그인 안 된 경우 → 로그인 페이지
  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">

      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:relative z-40 md:z-auto
        transition-transform duration-200
        h-full
      `}>
        <Sidebar />
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* 툴바 */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
          {/* 모바일 햄버거 버튼 */}
          <button
            className="md:hidden p-2 ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="메뉴 열기"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="2" y1="4.5" x2="16" y2="4.5" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="13.5" x2="16" y2="13.5" />
            </svg>
          </button>
          <div className="flex-1">
            <Toolbar />
          </div>
        </div>

        {/* 에디터 / 마인드맵 영역 (뷰 모드에 따라 전환) */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'outline' ? <OutlineEditor /> : <MindMapView />}
        </main>
      </div>

      {/* 프레젠테이션 모드 오버레이 */}
      {presentationMode && <PresentationMode />}
    </div>
  )
}
