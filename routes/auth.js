const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const Club = require('../models/Club');
const Application = require('../models/Application');
const router = express.Router();
const nodemailer = require('nodemailer');
const { ensureAuthenticated, requireRole } = require('../middlewares/auth');

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


// Signup (for students)
router.get('/signup',ensureAuthenticated,requireRole("superadmin"), async (req, res) => {
  try {
    const clubs = await Club.find().lean(); // get all clubs
    res.render('auth/signup', { title: "Signup", clubs });
  } catch (err) {
    console.error(err);
    res.send("Server error");
  }
});

router.post('/signup',ensureAuthenticated,requireRole("superadmin"), async (req, res) => {
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
  res.render('auth/login', { title: "Login",
    layout: 'layouts/public'  
   });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      req.flash("error_msg", "Something went wrong. Please try again.");
      return res.redirect("/login");
    }
    if (!user) {
      req.flash("error_msg", info.message || "Invalid credentials.");
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
router.get('/new/user', ensureAuthenticated,requireRole("admin","superadmin"),(req, res) => {
  const clubId = req.user.role === 'admin' ? req.user.club : null;
  res.render('auth/newUser', { title: "Create New User",clubId });
});


//// create new user post
router.post('/new/user',ensureAuthenticated,requireRole("admin"), async (req, res) => {
  try {
    const currentUser = req.user; // who is creating the user
    const clubId = currentUser.club;

    const club = await Club.findById(clubId);
    if (!club) {
      req.flash("error_msg", "Club not found!");
      return res.redirect("/dashboard");
    }

    const jsecs = club.jsec || []; // array of JSEC emails

    const { username, email } = req.body;
    const role = "admin"; // only admin can be created from here

    // ✅ Generate a random password
    const password = generateRandomPassword(8);

    const newUser = new User({
      username,
      email,
      role,
      club: clubId,
    });

    User.register(newUser, password, async (err, user) => {
      if (err) {
        console.error(err);
        req.flash("error_msg", err.message);
        return res.redirect("/new/user");
      }

      const clubName = club.name;

      // Email to the newly created user
      const userMailOptions = {
        from: `"MY CLUB" <${process.env.EMAIL_USER}>`,
        to: user.email || (user.username.includes("@") ? user.username : ""),
        subject: "✅ Registration Successful",
        html: `
          <h2>Welcome, ${user.username}!</h2>
          <p>Your account has been created successfully.</p>
          <ul>
            <li><strong>Username:</strong> ${user.username}</li>
            <li><strong>Password:</strong> ${password}</li>
            <li><strong>Role:</strong> ${user.role}</li>
            <li><strong>Club Name:</strong> ${clubName}</li>
          </ul>
          <p>Please keep this information safe.</p>
        `,
      };

      await transporter.sendMail(userMailOptions);

      // Email to all JSEC members for transparency
      for (const jsecEmail of jsecs) {
        try {
          await transporter.sendMail({
            from: `"MY CLUB" <${process.env.EMAIL_USER}>`,
            to: jsecEmail,
            subject: `New Admin Created for ${clubName}`,
            html: `
              <p>Hello,</p>
              <p>A new admin account has been created for the club <strong>${clubName}</strong>.</p>
              <ul>
                <li><strong>Username:</strong> ${user.username}</li>
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Role:</strong> ${user.role}</li>
                <li><strong>Created By:</strong> ${currentUser.username}</li>
              </ul>
            `,
          });
        } catch (mailErr) {
          console.error(`❌ Failed to notify JSEC: ${jsecEmail}`, mailErr);
        }
      }

      req.flash("success_msg", "✅ User created successfully & emails sent!");
      res.redirect("/dashboard");
    });

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "❌ Something went wrong!");
    res.redirect("/new/user");
  }
});

// Random password generator function
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}


// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

// Dashboard (basic redirect based on role)
router.get('/dashboard',ensureAuthenticated,requireRole("admin","superadmin"), async (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role === 'superadmin') {
    return res.render('admin/dashboard', {layout: 'layouts/admin', user: req.user });
  }
  if (req.user.role === 'admin') {
    const club = await Club.findById(req.user.club);
    return res.render('admin/dashboard', {club, layout: 'layouts/admin', user: req.user });
  }
  return res.render('student/status', { layout: 'layouts/public', user: req.user });
});

module.exports = router;
