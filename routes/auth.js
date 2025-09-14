const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const Club = require('../models/Club');
const Application = require('../models/Application');
const router = express.Router();
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

module.exports = transporter;


// Signup (for students)
router.get('/signup', async (req, res) => {
  try {
    const clubs = await Club.find().lean(); // get all clubs
    res.render('auth/signup', { title: "Signup", clubs });
  } catch (err) {
    console.error(err);
    res.send("Server error");
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { username, password, role, club } = req.body;

    const newUser = new User({
      username,
      role,
      club: role === 'admin' && club ? club : null
    });

    User.register(newUser, password, (err, user) => {
      if (err) {
        console.error(err);
        req.flash('error_msg', err.message);
        return res.redirect('/signup');
      }

      // Auto-login after signup
      passport.authenticate('local')(req, res, () => {
        req.flash('success_msg', '✅ Signup successful!');
        res.redirect('/dashboard');
      });
    });

  } catch (err) {
    console.error(err);
    req.flash('error_msg', '❌ Something went wrong!');
    res.redirect('/signup');
  }
});
// Login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: "Login" });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      // req.flash("error_msg", "Something went wrong. Please try again.");
      return res.redirect("/login");
    }
    if (!user) {
      // req.flash("error_msg", info.message || "Invalid credentials.");
      return res.redirect("/login");
    }
    req.login(user, (err) => {
      if (err) {
        console.error("Login failed:", err);
        req.flash("error_msg", "Login failed. Please try again.");
        return res.redirect("/login");
      }
      req.flash("success_msg", "Successfully logged in!");
      res.redirect("/dashboard");
    });
  })(req, res, next);
});

/////// create new user
router.get('/new/user', (req, res) => {
  const clubId = req.user.role === 'admin' ? req.user.club : null;
  res.render('auth/newUser', { title: "Create New User",clubId });
});

router.post('/new/user', async (req, res) => {
  try {
    const user = req.user;
    const clubId = user.club
    const { username, password } = req.body;
    const role = 'admin'; // only admin can be created from here
    const newUser = new User({
      username,
      role,
      club: clubId
    });
    User.register(newUser, password, async (err, user) => {
      if (err) {
        console.error(err);
        req.flash('error_msg', err.message);
        return res.redirect('/signup');
      }

      let clubName = '';
      if (role === 'admin' && clubId) {
        const clubData = await Club.findById(clubId);
        clubName = clubData ? clubData.name : '';
      }
      const mailOptions = {
        from: `"MY CLUB" <${process.env.EMAIL_USER}>`,
        to: user.username.includes('@') ? user.username : '', // if username is email
        subject: '✅ Registration Successful',
        html: `
          <h2>Welcome, ${user.username}!</h2>
          <p>Your account has been created successfully.</p>
          <ul>
            <li><strong>Username:</strong> ${user.username}</li>
            <li><strong>Password:</strong> ${password}</li>
            <li><strong>Role:</strong> ${user.role}</li>
            ${clubName ? `<li><strong>Club Name:</strong> ${clubName}</li>` : ''}
          </ul>
          <p>Please keep this information safe.</p>
        `
      };
      try {
        await transporter.sendMail(mailOptions);
        console.log('Registration email sent to:', user.username);
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }
      req.flash('success_msg', '✅ Signup successful! Check your email for details.');
      res.redirect('/dashboard');
    });

  } catch (err) {
    console.error(err);
    req.flash('error_msg', '❌ Something went wrong!');
    res.redirect('/new/user');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

// Dashboard (basic redirect based on role)
router.get('/dashboard', (req, res) => {
  if (!req.user) return res.redirect('/login');

  if (req.user.role === 'superadmin') {
    return res.render('admin/dashboard', { layout: 'layouts/admin', user: req.user });
  }
  if (req.user.role === 'admin') {
    return res.render('admin/dashboard', { layout: 'layouts/admin', user: req.user });
  }
  return res.render('student/status', { layout: 'layouts/public', user: req.user });
});

module.exports = router;
