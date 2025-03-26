import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Special endpoint to help debug environment variables without exposing sensitive data
 * Only available in development mode
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not available in production' });
  }
  
  // Only allow from localhost
  const forwarded = req.headers['x-forwarded-for'] as string || '';
  const ip = forwarded.split(',')[0].trim() || req.socket.remoteAddress || '';
  if (ip !== '::1' && ip !== '127.0.0.1' && ip !== 'localhost') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { key } = req.query;
  
  // If a specific key is requested
  if (key && typeof key === 'string') {
    const value = process.env[key];
    
    if (!value) {
      return res.status(404).json({ error: 'Environment variable not found' });
    }
    
    // Don't expose the actual value, just metadata
    return res.status(200).json({
      name: key,
      exists: true,
      length: value.length,
      first3Chars: value.substring(0, 3),
      isBase64: /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0,
      charCodes: [...value.substring(0, 5)].map(c => c.charCodeAt(0))
    });
  }
  
  // List all available env vars without exposing values
  const envVars = Object.keys(process.env).map(key => ({
    name: key,
    length: process.env[key]?.length || 0
  }));
  
  return res.status(200).json({
    total: envVars.length,
    variables: envVars
  });
} 