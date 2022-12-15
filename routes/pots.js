const express = require("express");
const router = express.Router();
const Pot = require("../models/pots");
const User = require("../models/users");
require("../models/connection");
const uniqid = require("uniqid");

const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Route 'GET'
// Allow to get the pot with corresponding slug parameter
router.get("/slug/:slug", async (req, res) => {
  const pot = await Pot.findOne({ slug: req.params.slug }).populate("user");

  if (pot) {
    res.json({ result: true, pot });
  } else res.json({ result: false, error: "No pots found" });
});

// Route 'GET'
// To get all validated pots
router.get("/all", async (req, res) => {
  // const foundPots = await Pot.find({ isValidate: true });
  const pots = await Pot.find({ isValidate: true }).populate("user");

  if (pots) {
    res.json({ result: true, length: pots.length, pots });
  } else res.json({ result: false, error: "No validated pots" });
});

router.post("/create", async (req, res) => {
  console.log(req.files);
  let {
    animalName,
    infos,
    description,
    compensation,
    amount,
    urgent,
    explanation,
    token,
  } = req.body;

  infos = JSON.parse(infos);

  const documents = [req.files.documents].flat();
  const images = [req.files.images].flat();

  const foundUser = await User.findOne({ token });

  let pictures = [];
  let files = [];
  // tant que je n'ai pas le token je passe avec !foundUser
  if (!foundUser) {
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

    const newPot = new Pot({
      //   user: data.id
      contributors: [],
      animalName,
      targetAmount: amount,
      currentAmount: 0,
      pictures: pictures,
      description,
      info: infos,
      compensation,
      socialNetworks: [],
      documents: files,
      isValidate: false,
      isClosed: false,
      urgent,
      urgenceDescription: explanation,
      draft: false,
      startDate: "",
      endDate: "",
      duration: "",
      slug: "",
    });
    newPot.save().then((pot) => {
      if (pot !== null) {
        return res.json({ result: true });
      } else {
        return res.json({ result: false });
      }
    });
  }
});

module.exports = router;
