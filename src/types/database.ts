export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: "member" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          role?: "member" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          role?: "member" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          name: string;
          rating: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          rating?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          rating?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          venue: string;
          starts_at: string;
          status: string;
          seed: number;
          round_minutes: number;
          break_minutes: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          venue?: string;
          starts_at: string;
          status?: string;
          seed?: number;
          round_minutes?: number;
          break_minutes?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      event_players: {
        Row: {
          id: string;
          event_id: string;
          player_id: string;
          name_snapshot: string;
          rating_snapshot: number;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          player_id: string;
          name_snapshot: string;
          rating_snapshot: number;
          display_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          player_id?: string;
          name_snapshot?: string;
          rating_snapshot?: number;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_players_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      event_rounds: {
        Row: {
          id: string;
          event_id: string;
          round_number: number;
          court_count: number;
          starts_at: string | null;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          round_number: number;
          court_count: number;
          starts_at?: string | null;
          duration_seconds: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["event_rounds"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "event_rounds_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          event_id: string;
          round_id: string;
          court_number: number;
          status: string;
          team_one_player_one_id: string;
          team_one_player_two_id: string;
          team_two_player_one_id: string;
          team_two_player_two_id: string;
          team_one_score: number | null;
          team_two_score: number | null;
          timer_started_at: string | null;
          timer_paused_at: string | null;
          timer_accumulated_pause_seconds: number;
          timer_duration_seconds: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          round_id: string;
          court_number: number;
          status?: string;
          team_one_player_one_id: string;
          team_one_player_two_id: string;
          team_two_player_one_id: string;
          team_two_player_two_id: string;
          team_one_score?: number | null;
          team_two_score?: number | null;
          timer_started_at?: string | null;
          timer_paused_at?: string | null;
          timer_accumulated_pause_seconds?: number;
          timer_duration_seconds: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_event_id_round_id_fkey";
            columns: ["event_id", "round_id"];
            isOneToOne: false;
            referencedRelation: "event_rounds";
            referencedColumns: ["event_id", "id"];
          },
          {
            foreignKeyName: "matches_event_id_team_one_player_one_id_fkey";
            columns: ["event_id", "team_one_player_one_id"];
            isOneToOne: false;
            referencedRelation: "event_players";
            referencedColumns: ["event_id", "id"];
          },
          {
            foreignKeyName: "matches_event_id_team_one_player_two_id_fkey";
            columns: ["event_id", "team_one_player_two_id"];
            isOneToOne: false;
            referencedRelation: "event_players";
            referencedColumns: ["event_id", "id"];
          },
          {
            foreignKeyName: "matches_event_id_team_two_player_one_id_fkey";
            columns: ["event_id", "team_two_player_one_id"];
            isOneToOne: false;
            referencedRelation: "event_players";
            referencedColumns: ["event_id", "id"];
          },
          {
            foreignKeyName: "matches_event_id_team_two_player_two_id_fkey";
            columns: ["event_id", "team_two_player_two_id"];
            isOneToOne: false;
            referencedRelation: "event_players";
            referencedColumns: ["event_id", "id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
