import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SafetyAlertRequest {
  alertId: string;
  workerEmail: string;
  alertMessage: string;
  severity: string;
  location: string;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alertId, workerEmail, alertMessage, severity, location, timestamp }: SafetyAlertRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = "https://mmgzipjmudsfxyrqbvih.supabase.co";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Send email alert using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mine Safety Alert <safety@mineguard.com>',
        to: [workerEmail, 'secejenish23@gmail.com'], // Send to worker and safety manager
        subject: `🚨 CRITICAL SAFETY ALERT - ${severity.toUpperCase()}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Mine Safety Alert</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .alert-box { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .details { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 5px; }
              .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
              .warning { color: #dc2626; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚠️ MINE SAFETY ALERT ⚠️</h1>
              <p>Immediate Attention Required</p>
            </div>
            
            <div class="content">
              <div class="alert-box">
                <h2 class="warning">HELMET SAFETY VIOLATION DETECTED</h2>
                <p><strong>Alert:</strong> ${alertMessage}</p>
              </div>
              
              <div class="details">
                <h3>Incident Details:</h3>
                <ul>
                  <li><strong>Location:</strong> ${location}</li>
                  <li><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</li>
                  <li><strong>Severity:</strong> ${severity.toUpperCase()}</li>
                  <li><strong>Alert ID:</strong> ${alertId}</li>
                </ul>
              </div>
              
              <div class="alert-box">
                <h3>⚠️ IMMEDIATE ACTION REQUIRED</h3>
                <p>• Worker must stop current activities immediately</p>
                <p>• Proper helmet must be worn before continuing</p>
                <p>• Supervisor must verify compliance</p>
                <p>• Report to safety officer if helmet is damaged or missing</p>
              </div>
              
              <p><strong>Safety Reminder:</strong> Hard hats are mandatory in all mine areas. This is for your protection and is required by safety regulations.</p>
            </div>
            
            <div class="footer">
              <p>Mine Safety Monitoring System - Automated Alert</p>
              <p>For immediate assistance, contact Safety Emergency Line</p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    // Update the alert record to mark email as sent
    const { error: updateError } = await supabase
      .from('safety_alerts')
      .update({ email_sent: true })
      .eq('id', alertId);

    if (updateError) {
      console.error('Error updating alert status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult.id,
      message: 'Safety alert email sent successfully' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-safety-alert function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);