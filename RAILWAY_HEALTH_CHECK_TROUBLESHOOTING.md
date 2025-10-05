# 🚂 Railway Health Check Troubleshooting Guide

## 🚨 **Current Issue: Health Check Failing**

Your Railway deployment is failing health checks. Here's how to fix it:

## 🔍 **Step 1: Check Your MONGO_URI Format**

**Your current MONGO_URI might have a duplicate part!**

### ❌ **Wrong Format (What you might have):**
```
mongodb+srv://admin:***@cluster0.h7cwemo.mongodb.net/bearDB?retryWrites=true&w=majority bear-system?retryWrites=true&w=majority
```

### ✅ **Correct Format (What you should have):**
```
mongodb+srv://admin:your-password@cluster0.h7cwemo.mongodb.net/bearDB?retryWrites=true&w=majority
```

## 🛠️ **Step 2: Fix Environment Variables in Railway**

### **Go to Railway Dashboard:**
1. **Open your backend service**
2. **Click "Variables" tab**
3. **Update MONGO_URI** with the correct format (no duplicates)
4. **Make sure these variables are set:**
   - `NODE_ENV=production`
   - `MONGO_URI=mongodb+srv://admin:your-password@cluster0.h7cwemo.mongodb.net/bearDB?retryWrites=true&w=majority`
   - `JWT_SECRET=your-secure-secret-key`
   - `PORT=5000` (optional, Railway sets this automatically)

## 🧪 **Step 3: Test MongoDB Connection Locally**

Run this command to test your MongoDB connection:

```bash
cd bear-backend
node test-mongo-connection.js
```

**Expected output:**
```
🧪 Testing MongoDB Connection...
✅ MONGO_URI format looks correct
🔌 Attempting to connect to MongoDB...
✅ MongoDB Connected successfully!
📊 Database: bearDB
```

## 🔧 **Step 4: Common Issues & Solutions**

### **Issue 1: Duplicate MONGO_URI**
```
❌ DUPLICATE DETECTED: Your MONGO_URI has duplicate parts!
```
**Fix:** Remove the duplicate part at the end

### **Issue 2: Authentication Failed**
```
❌ MongoDB Connection Error: authentication failed
```
**Fix:** 
- Check username and password in MONGO_URI
- Verify database user exists in MongoDB Atlas
- Check user permissions

### **Issue 3: Network Access Issues**
```
❌ MongoDB Connection Error: server selection timeout
```
**Fix:**
- Go to MongoDB Atlas → Network Access
- Add `0.0.0.0/0` (allow all IPs) or Railway's IP range
- Make sure cluster is running

### **Issue 4: Database Name Mismatch**
```
❌ MongoDB Connection Error: bad auth
```
**Fix:**
- Check if database name in MONGO_URI matches your actual database
- Your URI has `bearDB` - make sure this database exists

## 🚀 **Step 5: Restart Railway Service**

After fixing environment variables:

1. **Go to Railway Dashboard**
2. **Click on your backend service**
3. **Click "Restart" or "Redeploy"**
4. **Watch the logs** for startup messages

## 📋 **Expected Railway Logs (Success):**

```
🚂 Starting BEAR System Backend on Railway...
📅 Timestamp: 2024-01-XX...
🚂 Railway Environment: Yes
🔍 Environment Check:
- NODE_ENV: production
- PORT: 5000
- MONGO_URI: set
- JWT_SECRET: set
✅ Environment variables configured
🚀 Starting backend server...
🔍 Connecting to MongoDB: mongodb+srv://***:***@cluster0.h7cwemo.mongodb.net/bearDB?retryWrites=true&w=majority
✅ MongoDB Connected successfully
📊 Database: bearDB
🚀 Server (HTTP) on http://0.0.0.0:5000
🏥 Health Check: http://0.0.0.0:5000/health
```

## 🚨 **If Still Failing:**

### **Check Railway Logs:**
1. **Go to Railway Dashboard**
2. **Click on your backend service**
3. **Click "Logs" tab**
4. **Look for error messages**

### **Common Error Messages:**
- `❌ MONGO_URI not set!` → Add MONGO_URI variable
- `❌ JWT_SECRET not set!` → Add JWT_SECRET variable
- `❌ MongoDB Connection Error:` → Check MONGO_URI format
- `❌ Failed to start backend:` → Check dependencies

### **Test Health Check Manually:**
Once running, test the health check endpoint:
```bash
curl https://your-backend-name.railway.app/health
```
Should return: `{"status":"OK"}`

## 📞 **Need More Help?**

If you're still having issues:

1. **Share your Railway logs** (the error messages)
2. **Confirm your MONGO_URI format** (without the actual password)
3. **Check MongoDB Atlas** cluster status and network access

## 🎯 **Quick Checklist:**

- [ ] MONGO_URI format is correct (no duplicates)
- [ ] All environment variables are set in Railway
- [ ] MongoDB Atlas cluster is running
- [ ] Network access allows 0.0.0.0/0
- [ ] Railway service has been restarted
- [ ] Health check endpoint `/health` responds with `{"status":"OK"}`

---

**Most likely issue:** Your MONGO_URI has duplicate parts. Fix that first! 🚀
