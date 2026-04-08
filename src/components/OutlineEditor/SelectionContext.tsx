// =====================================================
// 다중 선택 + 컨텍스트 메뉴 + 포커스 뷰 컨텍스트
// OutlineEditor에서 OutlineNode(깊이 무관)까지
// 이벤트 콜백을 props drilling 없이 전달
// =====================================================

import { createContext, useContext } from 'react'

interface SelectionContextValue {
  /** 노드 위에서 마우스 버튼을 누를 때 호출 (선택 시작) */
  onNodeMouseDown: (nodeId: string, e: React.MouseEvent) => void
  /** 마우스가 노드 영역에 진입할 때 호출 (드래그 중 범위 확장) */
  onNodeMouseEnter: (nodeId: string) => void
  /** 우클릭 컨텍스트 메뉴 열기 */
  onNodeContextMenu: (nodeId: string, e: React.MouseEvent) => void
  /** 줌인(포커스 뷰) 진입 */
  onNodeFocusIn: (nodeId: string) => void
  /** 컨텍스트 메뉴에서 노트 열기 요청 중인 nodeId (해당 노드가 자신의 note를 열어야 함) */
  noteOpenRequestId: string | null
  /**
   * 드래그 선택이 방금 끝났는지 확인하고 플래그를 소비(초기화)
   * true 반환 시: 드래그 끝에서 발생한 클릭이므로 선택 해제하지 말 것
   */
  checkAndConsumeDragSelectEnd: () => boolean
}

export const SelectionContext = createContext<SelectionContextValue>({
  onNodeMouseDown: () => {},
  onNodeMouseEnter: () => {},
  onNodeContextMenu: () => {},
  onNodeFocusIn: () => {},
  noteOpenRequestId: null,
  checkAndConsumeDragSelectEnd: () => false,
})

export const useSelectionContext = () => useContext(SelectionContext)
