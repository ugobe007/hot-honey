import React, { useState } from 'react';
import DesignSystem from '../design/v2-system';
import { Link } from 'react-router-dom';

interface PortfolioItem {
  id: string;
  name: string;
  category: string;
  invested: number;
  currentValue: number;
  change: number;
  changePercent: number;
  status: 'rising' | 'falling' | 'stable';
}

const mockPortfolio: PortfolioItem[] = [
  {
    id: '1',
    name: 'EcoTech Solutions',
    category: 'GreenTech',
    invested: 10000,
    currentValue: 15000,
    change: 5000,
    changePercent: 50,
    status: 'rising'
  },
  {
    id: '2',
    name: 'AI Wellness Platform',
    category: 'HealthTech',
    invested: 8000,
    currentValue: 12000,
    change: 4000,
    changePercent: 50,
    status: 'rising'
  },
  {
    id: '3',
    name: 'Blockchain Education',
    category: 'EdTech',
    invested: 5000,
    currentValue: 4500,
    change: -500,
    changePercent: -10,
    status: 'falling'
  },
  {
    id: '4',
    name: 'Smart Agriculture',
    category: 'AgTech',
    invested: 12000,
    currentValue: 18000,
    change: 6000,
    changePercent: 50,
    status: 'rising'
  },
  {
    id: '5',
    name: 'FinTech Revolution',
    category: 'FinTech',
    invested: 15000,
    currentValue: 15000,
    change: 0,
    changePercent: 0,
    status: 'stable'
  }
];

const PortfolioPageV2: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'rising' | 'falling' | 'stable'>('all');

  const totalInvested = mockPortfolio.reduce((sum, item) => sum + item.invested, 0);
  const totalValue = mockPortfolio.reduce((sum, item) => sum + item.currentValue, 0);
  const totalGains = totalValue - totalInvested;
  const totalGainsPercent = ((totalGains / totalInvested) * 100);

  const filteredPortfolio = mockPortfolio.filter(item => 
    selectedFilter === 'all' || item.status === selectedFilter
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'rising': return DesignSystem.colors.caribbeanGreen;
      case 'falling': return DesignSystem.colors.texasRose;
      default: return DesignSystem.colors.steelGray;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch(status) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      default: return '➖';
    }
  };

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
              color: DesignSystem.colors.steelGray, 
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
              backgroundColor: DesignSystem.colors.caribbeanGreen
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
            fontSize: DesignSystem.typography.sizes.xxxl, 
            fontWeight: DesignSystem.typography.fontWeights.bold,
            margin: `0 0 ${DesignSystem.spacing.md} 0`,
            lineHeight: '1.2'
          }}>
            🔥 Your Investment Portfolio
          </h1>
          <p style={{ 
            fontSize: DesignSystem.typography.sizes.lg,
            color: DesignSystem.colors.wafer,
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Track your startup investments and watch your money grow with our hot deals.
          </p>
        </div>
      </section>

      {/* Portfolio Summary */}
      <section style={{ 
        backgroundColor: DesignSystem.colors.wafer,
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
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
                color: DesignSystem.colors.steelGray
              }}>
                {formatCurrency(totalInvested)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md,
                opacity: 0.8
              }}>
                Total Invested
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
                color: DesignSystem.colors.caribbeanGreen
              }}>
                {formatCurrency(totalValue)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md,
                opacity: 0.8
              }}>
                Current Value
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
                color: totalGains >= 0 ? DesignSystem.colors.caribbeanGreen : DesignSystem.colors.texasRose
              }}>
                {totalGains >= 0 ? '+' : ''}{formatCurrency(totalGains)}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md,
                opacity: 0.8
              }}>
                Total Gains ({totalGainsPercent.toFixed(1)}%)
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
                {mockPortfolio.length}
              </div>
              <div style={{ 
                color: DesignSystem.colors.steelGray,
                fontSize: DesignSystem.typography.sizes.md,
                opacity: 0.8
              }}>
                Active Investments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section style={{ 
        backgroundColor: DesignSystem.colors.snow,
        padding: `${DesignSystem.spacing.lg} ${DesignSystem.spacing.lg}`,
        borderBottom: `1px solid ${DesignSystem.colors.wafer}`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: DesignSystem.typography.sizes.xl,
            fontWeight: DesignSystem.typography.fontWeights.bold,
            color: DesignSystem.colors.steelGray,
            marginBottom: DesignSystem.spacing.md
          }}>
            Filter Investments
          </h2>
          <div style={{ display: 'flex', gap: DesignSystem.spacing.sm, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: '🔥 All Investments', count: mockPortfolio.length },
              { key: 'rising', label: '📈 Rising', count: mockPortfolio.filter(p => p.status === 'rising').length },
              { key: 'falling', label: '📉 Falling', count: mockPortfolio.filter(p => p.status === 'falling').length },
              { key: 'stable', label: '➖ Stable', count: mockPortfolio.filter(p => p.status === 'stable').length }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key as any)}
                style={{
                  backgroundColor: selectedFilter === filter.key ? DesignSystem.colors.caribbeanGreen : DesignSystem.colors.snow,
                  color: selectedFilter === filter.key ? DesignSystem.colors.snow : DesignSystem.colors.steelGray,
                  border: `2px solid ${DesignSystem.colors.steelGray}`,
                  padding: `${DesignSystem.spacing.sm} ${DesignSystem.spacing.md}`,
                  fontSize: DesignSystem.typography.sizes.md,
                  fontWeight: DesignSystem.typography.fontWeights.bold,
                  cursor: 'pointer'
                }}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Items */}
      <section style={{ 
        padding: `${DesignSystem.spacing.xl} ${DesignSystem.spacing.lg}`,
        backgroundColor: DesignSystem.colors.snow
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: DesignSystem.spacing.md 
          }}>
            {filteredPortfolio.map((item) => (
              <div 
                key={item.id}
                style={{
                  backgroundColor: DesignSystem.colors.snow,
                  border: `2px solid ${DesignSystem.colors.steelGray}`,
                  padding: DesignSystem.spacing.lg,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: DesignSystem.spacing.lg
                }}
              >
                {/* Company Info */}
                <div>
                  <h3 style={{ 
                    fontSize: DesignSystem.typography.sizes.lg,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    color: DesignSystem.colors.steelGray,
                    margin: '0 0 8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: DesignSystem.spacing.sm
                  }}>
                    🔥 {item.name}
                    <span style={{ 
                      fontSize: DesignSystem.typography.sizes.lg 
                    }}>
                      {getStatusIcon(item.status)}
                    </span>
                  </h3>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.sm,
                    color: DesignSystem.colors.texasRose,
                    fontWeight: DesignSystem.typography.fontWeights.bold
                  }}>
                    {item.category}
                  </div>
                </div>

                {/* Investment Amount */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.lg,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    color: DesignSystem.colors.steelGray
                  }}>
                    {formatCurrency(item.invested)}
                  </div>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.sm,
                    color: DesignSystem.colors.steelGray,
                    opacity: 0.8
                  }}>
                    Invested
                  </div>
                </div>

                {/* Current Value */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.lg,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    color: getStatusColor(item.status)
                  }}>
                    {formatCurrency(item.currentValue)}
                  </div>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.sm,
                    color: DesignSystem.colors.steelGray,
                    opacity: 0.8
                  }}>
                    Current Value
                  </div>
                </div>

                {/* Gains/Loss */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.lg,
                    fontWeight: DesignSystem.typography.fontWeights.bold,
                    color: getStatusColor(item.status)
                  }}>
                    {item.change >= 0 ? '+' : ''}{formatCurrency(item.change)}
                  </div>
                  <div style={{ 
                    fontSize: DesignSystem.typography.sizes.sm,
                    color: getStatusColor(item.status),
                    fontWeight: DesignSystem.typography.fontWeights.bold
                  }}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPortfolio.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: DesignSystem.spacing.xl,
              color: DesignSystem.colors.steelGray,
              opacity: 0.8
            }}>
              <div style={{ 
                fontSize: DesignSystem.typography.sizes.xl,
                marginBottom: DesignSystem.spacing.md
              }}>
                🔍
              </div>
              <div style={{ fontSize: DesignSystem.typography.sizes.lg }}>
                No investments found for the selected filter
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section style={{
        backgroundColor: DesignSystem.colors.caribbeanGreen,
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
            Ready to Invest More?
          </h2>
          <p style={{ 
            fontSize: DesignSystem.typography.sizes.lg,
            marginBottom: DesignSystem.spacing.lg,
            opacity: 0.9
          }}>
            Discover new hot deals and expand your startup portfolio today.
          </p>
          <Link 
            to="/v2/deals"
            style={{
              display: 'inline-block',
              backgroundColor: DesignSystem.colors.snow,
              color: DesignSystem.colors.caribbeanGreen,
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.xl}`,
              fontSize: DesignSystem.typography.sizes.lg,
              fontWeight: DesignSystem.typography.fontWeights.bold,
              marginRight: DesignSystem.spacing.md
            }}
          >
            🔥 Browse Deals
          </Link>
          <Link 
            to="/v2/vote"
            style={{
              display: 'inline-block',
              backgroundColor: 'transparent',
              color: DesignSystem.colors.snow,
              textDecoration: 'none',
              padding: `${DesignSystem.spacing.md} ${DesignSystem.spacing.xl}`,
              fontSize: DesignSystem.typography.sizes.lg,
              fontWeight: DesignSystem.typography.fontWeights.bold,
              border: `2px solid ${DesignSystem.colors.snow}`
            }}
          >
            🗳️ Vote on Startups
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PortfolioPageV2;