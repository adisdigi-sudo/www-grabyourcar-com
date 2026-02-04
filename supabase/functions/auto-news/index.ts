import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithPerplexity(category: string, currentDate: string, apiKey: string) {
  const categoryQuery = category === "all" 
    ? "latest car launches, automotive reviews, industry news, and EV updates"
    : category === "Launch" ? "new car launches and unveilings"
    : category === "Review" ? "car reviews and test drives"
    : category === "Industry" ? "automotive industry business news"
    : category === "EV" ? "electric vehicle news and updates"
    : category === "Tips" ? "car buying tips and maintenance advice"
    : category === "Comparison" ? "car comparisons and versus reviews"
    : "latest automotive news";

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: `You are an automotive news aggregator for the Indian car market. Search for and return the latest real news articles. Today's date is ${currentDate}. Return ONLY a valid JSON array with no markdown formatting or code blocks - just the raw JSON array.`
        },
        {
          role: "user",
          content: `Search for the 9 most recent and relevant ${categoryQuery} for the Indian automotive market from the past week. For each article, provide: title (the actual headline), excerpt (2-3 sentence summary), category (one of: "Launch", "Review", "Industry", "EV", "Tips", "Comparison"), source (news outlet name), author (journalist name if available, otherwise "Staff Reporter"), readTime (estimated reading time like "5 min read"), publishedAt (actual or estimated ISO date within last 7 days), imageDescription (describe the main car or scene), featured (true for the 2 most important stories), tags (2-3 relevant tags). Return as JSON array.`
        }
      ],
      temperature: 0.3,
      search_recency_filter: "week",
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content,
    citations: data.citations || [],
    source: "perplexity"
  };
}

async function fetchWithLovableAI(category: string, currentDate: string, apiKey: string) {
  const categoryPrompt = category === "all" 
    ? "Mix of launches, reviews, industry news, and EV updates"
    : `Focus on ${category} news`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an automotive journalist covering the Indian car market. Return ONLY valid JSON array with no markdown formatting, no code blocks, just the raw JSON array. Today's date is ${currentDate}.`
        },
        {
          role: "user",
          content: `Generate 9 realistic automotive news articles relevant to the Indian market. ${categoryPrompt}. Return a JSON array with objects containing: title (engaging headline string), excerpt (2-3 sentence summary string), category (one of: "Launch", "Review", "Industry", "EV", "Tips", "Comparison"), source (realistic news outlet name), author (realistic Indian journalist name string), readTime (string like "5 min read"), publishedAt (ISO date string within last 7 days), imageDescription (string describing relevant car/scene), featured (boolean, true for 1-2 most important articles), tags (array of 2-3 relevant tag strings).`
        }
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content,
    citations: [],
    source: "lovable-ai"
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { category = "all" } = await req.json().catch(() => ({}));
    
    console.log(`Fetching auto news for category: ${category}`);

    const currentDate = new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let result;
    
    // Try Perplexity first for real-time search, fallback to Lovable AI
    if (PERPLEXITY_API_KEY && !PERPLEXITY_API_KEY.includes("your_api_key")) {
      try {
        console.log("Using Perplexity API for real-time news search");
        result = await fetchWithPerplexity(category, currentDate, PERPLEXITY_API_KEY);
      } catch (perplexityError) {
        console.error("Perplexity failed, falling back to Lovable AI:", perplexityError);
        if (!LOVABLE_API_KEY) {
          throw new Error("No API keys configured");
        }
        result = await fetchWithLovableAI(category, currentDate, LOVABLE_API_KEY);
      }
    } else if (LOVABLE_API_KEY) {
      console.log("Using Lovable AI Gateway (Perplexity not configured)");
      result = await fetchWithLovableAI(category, currentDate, LOVABLE_API_KEY);
    } else {
      throw new Error("No API keys configured for news fetching");
    }

    const { content, citations, source } = result;

    if (!content) {
      throw new Error("No content in API response");
    }

    // Parse the JSON from the response
    let articles;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content.trim();
      articles = JSON.parse(jsonStr);
      
      if (!Array.isArray(articles)) {
        throw new Error("Response is not an array");
      }
      
      // Add IDs and citation URLs
      articles = articles.map((article: Record<string, unknown>, index: number) => ({
        ...article,
        id: `news-${Date.now()}-${index}`,
        sourceUrl: citations[index] || null,
      }));
      
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content.substring(0, 500));
      throw new Error("Failed to parse API response as JSON");
    }

    console.log(`Successfully fetched ${articles.length} articles from ${source}`);

    return new Response(
      JSON.stringify({ 
        articles, 
        generatedAt: new Date().toISOString(),
        citations,
        source
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in auto-news function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        articles: [] 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
