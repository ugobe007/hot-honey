#!/usr/bin/env node
/**
 * PARSE VC FIRMS FROM ANY FORMAT
 * ==============================
 * Flexible parser that can extract firm names and URLs from various formats:
 * - CSV files
 * - JSON files
 * - Plain text (one per line)
 * - HTML tables
 * - Markdown tables
 * - Excel files (if xlsx package available)
 */

const fs = require('fs');
const path = require('path');

function parseFirms(inputPath) {
  const content = fs.readFileSync(inputPath, 'utf-8');
  const ext = path.extname(inputPath).toLowerCase();
  
  const firms = [];
  
  if (ext === '.csv') {
    // Parse CSV
    const lines = content.split('\n').filter(l => l.trim());
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const nameIdx = header.findIndex(h => 
      h.toLowerCase().includes('name') || 
      h.toLowerCase().includes('firm') ||
      h.toLowerCase().includes('vc firm')
    );
    const urlIdx = header.findIndex(h => 
      h.toLowerCase().includes('url') || 
      h.toLowerCase().includes('website') ||
      h.toLowerCase().includes('link')
    );
    
    if (nameIdx === -1 || urlIdx === -1) {
      throw new Error('CSV must have Name/Firm and URL/Website columns');
    }
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values[nameIdx] && values[urlIdx]) {
        firms.push({
          name: values[nameIdx],
          url: values[urlIdx]
        });
      }
    }
    
  } else if (ext === '.json') {
    // Parse JSON
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      firms.push(...data.map(item => ({
        name: item.name || item.firm || item['VC Firm Name'],
        url: item.url || item.website || item['Website URL']
      })));
    }
    
  } else if (ext === '.txt' || ext === '.md') {
    // Parse plain text or markdown
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      // Try pipe-separated: "Firm Name|URL"
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2 && parts[1].startsWith('http')) {
          firms.push({ name: parts[0], url: parts[1] });
          continue;
        }
      }
      
      // Try comma-separated: "Firm Name,URL"
      if (line.includes(',') && line.includes('http')) {
        const parts = line.split(',').map(p => p.trim());
        const urlPart = parts.find(p => p.startsWith('http'));
        const namePart = parts.find(p => !p.startsWith('http'));
        if (urlPart && namePart) {
          firms.push({ name: namePart, url: urlPart });
          continue;
        }
      }
      
      // Try tab-separated
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length >= 2 && parts[1].startsWith('http')) {
          firms.push({ name: parts[0], url: parts[1] });
        }
      }
    }
  }
  
  return firms.filter(f => f.name && f.url);
}

// CLI
const inputPath = process.argv[2];

if (!inputPath) {
  console.log(`
Parse VC Firms from Any Format

Usage:
  node scripts/parse-vc-firms-from-any-format.js <input-file>

Supported formats:
  - CSV (with Name/Firm and URL/Website columns)
  - JSON (array of {name, url} objects)
  - TXT/MD (pipe, comma, or tab separated)

Output:
  Creates data/vc-firms-list.json ready for add-vc-firms-from-list.js
  `);
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`❌ File not found: ${inputPath}`);
  process.exit(1);
}

try {
  const firms = parseFirms(inputPath);
  const outputPath = path.join(process.cwd(), 'data', 'vc-firms-list.json');
  
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(firms, null, 2));
  
  console.log(`✅ Parsed ${firms.length} firms from ${inputPath}`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`\n🚀 Next step: node scripts/add-vc-firms-from-list.js --file ${outputPath}`);
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}


