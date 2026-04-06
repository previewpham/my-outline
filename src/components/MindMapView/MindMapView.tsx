// =====================================================
// 마인드맵 뷰 루트 컴포넌트
// React Flow로 아웃라인 데이터를 트리 형태로 시각화
// =====================================================

import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useActiveDocument, useDocumentStore } from '../../store/documentStore'
import { buildMindMapLayout } from './mindmapLayout'
import { MindMapNode } from './MindMapNode'
import { exportMindMapToPng } from '../../utils/exportUtils'

// 커스텀 노드 타입 등록 (컴포넌트 외부에 선언해야 리렌더 시 재등록 안 됨)
const nodeTypes = { mindmapNode: MindMapNode }

function MindMapInner() {
  const doc = useActiveDocument()
  const { theme } = useDocumentStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()
  const [exporting, setExporting] = useState(false)

  // 문서 노드가 바뀔 때마다 React Flow 노드/엣지 재계산
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!doc) return { nodes: [], edges: [] }
    return buildMindMapLayout(doc.nodes)
  }, [doc?.nodes])

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  // 문서가 바뀌면 레이아웃 동기화
  useEffect(() => {
    setNodes(layoutNodes)
    setEdges(layoutEdges)
    // 레이아웃 재계산 후 자동 fitView
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50)
  }, [layoutNodes, layoutEdges])

  // 노드 더블클릭 시 접기/펼치기 (아웃라인 스토어에 반영)
  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      useDocumentStore.getState().toggleNodeCollapse(node.id)
    },
    []
  )

  // PNG 내보내기
  async function handleExport() {
    const el = containerRef.current?.querySelector('.react-flow') as HTMLElement | null
    if (!el) return

    setExporting(true)
    try {
      // 내보내기 전에 전체 노드가 보이도록 fitView
      fitView({ padding: 0.15, duration: 0 })
      // DOM 렌더링 대기
      await new Promise((r) => setTimeout(r, 200))

      await exportMindMapToPng(el, {
        filename: doc?.title ?? 'mindmap',
        backgroundColor: isDark ? '#111827' : '#f8fafc',
        pixelRatio: 2,
      })
    } finally {
      setExporting(false)
    }
  }

  const isDark = theme === 'dark'

  if (!doc || doc.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">🗺</p>
          <p>아웃라인 항목을 추가하면 마인드맵이 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{
          background: isDark ? '#111827' : '#f8fafc',
        }}
      >
        {/* 격자 배경 */}
        <Background
          color={isDark ? '#374151' : '#cbd5e1'}
          gap={20}
          size={1}
        />

        {/* 줌/피트 컨트롤 */}
        <Controls
          style={{
            background: isDark ? '#1f2937' : 'white',
            border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
            borderRadius: 8,
          }}
        />

        {/* 미니맵 */}
        <MiniMap
          style={{
            background: isDark ? '#1f2937' : '#f1f5f9',
            border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
          }}
          nodeColor={(n) => {
            const color = (n.data as { color?: string })?.color
            return color ?? (isDark ? '#4b5563' : '#94a3b8')
          }}
          maskColor={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'}
        />

        {/* 사용 안내 텍스트 (캡처 제외) */}
        <div
          data-export-hint
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: isDark ? '#6b7280' : '#94a3b8',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          더블클릭으로 접기/펼치기 · 스크롤로 줌 · 드래그로 이동
        </div>
      </ReactFlow>

      {/* PNG 내보내기 버튼 (우상단 오버레이, 툴바에서도 트리거 가능) */}
      <button
        data-mindmap-export
        onClick={handleExport}
        disabled={exporting}
        className={`
          absolute top-3 right-3 z-10
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
          shadow-md transition-all
          ${exporting
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-600'
          }
        `}
        title="마인드맵을 PNG로 저장"
      >
        {exporting ? (
          <>
            {/* 로딩 스피너 */}
            <svg
              className="animate-spin"
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            저장 중...
          </>
        ) : (
          <>
            {/* 다운로드 아이콘 */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 2v8M5 7l3 3 3-3" />
              <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
            </svg>
            PNG 저장
          </>
        )}
      </button>
    </div>
  )
}

// ReactFlowProvider로 감싸야 useReactFlow 훅 사용 가능
export function MindMapView() {
  return (
    <ReactFlowProvider>
      <MindMapInner />
    </ReactFlowProvider>
  )
}
