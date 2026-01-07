// Import OpenVC CSV and normalize for investor scoring
const fs = require('fs');
const csv = require('csv-parser');

const INPUT_CSV = process.argv[2] || 'openvc_investors.csv';
const OUTPUT_JSON = 'openvc_investors_normalized.json';

const investors = [];

fs.createReadStream(INPUT_CSV)
  .pipe(csv())
  .on('data', (row) => {
    // Normalize key fields
    investors.push({
      name: row['Name'] || row['Firm'] || '',
      thesis: row['Thesis'] || '',
      stage: row['Stage'] || row['Stages'] || '',
      check_size: row['Check Size'] || '',
      sectors: (row['Sectors'] || '').split(',').map(s => s.trim()),
      location: row['Location'] || '',
      website: row['Website'] || '',
      email: row['Email'] || '',
      source: 'OpenVC'
    });
  })
  .on('end', () => {
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(investors, null, 2));
    console.log(`Imported and normalized ${investors.length} investors. Output: ${OUTPUT_JSON}`);
  });
