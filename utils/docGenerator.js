const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  VerticalAlign,
  HeadingLevel,
} = require('docx');
const { computeTotals, formatINR } = require('./calc');

// ---- Brand tokens -----------------------------------------------------
const COLORS = {
  accent: 'C1652F', // burnt orange / terracotta
  navy: '1F1B2E', // deep navy / near-black
  cream: 'FBF6F0', // soft cream background
  greyBorder: 'D9D2C7',
  bodyGrey: '3A3A3A',
  white: 'FFFFFF',
};

const DEFAULT_ADDRESS = [
  'MFAR Silver Line Tech Park, Hub.iTrosys, 3rd Floor,',
  'Plot No. 180, EPIP Zone, 2nd Phase, Whitefield Industrial Area,',
  '(Brookefield / Chinnapanahalli), Bengaluru, Karnataka 560066',
];
const DEFAULT_EMAIL = 'info@growthora.co.in';
const DEFAULT_PHONE = '+91 9998038430';
const DEFAULT_WEBSITE = 'growthora.co.in';

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: COLORS.greyBorder };
const noBorders = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
};

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(a, b) {
  const ms = new Date(a).setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

// ---- Small building blocks ---------------------------------------------

function brandHeader() {
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: noBorders.top, bottom: noBorders.bottom, left: noBorders.left, right: noBorders.right,
          insideHorizontal: noBorders.top, insideVertical: noBorders.top },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'GROWTHORA', bold: true, size: 30, color: COLORS.navy })],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Advisory Private Limited', size: 16, color: '6B6B6B' }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'QUOTATION', bold: true, size: 26, color: COLORS.accent })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.greyBorder, space: 4 } }, children: [] }),
    ],
  });
}

function brandFooter(contactEmail, contactPhone) {
  return new Footer({
    children: [
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.greyBorder, space: 4 } }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: DEFAULT_ADDRESS.map(
          (line, i) => new TextRun({ text: line, size: 14, color: '7A7A7A', break: i === 0 ? 0 : 1 })
        ),
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${contactPhone || DEFAULT_PHONE}  |  ${contactEmail || DEFAULT_EMAIL}  |  ${DEFAULT_WEBSITE}`,
            size: 14,
            color: '7A7A7A',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Page ', size: 14, color: 'A0A0A0' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: 'A0A0A0' }),
          new TextRun({ text: ' of ', size: 14, color: 'A0A0A0' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: 'A0A0A0' }),
        ],
      }),
    ],
  });
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 260, after: 120 },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.accent, space: 6 } },
    indent: { left: 80 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 21, color: COLORS.navy })],
  });
}

function metaLine(label, value) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 19, color: COLORS.navy }),
      new TextRun({ text: value, size: 19, color: COLORS.bodyGrey }),
    ],
  });
}

function creamBox(paragraphs) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.cream },
            borders: {
              top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
            },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 20, color: COLORS.bodyGrey, ...opts })],
  });
}

// ---- Table builders -------------------------------------------------

function headerCell(text, opts = {}) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.navy },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    width: opts.width,
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 18, color: COLORS.white })],
      }),
    ],
  });
}

function dataCell(text, opts = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    width: opts.width,
    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [new TextRun({ text: String(text), size: 18, color: COLORS.bodyGrey, bold: !!opts.bold })],
      }),
    ],
  });
}

function totalRow(label, value, opts = {}) {
  const fillColor = opts.highlight ? COLORS.accent : COLORS.white;
  const textColor = opts.highlight ? COLORS.white : COLORS.navy;
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: fillColor },
        borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: label, bold: true, size: opts.highlight ? 20 : 18, color: textColor })],
          }),
        ],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: fillColor },
        borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: value, bold: true, size: opts.highlight ? 20 : 18, color: textColor })],
          }),
        ],
      }),
    ],
  });
}

function proposalTable(rows, totals, showTotals) {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Sl. No.', { width: { size: 10, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER }),
      headerCell('Description', { width: { size: 60, type: WidthType.PERCENTAGE } }),
      headerCell('Amount (₹)', { width: { size: 30, type: WidthType.PERCENTAGE }, align: AlignmentType.RIGHT }),
    ],
  });

  const body = rows.map(
    (r, i) =>
      new TableRow({
        children: [
          dataCell(i + 1, { align: AlignmentType.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
          dataCell(r.description, { width: { size: 60, type: WidthType.PERCENTAGE } }),
          dataCell(formatINR(r.amount), { align: AlignmentType.RIGHT, width: { size: 30, type: WidthType.PERCENTAGE } }),
        ],
      })
  );

  const totalsRows = [];
  if (showTotals) {
    totalsRows.push(totalRow('Subtotal', formatINR(totals.subtotal)));
    totalsRows.push(totalRow(`GST @ ${totals.gstPercent}%`, formatINR(totals.gstAmount)));
    if (totals.discountAmount > 0) {
      totalsRows.push(totalRow('Discount', `- ${formatINR(totals.discountAmount)}`));
    }
    totalsRows.push(totalRow('Grand Total', formatINR(totals.grandTotal), { highlight: true }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...body, ...totalsRows],
  });
}

// ---- Main generator ---------------------------------------------------

/**
 * Builds the ordered array of docx body children for a quotation.
 * Shared between the .docx generator and could be reused for other renders.
 */
function buildBodyChildren(q) {
  const children = [];
  const totals = computeTotals(q.commercialProposal);

  // Meta / quotation number box
  const metaParas = [metaLine('Quotation No.', q.quotationNo), metaLine('Date', fmtDate(q.date))];
  if (q.validUntil) {
    const n = daysBetween(q.validUntil, q.date);
    metaParas.push(metaLine('Valid Until', `${fmtDate(q.validUntil)} (${n} days)`));
  }
  children.push(creamBox(metaParas));
  children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));

  // Billing address box
  const billing = q.billing || {};
  const billingParas = [
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: 'QUOTATION FOR', bold: true, size: 18, color: COLORS.accent })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: billing.clientName, bold: true, size: 22, color: COLORS.navy })],
    }),
  ];
  if (billing.contactPerson) billingParas.push(bodyPara(`Attn: ${billing.contactPerson}`));
  if (billing.mobile) billingParas.push(bodyPara(billing.mobile));
  if (billing.email) billingParas.push(bodyPara(billing.email));
  if (billing.address) {
    billing.address.split('\n').filter(Boolean).forEach((line) => billingParas.push(bodyPara(line)));
  }
  if (billing.other) billingParas.push(bodyPara(billing.other));
  children.push(creamBox(billingParas));

  // Service overview
  const svc = q.service || {};
  if (svc.title || svc.shortDescription || (svc.blocks && svc.blocks.length)) {
    children.push(sectionHeading(svc.title || 'Service Overview'));
    if (svc.shortDescription) {
      children.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [new TextRun({ text: svc.shortDescription, italics: true, size: 20, color: COLORS.bodyGrey })],
        })
      );
    }
    const blocks = (svc.blocks || []).filter((b) => b.paragraph && b.paragraph.trim());
    if (blocks.length === 1 && !blocks[0].heading) {
      children.push(bodyPara(blocks[0].paragraph));
    } else {
      blocks.forEach((b, i) => {
        if (b.heading) {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 60 },
              children: [new TextRun({ text: `${i + 1}. ${b.heading}`, bold: true, size: 20, color: COLORS.navy })],
            })
          );
        }
        children.push(bodyPara(b.paragraph));
      });
    }
  }

  // Commercial proposal
  const cp = q.commercialProposal || {};
  if (cp.rows && cp.rows.length) {
    children.push(sectionHeading(cp.title || 'Commercial Proposal'));
    children.push(proposalTable(cp.rows, totals, true));
  }

  // Ongoing services
  const os = q.ongoingServices || {};
  if (os.rows && os.rows.length) {
    children.push(sectionHeading('Ongoing / Pay-Per-Use Services'));
    children.push(proposalTable(os.rows, totals, false));
    if (os.note) {
      children.push(
        new Paragraph({
          spacing: { before: 90 },
          children: [new TextRun({ text: os.note, italics: true, size: 17, color: '6B6B6B' })],
        })
      );
    }
  }

  // Payment terms
  if (q.paymentTerms && q.paymentTerms.length) {
    children.push(sectionHeading('Payment Terms'));
    const header = new TableRow({
      tableHeader: true,
      children: [
        headerCell('Sl. No.', { width: { size: 10, type: WidthType.PERCENTAGE }, align: AlignmentType.CENTER }),
        headerCell('Description', { width: { size: 55, type: WidthType.PERCENTAGE } }),
        headerCell('Note', { width: { size: 35, type: WidthType.PERCENTAGE } }),
      ],
    });
    const body = q.paymentTerms.map(
      (r, i) =>
        new TableRow({
          children: [
            dataCell(i + 1, { align: AlignmentType.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
            dataCell(r.description, { width: { size: 55, type: WidthType.PERCENTAGE } }),
            dataCell(r.note || '', { width: { size: 35, type: WidthType.PERCENTAGE } }),
          ],
        })
    );
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] }));
  }

  // Terms & notes
  if ((q.termsAndNotes && q.termsAndNotes.length) || q.additionalNotes) {
    children.push(sectionHeading('Terms & Notes'));
    (q.termsAndNotes || []).forEach((t) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: t, size: 19, color: COLORS.bodyGrey })],
        })
      );
    });
    if (q.additionalNotes) {
      children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Additional Notes', bold: true, size: 19, color: COLORS.navy })] }));
      q.additionalNotes.split('\n').filter(Boolean).forEach((line) => children.push(bodyPara(line)));
    }
  }

  // Closing / thank you
  children.push(new Paragraph({ spacing: { before: 260 }, children: [] }));
  (q.thankYouNote || '').split('\n').filter(Boolean).forEach((line) =>
    children.push(
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: line, size: 20, color: COLORS.navy, italics: true })] })
    )
  );

  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: 'For Growthora Advisory Private Limited', bold: true, size: 19, color: COLORS.navy })],
    })
  );
  children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'Authorized Signatory', size: 18, color: COLORS.bodyGrey })] }));

  return children;
}

async function generateQuotationDocx(quotation, outputDir) {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Calibri' } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: 1300, bottom: 1300, left: 900, right: 900 },
          },
        },
        headers: { default: brandHeader() },
        footers: { default: brandFooter(quotation.contactEmail, quotation.contactPhone) },
        children: buildBodyChildren(quotation),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const safeFileName = `${quotation.quotationNo.replace(/[^a-zA-Z0-9-_]/g, '')}.docx`;
  const fullPath = path.join(outputDir, safeFileName);
  fs.writeFileSync(fullPath, buffer);

  return { fileName: safeFileName, fullPath };
}

module.exports = { generateQuotationDocx, buildBodyChildren };
