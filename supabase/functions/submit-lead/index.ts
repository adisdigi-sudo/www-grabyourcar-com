import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEAD_VERTICALS = [
  { keyword: "car insurance", tag: "Insurance" },
  { keyword: "motor insurance", tag: "Insurance" },
  { keyword: "insurance renewal", tag: "Insurance" },
  { keyword: "car-insurance", tag: "Insurance" },
  { keyword: "insurance", tag: "Insurance" },
  { keyword: "car loan", tag: "Loan" },
  { keyword: "loan", tag: "Loan" },
  { keyword: "self drive", tag: "Self Drive" },
  { keyword: "rental", tag: "Self Drive" },
  { keyword: "hsrp", tag: "HSRP" },
  { keyword: "accessories", tag: "Accessories" },
  { keyword: "new car", tag: "Car Sales" },
  { keyword: "car", tag: "Car Sales" },
];

const cleanPhone = (value: string) => value.replace(/\D/g, '').replace(/^91/, '');

const getPhoneCandidates = (value: string) => {
  const cleaned = cleanPhone(value);
  if (!cleaned) return [];

  return Array.from(new Set([cleaned, `91${cleaned}`, `0${cleaned}']));
};

function classifyVertical(input: string) {
  const normalized = input.toLowerCase();
  for (const item of LEAD_VERTICALS) {
    if (normalized.includes(item.keyword)) return item.tag;
  }
  return 'General Enquiry';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const name = body.name?.trim();
    const phone = cleanPhone(body.phone?.trim() || '');

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

    const serviceCategory = body.serviceCategory?.trim()?.toLowerCase() || body.service_category?.trim()?.toLowerCase() || '';
    const verticalInput = [
      body.vertical,
      body.type,
      body.source,
      serviceCategory,
      body.message,
      body.carInterest,
      body.body?.vertical,
      body.body?.type,
      body.body?.source,
      body.body?.serviceCategory,
      body.body?.service_category,
      body.body?.message,
    ].filter(Boolean).join(' ');
    const verticalTag = classifyVertical(verticalInput);
    const isInsurance = verticalTag === 'Insurance';
    const phoneCandidates = getPhoneCandidates(phone);
    const safeName = name || `${verticalTag} Lead`;
    const safeEmail = body.email?.trim() || null;
    const safeCity = body.city?.trim() || null;
    const safeMessage = body.message?.trim() || null;
    const safeCarModel = body.carInterest?.trim() || body.vehicleModel?.trim() || null;
    const safeCarBrand = body.vehicleMake?.trim() || body.carBrand?.trim() || null;

    const { data: lead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert({
        customer_name: name,
        phone,
        email: safeEmail,
        city: safeCity,
        car_model: safeCarModel,
        notes: safeMessage,
        source: body.source?.trim() || 'website',
        lead_type: body.type || 'enquiry',
        status: 'new',
        priority: 'medium',
        user_id: submittedBy,
        service_category: serviceCategory || null,
      })
      .select()
      .single();

    if (verticalTag === 'Car Sales') {
      const { data: existingSales } = await supabaseAdmin
        .from('sales_pipeline')
        .select('id, pipeline_stage')
        .in('phone', phoneCandidates)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSales && existingSales.length > 0) {
        const updates: Record<string, string | null | number> = {
          customer_name: safeName,
          email: safeEmail,
          city: safeCity,
          source: body.source?.trim() || 'website',
          inquiry_remarks: safeMessage,
          car_brand: safeCarBrand,
          car_model: safeCarModel,
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        };

        if (['lost', 'after_sales'].includes(existingSales[0].pipeline_stage || '')) {
          updates.pipeline_stage = 'new_lead';
          updates.call_attempts = 0;
          updates.call_status = null;
          updates.lost_reason = null;
          updates.lost_remarks = null;
        }

        await supabaseAdmin.from('sales_pipeline').update(updates).eq('id', existingSales[0].id);
      } else {
        await supabaseAdmin.from('sales_pipeline').insert({
          customer_name: safeName,
          phone,
          email: safeEmail,
          city: safeCity,
          source: body.source?.trim() || 'website',
          inquiry_remarks: safeMessage,
          pipeline_stage: 'new_lead',
          car_brand: safeCarBrand,
          car_model: safeCarModel,
        });
      }
    }

    if (verticalTag === 'Loan') {
      const { data: existingLoan } = await supabaseAdmin
        .from('car_loan_leads')
        .select('id')
        .in('phone', phoneCandidates)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingLoan && existingLoan.length > 0) {
        await supabaseAdmin.from('car_loan_leads').update({
          name: safeName,
          city: safeCity,
          source: body.source?.trim() || 'website',
          notes: safeMessage,
          preferred_car: safeCarModel,
          status: 'new',
          updated_at: new Date().toISOString(),
          utm_source: body.lead_source_type || body.source?.trim() || 'Website',
        }).eq('id', existingLoan[0].id);
      } else {
        await supabaseAdmin.from('car_loan_leads').insert({
          name: safeName,
          phone,
          city: safeCity,
          source: body.source?.trim() || 'website',
          notes: safeMessage,
          preferred_car: safeCarModel,
          status: 'new',
          utm_source: body.lead_source_type || body.source?.trim() || 'Website',
        });
      }
    }

    // Also route insurance leads into insurance_clients CRM
    if (isInsurance) {
      try {
        // Upsert: check if already exists by phone
        const { data: existingClient } = await supabaseAdmin
          .from('insurance_clients')
          .select('id')
          .in('phone', phoneCandidates)
          .limit(1);

        if (existingClient && existingClient.length > 0) {
          await supabaseAdmin.from('insurance_clients').update({
            customer_name: name,
            email: safeEmail || undefined,
            city: safeCity || undefined,
            vehicle_number: body.vehicleNumber?.trim() || undefined,
            vehicle_make: safeCarBrand || undefined,
            vehicle_model: safeCarModel || undefined,
            notes: safeMessage || undefined,
          }).eq('id', existingClient[0].id);
        } else {
          await supabaseAdmin.from('insurance_clients').insert({
            phone,
            customer_name: name,
            email: safeEmail,
            city: safeCity,
            vehicle_number: body.vehicleNumber?.trim() || null,
            vehicle_make: safeCarBrand,
            vehicle_model: safeCarModel,
            lead_source: 'Website',
            pipeline_stage: 'new_lead',
            lead_status: 'new',
            priority: 'medium',
            notes: safeMessage,
          });
        }
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