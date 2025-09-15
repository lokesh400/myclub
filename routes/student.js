const express = require('express');
const router = express.Router();
const StudentRegistration = require('../models/StudentRegistration');
const ClubRegistration = require('../models/ClubRegistration');
const Club = require('../models/Club');
const { ensureAuthenticated, requireRole } = require('../middlewares/auth');

// POST student registration
const nodemailer = require('nodemailer');

// Configure your transporter (make sure you have EMAIL_USER and EMAIL_PASS in .env)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or any email service you use
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// GET registration form for a specific recruitment
router.get('/register/:recruitmentId', async (req, res) => {
  try {
    const recruitmentId = req.params.recruitmentId;
    const recruitment = await ClubRegistration.findById(recruitmentId)
      .populate('clubId', 'name')
      .lean();

      console.log(recruitment);

    if (!recruitment) {
      req.flash('error_msg', 'Recruitment not found');
      return res.redirect('/');
    }

    res.render('student/register', {
      title: 'Student Registration',
      recruitment
    });

  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Something went wrong');
    res.redirect('/');
  }
});


/// register to a recruitment
router.post('/register/:recruitmentId', async (req, res) => {
  const recruitmentId = req.params.recruitmentId;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    const recruitment = await ClubRegistration.findById(recruitmentId).populate('clubId');
    if (!recruitment) {
      req.flash('error_msg', 'Recruitment not found');
      return res.redirect('/');
    }
    const { name, course, branch, semester, rollNumber, email, phoneNumber } = req.body;
    const existing = await StudentRegistration.findOne({ rollNumber, recruitmentId });
    if (existing) {
      req.flash('error_msg', 'You have already registered for this recruitment');
      return res.redirect(`/student/register/${recruitmentId}`);
    }
    const newStudent = new StudentRegistration({
      name, course, branch, semester, rollNumber, email, phoneNumber,
      clubId: recruitment.clubId._id,
      recruitmentId: recruitment._id
    });

    await newStudent.save();
    const trackingLink = `${baseUrl}/student/track/${newStudent._id}`;
    const subject = `Application Submitted for ${recruitment.clubId.name}`;
    const message = `
      <h2>Thank you for applying, ${name}!</h2>
      <p>Your application for <strong>${recruitment.clubId.name}</strong> has been received.</p>
      <p>You can track your application using this ID:</p>
      <p>Or click the link below to check status:</p>
      <a href="${trackingLink}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Track Application</a>
      <br/><br/>
      <p>Regards,<br/>${recruitment.clubId.name} Team</p>
    `;
    await transporter.sendMail({
      from: `"${recruitment.clubId.name} Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: message
    });
    req.flash('success_msg', 'Registration successful! Check your email for application ID.');
    res.redirect(`/student/register/${recruitmentId}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Something went wrong during registration');
    res.redirect(`/student/register/${recruitmentId}`);
  }
});


// all recruitments of a student
// Get all recruitments of a student by roll number
router.get('/recruitments',ensureAuthenticated,requireRole("admin","superadmin"), async (req, res) => {
  try {
    const rollNumber = req.query.rollNumber;

    if (!rollNumber) return res.render('studentRecruitments', { recruitments: [], rollNumber: '' });

    const recruitments = await StudentRegistration.find({ rollNumber })
      .populate('clubId', 'name')
      .populate('recruitmentId', 'year') // populate additional fields if needed
      .lean();

    res.render('student/allApplied', { recruitments, rollNumber });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



////tracking by student
router.get('/track/:id', (req, res) => {
  const applicationId = req.params.id;
  StudentRegistration.findById(applicationId)
    .populate('clubId', 'name')
    .populate('recruitmentId', 'year')
    .lean()
    .then(application => {
      if (!application) {
        req.flash('error_msg', 'Application not found');
        return res.redirect('/');
      }
      res.render('student/trackForm', { title: 'Track Your Application', application, layout: false });
    })
    .catch(err => {
      console.error(err);
      req.flash('error_msg', 'Something went wrong');
      res.redirect('/');
    });
});

module.exports = router;
