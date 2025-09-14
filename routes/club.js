const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Application = require('../models/Application');
const Registration = require('../models/ClubRegistration');
const StudentRegistration = require('../models/StudentRegistration');
const { ensureAuthenticated } = require('../middlewares/auth');

// GET all clubs
router.get('/', async (req, res) => {
  try {
    const clubs = await Club.find().lean();
    res.render('club/list', { title: "Clubs", clubs });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET form to create club
router.get('/create', (req, res) => {
  res.render('club/createClub', { title: "Create Club" });
});

// POST create club
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    await Club.create({ name });
    req.flash("success_msg", "✅ Club created successfully");
    res.redirect('/club/create');
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "❌ Failed to create club");
    res.redirect('/club/create');
  }
});

router.get('/:clubId/dashboard', async (req, res) => {
  const club = await Club.findById(req.params.clubId);
  const apps = await Application.find({ club: club._id }).limit(50);
  res.render('club/dashboard', { club, apps, user: req.user });
});




/// Create New Recruitment

router.get('/new/registration', ensureAuthenticated, async (req, res) => {
  res.render('club/newRegistration.ejs');
});


// Handle form submission
router.post('/new/registration', async (req, res) => {
  try {
    const { year } = req.body;
    const user = req.user;

    const clubId = user.club; 
    const userId = user._id;
    if (!clubId) {
      req.flash('error_msg', '❌ You are not assigned to any club.');
      return res.redirect('/club/new/registration');
    }
    const existingRegistration = await Registration.findOne({ clubId, year });
    await Registration.create({ clubId, year, userId });
    req.flash('success_msg', '✅ Registration successful!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', '❌ Registration failed or duplicate entry.');
    res.redirect('/dashboard');
  }
});

///all recruitments
router.get('/all/registrations', async (req, res) => {
  try {
    const user = req.user;
    const clubId = user.club;
    const registrations = await Registration.find({clubId:clubId})
      .populate('clubId', 'name')      // get club name
      .populate('userId', 'username')  // get student username
      .sort({ createdAt: -1 })         // newest first
      .lean();
      const baseUrl = `${req.protocol}://${req.get('host')}`; // pass to template 
    res.render('club/allRegistration', { 
      title: 'Club Registrations', 
      registrations ,baseUrl
    });

  } catch (err) {
    console.error(err);
    req.flash('error_msg', '❌ Failed to fetch registrations');
    res.redirect('/');
  }
});

// Route to view applicants by recruitmentId
router.get('/this/recruitment/:id/', async (req, res) => {
  try {
    const recruitmentId = req.params.id;
    const students = await StudentRegistration.find({ recruitmentId }).populate('clubId');
    res.render('club/thisRegistrations.ejs', { students, recruitmentId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// update the status of application
router.post('/students/:id/update-status', async (req, res) => {
  try {
    const studentId = req.params.id;
    const { action } = req.body;

    const student = await StudentRegistration.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (action === 'promote') {
      if (student.round < 3) {
        student.round += 1;
        student.status = 'Selected';
      }
    } else if (action === 'reject') {
      student.status = 'Rejected';
      student.rejectedAtRound = student.round;
    }

    await student.save();
    res.json({ success: true, round: student.round, status: student.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});




router.get('/:clubId/dashboard', async (req, res) => {
  const club = await Club.findById(req.params.clubId);
  const apps = await Application.find({ club: club._id }).limit(50);
  res.render('club/dashboard', { club, apps, user: req.user });
});

module.exports = router
