import { Database } from '@/lib/database.types'

export type Machine = Database['public']['Tables']['machines']['Row']
export type MachineLatest = Database['public']['Tables']['machines_latest']['Row']
export type PriceHistory = Database['public']['Tables']['price_history']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']

export type MachineWithPrice = Machine & {
  latest_price?: MachineLatest
  brand?: Brand
  category?: Category
}

export type DetailedMachine = MachineWithPrice & {
  price_history?: PriceHistory[]
  reviews?: Review[]
}

export type BatchResult = Database['public']['Tables']['batch_results']['Row']
export type Batch = Database['public']['Tables']['batches']['Row'] 