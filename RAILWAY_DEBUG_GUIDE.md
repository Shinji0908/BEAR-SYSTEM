# Railway Health Check Debug Guide

## 🚨 **Health Check Still Failing - Debug Steps**

If Railway health check is still failing, let's debug this step by step:

---

## 🔍 **Step 1: Check Railway Logs**

### **How to Check Logs:**
1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Click "Logs" tab**
4. **Look for error messages**

### **What to Look For:**
```
❌ Error messages (red text)
✅ Success messages (green text)
🔍 Startup process messages
```

---

## 🔍 **Step 2: Common Issues & Solutions**

### **Issue 1: Missing Environment Variables**

**Check if these are set in Railway:**
- `NODE_ENV=production`
- `MONGO_URI=mongodb+srv://...`
- `JWT_SECRET=your-secret-key`

**If missing:**
1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Go to Variables tab**
4. **Add missing variables**

### **Issue 2: MongoDB Connection Failed**

**Check MONGO_URI format:**
```
mongodb+srv://username:password@cluster.mongodb.net/bear-system?retryWrites=true&w=majority
```

**Common mistakes:**
- ❌ Missing password
- ❌ Wrong cluster name
- ❌ Missing database name
- ❌ Network access not configured

### **Issue 3: Port Binding Issues**

**Check if backend binds to 0.0.0.0:**
```javascript
// Should be:
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// NOT:
server.listen(PORT, "localhost", () => {
  console.log(`Server running on port ${PORT}`);
});
```

### **Issue 4: Dependencies Not Installing**

**Check build logs for:**
- `npm install` errors
- Missing packages
- Version conflicts

---

## 🛠️ **Step 3: Manual Testing**

### **Test Your Backend Locally:**

1. **Set environment variables:**
```bash
# Create .env file in bear-backend/
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system?retryWrites=true&w=majority
JWT_SECRET=your-secret-key
PORT=5000
```

2. **Start backend:**
```bash
cd bear-backend
npm start
```

3. **Test health endpoint:**
```bash
curl http://localhost:5000/api/health
```

**Should return:**
```json
{
  "status": "OK",
  "message": "BEAR System API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 🔧 **Step 4: Railway-Specific Fixes**

### **Fix 1: Update Railway Configuration**

**Check your railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node start-railway.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### **Fix 2: Check Start Command**

**Railway should use:**
- **Start Command:** `node start-railway.js`
- **Health Check Path:** `/api/health`
- **Health Check Timeout:** 300 seconds

### **Fix 3: Environment Variables**

**Required variables:**
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-2024
```

**Optional variables:**
```env
PORT=5000  # Railway sets this automatically
```

---

## 🚨 **Emergency Fixes**

### **Fix 1: Simplify Health Check**

**Update your backend index.js:**
```javascript
// Add this at the top of your routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
```

### **Fix 2: Remove Database Dependency from Health Check**

**Make health check independent:**
```javascript
app.get('/api/health', (req, res) => {
  // Don't check database connection
  // Just return OK if server is running
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
```

### **Fix 3: Add Startup Delay**

**Update start-railway.js:**
```javascript
// Add delay before starting
setTimeout(() => {
  console.log('🚀 Starting backend server...');
  const child = spawn('node', ['index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
}, 2000); // 2 second delay
```

---

## 📋 **Debug Checklist**

### **Check These in Railway Dashboard:**

- [ ] **Service is running** (not crashed)
- [ ] **Build completed successfully** (no build errors)
- [ ] **Environment variables set** (all required ones)
- [ ] **Logs show startup messages** (MongoDB connected, server started)
- [ ] **Health check endpoint accessible** (no 404 errors)

### **Check These in MongoDB Atlas:**

- [ ] **Cluster is running** (not paused)
- [ ] **Network access configured** (0.0.0.0/0 allowed)
- [ ] **Database user exists** (with correct password)
- [ ] **Connection string is correct** (tested locally)

### **Check These in Your Code:**

- [ ] **Health endpoint exists** (`/api/health`)
- [ ] **Server binds to 0.0.0.0** (not localhost)
- [ ] **Port uses process.env.PORT** (Railway sets this)
- [ ] **No errors in startup** (MongoDB connects successfully)

---

## 🎯 **Quick Fix Commands**

### **If Still Failing:**

1. **Check Railway logs** for specific errors
2. **Test backend locally** with same environment variables
3. **Verify MongoDB connection** from your local machine
4. **Check if health endpoint** works locally
5. **Restart Railway service** after making changes

### **Emergency Workaround:**

**Temporarily disable health check:**
```json
{
  "deploy": {
    "startCommand": "node start-railway.js",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300
  }
}
```

---

## 📞 **Still Not Working?**

### **Send Me These:**
1. **Railway build logs** (screenshot or copy)
2. **Railway runtime logs** (screenshot or copy)
3. **Environment variables** you set (without passwords)
4. **MongoDB connection string** format (without password)

### **Common Final Solutions:**
- **Restart Railway service** completely
- **Check all environment variables** are set correctly
- **Verify MongoDB Atlas** is accessible
- **Test health endpoint** manually

**Let's get your Railway deployment working!** 🚀
