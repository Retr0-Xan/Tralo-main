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

interface EnquiryEmailRequest {
  type: string;
  subject: string;
  message: string;
  userEmail: string;
  contactEmail?: string;
  contactPhone?: string;
  userId: string;
}

// Fallback handler when Resend API key is not configured
const handleDatabaseOnlyMode = async (req: Request): Promise<Response> => {
  try {
    const { 
      type, 
      subject, 
      message, 
      userEmail, 
      contactEmail, 
      contactPhone, 
      userId 
    }: EnquiryEmailRequest = await req.json();

    console.log("Processing enquiry (database-only mode):", { type, subject, userEmail, userId });

    // Store the enquiry in the database
    const { error: dbError } = await supabaseAdmin
      .from('enquiries')
      .insert({
        user_id: userId,
        type,
        subject,
        message,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        status: 'submitted'
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Enquiry stored successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Enquiry submitted successfully (stored in database)",
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
      type, 
      subject, 
      message, 
      userEmail, 
      contactEmail, 
      contactPhone, 
      userId 
    }: EnquiryEmailRequest = await req.json();

    console.log("Processing enquiry email:", { type, subject, userEmail, userId });

    // First, store in database
    const { error: dbError } = await supabaseAdmin
      .from('enquiries')
      .insert({
        user_id: userId,
        type,
        subject,
        message,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        status: 'submitted'
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Enquiry stored successfully for user ${userId}`);

    const recipients = [
      "enquiries.traloapp@gmail.com"
    ];

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">
            ${type === 'enquiry' ? '❓ New Enquiry' : '💡 New Suggestion'}
          </h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">${subject}</h2>
            
            <div style="margin: 20px 0; padding: 15px; background: #f1f3f4; border-left: 4px solid #667eea; border-radius: 4px;">
              <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${message}</p>
            </div>
            
            <div style="border-top: 1px solid #e1e5e9; padding-top: 15px; margin-top: 20px;">
              <h3 style="color: #666; font-size: 16px; margin-bottom: 10px;">Contact Information:</h3>
              <p style="margin: 5px 0; color: #555;"><strong>User Email:</strong> ${userEmail}</p>
              ${contactEmail ? `<p style="margin: 5px 0; color: #555;"><strong>Preferred Contact Email:</strong> ${contactEmail}</p>` : ''}
              ${contactPhone ? `<p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${contactPhone}</p>` : ''}
              <p style="margin: 5px 0; color: #555;"><strong>User ID:</strong> ${userId}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Send email to all recipients
    const emailPromises = recipients.map(email => 
      resend.emails.send({
        from: "Tralo Enquiries <onboarding@resend.dev>",
        to: [email],
        subject: `Tralo ${type === 'enquiry' ? 'Enquiry' : 'Suggestion'}: ${subject}`,
        html: emailHtml,
        replyTo: userEmail,
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
        message: "Enquiry submitted and emails sent successfully",
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
    console.error("Error in send-enquiry-email function:", error);
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