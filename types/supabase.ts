export interface Database {
  public: {
    Tables: {
      machines: {
        Row: {
          id: string
          "Machine Name": string
          "Award": string | null
          "Price": string | null
          "Rating": number | null
          "Image URL": string | null
          "Excerpt Short": string | null
        }
        Insert: {
          id?: string
          "Machine Name": string
          "Award"?: string | null
          "Price"?: string | null
          "Rating"?: number | null
          "Image URL"?: string | null
          "Excerpt Short"?: string | null
        }
        Update: {
          id?: string
          "Machine Name"?: string
          "Award"?: string | null
          "Price"?: string | null
          "Rating"?: number | null
          "Image URL"?: string | null
          "Excerpt Short"?: string | null
        }
      }
    }
  }
} 