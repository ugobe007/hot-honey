/**
 * MCP Analytics Service - Direct SQL queries via MCP
 * Bypasses PostgREST cache issues
 */

export class MCPAnalyticsService {
  /**
   * Get dashboard summary stats
   */
  static async getDashboardSummary() {
    // This will be called via MCP from the frontend/API
    const query = `
      WITH funding_stats AS (
        SELECT 
          COUNT(*) as total_rounds,
          COUNT(DISTINCT startup_name) as unique_startups,
          SUM(amount_usd) as total_capital,
          AVG(amount_usd) as avg_round_size,
          COUNT(*) FILTER (WHERE announced_date >= CURRENT_DATE - INTERVAL '30 days') as rounds_last_30d
        FROM funding_rounds
      ),
      news_stats AS (
        SELECT 
          COUNT(*) as total_news,
          AVG(sentiment_score) as avg_sentiment,
          COUNT(*) FILTER (WHERE published_date >= CURRENT_TIMESTAMP - INTERVAL '7 days') as news_last_7d
        FROM startup_news
      )
      SELECT 
        f.total_rounds,
        f.unique_startups,
        f.total_capital,
        '$' || ROUND(f.total_capital / 1000000000.0, 2) || 'B' as total_capital_formatted,
        f.avg_round_size,
        '$' || ROUND(f.avg_round_size / 1000000.0, 1) || 'M' as avg_round_formatted,
        f.rounds_last_30d,
        n.total_news,
        ROUND(n.avg_sentiment::numeric, 2) as avg_sentiment,
        n.news_last_7d
      FROM funding_stats f
      CROSS JOIN news_stats n;
    `;

    return { query, description: 'Dashboard Summary Statistics' };
  }

  /**
   * Get top funding deals
   */
  static async getTopDeals(limit: number = 10) {
    const query = `
      SELECT 
        startup_name,
        round_type,
        amount_usd,
        '$' || ROUND(amount_usd / 1000000.0, 1) || 'M' as amount_formatted,
        TO_CHAR(announced_date, 'Mon DD, YYYY') as date,
        lead_investors,
        source,
        source_url,
        news_headline
      FROM funding_rounds
      ORDER BY amount_usd DESC
      LIMIT ${limit};
    `;

    return { query, description: `Top ${limit} Funding Deals` };
  }

  /**
   * Get top investors by deal count and capital
   */
  static async getTopInvestors() {
    const query = `
      WITH investor_deals AS (
        SELECT 
          UNNEST(lead_investors) as investor,
          amount_usd,
          round_type,
          startup_name
        FROM funding_rounds
        WHERE lead_investors IS NOT NULL
      )
      SELECT 
        investor,
        COUNT(*) as deal_count,
        SUM(amount_usd) as total_invested,
        '$' || ROUND(SUM(amount_usd) / 1000000.0, 1) || 'M' as total_invested_formatted,
        ROUND(AVG(amount_usd) / 1000000.0, 1) as avg_check_size_millions,
        ARRAY_AGG(DISTINCT round_type) as round_types,
        ARRAY_AGG(startup_name ORDER BY amount_usd DESC) as investments
      FROM investor_deals
      GROUP BY investor
      HAVING COUNT(*) >= 1
      ORDER BY total_invested DESC
      LIMIT 20;
    `;

    return { query, description: 'Top 20 Investors by Capital Deployed' };
  }

  /**
   * Get sector analysis
   */
  static async getSectorAnalysis() {
    const query = `
      WITH sector_classification AS (
        SELECT 
          startup_name,
          amount_usd,
          announced_date,
          CASE 
            WHEN startup_name ILIKE '%AI%' OR news_headline ILIKE '%AI%' OR news_headline ILIKE '%artificial%' THEN 'AI'
            WHEN startup_name ILIKE '%fintech%' OR news_headline ILIKE '%fintech%' OR news_headline ILIKE '%financial%' THEN 'Fintech'
            WHEN startup_name ILIKE '%health%' OR news_headline ILIKE '%health%' OR news_headline ILIKE '%medical%' THEN 'Healthcare'
            WHEN startup_name ILIKE '%robot%' OR news_headline ILIKE '%robot%' OR news_headline ILIKE '%automation%' THEN 'Robotics'
            WHEN startup_name ILIKE '%video%' OR news_headline ILIKE '%video%' OR news_headline ILIKE '%media%' THEN 'Media'
            WHEN startup_name ILIKE '%crypto%' OR news_headline ILIKE '%crypto%' OR news_headline ILIKE '%blockchain%' THEN 'Crypto'
            ELSE 'Other'
          END as sector
        FROM funding_rounds
      )
      SELECT 
        sector,
        COUNT(*) as round_count,
        SUM(amount_usd) as total_funding,
        '$' || ROUND(SUM(amount_usd) / 1000000.0, 1) || 'M' as total_funding_formatted,
        ROUND(AVG(amount_usd) / 1000000.0, 1) as avg_round_millions,
        COUNT(*) FILTER (WHERE announced_date >= CURRENT_DATE - INTERVAL '30 days') as recent_activity,
        ROUND((COUNT(*) FILTER (WHERE announced_date >= CURRENT_DATE - INTERVAL '30 days')::numeric / COUNT(*) * 100), 1) as momentum_pct
      FROM sector_classification
      WHERE sector != 'Other'
      GROUP BY sector
      ORDER BY total_funding DESC;
    `;

    return { query, description: 'Sector Analysis with Momentum' };
  }

  /**
   * Get momentum scores for startups
   */
  static async getMomentumScores() {
    const query = `
      WITH startup_metrics AS (
        SELECT 
          fr.startup_name,
          fr.amount_usd,
          fr.round_type,
          fr.announced_date,
          COUNT(DISTINCT sn.id) as news_count,
          AVG(sn.sentiment_score) as avg_sentiment,
          ARRAY_AGG(DISTINCT investor) FILTER (WHERE investor IS NOT NULL) as investors,
          EXTRACT(EPOCH FROM (CURRENT_DATE - fr.announced_date)) / 86400 as days_ago
        FROM funding_rounds fr
        LEFT JOIN startup_news sn ON fr.startup_name = sn.startup_name
        LEFT JOIN LATERAL UNNEST(fr.lead_investors) as investor ON true
        WHERE fr.announced_date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY fr.id, fr.startup_name, fr.amount_usd, fr.round_type, fr.announced_date
      )
      SELECT 
        startup_name,
        '$' || ROUND(amount_usd / 1000000.0, 1) || 'M' as funding_amount,
        round_type,
        TO_CHAR(announced_date, 'Mon DD, YYYY') as date,
        news_count,
        ROUND(COALESCE(avg_sentiment, 0)::numeric, 2) as sentiment,
        COALESCE(ARRAY_LENGTH(investors, 1), 0) as investor_count,
        investors,
        ROUND(
          (news_count * 0.3) + 
          (COALESCE(avg_sentiment, 0) * 10) + 
          ((90 - days_ago) / 90 * 5) +
          (COALESCE(ARRAY_LENGTH(investors, 1), 0) * 2)
        , 2) as momentum_score,
        ROUND(days_ago) as days_since_announcement
      FROM startup_metrics
      ORDER BY momentum_score DESC
      LIMIT 20;
    `;

    return { query, description: 'Top 20 Startups by Momentum Score' };
  }

  /**
   * Get recent news with sentiment
   */
  static async getRecentNews(limit: number = 20) {
    const query = `
      SELECT 
        id,
        startup_name,
        headline,
        summary,
        url,
        source,
        TO_CHAR(published_date, 'Mon DD, YYYY HH24:MI') as published,
        ROUND(sentiment_score::numeric, 2) as sentiment,
        CASE 
          WHEN sentiment_score > 0.3 THEN 'Positive'
          WHEN sentiment_score < -0.3 THEN 'Negative'
          ELSE 'Neutral'
        END as sentiment_label,
        category
      FROM startup_news
      ORDER BY published_date DESC
      LIMIT ${limit};
    `;

    return { query, description: `${limit} Most Recent News Items` };
  }

  /**
   * Get funding trends over time
   */
  static async getFundingTrends(days: number = 90) {
    const query = `
      SELECT 
        DATE_TRUNC('week', announced_date) as week,
        COUNT(*) as round_count,
        SUM(amount_usd) as total_amount,
        '$' || ROUND(SUM(amount_usd) / 1000000.0, 1) || 'M' as total_formatted,
        ROUND(AVG(amount_usd) / 1000000.0, 1) as avg_round_millions,
        ARRAY_AGG(DISTINCT round_type) as round_types
      FROM funding_rounds
      WHERE announced_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY week
      ORDER BY week DESC;
    `;

    return { query, description: `Funding Trends - Last ${days} Days` };
  }
}

export default MCPAnalyticsService;
