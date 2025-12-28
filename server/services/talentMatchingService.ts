/**
 * TALENT MATCHING SERVICE
 * Matches founders with key hires based on Ben Horowitz (a16z) framework:
 * - Courage alignment
 * - Intelligence alignment
 * - Work style match
 * - Skill complement
 * 
 * Based on the principle that great teams need aligned hustle/discipline
 */

interface FounderProfile {
  id: string;
  name: string;
  founder_courage?: 'low' | 'moderate' | 'high' | 'exceptional';
  founder_intelligence?: 'low' | 'moderate' | 'high' | 'exceptional';
  founder_speed?: number; // 0-3 from GOD score
  technical_cofounders?: number;
  sectors?: string[];
  stage?: string | number;
  location?: string;
}

interface TalentProfile {
  id: string;
  name: string;
  skill_type: 'technical' | 'business' | 'design' | 'operations' | 'sales' | 'marketing' | 'finance' | 'other';
  experience_level: 'junior' | 'mid' | 'senior' | 'executive';
  work_style?: 'fast-paced' | 'methodical' | 'balanced';
  risk_tolerance?: 'low' | 'moderate' | 'high';
  execution_speed?: 'fast' | 'moderate' | 'slow';
  candidate_courage?: 'low' | 'moderate' | 'high' | 'exceptional';
  candidate_intelligence?: 'low' | 'moderate' | 'high' | 'exceptional';
  previous_startup_experience?: boolean;
  sectors?: string[];
  stage_preference?: string[];
  location?: string;
  availability_status?: 'available' | 'exploring' | 'committed' | 'not_looking';
}

interface MatchResult {
  talent_id: string;
  talent_name: string;
  match_score: number; // 0-100
  match_reasons: string[];
  alignment_types: string[];
  details: {
    courage_match: number;
    intelligence_match: number;
    work_style_match: number;
    skill_complement: number;
    experience_bonus: number;
    sector_match: number;
  };
}

/**
 * Match a founder with potential key hires
 */
export function matchFounderToHires(
  founder: FounderProfile,
  talentPool: TalentProfile[],
  options: {
    minScore?: number;
    maxResults?: number;
    requiredSkills?: string[];
    excludeCommitted?: boolean;
  } = {}
): MatchResult[] {
  const {
    minScore = 40,
    maxResults = 10,
    requiredSkills = [],
    excludeCommitted = true
  } = options;

  // Filter talent pool
  let candidates = talentPool.filter(talent => {
    // Exclude committed if requested
    if (excludeCommitted && talent.availability_status === 'committed') {
      return false;
    }
    
    // Filter by required skills
    if (requiredSkills.length > 0 && !requiredSkills.includes(talent.skill_type)) {
      return false;
    }
    
    return true;
  });

  // Calculate match scores
  const matches: MatchResult[] = candidates.map(talent => {
    const match = calculateMatchScore(founder, talent);
    return {
      talent_id: talent.id,
      talent_name: talent.name,
      ...match
    };
  });

  // Filter by minimum score and sort
  const filteredMatches = matches
    .filter(m => m.match_score >= minScore)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, maxResults);

  return filteredMatches;
}

/**
 * Calculate match score between founder and candidate
 */
function calculateMatchScore(
  founder: FounderProfile,
  candidate: TalentProfile
): Omit<MatchResult, 'talent_id' | 'talent_name'> {
  let totalScore = 0;
  const reasons: string[] = [];
  const alignmentTypes: string[] = [];
  const details = {
    courage_match: 0,
    intelligence_match: 0,
    work_style_match: 0,
    skill_complement: 0,
    experience_bonus: 0,
    sector_match: 0
  };

  // 1. COURAGE ALIGNMENT (0-25 points)
  // High-courage founders need hires who can handle uncertainty
  const courageMatch = calculateCourageMatch(founder.founder_courage, candidate.candidate_courage);
  details.courage_match = courageMatch.score;
  totalScore += courageMatch.score;
  if (courageMatch.score > 0) {
    reasons.push(courageMatch.reason);
    alignmentTypes.push('courage_match');
  }

  // 2. INTELLIGENCE ALIGNMENT (0-25 points)
  // Strategic founders need analytical hires; execution founders need tactical
  const intelligenceMatch = calculateIntelligenceMatch(
    founder.founder_intelligence,
    candidate.candidate_intelligence
  );
  details.intelligence_match = intelligenceMatch.score;
  totalScore += intelligenceMatch.score;
  if (intelligenceMatch.score > 0) {
    reasons.push(intelligenceMatch.reason);
    alignmentTypes.push('intelligence_match');
  }

  // 3. WORK STYLE MATCH (0-20 points)
  // Fast founders need fast hires
  const workStyleMatch = calculateWorkStyleMatch(founder.founder_speed, candidate.execution_speed, candidate.work_style);
  details.work_style_match = workStyleMatch.score;
  totalScore += workStyleMatch.score;
  if (workStyleMatch.score > 0) {
    reasons.push(workStyleMatch.reason);
    alignmentTypes.push('work_style_match');
  }

  // 4. SKILL COMPLEMENT (0-20 points)
  // Technical founders need business hires, etc.
  const skillComplement = calculateSkillComplement(founder.technical_cofounders, candidate.skill_type);
  details.skill_complement = skillComplement.score;
  totalScore += skillComplement.score;
  if (skillComplement.score > 0) {
    reasons.push(skillComplement.reason);
    alignmentTypes.push('skill_complement');
  }

  // 5. STARTUP EXPERIENCE BONUS (0-10 points)
  if (candidate.previous_startup_experience) {
    details.experience_bonus = 10;
    totalScore += 10;
    reasons.push('Has previous startup experience');
  }

  // 6. SECTOR MATCH (0-10 points)
  const sectorMatch = calculateSectorMatch(founder.sectors, candidate.sectors);
  details.sector_match = sectorMatch.score;
  totalScore += sectorMatch.score;
  if (sectorMatch.score > 0) {
    reasons.push(sectorMatch.reason);
    alignmentTypes.push('sector_match');
  }

  return {
    match_score: Math.min(Math.round(totalScore), 100),
    match_reasons: reasons,
    alignment_types: alignmentTypes,
    details
  };
}

/**
 * Calculate courage alignment score
 */
function calculateCourageMatch(
  founderCourage?: string,
  candidateCourage?: string
): { score: number; reason: string } {
  if (!founderCourage || !candidateCourage) {
    return { score: 0, reason: '' };
  }

  const courageLevels = { low: 1, moderate: 2, high: 3, exceptional: 4 };

  const founderLevel = courageLevels[founderCourage as keyof typeof courageLevels] || 0;
  const candidateLevel = courageLevels[candidateCourage as keyof typeof courageLevels] || 0;

  // High-courage founders need high-courage hires (can handle uncertainty)
  if (founderLevel >= 3 && candidateLevel >= 3) {
    return { score: 25, reason: 'High courage alignment: Both can handle high-risk, high-uncertainty environments' };
  }
  
  // Moderate courage founders work well with moderate-high hires
  if (founderLevel === 2 && candidateLevel >= 2) {
    return { score: 15, reason: 'Moderate courage alignment: Balanced risk tolerance' };
  }
  
  // Low courage founders need at least moderate hires (someone has to take risks)
  if (founderLevel <= 1 && candidateLevel >= 2) {
    return { score: 10, reason: 'Courage complement: Candidate can help founder take calculated risks' };
  }

  return { score: 0, reason: '' };
}

/**
 * Calculate intelligence alignment score
 */
function calculateIntelligenceMatch(
  founderIntelligence?: string,
  candidateIntelligence?: string
): { score: number; reason: string } {
  if (!founderIntelligence || !candidateIntelligence) {
    return { score: 0, reason: '' };
  }

  const intelligenceLevels = { low: 1, moderate: 2, high: 3, exceptional: 4 };

  const founderLevel = intelligenceLevels[founderIntelligence as keyof typeof intelligenceLevels] || 0;
  const candidateLevel = intelligenceLevels[candidateIntelligence as keyof typeof intelligenceLevels] || 0;

  // Both high intelligence = strategic powerhouse
  if (founderLevel >= 3 && candidateLevel >= 3) {
    return { score: 25, reason: 'High intelligence alignment: Strategic powerhouse team' };
  }
  
  // High founder + moderate candidate = good complement
  if (founderLevel >= 3 && candidateLevel === 2) {
    return { score: 20, reason: 'Intelligence complement: Strategic founder + analytical hire' };
  }
  
  // Moderate founder + high candidate = can elevate team
  if (founderLevel === 2 && candidateLevel >= 3) {
    return { score: 18, reason: 'Intelligence boost: High-intelligence candidate can elevate team' };
  }
  
  // Both moderate = solid
  if (founderLevel === 2 && candidateLevel === 2) {
    return { score: 15, reason: 'Moderate intelligence alignment: Solid analytical foundation' };
  }

  return { score: 0, reason: '' };
}

/**
 * Calculate work style match
 */
function calculateWorkStyleMatch(
  founderSpeed?: number,
  candidateExecutionSpeed?: string,
  candidateWorkStyle?: string
): { score: number; reason: string } {
  let score = 0;
  let reason = '';

  // Fast founders (speed >= 2) need fast hires
  if (founderSpeed !== undefined && founderSpeed >= 2) {
    if (candidateExecutionSpeed === 'fast' || candidateWorkStyle === 'fast-paced') {
      score = 20;
      reason = 'Fast execution alignment: Both move quickly and ship frequently';
    } else if (candidateExecutionSpeed === 'moderate' || candidateWorkStyle === 'balanced') {
      score = 12;
      reason = 'Moderate execution alignment: Candidate can keep pace';
    }
  }
  
  // Moderate founders work well with balanced hires
  else if (founderSpeed !== undefined && founderSpeed >= 1) {
    if (candidateExecutionSpeed === 'moderate' || candidateWorkStyle === 'balanced') {
      score = 15;
      reason = 'Balanced work style: Compatible execution pace';
    } else if (candidateExecutionSpeed === 'fast' || candidateWorkStyle === 'fast-paced') {
      score = 10;
      reason = 'Candidate can accelerate team velocity';
    }
  }

  return { score, reason };
}

/**
 * Calculate skill complement
 */
function calculateSkillComplement(
  technicalCofounders?: number,
  candidateSkillType?: string
): { score: number; reason: string } {
  // Technical founders need business/operations/sales hires
  if (technicalCofounders !== undefined && technicalCofounders > 0) {
    if (['business', 'operations', 'sales', 'marketing', 'finance'].includes(candidateSkillType || '')) {
      return { 
        score: 20, 
        reason: `Skill complement: Technical founder + ${candidateSkillType} hire = balanced team` 
      };
    }
  }
  
  // Non-technical founders need technical hires
  else {
    if (candidateSkillType === 'technical') {
      return { 
        score: 20, 
        reason: 'Skill complement: Non-technical founder + technical hire = critical gap filled' 
      };
    }
  }

  // Same skill type can still be valuable (e.g., senior technical + junior technical)
  if (candidateSkillType) {
    return { score: 5, reason: `Skill match: ${candidateSkillType} expertise` };
  }

  return { score: 0, reason: '' };
}

/**
 * Calculate sector match
 */
function calculateSectorMatch(
  founderSectors?: string[],
  candidateSectors?: string[]
): { score: number; reason: string } {
  if (!founderSectors || !candidateSectors || founderSectors.length === 0 || candidateSectors.length === 0) {
    return { score: 0, reason: '' };
  }

  // Check for overlap
  const founderSectorsLower = founderSectors.map(s => s.toLowerCase());
  const candidateSectorsLower = candidateSectors.map(s => s.toLowerCase());
  
  const overlap = founderSectorsLower.filter(s => 
    candidateSectorsLower.some(cs => cs.includes(s) || s.includes(cs))
  );

  if (overlap.length > 0) {
    return { 
      score: 10, 
      reason: `Sector match: Both interested in ${overlap[0]}` 
    };
  }

  return { score: 0, reason: '' };
}

/**
 * Get match quality tier
 */
export function getMatchQualityTier(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}





