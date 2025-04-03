export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      machines: {
        Row: Machine
        Insert: Omit<Machine, "id" | "Created On" | "Updated On">
        Update: Partial<Omit<Machine, "id" | "Created On" | "Updated On">>
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Review, "id" | "created_at" | "updated_at">>
      }
      images: {
        Row: Image
        Insert: Omit<Image, "id" | "created_at">
        Update: Partial<Omit<Image, "id" | "created_at">>
      }
      comparisons: {
        Row: Comparison
        Insert: Omit<Comparison, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Comparison, "id" | "created_at" | "updated_at">>
      }
      comparison_machines: {
        Row: ComparisonMachine
        Insert: Omit<ComparisonMachine, "id">
        Update: Partial<Omit<ComparisonMachine, "id">>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Category, "id" | "created_at" | "updated_at">>
      }
      machine_categories: {
        Row: MachineCategory
        Insert: Omit<MachineCategory, "id">
        Update: Partial<Omit<MachineCategory, "id">>
      }
      brands: {
        Row: Brand
        Insert: Omit<Brand, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Brand, "id" | "created_at" | "updated_at">>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Machine = {
  id: string
  "Machine Name": string
  "Internal link": string
  "Rating": number | null
  "Award": string | null
  "Image": string | null
  "Machine Category": string | null
  "Laser Category": string | null
  "Company": string | null
  "Laser Type A": string | null
  "Laser Power A": string | null
  "Laser Type B": string | null
  "LaserPower B": string | null
  "Affiliate Link": string | null
  "Price": number | null
  "Price Category": string | null
  "Work Area": string | null
  "Height": string | null
  "Machine Size": string | null
  "Speed": string | null
  "Speed Category": string | null
  "Acceleration": string | null
  "Software": string | null
  "Focus": string | null
  "Enclosure": string | null
  "Wifi": string | null
  "Camera": string | null
  "Passthrough": string | null
  "Controller": string | null
  "Warranty": string | null
  "Excerpt (Short)": string | null
  "Excerpt (Long)": string | null
  "Description": string | null
  "Review": string | null
  "Brandon's Take": string | null
  "Highlights": string | null
  "Drawbacks": string | null
  "YouTube Review": string | null
  "Is A Featured Resource?": boolean
  "Favorited": number
  "Hidden": boolean
  "Laser Frequency": string | null
  "Pulse Width": string | null
  "Best for:": string | null
  "Laser Source Manufacturer": string | null
  "Created On": string
  "Updated On": string
  "Published On": string | null
  "Collection ID": string | null
  "Locale ID": string | null
  "Item ID": string | null
}

export type Review = {
  id: string
  machine_id: string
  title: string | null
  content: string | null
  author: string | null
  rating: number | null
  pros: string[] | null
  cons: string[] | null
  created_at: string
  updated_at: string
  published_at: string | null
  verified_purchase: boolean
  helpful_votes: number
  featured: boolean
}

export type Image = {
  id: string
  machine_id: string
  url: string
  alt_text: string | null
  sort_order: number
  created_at: string
}

export type Comparison = {
  id: string
  title: string | null
  slug: string | null
  description: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  featured: boolean
}

export type ComparisonMachine = {
  id: string
  comparison_id: string
  machine_id: string
  sort_order: number
}

export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  image_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type MachineCategory = {
  id: string
  machine_id: string
  category_id: string
}

export type Brand = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

// Interface for brands as they exist in the database with uppercase property names
export interface BrandFromDB {
  id: string
  "Name": string
  "Slug": string
  "Collection ID": string | null
  "Locale ID": string | null
  "Item ID": string | null
  "Created On": string | null
  "Updated On": string | null
  "Published On": string | null
  "Website": string | null
  "Logo": string | null
}

