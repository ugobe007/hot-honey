import React, { useState } from 'react';
import startupData from '../data/startupData';
import DesignSystem from '../design/v2-system';
import { Link } from 'react-router-dom';

interface VotePageV2Props {}

interface VoteData {
  [key: string]: {
    positive: number;
    negative: number;
  };
}

const VotePageV2: React.FC<VotePageV2Props> = () => {
  const [votes, setVotes] = useState<VoteData>({});

  const handleVote = (startupId: string, voteType: 'positive' | 'negative') => {
    setVotes(prev => ({
      ...prev,
      [startupId]: {
        positive: prev[startupId]?.positive || 0,
        negative: prev[startupId]?.negative || 0,
        [voteType]: (prev[startupId]?.[voteType] || 0) + 1
      }
    }));
  };

  const getVoteScore = (startupId: string): number => {
    const voteData = votes[startupId];
    if (!voteData) return 0;
    return voteData.positive - voteData.negative;
  };

  const sortedStartups = startupData
    .map((startup: any) => ({
      ...startup,
      score: getVoteScore(startup.id)
    }))
    .sort((a: any, b: any) => b.score - a.score);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: DesignSystem.colors.snow,
      fontFamily: DesignSystem.typography.fontFamily 
    }}>
      {/* Navigation */}
      <nav style={{
        backgroundColor: DesignSystem.colors.steelGray,
        padding: DesignSystem.spacing.lg,
        borderBottom: `2px solid ${DesignSystem.colors.caribbeanGreen}`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/v2" style={{ 
            fontSize: DesignSystem.typography.fontSize.xl,
            fontWeight: DesignSystem.typography.fontWeight.bold,
            color: DesignSystem.colors.snow,
            textDecoration: 'none'
          }}>
            🔥 Hot Money Honey
          </Link>
          <div style={{ display: 'flex', gap: DesignSystem.spacing.md }}>
            <Link to="/v2" style={{ 
              color: DesignSystem.colors.wafer, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              border: `1px solid ${DesignSystem.colors.wafer}`,
              backgroundColor: 'transparent'
            }}>
              Home
            </Link>
            <Link to="/v2/vote" style={{ 
              color: DesignSystem.colors.steelGray, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              backgroundColor: DesignSystem.colors.caribbeanGreen
            }}>
              Vote
            </Link>
            <Link to="/v2/deals" style={{ 
              color: DesignSystem.colors.wafer, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              border: `1px solid ${DesignSystem.colors.wafer}`,
              backgroundColor: 'transparent'
            }}>
              Deals
            </Link>
            <Link to="/v2/portfolio" style={{ 
              color: DesignSystem.colors.wafer, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              border: `1px solid ${DesignSystem.colors.wafer}`,
              backgroundColor: 'transparent'
            }}>
              Portfolio
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section style={{
        backgroundColor: DesignSystem.colors.steelGray,
        color: DesignSystem.colors.snow,
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: DesignSystem.typography.fontSize['5xl'], 
            fontWeight: DesignSystem.typography.fontWeight.bold,
            margin: `0 0 ${DesignSystem.spacing.md} 0`,
            lineHeight: '1.2'
          }}>
            🔥 Vote on Hot Startups
          </h1>
          <p style={{ 
            fontSize: DesignSystem.typography.fontSize.lg,
            color: DesignSystem.colors.wafer,
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Cast your vote and help discover the next big thing. Your voice drives our investment decisions.
          </p>
        </div>
      </section>

      {/* Voting Stats */}
      <section style={{ 
        backgroundColor: DesignSystem.colors.wafer,
        padding: `${DesignSystem.spacing.lg} ${DesignSystem.spacing.lg}`,
        borderBottom: `2px solid ${DesignSystem.colors.steelGray}`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: DesignSystem.spacing.lg
          }}>
            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xxl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.caribbeanGreen
              }}>
                {Object.values(votes).reduce((sum, vote) => sum + vote.positive, 0)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md 
              }}>
                Positive Votes Cast
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xxl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.texasRose
              }}>
                {Object.values(votes).reduce((sum, vote) => sum + vote.negative, 0)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md 
              }}>
                Negative Votes Cast
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xxl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.steelGray
              }}>
                {startupData.length}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md 
              }}>
                Startups to Vote On
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voting List */}
      <section style={{ 
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
        backgroundColor: DesignSystem.colors.snow
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: DesignSystem.typography.sizes.xxl,
            fontWeight: DesignSystem.typography.fontWeights.bold,
            color: DesignSystem.colors.steelGray,
            marginBottom: DesignSystem.spacing.lg,
            textAlign: 'center'
          }}>
            Current Rankings
          </h2>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: DesignSystem.spacing.md 
          }}>
            {sortedStartups.map((startup: any, index: number) => (
              <div 
                key={startup.id}
                style={{
                  backgroundColor: DesignSystem.colors.snow,
                  border: `2px solid ${DesignSystem.colors.steelGray}`,
                  padding: DesignSystem.spacing.lg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: DesignSystem.spacing.lg
                }}
              >
                {/* Rank */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: index === 0 ? DesignSystem.colors.caribbeanGreen : 
                                   index === 1 ? DesignSystem.colors.texasRose :
                                   DesignSystem.colors.wafer,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: index < 2 ? DesignSystem.colors.snow : DesignSystem.colors.steelGray,
                  fontSize: DesignSystem.typography.sizes.xl,
                  fontWeight: DesignSystem.typography.fontWeights.bold
                }}>
                  #{index + 1}
                </div>

                {/* Startup Info */}
                <div style={{ flex: '1' }}>
                  <h3 style={{ 
                    fontSize: DesignSystem.typography.sizes.lg,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    color: DesignSystem.colors.steelGray,
                    margin: '0 0 8px 0'
                  }}>
                    🔥 {startup.name}
                  </h3>
                  <p style={{ 
                    color: DesignSystem.colors.steelGray,
                    margin: '0 0 8px 0',
                    opacity: 0.8
                  }}>
                    {startup.description}
                  </p>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.sm,
                    color: DesignSystem.colors.texasRose
                  }}>
                    {startup.category} • ${startup.fundingGoal}
                  </div>
                </div>

                {/* Score */}
                <div style={{ 
                  textAlign: 'center',
                  minWidth: '80px'
                }}>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.xl,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    color: startup.score >= 0 ? DesignSystem.colors.caribbeanGreen : DesignSystem.colors.texasRose
                  }}>
                    {startup.score >= 0 ? '+' : ''}{startup.score}
                  </div>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.sm,
                    color: DesignSystem.colors.steelGray,
                    opacity: 0.8
                  }}>
                    Score
                  </div>
                </div>

                {/* Voting Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: DesignSystem.spacing.sm 
                }}>
                  <button
                    onClick={() => handleVote(startup.id, 'positive')}
                    style={{
                      backgroundColor: DesignSystem.colors.caribbeanGreen,
                      color: DesignSystem.colors.snow,
                      border: 'none',
                      padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
                      fontSize: DesignSystem.typography.sizes.md,
                      fontWeight: DesignSystem.typography.fontWeights.bold,
                      cursor: 'pointer',
                      minWidth: '80px'
                    }}
                  >
                    👍 UP
                  </button>
                  <button
                    onClick={() => handleVote(startup.id, 'negative')}
                    style={{
                      backgroundColor: DesignSystem.colors.texasRose,
                      color: DesignSystem.colors.snow,
                      border: 'none',
                      padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
                      fontSize: DesignSystem.typography.sizes.md,
                      fontWeight: DesignSystem.typography.fontWeights.bold,
                      cursor: 'pointer',
                      minWidth: '80px'
                    }}
                  >
                    👎 DOWN
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section style={{
        backgroundColor: DesignSystem.colors.texasRose,
        color: DesignSystem.colors.snow,
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: DesignSystem.typography.sizes.xxl,
            fontWeight: DesignSystem.typography.fontWeights.bold,
            marginBottom: DesignSystem.spacing.md
          }}>
            Ready to See the Results?
          </h2>
          <p style={{ 
            fontSize: DesignSystem.typography.sizes.lg,
            marginBottom: DesignSystem.spacing.lg,
            opacity: 0.9
          }}>
            Check out our portfolio of winning startups and track your investments.
          </p>
          <Link 
            to="/v2/portfolio"
            style={{
              display: 'inline-block',
              backgroundColor: DesignSystem.colors.snow,
              color: DesignSystem.colors.texasRose,
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.xl}`,
              fontSize: DesignSystem.typography.sizes.lg,
              fontWeight: DesignSystem.typography.fontWeights.bold
            }}
          >
            🔥 View Portfolio
          </Link>
        </div>
      </section>
    </div>
  );
};

export default VotePageV2;