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
      "page-view": {
        Row: {
          id: number;
          slug: string;
          updated_at: string;
          views: number | null;
        };
        Insert: {
          id?: number;
          slug: string;
          updated_at?: string;
          views?: number | null;
        };
        Update: {
          id?: number;
          slug?: string;
          updated_at?: string;
          views?: number | null;
        };
        Relationships: [];
      };
      "sending-emails": {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          sent: boolean | null;
          slug: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name?: string | null;
          sent?: boolean | null;
          slug?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          sent?: boolean | null;
          slug?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      "increment-view": {
        Args: {
          page_slug: string;
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
