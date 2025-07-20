const express = require('express');
const router = express.Router();
const { upsertScheme, getCurrentScheme } = require('../controllers/schemeController');

router.get('/', getCurrentScheme);
router.post('/', upsertScheme);

module.exports = router;
