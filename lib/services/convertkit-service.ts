export async function getSubscriberCount(): Promise<number> {
  try {
    const CONVERTKIT_API_SECRET = process.env.CONVERTKIT_API_SECRET;
    
    if (!CONVERTKIT_API_SECRET) {
      console.error('ConvertKit API secret not configured');
      return 54826; // Fallback to static number
    }

    // ConvertKit API v3 endpoint for total subscribers
    const response = await fetch(
      `https://api.convertkit.com/v3/subscribers?api_secret=${CONVERTKIT_API_SECRET}&page=1&per_page=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch ConvertKit subscribers');
      return 54826; // Fallback to static number
    }

    const data = await response.json();
    
    // ConvertKit returns total_subscribers in the response
    return data.total_subscribers || 54826;
  } catch (error) {
    console.error('Error fetching subscriber count:', error);
    return 54826; // Fallback to static number
  }
}