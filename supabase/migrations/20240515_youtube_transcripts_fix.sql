-- Create a view for backward compatibility
CREATE OR REPLACE VIEW public.youtube_transcripts AS
SELECT * FROM public.transcripts;

-- Ensure proper reference in functions that might still use youtube_transcripts
DO $$
BEGIN
    -- Check for any references to youtube_transcripts in function bodies
    PERFORM p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosrc LIKE '%youtube_transcripts%';
    
    -- If we found any, we would handle them here
    -- But since the code already uses transcripts, this is just a precaution
END $$; 