const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/student/:roll', ensureAuthenticated, async (req, res) => {
  const apps = await Application.find({ rollNumber: req.params.roll }).populate('club').lean();
  res.render('search/student', { roll: req.params.roll, summary: apps, user: req.user });
});

module.exports = router;
