import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

// Fetch real news from GNews API (Google News data)
async function fetchWithGNews(category: string, apiKey: string) {
  const categoryQuery = category === "all" 
    ? "car OR automobile OR automotive India"
    : category === "Launch" ? "new car launch India 2025"
    : category === "Review" ? "car review test drive India"
    : category === "Industry" ? "automotive industry news India"
    : category === "EV" ? "electric vehicle EV India"
    : category === "Tips" ? "car buying tips maintenance"
    : category === "Comparison" ? "car comparison versus"
    : "automotive news India";

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(categoryQuery)}&lang=en&country=in&max=10&apikey=${apiKey}`;
  
  console.log("Fetching from GNews API...");
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("GNews API error:", response.status, errorText);
    throw new Error(`GNews API error: ${response.status}`);
  }

  const data: GNewsResponse = await response.json();
  
  if (!data.articles || data.articles.length === 0) {
    throw new Error("No articles found from GNews");
  }

  console.log(`GNews returned ${data.articles.length} articles`);

  const articles = data.articles.map((article, index) => {
    const content = (article.title + " " + article.description).toLowerCase();
    let articleCategory = "Industry";
    if (content.includes("launch") || content.includes("unveil") || content.includes("debut")) {
      articleCategory = "Launch";
    } else if (content.includes("review") || content.includes("test drive") || content.includes("driven")) {
      articleCategory = "Review";
    } else if (content.includes("electric") || content.includes("ev") || content.includes("battery")) {
      articleCategory = "EV";
    } else if (content.includes("vs") || content.includes("versus") || content.includes("comparison")) {
      articleCategory = "Comparison";
    } else if (content.includes("tips") || content.includes("how to") || content.includes("guide")) {
      articleCategory = "Tips";
    }

    const wordCount = article.content ? article.content.split(" ").length : 150;
    const readTime = Math.max(2, Math.ceil(wordCount / 200));

    return {
      id: `gnews-${Date.now()}-${index}`,
      title: article.title,
      excerpt: article.description || article.content?.substring(0, 200) + "...",
      category: articleCategory,
      source: article.source.name,
      sourceUrl: article.url,
      author: "Staff Reporter",
      readTime: `${readTime} min read`,
      publishedAt: article.publishedAt,
      imageUrl: article.image,
      imageDescription: `News image for: ${article.title}`,
      featured: index < 2,
      tags: [articleCategory, "India", "Automotive"],
    };
  });

  return {
    articles,
    source: "gnews",
    citations: articles.map(a => a.sourceUrl),
  };
}

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
    source: "perplexity",
    articles: null as unknown[] | null,
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
    citations: [] as string[],
    source: "lovable-ai",
    articles: null as unknown[] | null,
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

    const GNEWS_API_KEY = Deno.env.get("GNEWS_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let result: { articles: unknown[] | null; source: string; citations: string[]; content?: string } | null = null;
    let articles: unknown[] | null = null;
    
    // Priority: GNews (real news) > Perplexity (AI search) > Lovable AI (fallback)
    if (GNEWS_API_KEY && !GNEWS_API_KEY.includes("your_api_key")) {
      try {
        console.log("Using GNews API for real-time news");
        result = await fetchWithGNews(category, GNEWS_API_KEY);
        articles = result.articles;
      } catch (gnewsError) {
        console.error("GNews failed, trying Perplexity:", gnewsError);
        result = null;
      }
    }
    
    // Fallback to Perplexity if GNews failed or not configured
    if (!result && PERPLEXITY_API_KEY && !PERPLEXITY_API_KEY.includes("your_api_key")) {
      try {
        console.log("Using Perplexity API for real-time news search");
        result = await fetchWithPerplexity(category, currentDate, PERPLEXITY_API_KEY);
      } catch (perplexityError) {
        console.error("Perplexity failed:", perplexityError);
        result = null;
      }
    }
    
    // Final fallback to Lovable AI
    if (!result && LOVABLE_API_KEY) {
      console.log("Using Lovable AI Gateway as fallback");
      result = await fetchWithLovableAI(category, currentDate, LOVABLE_API_KEY);
    }
    
    if (!result) {
      throw new Error("No API keys configured for news fetching");
    }

    const { content, citations, source } = result;

    // Parse AI-generated content if articles weren't directly fetched
    if (!articles && content) {
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content.trim();
        articles = JSON.parse(jsonStr);
        
        if (!Array.isArray(articles)) {
          throw new Error("Response is not an array");
        }
        
        articles = (articles as Record<string, unknown>[]).map((article, index) => ({
          ...article,
          id: `news-${Date.now()}-${index}`,
          sourceUrl: citations[index] || null,
        }));
        
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Content:", content?.substring(0, 500));
        throw new Error("Failed to parse API response as JSON");
      }
    }
    
    if (!articles || articles.length === 0) {
      throw new Error("No articles found");
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