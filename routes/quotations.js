const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  previewQuotation,
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
} = require('../controllers/quotationController');

router.use(requireAuth);

router.post('/preview', previewQuotation);
router.post('/', createQuotation);
router.get('/', listQuotations);
router.get('/:id', getQuotation);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);

module.exports = router;
