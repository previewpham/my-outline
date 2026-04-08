// =====================================================
// 노드 트리 조작 유틸 함수들
// 중첩 트리를 불변성을 지키며 수정하는 순수 함수 모음
// =====================================================

import type { OutlineNode } from '../types'

/** 고유 ID 생성 */
export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** 노드 트리를 새 ID로 깊은 복사 (붙여넣기용) */
export function cloneNodeTree(node: OutlineNode, parentId: string | null = null): OutlineNode {
  const newId = generateId()
  return {
    ...node,
    id: newId,
    parentId,
    children: node.children.map((child) => cloneNodeTree(child, newId)),
  }
}

/** 빈 노드 생성 */
export function createNode(parentId: string | null = null): OutlineNode {
  return {
    id: generateId(),
    content: '',
    note: '',
    children: [],
    collapsed: false,
    completed: false,
    color: null,
    tags: [],
    parentId,
    headingLevel: null,  // 기본은 일반 텍스트
    richText: '',        // 기본은 서식 없음
    images: [],          // 기본은 첨부 이미지 없음
  }
}

/** 트리에서 특정 ID의 노드를 찾아 반환 */
export function findNode(nodes: OutlineNode[], id: string): OutlineNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

/** 트리에서 특정 노드의 부모와 인덱스를 찾아 반환 */
export function findParentAndIndex(
  nodes: OutlineNode[],
  id: string,
  parent: OutlineNode[] | null = null
): { parent: OutlineNode[] | null; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return { parent: parent ?? nodes, index: i }
    const result = findParentAndIndex(nodes[i].children, id, nodes[i].children)
    if (result) return result
  }
  return null
}

/** 특정 노드의 내용을 업데이트 (불변) */
export function updateNode(
  nodes: OutlineNode[],
  id: string,
  updates: Partial<OutlineNode>
): OutlineNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...updates }
    return { ...node, children: updateNode(node.children, id, updates) }
  })
}

/** 특정 노드를 삭제하고 삭제된 노드 반환 */
export function removeNode(
  nodes: OutlineNode[],
  id: string
): { nodes: OutlineNode[]; removed: OutlineNode | null } {
  let removed: OutlineNode | null = null

  const filtered = nodes.filter((node) => {
    if (node.id === id) {
      removed = node
      return false
    }
    return true
  })

  if (removed) return { nodes: filtered, removed }

  const result = filtered.map((node) => {
    const res = removeNode(node.children, id)
    if (res.removed) {
      removed = res.removed
      return { ...node, children: res.nodes }
    }
    return node
  })

  return { nodes: result, removed }
}

/** 노드를 특정 위치에 삽입 */
export function insertNodeAt(
  nodes: OutlineNode[],
  targetId: string,
  newNode: OutlineNode,
  position: 'before' | 'after' | 'inside'
): OutlineNode[] {
  if (position === 'inside') {
    return nodes.map((node) => {
      if (node.id === targetId) {
        return { ...node, children: [...node.children, newNode] }
      }
      return { ...node, children: insertNodeAt(node.children, targetId, newNode, position) }
    })
  }

  const result: OutlineNode[] = []
  for (const node of nodes) {
    if (node.id === targetId) {
      if (position === 'before') result.push(newNode)
      result.push(node)
      if (position === 'after') result.push(newNode)
    } else {
      result.push({ ...node, children: insertNodeAt(node.children, targetId, newNode, position) })
    }
  }
  return result
}

/** Tab: 노드를 이전 형제의 자식으로 이동 (들여쓰기) */
export function indentNode(nodes: OutlineNode[], id: string): OutlineNode[] {
  // 루트 레벨에서 처리
  const idx = nodes.findIndex((n) => n.id === id)
  if (idx > 0) {
    const node = nodes[idx]
    const prevSibling = nodes[idx - 1]
    const newNodes = nodes.filter((_, i) => i !== idx)
    return newNodes.map((n) => {
      if (n.id === prevSibling.id) {
        return {
          ...n,
          collapsed: false,
          children: [
            ...n.children,
            { ...node, parentId: n.id },
          ],
        }
      }
      return n
    })
  }

  // 재귀적으로 자식에서 처리
  return nodes.map((node) => ({
    ...node,
    children: indentNode(node.children, id),
  }))
}

/** Shift+Tab: 노드를 부모의 형제로 이동 (내어쓰기) */
export function outdentNode(nodes: OutlineNode[], id: string, parentList: OutlineNode[] | null = null): OutlineNode[] {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      if (!parentList) return nodes // 이미 루트 레벨이면 무시
      // 부모 배열에서 처리는 재귀 호출 쪽에서 담당
      return nodes
    }
    // 자식 중에서 찾기
    const childIdx = nodes[i].children.findIndex((c) => c.id === id)
    if (childIdx !== -1) {
      const targetNode = nodes[i].children[childIdx]
      // 부모 뒤에 삽입
      const newChildren = nodes[i].children.filter((_, ci) => ci !== childIdx)
      const newNodes = [...nodes]
      newNodes[i] = { ...nodes[i], children: newChildren }
      // 부모 노드 다음 위치에 삽입
      newNodes.splice(i + 1, 0, { ...targetNode, parentId: nodes[i].parentId })
      return newNodes
    }
    // 더 깊은 곳에서 찾기
    const updated = outdentNode(nodes[i].children, id, nodes[i].children)
    if (updated !== nodes[i].children) {
      return nodes.map((n, ni) => ni === i ? { ...n, children: updated } : n)
    }
  }
  return nodes
}

/** 노드와 모든 자손의 ID를 수집 */
export function collectIds(node: OutlineNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)]
}

/** 트리를 평탄한 배열로 변환 (검색용) */
export function flattenTree(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)])
}

/** 특정 노드의 같은 레벨에서 다음 노드 ID를 반환 */
export function getNextSiblingId(nodes: OutlineNode[], id: string): string | null {
  const idx = nodes.findIndex((n) => n.id === id)
  if (idx !== -1 && idx < nodes.length - 1) return nodes[idx + 1].id

  for (const node of nodes) {
    const result = getNextSiblingId(node.children, id)
    if (result) return result
  }
  return null
}

/** 특정 노드의 이전 형제 ID 반환 */
export function getPrevSiblingId(nodes: OutlineNode[], id: string): string | null {
  const idx = nodes.findIndex((n) => n.id === id)
  if (idx > 0) return nodes[idx - 1].id

  for (const node of nodes) {
    const result = getPrevSiblingId(node.children, id)
    if (result) return result
  }
  return null
}

// =====================================================
// 다중 선택 + 일괄 들여쓰기/내어쓰기 유틸
// =====================================================

/**
 * 현재 화면에 보이는 노드를 문서 순서(DFS)로 나열한 ID 배열 반환
 * collapsed된 노드의 자식은 화면에 보이지 않으므로 제외
 */
export function getFlatNodeOrder(nodes: OutlineNode[]): string[] {
  const result: string[] = []
  function walk(list: OutlineNode[]) {
    for (const node of list) {
      result.push(node.id)
      if (!node.collapsed && node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}

/**
 * anchor ~ current 사이의 모든 보이는 노드 ID를 범위로 반환 (드래그 선택용)
 * anchorId와 currentId 사이의 모든 노드를 포함 (순서 무관)
 */
export function getRangeSelectedIds(
  nodes: OutlineNode[],
  anchorId: string,
  currentId: string
): string[] {
  const flatOrder = getFlatNodeOrder(nodes)
  const aIdx = flatOrder.indexOf(anchorId)
  const bIdx = flatOrder.indexOf(currentId)
  if (aIdx === -1 || bIdx === -1) return [anchorId]
  const [start, end] = aIdx <= bIdx ? [aIdx, bIdx] : [bIdx, aIdx]
  return flatOrder.slice(start, end + 1)
}

/**
 * 선택된 ID 중 다른 선택된 노드의 자손이 아닌 최상위 노드만 반환
 * 예) 부모 A와 자식 B가 모두 선택된 경우 → A만 반환 (B는 A와 함께 이동)
 */
export function filterTopLevelSelected(
  nodes: OutlineNode[],
  selectedIds: Set<string>
): string[] {
  const result: string[] = []
  function walk(list: OutlineNode[], hasSelectedAncestor: boolean) {
    for (const node of list) {
      const isSelected = selectedIds.has(node.id)
      if (isSelected && !hasSelectedAncestor) {
        result.push(node.id)
        // 자식은 부모와 함께 이동하므로 별도 처리 불필요
        walk(node.children, true)
      } else {
        walk(node.children, hasSelectedAncestor)
      }
    }
  }
  walk(nodes, false)
  return result
}

/**
 * 여러 노드를 한꺼번에 들여쓰기
 * 위에서 아래 순서로 처리: 앞 항목이 먼저 들여쓰기되면 뒤 항목은 같은 부모 아래로 모임
 */
export function bulkIndentNodes(nodes: OutlineNode[], ids: string[]): OutlineNode[] {
  const selectedSet = new Set(ids)
  const topLevel = filterTopLevelSelected(nodes, selectedSet)
  let result = nodes
  for (const id of topLevel) {
    result = indentNode(result, id)
  }
  return result
}

/**
 * 여러 노드를 한꺼번에 내어쓰기
 * 아래에서 위 순서로 처리: 역순으로 하면 앞 노드의 위치가 보존됨
 */
export function bulkOutdentNodes(nodes: OutlineNode[], ids: string[]): OutlineNode[] {
  const selectedSet = new Set(ids)
  const topLevel = filterTopLevelSelected(nodes, selectedSet)
  let result = nodes
  for (const id of [...topLevel].reverse()) {
    result = outdentNode(result, id)
  }
  return result
}

/**
 * 특정 노드까지의 조상 경로를 반환 (루트 → 해당 노드 순서)
 * 포커스 뷰의 브레드크럼 표시에 사용
 */
export function findAncestorPath(
  nodes: OutlineNode[],
  targetId: string,
  path: OutlineNode[] = []
): OutlineNode[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [...path, node]
    const result = findAncestorPath(node.children, targetId, [...path, node])
    if (result) return result
  }
  return null
}

/** 전체 텍스트(content + note) 단어 수 계산 */
export function countWords(nodes: OutlineNode[]): number {
  return flattenTree(nodes).reduce((acc, node) => {
    const text = (node.content + ' ' + node.note).trim()
    if (!text) return acc
    return acc + text.split(/\s+/).filter(Boolean).length
  }, 0)
}
