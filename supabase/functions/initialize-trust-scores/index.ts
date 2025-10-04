import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Initializing trust scores for all users...');

    // Get all users with business profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('business_profiles')
      .select('user_id');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} user profiles`);

    let initialized = 0;
    let errors = 0;

    if (profiles) {
      for (const profile of profiles) {
        try {
          console.log(`Initializing trust score for user: ${profile.user_id}`);
          
          const { error: updateError } = await supabase.rpc('update_user_trust_score', {
            user_uuid: profile.user_id
          });

          if (updateError) {
            console.error(`Error updating trust score for user ${profile.user_id}:`, updateError);
            errors++;
          } else {
            initialized++;
          }
        } catch (error) {
          console.error(`Unexpected error for user ${profile.user_id}:`, error);
          errors++;
        }
      }
    }

    const result = {
      success: true,
      message: 'Trust score initialization completed',
      summary: {
        total_profiles: profiles?.length || 0,
        initialized,
        errors
      }
    };

    console.log('Initialization result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in trust score initialization:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to initialize trust scores'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});