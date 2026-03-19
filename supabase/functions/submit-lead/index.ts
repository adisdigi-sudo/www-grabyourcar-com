import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const name = body.name?.trim();
    const phone = body.phone?.trim()?.replace(/\D/g, '');

    if (!name || name.length < 2) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Valid 10-digit mobile number required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let submittedBy: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabaseClient.auth.getUser();
      submittedBy = user?.id ?? null;
    }

    const serviceCategory = body.serviceCategory?.trim()?.toLowerCase() || '';
    const isInsurance = ['insurance', 'car-insurance', 'motor-insurance', 'vehicle-insurance', 'car_insurance', 'motor_insurance'].includes(serviceCategory) || body.source?.toLowerCase()?.includes('insurance');

    const { data: lead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert({
        customer_name: name,
        phone,
        email: body.email?.trim() || null,
        city: body.city?.trim() || null,
        car_model: body.carInterest?.trim() || null,
        notes: body.message?.trim() || null,
        source: body.source?.trim() || 'website',
        lead_type: body.type || 'enquiry',
        status: 'new',
        priority: 'medium',
        user_id: submittedBy,
        service_category: serviceCategory || null,
      })
      .select()
      .single();

    // Also route insurance leads into insurance_clients CRM
    if (isInsurance) {
      try {
        await supabaseAdmin.from('insurance_clients').insert({
          phone,
          customer_name: name,
          email: body.email?.trim() || null,
          city: body.city?.trim() || null,
          vehicle_number: body.vehicleNumber?.trim() || null,
          vehicle_make: body.vehicleMake?.trim() || null,
          vehicle_model: body.carInterest?.trim() || null,
          lead_source: 'Website',
          pipeline_stage: 'new_lead',
          lead_status: 'new',
          priority: 'medium',
          notes: body.message?.trim() || null,
        });
      } catch (e) {
        console.error('Insurance client insert failed:', e);
      }
    }

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead saved:', lead.id);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (SUPABASE_URL && SERVICE_ROLE_KEY) {
      fetch(`${SUPABASE_URL}/functions/v1/wa-automation-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          event: 'lead_created',
          leadId: lead.id,
          phone,
          name,
          data: {
            car_model: body.carInterest?.trim() || '',
            city: body.city?.trim() || '',
            source: body.source?.trim() || 'website',
          },
        }),
      }).catch(err => console.error('WA trigger error:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Request submitted. Our expert will call you within 30 minutes.",
        leadId: lead.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});