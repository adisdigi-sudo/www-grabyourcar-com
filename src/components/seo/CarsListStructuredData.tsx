import { Helmet } from "react-helmet-async";

interface CarItem {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: string;
  priceNumeric: number;
  image: string;
  bodyType: string;
  fuelTypes: string[];
  isUpcoming?: boolean;
}

interface CarsListStructuredDataProps {
  cars: CarItem[];
  totalCount: number;
}

export const CarsListStructuredData = ({ cars, totalCount }: CarsListStructuredDataProps) => {
  const baseUrl = "https://grabyourcar.com";
  
  // ItemList schema for the cars listing
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "New Cars in India 2025",
    "description": `Browse ${totalCount}+ new cars from top brands in India. Compare prices, specifications, and features.`,
    "url": `${baseUrl}/cars`,
    "numberOfItems": cars.length,
    "itemListElement": cars.slice(0, 50).map((car, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": `${car.brand} ${car.name}`,
      "url": `${baseUrl}/cars/${car.slug}`,
      "item": {
        "@type": "Car",
        "name": `${car.brand} ${car.name}`,
        "brand": {
          "@type": "Brand",
          "name": car.brand
        },
        "model": car.name,
        "bodyType": car.bodyType,
        "fuelType": car.fuelTypes.join(", "),
        "image": car.image,
        "url": `${baseUrl}/cars/${car.slug}`,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "INR",
          "price": car.priceNumeric,
          "availability": car.isUpcoming 
            ? "https://schema.org/PreOrder" 
            : "https://schema.org/InStock"
        }
      }
    }))
  };

  // CollectionPage schema
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "New Cars in India 2025 - All Brands & Models",
    "description": `Explore ${totalCount}+ new cars from 10+ brands in India. Filter by brand, body type, fuel type, transmission & price.`,
    "url": `${baseUrl}/cars`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": totalCount
    },
    "breadcrumb": {
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
        }
      ]
    }
  };

  // WebPage schema with search action
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "New Cars in India 2025",
    "url": `${baseUrl}/cars`,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/cars?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(itemListSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(collectionPageSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </script>
    </Helmet>
  );
};

export default CarsListStructuredData;
