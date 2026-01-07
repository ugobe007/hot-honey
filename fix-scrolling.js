/**
 * Quick fix script to add scrolling styles
 * This ensures the StartupMatches page can scroll properly
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/StartupMatches.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Check if we need to add scrolling fix
if (!content.includes('overflow-y-auto') && !content.includes('overflow: auto')) {
  // Find the main return div and ensure it allows scrolling
  content = content.replace(
    /return \(\s*<div className="[^"]*bg-gradient-to-br from-slate-900[^"]*">/,
    `return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ minHeight: '100vh' }}>`
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed scrolling in StartupMatches.tsx');
} else {
  console.log('✅ Scrolling styles already present');
}

console.log('\n📝 To test:');
console.log('   1. Refresh the page');
console.log('   2. Try scrolling with mouse wheel or trackpad');
console.log('   3. Check if CTA panel is visible at bottom');
