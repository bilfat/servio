export type AiProviderMode = "GEMINI" | "CUSTOM_AGENT";
export type AiEffectiveProvider = "GEMINI" | "CUSTOM_AGENT" | "RULE_FALLBACK";
export type GeminiModelOption =
  | "gemini-3.8-flash"
  | "gemini-flash-latest"
  | "gemini-3.7-flash"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro";
export type AiFeedbackValue = "UP" | "DOWN";

export interface RecommendedServiceCard {
  id: string;
  title: string;
  description: string | null;
  providerName: string;
  providerOrgId: string;
  categoryName: string;
  subcategoryName: string;
  priceModel: "FREE" | "RANGE" | "AFTER_SURVEY" | string;
  minPriceIdr: number | null;
  maxPriceIdr: number | null;
  estimatedCostLabel: string;
  durationLabel: string;
  warrantyLabel: string;
  primaryMediaUrl: string | null;
  bookingUrl: string;
  sourceMethod: "HTTP_API" | "MYSQL_FALLBACK";
}

export interface RecommendedProductCard {
  id: string;
  name: string;
  brandName: string;
  description: string | null;
  categoryName: string;
  subcategoryName: string;
  merchantName: string;
  priceMinIdr: number;
  priceMaxIdr: number;
  priceLabel: string;
  totalStock: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK";
  variantSummary: string;
  primaryMediaUrl: string | null;
  productUrl: string;
  sourceMethod: "HTTP_API" | "MYSQL_FALLBACK";
}

export interface AiStructuredResponse {
  isGeneralChat?: boolean;
  summary: string;
  deviceCategory: string;
  urgency: "HIGH" | "MEDIUM" | "ROUTINE";
  causes: string[];
  solutions: string[];
  safetyWarning: string | null;
  needsClarification: boolean;
  clarifyingQuestion: string | null;
  quickReplies: string[];
  recommendedServices: RecommendedServiceCard[];
  recommendedProducts: RecommendedProductCard[];
}

export interface AiToolCallRecord {
  toolName: "search_services" | "search_products";
  args: Record<string, unknown>;
  source: "HTTP_API" | "MYSQL_FALLBACK";
  matchedIds: string[];
  resultCount: number;
  durationMs: number;
}

export interface AiMediaAttachmentView {
  id: string;
  mediaType: "IMAGE" | "VIDEO_KEYFRAME";
  frameTimestampSec: number | null;
  mimeType: string;
  bytes: number;
  url: string;
  storagePath?: string;
}

export interface AiMessageView {
  id: string;
  sessionId: string;
  sender: "USER" | "ASSISTANT";
  contentText: string;
  structuredResponse: AiStructuredResponse | null;
  toolCalls: AiToolCallRecord[];
  media: AiMediaAttachmentView[];
  aiProvider: string | null;
  modelName: string | null;
  requestId: string | null;
  latencyMs: number | null;
  userFeedback: AiFeedbackValue | null;
  createdAt: string;
}

export interface AiSessionSummary {
  id: string;
  customerUserId: string | null;
  deviceCategory: string | null;
  problemSummary: string | null;
  aiProvider: string;
  modelName: string;
  avgLatencyMs: number | null;
  requestId: string | null;
  userFeedback: AiFeedbackValue | null;
  selectedServiceId: string | null;
  selectedProductId: string | null;
  turnCount: number;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiSessionDetail {
  session: AiSessionSummary;
  messages: AiMessageView[];
}

export interface AiMonitoringKpis {
  totalSessions: number;
  totalTurns: number;
  feedbackUpCount: number;
  feedbackDownCount: number;
  conversionCount: number;
  mediaSessionCount: number;
  avgLatencyMs: number | null;
}

export interface AiRuntimeConfigSummary {
  providerMode: AiProviderMode;
  model: GeminiModelOption;
  customAgentUrl: string | null;
  keyConfigured: boolean;
  keySource: "RAM" | "ENV" | "NONE";
  maskedKey: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  lastTestStatus: {
    ok: boolean;
    testedAt: string;
    message: string;
    latencyMs: number;
  } | null;
}

