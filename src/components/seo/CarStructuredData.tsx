import { Helmet } from "react-helmet-async";

// Flexible interface that works with both carsData.ts and cars/types.ts Car types
interface CarForStructuredData {
  id: number;
  slug: string;
  name: string;
  brand: string;
  tagline: string;
  image: string;
  gallery: string[];
  price: string;
  originalPrice: string;
  discount: string;
  fuelTypes: string[];
  transmission: string[];
  availability: string;
  isHot: boolean;
  isLimited: boolean;
  overview: string;
  specifications: {
    engine: { label: string; value: string }[];
    dimensions: { label: string; value: string }[];
    performance: { label: string; value: string }[];
    features: { label: string; value: string }[];
    safety?: { label: string; value: string }[];
  };
  colors: { name: string; hex: string }[];
  variants: {
    name: string;
    price: string;
    priceNumeric?: number;
    features: string[];
  }[];
  offers: {
    id: number;
    title: string;
    description: string;
    discount: string;
    validTill: string;
    type: string;
  }[];
  // Optional fields from the fuller Car type
  bodyType?: string;
  priceNumeric?: number;
  isNew?: boolean;
  isUpcoming?: boolean;
  launchDate?: string;
  keyHighlights?: string[];
  pros?: string[];
  cons?: string[];
  competitors?: string[];
}

interface CarStructuredDataProps {
  car: CarForStructuredData;
  selectedVariant?: number;
}

export const CarStructuredData = ({ car, selectedVariant = 0 }: CarStructuredDataProps) => {
  const baseUrl = "https://grabyourcar.com";
  const carUrl = `${baseUrl}/car/${car.slug}`;
  
  // Parse price from string if priceNumeric not available
  const parsePriceFromString = (priceStr: string): number => {
    const match = priceStr.match(/₹?([\d.]+)\s*(Lakh|Cr)?/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase();
      if (unit === 'cr') return value * 10000000;
      if (unit === 'lakh') return value * 100000;
      return value;
    }
    return 0;
  };
  
  // Get the selected variant for price details - safely handle empty variants
  const hasVariants = car.variants && car.variants.length > 0;
  const variant = hasVariants ? (car.variants[selectedVariant] || car.variants[0]) : null;
  const basePriceNumeric = car.priceNumeric || parsePriceFromString(car.price);
  const priceValue = variant?.priceNumeric || basePriceNumeric;
  
  // Calculate high price from variants - safely handle empty arrays
  const variantPrices = hasVariants 
    ? car.variants.map(v => v.priceNumeric || parsePriceFromString(v.price || '0')).filter(p => p > 0)
    : [];
  const highPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : basePriceNumeric;
  
  // Extract mileage from specifications if available
  const mileageSpec = car.specifications.performance.find(
    spec => spec.label.toLowerCase().includes("mileage")
  );
  const mileage = mileageSpec?.value || "";

  // Extract engine displacement
  const engineSpec = car.specifications.engine.find(
    spec => spec.label.toLowerCase().includes("displacement") || spec.label.toLowerCase().includes("engine")
  );
  const engineSize = engineSpec?.value || "";
  
  // Body type with fallback
  const bodyType = car.bodyType || "SUV";

  // Build the main Product schema with Vehicle details
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${car.brand} ${car.name}`,
    "description": car.overview || car.tagline,
    "brand": {
      "@type": "Brand",
      "name": car.brand
    },
    "image": car.gallery.length > 0 ? car.gallery : [car.image],
    "url": carUrl,
    "sku": car.slug,
    "category": `${bodyType} Cars`,
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": basePriceNumeric,
      "highPrice": highPrice,
      "offerCount": hasVariants ? car.variants.length : 1,
      "availability": car.isUpcoming 
        ? "https://schema.org/PreOrder" 
        : "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "Grabyourcar",
        "url": baseUrl
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "150",
      "bestRating": "5",
      "worstRating": "1"
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Fuel Type",
        "value": car.fuelTypes.join(", ")
      },
      {
        "@type": "PropertyValue",
        "name": "Transmission",
        "value": car.transmission.join(", ")
      },
      {
        "@type": "PropertyValue",
        "name": "Body Type",
        "value": bodyType
      }
    ]
  };

  // Vehicle schema for more specific car details
  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Car",
    "name": `${car.brand} ${car.name}`,
    "description": car.overview || car.tagline,
    "brand": {
      "@type": "Brand",
      "name": car.brand
    },
    "manufacturer": {
      "@type": "Organization",
      "name": car.brand
    },
    "model": car.name,
    "vehicleConfiguration": hasVariants ? car.variants.map(v => v.name).join(", ") : car.name,
    "fuelType": car.fuelTypes.join(", "),
    "vehicleTransmission": car.transmission.join(", "),
    "bodyType": bodyType,
    "color": car.colors.map(c => c.name).join(", "),
    "image": car.gallery.length > 0 ? car.gallery : [car.image],
    "url": carUrl,
    ...(mileage && { "fuelEfficiency": mileage }),
    ...(engineSize && { "vehicleEngine": {
      "@type": "EngineSpecification",
      "engineDisplacement": engineSize
    }}),
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": priceValue,
      "availability": car.isUpcoming 
        ? "https://schema.org/PreOrder" 
        : "https://schema.org/InStock",
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      "seller": {
        "@type": "Organization",
        "name": "Grabyourcar",
        "url": baseUrl
      }
    }
  };

  // BreadcrumbList schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Cars",
        "item": `${baseUrl}/cars`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": car.brand,
        "item": `${baseUrl}/cars?brand=${encodeURIComponent(car.brand)}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": car.name,
        "item": carUrl
      }
    ]
  };

  // FAQ schema from pros/cons
  const faqItems = [
    ...(car.pros?.length ? [{
      "@type": "Question",
      "name": `What are the pros of ${car.brand} ${car.name}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": car.pros.join(". ") + "."
      }
    }] : []),
    ...(car.cons?.length ? [{
      "@type": "Question",
      "name": `What are the cons of ${car.brand} ${car.name}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": car.cons.join(". ") + "."
      }
    }] : []),
    {
      "@type": "Question",
      "name": `What is the price of ${car.brand} ${car.name}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The ${car.brand} ${car.name} price starts from ${car.price} (ex-showroom). It is available ${hasVariants ? `in ${car.variants.length} variants` : ''} with ${car.fuelTypes.join(" and ")} fuel options.`
      }
    },
    {
      "@type": "Question",
      "name": `What colors are available for ${car.brand} ${car.name}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The ${car.brand} ${car.name} is available in ${car.colors.length} colors: ${car.colors.map(c => c.name).join(", ")}.`
      }
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(vehicleSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
};

export default CarStructuredData;
