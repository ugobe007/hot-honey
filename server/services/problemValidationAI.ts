/**
 * PROBLEM VALIDATION AI SERVICE
 * Uses GPT-4 to analyze startup problem statements with VC-grade rigor
 * 
 * This is THE critical filter that makes Hot Money Honey world-class.
 * Based on Mitsubishi Chemical VC philosophy: If founders can't clearly
 * articulate the customer problem and prove it's worth solving, they
 * don't get matched to investors (regardless of other metrics).
 * 
 * Philosophy:
 * - "Solution in search of a problem" = automatic rejection
 * - Generic problems ("hiring is hard") = fail
 * - No customer validation = fail
 * - Founders who can't quantify the pain = fail
 * 
 * This single filter will dramatically improve investor NPS.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
});

// ===== INTERFACES =====

export interface ProblemValidationInput {
  // Required fields for analysis
  problem_statement: string;
  solution_description: string;
  target_customer: string;
  
  // Optional but highly valuable
  customer_interviews_conducted?: number;
  pilot_customers?: number;
  letters_of_intent?: number;
  contrarian_insight?: string;
  market_size?: number;
  tam_methodology?: string;
  
  // Founder context
  founder_background?: string;
  years_in_industry?: number;
  previous_companies?: string[];
  
  // Competitive context
  existing_solutions?: string[];
  why_now?: string;
}

export interface ProblemValidationResult {
  // Overall assessment
  passes_validation: boolean; // Hard pass/fail
  confidence: number; // 0-100 (how confident is the AI in this assessment)
  
  // Detailed scores (0-10 each)
  scores: {
    problem_clarity: number; // Can they articulate it clearly?
    customer_specificity: number; // Do they know WHO the customer is?
    pain_quantification: number; // Do they have data on the pain?
    market_validation: number; // Is it a real, valuable problem?
    founder_credibility: number; // Do they understand this space?
    problem_worth_solving: number; // Is the market big enough?
  };
  
  // Qualitative insights
  insights: {
    strengths: string[];
    critical_gaps: string[];
    red_flags: string[];
    investor_concerns: string[];
  };
  
  // Actionable guidance
  improvement_roadmap: Array<{
    issue: string;
    severity: 'critical' | 'major' | 'minor';
    recommendation: string;
    estimated_time_to_fix: string;
  }>;
  
  // Final recommendation
  recommendation: 'match_now' | 'improve_first' | 'reject';
  reasoning: string;
}

// ===== CORE VALIDATION FUNCTION =====

export async function validateProblem(
  input: ProblemValidationInput
): Promise<ProblemValidationResult> {
  
  console.log('🔬 Running Problem Validation AI...');
  
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistent, rigorous analysis
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Post-process and validate
    const validation = parseAndValidateResult(result, input);
    
    console.log(`✅ Problem Validation Complete: ${validation.recommendation}`);
    console.log(`   Problem Clarity: ${validation.scores.problem_clarity}/10`);
    console.log(`   Customer Specificity: ${validation.scores.customer_specificity}/10`);
    console.log(`   Worth Solving: ${validation.scores.problem_worth_solving}/10`);
    
    return validation;
    
  } catch (error) {
    console.error('❌ Problem Validation AI Error:', error);
    
    // Fail-safe: If AI fails, return conservative validation
    return createFailsafeValidation(input);
  }
}

// ===== SYSTEM PROMPT (VC PHILOSOPHY) =====

function buildSystemPrompt(): string {
  return `You are a world-class venture capital partner with 15+ years of experience evaluating early-stage startups. You built Mitsubishi Chemical's venture capital program and have reviewed thousands of deals.

Your job is to rigorously evaluate whether a startup has properly identified a customer problem worth solving. This is THE most critical filter in startup evaluation—more important than team, traction, or technology.

EVALUATION PHILOSOPHY:

1. PROBLEM CLARITY (0-10)
   - Can the founder clearly articulate the problem in specific terms?
   - Is it a real problem or a "solution in search of a problem"?
   - Red flags: Vague language, generic statements ("hiring is hard"), no specificity
   - Good signals: Concrete pain points, specific scenarios, quantified impact

2. CUSTOMER SPECIFICITY (0-10)
   - Do they know EXACTLY who the customer is?
   - Is the target customer narrowly defined or generic ("everyone needs this")?
   - Red flags: "Small businesses", "consumers", "enterprises" (too broad)
   - Good signals: "Head of Manufacturing at pharma companies with 500-2000 employees"

3. PAIN QUANTIFICATION (0-10)
   - Do they have DATA on the customer pain?
   - Have they talked to actual customers?
   - Red flags: No customer conversations, assumptions only, "we think people want this"
   - Good signals: 20+ customer interviews, pilot customers, letters of intent, specific pain metrics

4. MARKET VALIDATION (0-10)
   - Is this a real problem that customers will pay to solve?
   - Is the TAM calculation justified or hand-wavy?
   - Red flags: No willingness-to-pay evidence, TAM = "everyone", crowded market with 200 competitors
   - Good signals: Customers asking when it will be ready, prepaying customers, underserved segment

5. FOUNDER CREDIBILITY (0-10)
   - Did the founder LIVE this problem (domain expertise)?
   - Do they have years in this industry or are they tourists?
   - Red flags: No relevant experience, jumping on trend, "noticed this problem last month"
   - Good signals: 5+ years in industry, personally experienced the pain, deep customer relationships

6. PROBLEM WORTH SOLVING (0-10)
   - Is the market big enough to build a venture-scale business?
   - What are the implications if this problem is solved (technology impact, market disruption)?
   - Will solving this unlock adjacent opportunities?
   - Red flags: Small market, incremental improvement, low willingness to pay
   - Good signals: $1B+ TAM with justification, transformative impact, platform potential

CRITICAL FILTERS (Context-aware - founder credibility can override):

HIGH CREDIBILITY FOUNDERS (can pass with weaker validation):
- Ex-executives from industry leaders (e.g., Monster/Indeed for recruiting, Stripe for fintech)
- 10+ years domain expertise
- Previously built successful company in same space
- Deep customer relationships (50+ potential customers in network)
→ These founders get MORE BENEFIT OF THE DOUBT on validation
→ Can pass with generic problem IF they have domain expertise
→ Example: Ex-Monster VP building recruiting tool = credible even if problem is "hiring is hard"

MEDIUM CREDIBILITY FOUNDERS (standard validation required):
- 3-5 years in industry
- Worked at relevant companies but not in leadership
- Some customer validation (10-20 interviews)
→ Need solid problem clarity + some validation to pass

LOW CREDIBILITY FOUNDERS (MUST have exceptional validation):
- No industry experience
- Recent graduate or career switcher
- "Noticed this problem recently"
→ MUST have 20+ customer interviews, pilots, and deep problem clarity
→ Generic problems = automatic fail unless exceptional validation

JUDGMENT CRITERIA (WEIGHTED BY FOUNDER CREDIBILITY):

For HIGH credibility founders:
- passes_validation: true if average score >= 5.0 (lower bar)
- Generic problem OK if founder_credibility >= 8
- Can skip customer validation if founder_credibility >= 9 (they ARE the customer)

For MEDIUM credibility founders:
- passes_validation: true if average score >= 6.0 (standard bar)
- Need some validation (5+ interviews OR 1 pilot)

For LOW credibility founders:
- passes_validation: true if average score >= 7.0 (higher bar)
- MUST have customer validation (20+ interviews OR pilots)
- Generic problems = automatic fail

Be rigorous but context-aware. A domain expert with a generic problem statement is still investable. A tourist with perfect validation is questionable.

Return your analysis as JSON with this exact structure:
{
  "passes_validation": boolean,
  "confidence": number,
  "scores": {
    "problem_clarity": number,
    "customer_specificity": number,
    "pain_quantification": number,
    "market_validation": number,
    "founder_credibility": number,
    "problem_worth_solving": number
  },
  "insights": {
    "strengths": string[],
    "critical_gaps": string[],
    "red_flags": string[],
    "investor_concerns": string[]
  },
  "improvement_roadmap": [
    {
      "issue": string,
      "severity": "critical" | "major" | "minor",
      "recommendation": string,
      "estimated_time_to_fix": string
    }
  ],
  "recommendation": "match_now" | "improve_first" | "reject",
  "reasoning": string
}`;
}

// ===== USER PROMPT (STARTUP DATA) =====

function buildUserPrompt(input: ProblemValidationInput): string {
  return `Analyze this startup's problem validation:

PROBLEM STATEMENT:
${input.problem_statement}

SOLUTION DESCRIPTION:
${input.solution_description}

TARGET CUSTOMER:
${input.target_customer}

${input.customer_interviews_conducted ? `CUSTOMER INTERVIEWS: ${input.customer_interviews_conducted}` : '❌ No customer interviews reported'}

${input.pilot_customers ? `PILOT CUSTOMERS: ${input.pilot_customers}` : ''}
${input.letters_of_intent ? `LETTERS OF INTENT: ${input.letters_of_intent}` : ''}

${input.contrarian_insight ? `CONTRARIAN INSIGHT:\n${input.contrarian_insight}` : ''}

${input.market_size ? `MARKET SIZE (TAM): $${input.market_size}B` : '❌ No market size provided'}
${input.tam_methodology ? `TAM METHODOLOGY: ${input.tam_methodology}` : '❌ No TAM methodology provided'}

FOUNDER BACKGROUND:
${input.founder_background || 'Not provided'}
${input.years_in_industry ? `Years in Industry: ${input.years_in_industry}` : 'No industry experience reported'}
${input.previous_companies?.length ? `Previous Companies: ${input.previous_companies.join(', ')}` : ''}

${input.existing_solutions?.length ? `EXISTING SOLUTIONS IN MARKET:\n${input.existing_solutions.join('\n')}` : ''}

${input.why_now ? `WHY NOW:\n${input.why_now}` : ''}

---

Evaluate this startup with VC-grade rigor. Remember:
1. If they can't clearly articulate the problem, they fail
2. If target customer is too broad ("everyone"), they fail
3. If zero customer validation, they fail
4. If founder has no credibility and no validation, they fail

Be honest and direct. Investors appreciate brutal truth over false hope.`;
}

// ===== RESULT PARSING & VALIDATION =====

function parseAndValidateResult(
  aiResult: any,
  input: ProblemValidationInput
): ProblemValidationResult {
  
  // Calculate average score
  const scores = aiResult.scores || {};
  const scoreValues = Object.values(scores).filter(v => typeof v === 'number') as number[];
  const averageScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  
  // FOUNDER CREDIBILITY WEIGHTING
  const founderCredibility = scores.founder_credibility || 0;
  
  // Determine founder tier
  let founderTier: 'high' | 'medium' | 'low';
  let requiredScore: number;
  
  if (founderCredibility >= 8) {
    founderTier = 'high'; // Domain expert
    requiredScore = 5.0; // Lower bar
  } else if (founderCredibility >= 5) {
    founderTier = 'medium'; // Some experience
    requiredScore = 6.0; // Standard bar
  } else {
    founderTier = 'low'; // No domain expertise
    requiredScore = 7.0; // Higher bar
  }
  
  console.log(`   👤 Founder Tier: ${founderTier.toUpperCase()} (credibility: ${founderCredibility}/10)`);
  console.log(`   📊 Required Score: ${requiredScore}/10 (average: ${averageScore.toFixed(1)}/10)`);
  
  // Apply weighted validation
  let passes = aiResult.passes_validation ?? (averageScore >= requiredScore);
  let recommendation = aiResult.recommendation || 'improve_first';
  
  // CRITICAL FILTER 2: No customer validation (WEIGHTED by founder credibility)
  const hasValidation = (input.customer_interviews_conducted || 0) >= 5 ||
                       (input.pilot_customers || 0) >= 1 ||
                       (input.letters_of_intent || 0) >= 1;
  
  // HIGH credibility founders can skip validation (they ARE the customer)
  if (founderTier === 'high' && founderCredibility >= 9) {
    console.log(`   ✅ High-credibility founder - customer validation not required`);
  } 
  // MEDIUM credibility founders need some validation
  else if (founderTier === 'medium' && !hasValidation) {
    passes = false;
    if (recommendation === 'match_now') {
      recommendation = 'improve_first';
    }
    if (!aiResult.insights.critical_gaps) {
      aiResult.insights.critical_gaps = [];
    }
    aiResult.insights.critical_gaps.push('Need customer validation (5+ interviews or 1 pilot customer)');
  }
  // LOW credibility founders MUST have validation
  else if (founderTier === 'low' && (input.customer_interviews_conducted || 0) < 20 && !input.pilot_customers) {
    passes = false;
    recommendation = 'improve_first';
    if (!aiResult.insights.critical_gaps) {
      aiResult.insights.critical_gaps = [];
    }
    aiResult.insights.critical_gaps.push('Without domain expertise, need 20+ customer interviews or pilot customers');
  }
  
  // CRITICAL FILTER 1: Problem statement too short
  if (input.problem_statement.length < 50) {
    passes = false;
    recommendation = 'improve_first';
    if (!aiResult.insights.critical_gaps) {
      aiResult.insights.critical_gaps = [];
    }
    aiResult.insights.critical_gaps.push('Problem statement too vague (under 50 characters)');
  }
  
  // CRITICAL FILTER 3: Customer too broad (LESS strict for high-credibility founders)
  const broadCustomerKeywords = ['everyone', 'consumers', 'people', 'users', 'businesses', 'companies'];
  const isBroadCustomer = broadCustomerKeywords.some(keyword =>
    input.target_customer.toLowerCase().includes(keyword) &&
    input.target_customer.split(' ').length < 5
  );
  
  if (isBroadCustomer) {
    // High-credibility founders get a pass (they know the market)
    if (founderTier === 'high') {
      console.log(`   ⚠️  Broad customer definition but founder has domain expertise - acceptable`);
      scores.customer_specificity = Math.max(scores.customer_specificity || 0, 6); // Boost score
    } else {
      // Medium/Low credibility founders need specificity
      scores.customer_specificity = Math.min(scores.customer_specificity || 0, 4);
      if (!aiResult.insights.red_flags) {
        aiResult.insights.red_flags = [];
      }
      aiResult.insights.red_flags.push('Target customer too broad - need specific segment (especially without domain expertise)');
    }
  }
  
  return {
    passes_validation: passes,
    confidence: aiResult.confidence || 85,
    scores: {
      problem_clarity: scores.problem_clarity || 0,
      customer_specificity: scores.customer_specificity || 0,
      pain_quantification: scores.pain_quantification || 0,
      market_validation: scores.market_validation || 0,
      founder_credibility: scores.founder_credibility || 0,
      problem_worth_solving: scores.problem_worth_solving || 0,
    },
    insights: {
      strengths: aiResult.insights?.strengths || [],
      critical_gaps: aiResult.insights?.critical_gaps || [],
      red_flags: aiResult.insights?.red_flags || [],
      investor_concerns: aiResult.insights?.investor_concerns || [],
    },
    improvement_roadmap: aiResult.improvement_roadmap || [],
    recommendation,
    reasoning: aiResult.reasoning || 'Analysis complete',
  };
}

// ===== FAILSAFE (If AI errors) =====

function createFailsafeValidation(input: ProblemValidationInput): ProblemValidationResult {
  // Conservative validation if AI fails
  
  const hasBasicInfo = input.problem_statement.length >= 50 &&
                       input.solution_description.length >= 50 &&
                       input.target_customer.length >= 10;
  
  const hasValidation = (input.customer_interviews_conducted || 0) >= 5 ||
                       (input.pilot_customers || 0) >= 1;
  
  return {
    passes_validation: hasBasicInfo && hasValidation,
    confidence: 50, // Low confidence since AI failed
    scores: {
      problem_clarity: hasBasicInfo ? 5 : 2,
      customer_specificity: input.target_customer.length >= 20 ? 5 : 2,
      pain_quantification: hasValidation ? 6 : 2,
      market_validation: (input.market_size || 0) >= 1 ? 5 : 2,
      founder_credibility: (input.years_in_industry || 0) >= 3 ? 6 : 3,
      problem_worth_solving: (input.market_size || 0) >= 1 ? 5 : 2,
    },
    insights: {
      strengths: hasValidation ? ['Has customer validation'] : [],
      critical_gaps: ['AI analysis unavailable - manual review recommended'],
      red_flags: !hasBasicInfo ? ['Incomplete problem statement'] : [],
      investor_concerns: ['Unable to perform deep analysis'],
    },
    improvement_roadmap: [
      {
        issue: 'AI analysis failed',
        severity: 'major',
        recommendation: 'Manual review required before matching',
        estimated_time_to_fix: 'Immediate',
      },
    ],
    recommendation: hasBasicInfo && hasValidation ? 'improve_first' : 'reject',
    reasoning: 'Failsafe validation due to AI error',
  };
}

// ===== BATCH VALIDATION (For Multiple Startups) =====

export async function batchValidateProblems(
  startups: ProblemValidationInput[]
): Promise<Map<string, ProblemValidationResult>> {
  
  console.log(`🔬 Batch validating ${startups.length} startup problems...`);
  
  const results = new Map<string, ProblemValidationResult>();
  
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < startups.length; i += batchSize) {
    const batch = startups.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(startup => validateProblem(startup))
    );
    
    batch.forEach((startup, idx) => {
      // Use problem statement as key (or pass an ID)
      results.set(startup.problem_statement.substring(0, 50), batchResults[idx]);
    });
    
    // Rate limiting: wait 1 second between batches
    if (i + batchSize < startups.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ Batch validation complete: ${results.size} results`);
  
  return results;
}

// ===== QUICK VALIDATION CHECK (Without Full Analysis) =====

export function quickProblemCheck(input: ProblemValidationInput): {
  likely_passes: boolean;
  concerns: string[];
} {
  const concerns: string[] = [];
  
  // Check 1: Problem statement length
  if (input.problem_statement.length < 50) {
    concerns.push('Problem statement too short - needs more detail');
  }
  
  // Check 2: Customer specificity
  const broadKeywords = ['everyone', 'consumers', 'people', 'users', 'businesses'];
  if (broadKeywords.some(kw => input.target_customer.toLowerCase().includes(kw))) {
    concerns.push('Target customer too broad - need specific segment');
  }
  
  // Check 3: Customer validation
  const hasValidation = (input.customer_interviews_conducted || 0) >= 5 ||
                       (input.pilot_customers || 0) >= 1 ||
                       (input.letters_of_intent || 0) >= 1;
  
  if (!hasValidation) {
    concerns.push('No customer validation - need interviews or pilot customers');
  }
  
  // Check 4: Market size
  if (!input.market_size || input.market_size < 0.1) {
    concerns.push('Market size unclear or too small (<$100M TAM)');
  }
  
  // Check 5: Founder credibility
  if (!input.years_in_industry && !input.previous_companies?.length) {
    concerns.push('No founder domain expertise - risky for early-stage');
  }
  
  return {
    likely_passes: concerns.length <= 1, // Allow 1 minor concern
    concerns,
  };
}
