const express = require("express");
const router = express.Router();
const Pot = require("../models/pots");
const User = require("../models/users");
require("../models/connection");
const uniqid = require("uniqid");

const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const fetch = require("node-fetch");
const { checkBody } = require("../modules/checkBody");
const {
  getDistanceFromLatLonInKm,
} = require("../modules/getDistanceFromLatLonInKm");

// Route 'GET'
// Allow to get the pot with corresponding slug parameter
router.get("/slug/:slug", async (req, res) => {
  const pot = await Pot.findOne({ slug: req.params.slug }).populate("user");

  if (pot) {
    res.json({ result: true, pot });
  } else res.json({ result: false, error: "No pots found" });
});

// Route 'GET'
// To get all validated pots and to sort them according to location
// Location is given through query parameters latitude & longitude
router.get("/all", async (req, res) => {
  let { latitude, longitude } = req.query;
  const pots = await Pot.find({ isValidate: true }).populate("user");

  if (pots) {
    if (latitude && longitude) {
      try {
        const comparablePots = await Promise.all(
          pots.map(async (pot) => {
            const addressA = pot.user.address;
            const responseA = await fetch(
              `https://api-adresse.data.gouv.fr/search/?q=${addressA.street}&postcode=${addressA.zipCode}&limit=1`
            );
            const dataA = await responseA.json();
            const [longA, latA] = dataA.features[0].geometry.coordinates;
            return [
              pot,
              getDistanceFromLatLonInKm(latitude, longitude, latA, longA),
            ];
          })
        );

        comparablePots.sort((a, b) => a[1] - b[1]);
        const sortedPots = comparablePots.map((e) => e[0]);

        res.json({ result: true, length: pots.length, pots: sortedPots });
      } catch (error) {
        res.json({
          result: true,
          length: pots.length,
          pots,
          error: "Not Sorted",
        });
      }
    } else res.json({ result: true, length: pots.length, pots });
  } else res.json({ result: false, error: "No validated pots" });
});

router.put("/pay/:slug", async (req, res) => {
  if (!checkBody(req.body, ["amount"])) {
    res.json({ result: false, error: "Missing or empty amount" });
    return;
  }

  const pot = await Pot.findOne({ slug: req.params.slug });

  if (pot) {
    let updatedPot = null;

    if (req.body.email) {
      updatedPot = await Pot.findOneAndUpdate(
        { slug: req.params.slug },
        {
          currentAmount: pot.currentAmount + Number(req.body.amount),
          contributors: [
            ...new Set([...pot.contributors, req.body.email.toLowerCase()]),
          ],
        },
        { returnDocument: "after" }
      );
    } else {
      updatedPot = await Pot.findOneAndUpdate(
        { slug: req.params.slug },
        {
          currentAmount: pot.currentAmount + Number(req.body.amount),
        },
        { returnDocument: "after" }
      );
    }

    updatedPot
      ? res.json({ result: true, newAmount: updatedPot.currentAmount })
      : res.json({
          result: false,
          error: "Error during update of the pot, please try again",
        });
  } else res.json({ result: false, error: "No pots found" });
});

router.post("/create/:boolean", async (req, res) => {
  let {
    animalName,
    infos,
    socialNetworks,
    description,
    compensation,
    amount,
    urgent,
    explanation,
  } = req.body;

  infos = JSON.parse(infos);
  socialNetworks = JSON.parse(socialNetworks);

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.json({ result: false, error: "No token provided" });
    return;
  }

  const foundUser = await User.findOne({ token });

  if (foundUser) {
    let pictures = [];
    if (req.files?.images.length) {
      const images = [req.files.images].flat();
      for (let image of images) {
        const imagesPath = `./tmp/${uniqid()}.jpg`;
        const resultMove = await image.mv(imagesPath);

        if (!resultMove) {
          const resultCloudinary = await cloudinary.uploader.upload(imagesPath);
          pictures.push(resultCloudinary.secure_url);
        } else {
          res.json({ result: false, error: resultMove });
        }
        fs.unlinkSync(imagesPath);
      }
    }

    let files = [];
    if (req.files?.documents) {
      const documents = [req.files.documents].flat();
      for (let document of documents) {
        const filesPath = `./tmp/${uniqid()}.jpg`;
        const resultMove = await document.mv(filesPath);

        if (!resultMove) {
          const resultCloudinary = await cloudinary.uploader.upload(filesPath);
          files.push({ name: document.name, url: resultCloudinary.secure_url });
        } else {
          res.json({ result: false, error: resultMove });
        }
        fs.unlinkSync(filesPath);
      }
    }

    const newPot = new Pot({
      user: foundUser._id,
      contributors: [],
      animalName,
      targetAmount: amount,
      currentAmount: 0,
      pictures: pictures,
      description,
      info: infos,
      compensation,
      socialNetworks: socialNetworks,
      documents: files,
      isValidate: false,
      isClosed: false,
      urgent,
      urgenceDescription: explanation,
      draft: req.params.boolean,
      startDate: "",
      endDate: "",
      duration: "",
      slug: `${animalName.toLowerCase().trim()}_${uniqid()}`,
    });
    newPot.save().then((pot) => {
      if (pot !== null) {
        return res.json({ result: true, pot });
      } else {
        return res.json({ result: false, error: "Error during the save" });
      }
    });
  } else {
    return res.json({ result: false, error: "User not found" });
  }
});

router.get("/user", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log(token);
  if (!token) {
    res.json({ result: false, error: "No token provided" });
    return;
  }
  const foundUser = await User.findOne({ token });
  // tant que je n'ai pas le token je passe avec !foundUser
  if (foundUser) {
    // const pots = await Pot.find({ user: foundUser._id });
    const contributor = await Pot.find({
      contributors: { $in: ["marcillaud.jeremy@gmail.com"] },
    });
    const data = {
      // pots,
      contributor,
    };
    return res.json({ result: true, data });
  }
});

module.exports = router;
