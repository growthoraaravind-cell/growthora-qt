const mongoose = require('mongoose');

const rowSchema = new mongoose.Schema(
  { description: { type: String, required: true }, amount: { type: Number, required: true } },
  { _id: false }
);

const paymentTermSchema = new mongoose.Schema(
  { description: { type: String, required: true }, note: { type: String } },
  { _id: false }
);

const serviceBlockSchema = new mongoose.Schema(
  { heading: { type: String }, paragraph: { type: String, required: true } },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, required: true, unique: true, index: true }, // "Gr/B/26/001"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, default: Date.now },
    validUntil: { type: Date },

    billing: {
      clientName: { type: String, required: true },
      contactPerson: String,
      mobile: String,
      email: String,
      address: String,
      other: String,
    },

    service: {
      title: String,
      shortDescription: String,
      blocks: { type: [serviceBlockSchema], default: [] },
    },

    commercialProposal: {
      title: String,
      rows: { type: [rowSchema], default: [] },
      gstPercent: { type: Number, default: 18 },
      discount: {
        type: { type: String, enum: ['flat', 'percent'], default: 'flat' },
        value: { type: Number, default: 0 },
      },
    },

    ongoingServices: {
      rows: { type: [rowSchema], default: [] },
      note: String,
    },

    paymentTerms: { type: [paymentTermSchema], default: [] },

    termsAndNotes: {
      type: [String],
      default: [
        'Prices above are exclusive of GST; GST @ 18% applied on one-time setup fees as per current rates.',
      ],
    },
    additionalNotes: String,

    thankYouNote: {
      type: String,
      default:
        'Thank you for giving us the opportunity to work with you.\nWe look forward to a long and successful association.',
    },

    contactEmail: { type: String, default: 'info@growthora.co.in' },
    contactPhone: { type: String, default: '+91 9998038430' },

    fileUrl: { type: String },
    status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quotation', quotationSchema);
