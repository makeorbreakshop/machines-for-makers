import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET_NAME = 'images';
const BASE_FOLDER = 'learn-lightburn';

export async function GET(request: Request) {
  const supabase = createServerClient();
  
  try {
    // Get all subfolders
    const folders = ['hero', 'partners', 'instructor', 'projects', 'misc'];
    const result: Record<string, string[]> = {};
    
    for (const folder of folders) {
      const folderPath = `${BASE_FOLDER}/${folder}`;
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath);
        
      if (error) {
        console.error(`Error listing ${folderPath}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      if (data) {
        result[folder] = data
          .filter(item => !item.id.endsWith('/')) // Filter out directories
          .map(item => {
            const url = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(`${folderPath}/${item.name}`);
            return {
              name: item.name,
              path: `${folderPath}/${item.name}`,
              url: url.data.publicUrl
            };
          });
      }
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error listing images:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 