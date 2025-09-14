const express = require('express');
const Club = require('../models/Club');
const router = express.Router();

// Superadmin: create club
router.get('/create-club', (req, res) => {
  if (!req.user || req.user.role !== 'superadmin') return res.status(403).send("Forbidden");
  res.render('admin/createClub', { layout: 'layouts/admin', title: "Create Club" });
});

router.post('/create-club', async (req, res) => {
  if (!req.user || req.user.role !== 'superadmin') return res.status(403).send("Forbidden");

  await Club.create({ name: req.body.name, description: req.body.description, rounds: [{ name: 'Round 1' }, { name: 'Round 2' }, { name: 'Round 3' }] });
  res.redirect('/dashboard');
});

module.exports = router;
