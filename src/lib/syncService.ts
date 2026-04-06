// =====================================================
// Supabase 클라우드 동기화 서비스
// 문서/폴더를 Supabase DB에 저장하고 불러옴
// =====================================================

import { supabase } from './supabase'
import type { Document, Folder } from '../types'

// ─────────────────────────────────────────────────
// 문서 (Documents)
// ─────────────────────────────────────────────────

/** 내 모든 문서 불러오기 */
export async function fetchDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) { console.error('fetchDocuments:', error); return [] }

  return (data ?? []).map(rowToDocument)
}

/** 문서 저장 (없으면 생성, 있으면 업데이트) */
export async function upsertDocument(doc: Document, userId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .upsert({
      id: doc.id,
      user_id: userId,
      title: doc.title,
      nodes: doc.nodes,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      starred: doc.starred,
      folder_id: doc.folderId ?? null,
      deleted_at: doc.deletedAt ?? null,
    })

  if (error) console.error('upsertDocument:', error)
}

/** 문서 삭제 */
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) console.error('deleteDocument:', error)
}

// ─────────────────────────────────────────────────
// 폴더 (Folders)
// ─────────────────────────────────────────────────

/** 내 모든 폴더 불러오기 */
export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) { console.error('fetchFolders:', error); return [] }

  return (data ?? []).map(rowToFolder)
}

/** 폴더 저장 */
export async function upsertFolder(folder: Folder, userId: string): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .upsert({
      id: folder.id,
      user_id: userId,
      name: folder.name,
      collapsed: folder.collapsed,
      created_at: folder.createdAt,
    })

  if (error) console.error('upsertFolder:', error)
}

/** 폴더 삭제 */
export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)

  if (error) console.error('deleteFolder:', error)
}

// ─────────────────────────────────────────────────
// 헬퍼: DB row → 앱 타입 변환
// ─────────────────────────────────────────────────

function rowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    title: row.title as string,
    nodes: (row.nodes as Document['nodes']) ?? [],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    starred: row.starred as boolean,
    folderId: (row.folder_id as string | null) ?? null,
    deletedAt: (row.deleted_at as number | null) ?? null,
  }
}

function rowToFolder(row: Record<string, unknown>): Folder {
  return {
    id: row.id as string,
    name: row.name as string,
    collapsed: row.collapsed as boolean,
    createdAt: row.created_at as number,
  }
}
