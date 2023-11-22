export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      "blog-comments": {
        Row: {
          approve: boolean | null
          comment: string
          created_at: string
          id: string
          slug: string
        }
        Insert: {
          approve?: boolean | null
          comment: string
          created_at?: string
          id?: string
          slug: string
        }
        Update: {
          approve?: boolean | null
          comment?: string
          created_at?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      client: {
        Row: {
          client: boolean
          created_at: string
          id: number
        }
        Insert: {
          client?: boolean
          created_at?: string
          id?: number
        }
        Update: {
          client?: boolean
          created_at?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
