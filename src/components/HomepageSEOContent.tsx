import { Link } from "react-router-dom";

/**
 * Crawlable, keyword-rich homepage content for SEO.
 * Targets: "buy new car without waiting period", "ready stock cars India", etc.
 * Minimum 1000 words of structured, authoritative text.
 */
export const HomepageSEOContent = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-center">
          Buy New Cars Without Waiting Period in India
        </h2>
        <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
          India's most trusted platform for buying new cars at the best price with zero waiting period. 
          Get ready-stock vehicles delivered to your doorstep across Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur &amp; Lucknow.
        </p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          {/* Section 1: What We Do */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Why GrabYourCar Is India's #1 New Car Buying Platform
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              GrabYourCar is India's fastest-growing new car buying platform, designed to eliminate the biggest pain point in car buying — <strong>the waiting period</strong>. 
              We partner with 500+ authorized dealers across India to source ready-stock vehicles across 50+ car brands including 
              <Link to="/cars?brand=Maruti+Suzuki" className="text-primary hover:underline"> Maruti Suzuki</Link>, 
              <Link to="/cars?brand=Hyundai" className="text-primary hover:underline"> Hyundai</Link>, 
              <Link to="/cars?brand=Tata+Motors" className="text-primary hover:underline"> Tata Motors</Link>, 
              <Link to="/cars?brand=Mahindra" className="text-primary hover:underline"> Mahindra</Link>, 
              <Link to="/cars?brand=Kia" className="text-primary hover:underline"> Kia</Link>, and 
              <Link to="/cars?brand=Toyota" className="text-primary hover:underline"> Toyota</Link>. 
              Whether you're looking for a compact hatchback, a family sedan, a rugged SUV, or a luxury car — we deliver it faster and at the best on-road price.
            </p>
          </div>

          {/* Section 2: Zero Waiting Period */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Cars Without Waiting Period — Ready to Deliver
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Tired of waiting 3–6 months for your dream car? At GrabYourCar, we specialize in sourcing <strong>cars without waiting period</strong>. 
              Our real-time inventory tracking system monitors dealer stock across India, enabling us to find your preferred model, variant, and color 
              with significantly reduced or <strong>zero waiting time</strong>. Popular models like the 
              <Link to="/car/hyundai-creta" className="text-primary hover:underline"> Hyundai Creta</Link>, 
              <Link to="/car/tata-nexon" className="text-primary hover:underline"> Tata Nexon</Link>, 
              <Link to="/car/maruti-suzuki-brezza" className="text-primary hover:underline"> Maruti Brezza</Link>, 
              <Link to="/car/mahindra-xuv700" className="text-primary hover:underline"> Mahindra XUV700</Link>, and 
              <Link to="/car/kia-seltos" className="text-primary hover:underline"> Kia Seltos</Link> — 
              all available for <strong>immediate delivery</strong> through our dealer network.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We understand that when you decide to buy a car, you want it now — not months later. Our dedicated team negotiates with multiple dealers 
              simultaneously to find ready-stock inventory at the lowest possible price. This unique approach has helped over 500 families 
              drive home their dream car within days, not months.
            </p>
          </div>

          {/* Section 3: Best Price Guarantee */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Best On-Road Price Across India
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Getting the best deal on a new car requires comparing prices across multiple dealers — a time-consuming process. 
              GrabYourCar simplifies this by aggregating quotes from authorized dealers in your city and negotiating exclusive discounts on your behalf. 
              Our <Link to="/car-loans" className="text-primary hover:underline">car loan services</Link> start at just 8.5% interest rate from leading banks, 
              and our <Link to="/car-insurance" className="text-primary hover:underline">car insurance partnerships</Link> with 15+ insurers 
              like HDFC ERGO, ICICI Lombard, and Bajaj Allianz ensure you get comprehensive coverage at the most competitive premiums.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Every purchase through GrabYourCar includes a transparent <strong>on-road price breakup</strong> — ex-showroom price, RTO registration charges, 
              insurance, TCS, handling charges, and accessories cost. No hidden fees, no surprises. Use our 
              <Link to="/#emi-calculator" className="text-primary hover:underline"> EMI calculator</Link> to plan your budget 
              and get pre-approved loan offers instantly.
            </p>
          </div>

          {/* Section 4: Services Grid */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Complete Car Buying Services Under One Roof
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">🚗 New Car Deals</h3>
                <p className="text-sm text-muted-foreground">
                  Browse <Link to="/cars" className="text-primary hover:underline">200+ car models</Link> from all major brands. Filter by body type, fuel type, 
                  transmission, and price range. Every listing includes detailed specifications, high-resolution images, and real-time pricing.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">⚡ Zero Waiting Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Our ready-stock inventory covers popular SUVs, sedans, hatchbacks, and EVs. Get your car delivered within 24–72 hours 
                  in Delhi NCR, Mumbai, Bangalore, and other metro cities.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">💰 Car Loans &amp; Finance</h3>
                <p className="text-sm text-muted-foreground">
                  <Link to="/car-loans" className="text-primary hover:underline">Car loan rates starting 8.5%</Link> from SBI, HDFC, ICICI, 
                  Axis Bank, and more. Quick approval, minimal documentation, up to 100% on-road funding available.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">🛡️ Car Insurance</h3>
                <p className="text-sm text-muted-foreground">
                  <Link to="/car-insurance" className="text-primary hover:underline">Compare insurance quotes</Link> from 15+ top insurers. 
                  Comprehensive, third-party, and zero-depreciation covers at the best premiums with instant policy issuance.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">🏢 Corporate Car Buying</h3>
                <p className="text-sm text-muted-foreground">
                  <Link to="/corporate" className="text-primary hover:underline">Fleet and bulk car buying</Link> for businesses, 
                  corporates, and institutions. Dedicated account managers, volume discounts, and end-to-end procurement support.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">📊 Compare &amp; Decide</h3>
                <p className="text-sm text-muted-foreground">
                  <Link to="/compare" className="text-primary hover:underline">Compare cars side-by-side</Link> on price, features, 
                  mileage, safety ratings, and more. Make informed decisions with our detailed comparison tool.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Cities */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Serving India's Top 10 Cities &amp; Beyond
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              GrabYourCar operates across India's major automotive markets. Whether you're in <strong>Delhi NCR</strong> (Delhi, Gurugram, Noida, Faridabad, Ghaziabad), 
              <strong> Mumbai</strong> (Mumbai, Navi Mumbai, Thane), <strong>Bangalore</strong>, <strong>Hyderabad</strong>, <strong>Chennai</strong>, 
              <strong> Pune</strong>, <strong>Kolkata</strong>, <strong>Ahmedabad</strong>, <strong>Jaipur</strong>, or <strong>Lucknow</strong> — 
              we bring the best car deals directly to you. Our pan-India dealer network ensures consistent pricing and service quality 
              regardless of your location. We also offer <strong>free doorstep delivery</strong> in all major metros.
            </p>
          </div>

          {/* Section 6: Brands */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              50+ Car Brands — From Budget to Luxury
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Explore new cars from every major manufacturer in India. Our catalog includes popular brands like 
              <Link to="/cars?brand=Maruti+Suzuki" className="text-primary hover:underline"> Maruti Suzuki</Link> (Swift, Baleno, Brezza, Ertiga, Grand Vitara), 
              <Link to="/cars?brand=Hyundai" className="text-primary hover:underline"> Hyundai</Link> (Creta, Venue, i20, Verna, Tucson), 
              <Link to="/cars?brand=Tata+Motors" className="text-primary hover:underline"> Tata Motors</Link> (Nexon, Punch, Harrier, Safari, Curvv), 
              <Link to="/cars?brand=Mahindra" className="text-primary hover:underline"> Mahindra</Link> (XUV700, Thar, Scorpio N, XUV 3XO, BE 6), 
              <Link to="/cars?brand=Kia" className="text-primary hover:underline"> Kia</Link> (Seltos, Sonet, Carens, EV6), 
              <Link to="/cars?brand=Toyota" className="text-primary hover:underline"> Toyota</Link> (Innova Hycross, Fortuner, Urban Cruiser), 
              and luxury marques like <Link to="/cars?brand=BMW" className="text-primary hover:underline">BMW</Link>, 
              <Link to="/cars?brand=Mercedes-Benz" className="text-primary hover:underline"> Mercedes-Benz</Link>, 
              <Link to="/cars?brand=Audi" className="text-primary hover:underline"> Audi</Link>, and more. 
              Check out our <Link to="/upcoming-cars" className="text-primary hover:underline">upcoming cars</Link> section for the latest launches and 
              <Link to="/auto-news" className="text-primary hover:underline"> auto news</Link> for industry updates.
            </p>
          </div>

          {/* Section 7: How It Works */}
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              How GrabYourCar Works — 3 Simple Steps
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              <div className="text-center p-6 rounded-xl border border-border bg-card">
                <div className="text-4xl mb-3">1️⃣</div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Choose Your Car</h3>
                <p className="text-sm text-muted-foreground">
                  Browse our catalog, compare models, check on-road prices, and select your preferred variant and color.
                </p>
              </div>
              <div className="text-center p-6 rounded-xl border border-border bg-card">
                <div className="text-4xl mb-3">2️⃣</div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Get Best Quote</h3>
                <p className="text-sm text-muted-foreground">
                  We negotiate with multiple dealers to get you the lowest on-road price with maximum discounts and offers.
                </p>
              </div>
              <div className="text-center p-6 rounded-xl border border-border bg-card">
                <div className="text-4xl mb-3">3️⃣</div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Drive Home</h3>
                <p className="text-sm text-muted-foreground">
                  Complete your purchase with easy financing, insurance, and enjoy free doorstep delivery of your new car.
                </p>
              </div>
            </div>
          </div>

          {/* Section 8: Trust & Contact */}
          <div className="text-center mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/5 border border-primary/20">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Buy Your Dream Car?
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              Join 500+ happy customers who bought their cars through GrabYourCar. Call us at 
              <a href="tel:+919855924442" className="text-primary font-semibold hover:underline"> +91 98559 24442</a> or 
              <a href="https://wa.me/919855924442" className="text-primary font-semibold hover:underline" target="_blank" rel="noopener noreferrer"> WhatsApp us</a> for 
              instant quotes. Visit our office at MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana 122001.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/cars">
                <button className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity">
                  Explore All Cars
                </button>
              </Link>
              <Link to="/car-finder">
                <button className="px-8 py-3 border border-primary text-primary rounded-full font-semibold hover:bg-primary/5 transition-colors">
                  Find My Perfect Car
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomepageSEOContent;
