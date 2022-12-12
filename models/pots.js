const mongoose = require('mongoose');

const documentSchema = mongoose.Schema({
    name: String,
    url: String,
});

const infoSchema = mongoose.Schema({
    specie: String,
    race: String,
    age: Number,
    sex: String,
});

const potSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    contributors: [String],
    animalName: String,
    targetAmount: Number,
    currentAmount: Number,
    pictures: [String],
    description: String,
    info: infoSchema,
    compensations: [String],
    socialNetworks: [String],
    documents: [documentSchema],
    isValidate: Boolean,
    isClosed: Boolean,
    urgent: Boolean,
    draft: Boolean,
    startDate: Date,
    endDate: Date,
    duration: Date,
    slug: String,
});

const Pot = mongoose.model('pots', potSchema);

module.exports = Pot;