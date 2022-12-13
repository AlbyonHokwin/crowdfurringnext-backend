const express = require('express');
const router = express.Router();
const Pot = require('../models/pots');

// Route 'GET'
// Allow to get the pot with corresponding slug parameter
router.get('/slug/:slug', async (req, res) => {
    const foundPot = await Pot.findOne({ slug: req.params.slug });

    if (foundPot) {
        const pot = await foundPot.populate('user');
        res.json({ result: true, pot })
    } else res.json({ result: false, error: 'No pots found' })
});

// Route 'GET'
// To get all validated pots
router.get('/all', async (req, res) => {
    // const foundPots = await Pot.find({ isValidate: true });
    const pots = await Pot.find({ isValidate: true }).populate('user');

    if (pots) {
        res.json({ result: true, length: pots.length, pots });
    } else res.json({ result: false, error: 'No validated pots' });
})

module.exports = router;