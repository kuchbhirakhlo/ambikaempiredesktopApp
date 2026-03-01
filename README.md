# Supplier Management System

A desktop application built with Electron.js for managing Supplier, orders, and inventory.

## Features

- User authentication (Admin and Employee roles)
- Dashboard with overview of today's orders and inventory status
- Detailed views of orders and inventory items
- Stock status monitoring

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

## Running the Application

```
npm start
```

## Default Login Credentials

### Admin
- Username: admin
- Password: admin123

### Employee
- Username: employee
- Password: employee123

## Technologies Used

- Electron.js
- HTML/CSS/JavaScript
- electron-store (for data persistence)

## Application Structure

- `src/main.js`: Main Electron process
- `src/preload.js`: Preload script for secure IPC communication
- `src/pages/`: HTML pages for the application
  - `login.html`: Login page
  - `dashboard.html`: Main dashboard 