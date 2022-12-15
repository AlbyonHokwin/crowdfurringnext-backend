const mongoose = require('mongoose');

const paymentMethodSchema = mongoose.Schema({
paymentName: String,
number: Number,
expirationDate: Date,
securityCode: Number,
nameOnCard: String,
});
const addressSchema = mongoose.Schema({
street: String,
additionnal: String,
zipCode: Number,
city: String,
});

const userSchema = mongoose.Schema({
  firstname: String,
  lastname: String,
  email: String,
  password: String,
  address: addressSchema,
  paymentMethods: [paymentMethodSchema],
  token: String,
  picture: String,
  association: { type: mongoose.Schema.Types.ObjectId, ref: 'associations' },
  admin: Boolean,
  isConfirmed: Boolean,
  phoneNumber: String,
  IBAN: String,

});

const User = mongoose.model('users', userSchema);

module.exports = User;