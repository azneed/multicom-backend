const Scheme = require('../models/Scheme');

// Create or update scheme
const upsertScheme = async (req, res) => {
  try {
    const { title, prize, totalWeeks } = req.body;

    let scheme = await Scheme.findOne({ isActive: true });
    if (scheme) {
      scheme.title = title;
      scheme.prize = prize;
      scheme.totalWeeks = totalWeeks;
      await scheme.save();
    } else {
      scheme = await Scheme.create({ title, prize, totalWeeks });
    }

    res.status(200).json({ message: 'Scheme saved', scheme });
  } catch (err) {
    console.error('Scheme error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current scheme
const getCurrentScheme = async (req, res) => {
  try {
    const scheme = await Scheme.findOne({ isActive: true });
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch scheme' });
  }
};

module.exports = { upsertScheme, getCurrentScheme };
