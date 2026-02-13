import createHttpError from "http-errors";
import { User } from "../models/user.js";
import bcrypt from "bcrypt"
import { Session } from "../models/session.js";
import { createSession, setSessionCookies } from "../services/auth.js";
import  jwt from 'jsonwebtoken'
import { sendEmail } from "../utils/sendEmail.js";
import path from 'node:path';
import fs from 'node:fs/promises';
import handlebars from 'handlebars';



export const registerUser = async (req, res)=>{

    const {email, password} = req.body;
    // console.log('Register user:', email, password);
    const existingUser = await User.findOne({email});

    if (existingUser) {
        throw createHttpError(400, 'Email in use');
    }
    console.log(password)
    const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword)

        
    const newUser = await User.create({
        email,
        password: hashedPassword
    })
    const newSession = await createSession(newUser._id);
    setSessionCookies(res, newSession);
    res.status(201).json(newUser);
}

export const loginUser = async (req, res)=>{

    const {email, password} = req.body;
    const user = await User.findOne({email});
    if (!user) {
        throw createHttpError(401, 'Invalid credentials');
    }
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if(!isValidPassword){
        throw createHttpError(401, 'Invalid credentials')
    }

    await Session.deleteOne({userId: user._id});
    const newSession = await createSession(user._id)
    setSessionCookies(res, newSession);
    res.status(200).json(user)
}   

export const logoutUser = async (req, res)=>{
 const {sessionId} = req.cookies;
if (sessionId) {
    await Session.deleteOne({_id: sessionId})
}
res.clearCookie('sessionId');
res.clearCookie('accessToken');
res.clearCookie('refreshToken');
res.status(204).send();
}

export const refreshUserSession = async (req, res)=>{
    const session = await Session.findOne({_id: req.cookies.sessionId, refreshToken: req.cookies.refreshToken});
    console.log(session)
    if (!session) {
        throw createHttpError(401, 'Session not found');
    };
    const isSessionTokenExpired = new Date() > new Date(req.cookies.refreshTokenValidUntil);
    if (isSessionTokenExpired) {
        throw createHttpError(401, 'Session token expired');
    }
    await Session.deleteOne({_id: req.cookies.sessionId, refreshToken: req.cookies.refreshToken});
    const newSession = await createSession(session.userId);
    setSessionCookies(res, newSession);
    res.status(200).json({"message": "Session refreshed"});
}

export const requestResetEmail = async (req, res)=>{
    const {email} = req.body;
    const user = await User.findOne({email});
    console.log(user)
    if(!user){
       return res.status(200).json({ message: 'Password reset email sent successfully' });
    }
    
    const resetToken = jwt.sign(
        {"sub": user._id, email},
        process.env.JWT_SECRET, 
        {expiresIn: '15m'},
    );

    const templatePath = path.resolve('src/templates/reset-password-email.html');
    const templateSource = await fs.readFile(templatePath, 'utf-8')
    const template = handlebars.compile(templateSource);
    const html = template({
        name: user.username,
        link: `${process.env.FRONTEND_DOMAIN}/reset-password?token=${resetToken}`
    });
    try {
       await sendEmail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Reset your password',
        html,
        })
    } catch  {
        throw createHttpError(500, 'Failed to send the email, please try again later.');
    }
    res.status(200).json({ message: 'Password reset email sent successfully' });
};

export const resetPassword = async (req, res)=>{
    const {password, token} = req.body;
    let payload;
    // console.log(payload)
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
       throw createHttpError(401, 'Invalid or expired token');
    }
    const user = await User.findOne({_id: payload.sub, email:payload.email})
    if (!user) {
        throw createHttpError(404, 'User not found');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.updateOne(
        {_id: user._id},    
        {password: hashedPassword}
    )
      await Session.deleteMany({ userId: user._id });
 res.status(200).json({
    message: 'Password reset successfully',
  });
}