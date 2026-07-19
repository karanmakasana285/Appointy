import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext)
  const navigate = useNavigate()

  const [step, setStep] = useState('email') // 'email' -> 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const sendOtpHandler = async (event) => {
    event.preventDefault()
    try {
      const { data } = await axios.post(backendUrl + '/api/user/send-reset-otp', { email })
      if (data.success) {
        toast.success(data.message)
        setStep('otp')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const resetPasswordHandler = async (event) => {
    event.preventDefault()
    try {
      const { data } = await axios.post(backendUrl + '/api/user/reset-password', { email, otp, newPassword })
      if (data.success) {
        toast.success(data.message)
        navigate('/login')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={step === 'email' ? sendOtpHandler : resetPasswordHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>Reset Password</p>
        <p>{step === 'email' ? 'Enter your registered email to receive an OTP' : 'Enter the OTP sent to your email and your new password'}</p>

        <div className='w-full'>
          <p>Email</p>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            className='border border-[#DADADA] rounded w-full p-2 mt-1'
            type="email"
            required
            disabled={step === 'otp'}
          />
        </div>

        {step === 'otp' && (
          <>
            <div className='w-full'>
              <p>OTP</p>
              <input
                onChange={(e) => setOtp(e.target.value)}
                value={otp}
                className='border border-[#DADADA] rounded w-full p-2 mt-1'
                type="text"
                required
              />
            </div>
            <div className='w-full'>
              <p>New Password</p>
              <input
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
                className='border border-[#DADADA] rounded w-full p-2 mt-1'
                type="password"
                required
              />
            </div>
          </>
        )}

        <button type='submit' className='bg-primary text-white w-full py-2 my-2 rounded-md text-base'>
          {step === 'email' ? 'Send OTP' : 'Reset Password'}
        </button>

        {step === 'otp' && (
          <p onClick={() => setStep('email')} className='text-primary underline cursor-pointer'>
            Change email
          </p>
        )}
      </div>
    </form>
  )
}

export default ResetPassword