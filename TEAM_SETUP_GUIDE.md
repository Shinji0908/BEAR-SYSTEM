# BEAR System - Team Setup Guide

## 👥 **Complete Team Onboarding Guide**

This guide will help your team members set up the BEAR system on their local devices.

---

## 📋 **Before You Start**

### **✅ What You Need:**
- **Computer** with Windows/Mac/Linux
- **Internet connection** for downloading dependencies
- **GitHub account** (free)
- **Basic command line knowledge**

### **✅ What to Install First:**
1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** (local) or **MongoDB Atlas** (cloud) - [Download here](https://www.mongodb.com/try/download/community)
3. **Git** - [Download here](https://git-scm.com/)

---

## 🚀 **Step-by-Step Setup**

### **Step 1: Download the System**

#### **Option A: Clone from GitHub (Recommended)**
```bash
# Open command prompt/terminal
git clone https://github.com/Shinji0908/BEAR-SYSTEM.git
cd BEAR-SYSTEM
```

#### **Option B: Download ZIP**
1. Go to [https://github.com/Shinji0908/BEAR-SYSTEM](https://github.com/Shinji0908/BEAR-SYSTEM)
2. Click "Code" → "Download ZIP"
3. Extract the ZIP file
4. Open command prompt in the extracted folder

### **Step 2: Install Dependencies**

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd bear-backend
npm install

# Install frontend dependencies
cd ../bear-frontend
npm install

# Go back to root directory
cd ..
```

**⏱️ This may take 5-10 minutes depending on your internet speed.**

### **Step 3: Set Up Environment Variables**

#### **Backend Environment:**
```bash
cd bear-backend
cp env.example .env
```

**Edit `bear-backend/.env` file:**
```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/bear-system

# Server Configuration
PORT=5000

# JWT Secret Key (Change this to something secure!)
JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### **Frontend Environment:**
```bash
cd bear-frontend
cp env.example .env
```

**Edit `bear-frontend/.env` file:**
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### **Step 4: Start the System**

```bash
# From the root directory (BEAR-SYSTEM folder)
npm run dev
```

**✅ You should see:**
- Backend starting on port 5000
- Frontend starting on port 3000
- MongoDB connection successful

---

## 🌐 **Access Your System**

### **Web Interface:**
- **URL:** http://localhost:3000
- **What you'll see:** BEAR System login page

### **API Health Check:**
- **URL:** http://localhost:5000/api/health
- **What you'll see:** `{"status":"OK","message":"Server is running"}`

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: "Port already in use" Error**

**Problem:** Something is already running on port 5000 or 3000

**Solution:**
```bash
# Windows:
netstat -ano | findstr :5000
taskkill /F /PID <process_id>

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

### **Issue 2: "MongoDB connection failed"**

**Problem:** Database not connected

**Solutions:**
- **Local MongoDB:** Make sure MongoDB is running
- **MongoDB Atlas:** Check your connection string
- **Network:** Check internet connection

### **Issue 3: "npm install failed"**

**Problem:** Dependencies not installing

**Solution:**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **Issue 4: "Frontend not loading"**

**Problem:** React app not starting

**Solutions:**
- Check if backend is running (port 5000)
- Check environment variables in `.env`
- Check browser console for errors

### **Issue 5: "Login not working"**

**Problem:** Can't log in to the system

**Solutions:**
- Check if database is connected
- Verify user exists in database
- Check password is correct
- Try registering a new user

---

## 🎯 **Testing Your Setup**

### **Test 1: Backend API**
```bash
# Test health endpoint
curl http://localhost:5000/api/health
# Should return: {"status":"OK","message":"Server is running"}
```

### **Test 2: Frontend Interface**
1. Open browser
2. Go to http://localhost:3000
3. Should see BEAR System login page

### **Test 3: Database Connection**
1. Check backend console
2. Should see "MongoDB Connected successfully"
3. If not, check your MONGO_URI in .env

### **Test 4: User Registration**
1. Go to http://localhost:3000
2. Try to register a new user
3. Should work without errors

---

## 🔐 **First-Time Setup**

### **Create Admin User:**
1. **Register a new user** through the web interface
2. **Note the user ID** from the database
3. **Update user role** to "Admin" in the database
4. **Or use the admin registration endpoint**

### **Set Up Database:**
- **Local MongoDB:** Database will be created automatically
- **MongoDB Atlas:** Make sure your IP is whitelisted

---

## 📱 **For Mobile App Development**

### **Android Emulator:**
- **Backend URL:** http://10.0.2.2:5000
- **Frontend URL:** http://10.0.2.2:3000

### **Physical Device:**
- **Backend URL:** http://YOUR_IP:5000
- **Frontend URL:** http://YOUR_IP:3000
- **Find your IP:** `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

---

## 🚀 **Production Deployment**

### **For Production:**
- **Use Railway + MongoDB Atlas** (see `RAILWAY_DEPLOYMENT_GUIDE.md`)
- **Automatic HTTPS** certificates
- **Scalable infrastructure**
- **Free tier available**

### **Environment Variables for Production:**
```env
# Backend
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system
JWT_SECRET=your-production-secret

# Frontend
REACT_APP_API_URL=https://your-backend-name.railway.app
REACT_APP_SOCKET_URL=https://your-backend-name.railway.app
```

---

## 📚 **Additional Resources**

### **Documentation:**
- **`README.md`** - Main system documentation
- **`RAILWAY_DEPLOYMENT_GUIDE.md`** - Production deployment
- **`ANDROID_API_DOCUMENTATION.md`** - Mobile app integration

### **Environment Files:**
- **`bear-backend/env.example`** - Backend environment template
- **`bear-frontend/env.example`** - Frontend environment template

### **Configuration Files:**
- **`railway.json`** - Railway deployment configuration
- **`package.json`** - Node.js dependencies and scripts

---

## 🤝 **Team Collaboration**

### **For New Team Members:**
1. **Follow this guide** step by step
2. **Test the system** locally
3. **Contact team lead** for database access
4. **Join team communication** channels

### **For Developers:**
- **Backend:** Node.js/Express with MongoDB
- **Frontend:** React with Material-UI
- **Real-time:** Socket.IO for notifications
- **Mobile:** REST API for Android integration

### **For Testers:**
- **Test all features** locally
- **Report bugs** with detailed steps
- **Verify mobile app** integration
- **Check production** deployment

---

## 📞 **Getting Help**

### **If You're Stuck:**
1. **Check this guide** - Most issues are covered
2. **Check troubleshooting** section above
3. **Check GitHub issues** - Report bugs
4. **Contact team lead** - For advanced help

### **Reporting Issues:**
- **Include error messages** - Copy exact error text
- **Include steps to reproduce** - What you did before the error
- **Include system information** - OS, Node.js version, etc.
- **Include screenshots** - If applicable

---

## 🎉 **You're All Set!**

Once you complete this setup:
- ✅ **System is running** locally
- ✅ **Database is connected**
- ✅ **Frontend is accessible**
- ✅ **Ready for development**
- ✅ **Ready for team collaboration**

**Welcome to the BEAR System team!** 🐻🚀

---

## 📋 **Quick Checklist**

- [ ] Node.js installed (v16+)
- [ ] MongoDB installed/running
- [ ] Git installed
- [ ] Repository cloned/downloaded
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] System started successfully
- [ ] Frontend accessible (localhost:3000)
- [ ] Backend API working (localhost:5000)
- [ ] Database connected
- [ ] User registration tested
- [ ] Login functionality tested

**If all items are checked, you're ready to go!** ✅
