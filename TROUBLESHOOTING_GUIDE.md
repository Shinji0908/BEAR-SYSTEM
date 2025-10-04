# BEAR System - Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

This guide helps you solve common problems when setting up or running the BEAR system.

---

## 🔧 **Installation Issues**

### **Issue 1: "npm install" Fails**

**Symptoms:**
- Dependencies not installing
- Error messages during npm install
- Package conflicts

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# If still failing, try:
npm install --legacy-peer-deps
```

### **Issue 2: "Node.js version too old"**

**Symptoms:**
- Error about Node.js version
- "Engine not supported" messages

**Solutions:**
- **Update Node.js** to version 16 or higher
- **Download from:** https://nodejs.org/
- **Check version:** `node --version`

### **Issue 3: "Permission denied" (Mac/Linux)**

**Symptoms:**
- Permission errors during installation
- "EACCES" errors

**Solutions:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16
nvm use 16
```

---

## 🌐 **Port Conflicts**

### **Issue 4: "Port 5000 already in use"**

**Symptoms:**
- Backend won't start
- "EADDRINUSE" error

**Solutions:**

#### **Windows:**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /F /PID <process_id>

# Or change port in .env file
PORT=5001
```

#### **Mac/Linux:**
```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process
lsof -ti:5000 | xargs kill -9

# Or change port in .env file
PORT=5001
```

### **Issue 5: "Port 3000 already in use"**

**Symptoms:**
- Frontend won't start
- React development server fails

**Solutions:**
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /F /PID <process_id>

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or change port in package.json
"start": "PORT=3001 react-scripts start"
```

---

## 🗄️ **Database Issues**

### **Issue 6: "MongoDB connection failed"**

**Symptoms:**
- Backend shows "MongoDB Connection Error"
- Database operations fail
- "ECONNREFUSED" errors

**Solutions:**

#### **Local MongoDB:**
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows:
net start MongoDB

# Mac/Linux:
sudo systemctl start mongod
# or
brew services start mongodb-community

# Check connection string in .env
MONGO_URI=mongodb://localhost:27017/bear-system
```

#### **MongoDB Atlas:**
```bash
# Check connection string format
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system?retryWrites=true&w=majority

# Verify:
# 1. Username and password are correct
# 2. Cluster is running
# 3. IP address is whitelisted
# 4. Network access is configured
```

### **Issue 7: "Database not found"**

**Symptoms:**
- "Database does not exist" errors
- Collections not found

**Solutions:**
- **Database is created automatically** when first data is inserted
- **Check connection string** includes database name
- **Verify MongoDB is running** and accessible

---

## 🔐 **Authentication Issues**

### **Issue 8: "Login not working"**

**Symptoms:**
- Can't log in with correct credentials
- "Invalid credentials" error
- User not found

**Solutions:**
```bash
# Check if user exists in database
# Connect to MongoDB and check users collection

# Try registering a new user
# Use the registration endpoint

# Check password hashing
# Verify bcrypt is working correctly

# Check JWT secret in .env
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### **Issue 9: "Token expired"**

**Symptoms:**
- "Token expired" errors
- Authentication failures
- Session timeouts

**Solutions:**
- **Check JWT secret** is consistent
- **Verify token format** in requests
- **Check token expiration** time
- **Try logging in again**

---

## 🌐 **Network Issues**

### **Issue 10: "Frontend not loading"**

**Symptoms:**
- React app won't start
- Blank page in browser
- "Cannot connect" errors

**Solutions:**
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check environment variables
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

# Check browser console for errors
# Open Developer Tools (F12)

# Try clearing browser cache
# Hard refresh (Ctrl+F5)
```

### **Issue 11: "CORS errors"**

**Symptoms:**
- "CORS policy" errors in browser
- API requests blocked
- Cross-origin issues

**Solutions:**
```bash
# Check CORS configuration in backend
# Verify allowed origins in index.js

# Check if backend is running on correct port
# Verify REACT_APP_API_URL matches backend port
```

---

## 📱 **Mobile App Issues**

### **Issue 12: "Android emulator can't connect"**

**Symptoms:**
- Android app can't reach backend
- "Connection refused" errors
- API calls failing

**Solutions:**
```bash
# Use correct IP for Android emulator
# Backend URL: http://10.0.2.2:5000
# Frontend URL: http://10.0.2.2:3000

# Check if backend is running on 0.0.0.0
# Verify port forwarding in emulator
```

### **Issue 13: "Physical device can't connect"**

**Symptoms:**
- Mobile app can't reach backend
- Network timeout errors
- API unavailable

**Solutions:**
```bash
# Find your computer's IP address
# Windows: ipconfig
# Mac/Linux: ifconfig

# Use your computer's IP address
# Backend URL: http://YOUR_IP:5000
# Frontend URL: http://YOUR_IP:3000

# Check firewall settings
# Allow connections on ports 5000 and 3000
```

---

## 🔧 **Environment Issues**

### **Issue 14: "Environment variables not loading"**

**Symptoms:**
- .env file not being read
- Default values being used
- Configuration not working

**Solutions:**
```bash
# Check .env file location
# Should be in bear-backend/ and bear-frontend/ directories

# Check .env file format
# No spaces around = sign
# No quotes around values
# No comments on same line

# Example:
MONGO_URI=mongodb://localhost:27017/bear-system
PORT=5000
JWT_SECRET=your-secret-key
```

### **Issue 15: "Build errors"**

**Symptoms:**
- Frontend build fails
- "Module not found" errors
- Compilation errors

**Solutions:**
```bash
# Clear build cache
rm -rf build node_modules package-lock.json
npm install
npm run build

# Check for syntax errors
# Verify all imports are correct
# Check for missing dependencies
```

---

## 🚀 **Performance Issues**

### **Issue 16: "System running slowly"**

**Symptoms:**
- Slow response times
- High CPU usage
- Memory issues

**Solutions:**
```bash
# Check system resources
# Close unnecessary applications
# Check for memory leaks

# Optimize database queries
# Add indexes for frequently queried fields
# Limit result sets

# Check for infinite loops
# Verify async/await usage
# Check for memory leaks
```

### **Issue 17: "High memory usage"**

**Symptoms:**
- System running out of memory
- Slow performance
- Crashes

**Solutions:**
```bash
# Check Node.js memory usage
node --max-old-space-size=4096 index.js

# Monitor memory usage
# Use process monitoring tools
# Check for memory leaks in code
```

---

## 🔍 **Debugging Tips**

### **General Debugging:**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check logs in console
# Look for error messages
# Check network requests in browser

# Use browser developer tools
# Check Console tab for errors
# Check Network tab for failed requests
```

### **Database Debugging:**
```bash
# Connect to MongoDB directly
mongo mongodb://localhost:27017/bear-system

# Check collections
show collections

# Check documents
db.users.find()
db.incidents.find()

# Check indexes
db.users.getIndexes()
```

### **API Debugging:**
```bash
# Test API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/auth/login

# Check request headers
# Verify Content-Type
# Check Authorization headers
```

---

## 📞 **Getting Help**

### **When to Ask for Help:**
- **Tried all solutions** in this guide
- **Error persists** after troubleshooting
- **System won't start** at all
- **Critical functionality** not working

### **Information to Include:**
- **Error messages** (exact text)
- **Steps to reproduce** the issue
- **System information** (OS, Node.js version)
- **What you've tried** so far
- **Screenshots** if applicable

### **Contact Information:**
- **GitHub Issues:** Report bugs and request features
- **Team Lead:** For advanced configuration help
- **Documentation:** Check other guides for related issues

---

## 🎯 **Prevention Tips**

### **To Avoid Common Issues:**
- **Keep dependencies updated** regularly
- **Use consistent Node.js versions** across team
- **Test changes** before committing
- **Use environment variables** for configuration
- **Monitor system resources** regularly
- **Keep backups** of working configurations

### **Best Practices:**
- **Read error messages** carefully
- **Check logs** before asking for help
- **Test locally** before deploying
- **Use version control** for configuration changes
- **Document custom configurations**

---

## ✅ **Quick Fixes Checklist**

### **If System Won't Start:**
- [ ] Check Node.js version (v16+)
- [ ] Check MongoDB is running
- [ ] Check ports are free
- [ ] Check environment variables
- [ ] Check dependencies are installed

### **If Database Issues:**
- [ ] Check MongoDB connection string
- [ ] Check database is running
- [ ] Check network access
- [ ] Check user permissions

### **If Frontend Issues:**
- [ ] Check backend is running
- [ ] Check environment variables
- [ ] Check browser console
- [ ] Check network requests

### **If Mobile App Issues:**
- [ ] Check correct IP addresses
- [ ] Check firewall settings
- [ ] Check network connectivity
- [ ] Check API endpoints

**Most issues can be solved by following this guide!** 🚀
