export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      kanban_movements: {
        Row: {
          actor_name: string | null
          corrective_order_id: string | null
          created_at: string
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          order_type: string | null
          part_id: string
          preventive_order_id: string | null
          previous_quantity: number
          quantity: number
          reversed_movement_id: string | null
        }
        Insert: {
          actor_name?: string | null
          corrective_order_id?: string | null
          created_at?: string
          id?: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          order_type?: string | null
          part_id: string
          preventive_order_id?: string | null
          previous_quantity: number
          quantity: number
          reversed_movement_id?: string | null
        }
        Update: {
          actor_name?: string | null
          corrective_order_id?: string | null
          created_at?: string
          id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          order_type?: string | null
          part_id?: string
          preventive_order_id?: string | null
          previous_quantity?: number
          quantity?: number
          reversed_movement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_movements_corrective_order_id_fkey"
            columns: ["corrective_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "kanban_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_movements_preventive_order_id_fkey"
            columns: ["preventive_order_id"]
            isOneToOne: false
            referencedRelation: "preventive_backlog_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_movements_reversed_movement_id_fkey"
            columns: ["reversed_movement_id"]
            isOneToOne: false
            referencedRelation: "kanban_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_parts: {
        Row: {
          category: string
          code: string
          created_at: string
          current_quantity: number
          description: string
          id: string
          machine_id: string
          target_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          current_quantity?: number
          description: string
          id?: string
          machine_id: string
          target_quantity: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          current_quantity?: number
          description?: string
          id?: string
          machine_id?: string
          target_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_parts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          code: string
          created_at: string
          id: string
          manufacturer: string | null
          model: string | null
          sector_id: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          manufacturer?: string | null
          model?: string | null
          sector_id?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          manufacturer?: string | null
          model?: string | null
          sector_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_staff: {
        Row: {
          created_at: string
          id: string
          name: string
          preferred_sector_id: string | null
          registration_number: string
          specialty: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          preferred_sector_id?: string | null
          registration_number: string
          specialty?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          preferred_sector_id?: string | null
          registration_number?: string
          specialty?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_staff_preferred_sector_id_fkey"
            columns: ["preferred_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_backlog_orders: {
        Row: {
          apontamentos: Json | null
          created_at: string
          description: string
          end_date_sap: string | null
          end_time_sap: string | null
          estimated_minutes: number | null
          finished_at: string | null
          id: string
          machine_id: string | null
          machine_number: string | null
          maintenance_type: string
          materials_needed: string | null
          opener_name: string
          opener_registry: string
          order_type: string
          periodicity: string | null
          plan_id: string | null
          planned_at: string | null
          planned_by: string | null
          priority: string
          sap_notification_number: string | null
          sap_sync_message: string | null
          sap_sync_status: string
          scheduled_date: string | null
          sector_id: string | null
          solution_description: string | null
          spare_parts_used: string[] | null
          start_date_sap: string | null
          start_time_sap: string | null
          started_at: string | null
          status: string
          technician_name: string | null
          technician_registry: string | null
          title: string
          updated_at: string
          work_center: string | null
        }
        Insert: {
          apontamentos?: Json | null
          created_at?: string
          description: string
          end_date_sap?: string | null
          end_time_sap?: string | null
          estimated_minutes?: number | null
          finished_at?: string | null
          id?: string
          machine_id?: string | null
          machine_number?: string | null
          maintenance_type: string
          materials_needed?: string | null
          opener_name: string
          opener_registry: string
          order_type: string
          periodicity?: string | null
          plan_id?: string | null
          planned_at?: string | null
          planned_by?: string | null
          priority?: string
          sap_notification_number?: string | null
          sap_sync_message?: string | null
          sap_sync_status?: string
          scheduled_date?: string | null
          sector_id?: string | null
          solution_description?: string | null
          spare_parts_used?: string[] | null
          start_date_sap?: string | null
          start_time_sap?: string | null
          started_at?: string | null
          status?: string
          technician_name?: string | null
          technician_registry?: string | null
          title: string
          updated_at?: string
          work_center?: string | null
        }
        Update: {
          apontamentos?: Json | null
          created_at?: string
          description?: string
          end_date_sap?: string | null
          end_time_sap?: string | null
          estimated_minutes?: number | null
          finished_at?: string | null
          id?: string
          machine_id?: string | null
          machine_number?: string | null
          maintenance_type?: string
          materials_needed?: string | null
          opener_name?: string
          opener_registry?: string
          order_type?: string
          periodicity?: string | null
          plan_id?: string | null
          planned_at?: string | null
          planned_by?: string | null
          priority?: string
          sap_notification_number?: string | null
          sap_sync_message?: string | null
          sap_sync_status?: string
          scheduled_date?: string | null
          sector_id?: string | null
          solution_description?: string | null
          spare_parts_used?: string[] | null
          start_date_sap?: string | null
          start_time_sap?: string | null
          started_at?: string | null
          status?: string
          technician_name?: string | null
          technician_registry?: string | null
          title?: string
          updated_at?: string
          work_center?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventive_backlog_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_backlog_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "preventive_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_backlog_orders_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string
          estimated_minutes: number | null
          id: string
          machine_id: string | null
          machine_number: string | null
          maintenance_type: string
          materials_needed: string | null
          next_due_date: string
          opener_name: string
          opener_registry: string
          periodicity: string
          priority: string
          sector_id: string | null
          title: string
          updated_at: string
          work_center: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          estimated_minutes?: number | null
          id?: string
          machine_id?: string | null
          machine_number?: string | null
          maintenance_type: string
          materials_needed?: string | null
          next_due_date: string
          opener_name: string
          opener_registry: string
          periodicity?: string
          priority?: string
          sector_id?: string | null
          title: string
          updated_at?: string
          work_center?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          estimated_minutes?: number | null
          id?: string
          machine_id?: string | null
          machine_number?: string | null
          maintenance_type?: string
          materials_needed?: string | null
          next_due_date?: string
          opener_name?: string
          opener_registry?: string
          periodicity?: string
          priority?: string
          sector_id?: string | null
          title?: string
          updated_at?: string
          work_center?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventive_plans_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_plans_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_work_logs: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          order_id: string
          started_at: string
          technician_name: string
          technician_registry: string | null
          work_center: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          started_at?: string
          technician_name: string
          technician_registry?: string | null
          work_center: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          started_at?: string
          technician_name?: string
          technician_registry?: string | null
          work_center?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_work_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "preventive_backlog_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          registration_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name: string
          registration_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          registration_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          shifts_count: number
          work_center_electronic: string | null
          work_center_mechanical: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          shifts_count?: number
          work_center_electronic?: string | null
          work_center_mechanical?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          shifts_count?: number
          work_center_electronic?: string | null
          work_center_mechanical?: string | null
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          apontamentos: Json | null
          created_at: string
          finished_at: string | null
          id: string
          is_breakdown: boolean
          is_machine_stopped: boolean
          machine_id: string | null
          machine_number: string | null
          maintenance_type: string | null
          malf_end_date: string | null
          malf_end_time: string | null
          malf_start_date: string | null
          malf_start_time: string | null
          opener_name: string | null
          opener_registry: string | null
          operator_id: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          problem_description: string
          sap_notification_number: string | null
          sap_sync_message: string | null
          sap_sync_status: string
          solution_description: string | null
          spare_parts_used: string[] | null
          started_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          technician_id: string | null
          technician_name: string | null
          technician_registry: string | null
          work_center: string | null
        }
        Insert: {
          apontamentos?: Json | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_breakdown?: boolean
          is_machine_stopped?: boolean
          machine_id?: string | null
          machine_number?: string | null
          maintenance_type?: string | null
          malf_end_date?: string | null
          malf_end_time?: string | null
          malf_start_date?: string | null
          malf_start_time?: string | null
          opener_name?: string | null
          opener_registry?: string | null
          operator_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          problem_description: string
          sap_notification_number?: string | null
          sap_sync_message?: string | null
          sap_sync_status?: string
          solution_description?: string | null
          spare_parts_used?: string[] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          technician_id?: string | null
          technician_name?: string | null
          technician_registry?: string | null
          work_center?: string | null
        }
        Update: {
          apontamentos?: Json | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_breakdown?: boolean
          is_machine_stopped?: boolean
          machine_id?: string | null
          machine_number?: string | null
          maintenance_type?: string | null
          malf_end_date?: string | null
          malf_end_time?: string | null
          malf_start_date?: string | null
          malf_start_time?: string | null
          opener_name?: string | null
          opener_registry?: string | null
          operator_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          problem_description?: string
          sap_notification_number?: string | null
          sap_sync_message?: string | null
          sap_sync_status?: string
          solution_description?: string | null
          spare_parts_used?: string[] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          technician_id?: string | null
          technician_name?: string | null
          technician_registry?: string | null
          work_center?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          order_id: string
          started_at: string
          technician_name: string
          technician_registry: string | null
          work_center: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          started_at?: string
          technician_name: string
          technician_registry?: string | null
          work_center: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          started_at?: string
          technician_name?: string
          technician_registry?: string | null
          work_center?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_due_preventive_orders: { Args: never; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      preventive_interval_days: { Args: { p: string }; Returns: number }
      record_kanban_consumption: {
        Args: {
          p_actor_name?: string
          p_notes?: string
          p_order_id: string
          p_order_type: string
          p_part_id: string
          p_quantity: number
        }
        Returns: {
          actor_name: string | null
          corrective_order_id: string | null
          created_at: string
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          order_type: string | null
          part_id: string
          preventive_order_id: string | null
          previous_quantity: number
          quantity: number
          reversed_movement_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kanban_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replenish_kanban_part: {
        Args: {
          p_actor_name?: string
          p_notes?: string
          p_part_id: string
          p_quantity: number
        }
        Returns: {
          actor_name: string | null
          corrective_order_id: string | null
          created_at: string
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          order_type: string | null
          part_id: string
          preventive_order_id: string | null
          previous_quantity: number
          quantity: number
          reversed_movement_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kanban_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_kanban_consumption: {
        Args: { p_actor_name?: string; p_movement_id: string }
        Returns: {
          actor_name: string | null
          corrective_order_id: string | null
          created_at: string
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          order_type: string | null
          part_id: string
          preventive_order_id: string | null
          previous_quantity: number
          quantity: number
          reversed_movement_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kanban_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "operator" | "technician" | "manager"
      order_status: "open" | "in_progress" | "closed"
      priority_level: "low" | "medium" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operator", "technician", "manager"],
      order_status: ["open", "in_progress", "closed"],
      priority_level: ["low", "medium", "critical"],
    },
  },
} as const
