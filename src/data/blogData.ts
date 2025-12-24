export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: "review" | "guide" | "news" | "tips";
  image: string;
  author: string;
  date: string;
  readTime: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: "hyundai-creta-2024-review",
    title: "Hyundai Creta 2024 Review: Still the King of Compact SUVs?",
    excerpt: "We test the updated Hyundai Creta to see if it still deserves its best-seller crown. Full review with pros, cons, and verdict.",
    content: `
## Introduction

The Hyundai Creta has been India's best-selling SUV for years, and the 2024 update brings subtle refinements to keep it ahead of the competition. We spent a week with the top-spec SX(O) variant to bring you this comprehensive review.

## Design & Exterior

The 2024 Creta features a refreshed front fascia with new LED DRLs that give it a more premium look. The parametric jewel grille remains a standout feature, while the new alloy wheel designs add to the sporty appeal.

### Key Exterior Features:
- New LED headlamps with integrated DRLs
- Updated parametric jewel grille
- New 17-inch diamond-cut alloy wheels
- Shark fin antenna
- LED tail lamps with signature light bar

## Interior & Comfort

Step inside, and you're greeted by a dual-tone black and beige cabin that feels premium. The materials quality is excellent, with soft-touch surfaces on the dashboard and door pads.

### Cabin Highlights:
- 10.25-inch touchscreen infotainment
- Digital instrument cluster
- Ventilated front seats
- Panoramic sunroof
- Bose 8-speaker audio system

## Performance

The 1.5L petrol engine produces 115 PS and 144 Nm of torque. While not the most powerful in the segment, it offers smooth and refined performance for daily driving.

### Engine Options:
- 1.5L Petrol (115 PS) - Manual/CVT
- 1.5L Diesel (116 PS) - Manual/AT
- 1.5L Turbo Petrol (160 PS) - DCT

## Verdict

The Hyundai Creta 2024 continues to be a solid choice for those seeking a well-rounded compact SUV. While the competition has intensified, the Creta's combination of features, comfort, and brand trust makes it a safe bet.

**Rating: 4.5/5**

**Should you buy it?** Yes, if you want a feature-rich, comfortable SUV with excellent after-sales support.
    `,
    category: "review",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop",
    author: "Rahul Sharma",
    date: "December 20, 2024",
    readTime: "8 min read",
    tags: ["Hyundai", "Creta", "SUV", "Review"],
  },
  {
    id: 2,
    slug: "first-car-buying-guide-2024",
    title: "Complete First Car Buying Guide for 2024: Everything You Need to Know",
    excerpt: "Buying your first car? This comprehensive guide covers budgeting, financing, insurance, and the best cars for first-time buyers in India.",
    content: `
## Introduction

Buying your first car is an exciting milestone, but it can also be overwhelming with so many options and decisions to make. This guide will walk you through everything you need to know to make an informed purchase.

## Step 1: Set Your Budget

Before you start browsing cars, determine how much you can afford. Consider:

- **Down payment**: Aim for at least 20% of the car's price
- **EMI**: Should not exceed 15-20% of your monthly income
- **Running costs**: Fuel, insurance, maintenance, parking

### Budget Breakdown Example:
| Monthly Income | Max EMI | Suitable Car Price |
|----------------|---------|-------------------|
| ₹50,000 | ₹10,000 | ₹5-7 Lakh |
| ₹75,000 | ₹15,000 | ₹8-10 Lakh |
| ₹1,00,000 | ₹20,000 | ₹12-15 Lakh |

## Step 2: Choose the Right Type

Different car types suit different needs:

- **Hatchback**: Best for city driving, easy parking, fuel-efficient
- **Sedan**: Comfortable, good highway stability, premium feel
- **SUV**: High ground clearance, spacious, commanding view
- **Compact SUV**: Balance of SUV benefits with hatchback economy

## Step 3: Petrol vs Diesel vs EV

### Petrol
- Lower purchase price
- Best for city driving (<15,000 km/year)
- Lower maintenance costs

### Diesel
- Better fuel economy
- Ideal for highway driving (>20,000 km/year)
- Higher purchase price but lower running costs

### Electric
- Zero fuel costs
- Government incentives available
- Limited charging infrastructure (improving rapidly)

## Step 4: New vs Used

### New Car Pros:
- Full warranty
- Latest features and safety
- No hidden issues

### Used Car Pros:
- Lower price (30-50% less)
- Lower depreciation
- More car for your budget

## Top 5 First Cars Under ₹10 Lakh

1. **Maruti Swift** - Best for city driving
2. **Tata Altroz** - Safest in segment
3. **Hyundai i20** - Feature-rich
4. **Tata Punch** - Micro SUV versatility
5. **Maruti Baleno** - Premium hatchback

## Final Checklist

- [ ] Test drive at least 3 cars
- [ ] Compare insurance quotes
- [ ] Negotiate the price
- [ ] Check for ongoing offers
- [ ] Verify all documents
- [ ] Inspect the car before delivery

Happy car hunting!
    `,
    category: "guide",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=500&fit=crop",
    author: "Priya Patel",
    date: "December 18, 2024",
    readTime: "12 min read",
    tags: ["Buying Guide", "First Car", "Tips", "Budget"],
  },
  {
    id: 3,
    slug: "tata-nexon-vs-hyundai-venue-comparison",
    title: "Tata Nexon vs Hyundai Venue: Which Compact SUV Should You Buy?",
    excerpt: "A detailed comparison of two popular compact SUVs to help you decide which one suits your needs better.",
    content: `
## Introduction

The Tata Nexon and Hyundai Venue are two of the most popular compact SUVs in India. Both offer compelling packages but cater to slightly different buyer preferences. Let's compare them head-to-head.

## Design Comparison

### Tata Nexon
- Bold, muscular design
- Signature humanity line
- Available in dual-tone options
- More SUV-like stance

### Hyundai Venue
- Urban, stylish design
- Connected LED DRLs
- Compact proportions
- Modern and sleek

**Winner: Tie** - It comes down to personal preference

## Interior & Features

### Nexon Highlights:
- 10.25-inch touchscreen
- Ventilated seats (top variant)
- Air purifier
- 8-speaker JBL audio

### Venue Highlights:
- 8-inch touchscreen
- BlueLink connected features
- Wireless charging
- Bose sound system (top variant)

**Winner: Tata Nexon** - More features per rupee

## Safety

### Nexon:
- 5-star Global NCAP rating
- 6 airbags (standard on all variants)
- ESP, Hill Hold, ISOFIX

### Venue:
- Not yet tested by Global NCAP
- 6 airbags (top variants only)
- ESP, VSM, Hill Assist

**Winner: Tata Nexon** - Proven 5-star safety

## Performance

| Spec | Nexon Turbo Petrol | Venue Turbo Petrol |
|------|-------------------|-------------------|
| Power | 120 PS | 120 PS |
| Torque | 170 Nm | 172 Nm |
| Transmission | 6MT/6AMT | 6MT/7DCT |
| Mileage | 17.4 kmpl | 18.1 kmpl |

**Winner: Hyundai Venue** - Slightly better efficiency and DCT option

## Price Comparison

| Variant | Nexon | Venue |
|---------|-------|-------|
| Base | ₹8.10 L | ₹7.94 L |
| Mid | ₹11.50 L | ₹10.50 L |
| Top | ₹15.50 L | ₹13.48 L |

**Winner: Hyundai Venue** - More affordable across variants

## Verdict

**Choose Tata Nexon if:**
- Safety is your top priority
- You want more features
- You prefer a bolder design
- You plan to keep the car long-term

**Choose Hyundai Venue if:**
- You have a tighter budget
- You want better fuel economy
- You prefer a stylish, urban look
- DCT transmission is important to you

**Our Pick: Tata Nexon** - The 5-star safety rating and better value proposition make it our recommendation.
    `,
    category: "review",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=500&fit=crop",
    author: "Amit Kumar",
    date: "December 15, 2024",
    readTime: "10 min read",
    tags: ["Comparison", "Nexon", "Venue", "SUV"],
  },
  {
    id: 4,
    slug: "car-loan-tips-best-interest-rates",
    title: "How to Get the Best Car Loan Interest Rates in 2024",
    excerpt: "Expert tips to secure the lowest interest rates on your car loan and save lakhs over the loan tenure.",
    content: `
## Introduction

A car loan interest rate difference of just 1% can save you over ₹50,000 on a ₹10 lakh loan. Here's how to ensure you get the best possible rate.

## Understanding Car Loan Rates

Current car loan rates in India range from 8.5% to 14% depending on:
- Your credit score
- Loan amount and tenure
- New vs used car
- Lender type (bank vs NBFC)

## Tip 1: Improve Your Credit Score

Your CIBIL score is the biggest factor affecting your interest rate.

| Score Range | Expected Rate | Approval Chances |
|-------------|---------------|------------------|
| 750+ | 8.5-9.5% | Excellent |
| 700-750 | 9.5-11% | Good |
| 650-700 | 11-13% | Moderate |
| Below 650 | 13%+ or rejection | Low |

### How to improve quickly:
- Pay all EMIs on time
- Reduce credit card utilization below 30%
- Don't apply for multiple loans simultaneously
- Check and dispute any errors in your credit report

## Tip 2: Compare Multiple Lenders

Never accept the first offer. Compare:
- Public sector banks (SBI, PNB, BOB)
- Private banks (HDFC, ICICI, Axis)
- NBFCs (Bajaj Finance, Tata Capital)
- Dealer financing (often has hidden costs)

## Tip 3: Negotiate the Processing Fee

Processing fees typically range from 0.5% to 2% of the loan amount. Many lenders will:
- Waive it completely for existing customers
- Reduce it during festive seasons
- Match competitor offers

## Tip 4: Choose the Right Tenure

| Tenure | EMI (₹10L at 9%) | Total Interest |
|--------|------------------|----------------|
| 3 years | ₹31,800 | ₹1.45 L |
| 5 years | ₹20,760 | ₹2.46 L |
| 7 years | ₹16,090 | ₹3.51 L |

**Recommendation**: 3-5 years balances EMI affordability with total cost.

## Tip 5: Make a Higher Down Payment

- 20% down payment: Standard rates apply
- 30%+ down payment: Negotiate 0.25-0.5% rate reduction
- 50%+ down payment: Best rates, often with zero processing fee

## Tip 6: Time Your Purchase

Best times for car loans:
- **March**: Financial year-end targets
- **October-November**: Festive season offers
- **December**: Year-end clearance

## Red Flags to Avoid

- Hidden charges in the fine print
- Mandatory insurance from the lender
- Prepayment penalties
- Floating rates without caps

## Conclusion

With proper preparation and negotiation, you can easily save 1-2% on your car loan interest rate. This translates to savings of ₹50,000 to ₹1,00,000 over a 5-year loan tenure.
    `,
    category: "tips",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop",
    author: "Vikram Singh",
    date: "December 12, 2024",
    readTime: "7 min read",
    tags: ["Car Loan", "Finance", "Tips", "Interest Rates"],
  },
  {
    id: 5,
    slug: "electric-cars-india-2024-guide",
    title: "Electric Cars in India 2024: Complete Buying Guide",
    excerpt: "Everything you need to know about buying an electric car in India - from charging infrastructure to best models and government incentives.",
    content: `
## The EV Revolution in India

Electric vehicles are no longer the future – they're the present. With improving infrastructure and competitive pricing, 2024 is a great time to consider going electric.

## Top Electric Cars in India 2024

### Under ₹15 Lakh
1. **Tata Tiago EV** (₹8.49 L) - Best entry-level EV
2. **MG Comet EV** (₹6.99 L) - City commuter
3. **Tata Punch EV** (₹10.99 L) - Micro SUV

### ₹15-25 Lakh
1. **Tata Nexon EV** (₹14.49 L) - Best-seller
2. **Mahindra XUV400** (₹15.49 L) - Longest range
3. **MG ZS EV** (₹18.98 L) - Premium features

### Above ₹25 Lakh
1. **Hyundai Ioniq 5** (₹44.95 L) - Fastest charging
2. **Kia EV6** (₹60.95 L) - Performance EV
3. **BMW iX1** (₹66.90 L) - Luxury EV

## Understanding EV Specifications

### Range
- City driving: Expect 10-15% more than rated
- Highway driving: Expect 15-20% less than rated
- AC usage: Reduces range by 10-15%

### Charging Times
| Charger Type | Power | Time (0-80%) |
|--------------|-------|--------------|
| Home (15A) | 3.3 kW | 10-14 hours |
| AC Fast | 7.4 kW | 4-6 hours |
| DC Fast | 50 kW | 45-60 min |
| Ultra-Fast | 150 kW | 15-20 min |

## Charging Infrastructure

### Home Charging
- Most practical for daily use
- Costs ₹5,000-15,000 to install
- Uses domestic electricity rates

### Public Charging
- Tata Power: 3,500+ chargers
- Ather Grid: 1,500+ chargers
- EESL: 2,000+ chargers

## Government Incentives

### FAME-II Benefits
- Up to ₹1.5 lakh subsidy on cars
- Reduced GST (5% vs 28%)
- Road tax exemption in many states

### State-wise Benefits
| State | Road Tax | Registration |
|-------|----------|--------------|
| Delhi | Exempt | Exempt |
| Maharashtra | Exempt | Exempt |
| Gujarat | Exempt | Exempt |
| Karnataka | Exempt | ₹5,000 only |

## Running Cost Comparison

| Parameter | Petrol | Electric |
|-----------|--------|----------|
| Fuel/km | ₹7-8 | ₹1-1.5 |
| Service/year | ₹10,000 | ₹5,000 |
| Insurance | Standard | 10-15% higher |

**Annual savings with EV**: ₹60,000-80,000 (15,000 km/year)

## Should You Buy an EV?

### Yes, if:
- Daily commute is under 100 km
- You have home charging access
- You keep cars for 5+ years
- You're environmentally conscious

### Wait, if:
- You do frequent long trips (500+ km)
- No home charging possible
- Planning to sell within 3 years
- Budget is very tight

## Conclusion

Electric cars have matured significantly in India. With running cost savings of ₹60,000+ annually and improving infrastructure, an EV makes practical and financial sense for many buyers in 2024.
    `,
    category: "guide",
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=500&fit=crop",
    author: "Sneha Reddy",
    date: "December 10, 2024",
    readTime: "11 min read",
    tags: ["Electric Cars", "EV", "Guide", "2024"],
  },
  {
    id: 6,
    slug: "maruti-swift-2024-launch-news",
    title: "All-New Maruti Swift 2024 Launched: Prices, Features & First Look",
    excerpt: "The 4th generation Maruti Swift is here with new design, better mileage, and more features. Here's everything you need to know.",
    content: `
## Breaking News

Maruti Suzuki has officially launched the all-new 4th generation Swift in India. The new model brings significant updates in design, performance, and features while retaining its core appeal of being a fun-to-drive, fuel-efficient hatchback.

## Price List

| Variant | Manual | AMT |
|---------|--------|-----|
| LXi | ₹6.49 L | - |
| VXi | ₹7.29 L | ₹7.79 L |
| VXi (O) | ₹7.64 L | ₹8.14 L |
| ZXi | ₹8.29 L | ₹8.79 L |
| ZXi+ | ₹9.14 L | ₹9.64 L |

*All prices ex-showroom Delhi*

## What's New

### Exterior Changes
- All-new design language
- Sleeker LED headlamps
- New grille design
- Dual-tone roof options
- New 16-inch alloy wheels

### Interior Updates
- New 9-inch SmartPlay Pro+ touchscreen
- Updated instrument cluster
- Improved material quality
- Wireless Apple CarPlay & Android Auto
- New color themes

### Engine & Performance
- New 1.2L Z-Series engine
- Power: 82 PS
- Torque: 112 Nm
- Mileage: 24.8 kmpl (MT) / 25.8 kmpl (AMT)
- 5-speed MT / 5-speed AMT

## Key Features by Variant

### ZXi+ (Top Variant)
- 9-inch touchscreen
- 6 airbags
- LED headlamps & DRLs
- Cruise control
- Auto climate control
- Push-button start
- 360-degree camera
- Wireless charger

## Safety

All variants now come with:
- 6 airbags (standard)
- ABS with EBD
- ESP with hill hold
- ISOFIX child seat mounts
- Rear parking sensors

## Competition

| Model | Starting Price | Mileage |
|-------|----------------|---------|
| **New Swift** | ₹6.49 L | 24.8 kmpl |
| Hyundai Grand i10 Nios | ₹5.92 L | 20.7 kmpl |
| Tata Altroz | ₹6.60 L | 19.3 kmpl |
| Toyota Glanza | ₹6.86 L | 22.3 kmpl |

## Our Take

The new Swift maintains its position as India's favorite hatchback. The improved fuel efficiency, updated design, and standard 6 airbags across variants make it a compelling package. The only missing feature is a sunroof, which competitors now offer.

## Booking & Delivery

- Bookings: Open at all Maruti dealerships
- Booking amount: ₹11,000
- Delivery: 4-8 weeks depending on variant
- Available colors: 9 options including 3 dual-tone

The new Swift is now available at all Grabyourcar partner dealerships with exclusive launch offers!
    `,
    category: "news",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop",
    author: "Rahul Sharma",
    date: "December 8, 2024",
    readTime: "6 min read",
    tags: ["Maruti", "Swift", "Launch", "News"],
  },
];

export const getBlogBySlug = (slug: string): BlogPost | undefined => {
  return blogPosts.find((post) => post.slug === slug);
};

export const getBlogsByCategory = (category: BlogPost["category"]): BlogPost[] => {
  return blogPosts.filter((post) => post.category === category);
};