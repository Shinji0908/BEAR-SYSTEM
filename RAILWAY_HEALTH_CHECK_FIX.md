# Railway Health Check Fix - BEAR System

## 🚨 **Health Check Failed - Solution Guide**

Your Railway deployment is failing because the health check endpoint `/api/health` is not responding. Here's how to fix it:

---

## 🔍 **Common Causes & Solutions**

### **Issue 1: Missing Environment Variables**

**Problem:** Backend can't start without required environment variables

**Solution:**
1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Go to Variables tab**
4. **Add these required variables:**

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-2024
```

### **Issue 2: MongoDB Connection Failed**

**Problem:** Backend can't connect to MongoDB

**Solutions:**
- **Check MONGO_URI** is correct
- **Verify MongoDB Atlas** cluster is running
- **Check network access** in MongoDB Atlas
- **Ensure IP is whitelisted** (0.0.0.0/0 for Railway)

### **Issue 3: Port Configuration**

**Problem:** Backend not listening on correct port

**Solution:**
- **Railway sets PORT automatically** - don't override it
- **Backend should use** `process.env.PORT || 5000`
- **Check if backend is binding** to `0.0.0.0` not `localhost`

### **Issue 4: Dependencies Not Installed**

**Problem:** Missing packages causing startup failure

**Solution:**
- **Check build logs** in Railway dashboard
- **Verify package.json** is correct
- **Check if all dependencies** are installed

---

## 🛠️ **Step-by-Step Fix**

### **Step 1: Check Railway Logs**

1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Click on "Logs" tab**
4. **Look for error messages**

### **Step 2: Verify Environment Variables**

**Required Variables:**
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bear-system
JWT_SECRET=your-secure-secret-key
```

**Optional Variables:**
```env
PORT=5000  # Railway sets this automatically
```

### **Step 3: Test MongoDB Connection**

**Check your MONGO_URI:**
1. **Go to MongoDB Atlas**
2. **Get connection string**
3. **Replace `<password>` with actual password**
4. **Replace `<dbname>` with `bear-system`**

**Example:**
```
mongodb+srv://bear-user:your-password@cluster0.abc123.mongodb.net/bear-system?retryWrites=true&w=majority
```

### **Step 4: Check Network Access**

**In MongoDB Atlas:**
1. **Go to Network Access**
2. **Add IP Address**
3. **Choose "Allow access from anywhere" (0.0.0.0/0)**
4. **Save changes**

### **Step 5: Restart Service**

1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Click "Restart"**
4. **Watch the logs** for startup messages

---

## 🔧 **Advanced Troubleshooting**

### **Check Backend Startup:**

**Look for these messages in logs:**
```
✅ MongoDB Connected successfully
🚀 Server (HTTP) on http://0.0.0.0:5000
🏥 Health Check: http://0.0.0.0:5000/api/health
```

**If you see errors:**
- **MongoDB connection failed** → Check MONGO_URI
- **Port already in use** → Check PORT configuration
- **Module not found** → Check dependencies

### **Test Health Endpoint Manually:**

**Once backend is running:**
```bash
curl https://your-backend-name.railway.app/api/health
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

## 📋 **Railway Configuration Checklist**

### **Backend Service:**
- [ ] **Environment variables set** (MONGO_URI, JWT_SECRET)
- [ ] **Port configuration** (Railway sets automatically)
- [ ] **Health check path** (/api/health)
- [ ] **Start command** (node start-railway.js)
- [ ] **Build successful** (no errors in build logs)

### **MongoDB Atlas:**
- [ ] **Cluster is running**
- [ ] **Network access configured** (0.0.0.0/0)
- [ ] **Database user created**
- [ ] **Connection string is correct**

### **Health Check:**
- [ ] **Backend starts successfully**
- [ ] **MongoDB connects**
- [ ] **Health endpoint responds**
- [ ] **No errors in logs**

---

## 🚀 **Quick Fix Commands**

### **If Backend Won't Start:**

1. **Check environment variables:**
```bash
# In Railway dashboard, verify these are set:
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret
```

2. **Check MongoDB connection:**
```bash
# Test your MONGO_URI locally first
# Make sure it works before deploying
```

3. **Restart Railway service:**
```bash
# In Railway dashboard:
# Service → Restart
```

### **If Health Check Still Fails:**

1. **Check Railway logs** for specific errors
2. **Verify all environment variables** are set
3. **Test MongoDB connection** from your local machine
4. **Check if backend is binding** to 0.0.0.0:PORT
5. **Verify health endpoint** is accessible

---

## 🎯 **Success Indicators**

### **You'll Know It's Working When:**
- ✅ **Backend logs show** "MongoDB Connected successfully"
- ✅ **Backend logs show** "Server (HTTP) on http://0.0.0.0:PORT"
- ✅ **Health check passes** in Railway dashboard
- ✅ **Service shows** "Healthy" status
- ✅ **You can access** https://your-backend-name.railway.app/api/health

### **Next Steps:**
- ✅ **Deploy frontend** service
- ✅ **Configure frontend** environment variables
- ✅ **Test full system** integration
- ✅ **Update Android app** with Railway URLs

---

## 📞 **Still Having Issues?**

### **Check These:**
1. **Railway build logs** - Look for specific errors
2. **MongoDB Atlas logs** - Check connection attempts
3. **Environment variables** - Verify all are set correctly
4. **Network access** - Ensure MongoDB allows Railway IPs

### **Common Solutions:**
- **Restart the service** in Railway dashboard
- **Check all environment variables** are set
- **Verify MongoDB connection** string is correct
- **Ensure MongoDB Atlas** allows connections from anywhere

**Your BEAR system should be running successfully on Railway!** 🚀
