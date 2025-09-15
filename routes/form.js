const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const Submission = require("../models/Submission");
const { ensureAuthenticated, requireRole } = require("../middlewares/auth");
const ExcelJS = require("exceljs");

// ✅ Admin: create form page
router.get("/create", ensureAuthenticated, requireRole("admin", "superadmin"), (req, res) => {
  res.render("forms/create");
});

// ✅ Admin: save new form
router.post("/create", ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const { title, description, fields } = req.body;

    const form = new Form({
      title,
      description,
      club: req.user.club,
      createdBy: req.user._id,
      fields: JSON.parse(fields) // frontend sends array of fields
    });

    await form.save();
    req.flash("success_msg", "Form created successfully!");
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to create form");
    res.redirect("/forms/create");
  }
});

// ✅ Admin: list forms of current club
router.get("/list", ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const forms = await Form.find({ club: req.user.club })
      .populate("createdBy", "username email role")
      .sort({ createdAt: -1 });
    res.render("forms/list", { forms });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching forms");
  }
});


// ✅ Student: view & fill a form
router.get("/fill/:formId", async (req, res) => {
  const form = await Form.findById(req.params.formId);
  if (!form) return res.status(404).send("Form not found");
  res.render("forms/fill", { form, layout: false });
});

// ✅ Student: submit a form
router.post("/:formId/submit", async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).send("Form not found");

    const submission = new Submission({
      form: form._id,
      club: form.club,
      data: req.body
    });

    await submission.save();
    req.flash("success_msg", "Form submitted successfully!");
    res.redirect(`/forms/fill/${form._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Submission failed");
    res.redirect("back");
  }
});

// View Submissions
router.get("/:id/submissions", ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const form = await Form.findById(req.params.id).populate("createdBy", "username");
    const submissions = await Submission.find({ form: req.params.id }).sort({ createdAt: -1 });
    res.render("forms/submissions", { form, submissions });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load submissions");
    res.redirect("/forms");
  }
});

module.exports = router;
