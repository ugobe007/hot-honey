const fs = require('fs');
const path = 'src/components/InvestorCard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Better check size formatting (handle K and M)
const oldFormatCheckSize = `const formatCheckSize = () => {
    if (investor.checkSize) return investor.checkSize;
    if (investor.check_size_min && investor.check_size_max) {
      return \`\$\${(investor.check_size_min / 1000000).toFixed(1)}M - \$\${(investor.check_size_max / 1000000).toFixed(1)}M\`;
    }
    return 'Contact for details';
  };`;

const newFormatCheckSize = `const formatCheckSize = () => {
    if (investor.checkSize) return investor.checkSize;
    if (investor.check_size_min && investor.check_size_max) {
      const formatAmount = (amt: number) => {
        if (amt >= 1000000) return \`\$\${(amt / 1000000).toFixed(1)}M\`;
        if (amt >= 1000) return \`\$\${(amt / 1000).toFixed(0)}K\`;
        return \`\$\${amt}\`;
      };
      return \`\${formatAmount(investor.check_size_min)} - \${formatAmount(investor.check_size_max)}\`;
    }
    return 'Contact for details';
  };`;

if (content.includes(oldFormatCheckSize)) {
  content = content.replace(oldFormatCheckSize, newFormatCheckSize);
  console.log('✅ Fixed check size formatting');
} else {
  console.log('⚠️  Check size already fixed or pattern not found');
}

// Fix 2: Replace the thesis section with a comprehensive info section
const oldThesisSection = `{/* Investment Thesis */}
            {investor.investmentThesis && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Investment Thesis</span>
                </div>
                <div className="text-white text-sm leading-relaxed">
                  {investor.investmentThesis}
                </div>
              </div>
            )}`;

const newThesisSection = `{/* Investment Thesis or Bio */}
            {(investor.investmentThesis || investor.bio) && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {investor.investmentThesis ? 'Investment Thesis' : 'About'}
                  </span>
                </div>
                <div className="text-white text-sm leading-relaxed">
                  {investor.investmentThesis || investor.bio}
                </div>
              </div>
            )}
            
            {/* Blog/Website Link */}
            {investor.blog_url && (
              <div className="mb-4">
                <a 
                  href={investor.blog_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}`;

if (content.includes(oldThesisSection)) {
  content = content.replace(oldThesisSection, newThesisSection);
  console.log('✅ Added thesis/bio fallback and blog link');
} else {
  console.log('⚠️  Thesis section pattern not found');
}

// Fix 3: Update notable investments to handle snake_case from DB
const oldNotableSection = `{/* Notable investments */}
            {investor.notableInvestments && investor.notableInvestments.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Portfolio</span>
                </div>
                <div className="text-white text-sm leading-relaxed">
                  {investor.notableInvestments.slice(0, 5).map(inv => 
                    typeof inv === 'string' ? inv : (inv as any).name || (inv as any).company
                  ).join(', ')}
                  {investor.notableInvestments.length > 5 && (
                    <span className="text-slate-400"> +{investor.notableInvestments.length - 5} more</span>
                  )}
                </div>
              </div>
            )}`;

const newNotableSection = `{/* Notable Investments */}
            {((investor.notableInvestments && investor.notableInvestments.length > 0) || 
              (investor.notable_investments && investor.notable_investments.length > 0)) && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notable Investments</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(investor.notableInvestments || investor.notable_investments || []).slice(0, 6).map((inv: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-medium">
                      {typeof inv === 'string' ? inv : inv?.name || inv?.company}
                    </span>
                  ))}
                  {(investor.notableInvestments || investor.notable_investments || []).length > 6 && (
                    <span className="px-2 py-0.5 text-slate-400 text-xs">
                      +{(investor.notableInvestments || investor.notable_investments).length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}`;

if (content.includes(oldNotableSection)) {
  content = content.replace(oldNotableSection, newNotableSection);
  console.log('✅ Updated notable investments with pill styling');
} else {
  console.log('⚠️  Notable investments section not found, trying alternate');
}

// Add Globe and ExternalLink imports if not present
if (!content.includes('Globe,') && !content.includes('Globe }')) {
  content = content.replace(
    "import { Award,",
    "import { Award, Globe, ExternalLink,"
  );
  console.log('✅ Added Globe and ExternalLink imports');
}

fs.writeFileSync(path, content);
console.log('\n✅ InvestorCard.tsx updated!');
