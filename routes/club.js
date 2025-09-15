const express = require('express');
const router = express.Router();
const passport = require('passport');
const Club = require('../models/Club');
const User = require("../models/User");
const Application = require('../models/Application');
const Registration = require('../models/ClubRegistration');
const StudentRegistration = require('../models/StudentRegistration');
const { ensureAuthenticated, requireRole } = require('../middlewares/auth');

const nodemailer = require('nodemailer');

// Example using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // App password or real password
  }
});

// Verify connection
transporter.verify(function(error, success) {
  if (error) {
    console.log('Mailer Error:', error);
  } else {
    console.log('Mailer is ready to send messages');
  }
});


// GET form to create club
router.get('/create', ensureAuthenticated, requireRole("superadmin"), (req, res) => {
  res.render('admin/createClub', { title: "Create Club" });
});


router.post('/create', ensureAuthenticated, requireRole("superadmin"), async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    const { name, emails } = req.body;
    let emailsArray = [];
    try {
      emailsArray = JSON.parse(emails);
    } catch (err) {
      console.error("Invalid emails format", err);
    }

    // ✅ Create the club
    const club = await Club.create({ name, jsec: emailsArray });

    // Prepare email content
    const subject = `JSEC Id Activation for ${name}`;
    const message = `
      <h2>Congratulations!</h2>
      <p>Your ID has been activated as <strong>JSEC</strong> for the club <strong>${name}</strong>.</p>
      <p>Click below to access the website:</p>
      <a href="${baseUrl}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Go to Website</a>
      <br/><br/>
      <p>Regards,<br/>Admin Team</p>
    `;

    // ✅ For each email: register user + send email
    for (const email of emailsArray) {
      try {
        // Generate a random password for the new user
        const randomPassword = Math.random().toString(36).slice(-8);

        // Register the user (role: jsec, club assigned)
        const newUser = new User({
          username: email,
          email,
          role: "admin",
          club: club._id
        });

        await new Promise((resolve, reject) => {
          User.register(newUser, randomPassword, async (err, user) => {
            if (err) {
              console.error(`⚠️ Could not register user ${email}`, err);
              return reject(err);
            }
            // Send email after successful user creation
            try {
              await transporter.sendMail({
                from: `"Club Admin" <${process.env.EMAIL_USER}>`,
                to: email,
                subject,
                html: `
                  ${message}
                  <p>Your login credentials are:</p>
                  <p><b>Email:</b> ${email}</p>
                  <p><b>Password:</b> ${randomPassword}</p>
                `
              });
              console.log(`✅ User created & email sent to ${email}`);
            } catch (mailErr) {
              console.error(`❌ Failed to send email to ${email}`, mailErr);
            }
            resolve();
          });
        });
      } catch (loopErr) {
        console.error("Error in loop:", loopErr);
      }
    }

    req.flash("success_msg", "✅ Club created & members registered + emailed successfully");
    res.redirect('/club/create');

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "❌ Failed to create club");
    res.redirect('/club/create');
  }
});


router.get('/:clubId/dashboard', ensureAuthenticated, requireRole("superadmin", "admin"), async (req, res) => {
  const club = await Club.findById(req.params.clubId);
  const apps = await Application.find({ club: club._id }).limit(50);
  res.render('club/dashboard', { club, apps, user: req.user });
});


/// Create New Recruitment
router.get('/new/registration', ensureAuthenticated, requireRole("admin"), async (req, res) => {
  res.render('club/newRegistration.ejs');
});


// Handle form submission
router.post('/new/registration', ensureAuthenticated, requireRole("admin"), async (req, res) => {
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
router.get('/all/registrations', ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const user = req.user;
    const clubId = user.club;
    const registrations = await Registration.find({ clubId: clubId })
      .populate('clubId', 'name')
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .lean();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.render('club/allRegistration', {
      title: 'Club Registrations',
      registrations, baseUrl
    });

  } catch (err) {
    console.error(err);
    req.flash('error_msg', '❌ Failed to fetch registrations');
    res.redirect('/');
  }
});

// Route to view applicants by recruitmentId
router.get('/this/recruitment/:id/', ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const user = req.user;
    const clubId = user.club;
    const recruitmentId = req.params.id;
    const students = await StudentRegistration.find({ recruitmentId, clubId }).populate('clubId');
    res.render('club/thisRegistrations.ejs', { students, recruitmentId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// update the status of application
router.post('/students/:id/update-status', ensureAuthenticated, requireRole("admin"), async (req, res) => {
  try {
    const studentId = req.params.id;
    const { action } = req.body;

    const student = await StudentRegistration.findById(studentId);

    const user = req.user;
    const clubId = user.club;
    if (student.clubId.toString() !== clubId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (action === 'promote') {
      if (student.round < 3) {
        student.round += 1;
        student.status = 'Selected';
      }
      if (student.round == 3) {
        student.round += 0;
        student.status = 'Admitted';
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
