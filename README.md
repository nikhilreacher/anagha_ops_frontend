# Anagha Ops Frontend

React + Vite frontend for the Anagha Operations system. This app provides role-based access to operational workflows such as dashboard reporting, credit tracking, deliveries, collections, dispatch, and IT support screens.

## Tech Stack

- React 18
- Vite 5
- React Router DOM 6
- Tailwind CSS 3
- Axios

## Features

- Role-based login flow backed by the API
- Admin workspace with access to all operational modules
- Delivery-only and IT-only restricted workspaces
- Dashboard with expense tracking, employee management, advances, and salary calculation
- Payment collection flow for shops with outstanding credit
- Separate pages for credit, delivery, dispatch, and IT operations
- ICD business workflows including credit, follow-ups, collections, and payment confirmations

## Project Structure

```text
src/
  App.jsx              App shell, login flow, routing, role-based navigation
  main.jsx             React entry point
  index.css            Global styles
  pages/
    Dashboard.jsx      Admin dashboard and operational summary
    Credit.jsx         Credit-related workflow
    Delivery.jsx       Delivery workflow
    Payments.jsx       Payment collection entry
    Dispatch.jsx       Dispatch workflow
    IT.jsx             IT support workspace
```

## Requirements

Before running the frontend, make sure you have:

- Node.js 18 or newer
- npm
- A backend API URL configured in a local `.env` file

## Installation

```bash
npm install
```

Create a `.env` file in the project root and add:

```bash
VITE_API_BASE_URL=https://anagha-ops-backend.onrender.com
```

## Running Locally

Start the development server:

```bash
npm run dev
```

By default, Vite will print a local URL such as `http://localhost:5173`.

## Build For Production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Backend Dependency

The frontend reads the backend base URL from `VITE_API_BASE_URL` in your `.env` file. The app expects the backend to expose endpoints used for:

- Authentication
- Admin dashboard data
- Expenses
- Employees and salary advances
- Salary payments
- Routes and beat data
- Payment collection
- Dispatch management
- ICD credit and follow-up workflows

## Authentication and Roles

Login state is stored in browser local storage under the key `anagha_ops_auth`.

Supported role behavior in the frontend:

- `admin`: full navigation across all pages
- `delivery`: redirected to the Delivery page only
- `it`: redirected to the IT page only
- `salesman`: ICD credit and collection-oriented flows

## Available Routes

- `/` - Dashboard
- `/credit` - Credit
- `/delivery` - Delivery
- `/payments` - Payments
- `/dispatch` - Dispatch
- `/it` - IT

The visible routes depend on the logged-in user role.

## Notes

- `requirements.txt` is only a dependency reference note for this repo; frontend installation uses `npm`, not `pip`.
- A Python virtual environment folder may exist locally for backend-related work, but it is not required to run this frontend.
- The repo includes a `.gitignore` that excludes local dependencies, virtual environments, build output, logs, and editor files.

## Next Features

Potential no-cost additions we can explore later:

- `Follow-up priority score`: show shops that are most urgent based on outstanding amount, bill age, and missed follow-up count.
- `Today's action queue`: one salesman screen that combines due follow-ups, overdue follow-ups, and shops with highest collectible amount.
- `Promise tracking`: when a shop says tomorrow or gives a date, track how many times they postponed before finally paying.
- `Collection probability`: simple rule-based tag like `High chance`, `Medium`, or `Low` based on payment history and follow-up behavior.
- `Beat-wise recovery summary`: for each beat, show outstanding, collected this week, due-today follow-ups, and overdue promises.
- `Overdue follow-up alerts`: highlight shops where promised date has already passed.
- `Salesman productivity metrics`: visits made, follow-ups recorded, payments collected, pending confirmations, and conversion rate.
- `Payment behavior insights`: tags like `Pays on reminder`, `Needs repeat follow-up`, `Usually partial payment`, `Frequently delays`.
- `Daily closing snapshot`: today's collections, new credit added, expenses, pending follow-ups, and pending payment confirmations.
- `Risk shops list`: top shops likely to become bad debt based on aging and repeat postponements.
- `Expense anomaly check`: flag expense types that are much higher than recent average.
- `MOC helper warnings`: simple alerts if sales drop, discount spikes, or ICD share changes sharply.
- `Data quality checks`: missing phone numbers, unnamed shops, duplicate-looking shops, blank beats, and suspicious entries.
