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
      banned_identities: {
        Row: {
          banned_by: string | null
          created_at: string
          device_signal: string | null
          email: string | null
          id: string
          reason: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          device_signal?: string | null
          email?: string | null
          id?: string
          reason: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          device_signal?: string | null
          email?: string | null
          id?: string
          reason?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      campaign_slots: {
        Row: {
          at_risk: boolean
          campaign_id: string
          clipper_user_id: string
          created_at: string
          first_clip_at: string | null
          id: string
          joined_at: string
          released: boolean
          released_at: string | null
          updated_at: string
          warned_at: string | null
        }
        Insert: {
          at_risk?: boolean
          campaign_id: string
          clipper_user_id: string
          created_at?: string
          first_clip_at?: string | null
          id?: string
          joined_at?: string
          released?: boolean
          released_at?: string | null
          updated_at?: string
          warned_at?: string | null
        }
        Update: {
          at_risk?: boolean
          campaign_id?: string
          clipper_user_id?: string
          created_at?: string
          first_clip_at?: string | null
          id?: string
          joined_at?: string
          released?: boolean
          released_at?: string | null
          updated_at?: string
          warned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_slots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_payout_stats"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_slots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_tag: string | null
          brand_user_id: string
          budget: number
          caption: string | null
          clipper_pool: number
          commission_amount: number
          created_at: string
          creator_name: string | null
          cta_link: string | null
          duration_days: number | null
          early_access_hours: number
          ends_at: string | null
          funded: boolean
          hashtags: string | null
          id: string
          is_inhouse: boolean
          kpi_target: string | null
          live_at: string | null
          min_followers: number
          per_clipper_ceiling: number
          rate_per_1000_views: number
          reject_reason: string | null
          reserve_amount: number
          slots: number
          source_file_link: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_platforms: Database["public"]["Enums"]["clip_platform"][]
          title: string
          updated_at: string
          video_length_minutes: number | null
          watermark_required: boolean
          watermark_url: string | null
        }
        Insert: {
          brand_tag?: string | null
          brand_user_id: string
          budget?: number
          caption?: string | null
          clipper_pool?: number
          commission_amount?: number
          created_at?: string
          creator_name?: string | null
          cta_link?: string | null
          duration_days?: number | null
          early_access_hours?: number
          ends_at?: string | null
          funded?: boolean
          hashtags?: string | null
          id?: string
          is_inhouse?: boolean
          kpi_target?: string | null
          live_at?: string | null
          min_followers?: number
          per_clipper_ceiling?: number
          rate_per_1000_views?: number
          reject_reason?: string | null
          reserve_amount?: number
          slots?: number
          source_file_link?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_platforms?: Database["public"]["Enums"]["clip_platform"][]
          title: string
          updated_at?: string
          video_length_minutes?: number | null
          watermark_required?: boolean
          watermark_url?: string | null
        }
        Update: {
          brand_tag?: string | null
          brand_user_id?: string
          budget?: number
          caption?: string | null
          clipper_pool?: number
          commission_amount?: number
          created_at?: string
          creator_name?: string | null
          cta_link?: string | null
          duration_days?: number | null
          early_access_hours?: number
          ends_at?: string | null
          funded?: boolean
          hashtags?: string | null
          id?: string
          is_inhouse?: boolean
          kpi_target?: string | null
          live_at?: string | null
          min_followers?: number
          per_clipper_ceiling?: number
          rate_per_1000_views?: number
          reject_reason?: string | null
          reserve_amount?: number
          slots?: number
          source_file_link?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_platforms?: Database["public"]["Enums"]["clip_platform"][]
          title?: string
          updated_at?: string
          video_length_minutes?: number | null
          watermark_required?: boolean
          watermark_url?: string | null
        }
        Relationships: []
      }
      clip_submissions: {
        Row: {
          campaign_id: string
          clip_link: string
          clipper_account_id: string | null
          clipper_user_id: string
          counts_from: string | null
          deleted_before_snapshot: boolean
          earnings: number
          id: string
          is_live: boolean
          last_checked_at: string | null
          last_synced_at: string | null
          paid: boolean
          paid_at: string | null
          platform: Database["public"]["Enums"]["clip_platform"]
          posted_at: string
          snapshot_taken_at: string | null
          snapshot_view_count: number | null
          submitted_at: string
          updated_at: string
          view_count: number
          watermark_confirmed: boolean
          watermark_note: string | null
          watermark_reviewed_at: string | null
          watermark_verified: boolean | null
        }
        Insert: {
          campaign_id: string
          clip_link: string
          clipper_account_id?: string | null
          clipper_user_id: string
          counts_from?: string | null
          deleted_before_snapshot?: boolean
          earnings?: number
          id?: string
          is_live?: boolean
          last_checked_at?: string | null
          last_synced_at?: string | null
          paid?: boolean
          paid_at?: string | null
          platform: Database["public"]["Enums"]["clip_platform"]
          posted_at?: string
          snapshot_taken_at?: string | null
          snapshot_view_count?: number | null
          submitted_at?: string
          updated_at?: string
          view_count?: number
          watermark_confirmed?: boolean
          watermark_note?: string | null
          watermark_reviewed_at?: string | null
          watermark_verified?: boolean | null
        }
        Update: {
          campaign_id?: string
          clip_link?: string
          clipper_account_id?: string | null
          clipper_user_id?: string
          counts_from?: string | null
          deleted_before_snapshot?: boolean
          earnings?: number
          id?: string
          is_live?: boolean
          last_checked_at?: string | null
          last_synced_at?: string | null
          paid?: boolean
          paid_at?: string | null
          platform?: Database["public"]["Enums"]["clip_platform"]
          posted_at?: string
          snapshot_taken_at?: string | null
          snapshot_view_count?: number | null
          submitted_at?: string
          updated_at?: string
          view_count?: number
          watermark_confirmed?: boolean
          watermark_note?: string | null
          watermark_reviewed_at?: string | null
          watermark_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_payout_stats"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "clip_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_submissions_clipper_account_id_fkey"
            columns: ["clipper_account_id"]
            isOneToOne: false
            referencedRelation: "clipper_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_view_readings: {
        Row: {
          clip_submission_id: string
          created_at: string
          id: string
          is_live: boolean
          note: string | null
          recorded_at: string
          recorded_by: string | null
          source: string
          view_count: number
        }
        Insert: {
          clip_submission_id: string
          created_at?: string
          id?: string
          is_live?: boolean
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          source?: string
          view_count: number
        }
        Update: {
          clip_submission_id?: string
          created_at?: string
          id?: string
          is_live?: boolean
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          source?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "clip_view_readings_clip_submission_id_fkey"
            columns: ["clip_submission_id"]
            isOneToOne: false
            referencedRelation: "clip_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      clipper_accounts: {
        Row: {
          avg_views: number
          clipper_user_id: string
          created_at: string
          followers: number
          handle: string
          id: string
          platform: Database["public"]["Enums"]["clip_platform"]
          updated_at: string
        }
        Insert: {
          avg_views?: number
          clipper_user_id: string
          created_at?: string
          followers?: number
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["clip_platform"]
          updated_at?: string
        }
        Update: {
          avg_views?: number
          clipper_user_id?: string
          created_at?: string
          followers?: number
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["clip_platform"]
          updated_at?: string
        }
        Relationships: []
      }
      clipper_profiles: {
        Row: {
          account_name: string | null
          applied_at: string | null
          approved_at: string | null
          avg_views: number
          bank_account_number: string | null
          bank_name: string | null
          banned: boolean
          created_at: string
          followers_count: number
          is_approved: boolean
          is_inhouse: boolean
          is_priority: boolean
          lifetime_views: number
          max_clips_per_day: number
          rank: Database["public"]["Enums"]["clipper_rank"]
          real_name: string | null
          referral_code: string | null
          reject_reason: string | null
          strikes: number
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          account_name?: string | null
          applied_at?: string | null
          approved_at?: string | null
          avg_views?: number
          bank_account_number?: string | null
          bank_name?: string | null
          banned?: boolean
          created_at?: string
          followers_count?: number
          is_approved?: boolean
          is_inhouse?: boolean
          is_priority?: boolean
          lifetime_views?: number
          max_clips_per_day?: number
          rank?: Database["public"]["Enums"]["clipper_rank"]
          real_name?: string | null
          referral_code?: string | null
          reject_reason?: string | null
          strikes?: number
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          account_name?: string | null
          applied_at?: string | null
          approved_at?: string | null
          avg_views?: number
          bank_account_number?: string | null
          bank_name?: string | null
          banned?: boolean
          created_at?: string
          followers_count?: number
          is_approved?: boolean
          is_inhouse?: boolean
          is_priority?: boolean
          lifetime_views?: number
          max_clips_per_day?: number
          rank?: Database["public"]["Enums"]["clipper_rank"]
          real_name?: string | null
          referral_code?: string | null
          reject_reason?: string | null
          strikes?: number
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          duration_label: string | null
          id: string
          lesson_number: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          duration_label?: string | null
          id?: string
          lesson_number?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          duration_label?: string | null
          id?: string
          lesson_number?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount_paid: number
          course_id: string
          created_at: string
          id: string
          paystack_ref: string | null
          purchased_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          course_id: string
          created_at?: string
          id?: string
          paystack_ref?: string | null
          purchased_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          created_at?: string
          id?: string
          paystack_ref?: string | null
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_ratings: {
        Row: {
          course_id: string
          created_at: string
          id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          about: string | null
          avg_rating: number
          badge: Database["public"]["Enums"]["course_badge"]
          created_at: string
          id: string
          is_published: boolean
          outcome_tag: string | null
          pdf_url: string | null
          price: number
          rating_count: number
          sort_order: number
          subtitle: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          about?: string | null
          avg_rating?: number
          badge?: Database["public"]["Enums"]["course_badge"]
          created_at?: string
          id?: string
          is_published?: boolean
          outcome_tag?: string | null
          pdf_url?: string | null
          price?: number
          rating_count?: number
          sort_order?: number
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          about?: string | null
          avg_rating?: number
          badge?: Database["public"]["Enums"]["course_badge"]
          created_at?: string
          id?: string
          is_published?: boolean
          outcome_tag?: string | null
          pdf_url?: string | null
          price?: number
          rating_count?: number
          sort_order?: number
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_config: {
        Row: {
          api_key_secret_name: string
          created_at: string
          enabled: boolean
          endpoint: string | null
          from_email: string | null
          from_name: string
          id: boolean
          notes: string | null
          provider_name: string | null
          updated_at: string
        }
        Insert: {
          api_key_secret_name?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string | null
          from_email?: string | null
          from_name?: string
          id?: boolean
          notes?: string | null
          provider_name?: string | null
          updated_at?: string
        }
        Update: {
          api_key_secret_name?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string | null
          from_email?: string | null
          from_name?: string
          id?: boolean
          notes?: string | null
          provider_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          body: string
          campaign_id: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_payout_stats"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_config: {
        Row: {
          created_at: string
          id: boolean
          min_followers: number
          notes: string | null
          priority_group_link: string | null
          updated_at: string
          watermark_url: string | null
        }
        Insert: {
          created_at?: string
          id?: boolean
          min_followers?: number
          notes?: string | null
          priority_group_link?: string | null
          updated_at?: string
          watermark_url?: string | null
        }
        Update: {
          created_at?: string
          id?: boolean
          min_followers?: number
          notes?: string | null
          priority_group_link?: string | null
          updated_at?: string
          watermark_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      owner_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          campaign_id: string | null
          clipper_user_id: string
          created_at: string
          hold_until: string | null
          id: string
          is_bonus: boolean
          note: string | null
          released_at: string | null
          released_by_admin_id: string | null
          status: Database["public"]["Enums"]["payout_status"]
          transfer_reference: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          campaign_id?: string | null
          clipper_user_id: string
          created_at?: string
          hold_until?: string | null
          id?: string
          is_bonus?: boolean
          note?: string | null
          released_at?: string | null
          released_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          transfer_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          clipper_user_id?: string
          created_at?: string
          hold_until?: string | null
          id?: string
          is_bonus?: boolean
          note?: string | null
          released_at?: string | null
          released_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          transfer_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_payout_stats"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: boolean
          live_mode: boolean
          notes: string | null
          provider: string
          provider_label: string | null
          public_key: string | null
          secret_key_secret_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: boolean
          live_mode?: boolean
          notes?: string | null
          provider?: string
          provider_label?: string | null
          public_key?: string | null
          secret_key_secret_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: boolean
          live_mode?: boolean
          notes?: string | null
          provider?: string
          provider_label?: string | null
          public_key?: string | null
          secret_key_secret_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          device_signal: string | null
          email: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          device_signal?: string | null
          email?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          device_signal?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      strike_log: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          kind: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          kind: string
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          campaign_id: string | null
          created_at: string
          id: string
          kind: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          kind: string
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_payout_stats"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "terms_acceptances_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      view_scraper_config: {
        Row: {
          api_key_secret_name: string
          created_at: string
          enabled: boolean
          endpoint: string | null
          id: boolean
          notes: string | null
          provider_name: string | null
          updated_at: string
        }
        Insert: {
          api_key_secret_name?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string | null
          id?: boolean
          notes?: string | null
          provider_name?: string | null
          updated_at?: string
        }
        Update: {
          api_key_secret_name?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string | null
          id?: boolean
          notes?: string | null
          provider_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_payout_stats: {
        Row: {
          brand_user_id: string | null
          budget: number | null
          campaign_id: string | null
          clipper_pool: number | null
          clippers_maxed: number | null
          commission_amount: number | null
          per_clipper_ceiling: number | null
          pool_remaining: number | null
          rate_per_1000_views: number | null
          reserve_amount: number | null
          slots: number | null
          slots_maxed_out: boolean | null
          slots_taken: number | null
          spent: number | null
          total_views: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          created_at: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          created_at?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          created_at?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_add_strike: {
        Args: { _reason: string; _user_id: string }
        Returns: number
      }
      admin_approve_campaign: {
        Args: { _campaign_id: string; _duration_days?: number }
        Returns: {
          brand_email: string
          brand_username: string
          campaign_id: string
          ends_at: string
          title: string
        }[]
      }
      admin_approve_clipper: {
        Args: { _max_clips_per_day?: number; _user_id: string }
        Returns: undefined
      }
      admin_ban_clipper: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      admin_ban_log: {
        Args: never
        Returns: {
          at: string
          banned: boolean
          email: string
          kind: string
          reason: string
          strikes: number
          user_id: string
          username: string
        }[]
      }
      admin_bonus_pool: {
        Args: never
        Returns: {
          bonuses_paid: number
          bonuses_pending: number
          reserve_total: number
          rollover: number
        }[]
      }
      admin_campaign_analytics: {
        Args: never
        Returns: {
          brand_email: string
          brand_username: string
          budget: number
          clip_count: number
          clipper_count: number
          clipper_pool: number
          created_at: string
          ends_at: string
          id: string
          ig_views: number
          per_clipper_ceiling: number
          rate_per_1000_views: number
          slots: number
          slots_taken: number
          spent: number
          status: Database["public"]["Enums"]["campaign_status"]
          tiktok_views: number
          title: string
          total_views: number
          youtube_views: number
        }[]
      }
      admin_campaign_clippers: {
        Args: { _campaign_id: string }
        Returns: {
          at_risk: boolean
          banned: boolean
          clip_count: number
          clipper_user_id: string
          earnings: number
          first_clip_at: string
          joined_at: string
          real_name: string
          released: boolean
          strikes: number
          total_views: number
          unpaid: number
          username: string
        }[]
      }
      admin_campaign_views_over_time: {
        Args: { _campaign_id: string }
        Returns: {
          cumulative_views: number
          day: string
          views: number
        }[]
      }
      admin_clipper_applications: {
        Args: never
        Returns: {
          applied_at: string
          approved_at: string
          avg_views: number
          banned: boolean
          email: string
          followers_count: number
          is_approved: boolean
          reject_reason: string
          strikes: number
          user_id: string
          username: string
          whatsapp: string
        }[]
      }
      admin_clipper_clips: {
        Args: { _campaign_id: string; _clipper_user_id: string }
        Returns: {
          clip_link: string
          counts_from: string
          deleted_before_snapshot: boolean
          earnings: number
          id: string
          is_live: boolean
          last_checked_at: string
          paid: boolean
          paid_at: string
          platform: Database["public"]["Enums"]["clip_platform"]
          posted_at: string
          snapshot_view_count: number
          view_count: number
        }[]
      }
      admin_course_buyers: {
        Args: { _course_id: string }
        Returns: {
          amount_paid: number
          email: string
          paystack_ref: string
          purchased_at: string
          user_id: string
          username: string
        }[]
      }
      admin_course_sales: {
        Args: never
        Returns: {
          avg_rating: number
          course_id: string
          price: number
          rating_count: number
          revenue: number
          sales_count: number
          title: string
        }[]
      }
      admin_create_inhouse_campaign: {
        Args: {
          _brand_tag: string
          _budget: number
          _caption: string
          _cta_link: string
          _duration_days: number
          _hashtags: string
          _kpi_target: string
          _min_followers?: number
          _rate_per_1000_views: number
          _slots: number
          _source_file_link: string
          _title: string
          _video_length_minutes: number
        }
        Returns: string
      }
      admin_flags: {
        Args: never
        Returns: {
          at: string
          campaign_id: string
          campaign_title: string
          clipper_user_id: string
          detail: string
          kind: string
          username: string
        }[]
      }
      admin_hold_payout: {
        Args: { _clipper_user_id: string; _note?: string }
        Returns: string
      }
      admin_inhouse_clip_queue: {
        Args: never
        Returns: {
          campaign_id: string
          campaign_title: string
          clip_link: string
          clipper_user_id: string
          id: string
          platform: Database["public"]["Enums"]["clip_platform"]
          posted_at: string
          username: string
          view_count: number
          watermark_confirmed: boolean
          watermark_note: string
          watermark_verified: boolean
        }[]
      }
      admin_pay_bonus: {
        Args: { _amount: number; _clipper_user_id: string; _note?: string }
        Returns: string
      }
      admin_payout_queue: {
        Args: never
        Returns: {
          account_name: string
          bank_account_number: string
          bank_name: string
          banned: boolean
          clip_count: number
          clipper_user_id: string
          details_complete: boolean
          held_amount: number
          hold_until: string
          name_matches: boolean
          real_name: string
          unpaid_amount: number
          username: string
        }[]
      }
      admin_platform_overview: {
        Args: never
        Returns: {
          ig_views: number
          lifetime_views: number
          live_campaigns: number
          pending_review: number
          tiktok_views: number
          total_campaigns: number
          total_clippers: number
          total_owed: number
          total_paid: number
          youtube_views: number
        }[]
      }
      admin_reject_campaign: {
        Args: { _campaign_id: string; _reason: string }
        Returns: {
          brand_email: string
          brand_username: string
          campaign_id: string
          reason: string
          title: string
        }[]
      }
      admin_reject_clipper: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      admin_release_payout: {
        Args: { _clipper_user_id: string; _note?: string; _reference?: string }
        Returns: string
      }
      admin_review_queue: {
        Args: never
        Returns: {
          brand_email: string
          brand_tag: string
          brand_user_id: string
          brand_username: string
          budget: number
          caption: string
          clipper_pool: number
          created_at: string
          cta_link: string
          duration_days: number
          funded: boolean
          hashtags: string
          id: string
          kpi_target: string
          per_clipper_ceiling: number
          rate_per_1000_views: number
          slots: number
          source_file_link: string
          title: string
          video_length_minutes: number
          watermark_url: string
        }[]
      }
      admin_set_clip_watermark: {
        Args: { _clip_id: string; _note?: string; _ok: boolean }
        Returns: undefined
      }
      admin_unban_clipper: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
      apply_inhouse_clipper: {
        Args: { _avg_views: number; _followers: number; _whatsapp: string }
        Returns: undefined
      }
      brand_campaign_analytics: {
        Args: never
        Returns: {
          budget: number
          campaign_id: string
          clip_count: number
          clipper_count: number
          clipper_pool: number
          created_at: string
          ends_at: string
          ig_views: number
          per_clipper_ceiling: number
          rate_per_1000_views: number
          slots: number
          slots_taken: number
          spent: number
          status: string
          tiktok_views: number
          title: string
          total_views: number
          youtube_views: number
        }[]
      }
      brand_campaign_clips: {
        Args: { _campaign_id: string }
        Returns: {
          clip_link: string
          earnings: number
          id: string
          paid: boolean
          platform: string
          posted_at: string
          username: string
          view_count: number
        }[]
      }
      campaign_slots_taken: { Args: { _campaign_id: string }; Returns: number }
      clipper_campaign_brief: {
        Args: { _campaign_id: string }
        Returns: {
          brand_tag: string
          can_join: boolean
          caption: string
          clipper_pool: number
          cloutbase_watermark_url: string
          cta_link: string
          early_access_until: string
          ends_at: string
          hashtags: string
          id: string
          is_inhouse: boolean
          joined: boolean
          kpi_target: string
          min_followers: number
          per_clipper_ceiling: number
          rate_per_1000_views: number
          slots: number
          slots_taken: number
          source_file_link: string
          spent: number
          status: Database["public"]["Enums"]["campaign_status"]
          target_platforms: Database["public"]["Enums"]["clip_platform"][]
          title: string
          video_length_minutes: number
          watermark_url: string
        }[]
      }
      clipper_campaign_feed: {
        Args: never
        Returns: {
          can_join: boolean
          clipper_pool: number
          early_access_until: string
          ends_at: string
          id: string
          is_inhouse: boolean
          joined: boolean
          kpi_target: string
          min_followers: number
          per_clipper_ceiling: number
          rate_per_1000_views: number
          slots: number
          slots_taken: number
          spent: number
          status: Database["public"]["Enums"]["campaign_status"]
          target_platforms: Database["public"]["Enums"]["clip_platform"][]
          title: string
        }[]
      }
      clipper_can_join: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      clipper_daily_limit: { Args: { _user_id: string }; Returns: number }
      course_lesson_outline: {
        Args: { _course_id: string }
        Returns: {
          duration_label: string
          id: string
          lesson_number: number
          title: string
        }[]
      }
      gen_referral_code: { Args: never; Returns: string }
      has_active_slot: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_official_clipper: { Args: { _user_id: string }; Returns: boolean }
      join_campaign: { Args: { _campaign_id: string }; Returns: string }
      my_referral_code: { Args: never; Returns: string }
      my_referral_stats: {
        Args: never
        Returns: {
          code: string
          joined_at: string
          total: number
        }[]
      }
      next_friday: { Args: never; Returns: string }
      owns_campaign: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      owns_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      payout_name_matches: {
        Args: { _account_name: string; _real_name: string }
        Returns: boolean
      }
      public_recent_payouts: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          released_at: string
          username: string
        }[]
      }
      rank_daily_limit: {
        Args: { _rank: Database["public"]["Enums"]["clipper_rank"] }
        Returns: number
      }
      rank_for_views: {
        Args: { _views: number }
        Returns: Database["public"]["Enums"]["clipper_rank"]
      }
      recalc_clipper_earnings: {
        Args: { _campaign_id: string; _clipper_user_id: string }
        Returns: undefined
      }
      reclaim_slots: { Args: never; Returns: Json }
      record_referral: { Args: { _code: string }; Returns: undefined }
      refresh_clipper_rank: { Args: { _user_id: string }; Returns: undefined }
      slots_for_budget: { Args: { _budget: number }; Returns: number }
      super_admin_demote: { Args: { _user_id: string }; Returns: undefined }
      super_admin_promote: { Args: { _email: string }; Returns: string }
      super_admin_user_list: {
        Args: never
        Returns: {
          created_at: string
          email: string
          roles: string[]
          user_id: string
          username: string
        }[]
      }
    }
    Enums: {
      account_type: "business" | "clipper"
      app_role: "business" | "clipper" | "admin" | "super_admin"
      campaign_status: "pending_review" | "live" | "rejected" | "full" | "ended"
      clip_platform: "tiktok" | "ig" | "youtube"
      clipper_rank: "rookie" | "pro" | "elite" | "legend"
      course_badge: "none" | "hot" | "popular" | "recommended"
      payout_status: "pending" | "held" | "paid"
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
      account_type: ["business", "clipper"],
      app_role: ["business", "clipper", "admin", "super_admin"],
      campaign_status: ["pending_review", "live", "rejected", "full", "ended"],
      clip_platform: ["tiktok", "ig", "youtube"],
      clipper_rank: ["rookie", "pro", "elite", "legend"],
      course_badge: ["none", "hot", "popular", "recommended"],
      payout_status: ["pending", "held", "paid"],
    },
  },
} as const
