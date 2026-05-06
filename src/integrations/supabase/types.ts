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
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          feature_key: string
          id: string
          label: string
          min_tier: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_key: string
          id?: string
          label: string
          min_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          label?: string
          min_tier?: Database["public"]["Enums"]["subscription_tier"] | null
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
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
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
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_verified: boolean
          onboarding: Json | null
          onboarding_completed: boolean
          phone: string | null
          referral_code: string | null
          referral_credits: number
          referred_by: string | null
          resume_url: string | null
          search_count: number
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
          username: string | null
          xp_points: number
        }
        Insert: {
          address?: string | null
          affiliate_commission?: number | null
          affiliate_earnings?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          onboarding?: Json | null
          onboarding_completed?: boolean
          phone?: string | null
          referral_code?: string | null
          referral_credits?: number
          referred_by?: string | null
          resume_url?: string | null
          search_count?: number
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
          username?: string | null
          xp_points?: number
        }
        Update: {
          address?: string | null
          affiliate_commission?: number | null
          affiliate_earnings?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          onboarding?: Json | null
          onboarding_completed?: boolean
          phone?: string | null
          referral_code?: string | null
          referral_credits?: number
          referred_by?: string | null
          resume_url?: string | null
          search_count?: number
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
          username?: string | null
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
      workspace_documents: {
        Row: {
          created_at: string
          data: Json
          doc_number: string | null
          doc_type: string
          due_at: string | null
          id: string
          owner_id: string
          status: string
          theme: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          doc_number?: string | null
          doc_type: string
          due_at?: string | null
          id?: string
          owner_id: string
          status?: string
          theme?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          doc_number?: string | null
          doc_type?: string
          due_at?: string | null
          id?: string
          owner_id?: string
          status?: string
          theme?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ai_summary: string | null
          client_name: string
          created_at: string
          deadlines: Json
          deliverables: Json
          id: string
          owner_id: string
          payment_terms: Json
          pricing: Json
          project_scope: string | null
          source_inputs: Json
          status: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          client_name: string
          created_at?: string
          deadlines?: Json
          deliverables?: Json
          id?: string
          owner_id: string
          payment_terms?: Json
          pricing?: Json
          project_scope?: string | null
          source_inputs?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          client_name?: string
          created_at?: string
          deadlines?: Json
          deliverables?: Json
          id?: string
          owner_id?: string
          payment_terms?: Json
          pricing?: Json
          project_scope?: string | null
          source_inputs?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      subscription_tier: ["free", "pro", "elite", "infinity"],
    },
  },
} as const
