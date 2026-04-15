type RentalJourneyEvent = {
  step: string;
  at: string;
  data?: Record<string, unknown>;
};

export type RentalJourneySnapshot = {
  sessionId: string;
  startedAt: string;
  lastUpdatedAt: string;
  entryPath: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  activeService?: string | null;
  filters?: Record<string, unknown>;
  selectedVehicle?: Record<string, unknown> | null;
  bookingId?: string | null;
  paymentCompleted?: boolean;
  lastKnownStep?: string | null;
  events: RentalJourneyEvent[];
};

const STORAGE_KEY = "rental-journey-v2";

const isBrowser = () => typeof window !== "undefined";

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const getWindowMetadata = () => {
  if (!isBrowser()) {
    return {
      entryPath: null,
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    entryPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    referrer: document.referrer || null,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
  };
};

const writeJourney = (snapshot: RentalJourneySnapshot) => {
  if (!isBrowser()) return snapshot;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }

  return snapshot;
};

export const readRentalJourney = () => {
  if (!isBrowser()) return null;

  try {
    return safeParse<RentalJourneySnapshot>(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

export const ensureRentalJourneySession = (patch: Partial<RentalJourneySnapshot> = {}) => {
  const existing = readRentalJourney();
  const windowMeta = getWindowMetadata();
  const now = new Date().toISOString();

  const snapshot: RentalJourneySnapshot = {
    sessionId: existing?.sessionId || (typeof crypto !== "undefined" ? crypto.randomUUID() : `journey-${Date.now()}`),
    startedAt: existing?.startedAt || now,
    lastUpdatedAt: now,
    entryPath: existing?.entryPath || windowMeta.entryPath,
    referrer: existing?.referrer || windowMeta.referrer,
    utmSource: existing?.utmSource || windowMeta.utmSource,
    utmMedium: existing?.utmMedium || windowMeta.utmMedium,
    utmCampaign: existing?.utmCampaign || windowMeta.utmCampaign,
    utmTerm: existing?.utmTerm || windowMeta.utmTerm,
    utmContent: existing?.utmContent || windowMeta.utmContent,
    activeService: existing?.activeService || null,
    filters: existing?.filters || {},
    selectedVehicle: existing?.selectedVehicle || null,
    bookingId: existing?.bookingId || null,
    paymentCompleted: existing?.paymentCompleted || false,
    lastKnownStep: existing?.lastKnownStep || null,
    events: existing?.events || [],
    ...patch,
  };

  return writeJourney(snapshot);
};

export const syncRentalJourneySnapshot = (patch: Partial<RentalJourneySnapshot>) => {
  const snapshot = ensureRentalJourneySession();

  return writeJourney({
    ...snapshot,
    ...patch,
    lastUpdatedAt: new Date().toISOString(),
  });
};

export const captureRentalJourneyStep = (step: string, data?: Record<string, unknown>) => {
  const snapshot = ensureRentalJourneySession();
  const lastEvent = snapshot.events[snapshot.events.length - 1];

  if (lastEvent?.step === step && JSON.stringify(lastEvent.data || {}) === JSON.stringify(data || {})) {
    return snapshot;
  }

  return writeJourney({
    ...snapshot,
    lastKnownStep: step,
    lastUpdatedAt: new Date().toISOString(),
    events: [...snapshot.events, { step, at: new Date().toISOString(), data }],
  });
};

export const buildRentalLeadMetadata = () => {
  const snapshot = ensureRentalJourneySession();
  const sessionDurationSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(snapshot.startedAt).getTime()) / 1000),
  );

  return {
    websiteJourney: snapshot,
    pageReferrer: snapshot.referrer,
    utmSource: snapshot.utmSource,
    utmMedium: snapshot.utmMedium,
    utmCampaign: snapshot.utmCampaign,
    utmTerm: snapshot.utmTerm,
    utmContent: snapshot.utmContent,
    sessionDurationSeconds,
  };
};

export const clearRentalJourneySession = () => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};