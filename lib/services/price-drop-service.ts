import { createServerClient } from '@/lib/supabase/server';

export interface PriceDropInfo {
  machineId: string;
  percentageChange: number;
  priceChange: number;
  dropDate: string;
  isAllTimeLow: boolean;
}

export class PriceDropService {
  /**
   * Get recent price drops for multiple machines
   */
  static async getRecentPriceDrops(machineIds: string[], days = 7): Promise<Map<string, PriceDropInfo>> {
    const supabase = createServerClient();
    const dropMap = new Map<string, PriceDropInfo>();

    if (machineIds.length === 0) return dropMap;

    const { data, error } = await supabase
      .from('price_history')
      .select('machine_id, price_change, percentage_change, date, is_all_time_low')
      .in('machine_id', machineIds)
      .lt('price_change', 0)
      .in('status', ['AUTO_APPLIED', 'MANUAL_CORRECTION'])
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching price drops:', error);
      return dropMap;
    }

    // Get the most recent drop for each machine
    data?.forEach(drop => {
      if (!dropMap.has(drop.machine_id)) {
        dropMap.set(drop.machine_id, {
          machineId: drop.machine_id,
          percentageChange: drop.percentage_change,
          priceChange: drop.price_change,
          dropDate: drop.date,
          isAllTimeLow: drop.is_all_time_low || false
        });
      }
    });

    return dropMap;
  }

  /**
   * Get price drop info for a single machine
   */
  static async getPriceDropForMachine(machineId: string, days = 7): Promise<PriceDropInfo | null> {
    const drops = await this.getRecentPriceDrops([machineId], days);
    return drops.get(machineId) || null;
  }
}