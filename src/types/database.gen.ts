export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      leaderboard_entries: {
        Row: {
          achieved_at: string | null;
          duration_ms: number;
          id: string;
          is_anonymous: boolean | null;
          player_name: string;
          replay_id: string | null;
          score: number;
          user_id: string | null;
        };
        Insert: {
          achieved_at?: string | null;
          duration_ms: number;
          id?: string;
          is_anonymous?: boolean | null;
          player_name: string;
          replay_id?: string | null;
          score: number;
          user_id?: string | null;
        };
        Update: {
          achieved_at?: string | null;
          duration_ms?: number;
          id?: string;
          is_anonymous?: boolean | null;
          player_name?: string;
          replay_id?: string | null;
          score?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leaderboard_entries_replay_id_fkey';
            columns: ['replay_id'];
            isOneToOne: true;
            referencedRelation: 'recent_replays';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leaderboard_entries_replay_id_fkey';
            columns: ['replay_id'];
            isOneToOne: true;
            referencedRelation: 'replays';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leaderboard_entries_replay_id_fkey';
            columns: ['replay_id'];
            isOneToOne: true;
            referencedRelation: 'top_leaderboard';
            referencedColumns: ['replay_id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string;
          updated_at: string | null;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id: string;
          updated_at?: string | null;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          updated_at?: string | null;
          username?: string;
        };
        Relationships: [];
      };
      replays: {
        Row: {
          created_at: string | null;
          duration_ms: number | null;
          final_score: number | null;
          game_config: Json;
          id: string;
          inputs: Json;
          is_anonymous: boolean | null;
          metadata: Json | null;
          player_name: string | null;
          seed: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          duration_ms?: number | null;
          final_score?: number | null;
          game_config: Json;
          id?: string;
          inputs: Json;
          is_anonymous?: boolean | null;
          metadata?: Json | null;
          player_name?: string | null;
          seed: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          duration_ms?: number | null;
          final_score?: number | null;
          game_config?: Json;
          id?: string;
          inputs?: Json;
          is_anonymous?: boolean | null;
          metadata?: Json | null;
          player_name?: string | null;
          seed?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      recent_replays: {
        Row: {
          created_at: string | null;
          duration_ms: number | null;
          final_score: number | null;
          id: string | null;
          is_anonymous: boolean | null;
          player_name: string | null;
          user_type: string | null;
        };
        Relationships: [];
      };
      top_leaderboard: {
        Row: {
          achieved_at: string | null;
          duration_ms: number | null;
          id: string | null;
          is_anonymous: boolean | null;
          player_name: string | null;
          replay_id: string | null;
          score: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_player_display_name: {
        Args: { user_uuid: string; fallback_name: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
