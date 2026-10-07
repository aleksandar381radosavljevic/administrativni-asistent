export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_queries: {
        Row: {
          created_at: string;
          id: string;
          matched_event_id: string | null;
          query_text: string;
          was_answered: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          matched_event_id?: string | null;
          query_text: string;
          was_answered?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          matched_event_id?: string | null;
          query_text?: string;
          was_answered?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "ai_queries_matched_event_id_fkey";
            columns: ["matched_event_id"];
            isOneToOne: false;
            referencedRelation: "life_events";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_rate_limits: {
        Row: {
          count: number;
          ip_hash: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          ip_hash: string;
          window_start: string;
        };
        Update: {
          count?: number;
          ip_hash?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          changed_at: string;
          changed_by: string | null;
          diff: Json | null;
          entity_id: string;
          entity_type: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          changed_at?: string;
          changed_by?: string | null;
          diff?: Json | null;
          entity_id: string;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          changed_at?: string;
          changed_by?: string | null;
          diff?: Json | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_required: boolean;
          name: string;
          note: string | null;
          procedure_id: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_required?: boolean;
          name: string;
          note?: string | null;
          procedure_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_required?: boolean;
          name?: string;
          note?: string | null;
          procedure_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          address: string | null;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          kind: Database["public"]["Enums"]["institution_kind"];
          name: string;
          phone: string | null;
          search_vector: unknown;
          slug: string;
          status: Database["public"]["Enums"]["content_status"];
          updated_at: string;
          website: string | null;
          working_hours: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["institution_kind"];
          name: string;
          phone?: string | null;
          search_vector?: never;
          slug: string;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
          website?: string | null;
          working_hours?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["institution_kind"];
          name?: string;
          phone?: string | null;
          search_vector?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
          website?: string | null;
          working_hours?: string | null;
        };
        Relationships: [];
      };
      life_event_procedures: {
        Row: {
          life_event_id: string;
          procedure_id: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          life_event_id: string;
          procedure_id: string;
          sort_order?: number;
        };
        Update: {
          life_event_id?: string;
          procedure_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "life_event_procedures_life_event_id_fkey";
            columns: ["life_event_id"];
            isOneToOne: false;
            referencedRelation: "life_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "life_event_procedures_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      life_events: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          estimated_duration: string | null;
          icon: string | null;
          id: string;
          search_vector: unknown;
          slug: string;
          sort_order: number;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          estimated_duration?: string | null;
          icon?: string | null;
          id?: string;
          search_vector?: never;
          slug: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          estimated_duration?: string | null;
          icon?: string | null;
          id?: string;
          search_vector?: never;
          slug?: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "life_events_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      procedure_dependencies: {
        Row: {
          depends_on_id: string;
          life_event_id: string;
          procedure_id: string;
        };
        ComputedFields: never;
        Insert: {
          depends_on_id: string;
          life_event_id: string;
          procedure_id: string;
        };
        Update: {
          depends_on_id?: string;
          life_event_id?: string;
          procedure_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_pd_depends_on_in_event";
            columns: ["life_event_id", "depends_on_id"];
            isOneToOne: false;
            referencedRelation: "life_event_procedures";
            referencedColumns: ["life_event_id", "procedure_id"];
          },
          {
            foreignKeyName: "fk_pd_procedure_in_event";
            columns: ["life_event_id", "procedure_id"];
            isOneToOne: false;
            referencedRelation: "life_event_procedures";
            referencedColumns: ["life_event_id", "procedure_id"];
          },
        ];
      };
      procedure_institutions: {
        Row: {
          institution_id: string;
          note: string | null;
          procedure_id: string;
        };
        ComputedFields: never;
        Insert: {
          institution_id: string;
          note?: string | null;
          procedure_id: string;
        };
        Update: {
          institution_id?: string;
          note?: string | null;
          procedure_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "procedure_institutions_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "procedure_institutions_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      procedures: {
        Row: {
          can_by_mail: boolean;
          can_in_person: boolean;
          can_online: boolean;
          cost_amount: number | null;
          cost_description: string | null;
          cost_type: Database["public"]["Enums"]["cost_type"];
          created_at: string;
          created_by: string | null;
          description: string | null;
          form_link: string | null;
          id: string;
          last_verified_at: string | null;
          official_link: string | null;
          processing_time: string | null;
          search_vector: unknown;
          slug: string;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          can_by_mail?: boolean;
          can_in_person?: boolean;
          can_online?: boolean;
          cost_amount?: number | null;
          cost_description?: string | null;
          cost_type?: Database["public"]["Enums"]["cost_type"];
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          form_link?: string | null;
          id?: string;
          last_verified_at?: string | null;
          official_link?: string | null;
          processing_time?: string | null;
          search_vector?: never;
          slug: string;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          can_by_mail?: boolean;
          can_in_person?: boolean;
          can_online?: boolean;
          cost_amount?: number | null;
          cost_description?: string | null;
          cost_type?: Database["public"]["Enums"]["cost_type"];
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          form_link?: string | null;
          id?: string;
          last_verified_at?: string | null;
          official_link?: string | null;
          processing_time?: string | null;
          search_vector?: never;
          slug?: string;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      steps: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          link_label: string | null;
          link_url: string | null;
          procedure_id: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          link_label?: string | null;
          link_url?: string | null;
          procedure_id: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          link_label?: string | null;
          link_url?: string | null;
          procedure_id?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "steps_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      synonyms: {
        Row: {
          created_at: string;
          id: string;
          maps_to: string;
          search_vector: unknown;
          term: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          maps_to: string;
          search_vector?: never;
          term: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          maps_to?: string;
          search_vector?: never;
          term?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      aa_normalize: { Args: { input: string }; Returns: string };
      admin_ai_query_stats: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          count: number;
          life_event_id: string;
          slug: string;
          title: string;
          unanswered_count: number;
        }[];
      };
      admin_save_procedure: {
        Args: { p_id?: string; p_procedure: Json };
        Returns: string;
      };
      admin_set_life_event_procedures: {
        Args: { p_life_event_id: string; p_procedures: Json };
        Returns: undefined;
      };
      ai_rate_limit_hit: {
        Args: { p_ip_hash: string; p_limit: number };
        Returns: boolean;
      };
      search_content: {
        Args: { max_results?: number; q: string };
        Returns: {
          id: string;
          kind: string;
          rank: number;
          slug: string;
          title: string;
        }[];
      };
    };
    Enums: {
      audit_action: "create" | "update" | "archive" | "delete";
      content_status: "draft" | "published" | "archived";
      cost_type: "free" | "fixed" | "variable" | "unknown";
      institution_kind: "government" | "bank" | "employer" | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      audit_action: ["create", "update", "archive", "delete"],
      content_status: ["draft", "published", "archived"],
      cost_type: ["free", "fixed", "variable", "unknown"],
      institution_kind: ["government", "bank", "employer", "other"],
    },
  },
} as const;
