# BEAR System - Barangay Emergency Alert Response System

## 🐻 **Welcome to BEAR System!**

A comprehensive emergency response system designed for barangay-level emergency management with real-time incident reporting, user verification, and mobile app integration.

---

## 📋 **Prerequisites**

Before setting up the system, make sure you have these installed:

### **Required Software:**
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (local) or **MongoDB Atlas** (cloud) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

### **Check Your Installation:**
```bash
node --version    # Should show v16+
npm --version     # Should show v8+
mongod --version  # Should show MongoDB version
git --version     # Should show Git version
```

---

## 🚀 **Quick Start Guide**

### **Step 1: Download the System**
```bash
# Option 1: Clone from GitHub
git clone https://github.com/Shinji0908/BEAR-SYSTEM.git
cd BEAR-SYSTEM

# Option 2: Download ZIP from GitHub
# Extract the ZIP file and navigate to the folder
```

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

### **Step 3: Set Up Environment Variables**

#### **Backend Environment:**
```bash
cd bear-backend
cp env.example .env
```

Edit `bear-backend/.env`:
```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/bear-system

# Server Configuration
PORT=5000

# JWT Secret Key (Change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### **Frontend Environment:**
```bash
cd bear-frontend
cp env.example .env
```

Edit `bear-frontend/.env`:
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### **Step 4: Start the System**
```bash
# From the root directory
npm run dev
```

This will start both backend and frontend automatically!

---

## 🌐 **Access the System**

### **Frontend (Web Interface):**
- **URL:** http://localhost:3000
- **Login:** Use admin credentials or register new users

### **Backend API:**
- **URL:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health
- **API Documentation:** See API endpoints below

---

## 👥 **User Roles & Access**

### **Admin Users:**
- Full system access
- User management
- Incident management
- Verification approval
- Dashboard analytics

### **Residents:**
- Report incidents
- View incident status
- Upload verification documents
- Receive notifications

### **Responders:**
- Respond to incidents
- Update incident status
- Access responder dashboard
- Real-time notifications

---

## 🔧 **Configuration Options**

### **Database Options:**

#### **Local MongoDB:**
```env
MONGO_URI=mongodb://localhost:27017/bear-system
```

#### **MongoDB Atlas (Cloud):**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system?retryWrites=true&w=majority
```

### **Port Configuration:**
If ports 5000 or 3000 are busy, change them:

#### **Backend (.env):**
```env
PORT=5001  # Change to any available port
```

#### **Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_SOCKET_URL=http://localhost:5001
```

---

## 📱 **Mobile App Integration**

### **For Android Development:**
- **Development URL:** http://10.0.2.2:5000 (Android emulator)
- **Production URL:** https://your-backend-name.railway.app (after deployment)

### **API Endpoints:**
- **Authentication:** `/api/auth/login`
- **Incidents:** `/api/incidents`
- **Users:** `/api/users`
- **Verification:** `/api/verification`

See `ANDROID_API_DOCUMENTATION.md` for complete API reference.

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. Port Already in Use:**
```bash
# Kill processes on ports 5000 and 3000
# Windows:
netstat -ano | findstr :5000
taskkill /F /PID <process_id>

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

#### **2. MongoDB Connection Failed:**
- **Check MongoDB is running:** `mongod --version`
- **Check connection string:** Verify MONGO_URI in .env
- **Check network access:** For MongoDB Atlas, ensure IP is whitelisted

#### **3. Dependencies Installation Failed:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **4. Frontend Not Loading:**
- **Check backend is running:** Visit http://localhost:5000/api/health
- **Check environment variables:** Verify REACT_APP_API_URL
- **Check browser console:** Look for error messages

#### **5. Login Not Working:**
- **Check database connection:** Backend should show "MongoDB Connected"
- **Check user exists:** Verify user is registered in database
- **Check password:** Ensure password is correct

---

## 🔐 **Security Features**

### **Authentication:**
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control

### **Data Protection:**
- Input validation and sanitization
- File upload restrictions
- CORS configuration
- Environment variable protection

### **Production Security:**
- Change default JWT secret
- Use HTTPS in production
- Configure CORS for production domains
- Set up proper firewall rules

---

## 📊 **System Features**

### **Core Functionality:**
- ✅ **User Management** - Registration, login, profiles
- ✅ **Incident Reporting** - Real-time incident creation and tracking
- ✅ **User Verification** - Document upload and approval
- ✅ **Real-time Notifications** - Socket.IO integration
- ✅ **Dashboard Analytics** - System statistics and reports
- ✅ **Mobile App Support** - Android API integration

### **Admin Features:**
- ✅ **User Management** - View, edit, delete users
- ✅ **Incident Management** - Monitor and resolve incidents
- ✅ **Verification Approval** - Review and approve user documents
- ✅ **System Analytics** - Dashboard with statistics
- ✅ **Notification Management** - Send system-wide notifications

---

## 🚀 **Deployment**

### **Local Development:**
- Use local MongoDB
- Run on localhost:3000 and localhost:5000
- Perfect for development and testing

### **Production Deployment:**
- Use Railway + MongoDB Atlas (see `RAILWAY_DEPLOYMENT_GUIDE.md`)
- Automatic HTTPS certificates
- Scalable cloud infrastructure
- Free tier available

---

## 📚 **Documentation**

### **Available Guides:**
- **`RAILWAY_DEPLOYMENT_GUIDE.md`** - Production deployment
- **`ANDROID_API_DOCUMENTATION.md`** - Mobile app integration
- **Environment Setup** - See env.example files

### **API Documentation:**
- **Authentication Endpoints** - Login, registration, profile
- **Incident Endpoints** - Create, read, update, delete incidents
- **User Management** - User CRUD operations
- **Verification System** - Document upload and approval

---

## 🤝 **Team Collaboration**

### **For New Team Members:**
1. **Clone the repository**
2. **Follow the Quick Start Guide**
3. **Set up environment variables**
4. **Test the system locally**
5. **Contact team lead for database access**

### **For Developers:**
- **Backend:** Node.js/Express with MongoDB
- **Frontend:** React with Material-UI
- **Real-time:** Socket.IO for notifications
- **Mobile:** REST API for Android integration

---

## 📞 **Support**

### **Getting Help:**
1. **Check this README** - Most issues are covered here
2. **Check troubleshooting section** - Common solutions
3. **Check GitHub issues** - Report bugs and request features
4. **Contact team lead** - For advanced configuration help

### **Reporting Issues:**
- **Bug Reports:** Include error messages and steps to reproduce
- **Feature Requests:** Describe the desired functionality
- **Documentation Issues:** Help improve this guide

---

## 🎉 **You're Ready to Go!**

Your BEAR system is now set up and ready for team collaboration. Follow the Quick Start Guide to get started, and refer to the troubleshooting section if you encounter any issues.

**Happy coding!** 🐻🚀
