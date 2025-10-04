export type DocumentRow = {
  id: string
  user_id: string
  storage_path: string
  file_name: string
  file_type: string | null
  tags: any
  uploaded_at: string | null
}

export type Person = {
  id: string
  givenName: string | null
  familyName: string | null
}

export type Document = {
  id: string
  personId: string
  kind: string
  topic: string | null
  filename: string
  storagePath: string
  uploadedAt: string
  person: Person
}

