import OpenAI from 'openai';

// Lazy initialization - only create client when API key is available
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, this should be done server-side
    });
  }
  
  return openaiClient;
}

export interface InvestorResearchData {
  name: string;
  type: 'vc_firm' | 'accelerator' | 'angel_network' | 'corporate_vc';
  tagline?: string;
  description?: string;
  website: string;
  linkedin?: string;
  twitter?: string;
  aum?: string;
  fundSize?: string;
  checkSize?: string;
  stage?: string[];
  sectors?: string[];
  geography?: string;
  portfolioCount?: number;
  exits?: number;
  unicorns?: number;
  notableInvestments?: string[];
  contactEmail?: string;
}

export async function researchInvestor(
  websiteUrl: string,
  linkedinUrl?: string,
  investorName?: string
): Promise<InvestorResearchData> {
  const prompt = `You are a venture capital research assistant. Research the following investor firm and provide detailed information.

Website: ${websiteUrl}
${linkedinUrl ? `LinkedIn: ${linkedinUrl}` : ''}
${investorName ? `Name: ${investorName}` : ''}

Please analyze the website and provide the following information in JSON format:

{
  "name": "Official firm name",
  "type": "vc_firm | accelerator | angel_network | corporate_vc",
  "tagline": "Their main tagline or motto",
  "description": "2-3 sentence description of what they do and their investment philosophy",
  "website": "${websiteUrl}",
  "linkedin": "${linkedinUrl || ''}",
  "twitter": "Twitter/X handle if found",
  "aum": "Assets under management (e.g., '$10B')",
  "fundSize": "Latest fund size if mentioned",
  "checkSize": "Typical check size (e.g., '$1M - $10M')",
  "stage": ["pre_seed", "seed", "series_a", "series_b", "series_c", "growth", "late_stage"],
  "sectors": ["Array of focus sectors like 'AI/ML', 'Fintech', 'Healthcare', etc."],
  "geography": "Primary geographic focus (e.g., 'Global', 'US', 'Europe')",
  "portfolioCount": estimated_number_of_portfolio_companies,
  "exits": estimated_number_of_exits,
  "unicorns": estimated_number_of_unicorns,
  "notableInvestments": ["Array of 5-8 notable portfolio companies"],
  "contactEmail": "Contact email if found"
}

IMPORTANT: 
- Be accurate and only include information you can verify or reasonably infer
- For arrays like stage and sectors, include all that apply
- Use null for any field you cannot determine
- For type, choose the most accurate: vc_firm for venture capital, accelerator for Y Combinator-style programs, angel_network for angel investor groups, corporate_vc for corporate venture arms
- Return ONLY valid JSON, no additional text`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a venture capital research assistant that provides accurate, structured data about investment firms. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const data = JSON.parse(content) as InvestorResearchData;
    
    // Ensure required fields
    if (!data.name) {
      data.name = investorName || 'Unknown Investor';
    }
    if (!data.type) {
      data.type = 'vc_firm';
    }
    data.website = websiteUrl;
    if (linkedinUrl) {
      data.linkedin = linkedinUrl;
    }

    return data;
  } catch (error) {
    console.error('Error researching investor:', error);
    throw new Error('Failed to research investor. Please try manual entry.');
  }
}

export async function enrichInvestorData(
  basicData: Partial<InvestorResearchData>
): Promise<InvestorResearchData> {
  if (!basicData.website) {
    throw new Error('Website URL is required for enrichment');
  }

  const enrichedData = await researchInvestor(
    basicData.website,
    basicData.linkedin,
    basicData.name
  );

  // Merge with any provided data (provided data takes precedence)
  return {
    ...enrichedData,
    ...basicData,
  } as InvestorResearchData;
}
