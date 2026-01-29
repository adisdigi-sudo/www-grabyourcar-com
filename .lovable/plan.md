

## Car Data API Integration Plan

### Current Situation

Your Grabyourcar project currently uses **hardcoded static data** stored in TypeScript files (`src/data/cars/`) for 10 car brands (Maruti, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen) with 75+ models. This data includes:
- Car specifications (engine, dimensions, performance)
- Images (mix of local assets and external URLs)
- Prices, variants, colors
- Features and offers

### Challenge

There is **no single comprehensive API for Indian car data** that covers all your needs (specifications, images, upcoming cars, colors, real-time prices). The available options have trade-offs:

| API/Service | Coverage | Pros | Cons |
|------------|----------|------|------|
| **CarAPI.app** | US/Global | Easy to use, good specs | Not India-specific, no Indian pricing |
| **CarsXE** | Global VIN-based | Detailed specs | VIN-based, no Indian models |
| **CarQuery API** | Global | Free tier available | Outdated, limited Indian data |
| **Auto-Data.net** | Global | Images + specs | Expensive, subscription-based |
| **Web Scraping (CardDekho/CarWale)** | India-specific | Complete Indian data | Legal/TOS issues, maintenance heavy |
| **Firecrawl (via connector)** | Any website | Can scrape car portals | Requires building extraction logic |

### Recommended Approach: Hybrid Solution

Since no single API perfectly fits Indian car marketplace needs, I recommend a **hybrid approach**:

1. **Use Firecrawl** (available as a connector) to periodically scrape car data from Indian sources
2. **Store data in your database** for fast access
3. **Use AI to enrich/validate** data using Lovable AI
4. **Keep manual data as fallback** for reliability

---

### Implementation Plan

#### Phase 1: Database Setup for Dynamic Car Data

Create database tables to store car data that can be updated automatically:

**Tables to create:**
- `cars` - Main car information (name, brand, slug, overview, prices)
- `car_specifications` - Engine, dimensions, performance specs
- `car_variants` - Variant-wise pricing and features
- `car_colors` - Available colors with hex codes
- `car_images` - Gallery images
- `car_offers` - Current offers and discounts

This allows:
- Data updates without code deployments
- Easy addition of new cars
- Historical price tracking
- Upcoming cars with launch dates

#### Phase 2: Firecrawl Integration for Data Collection

Connect Firecrawl to scrape car data from public sources:

**Edge function: `scrape-car-data`**
- Scrapes car specifications from car information websites
- Extracts images, prices, features
- Parses data into structured format
- Updates database with new/changed data

**Edge function: `sync-upcoming-cars`**
- Monitors for new car launches
- Updates upcoming cars section automatically

#### Phase 3: AI-Powered Data Enhancement

Use Lovable AI to:
- **Generate missing data** - Fill gaps in specifications
- **Normalize data** - Standardize formats across sources
- **Validate data** - Check for inconsistencies
- **Generate descriptions** - Create compelling car overviews
- **Match images** - Find appropriate images for cars

**Edge function: `enhance-car-data`**
- Takes raw scraped data
- Uses AI to clean and enhance
- Returns production-ready car data

#### Phase 4: Admin Dashboard for Data Management

Create an admin interface to:
- View/edit car data manually
- Trigger data sync operations
- Review AI-generated content before publishing
- Monitor data freshness
- Add new cars manually when needed

---

### Alternative: Third-Party API Integration

If you prefer a direct API approach (simpler but less comprehensive):

**Option A: CarAPI.app + Manual India Data**
- Use CarAPI for base specifications (global data)
- Manually maintain Indian pricing and availability
- Cost: ~$50-100/month for production tier

**Option B: Auto-Data.net API**
- Comprehensive specifications and images
- Better global coverage
- Cost: ~$200-500/month depending on usage

These would require:
1. Adding API key as a secret
2. Creating edge functions to fetch data
3. Mapping API data to your existing format
4. Fallback to static data for India-specific info

---

### Technical Details

#### New Files to Create

```text
supabase/
  functions/
    scrape-car-data/index.ts      - Firecrawl integration
    enhance-car-data/index.ts     - AI data enhancement
    sync-car-database/index.ts    - Database sync logic

src/
  pages/
    Admin.tsx                     - Admin dashboard
    AdminCars.tsx                 - Car data management
  hooks/
    useCars.ts                    - Database-backed car data hook
  lib/
    carDataService.ts             - Car data fetching/caching
```

#### Database Schema (simplified)

```sql
-- Main cars table
CREATE TABLE cars (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  body_type TEXT,
  price_range TEXT,
  price_numeric INTEGER,
  overview TEXT,
  is_upcoming BOOLEAN DEFAULT false,
  launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Specifications
CREATE TABLE car_specifications (
  id UUID PRIMARY KEY,
  car_id UUID REFERENCES cars(id),
  category TEXT, -- 'engine', 'dimensions', 'performance', 'features', 'safety'
  label TEXT,
  value TEXT
);

-- Images
CREATE TABLE car_images (
  id UUID PRIMARY KEY,
  car_id UUID REFERENCES cars(id),
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  alt_text TEXT
);
```

#### Data Flow

```text
[Firecrawl Scraper] --> [AI Enhancement] --> [Database] --> [Frontend]
        |                      |                  ^
        v                      v                  |
   [Raw HTML]           [Clean JSON]      [Manual Admin Updates]
```

---

### Recommended Next Steps

1. **Start with Firecrawl** - Connect the Firecrawl connector to enable web scraping
2. **Create database tables** - Set up the schema for dynamic car data
3. **Build sync edge function** - Create the scraping and parsing logic
4. **Add AI enhancement** - Use Lovable AI to clean and enrich data
5. **Create admin interface** - Build UI for data management
6. **Migrate existing data** - Move static data to database
7. **Update frontend** - Fetch from database instead of static files

This approach gives you:
- Automatic data updates
- Flexibility to add any car
- Indian market-specific data
- AI-powered data quality
- Manual override capability

