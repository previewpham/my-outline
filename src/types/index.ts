// =====================================================
// 핵심 데이터 타입 정의
// =====================================================

/** 헤딩 레벨 타입 (null = 일반 텍스트) */
export type HeadingLevel = null | 1 | 2 | 3

/** 노드에 첨부된 이미지 */
export interface NodeImage {
  id: string
  dataUrl: string   // base64 인코딩 data URL (리사이즈·압축 후)
  name: string      // 원본 파일명
}

/** 아웃라인의 단일 노드 */
export interface OutlineNode {
  id: string
  content: string          // 노드 텍스트 내용 (순수 텍스트, 검색·태그 파싱에 사용)
  note: string             // 노드 메모(설명)
  children: OutlineNode[]  // 중첩 자식 노드들
  collapsed: boolean       // 접힌 상태 여부
  completed: boolean       // 완료(체크) 상태 여부
  color: string | null     // 텍스트 색상 (null이면 기본색)
  tags: string[]           // 파싱된 태그 목록 (예: ["work", "urgent"])
  parentId: string | null  // 부모 노드 ID (루트면 null)
  headingLevel: HeadingLevel  // 헤딩 스타일 (null=일반, 1=H1, 2=H2, 3=H3)
  richText: string            // HTML 서식 내용 (볼드/이탤릭 등, 빈 문자열이면 미사용)
  images: NodeImage[]         // 첨부 이미지 목록
  listType?: 'none' | 'numbered'  // 리스트 타입 (undefined/none=기본, numbered=번호 리스트)
}

/** 문서 (여러 노드를 담는 단위) */
export interface Document {
  id: string
  title: string
  nodes: OutlineNode[]  // 루트 레벨 노드들
  createdAt: number
  updatedAt: number
  starred: boolean      // 즐겨찾기 여부
  folderId: string | null    // 소속 폴더 ID (null = 폴더 없음)
  deletedAt: number | null   // 휴지통으로 이동한 시각 (null = 활성)
}

/** 문서 폴더 */
export interface Folder {
  id: string
  name: string
  collapsed: boolean
  createdAt: number
}

/** 뷰 모드: 아웃라인 or 마인드맵 */
export type ViewMode = 'outline' | 'mindmap'

/** 테마 모드 */
export type Theme = 'light' | 'dark'

/** 노드 이동 위치 타입 (드래그앤드롭용) */
export interface DropPosition {
  targetId: string
  position: 'before' | 'after' | 'inside'
}

/** 실행취소 히스토리 항목 */
export interface HistoryEntry {
  nodes: OutlineNode[]  // 해당 시점의 노드 스냅샷
  timestamp: number
}

/** 노드 색상 옵션 */
export const NODE_COLORS = [
  { label: '기본', value: null },
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '노랑', value: '#eab308' },
  { label: '초록', value: '#22c55e' },
  { label: '파랑', value: '#3b82f6' },
  { label: '보라', value: '#a855f7' },
  { label: '분홍', value: '#ec4899' },
] as const
