const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const config = require('config');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator/check');
const User = require('../../models/User');

// @ route    GET api/users
// @desc      Get a regsiter form
// @access    Public

router.get('/register', (req, res) => {
  res.render('register');
});

// @ route    POST api/users
// @desc      Register User
// @access    Public
router.post(
  '/',
  [
    check('name', 'Name is required')
      .not()
      .isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      ' Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { name, email, password } = req.body;

    try {
      // See if user exists, have to be unique
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }
      // Get users gravatar
      const avatar = gravatar.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      });
      user = new User({
        name,
        email,
        avatar,
        password
      });

      //encrypt password
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);
      // anything that return a promise, we have to put await !!
      await user.save();
      //return jsonwebtoken
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 60 * 60 * 100 },
        (err, token) => {
          // window.localStorage.setItem('x-auth-token', token);
          res.cookie('x_auth_token', token);
          res.json({ token });
          // res.cookie('x-auth-token', token);
          // req.flash('You seccessfully registered your account');
          // res.redirect('/user/login');
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
