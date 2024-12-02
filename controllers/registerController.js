"use strict";

const controller = {};
const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const { sanitizeInput } = require("./shared");

controller.show = async (req, res) => {
  res.render("register", {
    title: "ShareBug - Register",
    header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                <link rel="stylesheet" href="/css/register.css" />`,
    display: "display-none",
  });
};

controller.register = async (req, res) => {
  const {
    "first-name": firstNameBody,
    "last-name": lastNameBody,
    email,
    password,
    domain,
  } = req.body;
  try {
    const firstName = sanitizeInput(firstNameBody);
    const lastName = sanitizeInput(lastNameBody);
    let user = await userModel.findOne({ Email: email });
    if (user) {
      req.flash("error_msg", "Email already exists");
      return res.redirect("/register");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({
      Email: email,
      Password: hashedPassword,
      IsVerified: false,
      Domain: domain,
    });

    await newUser.save();

    req.flash("success_msg", "You are registered and can now login");

    res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Something went wrong. Please try again.");
    res.redirect("/register");
  }
};

module.exports = controller;
