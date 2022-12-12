const express = require('express');
const router = express.Router();
const Pot = require('../models/pots');

router.get('/:slug', async (req, res) => {
    const foundPot = await Pot.findOne({ slug: req.params.slug }).populate('user');

    if (foundPot) {
        const pot = await foundPot.populate('user');
        res.json({ result: true, pot })
    } else res.json({ result: false, error: 'No pots found' })
})

module.exports = router;