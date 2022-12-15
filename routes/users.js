var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");
const bcrypt = require("bcrypt");
const uid2 = require("uid2");

router.post("/signup", (req, res) => {
  if (
    !checkBody(req.body, [
      "email",
      "password",
      "lastname",
      "firstname",
      "street",
      "zipCode",
      "city",
    ])
  ) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  // Check if the user has not already been registered
  User.findOne({ email: { $regex: new RegExp(req.body.email, "i") } }).then(
    (data) => {
      if (data === null) {
        const hash = bcrypt.hashSync(req.body.password, 10);
        const newUser = new User({
          email: req.body.email,
          password: hash,
          token: uid2(32),
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          address: {
            street: req.body.street,
            additionnal: req.body.additionnal || "",
            zipCode: req.body.zipCode,
            city: req.body.city,
          },
          paymentMethods: [],
          picture: "",
          association: null,
          admin: false,
          isConfirmed: false,
          phoneNumber: "",
          IBAN: "",
        });

        newUser.save().then((newDoc) => {
          res.json({ result: true, token: newDoc.token });
        });
      } else {
        // User already exists in database
        res.json({ result: false, error: "User already exists" });
      }
    }
  );
});

router.post("/signin", (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: { $regex: new RegExp(req.body.email, "i") } }).then(
    (data) => {
      if (bcrypt.compareSync(req.body.password, data.password)) {
        res.json({ result: true, token: data.token, email: data.email });
      } else {
        res.json({ result: false, error: "User not found or wrong password" });
      }
    }
  );
});

module.exports = router;
