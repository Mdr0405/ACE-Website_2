export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ContactMessage: {
        Row: {
          createdAt: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          createdAt?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          createdAt?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      Event: {
        Row: {
          Cluster: string | null
          currentRegistrations: number | null
          description: string
          endTime: string | null
          id: string
          imgUrl: string | null
          isFeeRequired: boolean | null
          location: string
          maxCapacity: number | null
          name: string
          organizer_info: string | null
          participationMode: "INDIVIDUAL" | "TEAM"
          registrationFee: number | null
          startTime: string
          status: Database["public"]["Enums"]["event_status"]
          teamSizes: number[] | null
          type: Database["public"]["Enums"]["EventType"]
        }
        Insert: {
          Cluster?: string | null
          currentRegistrations?: number | null
          description: string
          endTime?: string | null
          id?: string
          imgUrl?: string | null
          isFeeRequired?: boolean | null
          location: string
          maxCapacity?: number | null
          name: string
          organizer_info?: string | null
          participationMode?: "INDIVIDUAL" | "TEAM"
          registrationFee?: number | null
          startTime: string
          status?: Database["public"]["Enums"]["event_status"]
          teamSizes?: number[] | null
          type: Database["public"]["Enums"]["EventType"]
        }
        Update: {
          Cluster?: string | null
          currentRegistrations?: number | null
          description?: string
          endTime?: string | null
          id?: string
          imgUrl?: string | null
          isFeeRequired?: boolean | null
          location?: string
          maxCapacity?: number | null
          name?: string
          organizer_info?: string | null
          participationMode?: "INDIVIDUAL" | "TEAM"
          registrationFee?: number | null
          startTime?: string
          status?: Database["public"]["Enums"]["event_status"]
          teamSizes?: number[] | null
          type?: Database["public"]["Enums"]["EventType"]
        }
        Relationships: []
      }
      RecruitmentForm: {
        Row: {
          Cluster: string
          title: string
          description: string
          nameLabel: string
          registrationLabel: string
          courseLabel: string
          yearLabel: string
          isOpen: boolean
          updatedAt: string
          questions: Json | null
        }
        Insert: {
          Cluster: string
          title: string
          description: string
          nameLabel?: string
          registrationLabel?: string
          courseLabel?: string
          yearLabel?: string
          isOpen?: boolean
          updatedAt?: string
          questions?: Json | null
        }
        Update: {
          Cluster?: string
          title?: string
          description?: string
          nameLabel?: string
          registrationLabel?: string
          courseLabel?: string
          yearLabel?: string
          isOpen?: boolean
          updatedAt?: string
          questions?: Json | null  
        }
        Relationships: []
      }
      RecruitmentApplication: {
        Row: {
          id: string
          Cluster: string
          fullName: string
          registrationNumber: string
          course: string
          year: number
          submittedAt: string
          answers: Json | null
        }
        Insert: {
          id?: string
          Cluster: string
          fullName: string
          registrationNumber: string
          course: string
          year: number
          submittedAt?: string
          answers?: Json | null
        }
        Update: {
          id?: string
          Cluster?: string
          fullName?: string
          registrationNumber?: string
          course?: string
          year?: number
          submittedAt?: string
          answers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "RecruitmentApplication_Cluster_fkey"
            columns: ["Cluster"]
            isOneToOne: false
            referencedRelation: "RecruitmentForm"
            referencedColumns: ["Cluster"]
          },
        ]
      }
      Registration: {
        Row: {
          attended: boolean | null
          eventId: string
          id: string
          paymentId: string | null
          paymentStatus: Database["public"]["Enums"]["PaymentStatus"] | null
          points: number | null
          registeredAt: string
          registrationFee: number | null
          userId: string
        }
        Insert: {
          attended?: boolean | null
          eventId: string
          id?: string
          paymentId?: string | null
          paymentStatus?: Database["public"]["Enums"]["PaymentStatus"] | null
          points?: number | null
          registeredAt?: string
          registrationFee?: number | null
          userId: string
        }
        Update: {
          attended?: boolean | null
          eventId?: string
          id?: string
          paymentId?: string | null
          paymentStatus?: Database["public"]["Enums"]["PaymentStatus"] | null
          points?: number | null
          registeredAt?: string
          registrationFee?: number | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Registration_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "Event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Registration_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      RegistrationTeam: {
        Row: {
          createdAt: string
          eventId: string
          members: Json
          registrationId: string
          teamName: string
          teamSize: number
        }
        Insert: {
          createdAt?: string
          eventId: string
          members: Json
          registrationId: string
          teamName: string
          teamSize: number
        }
        Update: {
          createdAt?: string
          eventId?: string
          members?: Json
          registrationId?: string
          teamName?: string
          teamSize?: number
        }
        Relationships: [
          {
            foreignKeyName: "RegistrationTeam_registrationId_fkey"
            columns: ["registrationId"]
            isOneToOne: true
            referencedRelation: "Registration"
            referencedColumns: ["id"]
          },
        ]
      }
      userAdmins: {
        Row: {
          Cluster: string | null
          isAdmin: boolean
          userId: string
        }
        Insert: {
          Cluster?: string | null
          isAdmin?: boolean
          userId: string
        }
        Update: {
          Cluster?: string | null
          isAdmin?: boolean
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "userAdmins_userId_fkey"
            columns: ["userId"]
            isOneToOne: true
            referencedRelation: "UserProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      UserProfile: {
        Row: {
          contactNumber: string | null
          currentRating: number
          department: string
          id: string
          name: string
          registrationNumber: string
          year: number
        }
        Insert: {
          contactNumber?: string | null
          currentRating?: number
          department: string
          id: string
          name: string
          registrationNumber: string
          year: number
        }
        Update: {
          contactNumber?: string | null
          currentRating?: number
          department?: string
          id?: string
          name?: string
          registrationNumber?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      /** Non-sensitive public projection of UserProfile (no phone number or registration number). */
      PublicUserProfile: {
        Row: {
          currentRating: number
          department: string
          id: string
          name: string
          year: number
        }
        Relationships: []
      }
    }
    Functions: {
      add_admin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      admin_event_registrant_emails: {
        Args: { p_event_id: string }
        Returns: { userId: string; email: string }[]
      }
      create_new_user_profile: {
        Args: {
          p_user_id: string
          p_name: string
          p_registration_number: string
          p_year: number
          p_department: string
        }
        Returns: undefined
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      register_for_event: {
        Args: { p_event_id: string; p_team_name?: string | null; p_team_size?: number | null; p_members?: Json | null }
        Returns: string
      }
      team_memberships: {
        Args: { p_user_id: string; p_event_id?: string | null }
        Returns: {
          eventId: string
          registrationId: string
          teamName: string
          teamSize: number
          leadId: string
          leadName: string | null
          memberNames: string[] | null
          registeredAt: string
          paymentStatus: string | null
        }[]
      }
      is_team_member: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      remove_admin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      event_status: "OPEN" | "CLOSED" | "DONE" | "CANCELLED"
      EventType: "CONTEST" | "WORKSHOP" | "TALK"
      PaymentStatus: "pending" | "completed" | "failed" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_status: ["OPEN", "CLOSED", "DONE", "CANCELLED"],
      EventType: ["CONTEST", "WORKSHOP", "TALK"],
      PaymentStatus: ["pending", "completed", "failed", "refunded"],
    },
  },
} as const
