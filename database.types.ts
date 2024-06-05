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
          email: string | null;
          id: string;
          reply: string | null;
          slug: string;
        };
        Insert: {
          approve?: boolean | null;
          comment: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          reply?: string | null;
          slug: string;
        };
        Update: {
          approve?: boolean | null;
          comment?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          reply?: string | null;
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
      goals: {
        Row: {
          created_at: string;
          duration: number;
          from: string;
          id: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          duration?: number;
          from: string;
          id?: number;
          title?: string;
        };
        Update: {
          created_at?: string;
          duration?: number;
          from?: string;
          id?: number;
          title?: string;
        };
        Relationships: [];
      };
      newsletter: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          verified: boolean | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          verified?: boolean | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          verified?: boolean | null;
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

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
