require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const http = require('http');                   // For HTTP server
const { Server } = require('socket.io');        // Socket.IO

const app = express();
const server = http.createServer(app);
const io = new Server(server);                  // Initialize Socket.IO

// Models
const User = require('./models/User');
const Submission = require('./models/Submission');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const flash = require('connect-flash');

app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.user = req.user;
   res.locals.currentPath = req.path;
  next();
});

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Routes
app.use('/', require('./routes/auth'));
app.use('/club', require('./routes/club'));      
app.use('/student', require('./routes/student'));
app.use('/forms', require('./routes/form'));

// Root route
app.get('/', (req, res) => {
  res.redirect('/login');
});

io.on('connection', (socket) => {
  console.log('User connected');
  socket.on('updateAttendance', async ({ submissionId, attendance }) => {
    console.log(`Updating attendance for ${submissionId} to ${attendance}`);
  try {
    await Submission.findByIdAndUpdate(submissionId, { attendance });
    console.log(`Attendance updated for ${submissionId}: ${attendance}`);
  } catch (err) {
    console.error('Failed to update attendance:', err);
  }
});

});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
