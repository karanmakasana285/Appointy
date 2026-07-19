import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import jwt from "jsonwebtoken";
import {v2 as cloudinary} from 'cloudinary'  
import razorpay from 'razorpay';
import transporter from '../config/nodemailer.js'
    

// API to register user
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to login user
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


// API to send OTP for password reset
const sendResetOtp = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.json({ success: false, message: 'Email is required' })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: 'No account found with this email' })
        }

        // generate a 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000))

        user.resetOtp = otp
        user.resetOtpExpiry = Date.now() + 10 * 60 * 1000 // valid for 10 minutes
        await user.save()

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Appointy - Password Reset OTP',
            text: `Your OTP for resetting your password is ${otp}. It is valid for 10 minutes. If you did not request this, please ignore this email.`
        }

        await transporter.sendMail(mailOptions)

        res.json({ success: true, message: 'OTP sent to your email' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to reset password using OTP
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body

        if (!email || !otp || !newPassword) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        if (newPassword.length < 8) {
            return res.json({ success: false, message: 'Please enter a strong password' })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: 'No account found with this email' })
        }

        if (!user.resetOtp || user.resetOtp !== otp) {
            return res.json({ success: false, message: 'Invalid OTP' })
        }

        // ---- this is the Date.now() expiry check ----
        if (user.resetOtpExpiry < Date.now()) {
            return res.json({ success: false, message: 'OTP has expired. Please request a new one.' })
        }
        // -----------------------------------------------

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        user.password = hashedPassword
        user.resetOtp = ''
        user.resetOtpExpiry = 0
        await user.save()

        res.json({ success: true, message: 'Password reset successful' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


// API to get user profile data
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update user profile
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to book appointment 
const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime } = req.body
        const docData = await doctorModel.findById(docId).select("-password")

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        let slots_booked = docData.slots_booked

        // checking for slot availablity 
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot Not Available' })
            }
            else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select("-password")

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // send booking confirmation email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: userData.email,
                subject: 'Appointy - Appointment Confirmed',
                text: `Hi ${userData.name},\n\nYour appointment with Dr. ${docData.name} (${docData.speciality}) is confirmed for ${slotDate}, ${slotTime}.\n\nThank you for using Appointy.`
            })
        } catch (emailError) {
            console.log('Booking email failed:', emailError.message)
        }

        res.json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {

        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user 
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot 
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // send cancellation email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: appointmentData.userData.email,
                subject: 'Appointy - Appointment Cancelled',
                text: `Hi ${appointmentData.userData.name},\n\nYour appointment with Dr. ${appointmentData.docData.name} on ${slotDate}, ${slotTime} has been cancelled.\n\nIf this wasn't you, please contact support.`
            })
        } catch (emailError) {
            console.log('Cancellation email failed:', emailError.message)
        }

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}
// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.json({ success: false, message: 'Online payment is currently unavailable. Please choose Cash on the appointment.' })
        }

        const razorpayInstance = new razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        })

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        // creating options for razorpay payment
        const options = {
            amount: appointmentData.amount * 100,
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }

        // creation of an order
        const order = await razorpayInstance.orders.create(options)

        res.json({ success: true, order })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.json({ success: false, message: 'Online payment is currently unavailable.' })
        }

        const razorpayInstance = new razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        })
        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
            res.json({ success: true, message: "Payment Successful" })
        }
        else {
            res.json({ success: false, message: 'Payment Failed' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


export {registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, sendResetOtp, resetPassword}