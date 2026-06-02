const { body, validationResult } = require('express-validator');
const validateCourse = [body('title').trim().notEmpty().withMessage('Title required'), (req,res,next)=>{ const e=validationResult(req); if(!e.isEmpty()) return res.status(400).json({error:e.array()[0].msg}); next(); }];
const validateComment = [body('text').trim().notEmpty().withMessage('Comment required'), (req,res,next)=>{ const e=validationResult(req); if(!e.isEmpty()) return res.status(400).json({error:e.array()[0].msg}); next(); }];
const validateRegister = [body('email').isEmail().withMessage('Valid email required'), body('password').isLength({min:6}).withMessage('Password min 6 chars'), (req,res,next)=>{ const e=validationResult(req); if(!e.isEmpty()) return res.status(400).json({error:e.array()[0].msg}); next(); }];
module.exports = { validateCourse, validateComment, validateRegister };
