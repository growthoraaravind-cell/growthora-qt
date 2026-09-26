const fs = require('fs');
const path = require('path');
const Quotation = require('../models/Quotation');
const { getNextSequence } = require('../models/Counter');
const { generateQuotationDocx } = require('../utils/docGenerator');
const { computeTotals } = require('../utils/calc');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'quotations');

function sanitizePayload(body) {
  // Strip out fields the client shouldn't control directly.
  const {
    quotationNo, createdBy, fileUrl, status, createdAt, updatedAt, _id, ...safe
  } = body;
  return safe;
}

function validateForConfirm(payload) {
  const errors = [];
  if (!payload?.billing?.clientName?.trim()) errors.push('Client / Company Name is required.');
  const rows = payload?.commercialProposal?.rows || [];
  if (!rows.length) errors.push('At least one Commercial Proposal row is required.');
  rows.forEach((r, i) => {
    if (!r.description?.trim()) errors.push(`Row ${i + 1}: Description is required.`);
    if (r.amount === undefined || r.amount === null || isNaN(Number(r.amount))) {
      errors.push(`Row ${i + 1}: Amount must be numeric.`);
    }
  });
  return errors;
}

async function nextQuotationNo() {
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = await getNextSequence('quotationNo');
  return `Gr/B/${year}/${String(seq).padStart(3, '0')}`;
}

// POST /api/quotations/preview  -> no DB write, no file write
async function previewQuotation(req, res) {
  try {
    const payload = sanitizePayload(req.body);
    const totals = computeTotals(payload.commercialProposal || {});
    res.json({ preview: payload, totals });
  } catch (err) {
    console.error('[previewQuotation]', err);
    res.status(500).json({ message: 'Could not build preview.' });
  }
}

// POST /api/quotations -> confirm & generate
async function createQuotation(req, res) {
  try {
    const payload = sanitizePayload(req.body);
    const errors = validateForConfirm(payload);
    if (errors.length) return res.status(400).json({ message: 'Validation failed.', errors });

    const quotationNo = await nextQuotationNo();

    const quotation = new Quotation({
      ...payload,
      quotationNo,
      createdBy: req.employee.id,
      status: 'confirmed',
    });

    const { fileName } = await generateQuotationDocx(quotation, UPLOAD_DIR);
    quotation.fileUrl = `/uploads/quotations/${fileName}`;

    await quotation.save();
    res.status(201).json({ quotation });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Quotation number collision, please retry.' });
    }
    console.error('[createQuotation]', err);
    res.status(500).json({ message: 'Could not create quotation.' });
  }
}

// GET /api/quotations -> list for logged-in employee (admin sees all)
async function listQuotations(req, res) {
  try {
    const Employee = require('../models/Employee');
    const me = await Employee.findById(req.employee.id);
    const filter = me?.isAdmin ? {} : { createdBy: req.employee.id };

    const quotations = await Quotation.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name employeeId');
    res.json({ quotations });
  } catch (err) {
    console.error('[listQuotations]', err);
    res.status(500).json({ message: 'Could not list quotations.' });
  }
}

// GET /api/quotations/:id
async function getQuotation(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('createdBy', 'name employeeId');
    if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
    res.json({ quotation });
  } catch (err) {
    console.error('[getQuotation]', err);
    res.status(500).json({ message: 'Could not fetch quotation.' });
  }
}

// PUT /api/quotations/:id -> edit + regenerate file
async function updateQuotation(req, res) {
  try {
    const existing = await Quotation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Quotation not found.' });

    const payload = sanitizePayload(req.body);
    const errors = validateForConfirm(payload);
    if (errors.length) return res.status(400).json({ message: 'Validation failed.', errors });

    Object.assign(existing, payload);

    // Regenerate the file, overwriting the old one (quotationNo is stable).
    const { fileName } = await generateQuotationDocx(existing, UPLOAD_DIR);
    existing.fileUrl = `/uploads/quotations/${fileName}`;
    existing.status = 'confirmed';

    await existing.save();
    res.json({ quotation: existing });
  } catch (err) {
    console.error('[updateQuotation]', err);
    res.status(500).json({ message: 'Could not update quotation.' });
  }
}

// DELETE /api/quotations/:id -> delete doc + file
async function deleteQuotation(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });

    if (quotation.fileUrl) {
      const filePath = path.join(__dirname, '..', quotation.fileUrl.replace(/^\//, ''));
      fs.existsSync(filePath) && fs.unlinkSync(filePath);
    }

    await quotation.deleteOne();
    res.json({ message: 'Quotation deleted.' });
  } catch (err) {
    console.error('[deleteQuotation]', err);
    res.status(500).json({ message: 'Could not delete quotation.' });
  }
}

module.exports = {
  previewQuotation,
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
};
