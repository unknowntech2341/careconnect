# CareConnect — NGO Donation Management System

A full-stack NGO donation platform with Razorpay integration, role-based dashboards, and admin approval workflows.

---

## Project Structure

```
careconnect/
├── schema.sql                  ← Import this into MySQL first
├── backend/
│   ├── server.js               ← Main Express app
│   ├── package.json
│   ├── .env                    ← Add your credentials here
│   ├── config/
│   │   └── db.js               ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js             ← JWT middleware
│   └── routes/
│       ├── auth.js             ← Login + NGO register
│       ├── admin.js            ← Admin routes (JWT protected)
│       ├── ngo.js              ← NGO + public donor routes
│       └── donations.js        ← Razorpay order + verify + history
└── frontend/
    ├── index.html              ← Homepage
    ├── donor.html              ← Donor: pick NGO + pay
    ├── donor-history.html      ← Donor: email-based history lookup
    ├── ngo-login.html          ← NGO: login + dashboard
    ├── ngo-register.html       ← NGO: registration form
    ├── admin-login.html        ← Admin: login + full dashboard
    └── shared/
        └── style.css           ← Shared styles
```

---

## Quick Setup

### 1. Set up MySQL

Import the schema into MySQL Workbench or phpMyAdmin (XAMPP):

```sql
-- In MySQL Workbench or phpMyAdmin, run:
source /path/to/careconnect/schema.sql
```

Or via terminal:
```bash
mysql -u root -p < schema.sql
```

This creates the `careconnect` database with:
- 2 predefined admins
- 4 sample NGOs (2 approved, 2 pending)
- 5 sample requirements
- 5 sample donations
- Auto-update trigger

---

### 2. Configure environment

Edit `backend/.env`:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=careconnect

JWT_SECRET=change_this_to_a_long_random_string

# Get test keys from https://dashboard.razorpay.com/app/keys
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET

FRONTEND_URL=http://localhost:3000
```

---

### 3. Install and run the backend

```bash
cd backend
npm install
npm run dev        # uses nodemon for hot reload
# or: npm start
```

Server starts at: http://localhost:5000

---

### 4. Open the frontend

Simply open any HTML file directly in your browser:
- `frontend/index.html` — Homepage
- `frontend/donor.html` — Donor page
- `frontend/admin-login.html` — Admin dashboard
- `frontend/ngo-login.html` — NGO dashboard

Or serve with VS Code Live Server / any static server.

---

## Default Login Credentials

### Admins
| Username | Password  |
|----------|-----------|
| admin1   | admin123  |
| admin2   | admin456  |

### NGOs (preloaded)
| Email            | Password | Status   |
|------------------|----------|----------|
| help@ngo.com     | ngo123   | Approved |
| clean@ngo.com    | ngo123   | Approved |
| green@ngo.com    | ngo123   | Pending  |
| hope@ngo.com     | ngo123   | Pending  |

---

## Razorpay Setup (Test Mode)

1. Create a free account at https://dashboard.razorpay.com
2. Go to **Settings → API Keys → Generate Test Key**
3. Copy `Key ID` and `Key Secret` into `backend/.env`
4. Use Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV

---

## API Endpoints Reference

### Auth
| Method | Endpoint              | Description              | Auth |
|--------|-----------------------|--------------------------|------|
| POST   | /auth/login           | Admin login              | —    |
| POST   | /auth/ngo-login       | NGO login                | —    |
| POST   | /auth/ngo-register    | NGO registration         | —    |

### Admin (requires admin JWT)
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | /admin/ngos           | List all NGOs            |
| PATCH  | /admin/ngo/:id        | Approve / reject NGO     |
| GET    | /admin/donations      | All donations            |
| GET    | /admin/requirements   | All requirements         |

### NGO & Public
| Method | Endpoint                       | Description                |
|--------|--------------------------------|----------------------------|
| GET    | /ngos                          | List approved NGOs         |
| GET    | /ngo/:id/requirements          | View NGO requirements      |
| POST   | /ngo/:id/requirements          | Add requirement (NGO JWT)  |
| PATCH  | /ngo/:id/requirements/:rid     | Update requirement         |
| GET    | /ngo/:id/donations             | NGO's donations (NGO JWT)  |
| GET    | /ngo/:id/summary               | NGO stats                  |

### Donations
| Method | Endpoint                    | Description                  |
|--------|-----------------------------|------------------------------|
| POST   | /donations/create-order     | Create Razorpay order        |
| POST   | /donations/verify           | Verify payment + save to DB  |
| GET    | /donations/history?email=   | Donor history lookup         |

---

## Donation Flow (Razorpay)

```
Donor fills form
    ↓
POST /donations/create-order  →  Razorpay order created + pending DB row
    ↓
Razorpay Checkout opens in browser
    ↓
Donor pays (UPI / card / netbanking)
    ↓
POST /donations/verify  →  Signature verified  →  donation marked 'completed'
    ↓
DB Trigger fires:
  - ngos.totalDonations += amount
  - requirements.current_amount += amount  (if requirement_id set)
```

---

## Tech Stack

| Layer         | Technology                         |
|---------------|------------------------------------|
| Frontend      | HTML5, CSS3, Vanilla JavaScript    |
| Backend       | Node.js, Express.js                |
| Database      | MySQL 8+                           |
| Auth          | bcryptjs (hashing), JWT (sessions) |
| Payments      | Razorpay Node.js SDK               |

---

## Security Notes

- Never commit `.env` to version control — add it to `.gitignore`
- Change `JWT_SECRET` to a long random string before going live
- Switch Razorpay keys from `rzp_test_*` to `rzp_live_*` in production
- Add rate limiting (`express-rate-limit`) before deploying publicly
