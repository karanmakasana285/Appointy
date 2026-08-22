# Appointy — Doctor Appointment Booking Platform

A full-stack MERN application for booking doctor appointments online, with three distinct role-based experiences: **Patient**, **Doctor**, and **Admin**. Patients can search doctors by specialty, book time slots, and pay online via Razorpay or in cash; doctors manage their schedule and earnings; admins manage the doctor roster and oversee all bookings platform-wide.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (patient app) | React 19, Vite, Tailwind CSS |
| Admin & Doctor app | React 19, Vite, Tailwind CSS |
| Backend API | Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JSON Web Tokens (JWT) |
| Media storage | Cloudinary |
| Payments | Razorpay + Cash-on-visit |
| Email | Nodemailer |

## Architecture

The repo is split into three independently deployable apps that share one backend API:

```
Appointy-master/
├── frontend/   # Patient-facing React app (browse, book, pay, manage appointments)
├── admin/      # Admin + Doctor React app (role-based views in one app)
└── backend/    # Express REST API, MongoDB models, auth middleware
```

- **`backend/`** — REST API with separate JWT middleware per role (`authUser`, `authDoctor`, `authAdmin`), Mongoose models for users, doctors, and appointments, Cloudinary integration for profile image uploads, and Razorpay order creation/verification for online payments.
- **`frontend/`** — Patient experience: home, specialty search, doctor listing and profile pages, appointment booking flow, profile management, and appointment history.
- **`admin/`** — A single app serving two role-gated views: the **Admin** panel (add/manage doctors, view all appointments, dashboard analytics) and the **Doctor** panel (manage own appointments, earnings dashboard, profile/availability updates).

## Key Features

- **Three-tier authentication** — separate JWT-protected auth flows and route guards for patients, doctors, and admins.
- **Appointment booking** — real-time doctor availability, slot selection, and booking with either Razorpay online payment or cash-on-visit.
- **Payment verification** — server-side Razorpay order creation and signature verification before confirming a booking as paid.
- **Doctor management** — admins can onboard doctors with profile image (Cloudinary upload), specialty, degree, experience, fees, and address.
- **Role-based dashboards** — admin dashboard aggregates total doctors/appointments/patients; doctor dashboard tracks earnings and recent bookings.
- **Profile management** — patients and doctors can update their own profile details and profile picture.
- **Appointment lifecycle** — cancel or mark-as-completed actions available to both doctors and admins.

## Getting Started

Each app has its own dependencies and environment file. Run all three (`backend`, `frontend`, `admin`) for the full application.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MongoDB URI, Cloudinary, JWT secret, Razorpay keys, admin credentials
npm run server
```

### 2. Frontend (patient app)

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_BACKEND_URL and VITE_RAZORPAY_KEY_ID
npm run dev
```

### 3. Admin app (admin + doctor panel)

```bash
cd admin
npm install
cp .env.example .env   # set VITE_BACKEND_URL
npm run dev
```

Each `.env.example` file lists the exact variables required for that app.

## License

See [LICENSE](./LICENSE).
