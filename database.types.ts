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
          comment: string
          created_at: string
          id: string
          slug: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          slug: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          slug?: string
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
