const express = require('express');
const router = express.Router();
const Pot = require('../models/pots');

router.get('/:slug', async (req, res) => {
    const pot = await Pot.findOne({ slug: req.params.slug });

    pot ?
        res.json({ result: true, pot }) :
        res.json({ result: false, error: 'No pots found' })
})

module.exports = router;