export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      "blog-comments": {
        Row: {
          approve: boolean | null;
          comment: string;
          created_at: string;
          id: string;
          slug: string;
        };
        Insert: {
          approve?: boolean | null;
          comment: string;
          created_at?: string;
          id?: string;
          slug: string;
        };
        Update: {
          approve?: boolean | null;
          comment?: string;
          created_at?: string;
          id?: string;
          slug?: string;
        };
        Relationships: [];
      };
      client: {
        Row: {
          client: boolean;
          created_at: string;
          id: number;
        };
        Insert: {
          client?: boolean;
          created_at?: string;
          id?: number;
        };
        Update: {
          client?: boolean;
          created_at?: string;
          id?: number;
        };
        Relationships: [];
      };
      page_views: {
        Row: {
          id: number;
          slug: string;
          view_count: number | null;
        };
        Insert: {
          id?: number;
          slug: string;
          view_count?: number | null;
        };
        Update: {
          id?: number;
          slug?: string;
          view_count?: number | null;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: number;
          slug: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          id?: number;
          slug: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          id?: number;
          slug?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      "sending-emails": {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_page_view: {
        Args: {
          page_slug: string;
        };
        Returns: undefined;
      };
      "send-comment": {
        Args: {
          comment_text: string;
          slug_text: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
