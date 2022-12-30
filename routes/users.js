var express = require("express");
var router = express.Router();

const User = require("../models/users");
const Pot = require("../models/pots");
const { checkBody } = require("../modules/checkBody");
const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

router.post("/signup", async (req, res) => {
  if (!checkBody(req.body, ["email", "password", "lastname", "firstname", "street", "zipCode", "city",])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  // Check if the user has not already been registered
  const foundUser = await User.findOne({ email: { $regex: new RegExp(`^${req.body.email}$`, "i") } });

  if (!foundUser) {
    let picture = '';

    if (req.files?.profilePicture) {
      const picturePath = `./tmp/${uniqid()}.jpg`;
      const resultMove = await req.files.profilePicture.mv(picturePath);

      if (!resultMove) {
        const resultCloudinary = await cloudinary.uploader.upload(picturePath);
        fs.unlinkSync(picturePath);

        picture = resultCloudinary.secure_url;

      } else {
        res.json({ result: false, error: resultMove });
      }
    }

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
      picture,
      association: null,
      admin: false,
      isConfirmed: false,
      phoneNumber: "",
      IBAN: "",
    });

    const newDoc = await newUser.save()
    res.json({ result: true, token: newDoc.token, email: newDoc.email, picture: newDoc.picture });

  } else {
    // User already exists in database
    res.json({ result: false, error: "User already exists" });
  }
});

router.put('/addpicture', async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.json({ result: false, error: "No token provided" });
    return;
  }

  const picture = req.files?.profilePicture;

  if (!picture) {
    res.json({ result: false, error: "No picture provided" });
    return;
  }

  const foundUser = await User.findOne({ token });

  if (foundUser) {
    const picturePath = `./tmp/${uniqid()}.jpg`;
    const resultMove = await picture.mv(picturePath);

    if (!resultMove) {
      const resultCloudinary = await cloudinary.uploader.upload(picturePath);
      fs.unlinkSync(picturePath);

      res.json({ result: true, picture: resultCloudinary.secure_url })
    } else {
      res.json({ result: false, error: resultMove });
    }
  } else res.json({ result: false, error: "No user found" });
})

router.post("/signin", (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: { $regex: new RegExp(`^${req.body.email}$`, "i") } })
    .then(async user => {
      if (user && bcrypt.compareSync(req.body.password, user.password)) {
        const pots = await Pot.find({ user: user._id });
        const contributor = await Pot.find({
          contributors: { $in: [user.email] },
        });

        res.json({
          result: true,
          token: user.token,
          email: user.email,
          picture: user.picture,
          pots,
          contributor,
        });
      } else {
        res.json({ result: false, error: "User not found or wrong password" });
      }
    });
});

router.get("/payments", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.json({ result: false, error: "No token provided" });
    return;
  }

  const foundUser = await User.findOne({ token });

  if (foundUser) {
    res.json({ result: true, paymentMethods: foundUser.paymentMethods });
  } else res.json({ result: false, error: "No user found" });
});

router.post("/addpayment", async (req, res) => {
  if (
    !checkBody(req.body, [
      "paymentName",
      "number",
      "expirationDate",
      "securityCode",
      "nameOnCard",
    ])
  ) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.json({ result: false, error: "No token provided" });
    return;
  }

  const foundUser = await User.findOne({ token });

  if (foundUser) {
    let { paymentName, number, expirationDate, securityCode, nameOnCard } =
      req.body;

    if (!foundUser.paymentMethods.find((e) => e.paymentName === paymentName)) {
      number = +number;
      expirationDate = new Date(expirationDate);
      securityCode = +securityCode;

      const newPaymentMethod = {
        paymentName,
        number,
        expirationDate,
        securityCode,
        nameOnCard,
      };

      if (
        !!expirationDate.getTime() &&
        checkBody(newPaymentMethod, [
          "paymentName",
          "number",
          "expirationDate",
          "securityCode",
          "nameOnCard",
        ])
      ) {
        const updatedUser = await User.findOneAndUpdate(
          { token },
          { paymentMethods: [...foundUser.paymentMethods, newPaymentMethod] },
          { returnDocument: "after" }
        );

        updatedUser
          ? res.json({
            result: true,
            paymentMethod:
              updatedUser.paymentMethods[
              updatedUser.paymentMethods.length - 1
              ],
          })
          : res.json({
            result: false,
            error: "Error during update of user, please try again",
          });
      } else res.json({ result: false, error: "Wrong type of information" });
    } else res.json({ result: false, error: "Name already used" });
  } else res.json({ result: false, error: "No user found" });
});

router.delete("/deletepayment/:paymentName", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.json({ result: false, error: "No token provided" });
    return;
  }

  const foundUser = await User.findOne({ token });

  if (foundUser) {
    let paymentName = req.params.paymentName;

    if (foundUser.paymentMethods.find((e) => e.paymentName === paymentName)) {
      const updatedUser = await User.findOneAndUpdate(
        { token },
        {
          paymentMethods: foundUser.paymentMethods.filter(
            (e) => e.paymentName !== paymentName
          ),
        },
        { returnDocument: "after" }
      );

      updatedUser
        ? res.json({ result: true, paymentName })
        : res.json({
          result: false,
          error: "Error during deletion of payment method",
        });
    } else res.json({ result: false, error: "Payment method doesn'nt exist" });
  } else res.json({ result: false, error: "No user found" });
});

router.put("/modify", (req, res) => {
  const token = req.headers["authorization"].split(" ")[1];
  if (
    !checkBody(req.body, [
      "email",
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

  User.findOne({ token }).then((data) => {
    if (data) {
      User.findOne({
        email: { $regex: new RegExp(`^${req.body.email}$`, "i") },
        token: { $not: { $eq: token } },
      }).then((data) => {
        if (data === null) {
          User.updateOne(
            { token },
            {
              email: req.body.email,
              firstname: req.body.firstname,
              lastname: req.body.lastname,
              street: req.body.street,
              zipCode: req.body.zipCode,
              additionnal: req.body.additionnal || "",
              city: req.body.city,
            }
          ).then((updated) => {
            res.json({ result: updated.acknowledged });
          });
        } else res.json({ result: false, error: "Email already used" });
      });
    } else res.json({ result: false, error: "User not found" });
  });
});

router.get("/information", (req, res) => {
  const token = req.headers["authorization"].split(" ")[1];
  User.findOne({ token }).then((data) => {
    if (data === null) {
      res.json({ result: false, error: "User not found" });
      return;
    }
  }),
    User.findOne({ token }).then((data) => {
      if (data) {
        res.json({
          result: true,
          user: {
            email: data.email,
            firstname: data.firstname,
            lastname: data.lastname,
            street: data.address.street,
            zipCode: data.address.zipCode,
            additionnal: data.address.additionnal || "",
            city: data.address.city,
          },
        });
      }
    });
});

module.exports = router;
