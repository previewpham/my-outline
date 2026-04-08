// =====================================================
// 마인드맵 커스텀 노드 컴포넌트
// React Flow의 NodeProps를 받아 스타일링된 카드 렌더링
// =====================================================

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { MindMapNodeData } from './mindmapLayout'
import { useDocumentStore } from '../../store/documentStore'

// 테마별 깊이 색상 팔레트
const THEME_COLORS = {
  blue: [
    { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },  // depth 0: 파랑 루트
    { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },  // depth 1: 초록
    { bg: '#fefce8', border: '#eab308', text: '#854d0e' },  // depth 2: 노랑
    { bg: '#fff7ed', border: '#f97316', text: '#c2410c' },  // depth 3: 주황
    { bg: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },  // depth 4+: 보라
  ],
  green: [
    { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },  // depth 0: 진초록 루트
    { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },  // depth 1: 에메랄드
    { bg: '#f0fdf4', border: '#4ade80', text: '#166534' },  // depth 2: 연초록
    { bg: '#fefce8', border: '#a3e635', text: '#365314' },  // depth 3: 연두
    { bg: '#f7fee7', border: '#84cc16', text: '#3f6212' },  // depth 4+: 라임
  ],
  dark: [
    { bg: '#1e3a5f', border: '#60a5fa', text: '#bfdbfe' },  // depth 0: 다크블루 루트
    { bg: '#1a2e1a', border: '#34d399', text: '#a7f3d0' },  // depth 1: 다크그린
    { bg: '#2d2506', border: '#fbbf24', text: '#fde68a' },  // depth 2: 다크옐로
    { bg: '#2d1a1a', border: '#f87171', text: '#fecaca' },  // depth 3: 다크레드
    { bg: '#1e1a2d', border: '#818cf8', text: '#c7d2fe' },  // depth 4+: 다크퍼플
  ],
}

function getDepthStyle(depth: number, mindmapTheme: 'blue' | 'green' | 'dark') {
  const palette = THEME_COLORS[mindmapTheme]
  return palette[Math.min(depth, palette.length - 1)]
}

export const MindMapNode = memo(function MindMapNode({
  data,
  selected,
}: NodeProps<MindMapNodeData>) {
  const { setTagFilter, tagFilter, mindmapTheme } = useDocumentStore()
  const depthStyle = getDepthStyle(data.depth, mindmapTheme)

  // 커스텀 색상이 있으면 우선 적용
  const bgColor = data.color ? `${data.color}18` : depthStyle.bg
  const borderColor = data.color ?? depthStyle.border
  const textColor = data.color ?? depthStyle.text

  const fontSize = data.isRoot ? 15 : data.depth === 1 ? 13 : 12
  const padding = data.isRoot ? '10px 18px' : '6px 14px'
  const fontWeight = data.isRoot ? 700 : data.depth === 1 ? 600 : 400

  return (
    <>
      {/* 들어오는 연결 핸들 (왼쪽) */}
      {!data.isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: borderColor, width: 6, height: 6, border: 'none' }}
        />
      )}

      {/* 노드 카드 */}
      <div
        style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: data.isRoot ? 12 : 8,
          padding,
          minWidth: data.isRoot ? 120 : 80,
          maxWidth: 240,
          boxShadow: selected
            ? `0 0 0 3px ${borderColor}55, 0 4px 12px rgba(0,0,0,0.15)`
            : '0 2px 6px rgba(0,0,0,0.08)',
          opacity: data.completed ? 0.5 : 1,
          transition: 'box-shadow 0.15s, opacity 0.15s',
          cursor: 'default',
        }}
      >
        {/* 메인 텍스트 */}
        <div
          style={{
            fontSize,
            fontWeight,
            color: textColor,
            textDecoration: data.completed ? 'line-through' : 'none',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {data.label}
        </div>

        {/* 메모 미리보기 */}
        {data.note && (
          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              marginTop: 4,
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.note}
          </div>
        )}

        {/* 태그 뱃지 */}
        {data.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
            {data.tags.map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation()
                  setTagFilter(tagFilter === tag ? '' : tag)
                }}
                style={{
                  fontSize: 9,
                  background: tag.startsWith('#') ? '#dbeafe' : '#dcfce7',
                  color: tag.startsWith('#') ? '#1d4ed8' : '#15803d',
                  borderRadius: 4,
                  padding: '1px 5px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 접힌 상태 표시 */}
        {data.collapsed && (
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              color: borderColor,
              fontWeight: 600,
            }}
          >
            ▶ 하위 항목 있음
          </div>
        )}
      </div>

      {/* 나가는 연결 핸들 (오른쪽) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: borderColor, width: 6, height: 6, border: 'none' }}
      />
    </>
  )
})
