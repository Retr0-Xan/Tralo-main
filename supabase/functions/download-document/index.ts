import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    try {
        const url = new URL(req.url);
        const filePath = url.searchParams.get('file');

        if (!filePath) {
            return new Response(
                JSON.stringify({ error: 'Missing file parameter' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            );
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Download file from storage
        const { data, error } = await supabase.storage
            .from('documents')
            .download(filePath);

        if (error || !data) {
            console.error('Download error:', error);
            return new Response(
                JSON.stringify({ error: 'File not found' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            );
        }

        // Get filename from path
        const fileName = filePath.split('/').pop() || 'document.html';

        // Convert blob to text for HTML files
        const htmlContent = await data.text();

        return new Response(htmlContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                ...corsHeaders,
            },
        });

    } catch (error: any) {
        console.error('Error downloading document:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
        );
    }
};

serve(handler);
