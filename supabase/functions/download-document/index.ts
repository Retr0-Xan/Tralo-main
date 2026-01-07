import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

        // Fetch file from public storage (no auth required since bucket is public)
        const storageUrl = `${supabaseUrl}/storage/v1/object/public/documents/${filePath}`;
        const response = await fetch(storageUrl);

        if (!response.ok) {
            console.error('Storage fetch error:', response.status, response.statusText);
            return new Response(
                JSON.stringify({ error: 'File not found' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            );
        }

        const htmlContent = await response.text();

        // Get filename from path
        const fileName = filePath.split('/').pop() || 'document.html';

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
