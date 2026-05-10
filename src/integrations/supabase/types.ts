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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      affiliate_earnings: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          description: string | null
          id: string
          source_user_id: string | null
          type: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source_user_id?: string | null
          type?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source_user_id?: string | null
          type?: string
        }
        Relationships: []
      }
      ai_daily_usage: {
        Row: {
          count: number
          feature: string
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          feature: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          feature?: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_job_events: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          job_id: string
          level: string
          message: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          job_id: string
          level?: string
          message?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          job_id?: string
          level?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          attempt: number
          cancelled_at: string | null
          cost_units: number
          created_at: string
          dedupe_key: string | null
          duration_ms: number | null
          error: string | null
          feature: string | null
          finished_at: string | null
          id: string
          input: Json
          kind: string
          max_attempts: number
          metadata: Json
          model: string | null
          output: Json | null
          parent_job_id: string | null
          priority: number
          progress: number
          provider: string | null
          scheduled_at: string
          source: string | null
          started_at: string | null
          status: string
          tokens_input: number
          tokens_output: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt?: number
          cancelled_at?: string | null
          cost_units?: number
          created_at?: string
          dedupe_key?: string | null
          duration_ms?: number | null
          error?: string | null
          feature?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          kind: string
          max_attempts?: number
          metadata?: Json
          model?: string | null
          output?: Json | null
          parent_job_id?: string | null
          priority?: number
          progress?: number
          provider?: string | null
          scheduled_at?: string
          source?: string | null
          started_at?: string | null
          status?: string
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt?: number
          cancelled_at?: string | null
          cost_units?: number
          created_at?: string
          dedupe_key?: string | null
          duration_ms?: number | null
          error?: string | null
          feature?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          kind?: string
          max_attempts?: number
          metadata?: Json
          model?: string | null
          output?: Json | null
          parent_job_id?: string | null
          priority?: number
          progress?: number
          provider?: string | null
          scheduled_at?: string
          source?: string | null
          started_at?: string | null
          status?: string
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_keys: {
        Row: {
          api_endpoint: string
          api_key: string
          created_at: string
          default_model: string
          display_name: string
          id: string
          is_active: boolean
          notes: string | null
          priority: number
          provider_name: string
          updated_at: string
        }
        Insert: {
          api_endpoint: string
          api_key: string
          created_at?: string
          default_model: string
          display_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          priority?: number
          provider_name: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string
          api_key?: string
          created_at?: string
          default_model?: string
          display_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          priority?: number
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string
          error: string | null
          feature: string
          id: string
          ok: boolean
          provider_used: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          feature: string
          id?: string
          ok?: boolean
          provider_used: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          feature?: string
          id?: string
          ok?: boolean
          provider_used?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_provider_fallback_logs: {
        Row: {
          created_at: string
          error_message: string | null
          feature: string | null
          id: string
          latency_ms: number | null
          original_provider: string
          reason: string
          replacement_provider: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          feature?: string | null
          id?: string
          latency_ms?: number | null
          original_provider: string
          reason: string
          replacement_provider?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          feature?: string | null
          id?: string
          latency_ms?: number | null
          original_provider?: string
          reason?: string
          replacement_provider?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_provider_health: {
        Row: {
          consecutive_failures: number
          consecutive_successes: number
          cost_rank: number
          created_at: string
          disabled_until: string | null
          estimated_cost_usd: number
          id: string
          last_check_at: string | null
          last_error: string | null
          latency_ms: number | null
          manually_disabled: boolean
          notes: string | null
          provider: string
          reliability_rank: number
          speed_rank: number
          status: string
          success_rate: number | null
          tokens_used_24h: number
          total_checks: number
          total_failures: number
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          consecutive_successes?: number
          cost_rank?: number
          created_at?: string
          disabled_until?: string | null
          estimated_cost_usd?: number
          id?: string
          last_check_at?: string | null
          last_error?: string | null
          latency_ms?: number | null
          manually_disabled?: boolean
          notes?: string | null
          provider: string
          reliability_rank?: number
          speed_rank?: number
          status?: string
          success_rate?: number | null
          tokens_used_24h?: number
          total_checks?: number
          total_failures?: number
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          consecutive_successes?: number
          cost_rank?: number
          created_at?: string
          disabled_until?: string | null
          estimated_cost_usd?: number
          id?: string
          last_check_at?: string | null
          last_error?: string | null
          latency_ms?: number | null
          manually_disabled?: boolean
          notes?: string | null
          provider?: string
          reliability_rank?: number
          speed_rank?: number
          status?: string
          success_rate?: number | null
          tokens_used_24h?: number
          total_checks?: number
          total_failures?: number
          updated_at?: string
        }
        Relationships: []
      }
      api_runtime_audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          config_key: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action?: string
          admin_user_id?: string | null
          config_key: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          config_key?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      api_runtime_config: {
        Row: {
          created_at: string
          environment: string
          id: string
          key: string
          notes: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          key: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          key?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bonus_kits: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          link: string
          target_tier: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          link: string
          target_tier?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          link?: string
          target_tier?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          accent_color: string | null
          address: string | null
          brand_color: string | null
          business_name: string | null
          created_at: string
          default_currency: string | null
          default_payment_terms: string | null
          default_theme: string | null
          email: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          phone: string | null
          signature_url: string | null
          stamp_url: string | null
          tagline: string | null
          tax_id: string | null
          tax_label: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          brand_color?: string | null
          business_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: string | null
          default_theme?: string | null
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          tagline?: string | null
          tax_id?: string | null
          tax_label?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          brand_color?: string | null
          business_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: string | null
          default_theme?: string | null
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          tagline?: string | null
          tax_id?: string | null
          tax_label?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      broadcast_jobs: {
        Row: {
          audience: string
          audience_user_ids: string[] | null
          bot_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          error: string | null
          failed_count: number
          finished_at: string | null
          id: string
          message: string
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          audience_user_ids?: string[] | null
          bot_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          message: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          audience_user_ids?: string[] | null
          bot_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_jobs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      category_requests: {
        Row: {
          category_name: string
          created_at: string
          id: string
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          admin_id: string | null
          content: string
          created_at: string
          id: string
          is_admin_reply: boolean
          role: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          role?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          amount_cents: number | null
          billing_interval: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          dodo_session_id: string | null
          email: string
          id: string
          metadata: Json | null
          opened_at: string
          plan_id: string
          plan_label: string | null
          recovery_email_sent_at: string | null
          resume_url: string | null
          status: string
          tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          billing_interval?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          dodo_session_id?: string | null
          email: string
          id?: string
          metadata?: Json | null
          opened_at?: string
          plan_id: string
          plan_label?: string | null
          recovery_email_sent_at?: string | null
          resume_url?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          billing_interval?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          dodo_session_id?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          opened_at?: string
          plan_id?: string
          plan_label?: string | null
          recovery_email_sent_at?: string | null
          resume_url?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          currency: string | null
          default_payment_terms: string | null
          email: string | null
          id: string
          last_used_at: string | null
          name: string
          notes: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          default_payment_terms?: string | null
          email?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          default_payment_terms?: string | null
          email?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          is_readonly: boolean | null
          min_tier: Database["public"]["Enums"]["subscription_tier"]
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_readonly?: boolean | null
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_readonly?: boolean | null
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          name?: string
        }
        Relationships: []
      }
      community_memberships: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      community_onboarding: {
        Row: {
          completed_at: string
          custom_category_requests: string[] | null
          experience_level: string | null
          goals: string[] | null
          id: string
          interests: string[] | null
          preferred_categories: string[] | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          custom_category_requests?: string[] | null
          experience_level?: string | null
          goals?: string[] | null
          id?: string
          interests?: string[] | null
          preferred_categories?: string[] | null
          user_id: string
        }
        Update: {
          completed_at?: string
          custom_category_requests?: string[] | null
          experience_level?: string | null
          goals?: string[] | null
          id?: string
          interests?: string[] | null
          preferred_categories?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          creator_id: string
          currency: string
          description: string | null
          enrolled_count: number
          id: string
          is_published: boolean
          price: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          description?: string | null
          enrolled_count?: number
          id?: string
          is_published?: boolean
          price?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          description?: string | null
          enrolled_count?: number
          id?: string
          is_published?: boolean
          price?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      doc_blocks: {
        Row: {
          body: string
          created_at: string
          id: string
          is_default: boolean
          kind: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_default?: boolean
          kind: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dodo_coupons: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          id: string
          is_active: boolean
          max_redemptions: number | null
          metadata: Json
          tier_filter: string[] | null
          times_redeemed: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          metadata?: Json
          tier_filter?: string[] | null
          times_redeemed?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          metadata?: Json
          tier_filter?: string[] | null
          times_redeemed?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      dodo_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string | null
          event_type: string
          id: string
          mode: string | null
          payload: Json
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          mode?: string | null
          payload: Json
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          mode?: string | null
          payload?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dodo_products: {
        Row: {
          amount_inr: number
          billing_interval: string | null
          created_at: string
          credits: number | null
          dodo_product_id: string
          id: string
          internal_key: string
          is_active: boolean
          kind: string
          metadata: Json
          mode: string
          name: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          amount_inr?: number
          billing_interval?: string | null
          created_at?: string
          credits?: number | null
          dodo_product_id: string
          id?: string
          internal_key: string
          is_active?: boolean
          kind: string
          metadata?: Json
          mode: string
          name: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          billing_interval?: string | null
          created_at?: string
          credits?: number | null
          dodo_product_id?: string
          id?: string
          internal_key?: string
          is_active?: boolean
          kind?: string
          metadata?: Json
          mode?: string
          name?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      dodo_subscriptions: {
        Row: {
          amount: number | null
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          dodo_customer_id: string | null
          dodo_product_id: string | null
          dodo_subscription_id: string
          id: string
          internal_key: string | null
          mode: string
          raw: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dodo_customer_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id: string
          id?: string
          internal_key?: string | null
          mode: string
          raw?: Json
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dodo_customer_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string
          id?: string
          internal_key?: string | null
          mode?: string
          raw?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          ai_generated: boolean
          audience: string
          audience_filter: Json | null
          body_html: string
          brevo_message_id: string | null
          created_at: string
          created_by: string
          error_message: string | null
          failed_count: number
          from_email: string | null
          from_name: string | null
          id: string
          preview_text: string | null
          provider: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          title: string
        }
        Insert: {
          ai_generated?: boolean
          audience?: string
          audience_filter?: Json | null
          body_html: string
          brevo_message_id?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          failed_count?: number
          from_email?: string | null
          from_name?: string | null
          id?: string
          preview_text?: string | null
          provider?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          title: string
        }
        Update: {
          ai_generated?: boolean
          audience?: string
          audience_filter?: Json | null
          body_html?: string
          brevo_message_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          failed_count?: number
          from_email?: string | null
          from_name?: string | null
          id?: string
          preview_text?: string | null
          provider?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          title?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          error: string | null
          id: string
          metadata: Json | null
          provider_id: string | null
          recipient: string
          status: string
          subject: string | null
          template: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          recipient: string
          status?: string
          subject?: string | null
          template: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
          template?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          smtp_email: string | null
          smtp_password: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          smtp_email?: string | null
          smtp_password?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          smtp_email?: string | null
          smtp_password?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          html: string
          id: string
          is_active: boolean
          name: string
          preferred_provider: string | null
          preview_text: string | null
          slug: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string
          created_at?: string
          html: string
          id?: string
          is_active?: boolean
          name: string
          preferred_provider?: string | null
          preview_text?: string | null
          slug: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          html?: string
          id?: string
          is_active?: boolean
          name?: string
          preferred_provider?: string | null
          preview_text?: string | null
          slug?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      expert_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expert_email: string | null
          expert_name: string
          id: string
          meeting_link: string | null
          notes: string | null
          scheduled_at: string | null
          status: string
          target_tier: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expert_email?: string | null
          expert_name: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          target_tier?: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expert_email?: string | null
          expert_name?: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          target_tier?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      export_access_logs: {
        Row: {
          created_at: string
          export_id: string
          id: string
          ip: string | null
          outcome: string
          token_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          export_id: string
          id?: string
          ip?: string | null
          outcome: string
          token_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          export_id?: string
          id?: string
          ip?: string | null
          outcome?: string
          token_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_access_logs_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "generated_exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_access_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "export_download_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      export_download_tokens: {
        Row: {
          created_at: string
          expires_at: string
          export_id: string
          id: string
          max_uses: number
          otp_hash: string | null
          requires_otp: boolean
          revoked_at: string | null
          token: string
          use_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          export_id: string
          id?: string
          max_uses?: number
          otp_hash?: string | null
          requires_otp?: boolean
          revoked_at?: string | null
          token: string
          use_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          export_id?: string
          id?: string
          max_uses?: number
          otp_hash?: string | null
          requires_otp?: boolean
          revoked_at?: string | null
          token?: string
          use_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_download_tokens_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "generated_exports"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_access: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          tier: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          tier: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          tier?: string
        }
        Relationships: []
      }
      feature_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          flag_key: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          flag_key: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          flag_key?: string
          id?: string
        }
        Relationships: []
      }
      feature_flag_blocks: {
        Row: {
          created_at: string
          endpoint: string | null
          environment: string
          flag_key: string
          id: string
          reason: string | null
          source: string | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          environment?: string
          flag_key: string
          id?: string
          reason?: string | null
          source?: string | null
          status_code?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          environment?: string
          flag_key?: string
          id?: string
          reason?: string | null
          source?: string | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flag_incidents: {
        Row: {
          actor_id: string | null
          created_at: string
          environment: string
          flag_key: string | null
          id: string
          kind: string
          message: string | null
          metadata: Json
          resolved_at: string | null
          severity: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          environment?: string
          flag_key?: string | null
          id?: string
          kind: string
          message?: string | null
          metadata?: Json
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          environment?: string
          flag_key?: string | null
          id?: string
          kind?: string
          message?: string | null
          metadata?: Json
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      feature_flag_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          flag_key: string
          group_id: string | null
          id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled: boolean
          expires_at?: string | null
          flag_key: string
          group_id?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          flag_key?: string
          group_id?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rollout_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_rules: {
        Row: {
          created_at: string
          enabled: boolean
          flag_key: string
          group_id: string | null
          id: string
          priority: number
          rollout_percentage: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_key: string
          group_id?: string | null
          id?: string
          priority?: number
          rollout_percentage?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_key?: string
          group_id?: string | null
          id?: string
          priority?: number
          rollout_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rollout_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          admin_only: boolean
          allowed_tiers: string[]
          beta_only: boolean
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          environments: string[]
          expires_at: string | null
          feature_key: string
          id: string
          kill_switch: boolean
          label: string
          last_modified_by: string | null
          maintenance: boolean
          maintenance_message: string | null
          min_tier: Database["public"]["Enums"]["subscription_tier"] | null
          owner: string | null
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          admin_only?: boolean
          allowed_tiers?: string[]
          beta_only?: boolean
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          environments?: string[]
          expires_at?: string | null
          feature_key: string
          id?: string
          kill_switch?: boolean
          label: string
          last_modified_by?: string | null
          maintenance?: boolean
          maintenance_message?: string | null
          min_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          owner?: string | null
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          admin_only?: boolean
          allowed_tiers?: string[]
          beta_only?: boolean
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          environments?: string[]
          expires_at?: string | null
          feature_key?: string
          id?: string
          kill_switch?: boolean
          label?: string
          last_modified_by?: string | null
          maintenance?: boolean
          maintenance_message?: string | null
          min_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          owner?: string | null
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string
          downvotes: number | null
          group_id: string
          id: string
          is_approved: boolean | null
          parent_id: string | null
          post_type: string | null
          title: string | null
          upvotes: number | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          downvotes?: number | null
          group_id: string
          id?: string
          is_approved?: boolean | null
          parent_id?: string | null
          post_type?: string | null
          title?: string | null
          upvotes?: number | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          downvotes?: number | null
          group_id?: string
          id?: string
          is_approved?: boolean | null
          parent_id?: string | null
          post_type?: string | null
          title?: string | null
          upvotes?: number | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_exports: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_method: string
          download_count: number
          download_limit: number | null
          expires_at: string | null
          export_type: string
          id: string
          is_favorite: boolean
          last_accessed_at: string | null
          metadata: Json
          mime_type: string
          size_bytes: number
          status: Database["public"]["Enums"]["export_status"]
          storage_bucket: string
          storage_path: string | null
          tags: string[]
          telegram_chat_id: string | null
          telegram_file_id: string | null
          telegram_message_id: string | null
          telegram_storage_channel_id: string | null
          telegram_storage_message_id: string | null
          tier_at_creation: string
          title: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["export_visibility"]
          watermarked: boolean
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          download_count?: number
          download_limit?: number | null
          expires_at?: string | null
          export_type: string
          id?: string
          is_favorite?: boolean
          last_accessed_at?: string | null
          metadata?: Json
          mime_type?: string
          size_bytes?: number
          status?: Database["public"]["Enums"]["export_status"]
          storage_bucket?: string
          storage_path?: string | null
          tags?: string[]
          telegram_chat_id?: string | null
          telegram_file_id?: string | null
          telegram_message_id?: string | null
          telegram_storage_channel_id?: string | null
          telegram_storage_message_id?: string | null
          tier_at_creation?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["export_visibility"]
          watermarked?: boolean
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          download_count?: number
          download_limit?: number | null
          expires_at?: string | null
          export_type?: string
          id?: string
          is_favorite?: boolean
          last_accessed_at?: string | null
          metadata?: Json
          mime_type?: string
          size_bytes?: number
          status?: Database["public"]["Enums"]["export_status"]
          storage_bucket?: string
          storage_path?: string | null
          tags?: string[]
          telegram_chat_id?: string | null
          telegram_file_id?: string | null
          telegram_message_id?: string | null
          telegram_storage_channel_id?: string | null
          telegram_storage_message_id?: string | null
          tier_at_creation?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["export_visibility"]
          watermarked?: boolean
        }
        Relationships: []
      }
      hustle_roadmaps: {
        Row: {
          content: string
          created_at: string
          hustle_category: string
          hustle_description: string
          hustle_earnings: string | null
          hustle_id: string
          hustle_startup_cost: string | null
          hustle_title: string
          hustle_type: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hustle_category?: string
          hustle_description?: string
          hustle_earnings?: string | null
          hustle_id: string
          hustle_startup_cost?: string | null
          hustle_title: string
          hustle_type?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hustle_category?: string
          hustle_description?: string
          hustle_earnings?: string | null
          hustle_id?: string
          hustle_startup_cost?: string | null
          hustle_title?: string
          hustle_type?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hustle_roadmaps_hustle_id_fkey"
            columns: ["hustle_id"]
            isOneToOne: false
            referencedRelation: "side_hustles"
            referencedColumns: ["id"]
          },
        ]
      }
      hustle_votes: {
        Row: {
          created_at: string
          hustle_id: string
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          hustle_id: string
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          hustle_id?: string
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hustle_votes_hustle_id_fkey"
            columns: ["hustle_id"]
            isOneToOne: false
            referencedRelation: "side_hustles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_number: string
          item_label: string
          item_type: string
          metadata: Json | null
          payment_method: string
          payment_reference: string | null
          send_error: string | null
          sent_to_admin: boolean
          sent_to_user: boolean
          status: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          item_label: string
          item_type?: string
          metadata?: Json | null
          payment_method: string
          payment_reference?: string | null
          send_error?: string | null
          sent_to_admin?: boolean
          sent_to_user?: boolean
          status?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          item_label?: string
          item_type?: string
          metadata?: Json | null
          payment_method?: string
          payment_reference?: string | null
          send_error?: string | null
          sent_to_admin?: boolean
          sent_to_user?: boolean
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      job_opportunity_submissions: {
        Row: {
          about: string | null
          admin_notes: string | null
          availability: string | null
          created_at: string
          email: string
          expected_hourly_rate: string | null
          experience_years: string
          full_name: string
          id: string
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_platforms: string[] | null
          primary_skill: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          admin_notes?: string | null
          availability?: string | null
          created_at?: string
          email: string
          expected_hourly_rate?: string | null
          experience_years: string
          full_name: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_platforms?: string[] | null
          primary_skill: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          admin_notes?: string | null
          availability?: string | null
          created_at?: string
          email?: string
          expected_hourly_rate?: string | null
          experience_years?: string
          full_name?: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_platforms?: string[] | null
          primary_skill?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_exports: {
        Row: {
          content: string
          created_at: string
          export_type: string
          format: string
          id: string
          source_messages: Json | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          export_type?: string
          format?: string
          id?: string
          source_messages?: Json | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          export_type?: string
          format?: string
          id?: string
          source_messages?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_prompts: {
        Row: {
          content: string
          created_at: string
          folder_id: string | null
          id: string
          is_favorite: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_prompts_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          collection: string | null
          content: string | null
          created_at: string
          id: string
          is_favorite: boolean | null
          source_type: string
          source_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          source_type?: string
          source_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          source_type?: string
          source_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_trends: {
        Row: {
          analysis: string | null
          created_at: string
          id: string
          scanned_sources: string[] | null
          total_posts_analyzed: number | null
          trend_data: Json
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          id?: string
          scanned_sources?: string[] | null
          total_posts_analyzed?: number | null
          trend_data?: Json
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          id?: string
          scanned_sources?: string[] | null
          total_posts_analyzed?: number | null
          trend_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      mailing_provider_config: {
        Row: {
          brevo_enabled: boolean
          default_provider: string
          fallback_provider: string | null
          from_email: string
          from_name: string
          id: number
          mailersend_enabled: boolean
          reply_to: string | null
          updated_at: string
        }
        Insert: {
          brevo_enabled?: boolean
          default_provider?: string
          fallback_provider?: string | null
          from_email?: string
          from_name?: string
          id?: number
          mailersend_enabled?: boolean
          reply_to?: string | null
          updated_at?: string
        }
        Update: {
          brevo_enabled?: boolean
          default_provider?: string
          fallback_provider?: string | null
          from_email?: string
          from_name?: string
          id?: number
          mailersend_enabled?: boolean
          reply_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      manual_payment_submissions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          payment_type: string
          plan: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          upi_id_used: string | null
          user_id: string
          user_note: string | null
          utr_number: string
          wallet_pack: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_type?: string
          plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          upi_id_used?: string | null
          user_id: string
          user_note?: string | null
          utr_number: string
          wallet_pack?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_type?: string
          plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          upi_id_used?: string | null
          user_id?: string
          user_note?: string | null
          utr_number?: string
          wallet_pack?: string | null
        }
        Relationships: []
      }
      marketplace_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          download_url: string | null
          id: string
          is_published: boolean
          item_type: string
          preview_url: string | null
          price: number
          sales_count: number
          seller_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          download_url?: string | null
          id?: string
          is_published?: boolean
          item_type?: string
          preview_url?: string | null
          price?: number
          sales_count?: number
          seller_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          download_url?: string | null
          id?: string
          is_published?: boolean
          item_type?: string
          preview_url?: string | null
          price?: number
          sales_count?: number
          seller_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_schedules: {
        Row: {
          ai_prompt: string
          created_at: string
          enabled: boolean
          frequency: string
          from_email: string | null
          from_name: string | null
          id: string
          last_run_at: string | null
          next_run_at: string | null
          send_day: number | null
          send_hour: number
          updated_at: string
        }
        Insert: {
          ai_prompt?: string
          created_at?: string
          enabled?: boolean
          frequency?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          send_day?: number | null
          send_hour?: number
          updated_at?: string
        }
        Update: {
          ai_prompt?: string
          created_at?: string
          enabled?: boolean
          frequency?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          send_day?: number | null
          send_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          name: string | null
          source: string | null
          subscribed_at: string
          tags: string[] | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
          tags?: string[] | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
          tags?: string[] | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notification_broadcasts: {
        Row: {
          body: string
          category: string
          channels: string[]
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          link: string | null
          target_tier: string
          title: string
        }
        Insert: {
          body: string
          category?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          target_tier?: string
          title: string
        }
        Update: {
          body?: string
          category?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          target_tier?: string
          title?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_id: string | null
          external_message_id: string | null
          id: string
          last_error: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string | null
          external_message_id?: string | null
          id?: string
          last_error?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string | null
          external_message_id?: string | null
          id?: string
          last_error?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string | null
          category: string
          created_at: string
          event_key: string
          id: string
          link: string | null
          payload: Json
          read_at: string | null
          source: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          event_key: string
          id?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          source?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          event_key?: string
          id?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          source?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_integrations: {
        Row: {
          config: Json
          connect_token: string | null
          connect_token_expires_at: string | null
          created_at: string
          id: string
          last_active_at: string | null
          last_error: string | null
          provider: string
          provider_chat_id: string | null
          provider_user_id: string | null
          provider_username: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          connect_token?: string | null
          connect_token_expires_at?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          last_error?: string | null
          provider: string
          provider_chat_id?: string | null
          provider_user_id?: string | null
          provider_username?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          connect_token?: string | null
          connect_token_expires_at?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          last_error?: string | null
          provider?: string
          provider_chat_id?: string | null
          provider_user_id?: string | null
          provider_username?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_prefs: Json
          collaboration_alerts: boolean
          community_notifications: boolean
          email_enabled: boolean
          invoice_reminders: boolean
          payment_alerts: boolean
          preset: string
          product_announcements: boolean
          updated_at: string
          user_id: string
          workspace_updates: boolean
        }
        Insert: {
          channel_prefs?: Json
          collaboration_alerts?: boolean
          community_notifications?: boolean
          email_enabled?: boolean
          invoice_reminders?: boolean
          payment_alerts?: boolean
          preset?: string
          product_announcements?: boolean
          updated_at?: string
          user_id: string
          workspace_updates?: boolean
        }
        Update: {
          channel_prefs?: Json
          collaboration_alerts?: boolean
          community_notifications?: boolean
          email_enabled?: boolean
          invoice_reminders?: boolean
          payment_alerts?: boolean
          preset?: string
          product_announcements?: boolean
          updated_at?: string
          user_id?: string
          workspace_updates?: boolean
        }
        Relationships: []
      }
      notification_routes: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          event_pattern: string
          id: string
          notes: string | null
          severity_min: string
          target_bot_id: string | null
          target_email: string | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          enabled?: boolean
          event_pattern: string
          id?: string
          notes?: string | null
          severity_min?: string
          target_bot_id?: string | null
          target_email?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          event_pattern?: string
          id?: string
          notes?: string | null
          severity_min?: string
          target_bot_id?: string | null
          target_email?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_routes_target_bot_id_fkey"
            columns: ["target_bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          link: string | null
          message: string
          target_tier: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          message: string
          target_tier?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          message?: string
          target_tier?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          item_id: string | null
          item_title: string
          item_type: string
          notes: string | null
          payment_id: string | null
          seller_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          item_id?: string | null
          item_title: string
          item_type?: string
          notes?: string | null
          payment_id?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          item_id?: string | null
          item_title?: string
          item_type?: string
          notes?: string | null
          payment_id?: string | null
          seller_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          is_active: boolean
          label: string
          method_type: string
          priority: number
          qr_image_url: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          label: string
          method_type?: string
          priority?: number
          qr_image_url?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          label?: string
          method_type?: string
          priority?: number
          qr_image_url?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      payment_status_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          payment_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cf_order_id: string | null
          cf_payment_id: string | null
          created_at: string
          currency: string
          id: string
          order_id: string
          payment_session_id: string | null
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cf_order_id?: string | null
          cf_payment_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          payment_session_id?: string | null
          plan: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cf_order_id?: string | null
          cf_payment_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          payment_session_id?: string | null
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_items: {
        Row: {
          created_at: string
          id: string
          label: string | null
          ref_id: string
          ref_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          ref_id: string
          ref_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          ref_id?: string
          ref_type?: string
          user_id?: string
        }
        Relationships: []
      }
      problem_leads: {
        Row: {
          author: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          id: string
          intent_level: string | null
          intent_score: number | null
          opportunity: string | null
          outreach_notes: string | null
          pain_point: string | null
          personalized_outreach: string | null
          platform_data: Json | null
          service_category: string | null
          source: string
          source_url: string | null
          status: string
          suggested_pitch: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          intent_level?: string | null
          intent_score?: number | null
          opportunity?: string | null
          outreach_notes?: string | null
          pain_point?: string | null
          personalized_outreach?: string | null
          platform_data?: Json | null
          service_category?: string | null
          source?: string
          source_url?: string | null
          status?: string
          suggested_pitch?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          intent_level?: string | null
          intent_score?: number | null
          opportunity?: string | null
          outreach_notes?: string | null
          pain_point?: string | null
          personalized_outreach?: string | null
          platform_data?: Json | null
          service_category?: string | null
          source?: string
          source_url?: string | null
          status?: string
          suggested_pitch?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          affiliate_commission: number | null
          affiliate_earnings: number
          bio: string | null
          company: string | null
          created_at: string
          display_name: string | null
          dodo_customer_id: string | null
          dodo_subscription_id: string | null
          email: string | null
          freelancer_category: string | null
          headline: string | null
          id: string
          is_verified: boolean
          onboarding: Json | null
          onboarding_completed: boolean
          phone: string | null
          phone_number: string | null
          portfolio_links: Json | null
          referral_code: string | null
          referral_credits: number
          referred_by: string | null
          resume_url: string | null
          search_count: number
          social_links: Json | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
          xp_points: number
        }
        Insert: {
          address?: string | null
          affiliate_commission?: number | null
          affiliate_earnings?: number
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          dodo_customer_id?: string | null
          dodo_subscription_id?: string | null
          email?: string | null
          freelancer_category?: string | null
          headline?: string | null
          id?: string
          is_verified?: boolean
          onboarding?: Json | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_number?: string | null
          portfolio_links?: Json | null
          referral_code?: string | null
          referral_credits?: number
          referred_by?: string | null
          resume_url?: string | null
          search_count?: number
          social_links?: Json | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
          xp_points?: number
        }
        Update: {
          address?: string | null
          affiliate_commission?: number | null
          affiliate_earnings?: number
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          dodo_customer_id?: string | null
          dodo_subscription_id?: string | null
          email?: string | null
          freelancer_category?: string | null
          headline?: string | null
          id?: string
          is_verified?: boolean
          onboarding?: Json | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_number?: string | null
          portfolio_links?: Json | null
          referral_code?: string | null
          referral_credits?: number
          referred_by?: string | null
          resume_url?: string | null
          search_count?: number
          social_links?: Json | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
          xp_points?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_percent: number | null
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          reward_amount: number
          reward_type: string
          status: string
        }
        Insert: {
          commission_percent?: number | null
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          reward_amount?: number
          reward_type?: string
          status?: string
        }
        Update: {
          commission_percent?: number | null
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          reward_amount?: number
          reward_type?: string
          status?: string
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          action: string
          created_at: string
          enabled: boolean
          id: string
          notes: string | null
          resource: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          resource: string
          retention_days: number
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          resource?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_sessions: {
        Row: {
          classification: Json
          created_at: string
          id: string
          input_text: string
          roadmap: Json
          suggested_docs: Json
          suggested_tools: Json
          title: string
          updated_at: string
          user_id: string
          workflow_stage: string
          workspace_id: string | null
        }
        Insert: {
          classification?: Json
          created_at?: string
          id?: string
          input_text?: string
          roadmap?: Json
          suggested_docs?: Json
          suggested_tools?: Json
          title?: string
          updated_at?: string
          user_id: string
          workflow_stage?: string
          workspace_id?: string | null
        }
        Update: {
          classification?: Json
          created_at?: string
          id?: string
          input_text?: string
          roadmap?: Json
          suggested_docs?: Json
          suggested_tools?: Json
          title?: string
          updated_at?: string
          user_id?: string
          workflow_stage?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      rollout_group_members: {
        Row: {
          added_at: string
          added_by: string | null
          group_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          group_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollout_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rollout_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      saved_hustles: {
        Row: {
          created_at: string
          hustle_id: string
          id: string
          income_logged: number | null
          notes: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hustle_id: string
          id?: string
          income_logged?: number | null
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hustle_id?: string
          id?: string
          income_logged?: number | null
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_hustles_hustle_id_fkey"
            columns: ["hustle_id"]
            isOneToOne: false
            referencedRelation: "side_hustles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_prompts: {
        Row: {
          created_at: string
          id: string
          pinned: boolean
          prompt: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pinned?: boolean
          prompt: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pinned?: boolean
          prompt?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_workflows: {
        Row: {
          created_at: string
          definition: Json
          description: string | null
          id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          expertise: string[] | null
          id: string
          is_published: boolean
          slug: string
          social_links: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          expertise?: string[] | null
          id?: string
          is_published?: boolean
          slug: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          expertise?: string[] | null
          id?: string
          is_published?: boolean
          slug?: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      seo_blocks: {
        Row: {
          block_key: string
          block_type: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          block_key: string
          block_type?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          block_key?: string
          block_type?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          auto_link_enabled: boolean
          category: string | null
          content: string
          cover_image: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          faq_blocks: Json
          frequently_used_with: string[] | null
          id: string
          is_indexed: boolean
          json_ld: Json
          meta_description: string
          og_image: string | null
          published_at: string | null
          reading_time_minutes: number
          related_post_ids: string[] | null
          related_tool_ids: string[] | null
          seo_score: number
          slug: string
          status: Database["public"]["Enums"]["seo_status"]
          tags: string[]
          title: string
          toc: Json
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          auto_link_enabled?: boolean
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          faq_blocks?: Json
          frequently_used_with?: string[] | null
          id?: string
          is_indexed?: boolean
          json_ld?: Json
          meta_description?: string
          og_image?: string | null
          published_at?: string | null
          reading_time_minutes?: number
          related_post_ids?: string[] | null
          related_tool_ids?: string[] | null
          seo_score?: number
          slug: string
          status?: Database["public"]["Enums"]["seo_status"]
          tags?: string[]
          title: string
          toc?: Json
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          auto_link_enabled?: boolean
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          faq_blocks?: Json
          frequently_used_with?: string[] | null
          id?: string
          is_indexed?: boolean
          json_ld?: Json
          meta_description?: string
          og_image?: string | null
          published_at?: string | null
          reading_time_minutes?: number
          related_post_ids?: string[] | null
          related_tool_ids?: string[] | null
          seo_score?: number
          slug?: string
          status?: Database["public"]["Enums"]["seo_status"]
          tags?: string[]
          title?: string
          toc?: Json
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_internal_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          priority: number
          target_slug: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          priority?: number
          target_slug: string
          target_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          priority?: number
          target_slug?: string
          target_type?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          auto_link_enabled: boolean
          badge: string | null
          breadcrumb_label: string | null
          bullets: Json
          canonical_url: string | null
          changefreq: string
          created_at: string
          created_by: string | null
          cta_href: string | null
          cta_label: string | null
          faq_blocks: Json
          faqs: Json
          h1: string
          id: string
          is_indexed: boolean
          is_pillar: boolean
          json_ld: Json
          locale: string
          meta_description: string
          og_image: string | null
          parent_page_id: string | null
          priority: number
          published_at: string | null
          related_links: Json
          related_page_ids: string[] | null
          related_tool_ids: string[] | null
          sections: Json
          seo_score: number
          slug: string
          status: Database["public"]["Enums"]["seo_status"]
          subhead: string
          template_key: string | null
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          auto_link_enabled?: boolean
          badge?: string | null
          breadcrumb_label?: string | null
          bullets?: Json
          canonical_url?: string | null
          changefreq?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          faq_blocks?: Json
          faqs?: Json
          h1?: string
          id?: string
          is_indexed?: boolean
          is_pillar?: boolean
          json_ld?: Json
          locale?: string
          meta_description?: string
          og_image?: string | null
          parent_page_id?: string | null
          priority?: number
          published_at?: string | null
          related_links?: Json
          related_page_ids?: string[] | null
          related_tool_ids?: string[] | null
          sections?: Json
          seo_score?: number
          slug: string
          status?: Database["public"]["Enums"]["seo_status"]
          subhead?: string
          template_key?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_link_enabled?: boolean
          badge?: string | null
          breadcrumb_label?: string | null
          bullets?: Json
          canonical_url?: string | null
          changefreq?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          faq_blocks?: Json
          faqs?: Json
          h1?: string
          id?: string
          is_indexed?: boolean
          is_pillar?: boolean
          json_ld?: Json
          locale?: string
          meta_description?: string
          og_image?: string | null
          parent_page_id?: string | null
          priority?: number
          published_at?: string | null
          related_links?: Json
          related_page_ids?: string[] | null
          related_tool_ids?: string[] | null
          sections?: Json
          seo_score?: number
          slug?: string
          status?: Database["public"]["Enums"]["seo_status"]
          subhead?: string
          template_key?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          created_by: string | null
          from_path: string
          hit_count: number
          id: string
          is_active: boolean
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_path: string
          hit_count?: number
          id?: string
          is_active?: boolean
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_path?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_related_tools: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      seo_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      seo_topics: {
        Row: {
          color: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          hero_keyword: string | null
          icon: string | null
          id: string
          is_published: boolean
          keywords: string[] | null
          pillar_page_id: string | null
          priority: number | null
          seo_score: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          hero_keyword?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          pillar_page_id?: string | null
          priority?: number | null
          seo_score?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          hero_keyword?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          pillar_page_id?: string | null
          priority?: number | null
          seo_score?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      side_hustles: {
        Row: {
          category: string
          created_at: string
          description: string
          dislikes: number
          earnings: string
          effort: number
          id: string
          is_trending: boolean | null
          likes: number
          startup_cost: string | null
          tags: string[] | null
          time_commitment: string | null
          title: string
          type: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          dislikes?: number
          earnings: string
          effort?: number
          id?: string
          is_trending?: boolean | null
          likes?: number
          startup_cost?: string | null
          tags?: string[] | null
          time_commitment?: string | null
          title: string
          type?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          dislikes?: number
          earnings?: string
          effort?: number
          id?: string
          is_trending?: boolean | null
          likes?: number
          startup_cost?: string | null
          tags?: string[] | null
          time_commitment?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          platform: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      telegram_bots: {
        Row: {
          created_at: string
          delivery_count_24h: number
          enabled: boolean
          environment: string
          failure_count_24h: number
          id: string
          last_ping_at: string | null
          name: string
          notes: string | null
          purpose: string | null
          status: string
          token_secret_name: string | null
          updated_at: string
          username: string
          webhook_secret_name: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          delivery_count_24h?: number
          enabled?: boolean
          environment?: string
          failure_count_24h?: number
          id?: string
          last_ping_at?: string | null
          name: string
          notes?: string | null
          purpose?: string | null
          status?: string
          token_secret_name?: string | null
          updated_at?: string
          username: string
          webhook_secret_name?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          delivery_count_24h?: number
          enabled?: boolean
          environment?: string
          failure_count_24h?: number
          id?: string
          last_ping_at?: string | null
          name?: string
          notes?: string | null
          purpose?: string | null
          status?: string
          token_secret_name?: string | null
          updated_at?: string
          username?: string
          webhook_secret_name?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      telegram_commands: {
        Row: {
          admin_only: boolean
          beta_only: boolean
          bot_id: string | null
          command: string
          created_at: string
          description: string | null
          enabled: boolean
          handler_key: string | null
          id: string
          min_tier: string | null
          rate_limit_per_min: number
        }
        Insert: {
          admin_only?: boolean
          beta_only?: boolean
          bot_id?: string | null
          command: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          handler_key?: string | null
          id?: string
          min_tier?: string | null
          rate_limit_per_min?: number
        }
        Update: {
          admin_only?: boolean
          beta_only?: boolean
          bot_id?: string | null
          command?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          handler_key?: string | null
          id?: string
          min_tier?: string | null
          rate_limit_per_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_commands_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_tokens: {
        Row: {
          bot_id: string | null
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_tokens_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_limits: {
        Row: {
          created_at: string
          feature: string
          id: string
          max_value: number
          meter: string
          period: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          max_value: number
          meter: string
          period?: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          max_value?: number
          meter?: string
          period?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      trending_links: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          link: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_overrides: {
        Row: {
          bonus_units: number
          created_at: string
          expires_at: string | null
          feature: string
          granted_by: string | null
          id: string
          max_override: number | null
          meter: string
          reason: string | null
          user_id: string
        }
        Insert: {
          bonus_units?: number
          created_at?: string
          expires_at?: string | null
          feature?: string
          granted_by?: string | null
          id?: string
          max_override?: number | null
          meter: string
          reason?: string | null
          user_id: string
        }
        Update: {
          bonus_units?: number
          created_at?: string
          expires_at?: string | null
          feature?: string
          granted_by?: string | null
          id?: string
          max_override?: number | null
          meter?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          last_test_ok: boolean | null
          last_tested_at: string | null
          model: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_test_ok?: boolean | null
          last_tested_at?: string | null
          model?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_test_ok?: boolean | null
          last_tested_at?: string | null
          model?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          created_at: string
          id: string
          id_card_url: string
          photo_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_card_url: string
          photo_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          id_card_url?: string
          photo_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_order_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_order_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_order_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      webinars: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          link: string | null
          meeting_id: string | null
          meeting_pass: string | null
          scheduled_at: string | null
          status: string
          target_tier: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          meeting_id?: string | null
          meeting_pass?: string | null
          scheduled_at?: string | null
          status?: string
          target_tier?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          meeting_id?: string | null
          meeting_pass?: string | null
          scheduled_at?: string | null
          status?: string
          target_tier?: string
          title?: string
        }
        Relationships: []
      }
      workflow_events: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          matched_workflows: number
          name: string
          payload: Json
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          matched_workflows?: number
          name: string
          payload?: Json
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          matched_workflows?: number
          name?: string
          payload?: Json
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workflow_failures: {
        Row: {
          attempts: number
          failed_at: string
          id: string
          last_error: string | null
          payload: Json
          replayed_at: string | null
          resolved: boolean
          run_id: string
          trigger_event: string
          workflow_id: string
        }
        Insert: {
          attempts: number
          failed_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          replayed_at?: string | null
          resolved?: boolean
          run_id: string
          trigger_event: string
          workflow_id: string
        }
        Update: {
          attempts?: number
          failed_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          replayed_at?: string | null
          resolved?: boolean
          run_id?: string
          trigger_event?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_failures_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_failures_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          attempt: number
          context: Json
          created_at: string
          dedupe_key: string | null
          event_id: string | null
          finished_at: string | null
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          scheduled_at: string
          started_at: string | null
          status: string
          trigger_event: string
          updated_at: string
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          attempt?: number
          context?: Json
          created_at?: string
          dedupe_key?: string | null
          event_id?: string | null
          finished_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
          trigger_event: string
          updated_at?: string
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          attempt?: number
          context?: Json
          created_at?: string
          dedupe_key?: string | null
          event_id?: string | null
          finished_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
          trigger_event?: string
          updated_at?: string
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          created_at: string
          cron: string
          enabled: boolean
          id: string
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          cron: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          cron?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json
          output: Json | null
          run_id: string
          status: string
          step_id: string
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          output?: Json | null
          run_id: string
          status: string
          step_id: string
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          output?: Json | null
          run_id?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_official: boolean
          name: string
          slug: string
          steps: Json
          trigger_event: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_official?: boolean
          name: string
          slug: string
          steps?: Json
          trigger_event: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_official?: boolean
          name?: string
          slug?: string
          steps?: Json
          trigger_event?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          conditions: Json
          created_at: string
          description: string | null
          enabled: boolean
          feature_flag: string | null
          id: string
          max_attempts: number
          name: string
          owner_id: string | null
          paused: boolean
          slug: string
          steps: Json
          trigger_event: string
          updated_at: string
          version: number
        }
        Insert: {
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_flag?: string | null
          id?: string
          max_attempts?: number
          name: string
          owner_id?: string | null
          paused?: boolean
          slug: string
          steps?: Json
          trigger_event: string
          updated_at?: string
          version?: number
        }
        Update: {
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_flag?: string | null
          id?: string
          max_attempts?: number
          name?: string
          owner_id?: string | null
          paused?: boolean
          slug?: string
          steps?: Json
          trigger_event?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      workspace_activity: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          message: string
          metadata: Json | null
          owner_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          owner_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          owner_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_approvals: {
        Row: {
          approved_at: string | null
          comment: string | null
          created_at: string | null
          id: string
          owner_id: string
          rejected_at: string | null
          status: string
          target_id: string
          target_type: string
          viewed_at: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          owner_id: string
          rejected_at?: string | null
          status?: string
          target_id: string
          target_type: string
          viewed_at?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          owner_id?: string
          rejected_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
          viewed_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_client_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          owner_id: string
          portal_id: string | null
          target_id: string | null
          target_type: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          owner_id: string
          portal_id?: string | null
          target_id?: string | null
          target_type?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          owner_id?: string
          portal_id?: string | null
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_collaborators: {
        Row: {
          accepted_at: string | null
          collaborator_id: string | null
          email: string
          id: string
          invited_at: string | null
          owner_id: string
          role: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          collaborator_id?: string | null
          email: string
          id?: string
          invited_at?: string | null
          owner_id: string
          role?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          collaborator_id?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          owner_id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_comments: {
        Row: {
          author_name: string | null
          author_type: string
          body: string
          created_at: string | null
          id: string
          owner_id: string
          parent_id: string | null
          target_id: string | null
          target_type: string
          workspace_id: string
        }
        Insert: {
          author_name?: string | null
          author_type?: string
          body: string
          created_at?: string | null
          id?: string
          owner_id: string
          parent_id?: string | null
          target_id?: string | null
          target_type?: string
          workspace_id: string
        }
        Update: {
          author_name?: string | null
          author_type?: string
          body?: string
          created_at?: string | null
          id?: string
          owner_id?: string
          parent_id?: string | null
          target_id?: string | null
          target_type?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_doc_exports: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string | null
          filename: string | null
          id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          document_id?: string | null
          filename?: string | null
          id?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_id?: string | null
          filename?: string | null
          id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_doc_versions: {
        Row: {
          created_at: string | null
          data: Json
          doc_id: string
          id: string
          note: string | null
          owner_id: string
          theme: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          doc_id: string
          id?: string
          note?: string | null
          owner_id: string
          theme?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          doc_id?: string
          id?: string
          note?: string | null
          owner_id?: string
          theme?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_documents: {
        Row: {
          approved_at: string | null
          client_profile_id: string | null
          created_at: string
          data: Json
          doc_number: string | null
          doc_type: string
          due_at: string | null
          id: string
          owner_id: string
          paid_at: string | null
          parent_doc_id: string | null
          status: string
          theme: string
          title: string
          updated_at: string
          viewed_at: string | null
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          client_profile_id?: string | null
          created_at?: string
          data?: Json
          doc_number?: string | null
          doc_type: string
          due_at?: string | null
          id?: string
          owner_id: string
          paid_at?: string | null
          parent_doc_id?: string | null
          status?: string
          theme?: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          client_profile_id?: string | null
          created_at?: string
          data?: Json
          doc_number?: string | null
          doc_type?: string
          due_at?: string | null
          id?: string
          owner_id?: string
          paid_at?: string | null
          parent_doc_id?: string | null
          status?: string
          theme?: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_documents_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_parent_doc_id_fkey"
            columns: ["parent_doc_id"]
            isOneToOne: false
            referencedRelation: "workspace_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          created_at: string | null
          id: string
          is_client_visible: boolean | null
          mime_type: string | null
          name: string
          owner_id: string
          size_bytes: number | null
          storage_path: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_client_visible?: boolean | null
          mime_type?: string | null
          name: string
          owner_id: string
          size_bytes?: number | null
          storage_path: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_client_visible?: boolean | null
          mime_type?: string | null
          name?: string
          owner_id?: string
          size_bytes?: number | null
          storage_path?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          kind: string
          link: string | null
          read: boolean | null
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          kind: string
          link?: string | null
          read?: boolean | null
          title: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          read?: boolean | null
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          label: string
          notes: string | null
          owner_id: string
          paid_amount: number | null
          paid_at: string | null
          payment_type: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          label: string
          notes?: string | null
          owner_id: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_type?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          label?: string
          notes?: string | null
          owner_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_type?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_portals: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          owner_id: string
          show_docs: boolean | null
          show_notes: boolean | null
          show_payments: boolean | null
          show_reminders: boolean | null
          show_tasks: boolean | null
          token: string
          views: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          owner_id: string
          show_docs?: boolean | null
          show_notes?: boolean | null
          show_payments?: boolean | null
          show_reminders?: boolean | null
          show_tasks?: boolean | null
          token: string
          views?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          owner_id?: string
          show_docs?: boolean | null
          show_notes?: boolean | null
          show_payments?: boolean | null
          show_reminders?: boolean | null
          show_tasks?: boolean | null
          token?: string
          views?: number | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_reminders: {
        Row: {
          created_at: string | null
          done: boolean | null
          due_at: string
          id: string
          kind: string | null
          owner_id: string
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          done?: boolean | null
          due_at: string
          id?: string
          kind?: string | null
          owner_id: string
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          done?: boolean | null
          due_at?: string
          id?: string
          kind?: string | null
          owner_id?: string
          title?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_retainers: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          deliverables: Json | null
          id: string
          monthly_amount: number
          next_invoice_at: string | null
          owner_id: string
          recurring_reminders: Json | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          deliverables?: Json | null
          id?: string
          monthly_amount?: number
          next_invoice_at?: string | null
          owner_id: string
          recurring_reminders?: Json | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          deliverables?: Json | null
          id?: string
          monthly_amount?: number
          next_invoice_at?: string | null
          owner_id?: string
          recurring_reminders?: Json | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_roadmaps: {
        Row: {
          ai_provider: string | null
          classification: Json
          created_at: string
          id: string
          next_actions: Json
          owner_id: string
          phases: Json
          recommended_docs: Json
          recommended_tools: Json
          source_input: string | null
          suggested_reminders: Json
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          ai_provider?: string | null
          classification?: Json
          created_at?: string
          id?: string
          next_actions?: Json
          owner_id: string
          phases?: Json
          recommended_docs?: Json
          recommended_tools?: Json
          source_input?: string | null
          suggested_reminders?: Json
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          ai_provider?: string | null
          classification?: Json
          created_at?: string
          id?: string
          next_actions?: Json
          owner_id?: string
          phases?: Json
          recommended_docs?: Json
          recommended_tools?: Json
          source_input?: string | null
          suggested_reminders?: Json
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_tasks: {
        Row: {
          blockers: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          owner_id: string
          position: number | null
          progress: number | null
          stage: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id: string
          position?: number | null
          progress?: number | null
          stage?: string
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          blockers?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string
          position?: number | null
          progress?: number | null
          stage?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          ai_summary: string | null
          client_name: string
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deadlines: Json
          deliverables: Json
          id: string
          last_contact_at: string | null
          lifetime_value: number | null
          logo_url: string | null
          notes: string | null
          owner_id: string
          payment_terms: Json
          pipeline_stage: string | null
          pricing: Json
          project_scope: string | null
          social_links: Json | null
          source: string | null
          source_inputs: Json
          status: string
          tags: string[] | null
          timezone: string | null
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          client_name: string
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deadlines?: Json
          deliverables?: Json
          id?: string
          last_contact_at?: string | null
          lifetime_value?: number | null
          logo_url?: string | null
          notes?: string | null
          owner_id: string
          payment_terms?: Json
          pipeline_stage?: string | null
          pricing?: Json
          project_scope?: string | null
          social_links?: Json | null
          source?: string | null
          source_inputs?: Json
          status?: string
          tags?: string[] | null
          timezone?: string | null
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          client_name?: string
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deadlines?: Json
          deliverables?: Json
          id?: string
          last_contact_at?: string | null
          lifetime_value?: number | null
          logo_url?: string | null
          notes?: string | null
          owner_id?: string
          payment_terms?: Json
          pipeline_stage?: string | null
          pricing?: Json
          project_scope?: string | null
          social_links?: Json | null
          source?: string | null
          source_inputs?: Json
          status?: string
          tags?: string[] | null
          timezone?: string | null
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_daily_usage_summary: {
        Row: {
          ai_max_today: number | null
          ai_used_today: number | null
          email: string | null
          has_byo_key: boolean | null
          last_use_at: string | null
          subscription_tier: string | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_usage_summary: {
        Row: {
          ai_calls_30d: number | null
          email: string | null
          exports_30d: number | null
          has_byo_key: boolean | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          user_id: string | null
          workspace_count: number | null
        }
        Insert: {
          ai_calls_30d?: never
          email?: string | null
          exports_30d?: never
          has_byo_key?: never
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          user_id?: string | null
          workspace_count?: never
        }
        Update: {
          ai_calls_30d?: never
          email?: string | null
          exports_30d?: never
          has_byo_key?: never
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          user_id?: string | null
          workspace_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      ai_jobs_kind_breakdown: {
        Args: { _since?: string }
        Returns: {
          avg_ms: number
          failed: number
          kind: string
          succeeded: number
          total: number
        }[]
      }
      ai_jobs_ops_summary: { Args: { _since?: string }; Returns: Json }
      ai_jobs_provider_breakdown: {
        Args: { _since?: string }
        Returns: {
          avg_ms: number
          cost: number
          failed: number
          provider: string
          succeeded: number
          tokens: number
          total: number
        }[]
      }
      ai_jobs_user_cost_breakdown: {
        Args: { _limit?: number; _since?: string }
        Returns: {
          cost_units: number
          failed: number
          retries: number
          succeeded: number
          tokens_in: number
          tokens_out: number
          total_jobs: number
          user_id: string
        }[]
      }
      cancel_ai_job: { Args: { _id: string }; Returns: undefined }
      claim_ai_jobs: {
        Args: { _limit?: number }
        Returns: {
          attempt: number
          cancelled_at: string | null
          cost_units: number
          created_at: string
          dedupe_key: string | null
          duration_ms: number | null
          error: string | null
          feature: string | null
          finished_at: string | null
          id: string
          input: Json
          kind: string
          max_attempts: number
          metadata: Json
          model: string | null
          output: Json | null
          parent_job_id: string | null
          priority: number
          progress: number
          provider: string | null
          scheduled_at: string
          source: string | null
          started_at: string | null
          status: string
          tokens_input: number
          tokens_output: number
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ai_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_workflow_runs: {
        Args: { _limit?: number }
        Returns: {
          attempt: number
          context: Json
          created_at: string
          dedupe_key: string | null
          event_id: string | null
          finished_at: string | null
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          scheduled_at: string
          started_at: string | null
          status: string
          trigger_event: string
          updated_at: string
          user_id: string | null
          workflow_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_ai_job: {
        Args: {
          _cost?: number
          _id: string
          _model?: string
          _output: Json
          _provider?: string
          _tokens_in?: number
          _tokens_out?: number
        }
        Returns: undefined
      }
      consume_ai_quota: {
        Args: { _feature: string; _user_id: string }
        Returns: Json
      }
      consume_export_download: {
        Args: { _export_id: string; _user_id: string }
        Returns: Json
      }
      consume_export_quota: { Args: { _user_id: string }; Returns: Json }
      consume_telegram_link_token: { Args: { _token: string }; Returns: string }
      consume_usage: {
        Args: {
          _feature: string
          _meter: string
          _units?: number
          _user: string
        }
        Returns: Json
      }
      enqueue_ai_job: {
        Args: {
          _dedupe_key?: string
          _feature?: string
          _input?: Json
          _kind: string
          _max_attempts?: number
          _priority?: number
          _scheduled_at?: string
          _source?: string
          _user?: string
        }
        Returns: string
      }
      enqueue_workflow_runs: {
        Args: {
          _dedupe_key?: string
          _event_name: string
          _payload?: Json
          _source?: string
          _user_id?: string
        }
        Returns: {
          event_id: string
          runs_enqueued: number
        }[]
      }
      fail_ai_job: { Args: { _error: string; _id: string }; Returns: undefined }
      flag_block_summary: {
        Args: { _since?: string }
        Returns: {
          blocks: number
          flag_key: string
          last_block: string
          reason: string
          unique_users: number
        }[]
      }
      flag_block_timeline: {
        Args: { _bucket?: string; _since?: string }
        Returns: {
          blocks: number
          bucket: string
        }[]
      }
      flag_hash_bucket: {
        Args: { _flag: string; _user: string }
        Returns: number
      }
      grant_bonus_credits: {
        Args: {
          _amount: number
          _expires_at?: string
          _meter: string
          _reason?: string
          _user: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_telegram_link_token: {
        Args: { _bot?: string; _user: string }
        Returns: Json
      }
      mark_expired_exports: { Args: never; Returns: number }
      replay_workflow_failure: {
        Args: { _failure_id: string }
        Returns: string
      }
      resolve_feature_flags: {
        Args: { _env?: string; _user: string }
        Returns: Json
      }
      resolve_user_limits: { Args: { _user: string }; Returns: Json }
      telegram_delivery_timeline: {
        Args: { _bucket?: string; _since?: string }
        Returns: {
          bucket: string
          failed: number
          queued: number
          sent: number
        }[]
      }
      telegram_ops_overview: { Args: { _since?: string }; Returns: Json }
      telegram_top_failures: {
        Args: { _since?: string }
        Returns: {
          count: number
          last_at: string
          reason: string
        }[]
      }
      workflow_event_throughput: {
        Args: { _bucket?: string; _since?: string }
        Returns: {
          bucket: string
          count: number
          event_name: string
        }[]
      }
      workflow_ops_summary: { Args: { _since?: string }; Returns: Json }
      workflow_top_events: {
        Args: { _since?: string }
        Returns: {
          event_name: string
          last_seen: string
          runs_enqueued: number
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      export_status:
        | "pending"
        | "ready"
        | "delivered"
        | "expired"
        | "revoked"
        | "failed"
      export_visibility: "private" | "unlisted" | "team"
      seo_status: "draft" | "published" | "archived"
      subscription_tier: "free" | "pro" | "elite" | "infinity"
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
      app_role: ["admin", "moderator", "user"],
      export_status: [
        "pending",
        "ready",
        "delivered",
        "expired",
        "revoked",
        "failed",
      ],
      export_visibility: ["private", "unlisted", "team"],
      seo_status: ["draft", "published", "archived"],
      subscription_tier: ["free", "pro", "elite", "infinity"],
    },
  },
} as const
