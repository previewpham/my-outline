// =====================================================
// 이미지 처리 유틸
//   - 파일 읽기 + 자동 리사이즈 (최대 1200px)
//   - Canvas를 이용한 JPEG 압축 (품질 0.85)
//   - 고유 ID 생성
// =====================================================

import { generateId } from './nodeUtils'
import type { NodeImage } from '../types'

const MAX_SIZE = 1200   // 최대 가로/세로 픽셀
const JPEG_QUALITY = 0.85
const MAX_FILE_MB = 10

/**
 * 이미지 파일을 받아서 리사이즈·압축 후 NodeImage로 변환
 */
export async function processImageFile(file: File): Promise<NodeImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 첨부할 수 있습니다.')
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`이미지 크기가 너무 큽니다 (최대 ${MAX_FILE_MB}MB).`)
  }

  const dataUrl = await resizeToDataUrl(file)
  return {
    id: generateId(),
    dataUrl,
    name: file.name,
  }
}

/**
 * File → ObjectURL → Canvas 리사이즈 → base64 DataURL
 */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      // 최대 사이즈 초과 시 비율 유지하며 축소
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_SIZE)
          width = MAX_SIZE
        } else {
          width = Math.round((width / height) * MAX_SIZE)
          height = MAX_SIZE
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)

      // PNG라면 PNG로, 나머지는 JPEG로 저장
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = mimeType === 'image/png' ? undefined : JPEG_QUALITY
      resolve(canvas.toDataURL(mimeType, quality))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지를 불러올 수 없습니다.'))
    }
    img.src = objectUrl
  })
}

/**
 * DataURL에서 파일 다운로드
 */
export function downloadImage(dataUrl: string, name: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = name || 'image.jpg'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
