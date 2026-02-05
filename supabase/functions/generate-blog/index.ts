 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface BlogRequest {
   topic: string;
   category: "review" | "guide" | "news" | "tips" | "comparison" | "launch";
   carModel?: string;
   saveToDraft?: boolean;
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const { topic, category, carModel, saveToDraft }: BlogRequest = await req.json();
 
     if (!topic) {
       throw new Error("Topic is required");
     }
 
     console.log(`Generating blog for topic: ${topic}, category: ${category}`);
 
     const currentDate = new Date().toLocaleDateString('en-IN', { 
       year: 'numeric', 
       month: 'long', 
       day: 'numeric' 
     });
 
     const categoryPrompts: Record<string, string> = {
       review: "Write a detailed car review with sections for Design, Interior, Performance, Features, and Verdict. Include pros and cons.",
       guide: "Write a comprehensive buying guide with actionable tips, comparisons, and recommendations for Indian buyers.",
       news: "Write an informative news article about the latest automotive development in India. Keep it factual and engaging.",
       tips: "Write practical tips and advice for car buyers or owners in India. Include specific examples and actionable suggestions.",
       comparison: "Write a detailed comparison article highlighting the differences, similarities, and which car is better for different use cases.",
       launch: "Write about a new car launch in India with pricing, features, variants, and how it compares to competition."
     };
 
     const systemPrompt = `You are an expert automotive journalist for GrabYourCar, India's trusted car buying platform. Write engaging, SEO-optimized content for the Indian audience. Today's date is ${currentDate}.
 
 CRITICAL REQUIREMENTS:
 - Focus ONLY on the Indian automotive market
 - Use Indian Rupee (₹) for all prices
 - Reference Indian cities, roads, and driving conditions
 - Include relevant Indian regulations (RTO, insurance, etc.)
 - Write in a professional yet conversational tone
 - Use markdown formatting with proper headings, lists, and tables
 - Include specific data points, specifications, and comparisons
 - NO global or irrelevant filler content`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: systemPrompt },
           { 
             role: "user", 
             content: `${categoryPrompts[category] || categoryPrompts.guide}
 
 Topic: ${topic}
 ${carModel ? `Car Model: ${carModel}` : ''}
 
 Return a JSON object with:
 - title (string, engaging SEO-friendly headline)
 - excerpt (string, 2-3 sentence summary for preview)
 - content (string, full article in markdown, 1000-2000 words)
 - tags (array of 4-6 relevant tags)
 - seo_title (string, optimized title under 60 chars)
 - seo_description (string, meta description under 160 chars)
 - read_time (string, estimated reading time)
 - cover_image_description (string, describe ideal cover image)
 
 Return ONLY valid JSON with no markdown formatting or code blocks.`
           }
         ],
         temperature: 0.7,
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
           status: 429,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
           status: 402,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error(`AI gateway error: ${response.status}`);
     }
 
     const data = await response.json();
     const content = data.choices?.[0]?.message?.content;
 
     if (!content) {
       throw new Error("No content in AI response");
     }
 
     // Parse the JSON from the response
     let blogPost;
     try {
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       const jsonStr = jsonMatch ? jsonMatch[0] : content.trim();
       blogPost = JSON.parse(jsonStr);
     } catch (parseError) {
       console.error("JSON parse error:", parseError, "Content:", content.substring(0, 500));
       throw new Error("Failed to parse AI response as JSON");
     }
 
     // Generate slug from title
     const slug = blogPost.title
       .toLowerCase()
       .replace(/[^a-z0-9\s-]/g, '')
       .replace(/\s+/g, '-')
       .replace(/-+/g, '-')
       .substring(0, 80);
 
     const result = {
       ...blogPost,
       slug,
       category,
       author: "GrabYourCar Expert",
       is_ai_generated: true,
       ai_model: "google/gemini-3-flash-preview",
       status: "draft",
       generated_at: new Date().toISOString(),
     };
 
     // Optionally save to database as draft
     if (saveToDraft) {
       const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
       const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
       
       if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
         const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
         
         const { error: insertError } = await supabase
           .from('ai_blog_posts')
           .insert({
             title: result.title,
             slug: result.slug,
             excerpt: result.excerpt,
             content: result.content,
             category: result.category,
             tags: result.tags,
             author: result.author,
             cover_image_description: result.cover_image_description,
             seo_title: result.seo_title,
             seo_description: result.seo_description,
             read_time: result.read_time,
             is_ai_generated: true,
             ai_model: result.ai_model,
             status: 'draft',
           });
         
         if (insertError) {
           console.error("Failed to save blog post:", insertError);
         } else {
           console.log("Blog post saved as draft");
         }
       }
     }
 
     console.log(`Successfully generated blog: ${result.title}`);
 
     return new Response(JSON.stringify(result), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Error generating blog:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });