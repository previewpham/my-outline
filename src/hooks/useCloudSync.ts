// =====================================================
// 클라우드 동기화 훅
//
// 동작 방식:
//   1. 로그인 시 Supabase에서 데이터 불러와 스토어에 적용
//   2. 문서/폴더 변경 시 1초 디바운스 후 Supabase에 저장
//   3. 로그아웃 시 로컬 데이터 초기화
// =====================================================

import { useEffect, useRef } from 'react'
import { useDocumentStore } from '../store/documentStore'
import { useAuthStore } from '../store/authStore'
import {
  fetchDocuments,
  fetchFolders,
  upsertDocument,
  upsertFolder,
  deleteDocument as deleteDocumentFromDB,
  deleteFolder as deleteFolderFromDB,
} from '../lib/syncService'

export function useCloudSync() {
  const { user } = useAuthStore()
  const {
    documents,
    folders,
    setCloudData,
    syncDeletedDocIds,
    syncDeletedFolderIds,
    clearSyncDeleted,
  } = useDocumentStore()

  const prevDocIdsRef = useRef<Set<string>>(new Set())
  const prevFolderIdsRef = useRef<Set<string>>(new Set())
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDoneRef = useRef(false)

  // ─── 로그인 시: Supabase에서 데이터 불러오기 ───
  useEffect(() => {
    if (!user) {
      initialLoadDoneRef.current = false
      return
    }

    async function loadFromCloud() {
      const [cloudDocs, cloudFolders] = await Promise.all([
        fetchDocuments(),
        fetchFolders(),
      ])
      // 스토어에 클라우드 데이터 덮어쓰기
      setCloudData(cloudDocs, cloudFolders)
      // 현재 ID 목록 기록
      prevDocIdsRef.current = new Set(cloudDocs.map((d) => d.id))
      prevFolderIdsRef.current = new Set(cloudFolders.map((f) => f.id))
      initialLoadDoneRef.current = true
    }

    loadFromCloud()
  }, [user?.id])

  // ─── 변경 감지 → 디바운스 저장 ───
  useEffect(() => {
    if (!user || !initialLoadDoneRef.current) return

    // 이전에 등록된 타이머 취소
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)

    syncTimerRef.current = setTimeout(async () => {
      const userId = user.id

      // 1) 삭제된 문서 DB에서도 삭제
      for (const id of syncDeletedDocIds) {
        await deleteDocumentFromDB(id)
      }
      // 2) 삭제된 폴더 DB에서도 삭제
      for (const id of syncDeletedFolderIds) {
        await deleteFolderFromDB(id)
      }
      clearSyncDeleted()

      // 3) 현재 문서 전체 upsert
      for (const doc of documents) {
        await upsertDocument(doc, userId)
      }

      // 4) 현재 폴더 전체 upsert
      for (const folder of folders) {
        await upsertFolder(folder, userId)
      }
    }, 1000) // 1초 디바운스

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [user, documents, folders])
}
