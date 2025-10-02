# 🕉️ Divine Energy Hub - Complete System

A comprehensive event management system with QR code scanning, user management, and prasad distribution tracking.

## 🏗️ Project Structure

```
divine-dashboard-main/
├── src/                    # React Frontend
│   ├── components/         # React Components
│   ├── context/           # React Context
│   ├── hooks/             # Custom Hooks
│   └── utils/             # Utility Functions
├── backend/               # Flask Backend
│   ├── app.py            # Main Flask Application
│   └── requirements.txt  # Python Dependencies
├── public/               # Static Assets
└── build/               # Production Build
```

## 🚀 Quick Start

### Option 1: Start Everything at Once
```bash
# Double-click or run:
start-all.bat
```

### Option 2: Start Separately

#### Backend Server (Port 5000)
```bash
# Double-click or run:
start-backend.bat

# Or manually:
cd backend
pip install -r requirements.txt
python app.py
```

#### Frontend Server (Port 3000)
```bash
# Double-click or run:
start-frontend.bat

# Or manually:
npm install
npm start
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 🔧 Features

### Frontend Features
- ✅ QR Code Scanning
- ✅ User Registration & Search
- ✅ Photo Upload
- ✅ Prasad Distribution Tracking
- ✅ Entry Gate Management
- ✅ Token Finder
- ✅ Google Sheets Integration

### Backend API Endpoints
- `POST /api/update-sheet` - Update Google Sheet
- `POST /api/users` - Create new user
- `GET /api/user/search` - Search user by name/phone
- `GET /api/user/token/{token}` - Get user by token
- `POST /api/upload` - Upload photos
- `GET /api/prasad/status` - Get prasad status
- `POST /api/prasad/update` - Update prasad status
- `POST /api/prasad/entry` - Record prasad entry
- `POST /api/check_qr` - Check QR code from image

## 🛠️ Technology Stack

### Frontend
- React 18.2.0
- React Router 6.20.0
- Tailwind CSS 3.3.5
- React QR Scanner
- React Icons

### Backend
- Flask 2.3.3
- OpenCV 4.8.1.78
- NumPy 1.24.3
- Flask-CORS 4.0.0

## 📱 Usage

1. **Start both servers** using `start-all.bat`
2. **Open browser** to http://localhost:3000
3. **Use the dashboard** to:
   - Scan QR codes
   - Register new users
   - Track prasad distribution
   - Manage entry gates
   - Upload photos

## 🔧 Development

### Frontend Development
```bash
cd divine-dashboard-main
npm install
npm start
```

### Backend Development
```bash
cd divine-dashboard-main/backend
pip install -r requirements.txt
python app.py
```

## 📝 Notes

- Backend runs on port 5000
- Frontend runs on port 3000
- CORS is enabled for local development
- Mock data is used for demonstration
- In production, integrate with real databases and Google Sheets API

## 🆘 Troubleshooting

1. **Port already in use**: Change ports in app.py (backend) or package.json (frontend)
2. **Python dependencies**: Run `pip install -r requirements.txt`
3. **Node dependencies**: Run `npm install`
4. **CORS issues**: Ensure backend is running on port 5000

---

**Made with ❤️ for Divine Energy Hub**