// =====================================================
// 프레젠테이션 모드 컴포넌트
//
// 기능:
//   - 최상위 노드 각각을 슬라이드로 표시
//   - 슬라이드 제목 + 자식 불릿 + 메모(speaker note)
//   - ← → 키 / 버튼으로 슬라이드 이동
//   - 스페이스바: 다음 슬라이드
//   - ESC: 나가기
//   - 슬라이드 번호 / 진행 바
//   - 라이트 / 다크 모드 자동 적용
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { useDocumentStore, useActiveDocument } from '../../store/documentStore'
import type { OutlineNode } from '../../types'

// 슬라이드 전환 방향
type Direction = 'left' | 'right' | 'none'

export function PresentationMode() {
  const { setPresentationMode } = useDocumentStore()
  const doc = useActiveDocument()

  // 루트 레벨 노드 = 슬라이드 목록
  const slides = doc?.nodes ?? []
  const total = slides.length

  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<Direction>('none')
  const [animating, setAnimating] = useState(false)

  const safeIndex = Math.max(0, Math.min(current, total - 1))
  const slide = slides[safeIndex]

  // 슬라이드 이동
  const go = useCallback((delta: number) => {
    if (animating) return
    const next = safeIndex + delta
    if (next < 0 || next >= total) return
    setDirection(delta > 0 ? 'left' : 'right')
    setAnimating(true)
    setTimeout(() => {
      setCurrent(next)
      setAnimating(false)
    }, 180)
  }, [animating, safeIndex, total])

  const exit = useCallback(() => setPresentationMode(false), [setPresentationMode])

  // 키보드 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          go(1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          go(-1)
          break
        case 'Escape':
          exit()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, exit])

  if (!slide) {
    return (
      <PresentationOverlay onExit={exit} current={0} total={0}>
        <div className="flex flex-col items-center justify-center h-full text-white/40">
          <p className="text-2xl mb-2">슬라이드가 없습니다</p>
          <p className="text-sm">아웃라인에 항목을 추가하세요</p>
        </div>
      </PresentationOverlay>
    )
  }

  return (
    <PresentationOverlay
      onExit={exit}
      current={safeIndex}
      total={total}
      title={doc?.title}
      onPrev={() => go(-1)}
      onNext={() => go(1)}
    >
      {/* 슬라이드 콘텐츠 (애니메이션) */}
      <div
        key={safeIndex}
        className={`
          flex flex-col items-center justify-center
          h-full px-8 md:px-16 max-w-4xl mx-auto w-full
          transition-all duration-180
          ${animating
            ? direction === 'left'
              ? 'opacity-0 -translate-x-8'
              : 'opacity-0 translate-x-8'
            : 'opacity-100 translate-x-0'
          }
        `}
      >
        {/* 슬라이드 번호 (작게) */}
        <p className="text-white/30 text-xs mb-6 self-start">
          {safeIndex + 1} / {total}
        </p>

        {/* 메인 타이틀 */}
        <h1 className={`
          self-start font-bold text-white leading-tight mb-6 w-full
          ${slide.content.length > 40 ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'}
        `}>
          {slide.content || <span className="opacity-30">(빈 슬라이드)</span>}
        </h1>

        {/* 자식 불릿 */}
        {slide.children.length > 0 && (
          <ul className="self-start w-full space-y-3">
            {slide.children.slice(0, 6).map((child, i) => (
              <SlideChildItem key={child.id} node={child} delay={i} />
            ))}
            {slide.children.length > 6 && (
              <li className="text-white/40 text-lg pl-2">
                … {slide.children.length - 6}개 더
              </li>
            )}
          </ul>
        )}

        {/* 메모 (speaker note) */}
        {slide.note && (
          <div className="self-start mt-8 w-full border-t border-white/10 pt-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">메모</p>
            <p className="text-white/60 text-sm leading-relaxed">{slide.note}</p>
          </div>
        )}
      </div>
    </PresentationOverlay>
  )
}

// ─────────────────────────────────────────────────
// 슬라이드 자식 아이템 (순차 페이드인)
// ─────────────────────────────────────────────────

function SlideChildItem({ node, delay }: { node: OutlineNode; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 80 + 100)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <li
      className={`
        flex items-start gap-3 transition-all duration-300
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
    >
      <span
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5"
        style={node.color ? { backgroundColor: node.color } : {}}
      />
      <span className={`
        text-white/85 leading-snug
        ${node.completed ? 'line-through opacity-50' : ''}
        ${node.headingLevel ? 'font-semibold' : ''}
        ${node.headingLevel === 1 ? 'text-2xl' : node.headingLevel === 2 ? 'text-xl' : 'text-lg'}
        ${!node.headingLevel ? 'text-lg' : ''}
      `}>
        {node.content || <span className="opacity-30">(빈 항목)</span>}
      </span>
    </li>
  )
}

// ─────────────────────────────────────────────────
// 오버레이 래퍼 (상단 바 + 하단 네비게이션 포함)
// ─────────────────────────────────────────────────

interface OverlayProps {
  onExit: () => void
  current: number
  total: number
  title?: string
  onPrev?: () => void
  onNext?: () => void
  children: React.ReactNode
}

function PresentationOverlay({ onExit, current, total, title, onPrev, onNext, children }: OverlayProps) {
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col select-none">

      {/* ── 상단 바 ── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <span className="text-white/40 text-sm font-medium truncate max-w-xs">
          {title || 'MyOutline'}
        </span>
        <div className="flex items-center gap-4">
          <span className="text-white/30 text-xs">
            ESC로 나가기
          </span>
          <button
            onClick={onExit}
            className="
              w-8 h-8 flex items-center justify-center rounded-full
              text-white/40 hover:text-white hover:bg-white/10
              transition-colors
            "
            title="프레젠테이션 종료 (ESC)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 슬라이드 영역 ── */}
      <div className="flex-1 min-h-0 flex items-center overflow-hidden">
        {children}
      </div>

      {/* ── 하단 네비게이션 ── */}
      <div className="flex-shrink-0 px-6 py-4">
        {/* 진행 바 */}
        <div className="w-full h-0.5 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 버튼 + 점 인디케이터 */}
        <div className="flex items-center justify-between">
          {/* 이전 */}
          <button
            onClick={onPrev}
            disabled={current <= 0}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              text-white/60 hover:text-white hover:bg-white/10
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors text-sm
            "
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 2L3 7l6 5" />
            </svg>
            이전
          </button>

          {/* 슬라이드 점 인디케이터 (최대 10개) */}
          <div className="flex items-center gap-1.5">
            {total <= 12 ? (
              Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {/* direct jump via parent's logic */}}
                  className={`
                    rounded-full transition-all
                    ${i === current
                      ? 'w-4 h-2 bg-primary-400'
                      : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                    }
                  `}
                />
              ))
            ) : (
              <span className="text-white/40 text-sm">
                {current + 1} / {total}
              </span>
            )}
          </div>

          {/* 다음 */}
          <button
            onClick={onNext}
            disabled={current >= total - 1}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              text-white/60 hover:text-white hover:bg-white/10
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors text-sm
            "
          >
            다음
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 2l6 5-6 5" />
            </svg>
          </button>
        </div>

        {/* 키보드 힌트 */}
        <p className="text-center text-white/20 text-[10px] mt-2">
          ← → 화살표 키 · 스페이스바로 이동
        </p>
      </div>
    </div>
  )
}
