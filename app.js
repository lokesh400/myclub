require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

// Models
const User = require('./models/User');

const app = express();

// ------------------ DB CONNECTION ------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------ VIEW ENGINE ------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin'); // default layout (students/public)

// ------------------ MIDDLEWARE ------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const flash = require('connect-flash');

// after session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// flash middleware
app.use(flash());

// make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.user = req.user; // for passport
  next();
});

// ------------------ PASSPORT ------------------
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ------------------ ROUTES ------------------
app.use('/', require('./routes/auth'));      // signup, login, logout
app.use('/club', require('./routes/club'));      
app.use('/student', require('./routes/student')); // apply, status check
app.use('/admin', require('./routes/admin'));    // dashboard, manage apps

// ------------------ HOME ROUTE ------------------
app.get('/', (req, res) => {
  res.render('index', { title: "College Clubs Home" });
});

// ------------------ SERVER ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
