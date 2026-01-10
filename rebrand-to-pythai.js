const fs = require('fs');

const replacements = [
  { from: /Hot Money Honey/gi, to: 'pyth ai' },
  { from: /Hot Money/gi, to: 'pyth ai' },
  { from: /Hot Honey/gi, to: 'pyth ai' },
  { from: /hot honey/gi, to: 'pyth ai' },
  { from: /HOT MONEY!!!/g, to: 'DESTINED!!!' },
  { from: /🍯/g, to: '🔮' },
];

const filesToUpdate = [
  'src/components/CommandCenter.tsx',
  'src/components/HamburgerMenu.tsx',
  'src/components/HotMoneyBanner.tsx',
  'src/components/FrontPageNew.tsx',
  'src/components/HotMoneyVotingFlow.tsx',
  'src/components/voting.tsx',
  'src/components/StartupVotePopup.tsx',
  'src/lib/openaiDataService.ts',
  'src/pages/AdminInstructions.tsx',
  'src/store/portfolioStore.ts',
  'src/components/VCFirmCard.tsx',
  'src/data/investorData.ts',
  'src/pages/Home.tsx',
  'src/pages/SharedPortfolio.tsx',
  'src/pages/Submit.tsx',
  'src/pages/Privacy.tsx',
  'src/pages/InviteInvestorPage.tsx',
];

let updatedCount = 0;

filesToUpdate.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(file, content);
      updatedCount++;
      console.log(`✅ Updated: ${file}`);
    }
  } catch (err) {
    console.log(`⚠️  Could not update ${file}: ${err.message}`);
  }
});

console.log(`\n🎉 Updated ${updatedCount} files to "pyth ai" branding`);
