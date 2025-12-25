import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "https://ynoiwioypxpurwdbjvyt.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || "") 
    ? origin 
    : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin || ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Simple in-memory rate limiting (per user, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Generate a simple request ID for logging
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

function validateEmail(email: string | undefined): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: true }; // Optional field for regular leads
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { valid: true }; // Empty is valid for optional
  }
  if (trimmed.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  return { valid: true };
}

function validateMessage(message: string | undefined): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { valid: true }; // Optional field
  }
  const trimmed = message.trim();
  if (trimmed.length > 500) {
    return { valid: false, error: "Message must be less than 500 characters" };
  }
  return { valid: true };
}

function validateType(type: string | undefined): { valid: boolean; error?: string } {
  if (!type || typeof type !== 'string') {
    return { valid: true }; // Optional field, defaults to regular
  }
  const validTypes = ['regular', 'corporate'];
  if (!validTypes.includes(type)) {
    return { valid: false, error: "Invalid lead type" };
  }
  return { valid: true };
}

// Sanitize input by trimming and escaping special characters
function sanitize(input: string | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();

  try {
    // Verify authentication - get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("Missing authorization header", { requestId });
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.log("Authentication failed", { requestId, error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Invalid or expired authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user for lead submission", { requestId, userId: user.id });

    // Check rate limit per user
    if (!checkRateLimit(user.id)) {
      console.log(`Rate limit exceeded for user`, { requestId, userId: user.id });
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log("Lead submission request received", { requestId });

    // Validate all fields
    const nameValidation = validateName(body.name);
    if (!nameValidation.valid) {
      console.log("Validation failed: name", { requestId });
      return new Response(
        JSON.stringify({ error: nameValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneValidation = validatePhone(body.phone);
    if (!phoneValidation.valid) {
      console.log("Validation failed: phone", { requestId });
      return new Response(
        JSON.stringify({ error: phoneValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cityValidation = validateCity(body.city);
    if (!cityValidation.valid) {
      console.log("Validation failed: city", { requestId });
      return new Response(
        JSON.stringify({ error: cityValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const carInterestValidation = validateCarInterest(body.carInterest);
    if (!carInterestValidation.valid) {
      console.log("Validation failed: carInterest", { requestId });
      return new Response(
        JSON.stringify({ error: carInterestValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      console.log("Validation failed: email", { requestId });
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageValidation = validateMessage(body.message);
    if (!messageValidation.valid) {
      console.log("Validation failed: message", { requestId });
      return new Response(
        JSON.stringify({ error: messageValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typeValidation = validateType(body.type);
    if (!typeValidation.valid) {
      console.log("Validation failed: type", { requestId });
      return new Response(
        JSON.stringify({ error: typeValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      name: sanitize(body.name),
      phone: sanitize(body.phone).replace(/\D/g, ''),
      city: sanitize(body.city) || null,
      carInterest: sanitize(body.carInterest) || null,
      email: sanitize(body.email) || null,
      message: sanitize(body.message) || null,
      type: body.type || 'regular',
      userId: user.id,
    };

    // Log only non-PII data for debugging
    console.log("Lead submission validated successfully", { 
      requestId,
      timestamp: new Date().toISOString(),
      type: sanitizedData.type,
      userId: user.id,
    });

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead submitted successfully. Our car expert will call you within 30 minutes." 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error processing lead submission", { requestId, error: errorMessage });
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
