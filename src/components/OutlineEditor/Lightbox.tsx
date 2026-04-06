// =====================================================
// 이미지 라이트박스 컴포넌트
//
// 기능:
//   - 이미지 풀스크린 표시
//   - ← → 로 여러 이미지 순환
//   - 핀치/휠 줌 (CSS transform)
//   - 다운로드 버튼
//   - ESC / 오버레이 클릭으로 닫기
// =====================================================

import { useEffect, useState, useRef, useCallback } from 'react'
import type { NodeImage } from '../../types'
import { downloadImage } from '../../utils/imageUtils'

interface LightboxProps {
  images: NodeImage[]
  initialIndex: number
  onClose: () => void
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  const current = images[index]
  const total = images.length

  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }) }
  const prev = useCallback(() => { if (index > 0) { setIndex(index - 1); reset() } }, [index])
  const next = useCallback(() => { if (index < total - 1) { setIndex(index + 1); reset() } }, [index, total])

  // 키보드
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  // 휠 줌
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    setScale((s) => Math.min(5, Math.max(0.5, s + delta)))
  }

  // 드래그 이동 (줌 인 상태에서)
  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    })
  }

  function handleMouseUp() { setIsDragging(false) }

  // 더블클릭: 줌 토글
  function handleDoubleClick() {
    if (scale > 1) { reset() } else { setScale(2.5) }
  }

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* ── 상단 바 ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/50 text-sm truncate max-w-xs">
          {current.name}
        </span>
        <div className="flex items-center gap-2">
          {/* 줌 표시 */}
          {scale !== 1 && (
            <button
              onClick={reset}
              className="text-white/50 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              {Math.round(scale * 100)}% → 원본
            </button>
          )}
          {/* 다운로드 */}
          <button
            onClick={() => downloadImage(current.dataUrl, current.name)}
            className="
              w-8 h-8 flex items-center justify-center rounded-full
              text-white/50 hover:text-white hover:bg-white/10 transition-colors
            "
            title="이미지 다운로드"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v8M5 7l3 3 3-3" />
              <path d="M2 13h12" />
            </svg>
          </button>
          {/* 닫기 */}
          <button
            onClick={onClose}
            className="
              w-8 h-8 flex items-center justify-center rounded-full
              text-white/50 hover:text-white hover:bg-white/10 transition-colors
            "
            title="닫기 (ESC)"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="12" y2="12" />
              <line x1="12" y1="1" x2="1" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 이미지 영역 ── */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        {/* 이전 버튼 */}
        {index > 0 && (
          <button
            onClick={prev}
            className="
              absolute left-3 z-10
              w-10 h-10 flex items-center justify-center
              bg-black/40 hover:bg-black/60 rounded-full
              text-white/70 hover:text-white transition-colors
            "
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 2L3 7l6 5" />
            </svg>
          </button>
        )}

        <img
          key={current.id}
          src={current.dataUrl}
          alt={current.name}
          draggable={false}
          onDoubleClick={handleDoubleClick}
          className="max-w-full max-h-full object-contain select-none transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          }}
        />

        {/* 다음 버튼 */}
        {index < total - 1 && (
          <button
            onClick={next}
            className="
              absolute right-3 z-10
              w-10 h-10 flex items-center justify-center
              bg-black/40 hover:bg-black/60 rounded-full
              text-white/70 hover:text-white transition-colors
            "
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 2l6 5-6 5" />
            </svg>
          </button>
        )}
      </div>

      {/* ── 하단: 썸네일 스트립 (이미지 2개 이상) ── */}
      {total > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => { setIndex(i); reset() }}
              className={`
                flex-shrink-0 w-12 h-12 rounded overflow-hidden
                border-2 transition-all
                ${i === index
                  ? 'border-primary-400 opacity-100 scale-110'
                  : 'border-transparent opacity-50 hover:opacity-80'
                }
              `}
            >
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ── 조작 힌트 ── */}
      <p className="text-center text-white/20 text-[10px] pb-2 flex-shrink-0">
        스크롤 줌 · 더블클릭 2.5x · 드래그 이동 · ESC 닫기
      </p>
    </div>
  )
}
