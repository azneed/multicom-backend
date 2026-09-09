# Multicom Backend

REST API backend for the Multicom gift scheme application.

## Overview

Provides core functionality for a gift scheme membership system: user authentication via OTP, payment tracking, scheme administration, and reporting.

## Technology Stack

- Node.js with Express.js
- MongoDB (Mongoose)
- JWT authentication
- AWS S3 for file storage
- SMS OTP via 2Factor.in API

## API Structure

Organized by functional area:

- **Authentication** — OTP-based user login
- **Users** — Registration, profiles, management
- **Payments** — Payment records, history, defaults
- **Schemes** — Scheme configuration
- **Activity & Reports** — Audit logs and analytics
- **Admin** — Administrative operations

## Authentication & Authorization

- Users authenticate via OTP sent to phone
- Successful verification returns JWT token
- Protected endpoints require `Authorization: Bearer <token>` header
- Two roles: regular user and admin/superadmin

## Database

MongoDB with Mongoose ODM for users, payments, schemes, activity logs, and reports.

## File Storage

AWS S3 integration via Multer-S3 for document uploads.

## Local Setup

### Prerequisites

- Node.js
- MongoDB
- AWS S3 account

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create `.env` file with:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
TWO_FACTOR_API_KEY=your_2factor_api_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket_name
```

### Run

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Project Structure

```
config/       Database setup
controllers/  Business logic
middleware/   Auth, validation
models/       Database schemas
routes/       API endpoints
server.js     Entry point
```

## Related

Frontend: [azneed/multicom-frontend](https://github.com/azneed/multicom-frontend)
