import React, { useState } from 'react';
import DesignSystem from '../design/v2-system';
import { Link } from 'react-router-dom';
import StartupCardV2 from '../components/StartupCardV2';
import startupData from '../data/startupData';

interface DashboardStats {
  totalInvestment: number;
  activeDeals: number;
  votesCast: number;
  portfolioValue: number;
  monthlyGrowth: number;
  topPerformer: string;
}

const mockStats: DashboardStats = {
  totalInvestment: 50000,
  activeDeals: 12,
  votesCast: 47,
  portfolioValue: 64500,
  monthlyGrowth: 12.5,
  topPerformer: 'EcoTech Solutions'
};

const recentActivity = [
  { id: '1', type: 'investment', message: 'Invested $5,000 in EcoTech Solutions', time: '2 hours ago', icon: '💰' },
  { id: '2', type: 'vote', message: 'Voted on AI Wellness Platform', time: '4 hours ago', icon: '🗳️' },
  { id: '3', type: 'profit', message: 'Smart Agriculture gained +15%', time: '1 day ago', icon: '📈' },
  { id: '4', type: 'investment', message: 'Invested $3,000 in FinTech Revolution', time: '2 days ago', icon: '💰' },
  { id: '5', type: 'vote', message: 'Voted on Blockchain Education', time: '3 days ago', icon: '🗳️' }
];

const DashboardPageV2: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  const handleVote = (startupId: string, voteType: 'positive' | 'negative') => {
    console.log(`Voted ${voteType} on startup ${startupId}`);
    // In a real app, you'd send this to your API
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getActivityIcon = (type: string): string => {
    switch(type) {
      case 'investment': return '💰';
      case 'vote': return '🗳️';
      case 'profit': return '📈';
      default: return '🔥';
    }
  };

  const getActivityColor = (type: string): string => {
    switch(type) {
      case 'investment': return DesignSystem.colors.texasRose;
      case 'vote': return DesignSystem.colors.caribbeanGreen;
      case 'profit': return DesignSystem.colors.caribbeanGreen;
      default: return DesignSystem.colors.steelGray;
    }
  };

  const featuredStartups = startupData.slice(0, 3);

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
            fontSize: DesignSystem.typography.sizes.xl, 
            fontWeight: DesignSystem.typography.fontWeights.bold,
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
            <Link to="/v2/dashboard" style={{ 
              color: DesignSystem.colors.steelGray, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              backgroundColor: DesignSystem.colors.caribbeanGreen
            }}>
              Dashboard
            </Link>
            <Link to="/v2/vote" style={{ 
              color: DesignSystem.colors.wafer, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              border: `1px solid ${DesignSystem.colors.wafer}`,
              backgroundColor: 'transparent'
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: DesignSystem.spacing.md }}>
            <div>
              <h1 style={{ 
                fontSize: DesignSystem.typography.sizes.xxxl, 
                fontWeight: DesignSystem.typography.fontWeights.bold,
                margin: `0 0 ${DesignSystem.spacing.sm} 0`,
                lineHeight: '1.2'
              }}>
                🔥 Investment Dashboard
              </h1>
              <p style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                color: DesignSystem.colors.wafer,
                margin: 0,
                lineHeight: '1.6'
              }}>
                Track your investments, discover hot deals, and grow your wealth.
              </p>
            </div>
            <div style={{ display: 'flex', gap: DesignSystem.spacing.sm }}>
              {['week', 'month', 'quarter'].map(timeframe => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe as any)}
                  style={{
                    backgroundColor: selectedTimeframe === timeframe ? DesignSystem.colors.caribbeanGreen : 'transparent',
                    color: selectedTimeframe === timeframe ? DesignSystem.colors.steelGray : DesignSystem.colors.wafer,
                    border: `1px solid ${selectedTimeframe === timeframe ? DesignSystem.colors.caribbeanGreen : DesignSystem.colors.wafer}`,
                    padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
                    fontSize: DesignSystem.typography.sizes.sm,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section style={{ 
        backgroundColor: DesignSystem.colors.wafer,
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
        borderBottom: `2px solid ${DesignSystem.colors.steelGray}`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: DesignSystem.spacing.lg
          }}>
            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                marginBottom: DesignSystem.spacing.sm
              }}>
                💰
              </div>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.steelGray
              }}>
                {formatCurrency(mockStats.totalInvestment)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.sm,
                opacity: 0.8
              }}>
                Total Investment
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                marginBottom: DesignSystem.spacing.sm
              }}>
                📈
              </div>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.caribbeanGreen
              }}>
                {formatCurrency(mockStats.portfolioValue)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.sm,
                opacity: 0.8
              }}>
                Portfolio Value
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                marginBottom: DesignSystem.spacing.sm
              }}>
                🔥
              </div>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.texasRose
              }}>
                {mockStats.activeDeals}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.sm,
                opacity: 0.8
              }}>
                Active Deals
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                marginBottom: DesignSystem.spacing.sm
              }}>
              🗳️
              </div>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.steelGray
              }}>
                {mockStats.votesCast}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.sm,
                opacity: 0.8
              }}>
                Votes Cast
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                marginBottom: DesignSystem.spacing.sm
              }}>
                📊
              </div>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.caribbeanGreen
              }}>
                +{mockStats.monthlyGrowth}%
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.sm,
                opacity: 0.8
              }}>
                Monthly Growth
              </div>
            </div>

            <div style={{ 
              backgroundColor: DesignSystem.colors.snow,
              padding: DesignSystem.spacing.lg,
              border: `2px solid ${DesignSystem.colors.steelGray}`,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.lg,
                marginBottom: DesignSystem.spacing.sm
              }}>
                🏆
              </div>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.md,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.steelGray,
                lineHeight: '1.2'
              }}>
                {mockStats.topPerformer}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.sm,
                opacity: 0.8
              }}>
                Top Performer
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ 
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
        backgroundColor: DesignSystem.colors.snow
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr',
            gap: DesignSystem.spacing.xl
          }}>
            
            {/* Featured Startups */}
            <div>
              <h2 style={{ 
                fontSize: DesignSystem.typography.sizes.xxl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.steelGray,
                marginBottom: DesignSystem.spacing.lg
              }}>
                🔥 Hot Startups This Week
              </h2>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: DesignSystem.spacing.md
              }}>
                {featuredStartups.map((startup: any) => (
                  <StartupCardV2 key={startup.id} startup={startup} onVote={handleVote} />
                ))}
              </div>
              <div style={{ 
                textAlign: 'center', 
                marginTop: DesignSystem.spacing.lg 
              }}>
                <Link 
                  to="/v2/deals"
                  style={{
                    display: 'inline-block',
                    backgroundColor: DesignSystem.colors.texasRose,
                    color: DesignSystem.colors.snow,
                    textDecoration: 'none',
                    padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.xl}`,
                    fontSize: DesignSystem.typography.sizes.md,
                    fontWeight: DesignSystem.typography.fontWeights.bold
                  }}
                >
                  🔥 View All Deals
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 style={{ 
                fontSize: DesignSystem.typography.sizes.xxl,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                color: DesignSystem.colors.steelGray,
                marginBottom: DesignSystem.spacing.lg
              }}>
                Recent Activity
              </h2>
              <div style={{ 
                backgroundColor: DesignSystem.colors.snow,
                border: `2px solid ${DesignSystem.colors.steelGray}`,
                padding: DesignSystem.spacing.lg
              }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: DesignSystem.spacing.md
                }}>
                  {recentActivity.map((activity) => (
                    <div 
                      key={activity.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: DesignSystem.spacing.sm,
                        paddingBottom: DesignSystem.spacing.md,
                        borderBottom: `1px solid ${DesignSystem.colors.wafer}`
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: getActivityColor(activity.type),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: DesignSystem.typography.sizes.md
                      }}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          color: DesignSystem.colors.steelGray,
                          fontSize: DesignSystem.typography.sizes.sm,
                          fontWeight: DesignSystem.typography.fontWeights.bold,
                          marginBottom: '4px'
                        }}>
                          {activity.message}
                        </div>
                        <div style={{ 
                          color: DesignSystem.colors.steelGray,
                          fontSize: DesignSystem.typography.sizes.xs,
                          opacity: 0.8
                        }}>
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: DesignSystem.spacing.lg 
                }}>
                  <Link 
                    to="/v2/portfolio"
                    style={{
                      color: DesignSystem.colors.caribbeanGreen,
                      textDecoration: 'none',
                      fontSize: DesignSystem.typography.sizes.sm,
                      fontWeight: DesignSystem.typography.fontWeights.bold
                    }}
                  >
                    View Portfolio →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section style={{
        backgroundColor: DesignSystem.colors.steelGray,
        color: DesignSystem.colors.snow,
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: DesignSystem.typography.sizes.xxl,
            fontWeight: DesignSystem.typography.fontWeights.bold,
            marginBottom: DesignSystem.spacing.md
          }}>
            Ready to Take Action?
          </h2>
          <p style={{ 
            fontSize: DesignSystem.typography.sizes.lg,
            marginBottom: DesignSystem.spacing.lg,
            color: DesignSystem.colors.wafer,
            opacity: 0.9
          }}>
            Vote on startups, discover new deals, or manage your growing portfolio.
          </p>
          <div style={{ 
            display: 'flex', 
            gap: DesignSystem.spacing.md, 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link 
              to="/v2/vote"
              style={{
                display: 'inline-block',
                backgroundColor: DesignSystem.colors.caribbeanGreen,
                color: DesignSystem.colors.snow,
                textDecoration: 'none',
                padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.lg}`,
                fontSize: DesignSystem.typography.sizes.md,
                fontWeight: DesignSystem.typography.fontWeights.bold
              }}
            >
              🗳️ Vote on Startups
            </Link>
            <Link 
              to="/v2/deals"
              style={{
                display: 'inline-block',
                backgroundColor: DesignSystem.colors.texasRose,
                color: DesignSystem.colors.snow,
                textDecoration: 'none',
                padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.lg}`,
                fontSize: DesignSystem.typography.sizes.md,
                fontWeight: DesignSystem.typography.fontWeights.bold
              }}
            >
              🔥 Browse Deals
            </Link>
            <Link 
              to="/v2/portfolio"
              style={{
                display: 'inline-block',
                backgroundColor: 'transparent',
                color: DesignSystem.colors.snow,
                textDecoration: 'none',
                padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.lg}`,
                fontSize: DesignSystem.typography.sizes.md,
                fontWeight: DesignSystem.typography.fontWeights.bold,
                border: `2px solid ${DesignSystem.colors.wafer}`
              }}
            >
              📊 View Portfolio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPageV2;