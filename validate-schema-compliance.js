/**
 * Schema Compliance Validation Script
 * 
 * Validates that code uses correct database table and column names.
 * 
 * Run: node validate-schema-compliance.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_RULES = {
  tables: {
    wrong: ['startups', 'matches'],
    correct: {
      'startups': 'startup_uploads',
      'matches': 'startup_investor_matches'
    }
  },
  investorColumns: {
    wrong: ['portfolio_size', 'portfolio_count', 'check_size', 'sector_focus', 'stage_focus'],
    correct: {
      'portfolio_size': 'total_investments',
      'portfolio_count': 'total_investments',
      'check_size': 'check_size_min and check_size_max',
      'sector_focus': 'sectors',
      'stage_focus': 'stage',
      'exits': 'successful_exits'
    }
  },
  discoveredStartupsColumns: {
    wrong: ['url', 'source', 'imported_to_review'],
    correct: {
      'url': 'website',
      'source': 'article_url',
      'imported_to_review': 'imported_to_startups'
    }
  }
};

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...findFiles(fullPath, extensions));
    } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for wrong table names
  for (const [wrong, correct] of Object.entries(SCHEMA_RULES.tables.correct)) {
    const regex = new RegExp(`\\.from\\(['"]${wrong}['"]\\)`, 'g');
    const matches = content.match(regex);
    if (matches) {
      issues.push({
        type: 'wrong_table',
        file: filePath,
        wrong,
        correct,
        count: matches.length
      });
    }
  }
  
  // Check for wrong investor column names
  for (const [wrong, correct] of Object.entries(SCHEMA_RULES.investorColumns.correct)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
    const matches = content.match(regex);
    if (matches && !content.includes(`// SSOT`) && !content.includes(`// CORRECT`)) {
      // Skip if it's in a comment or already marked as correct
      const lines = content.split('\n');
      const problematicLines = [];
      matches.forEach((_, index) => {
        const lineNum = content.substring(0, content.indexOf(matches[index])).split('\n').length;
        const line = lines[lineNum - 1];
        if (!line.includes('//') && !line.includes('SSOT') && !line.includes('CORRECT')) {
          problematicLines.push({ line: lineNum, content: line.trim() });
        }
      });
      
      if (problematicLines.length > 0) {
        issues.push({
          type: 'wrong_column',
          file: filePath,
          wrong,
          correct,
          lines: problematicLines
        });
      }
    }
  }
  
  return issues;
}

function main() {
  console.log('🔍 Validating Schema Compliance...\n');
  
  const srcDir = path.join(__dirname, 'src');
  const serverDir = path.join(__dirname, 'server');
  
  const files = [
    ...findFiles(srcDir),
    ...findFiles(serverDir)
  ];
  
  console.log(`📁 Scanning ${files.length} files...\n`);
  
  const allIssues = [];
  
  for (const file of files) {
    const issues = checkFile(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
    }
  }
  
  if (allIssues.length === 0) {
    console.log('✅ No schema violations found!\n');
    return;
  }
  
  console.log(`❌ Found ${allIssues.length} potential schema violations:\n`);
  
  // Group by file
  const issuesByFile = {};
  for (const issue of allIssues) {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  }
  
  for (const [file, issues] of Object.entries(issuesByFile)) {
    console.log(`📄 ${file}`);
    for (const issue of issues) {
      if (issue.type === 'wrong_table') {
        console.log(`   ❌ Wrong table: "${issue.wrong}" → Should use "${issue.correct}"`);
        console.log(`      Found ${issue.count} occurrence(s)`);
      } else if (issue.type === 'wrong_column') {
        console.log(`   ❌ Wrong column: "${issue.wrong}" → Should use "${issue.correct}"`);
        if (issue.lines && issue.lines.length > 0) {
          issue.lines.slice(0, 3).forEach(({ line, content }) => {
            console.log(`      Line ${line}: ${content.substring(0, 60)}...`);
          });
        }
      }
    }
    console.log('');
  }
  
  console.log('\n💡 Fix these issues to ensure database schema compliance.');
}

main();


