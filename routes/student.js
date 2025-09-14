const express = require('express');
const router = express.Router();
const StudentRegistration = require('../models/StudentRegistration');
const ClubRegistration = require('../models/ClubRegistration');
const Club = require('../models/Club');

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

// POST student registration
router.post('/register/:recruitmentId', async (req, res) => {

  const recruitmentId = req.params.recruitmentId;

  try {
    const recruitment = await ClubRegistration.findById(recruitmentId); 

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
      clubId: recruitment.clubId,
      recruitmentId: recruitment._id
    });

    await newStudent.save();
    req.flash('success_msg', 'Registration successful!');
    res.redirect(`/student/register/${recruitmentId}`);

  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Already Registered or Something went wrong');
    res.redirect(`/student/register/${recruitmentId}`);
  }
});

// all recruitments of a student
// Get all recruitments of a student by roll number
router.get('/recruitments', async (req, res) => {
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


module.exports = router;
