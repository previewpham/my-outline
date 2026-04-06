// =====================================================
// 문서 및 노드 상태 관리 (Zustand)
// 모든 CRUD, 실행취소, 저장, 다중선택 로직을 담당
// =====================================================

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { Document, Folder, NodeImage, OutlineNode, ViewMode, Theme, HeadingLevel } from '../types'
import {
  createNode,
  generateId,
  updateNode,
  removeNode,
  indentNode,
  outdentNode,
  insertNodeAt,
  findNode,
  flattenTree,
  bulkIndentNodes,
  bulkOutdentNodes,
} from '../utils/nodeUtils'
import { parseTags } from '../utils/tagUtils'

const MAX_HISTORY = 50

interface HistoryEntry {
  nodes: OutlineNode[]
}

interface AppState {
  // 문서 목록
  documents: Document[]
  activeDocumentId: string | null

  // 폴더 목록
  folders: Folder[]

  // 에디터 상태
  selectedNodeId: string | null
  viewMode: ViewMode
  theme: Theme
  searchQuery: string
  tagFilter: string

  // 다중 선택 (드래그로 여러 항목 선택)
  multiSelectedIds: string[]

  // 포커스(줌인) 뷰: 특정 노드를 루트로 표시
  focusedNodeId: string | null

  // 집중 모드: 현재 편집 노드 외 모두 흐리게
  focusMode: boolean

  // 프레젠테이션 모드
  presentationMode: boolean

  // 실행취소 스택
  undoStack: HistoryEntry[]

  // --- 문서 액션 ---
  createDocument: () => void
  deleteDocument: (id: string) => void          // 완전 삭제 (휴지통에서 사용)
  trashDocument: (id: string) => void           // 휴지통으로 이동
  restoreDocument: (id: string) => void         // 휴지통에서 복원
  emptyTrash: () => void                        // 휴지통 비우기
  renameDocument: (id: string, title: string) => void
  setActiveDocument: (id: string) => void
  toggleStarDocument: (id: string) => void
  moveDocumentToFolder: (docId: string, folderId: string | null) => void

  // --- 폴더 액션 ---
  createFolder: (name?: string) => void
  deleteFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  toggleFolderCollapse: (id: string) => void

  // --- 노드 액션 ---
  addNodeAfter: (afterId: string) => void
  addChildNode: (parentId: string) => void
  deleteNode: (id: string) => void
  updateNodeContent: (id: string, content: string) => void
  updateNodeNote: (id: string, note: string) => void
  toggleNodeCollapse: (id: string) => void
  toggleNodeComplete: (id: string) => void
  setNodeColor: (id: string, color: string | null) => void
  setNodeHeading: (id: string, level: HeadingLevel) => void   // H1/H2/H3 설정
  updateNodeRichText: (id: string, richText: string) => void  // 볼드/이탤릭 HTML 저장
  addNodeImage: (id: string, image: NodeImage) => void        // 이미지 첨부
  removeNodeImage: (id: string, imageId: string) => void      // 이미지 삭제
  indentNode: (id: string) => void
  outdentNode: (id: string) => void

  // --- 다중 선택 액션 ---
  setMultiSelected: (ids: string[]) => void   // 선택 목록 교체
  clearMultiSelected: () => void              // 선택 해제
  bulkIndent: () => void                      // 선택된 항목 전부 들여쓰기
  bulkOutdent: () => void                     // 선택된 항목 전부 내어쓰기

  // --- 포커스 뷰 ---
  setFocusedNode: (id: string | null) => void

  // --- 집중 모드 / 프레젠테이션 ---
  toggleFocusMode: () => void
  setPresentationMode: (on: boolean) => void

  // --- 뷰 / 테마 액션 ---
  setViewMode: (mode: ViewMode) => void
  setTheme: (theme: Theme) => void
  setSelectedNode: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setTagFilter: (tag: string) => void

  // --- 실행취소 ---
  undo: () => void
  pushHistory: () => void
}

function getActiveNodes(state: AppState): OutlineNode[] {
  const doc = state.documents.find((d) => d.id === state.activeDocumentId)
  return doc?.nodes ?? []
}

function setActiveNodes(state: AppState, nodes: OutlineNode[]): void {
  const doc = state.documents.find((d) => d.id === state.activeDocumentId)
  if (doc) {
    doc.nodes = nodes
    doc.updatedAt = Date.now()
  }
}

function makeFolder(name = '새 폴더'): Folder {
  return {
    id: generateId(),
    name,
    collapsed: false,
    createdAt: Date.now(),
  }
}

function makeDocument(folderId: string | null = null): Document {
  const rootNode = createNode(null)
  return {
    id: generateId(),
    title: '새 문서',
    nodes: [rootNode],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    starred: false,
    folderId,
    deletedAt: null,
  }
}

export const useDocumentStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      documents: [makeDocument()],
      activeDocumentId: null,
      folders: [],
      selectedNodeId: null,
      viewMode: 'outline',
      theme: 'light',
      searchQuery: '',
      tagFilter: '',
      multiSelectedIds: [],
      focusedNodeId: null,
      focusMode: false,
      presentationMode: false,
      undoStack: [],

      // --- 문서 액션 ---

      createDocument() {
        set((s) => {
          const doc = makeDocument()
          s.documents.push(doc)
          s.activeDocumentId = doc.id
          s.selectedNodeId = doc.nodes[0].id
          s.multiSelectedIds = []
        })
      },

      // 완전 삭제 (휴지통에서만 사용)
      deleteDocument(id) {
        set((s) => {
          s.documents = s.documents.filter((d) => d.id !== id)
          if (s.activeDocumentId === id) {
            const next = s.documents.find((d) => !d.deletedAt)
            s.activeDocumentId = next?.id ?? null
          }
        })
      },

      // 휴지통으로 이동 (소프트 삭제)
      trashDocument(id) {
        set((s) => {
          const doc = s.documents.find((d) => d.id === id)
          if (doc) {
            doc.deletedAt = Date.now()
            // 현재 활성 문서를 삭제하면 다른 문서로 전환
            if (s.activeDocumentId === id) {
              const next = s.documents.find((d) => d.id !== id && !d.deletedAt)
              s.activeDocumentId = next?.id ?? null
            }
          }
        })
      },

      // 휴지통에서 복원
      restoreDocument(id) {
        set((s) => {
          const doc = s.documents.find((d) => d.id === id)
          if (doc) {
            doc.deletedAt = null
            s.activeDocumentId = id
          }
        })
      },

      // 휴지통 비우기 (영구 삭제)
      emptyTrash() {
        set((s) => {
          s.documents = s.documents.filter((d) => !d.deletedAt)
          if (!s.documents.find((d) => d.id === s.activeDocumentId)) {
            s.activeDocumentId = s.documents[0]?.id ?? null
          }
        })
      },

      renameDocument(id, title) {
        set((s) => {
          const doc = s.documents.find((d) => d.id === id)
          if (doc) {
            doc.title = title
            doc.updatedAt = Date.now()
          }
        })
      },

      setActiveDocument(id) {
        set((s) => {
          s.activeDocumentId = id
          s.selectedNodeId = null
          s.multiSelectedIds = []
          s.focusedNodeId = null
          s.undoStack = []
        })
      },

      toggleStarDocument(id) {
        set((s) => {
          const doc = s.documents.find((d) => d.id === id)
          if (doc) doc.starred = !doc.starred
        })
      },

      moveDocumentToFolder(docId, folderId) {
        set((s) => {
          const doc = s.documents.find((d) => d.id === docId)
          if (doc) doc.folderId = folderId
        })
      },

      // --- 폴더 액션 ---

      createFolder(name = '새 폴더') {
        set((s) => {
          s.folders.push(makeFolder(name))
        })
      },

      deleteFolder(id) {
        set((s) => {
          s.folders = s.folders.filter((f) => f.id !== id)
          // 폴더 안 문서들을 루트로 이동
          s.documents.forEach((d) => {
            if (d.folderId === id) d.folderId = null
          })
        })
      },

      renameFolder(id, name) {
        set((s) => {
          const folder = s.folders.find((f) => f.id === id)
          if (folder) folder.name = name
        })
      },

      toggleFolderCollapse(id) {
        set((s) => {
          const folder = s.folders.find((f) => f.id === id)
          if (folder) folder.collapsed = !folder.collapsed
        })
      },

      // --- 노드 액션 ---

      addNodeAfter(afterId) {
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const newNode = createNode(null)
          const updated = insertNodeAt(nodes, afterId, newNode, 'after')
          setActiveNodes(s as unknown as AppState, updated)
          s.selectedNodeId = newNode.id
          s.multiSelectedIds = []
        })
      },

      addChildNode(parentId) {
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const newNode = createNode(parentId)
          const updated = insertNodeAt(nodes, parentId, newNode, 'inside')
          setActiveNodes(s as unknown as AppState, updated)
          s.selectedNodeId = newNode.id
          s.multiSelectedIds = []
        })
      },

      deleteNode(id) {
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const { nodes: updated } = removeNode(nodes, id)
          setActiveNodes(s as unknown as AppState, updated)
          if (s.selectedNodeId === id) s.selectedNodeId = null
          s.multiSelectedIds = s.multiSelectedIds.filter((mid) => mid !== id)
        })
      },

      updateNodeContent(id, content) {
        set((s) => {
          const tags = parseTags(content)
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = updateNode(nodes, id, { content, tags })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      updateNodeNote(id, note) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = updateNode(nodes, id, { note })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      toggleNodeCollapse(id) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const node = findNode(nodes, id)
          if (!node) return
          const updated = updateNode(nodes, id, { collapsed: !node.collapsed })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      toggleNodeComplete(id) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const node = findNode(nodes, id)
          if (!node) return
          const updated = updateNode(nodes, id, { completed: !node.completed })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      setNodeColor(id, color) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = updateNode(nodes, id, { color })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      setNodeHeading(id, level) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = updateNode(nodes, id, { headingLevel: level })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      updateNodeRichText(id, richText) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = updateNode(nodes, id, { richText })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      addNodeImage(id, image) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const node = findNode(nodes, id)
          if (!node) return
          const images = [...(node.images ?? []), image]
          const updated = updateNode(nodes, id, { images })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      removeNodeImage(id, imageId) {
        set((s) => {
          const nodes = getActiveNodes(s as unknown as AppState)
          const node = findNode(nodes, id)
          if (!node) return
          const images = (node.images ?? []).filter((img) => img.id !== imageId)
          const updated = updateNode(nodes, id, { images })
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      indentNode(id) {
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = indentNode(nodes, id)
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      outdentNode(id) {
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = outdentNode(nodes, id)
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      // --- 다중 선택 액션 ---

      setMultiSelected(ids) {
        set((s) => { s.multiSelectedIds = ids })
      },

      clearMultiSelected() {
        set((s) => { s.multiSelectedIds = [] })
      },

      bulkIndent() {
        const { multiSelectedIds } = get()
        if (multiSelectedIds.length === 0) return
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = bulkIndentNodes(nodes, multiSelectedIds)
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      bulkOutdent() {
        const { multiSelectedIds } = get()
        if (multiSelectedIds.length === 0) return
        set((s) => {
          get().pushHistory()
          const nodes = getActiveNodes(s as unknown as AppState)
          const updated = bulkOutdentNodes(nodes, multiSelectedIds)
          setActiveNodes(s as unknown as AppState, updated)
        })
      },

      // --- 포커스 뷰 ---

      setFocusedNode(id) {
        set((s) => { s.focusedNodeId = id })
      },

      // --- 집중 모드 / 프레젠테이션 ---

      toggleFocusMode() {
        set((s) => { s.focusMode = !s.focusMode })
      },

      setPresentationMode(on) {
        set((s) => { s.presentationMode = on })
      },

      // --- 뷰 / 테마 ---

      setViewMode(mode) {
        set((s) => { s.viewMode = mode })
      },

      setTheme(theme) {
        set((s) => { s.theme = theme })
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      setSelectedNode(id) {
        set((s) => { s.selectedNodeId = id })
      },

      setSearchQuery(q) {
        set((s) => { s.searchQuery = q })
      },

      setTagFilter(tag) {
        set((s) => { s.tagFilter = tag })
      },

      // --- 실행취소 ---

      pushHistory() {
        const nodes = getActiveNodes(get())
        set((s) => {
          s.undoStack = [
            ...s.undoStack.slice(-MAX_HISTORY),
            { nodes: JSON.parse(JSON.stringify(nodes)) },
          ]
        })
      },

      undo() {
        set((s) => {
          if (s.undoStack.length === 0) return
          const prev = s.undoStack[s.undoStack.length - 1]
          s.undoStack = s.undoStack.slice(0, -1)
          setActiveNodes(s as unknown as AppState, prev.nodes)
        })
      },
    })),
    {
      name: 'my-outline-storage',
      partialize: (state) => ({
        documents: state.documents,
        activeDocumentId: state.activeDocumentId,
        theme: state.theme,
        folders: state.folders,
      }),
    }
  )
)

export function useActiveDocument() {
  return useDocumentStore((s) => {
    // 활성 문서가 있고 삭제되지 않은 경우 반환
    const active = s.documents.find((d) => d.id === s.activeDocumentId && !d.deletedAt)
    if (active) return active
    // 폴백: 삭제되지 않은 첫 번째 문서
    return s.documents.find((d) => !d.deletedAt) ?? null
  })
}

export function useFilteredNodes() {
  const doc = useActiveDocument()
  const searchQuery = useDocumentStore((s) => s.searchQuery)
  const tagFilter = useDocumentStore((s) => s.tagFilter)

  if (!doc) return []

  let nodes = doc.nodes
  if (!searchQuery && !tagFilter) return nodes

  const flat = flattenTree(nodes)
  return flat.filter((node) => {
    const matchSearch = searchQuery
      ? node.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.note.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    const matchTag = tagFilter
      ? node.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()))
      : true
    return matchSearch && matchTag
  })
}
