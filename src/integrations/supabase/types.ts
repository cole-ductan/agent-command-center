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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      calls: {
        Row: {
          call_date: string
          call_type: string | null
          created_at: string
          db_note_line: string | null
          event_id: string | null
          id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          summary: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_date?: string
          call_type?: string | null
          created_at?: string
          db_note_line?: string | null
          event_id?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          summary?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_date?: string
          call_type?: string | null
          created_at?: string
          db_note_line?: string | null
          event_id?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          summary?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          shift1_end: string | null
          shift1_start: string | null
          shift2_end: string | null
          shift2_start: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          shift1_end?: string | null
          shift1_start?: string | null
          shift2_end?: string | null
          shift2_start?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          shift1_end?: string | null
          shift1_start?: string | null
          shift2_end?: string | null
          shift2_start?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      command_center_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          is_official: boolean
          name: string
          preview_image_url: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_official?: boolean
          name: string
          preview_image_url?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_official?: boolean
          name?: string
          preview_image_url?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          domain: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          size_label: string | null
          source: string | null
          status: string
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          domain?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          size_label?: string | null
          source?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          domain?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          size_label?: string | null
          source?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          area: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_visible: boolean
          sort_order: number
          tenant_id: string
          title: string
          updated_at: string
          widget_key: string
          widget_type: string
          width: string | null
        }
        Insert: {
          area?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_visible?: boolean
          sort_order?: number
          tenant_id: string
          title: string
          updated_at?: string
          widget_key: string
          widget_type: string
          width?: string | null
        }
        Update: {
          area?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_visible?: boolean
          sort_order?: number
          tenant_id?: string
          title?: string
          updated_at?: string
          widget_key?: string
          widget_type?: string
          width?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          slug: string
          subject: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          slug: string
          subject: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          sent_status: string
          subject: string | null
          template_used: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          sent_status?: string
          subject?: string | null
          template_used?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          sent_status?: string
          subject?: string | null
          template_used?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          amateur_endorsement_sent: boolean
          archived: boolean
          archived_at: string | null
          auction_referred: boolean
          cgt_created: boolean
          cgt_url: string | null
          check_address: string | null
          check_mail_to: string | null
          check_payable_to: string | null
          contact_how_involved: string | null
          contact_role: string | null
          contact_years_in_charge: number | null
          contact_years_involved: number | null
          course: string | null
          course_games: string | null
          created_at: string
          custom_products_sold: boolean
          decision_maker: string | null
          dixon_tournament_id: string | null
          entry_fee: number | null
          event_date: string | null
          event_name: string
          event_time: string | null
          event_website: string | null
          extra_donation_games: boolean | null
          extra_donation_notes: string | null
          extra_fundraising: string | null
          funds_use: string | null
          funds_use_notes: string | null
          funds_use_type: string | null
          hardest_part: string | null
          has_player_gift_budget: string | null
          hot_lead: boolean
          id: string
          interest_amateur_endorsement: boolean
          interest_auction: boolean
          interest_cgt: boolean
          interest_custom_products: boolean
          interest_par3: boolean
          interest_par5: boolean
          is_annual_event: boolean | null
          last_contact_at: string | null
          lead_source: string | null
          notes: string | null
          objections: string | null
          opportunity_flags: string[] | null
          org_age_years: number | null
          organization_id: string | null
          overall_goal: string | null
          pain_point_chips: string[] | null
          pain_points: string | null
          par3_booked: boolean
          par5_booked: boolean
          payment_processor_notes: string | null
          player_count: number | null
          player_gift_budget: string | null
          player_gift_items: string | null
          post_round_activities: string | null
          primary_contact_id: string | null
          prize_donor_lead: string | null
          prize_types: string | null
          registration_method: string | null
          registration_opens_at: string | null
          registration_sales: string | null
          registration_time: string | null
          revenue_sources: string[] | null
          sponsorship_details: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          tee_off_time: string | null
          tenant_id: string
          territory: string | null
          updated_at: string
          user_id: string
          where_left_off: string | null
          years_running: number | null
        }
        Insert: {
          amateur_endorsement_sent?: boolean
          archived?: boolean
          archived_at?: string | null
          auction_referred?: boolean
          cgt_created?: boolean
          cgt_url?: string | null
          check_address?: string | null
          check_mail_to?: string | null
          check_payable_to?: string | null
          contact_how_involved?: string | null
          contact_role?: string | null
          contact_years_in_charge?: number | null
          contact_years_involved?: number | null
          course?: string | null
          course_games?: string | null
          created_at?: string
          custom_products_sold?: boolean
          decision_maker?: string | null
          dixon_tournament_id?: string | null
          entry_fee?: number | null
          event_date?: string | null
          event_name: string
          event_time?: string | null
          event_website?: string | null
          extra_donation_games?: boolean | null
          extra_donation_notes?: string | null
          extra_fundraising?: string | null
          funds_use?: string | null
          funds_use_notes?: string | null
          funds_use_type?: string | null
          hardest_part?: string | null
          has_player_gift_budget?: string | null
          hot_lead?: boolean
          id?: string
          interest_amateur_endorsement?: boolean
          interest_auction?: boolean
          interest_cgt?: boolean
          interest_custom_products?: boolean
          interest_par3?: boolean
          interest_par5?: boolean
          is_annual_event?: boolean | null
          last_contact_at?: string | null
          lead_source?: string | null
          notes?: string | null
          objections?: string | null
          opportunity_flags?: string[] | null
          org_age_years?: number | null
          organization_id?: string | null
          overall_goal?: string | null
          pain_point_chips?: string[] | null
          pain_points?: string | null
          par3_booked?: boolean
          par5_booked?: boolean
          payment_processor_notes?: string | null
          player_count?: number | null
          player_gift_budget?: string | null
          player_gift_items?: string | null
          post_round_activities?: string | null
          primary_contact_id?: string | null
          prize_donor_lead?: string | null
          prize_types?: string | null
          registration_method?: string | null
          registration_opens_at?: string | null
          registration_sales?: string | null
          registration_time?: string | null
          revenue_sources?: string[] | null
          sponsorship_details?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          tee_off_time?: string | null
          tenant_id: string
          territory?: string | null
          updated_at?: string
          user_id: string
          where_left_off?: string | null
          years_running?: number | null
        }
        Update: {
          amateur_endorsement_sent?: boolean
          archived?: boolean
          archived_at?: string | null
          auction_referred?: boolean
          cgt_created?: boolean
          cgt_url?: string | null
          check_address?: string | null
          check_mail_to?: string | null
          check_payable_to?: string | null
          contact_how_involved?: string | null
          contact_role?: string | null
          contact_years_in_charge?: number | null
          contact_years_involved?: number | null
          course?: string | null
          course_games?: string | null
          created_at?: string
          custom_products_sold?: boolean
          decision_maker?: string | null
          dixon_tournament_id?: string | null
          entry_fee?: number | null
          event_date?: string | null
          event_name?: string
          event_time?: string | null
          event_website?: string | null
          extra_donation_games?: boolean | null
          extra_donation_notes?: string | null
          extra_fundraising?: string | null
          funds_use?: string | null
          funds_use_notes?: string | null
          funds_use_type?: string | null
          hardest_part?: string | null
          has_player_gift_budget?: string | null
          hot_lead?: boolean
          id?: string
          interest_amateur_endorsement?: boolean
          interest_auction?: boolean
          interest_cgt?: boolean
          interest_custom_products?: boolean
          interest_par3?: boolean
          interest_par5?: boolean
          is_annual_event?: boolean | null
          last_contact_at?: string | null
          lead_source?: string | null
          notes?: string | null
          objections?: string | null
          opportunity_flags?: string[] | null
          org_age_years?: number | null
          organization_id?: string | null
          overall_goal?: string | null
          pain_point_chips?: string[] | null
          pain_points?: string | null
          par3_booked?: boolean
          par5_booked?: boolean
          payment_processor_notes?: string | null
          player_count?: number | null
          player_gift_budget?: string | null
          player_gift_items?: string | null
          post_round_activities?: string | null
          primary_contact_id?: string | null
          prize_donor_lead?: string | null
          prize_types?: string | null
          registration_method?: string | null
          registration_opens_at?: string | null
          registration_sales?: string | null
          registration_time?: string | null
          revenue_sources?: string[] | null
          sponsorship_details?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          tee_off_time?: string | null
          tenant_id?: string
          territory?: string | null
          updated_at?: string
          user_id?: string
          where_left_off?: string | null
          years_running?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          google_email: string | null
          id: string
          refresh_token: string
          scope: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          id?: string
          refresh_token: string
          scope: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          scope?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          direction: string | null
          duration_seconds: number | null
          id: string
          interaction_type: string
          metadata: Json
          occurred_at: string
          opportunity_id: string | null
          outcome: string | null
          person_id: string | null
          subject: string | null
          summary: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          duration_seconds?: number | null
          id?: string
          interaction_type?: string
          metadata?: Json
          occurred_at?: string
          opportunity_id?: string | null
          outcome?: string | null
          person_id?: string | null
          subject?: string | null
          summary?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          duration_seconds?: number | null
          id?: string
          interaction_type?: string
          metadata?: Json
          occurred_at?: string
          opportunity_id?: string | null
          outcome?: string | null
          person_id?: string | null
          subject?: string | null
          summary?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_company_tenant_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "interactions_opportunity_tenant_fk"
            columns: ["tenant_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "interactions_person_tenant_fk"
            columns: ["tenant_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      next_action_presets: {
        Row: {
          created_at: string
          id: string
          label: string
          offset_days: number
          slug: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          offset_days?: number
          slug?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          offset_days?: number
          slug?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_action_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      note_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          company_id: string | null
          created_at: string
          folder_id: string | null
          id: string
          opportunity_id: string | null
          person_id: string | null
          pinned: boolean
          reminder_at: string | null
          task_id: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          company_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          opportunity_id?: string | null
          person_id?: string | null
          pinned?: boolean
          reminder_at?: string | null
          task_id?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          company_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          opportunity_id?: string | null
          person_id?: string | null
          pinned?: boolean
          reminder_at?: string | null
          task_id?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_tenant_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_opportunity_tenant_fk"
            columns: ["tenant_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "notes_person_tenant_fk"
            columns: ["tenant_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      objections: {
        Row: {
          created_at: string
          id: string
          response: string
          slug: string
          sort_order: number
          tenant_id: string
          tip: string | null
          trigger: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          response: string
          slug: string
          sort_order?: number
          tenant_id: string
          tip?: string | null
          trigger: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          response?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          tip?: string | null
          trigger?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_pdfs: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          id: string
          name: string
          offer_slug: string
          public_url: string | null
          sort_order: number
          storage_path: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          name: string
          offer_slug: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          name?: string
          offer_slug?: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_pdfs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          cost: string | null
          created_at: string
          details: string | null
          expanded_details: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          tenant_id: string
          type: string | null
          updated_at: string
          user_id: string
          when_to_introduce: string | null
        }
        Insert: {
          cost?: string | null
          created_at?: string
          details?: string | null
          expanded_details?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
          type?: string | null
          updated_at?: string
          user_id: string
          when_to_introduce?: string | null
        }
        Update: {
          cost?: string | null
          created_at?: string
          details?: string | null
          expanded_details?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          when_to_introduce?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          closed_at: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          custom_fields: Json
          description: string | null
          expected_close_date: string | null
          id: string
          loss_reason: string | null
          name: string
          next_step: string | null
          owner_id: string | null
          primary_person_id: string | null
          probability: number | null
          source: string | null
          stage_key: string
          status: string
          tenant_id: string
          updated_at: string
          value_amount: number | null
        }
        Insert: {
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_fields?: Json
          description?: string | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          name: string
          next_step?: string | null
          owner_id?: string | null
          primary_person_id?: string | null
          probability?: number | null
          source?: string | null
          stage_key?: string
          status?: string
          tenant_id: string
          updated_at?: string
          value_amount?: number | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_fields?: Json
          description?: string | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          name?: string
          next_step?: string | null
          owner_id?: string | null
          primary_person_id?: string | null
          probability?: number | null
          source?: string | null
          stage_key?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          value_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_tenant_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "opportunities_primary_person_tenant_fk"
            columns: ["tenant_id", "primary_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_people: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          opportunity_id: string
          person_id: string
          relationship_notes: string | null
          role: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          opportunity_id: string
          person_id: string
          relationship_notes?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          opportunity_id?: string
          person_id?: string
          relationship_notes?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_people_opportunity_tenant_fk"
            columns: ["tenant_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "opportunity_people_person_tenant_fk"
            columns: ["tenant_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "opportunity_people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          cause: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cause?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cause?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          linkedin_url: string | null
          mobile_phone: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          status: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          mobile_phone?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          mobile_phone?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_company_tenant_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_decisions: {
        Row: {
          created_at: string
          goto_slug: string
          id: string
          label: string
          patch: Json
          sort_order: number
          step_id: string
          tenant_id: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          created_at?: string
          goto_slug: string
          id?: string
          label: string
          patch?: Json
          sort_order?: number
          step_id: string
          tenant_id: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          created_at?: string
          goto_slug?: string
          id?: string
          label?: string
          patch?: Json
          sort_order?: number
          step_id?: string
          tenant_id?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_decisions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "pipeline_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_steps: {
        Row: {
          callout_text: string | null
          callout_tone: string | null
          capture_keys: Json
          checklist: Json
          created_at: string
          emoji: string | null
          id: string
          script_lines: Json
          slug: string
          sort_order: number
          step_number: string
          subtitle: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          callout_text?: string | null
          callout_tone?: string | null
          capture_keys?: Json
          checklist?: Json
          created_at?: string
          emoji?: string | null
          id?: string
          script_lines?: Json
          slug: string
          sort_order?: number
          step_number: string
          subtitle?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          callout_text?: string | null
          callout_tone?: string | null
          capture_keys?: Json
          checklist?: Json
          created_at?: string
          emoji?: string | null
          id?: string
          script_lines?: Json
          slug?: string
          sort_order?: number
          step_number?: string
          subtitle?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      point_logs: {
        Row: {
          activity: Database["public"]["Enums"]["point_activity"]
          created_at: string
          event_id: string | null
          id: string
          log_date: string
          notes: string | null
          points: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: Database["public"]["Enums"]["point_activity"]
          created_at?: string
          event_id?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          points: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: Database["public"]["Enums"]["point_activity"]
          created_at?: string
          event_id?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          points?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_tenant_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_tenant_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_tenant_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_tenant_fk"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      script_sections: {
        Row: {
          body: string
          created_at: string
          id: string
          slug: string
          sort_order: number
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          tenant_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          company_id: string | null
          created_at: string
          event_id: string | null
          id: string
          next_action: string
          next_action_at: string
          opportunity_id: string | null
          person_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          next_action: string
          next_action_at: string
          opportunity_id?: string | null
          person_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          next_action?: string
          next_action_at?: string
          opportunity_id?: string | null
          person_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_tenant_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_tenant_fk"
            columns: ["tenant_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "tasks_person_tenant_fk"
            columns: ["tenant_id", "person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      template_payloads: {
        Row: {
          content: Json
          template_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          template_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_payloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "command_center_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_color: string | null
          created_at: string
          created_by: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          created_by: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          sort_order: number
          storage_path: string | null
          tenant_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          created_at: string
          goal: number
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          goal?: number
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_score_rules: {
        Row: {
          activity_type: string
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          period: string
          points: number
          rule_key: string
          sort_order: number
          target_count: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          period?: string
          points?: number
          rule_key: string
          sort_order?: number
          target_count?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          period?: string
          points?: number
          rule_key?: string
          sort_order?: number
          target_count?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_score_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_capture_fields: {
        Row: {
          config: Json
          created_at: string
          default_value: string | null
          field_key: string
          field_type: string
          helper_text: string | null
          id: string
          is_required: boolean
          label: string
          options: Json
          sort_order: number
          target_column: string | null
          target_table: string | null
          tenant_id: string
          updated_at: string
          workflow_config_id: string
          workflow_step_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          default_value?: string | null
          field_key: string
          field_type?: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          options?: Json
          sort_order?: number
          target_column?: string | null
          target_table?: string | null
          tenant_id: string
          updated_at?: string
          workflow_config_id: string
          workflow_step_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          default_value?: string | null
          field_key?: string
          field_type?: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          options?: Json
          sort_order?: number
          target_column?: string | null
          target_table?: string | null
          tenant_id?: string
          updated_at?: string
          workflow_config_id?: string
          workflow_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_capture_fields_config_tenant_fk"
            columns: ["tenant_id", "workflow_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_configs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "workflow_capture_fields_step_tenant_fk"
            columns: ["tenant_id", "workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "workflow_capture_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_configs: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          slug: string
          source: string
          template_slug: string | null
          tenant_id: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          slug: string
          source?: string
          template_slug?: string | null
          tenant_id: string
          updated_at?: string
          workflow_type?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          slug?: string
          source?: string
          template_slug?: string | null
          tenant_id?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_decision_branches: {
        Row: {
          branch_key: string
          condition: Json
          created_at: string
          from_step_id: string
          id: string
          label: string
          patch: Json
          sort_order: number
          tenant_id: string
          to_step_id: string | null
          updated_at: string
          variant: string | null
          workflow_config_id: string
        }
        Insert: {
          branch_key: string
          condition?: Json
          created_at?: string
          from_step_id: string
          id?: string
          label: string
          patch?: Json
          sort_order?: number
          tenant_id: string
          to_step_id?: string | null
          updated_at?: string
          variant?: string | null
          workflow_config_id: string
        }
        Update: {
          branch_key?: string
          condition?: Json
          created_at?: string
          from_step_id?: string
          id?: string
          label?: string
          patch?: Json
          sort_order?: number
          tenant_id?: string
          to_step_id?: string | null
          updated_at?: string
          variant?: string | null
          workflow_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_decision_branches_config_tenant_fk"
            columns: ["tenant_id", "workflow_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_configs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "workflow_decision_branches_from_step_tenant_fk"
            columns: ["tenant_id", "from_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "workflow_decision_branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_decision_branches_to_step_tenant_fk"
            columns: ["tenant_id", "to_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          checklist: Json
          config: Json
          created_at: string
          icon: string | null
          id: string
          instructions: string | null
          is_required: boolean
          script_text: string | null
          slug: string
          sort_order: number
          step_number: string | null
          step_type: string
          subtitle: string | null
          tenant_id: string
          title: string
          updated_at: string
          workflow_config_id: string
        }
        Insert: {
          checklist?: Json
          config?: Json
          created_at?: string
          icon?: string | null
          id?: string
          instructions?: string | null
          is_required?: boolean
          script_text?: string | null
          slug: string
          sort_order?: number
          step_number?: string | null
          step_type?: string
          subtitle?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          workflow_config_id: string
        }
        Update: {
          checklist?: Json
          config?: Json
          created_at?: string
          icon?: string | null
          id?: string
          instructions?: string | null
          is_required?: boolean
          script_text?: string | null
          slug?: string
          sort_order?: number
          step_number?: string | null
          step_type?: string
          subtitle?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          workflow_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_config_tenant_fk"
            columns: ["tenant_id", "workflow_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_configs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "workflow_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_tenant_invite: { Args: { p_token: string }; Returns: Json }
      apply_template: {
        Args: { p_template_id: string; p_tenant_id: string }
        Returns: Json
      }
      create_workspace: {
        Args: {
          p_industry?: string
          p_name: string
          p_slug: string
          p_template_id?: string
        }
        Returns: Json
      }
      delete_workspace: { Args: { p_tenant_id: string }; Returns: Json }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      tenant_role_of: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["tenant_role"]
      }
    }
    Enums: {
      call_outcome:
        | "connected"
        | "voicemail"
        | "no_answer"
        | "wrong_number"
        | "not_interested"
        | "booked"
        | "follow_up"
      pipeline_stage:
        | "new_lead"
        | "contacted"
        | "left_voicemail"
        | "call_back_needed"
        | "pitch_delivered"
        | "challenges_booked"
        | "cgt_created"
        | "proposal_sent"
        | "follow_up_scheduled"
        | "closed_won"
        | "closed_lost"
      point_activity:
        | "par3_booked_with_poc"
        | "poc_watched_sponsorship_video"
        | "poc_watched_pricing_video"
        | "poc_watched_swag_video"
        | "cgt_ta_appointment_booked"
        | "auction_referred"
        | "event_worked_as_rep"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "pending" | "done" | "snoozed"
      tenant_role: "owner" | "admin" | "member"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      call_outcome: [
        "connected",
        "voicemail",
        "no_answer",
        "wrong_number",
        "not_interested",
        "booked",
        "follow_up",
      ],
      pipeline_stage: [
        "new_lead",
        "contacted",
        "left_voicemail",
        "call_back_needed",
        "pitch_delivered",
        "challenges_booked",
        "cgt_created",
        "proposal_sent",
        "follow_up_scheduled",
        "closed_won",
        "closed_lost",
      ],
      point_activity: [
        "par3_booked_with_poc",
        "poc_watched_sponsorship_video",
        "poc_watched_pricing_video",
        "poc_watched_swag_video",
        "cgt_ta_appointment_booked",
        "auction_referred",
        "event_worked_as_rep",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["pending", "done", "snoozed"],
      tenant_role: ["owner", "admin", "member"],
    },
  },
} as const
