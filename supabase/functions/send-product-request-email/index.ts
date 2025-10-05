import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

// Initialize Resend with API key from environment
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client for admin operations
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProductRequestEmailRequest {
  productName: string;
  description?: string;
  reason?: string;
  priority: string;
  userEmail: string;
  userId: string;
}

// Fallback handler when Resend API key is not configured
const handleDatabaseOnlyMode = async (req: Request): Promise<Response> => {
  try {
    const { 
      productName, 
      description, 
      reason, 
      priority, 
      userEmail, 
      userId 
    }: ProductRequestEmailRequest = await req.json();

    console.log("Processing product request (database-only mode):", { productName, priority, userEmail, userId });

    // Store the product request in the database
    const { error: dbError } = await supabaseAdmin
      .from('product_requests')
      .insert({
        user_id: userId,
        product_name: productName,
        description: description,
        reason: reason,
        priority: priority,
        status: 'submitted'
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Product request stored successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Product request submitted successfully (stored in database)",
        emailSent: false,
        stored: true
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in database-only mode:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey || resendApiKey.includes("placeholder")) {
      console.warn("RESEND_API_KEY not properly configured");
      // Fall back to database storage only
      return await handleDatabaseOnlyMode(req);
    }
    const { 
      productName, 
      description, 
      reason, 
      priority, 
      userEmail, 
      userId 
    }: ProductRequestEmailRequest = await req.json();

    console.log("Processing product request email:", { productName, priority, userEmail, userId });

    // First, store in database
    const { error: dbError } = await supabaseAdmin
      .from('product_requests')
      .insert({
        user_id: userId,
        product_name: productName,
        description: description,
        reason: reason,
        priority: priority,
        status: 'submitted'
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Product request stored successfully for user ${userId}`);

    const recipients = [
      "enquiries.traloapp@gmail.com"
    ];

    const priorityColors = {
      low: "#28a745",
      medium: "#ffc107", 
      high: "#dc3545"
    };

    const priorityEmojis = {
      low: "🟢",
      medium: "🟡",
      high: "🔴"
    };

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📦 New Product Request</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
              <h2 style="color: #333; margin: 0; flex: 1;">${productName}</h2>
              <span style="background: ${priorityColors[priority as keyof typeof priorityColors]}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                ${priorityEmojis[priority as keyof typeof priorityEmojis]} ${priority.toUpperCase()} PRIORITY
              </span>
            </div>
            
            ${description ? `
              <div style="margin: 15px 0; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                <h3 style="margin: 0 0 8px 0; color: #1976d2; font-size: 14px;">Product Description:</h3>
                <p style="margin: 0; white-space: pre-line; line-height: 1.6; color: #555;">${description}</p>
              </div>
            ` : ''}
            
            ${reason ? `
              <div style="margin: 15px 0; padding: 15px; background: #f3e5f5; border-left: 4px solid #9c27b0; border-radius: 4px;">
                <h3 style="margin: 0 0 8px 0; color: #7b1fa2; font-size: 14px;">Reason for Request:</h3>
                <p style="margin: 0; white-space: pre-line; line-height: 1.6; color: #555;">${reason}</p>
              </div>
            ` : ''}
            
            <div style="border-top: 1px solid #e1e5e9; padding-top: 15px; margin-top: 20px;">
              <h3 style="color: #666; font-size: 16px; margin-bottom: 10px;">Request Details:</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Requested by:</strong> ${userEmail}</p>
              <p style="margin: 5px 0; color: #555;"><strong>User ID:</strong> ${userId}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Priority Level:</strong> ${priority.charAt(0).toUpperCase() + priority.slice(1)}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 12px; margin-top: 15px;">
              <p style="margin: 0; color: #856404; font-size: 13px;">
                💡 <strong>Action Required:</strong> Review this product request and consider adding "${productName}" to the Trade Index based on user demand and market relevance.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Send email to all recipients
    const emailPromises = recipients.map(email => 
      resend.emails.send({
        from: "Tralo Products <onboarding@resend.dev>",
        to: [email],
        subject: `Tralo Product Request: ${productName} [${priority.toUpperCase()} PRIORITY]`,
        html: emailHtml,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    // Check if any emails failed
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length > 0) {
      console.error("Some emails failed to send:", failed);
    }

    const successful = results.filter(result => result.status === 'fulfilled');
    console.log(`Successfully sent ${successful.length} out of ${recipients.length} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Product request submitted and emails sent successfully",
        emailsSent: successful.length,
        totalRecipients: recipients.length,
        stored: true
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-product-request-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);