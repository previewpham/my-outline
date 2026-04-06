// =====================================================
// 문서 내보내기 유틸
//   - exportAsText    : 클립보드에 들여쓰기 텍스트 복사
//   - exportAsMarkdown: .md 파일 다운로드
//   - exportAsOpml    : .opml 파일 다운로드 (아웃라이너 표준)
//   - exportMindMapToPng: React Flow 캔버스 → PNG 다운로드
// =====================================================

import { toPng } from 'html-to-image'
import type { OutlineNode } from '../types'

// ─────────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────────

/** Blob을 파일로 다운로드 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** XML 특수문자 이스케이프 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 안전한 파일명 생성 (특수문자 제거) */
function safeFilename(title: string): string {
  return (title || 'outline').replace(/[\\/:*?"<>|]/g, '_')
}

// ─────────────────────────────────────────────────
// 텍스트 내보내기 (클립보드 복사)
// ─────────────────────────────────────────────────

function buildTextLines(nodes: OutlineNode[], depth: number): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const indent = '  '.repeat(depth)
    const status = node.completed ? '[x] ' : '[ ] '
    lines.push(`${indent}- ${status}${node.content || '(빈 항목)'}`)
    if (node.note) {
      lines.push(`${indent}    💬 ${node.note}`)
    }
    if (!node.collapsed && node.children.length > 0) {
      lines.push(...buildTextLines(node.children, depth + 1))
    }
  }
  return lines
}

/**
 * 아웃라인을 들여쓰기 텍스트로 변환하여 클립보드에 복사
 */
export async function exportAsText(nodes: OutlineNode[], title: string): Promise<void> {
  const lines = buildTextLines(nodes, 0)
  const content = [title, '', ...lines].join('\n')
  await navigator.clipboard.writeText(content)
}

// ─────────────────────────────────────────────────
// 마크다운 내보내기 (.md 파일)
// ─────────────────────────────────────────────────

function buildMarkdownLines(nodes: OutlineNode[], depth: number): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const text = node.content || '(빈 항목)'

    // 최상위 레벨이고 headingLevel이 있으면 헤딩으로 변환
    if (depth === 0 && node.headingLevel) {
      const hashes = '#'.repeat(node.headingLevel)
      lines.push(`${hashes} ${text}`)
    } else {
      const indent = '  '.repeat(depth)
      const check = node.completed ? '[x]' : '[ ]'
      lines.push(`${indent}- ${check} ${text}`)
    }

    // 메모는 인용구로
    if (node.note) {
      const indent = '  '.repeat(depth + 1)
      lines.push(`${indent}> ${node.note}`)
    }

    if (!node.collapsed && node.children.length > 0) {
      lines.push(...buildMarkdownLines(node.children, depth + 1))
    }
  }
  return lines
}

/**
 * 아웃라인을 Markdown 파일로 다운로드
 */
export function exportAsMarkdown(nodes: OutlineNode[], title: string): void {
  const lines = buildMarkdownLines(nodes, 0)
  const content = [`# ${title}`, '', ...lines].join('\n')
  downloadFile(content, `${safeFilename(title)}.md`, 'text/markdown')
}

// ─────────────────────────────────────────────────
// OPML 내보내기 (.opml 파일)
// ─────────────────────────────────────────────────

function buildOpmlOutlines(nodes: OutlineNode[], indentLevel: number): string {
  const pad = '    '.repeat(indentLevel)
  return nodes
    .map((node) => {
      const text = escapeXml(node.content || '(빈 항목)')
      const attrs: string[] = [`text="${text}"`]

      if (node.note) attrs.push(`_note="${escapeXml(node.note)}"`)
      if (node.completed) attrs.push('_status="complete"')
      if (node.color) attrs.push(`_color="${node.color}"`)
      if (node.headingLevel) attrs.push(`_headingLevel="${node.headingLevel}"`)

      const attrStr = attrs.join(' ')

      if (node.children.length === 0) {
        return `${pad}<outline ${attrStr}/>`
      }

      const children = buildOpmlOutlines(node.children, indentLevel + 1)
      return `${pad}<outline ${attrStr}>\n${children}\n${pad}</outline>`
    })
    .join('\n')
}

/**
 * 아웃라인을 OPML 파일로 다운로드
 * OPML 2.0 표준 준수, 아웃라이너 앱들과 호환
 */
export function exportAsOpml(nodes: OutlineNode[], title: string): void {
  const dateStr = new Date().toUTCString()
  const outlines = buildOpmlOutlines(nodes, 2)

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${dateStr}</dateCreated>
    <dateModified>${dateStr}</dateModified>
  </head>
  <body>
${outlines}
  </body>
</opml>`

  downloadFile(content, `${safeFilename(title)}.opml`, 'text/x-opml')
}

interface ExportOptions {
  filename?: string      // 저장 파일명 (확장자 제외)
  backgroundColor?: string
  pixelRatio?: number    // 해상도 배수 (기본 2배 = Retina)
  padding?: number       // 캔버스 여백 (px)
}

/**
 * React Flow 컨테이너 DOM 요소를 PNG로 내보내기
 * @param element - .react-flow 컨테이너 요소
 * @param options - 내보내기 옵션
 */
export async function exportMindMapToPng(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `mindmap_${new Date().toISOString().slice(0, 10)}`,
    backgroundColor = '#ffffff',
    pixelRatio = 2,
    padding = 40,
  } = options

  // React Flow 내부 요소만 캡처 (컨트롤/미니맵 제외하지 않고 전체 캡처)
  // 미니맵과 컨트롤을 숨겼다가 복원
  const controls = element.querySelector('.react-flow__controls') as HTMLElement | null
  const minimap = element.querySelector('.react-flow__minimap') as HTMLElement | null
  const attribution = element.querySelector('.react-flow__attribution') as HTMLElement | null
  const hint = element.querySelector('[data-export-hint]') as HTMLElement | null

  // 캡처 시 UI 요소 임시 숨기기
  const origControlsDisplay = controls?.style.display
  const origMinimapDisplay = minimap?.style.display
  const origAttributionDisplay = attribution?.style.display
  const origHintDisplay = hint?.style.display

  if (controls) controls.style.display = 'none'
  if (minimap) minimap.style.display = 'none'
  if (attribution) attribution.style.display = 'none'
  if (hint) hint.style.display = 'none'

  try {
    const dataUrl = await toPng(element, {
      backgroundColor,
      pixelRatio,
      style: {
        padding: `${padding}px`,
      },
      // 외부 폰트/이미지 로드 실패 시 무시
      skipFonts: false,
    })

    // 다운로드 링크 생성
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = dataUrl
    link.click()
  } finally {
    // UI 요소 복원
    if (controls && origControlsDisplay !== undefined) controls.style.display = origControlsDisplay ?? ''
    if (minimap && origMinimapDisplay !== undefined) minimap.style.display = origMinimapDisplay ?? ''
    if (attribution && origAttributionDisplay !== undefined) attribution.style.display = origAttributionDisplay ?? ''
    if (hint && origHintDisplay !== undefined) hint.style.display = origHintDisplay ?? ''
  }
}
