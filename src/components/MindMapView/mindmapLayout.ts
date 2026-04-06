// =====================================================
// 아웃라인 트리 → React Flow 노드/엣지 변환 유틸
// 트리 레이아웃: 루트를 중앙에, 자식들을 방사형으로 배치
// =====================================================

import type { Node, Edge } from 'reactflow'
import type { OutlineNode } from '../../types'

// React Flow 노드에 담을 커스텀 데이터
export interface MindMapNodeData {
  label: string
  note: string
  color: string | null
  completed: boolean
  collapsed: boolean
  tags: string[]
  depth: number
  isRoot: boolean
}

// 레이아웃 상수
const H_SPACING = 220  // 가로 간격 (노드 중심 간 거리)
const V_SPACING = 56   // 세로 간격 (형제 노드 간 거리)
const ROOT_X = 0
const ROOT_Y = 0

/**
 * 서브트리의 전체 높이를 계산 (리프 노드 수 기반)
 */
function getSubtreeHeight(node: OutlineNode): number {
  if (node.children.length === 0 || node.collapsed) {
    return V_SPACING
  }
  return node.children.reduce((sum, child) => sum + getSubtreeHeight(child), 0)
}

/**
 * 재귀적으로 노드와 엣지를 생성
 */
function buildLayout(
  node: OutlineNode,
  x: number,
  y: number,
  depth: number,
  nodes: Node<MindMapNodeData>[],
  edges: Edge[]
): void {
  nodes.push({
    id: node.id,
    type: 'mindmapNode',
    position: { x, y },
    data: {
      label: node.content || '(빈 항목)',
      note: node.note,
      color: node.color,
      completed: node.completed,
      collapsed: node.collapsed,
      tags: node.tags,
      depth,
      isRoot: depth === 0,
    },
  })

  if (node.children.length === 0 || node.collapsed) return

  // 자식들을 세로 중앙 정렬로 배치
  const totalHeight = getSubtreeHeight(node)
  let currentY = y - totalHeight / 2

  node.children.forEach((child) => {
    const childHeight = getSubtreeHeight(child)
    const childY = currentY + childHeight / 2

    // 엣지 추가
    edges.push({
      id: `edge-${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: 'smoothstep',
      style: {
        stroke: node.color ?? '#94a3b8',
        strokeWidth: Math.max(3 - depth, 1),
        opacity: 0.6,
      },
      animated: false,
    })

    buildLayout(child, x + H_SPACING, childY, depth + 1, nodes, edges)
    currentY += childHeight
  })
}

/**
 * 문서의 노드 배열을 React Flow 노드/엣지로 변환
 * 루트 노드가 여러 개면 가상 루트를 만들지 않고 세로로 나열
 */
export function buildMindMapLayout(
  rootNodes: OutlineNode[]
): { nodes: Node<MindMapNodeData>[]; edges: Edge[] } {
  const nodes: Node<MindMapNodeData>[] = []
  const edges: Edge[] = []

  if (rootNodes.length === 0) return { nodes, edges }

  if (rootNodes.length === 1) {
    // 루트가 하나면 중앙에 배치
    buildLayout(rootNodes[0], ROOT_X, ROOT_Y, 0, nodes, edges)
  } else {
    // 루트가 여러 개면 세로로 쌓기
    let offsetY = 0
    rootNodes.forEach((root) => {
      const height = getSubtreeHeight(root)
      buildLayout(root, ROOT_X, offsetY, 0, nodes, edges)
      offsetY += height + V_SPACING * 2
    })
  }

  return { nodes, edges }
}
