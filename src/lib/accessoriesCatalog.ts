import { accessoriesData, categories as defaultPublicCategories, type Accessory, type Review, type Specification } from "@/data/accessoriesData";

export interface AccessoryCatalogProduct extends Accessory {
  slug: string;
  features: string[];
  imagePrompt?: string;
}

export interface AccessoriesCatalog {
  products: AccessoryCatalogProduct[];
  categories: string[];
}

const FALLBACK_RATING = 4.5;

export const createAccessorySlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const isSpecification = (value: unknown): value is Specification => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.label === "string" && typeof item.value === "string";
};

const isReview = (value: unknown): value is Review => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.author === "string" && typeof item.comment === "string";
};

const normalizeStringArray = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const featureListToSpecifications = (features: string[]): Specification[] =>
  features.map((feature, index) => ({
    label: index === 0 ? "Key Feature" : `Feature ${index + 1}`,
    value: feature,
  }));

export const normalizeAccessoryProduct = (
  rawProduct: Partial<AccessoryCatalogProduct>,
  fallbackIndex: number,
): AccessoryCatalogProduct => {
  const name = String(rawProduct.name || `Accessory Product ${fallbackIndex + 1}`).trim();
  const description = String(rawProduct.description || "Premium automotive accessory crafted for everyday driving comfort.").trim();
  const features = uniqueStrings(
    normalizeStringArray(rawProduct.features).length
      ? normalizeStringArray(rawProduct.features)
      : Array.isArray(rawProduct.specifications)
        ? rawProduct.specifications.filter(isSpecification).map((item) => item.value)
        : [],
  );

  const imageCandidates = uniqueStrings([
    String(rawProduct.image || "").trim(),
    ...normalizeStringArray(rawProduct.images),
  ]).filter((item) => item !== "/placeholder.svg");

  const images = imageCandidates.length ? imageCandidates : ["/placeholder.svg"];
  const specifications = Array.isArray(rawProduct.specifications)
    ? rawProduct.specifications.filter(isSpecification)
    : [];
  const customerReviews = Array.isArray(rawProduct.customerReviews)
    ? rawProduct.customerReviews.filter(isReview)
    : [];

  return {
    id: Number(rawProduct.id) || Date.now() + fallbackIndex,
    slug: String(rawProduct.slug || createAccessorySlug(name)).trim(),
    name,
    price: Number(rawProduct.price) || 0,
    originalPrice: rawProduct.originalPrice ? Number(rawProduct.originalPrice) : undefined,
    image: images[0],
    images,
    category: String(rawProduct.category || "Other").trim(),
    description,
    fullDescription: String(rawProduct.fullDescription || description).trim(),
    rating: Number(rawProduct.rating) || FALLBACK_RATING,
    reviews: Number(rawProduct.reviews) || 0,
    inStock: rawProduct.inStock ?? true,
    badge: rawProduct.badge ? String(rawProduct.badge).trim() : undefined,
    specifications: specifications.length ? specifications : featureListToSpecifications(features),
    customerReviews,
    features,
    imagePrompt: rawProduct.imagePrompt ? String(rawProduct.imagePrompt).trim() : undefined,
  };
};

export const getDefaultAccessoriesCatalog = (): AccessoriesCatalog => {
  const normalizedProducts = accessoriesData.map((product, index) =>
    normalizeAccessoryProduct(
      {
        ...product,
        slug: createAccessorySlug(product.name),
        features: product.specifications.map((spec) => spec.value),
      },
      index,
    ),
  );

  return {
    products: normalizedProducts,
    categories: defaultPublicCategories.filter((category) => category !== "All"),
  };
};

export const normalizeAccessoriesCatalog = (value: unknown): AccessoriesCatalog => {
  const fallback = getDefaultAccessoriesCatalog();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const rawCatalog = value as Record<string, unknown>;
  const rawProducts = Array.isArray(rawCatalog.products) ? rawCatalog.products : fallback.products;
  const rawCategories = normalizeStringArray(rawCatalog.categories);

  const products = rawProducts.map((product, index) =>
    normalizeAccessoryProduct(product as Partial<AccessoryCatalogProduct>, index),
  );

  const categories = uniqueStrings([
    ...(rawCategories.length ? rawCategories : fallback.categories),
    ...products.map((product) => product.category),
  ]).filter((category) => category !== "All");

  return { products, categories };
};

export const getAccessoriesPublicCategories = (catalog: AccessoriesCatalog) => ["All", ...catalog.categories];