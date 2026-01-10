const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow, WidthType } = require('docx');

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      // Title
      new Paragraph({
        text: 'pyth ai',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Administrator Guide for Andy Abramson',
            italics: true,
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'oracle of matches',
            size: 24,
            color: 'D4AF37',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      // Read from the markdown file and convert
      new Paragraph({
        text: 'What is pyth ai?',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: 'pyth ai is an AI-powered startup-investor matching platform—the oracle of matches for venture capital. We use pattern recognition at scale to reveal which startups and investors are perfect matches through probability perfected by data, not guesswork.',
      }),
      
      // Add more content here...
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/pyth_ai_admin_guide_andy.docx', buffer);
  console.log('✅ Word document created: pyth_ai_admin_guide_andy.docx');
});
