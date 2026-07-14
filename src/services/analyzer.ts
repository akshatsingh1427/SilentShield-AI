export type RiskLevel = 'low' | 'medium' | 'high';

export interface Highlight {
  text: string;
  start: number;
  end: number;
}

export interface AnalysisResult {
  score: number;
  level: RiskLevel;
  category: string;
  reasons: string[];
  highlights: Highlight[];
}

const URGENCY_PHRASES = [
  "act now", "verify immediately", "account suspended", "limited time",
  "urgent action required", "congratulations", "claim now", "your account has been locked",
  "action required", "immediate attention", "will be closed", "final notice",
  "verify your account", "suspend your account"
];

const CREDENTIAL_PHRASES = [
  "enter your password", "confirm your pin", "otp", "verify your identity",
  "click here to update your details", "confirm your bank details",
  "login to your account", "update your billing", "verify account", "social security",
  "one time password", "account details"
];

const INVOICE_PHRASES = [
  "invoice attached", "payment request", "receipt for your payment", "overdue invoice",
  "outstanding balance", "remittance advice", "payment instructions"
];

const BRAND_DOMAINS = [
  "amazon.com", "google.com", "paypal.com", "microsoft.com", "apple.com",
  "netflix.com", "facebook.com", "instagram.com", "whatsapp.com", "chase.com",
  "bankofamerica.com", "hdfcbank.com", "icicibank.com", "sbi.co.in", "irs.gov",
  "usps.com", "fedex.com", "dhl.com"
];

const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".club", ".support", ".click", ".work", ".loan", ".zip", 
  ".country", ".men", ".gq", ".tk", ".cf", ".ml", ".ga"
];

const URL_KEYWORDS = [
  "login", "secure", "verify", "account", "update", "bank", "support", "security", "billing", "auth"
];

function findMatches(text: string, phrases: string[]): { text: string; start: number; end: number }[] {
  const matches: Highlight[] = [];
  const lowerText = text.toLowerCase();
  
  phrases.forEach(phrase => {
    let index = -1;
    while ((index = lowerText.indexOf(phrase, index + 1)) !== -1) {
      matches.push({
        text: text.substring(index, index + phrase.length),
        start: index,
        end: index + phrase.length
      });
    }
  });
  
  return matches;
}

function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

export function analyzeUrl(urlString: string): AnalysisResult {
  let score = 0;
  const reasons: string[] = [];
  let category = "Safe";
  let domain = "";
  let tld = "";
  let host = "";

  try {
    // Basic formatting fixes if missing protocol
    const formattedUrl = urlString.startsWith('http') ? urlString : `http://${urlString}`;
    const url = new URL(formattedUrl);
    host = url.hostname.toLowerCase();
    
    // Check raw IP
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      score += 70;
      reasons.push("URL uses a raw IP address instead of a domain name.");
      category = "Phishing";
    }

    // Extract TLD
    const parts = host.split('.');
    if (parts.length > 1) {
      tld = '.' + parts.slice(-1)[0];
      domain = parts.slice(-2).join('.');
    }

    // Check suspicious TLDs
    if (SUSPICIOUS_TLDS.includes(tld)) {
      score += 40;
      reasons.push(`Uses highly suspicious Top-Level Domain (${tld}).`);
      category = "Phishing";
    }

    // Check Punycode
    if (host.includes('xn--')) {
      score += 80;
      reasons.push("Uses Punycode (homograph attack) to fake a real domain.");
      category = "Phishing";
    }

    // Subdomain depth
    if (parts.length > 3 && !host.includes('co.uk') && !host.includes('co.in')) {
      score += 20;
      reasons.push("Excessive subdomain depth, commonly used to hide suspicious domains.");
    }

    // Hyphens
    if ((host.match(/-/g) || []).length > 2) {
      score += 20;
      reasons.push("Excessive hyphens in domain name.");
    }

    // '@' trick - not caught by URL parser easily as it puts it in username/pwd, but we can check raw string
    if (urlString.includes('@') && !urlString.startsWith('mailto:')) {
      score += 60;
      reasons.push("Uses '@' trick in URL to obscure the true destination.");
      category = "Phishing";
    }

    // Typosquatting / Brand impersonation
    let isExactBrand = false;
    let closestBrand = "";
    
    for (const brand of BRAND_DOMAINS) {
      if (host === brand || host.endsWith('.' + brand)) {
        isExactBrand = true;
        break;
      }
      
      const distance = levenshtein(domain.split('.')[0] || "", brand.split('.')[0] || "");
      // If it's close but not exact (e.g. 1-2 characters off for longer words)
      if (distance > 0 && distance <= 2 && brand.length > 4) {
        closestBrand = brand;
        score += 80;
        reasons.push(`Domain looks like ${brand} but is subtly different (typosquatting).`);
        category = "Typosquatting";
      }
    }

    // Suspicious keywords in non-brand domain
    if (!isExactBrand) {
      for (const kw of URL_KEYWORDS) {
        if (host.includes(kw)) {
          score += 30;
          reasons.push(`Contains suspicious keyword '${kw}' without being an official brand domain.`);
          if (category === "Safe") category = "Phishing";
        }
      }
    }

  } catch (e) {
    score += 50;
    reasons.push("Malformed or unparseable URL.");
    category = "Suspicious";
  }

  score = Math.min(100, Math.max(0, score));
  let level: RiskLevel = 'low';
  if (score > 33) level = 'medium';
  if (score > 66) level = 'high';

  if (score <= 33 && category !== "Safe") {
    category = "Suspicious";
  }

  return {
    score,
    level,
    category,
    reasons,
    highlights: []
  };
}

export function analyzeText(text: string, mode: 'message' | 'email' | 'pdf'): AnalysisResult {
  let score = 0;
  const reasons: string[] = [];
  let category = "Unclassified";
  let highlights: Highlight[] = [];

  const lowerText = text.toLowerCase();

  // Find Urgency
  const urgencyMatches = findMatches(text, URGENCY_PHRASES);
  if (urgencyMatches.length > 0) {
    score += 30 + (urgencyMatches.length * 5);
    reasons.push(`Contains ${urgencyMatches.length} urgency/pressure phrases.`);
    highlights.push(...urgencyMatches);
  }

  // Find Credential requests
  const credMatches = findMatches(text, CREDENTIAL_PHRASES);
  if (credMatches.length > 0) {
    score += 40 + (credMatches.length * 10);
    reasons.push(`Requests credentials, OTPs, or sensitive information.`);
    highlights.push(...credMatches);
  }

  // Mode specific checks
  if (mode === 'pdf') {
    const invoiceMatches = findMatches(text, INVOICE_PHRASES);
    if (invoiceMatches.length > 0) {
      score += 35;
      reasons.push(`Contains suspicious invoice/payment request language.`);
      highlights.push(...invoiceMatches);
      category = "Payment/Invoice Scam";
    }
  }

  if (mode === 'email') {
    // Check for fake sender patterns (very basic heuristical check on text if headers are pasted)
    if (lowerText.includes("from:") && lowerText.includes("reply-to:")) {
      // rough heuristic
      score += 20;
      reasons.push("Contains mismatched From and Reply-To headers pattern.");
    }
  }

  // Categories checking (keyword clustering)
  const categoryKeywords = {
    "Lottery/Prize Scam": ["won", "lottery", "prize", "selected", "winner", "claim your reward", "gift card"],
    "Investment Scam": ["guaranteed returns", "crypto investment", "forex", "double your money", "risk-free"],
    "Job Offer Scam": ["part-time job", "work from home", "earn daily", "hiring now", "no experience required", "whatsapp us to apply"],
    "UPI/Payment Scam": ["scan qr to receive", "enter pin to receive", "payment failed click here"],
    "Crypto Scam": ["bitcoin", "wallet", "seed phrase", "airdrop", "yield"],
    "Government/Tax Scam": ["irs", "tax refund", "penalty", "arrest warrant", "social security suspended"],
    "Delivery/Courier Scam": ["package suspended", "delivery fee", "customs fee", "track your parcel", "failed delivery"]
  };

  let maxCatScore = 0;
  let bestCat = "Phishing";

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    let catScore = 0;
    const catMatches = findMatches(text, keywords);
    if (catMatches.length > 0) {
      catScore += catMatches.length;
      highlights.push(...catMatches);
    }
    if (catScore > maxCatScore) {
      maxCatScore = catScore;
      bestCat = cat;
    }
  }

  if (maxCatScore > 0 && category === "Unclassified") {
    category = bestCat;
  } else if (category === "Unclassified" && score > 33) {
    category = "Phishing";
  } else if (score <= 33) {
    category = "Safe";
  }

  // Analyze embedded URLs
  const urls = extractUrls(text);
  if (urls.length > 0) {
    reasons.push(`Found ${urls.length} embedded link(s).`);
    let maxUrlRisk = 0;
    for (const u of urls) {
      const uRes = analyzeUrl(u);
      if (uRes.score > maxUrlRisk) maxUrlRisk = uRes.score;
      if (uRes.reasons.length > 0) {
        reasons.push(`Link issue: ${uRes.reasons[0]}`);
      }
    }
    score += (maxUrlRisk * 0.6); // Weight URL risk into text risk
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  let level: RiskLevel = 'low';
  if (score > 33) level = 'medium';
  if (score > 66) level = 'high';
  
  // Deduplicate highlights by position
  const uniqueHighlights = [];
  const seen = new Set();
  for (const h of highlights) {
    const key = `${h.start}-${h.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueHighlights.push(h);
    }
  }

  return {
    score,
    level,
    category,
    reasons,
    highlights: uniqueHighlights
  };
}
