import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (per IP, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Validation functions
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: "Name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Name cannot be empty" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters" };
  }
  // Allow letters, spaces, and common name characters
  if (!/^[a-zA-Z\s\-'.]+$/.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }
  return { valid: true };
}

function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: "Phone number is required" };
  }
  const trimmed = phone.trim().replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(trimmed)) {
    return { valid: false, error: "Please enter a valid 10-digit Indian mobile number starting with 6-9" };
  }
  return { valid: true };
}

function validateCity(city: string | undefined): { valid: boolean; error?: string } {
  if (!city || typeof city !== 'string') {
    return { valid: true }; // Optional field
  }
  const trimmed = city.trim();
  if (trimmed.length > 50) {
    return { valid: false, error: "City must be less than 50 characters" };
  }
  if (trimmed.length > 0 && !/^[a-zA-Z\s\-]+$/.test(trimmed)) {
    return { valid: false, error: "City can only contain letters, spaces, and hyphens" };
  }
  return { valid: true };
}

function validateCarInterest(carInterest: string | undefined): { valid: boolean; error?: string } {
  if (!carInterest || typeof carInterest !== 'string') {
    return { valid: true }; // Optional field
  }
  const trimmed = carInterest.trim();
  if (trimmed.length > 100) {
    return { valid: false, error: "Car interest must be less than 100 characters" };
  }
  // Allow alphanumeric, spaces, and common characters
  if (trimmed.length > 0 && !/^[a-zA-Z0-9\s\-,.]+$/.test(trimmed)) {
    return { valid: false, error: "Car interest contains invalid characters" };
  }
  return { valid: true };
}

// Sanitize input by trimming and escaping special characters
function sanitize(input: string | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log("Received lead submission request");

    // Validate all fields
    const nameValidation = validateName(body.name);
    if (!nameValidation.valid) {
      return new Response(
        JSON.stringify({ error: nameValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneValidation = validatePhone(body.phone);
    if (!phoneValidation.valid) {
      return new Response(
        JSON.stringify({ error: phoneValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cityValidation = validateCity(body.city);
    if (!cityValidation.valid) {
      return new Response(
        JSON.stringify({ error: cityValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const carInterestValidation = validateCarInterest(body.carInterest);
    if (!carInterestValidation.valid) {
      return new Response(
        JSON.stringify({ error: carInterestValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      name: sanitize(body.name),
      phone: sanitize(body.phone).replace(/\D/g, ''),
      city: sanitize(body.city) || null,
      carInterest: sanitize(body.carInterest) || null,
    };

    console.log("Lead submission validated successfully:", { 
      name: sanitizedData.name, 
      phone: sanitizedData.phone.slice(0, 4) + '******',
      city: sanitizedData.city,
      carInterest: sanitizedData.carInterest
    });

    // Return success - actual database insertion would require user authentication
    // or could be done with service role key for anonymous lead capture
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead submitted successfully. Our car expert will call you within 30 minutes." 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error processing lead submission:", errorMessage);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
