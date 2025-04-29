export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      machines: {
        Row: {
          id: string
          "Machine Name": string | null
          "Internal link": string | null
          "Collection ID": string | null
          "Locale ID": string | null
          "Item ID": string | null
          "Created On": string | null
          "Updated On": string | null
          "Published On": string | null
          Rating: number | null
          Award: string | null
          Image: string | null
          "Machine Category": string | null
          "Laser Category": string | null
          Company: string | null
          "Laser Type A": string | null
          "Laser Power A": string | null
          "Laser Type B": string | null
          "LaserPower B": string | null
          "Affiliate Link": string | null
          Price: number | null
          "Price Category": string | null
          "Work Area": string | null
          Height: string | null
          "Machine Size": string | null
          Speed: string | null
          "Speed Category": string | null
          Acceleration: string | null
          Software: string | null
          Focus: string | null
          Enclosure: string | null
          Wifi: string | null
          Camera: string | null
          Passthrough: string | null
          Controller: string | null
          Warranty: string | null
          "Excerpt (Short)": string | null
          "Excerpt (Long)": string | null
          Description: string | null
          Review: string | null
          "Brandon's Take": string | null
          Highlights: string | null
          Drawbacks: string | null
          "YouTube Review": string | null
          "Is A Featured Resource?": string | null
          Favorited: string | null
          Hidden: string | null
          "Laser Frequency": string | null
          "Pulse Width": string | null
          "Best for:": string | null
          "Laser Source Manufacturer": string | null
          product_link: string | null
          price_selector_data: Json | null
          price_selector_last_used: Date | null
          price_selector_url_pattern: string | null
          price_configuration_identifier: string | null
          html_content: string | null
          html_timestamp: Date | null
          html_size: number | null
          html_hash: string | null
          html_compressed: boolean | null
        }
        Insert: {
          id: string
          "Machine Name"?: string | null
          "Internal link"?: string | null
          "Collection ID"?: string | null
          "Locale ID"?: string | null
          "Item ID"?: string | null
          "Created On"?: string | null
          "Updated On"?: string | null
          "Published On"?: string | null
          Rating?: number | null
          Award?: string | null
          Image?: string | null
          "Machine Category"?: string | null
          "Laser Category"?: string | null
          Company?: string | null
          "Laser Type A"?: string | null
          "Laser Power A"?: string | null
          "Laser Type B"?: string | null
          "LaserPower B"?: string | null
          "Affiliate Link"?: string | null
          Price?: number | null
          "Price Category"?: string | null
          "Work Area"?: string | null
          Height?: string | null
          "Machine Size"?: string | null
          Speed?: string | null
          "Speed Category"?: string | null
          Acceleration?: string | null
          Software?: string | null
          Focus?: string | null
          Enclosure?: string | null
          Wifi?: string | null
          Camera?: string | null
          Passthrough?: string | null
          Controller?: string | null
          Warranty?: string | null
          "Excerpt (Short)"?: string | null
          "Excerpt (Long)"?: string | null
          Description?: string | null
          Review?: string | null
          "Brandon's Take"?: string | null
          Highlights?: string | null
          Drawbacks?: string | null
          "YouTube Review"?: string | null
          "Is A Featured Resource?"?: string | null
          Favorited?: string | null
          Hidden?: string | null
          "Laser Frequency"?: string | null
          "Pulse Width"?: string | null
          "Best for:"?: string | null
          "Laser Source Manufacturer"?: string | null
          product_link?: string | null
          price_selector_data?: Json | null
          price_selector_last_used?: Date | null
          price_selector_url_pattern?: string | null
          price_configuration_identifier?: string | null
          html_content?: string | null
          html_timestamp?: Date | null
          html_size?: number | null
          html_hash?: string | null
          html_compressed?: boolean | null
        }
        Update: {
          id?: string
          "Machine Name"?: string | null
          "Internal link"?: string | null
          "Collection ID"?: string | null
          "Locale ID"?: string | null
          "Item ID"?: string | null
          "Created On"?: string | null
          "Updated On"?: string | null
          "Published On"?: string | null
          Rating?: number | null
          Award?: string | null
          Image?: string | null
          "Machine Category"?: string | null
          "Laser Category"?: string | null
          Company?: string | null
          "Laser Type A"?: string | null
          "Laser Power A"?: string | null
          "Laser Type B"?: string | null
          "LaserPower B"?: string | null
          "Affiliate Link"?: string | null
          Price?: number | null
          "Price Category"?: string | null
          "Work Area"?: string | null
          Height?: string | null
          "Machine Size"?: string | null
          Speed?: string | null
          "Speed Category"?: string | null
          Acceleration?: string | null
          Software?: string | null
          Focus?: string | null
          Enclosure?: string | null
          Wifi?: string | null
          Camera?: string | null
          Passthrough?: string | null
          Controller?: string | null
          Warranty?: string | null
          "Excerpt (Short)"?: string | null
          "Excerpt (Long)"?: string | null
          Description?: string | null
          Review?: string | null
          "Brandon's Take"?: string | null
          Highlights?: string | null
          Drawbacks?: string | null
          "YouTube Review"?: string | null
          "Is A Featured Resource?"?: string | null
          Favorited?: string | null
          Hidden?: string | null
          "Laser Frequency"?: string | null
          "Pulse Width"?: string | null
          "Best for:"?: string | null
          "Laser Source Manufacturer"?: string | null
          product_link?: string | null
          price_selector_data?: Json | null
          price_selector_last_used?: Date | null
          price_selector_url_pattern?: string | null
          price_configuration_identifier?: string | null
          html_content?: string | null
          html_timestamp?: Date | null
          html_size?: number | null
          html_hash?: string | null
          html_compressed?: boolean | null
        }
      }
      machines_latest: {
        Row: {
          machine_id: string
          variant_attribute: string
          machines_latest_price: number | null
          currency: string | null
          last_checked: Date | null
          tier: string | null
          confidence: number | null
          manual_review_flag: boolean | null
          flag_reason: string | null
          latest_price_history_id: string | null
          latest_successful_price_history_id: string | null
          last_successful_update_time: Date | null
          last_attempt_time: Date | null
        }
        Insert: {
          machine_id: string
          variant_attribute: string
          machines_latest_price?: number | null
          currency?: string | null
          last_checked?: Date | null
          tier?: string | null
          confidence?: number | null
          manual_review_flag?: boolean | null
          flag_reason?: string | null
          latest_price_history_id?: string | null
          latest_successful_price_history_id?: string | null
          last_successful_update_time?: Date | null
          last_attempt_time?: Date | null
        }
        Update: {
          machine_id?: string
          variant_attribute?: string
          machines_latest_price?: number | null
          currency?: string | null
          last_checked?: Date | null
          tier?: string | null
          confidence?: number | null
          manual_review_flag?: boolean | null
          flag_reason?: string | null
          latest_price_history_id?: string | null
          latest_successful_price_history_id?: string | null
          last_successful_update_time?: Date | null
          last_attempt_time?: Date | null
        }
      }
      price_history: {
        Row: {
          id: string
          machine_id: string
          price: number
          date: Date | null
          source: string | null
          currency: string | null
          scraped_from_url: string | null
          is_all_time_low: boolean | null
          is_all_time_high: boolean | null
          previous_price: number | null
          price_change: number | null
          percentage_change: number | null
          extraction_method: string | null
          variant_attribute: string
          tier: string | null
          extracted_confidence: number | null
          validation_confidence: number | null
          failure_reason: string | null
          batch_id: string | null
          status: string
          review_reason: string | null
          validation_basis_price: number | null
          original_url: string | null
          html_size: number | null
          http_status: number | null
          structured_data_type: string | null
          fallback_to_claude: boolean | null
          raw_price_text: string | null
          cleaned_price_string: string | null
          parsed_currency_from_text: string | null
          extraction_duration_seconds: number | null
          retry_count: number | null
          dom_elements_analyzed: number | null
          price_location_in_dom: string | null
          extraction_attempts: Json | null
          selectors_tried: Json | null
          request_headers: Json | null
          response_headers: Json | null
          validation_steps: Json | null
          company: string | null
          category: string | null
          reviewed_by: string | null
          reviewed_at: Date | null
          original_record_id: string | null
          review_result: string | null
        }
        Insert: {
          id: string
          machine_id: string
          price: number
          date?: Date | null
          source?: string | null
          currency?: string | null
          scraped_from_url?: string | null
          is_all_time_low?: boolean | null
          is_all_time_high?: boolean | null
          previous_price?: number | null
          price_change?: number | null
          percentage_change?: number | null
          extraction_method?: string | null
          variant_attribute: string
          tier?: string | null
          extracted_confidence?: number | null
          validation_confidence?: number | null
          failure_reason?: string | null
          batch_id?: string | null
          status: string
          review_reason?: string | null
          validation_basis_price?: number | null
          original_url?: string | null
          html_size?: number | null
          http_status?: number | null
          structured_data_type?: string | null
          fallback_to_claude?: boolean | null
          raw_price_text?: string | null
          cleaned_price_string?: string | null
          parsed_currency_from_text?: string | null
          extraction_duration_seconds?: number | null
          retry_count?: number | null
          dom_elements_analyzed?: number | null
          price_location_in_dom?: string | null
          extraction_attempts?: Json | null
          selectors_tried?: Json | null
          request_headers?: Json | null
          response_headers?: Json | null
          validation_steps?: Json | null
          company?: string | null
          category?: string | null
          reviewed_by?: string | null
          reviewed_at?: Date | null
          original_record_id?: string | null
          review_result?: string | null
        }
        Update: {
          id?: string
          machine_id?: string
          price?: number
          date?: Date | null
          source?: string | null
          currency?: string | null
          scraped_from_url?: string | null
          is_all_time_low?: boolean | null
          is_all_time_high?: boolean | null
          previous_price?: number | null
          price_change?: number | null
          percentage_change?: number | null
          extraction_method?: string | null
          variant_attribute?: string
          tier?: string | null
          extracted_confidence?: number | null
          validation_confidence?: number | null
          failure_reason?: string | null
          batch_id?: string | null
          status?: string
          review_reason?: string | null
          validation_basis_price?: number | null
          original_url?: string | null
          html_size?: number | null
          http_status?: number | null
          structured_data_type?: string | null
          fallback_to_claude?: boolean | null
          raw_price_text?: string | null
          cleaned_price_string?: string | null
          parsed_currency_from_text?: string | null
          extraction_duration_seconds?: number | null
          retry_count?: number | null
          dom_elements_analyzed?: number | null
          price_location_in_dom?: string | null
          extraction_attempts?: Json | null
          selectors_tried?: Json | null
          request_headers?: Json | null
          response_headers?: Json | null
          validation_steps?: Json | null
          company?: string | null
          category?: string | null
          reviewed_by?: string | null
          reviewed_at?: Date | null
          original_record_id?: string | null
          review_result?: string | null
        }
      }
      brands: {
        Row: {
          id: string
          Name: string | null
          Slug: string | null
          "Collection ID": string | null
          "Locale ID": string | null
          "Item ID": string | null
          "Created On": string | null
          "Updated On": string | null
          "Published On": string | null
          Website: string | null
          Logo: string | null
        }
        Insert: {
          id: string
          Name?: string | null
          Slug?: string | null
          "Collection ID"?: string | null
          "Locale ID"?: string | null
          "Item ID"?: string | null
          "Created On"?: string | null
          "Updated On"?: string | null
          "Published On"?: string | null
          Website?: string | null
          Logo?: string | null
        }
        Update: {
          id?: string
          Name?: string | null
          Slug?: string | null
          "Collection ID"?: string | null
          "Locale ID"?: string | null
          "Item ID"?: string | null
          "Created On"?: string | null
          "Updated On"?: string | null
          "Published On"?: string | null
          Website?: string | null
          Logo?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string | null
          slug: string | null
          description: string | null
        }
        Insert: {
          id: string
          name?: string | null
          slug?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          slug?: string | null
          description?: string | null
        }
      }
      machine_categories: {
        Row: {
          id: string
          machine_id: string | null
          category_id: string | null
        }
        Insert: {
          id: string
          machine_id?: string | null
          category_id?: string | null
        }
        Update: {
          id?: string
          machine_id?: string | null
          category_id?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          machine_id: string
          title: string | null
          content: string | null
          author: string | null
          rating: number | null
          pros: string[] | null
          cons: string[] | null
          created_at: Date | null
          updated_at: Date | null
          published_at: Date | null
          verified_purchase: boolean | null
          helpful_votes: number | null
          featured: boolean | null
          youtube_video_id: string | null
          is_ai_generated: boolean | null
          generation_status: string | null
        }
        Insert: {
          id: string
          machine_id: string
          title?: string | null
          content?: string | null
          author?: string | null
          rating?: number | null
          pros?: string[] | null
          cons?: string[] | null
          created_at?: Date | null
          updated_at?: Date | null
          published_at?: Date | null
          verified_purchase?: boolean | null
          helpful_votes?: number | null
          featured?: boolean | null
          youtube_video_id?: string | null
          is_ai_generated?: boolean | null
          generation_status?: string | null
        }
        Update: {
          id?: string
          machine_id?: string
          title?: string | null
          content?: string | null
          author?: string | null
          rating?: number | null
          pros?: string[] | null
          cons?: string[] | null
          created_at?: Date | null
          updated_at?: Date | null
          published_at?: Date | null
          verified_purchase?: boolean | null
          helpful_votes?: number | null
          featured?: boolean | null
          youtube_video_id?: string | null
          is_ai_generated?: boolean | null
          generation_status?: string | null
        }
      }
      images: {
        Row: {
          id: string
          machine_id: string
          url: string
          alt_text: string | null
          sort_order: number | null
          created_at: Date | null
          source_type: string | null
          source_id: string | null
          timestamp: string | null
          is_primary: boolean | null
          display_location: string[] | null
        }
        Insert: {
          id: string
          machine_id: string
          url: string
          alt_text?: string | null
          sort_order?: number | null
          created_at?: Date | null
          source_type?: string | null
          source_id?: string | null
          timestamp?: string | null
          is_primary?: boolean | null
          display_location?: string[] | null
        }
        Update: {
          id?: string
          machine_id?: string
          url?: string
          alt_text?: string | null
          sort_order?: number | null
          created_at?: Date | null
          source_type?: string | null
          source_id?: string | null
          timestamp?: string | null
          is_primary?: boolean | null
          display_location?: string[] | null
        }
      }
      comparisons: {
        Row: {
          id: string
          title: string | null
          slug: string | null
          description: string | null
          created_at: Date | null
          updated_at: Date | null
          published_at: Date | null
          featured: boolean | null
        }
        Insert: {
          id: string
          title?: string | null
          slug?: string | null
          description?: string | null
          created_at?: Date | null
          updated_at?: Date | null
          published_at?: Date | null
          featured?: boolean | null
        }
        Update: {
          id?: string
          title?: string | null
          slug?: string | null
          description?: string | null
          created_at?: Date | null
          updated_at?: Date | null
          published_at?: Date | null
          featured?: boolean | null
        }
      }
      comparison_machines: {
        Row: {
          id: string
          comparison_id: string
          machine_id: string
          sort_order: number | null
        }
        Insert: {
          id: string
          comparison_id: string
          machine_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          comparison_id?: string
          machine_id?: string
          sort_order?: number | null
        }
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_percent: number | null
          discount_amount: number | null
          valid_from: Date
          valid_until: Date | null
          max_uses: number | null
          current_uses: number | null
          applies_to_machine_id: string | null
          applies_to_brand_id: string | null
          applies_to_category_id: string | null
          is_global: boolean | null
          created_at: Date | null
          updated_at: Date | null
          affiliate_link: string | null
        }
        Insert: {
          id: string
          code: string
          description?: string | null
          discount_percent?: number | null
          discount_amount?: number | null
          valid_from: Date
          valid_until?: Date | null
          max_uses?: number | null
          current_uses?: number | null
          applies_to_machine_id?: string | null
          applies_to_brand_id?: string | null
          applies_to_category_id?: string | null
          is_global?: boolean | null
          created_at?: Date | null
          updated_at?: Date | null
          affiliate_link?: string | null
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_percent?: number | null
          discount_amount?: number | null
          valid_from?: Date
          valid_until?: Date | null
          max_uses?: number | null
          current_uses?: number | null
          applies_to_machine_id?: string | null
          applies_to_brand_id?: string | null
          applies_to_category_id?: string | null
          is_global?: boolean | null
          created_at?: Date | null
          updated_at?: Date | null
          affiliate_link?: string | null
        }
      }
    }
    Views: {
      v_images: {
        Row: {
          id: string | null
          machine_id: string | null
          url: string | null
          alt_text: string | null
          sort_order: number | null
          created_at: Date | null
          source_type: string | null
          source_id: string | null
          timestamp: string | null
          is_primary: boolean | null
          display_location: string[] | null
          effective_sort_order: number | null
        }
      }
    }
  }
} 