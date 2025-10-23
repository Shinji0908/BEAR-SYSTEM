const { body, validationResult } = require('express-validator');

// Validation middleware for user registration
const validateRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .escape(),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .escape(),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .isIn(['Resident', 'Responder'])
    .withMessage('Role must be either Resident or Responder'),
  
  body('contact')
    .optional()
    .isMobilePhone('en-PH')
    .withMessage('Please provide a valid Philippine mobile number'),
  
  body('responderType')
    .if(body('role').equals('Responder'))
    .isIn(['police', 'fire', 'hospital', 'barangay'])
    .withMessage('Responder type must be police, fire, hospital, or barangay'),
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation middleware for incident creation
const validateIncident = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Incident name must be between 3 and 100 characters')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .escape(),
  
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('type')
    .optional()
    .isIn(['barangay', 'fire', 'hospital', 'police', 'earthquake', 'flood'])
    .withMessage('Type must be barangay, fire, hospital, police, earthquake, or flood'),
];

// Validation middleware for message sending
const validateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .escape(),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateIncident,
  validateMessage,
  handleValidationErrors
};
