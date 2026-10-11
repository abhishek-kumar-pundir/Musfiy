import { generateToken } from "../config/generateToken.js";
import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(200).json({
      success: false,
      message: "All fields required",
    });
  }

  try {
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(200).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new userModel({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Registered Successfully",
      userId: user._id,
      name: user.name,
      email: user.email
    });

  } catch (error) {
    console.log(error);
    return res.status(200).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(200).json({
      success: false,
      message: "All fields required",
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: false,
        message: "Invalid Email",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(200).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Logged In Successfully",
      userId: user._id,
      name: user.name,
      email: user.email
    });

  } catch (error) {
    console.log(error);
    return res.status(200).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged Out Successfully",
    });

  } catch (error) {
    console.log(error);
    return res.status(200).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(200).json({ success: false, user: null, message: "No token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(200).json({ success: false, user: null, message: "Invalid or expired token" });
    }

    const user = await userModel.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(200).json({ success: false, user: null, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch {
    return res.status(200).json({ success: false, user: null, message: "Server error" });
  }
};

