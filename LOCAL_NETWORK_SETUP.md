# 🚀 TheProParkingApp - Local Network Setup Guide

## For 1-2 Users on Local Network (FREE)

**Perfect for:** Single parking location, accessing from multiple devices on same WiFi

---

## ✅ What's Already Done:

- ✅ App renamed to "TheProParkingApp"
- ✅ CORS secured for local network only
- ✅ Environment variables protected from Git
- ✅ All features working and tested

---

## 🔐 Step 1: Secure Your Backend (2 minutes)

### Update JWT Secret:

**File:** `backend/.env`

Replace the JWT_SECRET line with this secure one:

```env
JWT_SECRET=6d36d4da3c46bad35618586898338ca922fa9a5fab73727223a86da636cfc9c40668574db8f98f125e274e006a5772bdd89a0b68fd8fe3222ad3e49059475e66
```

**Your complete .env should look like:**

```env
# Node Environment
NODE_ENV=production
PORT=3000

# JWT Authentication
JWT_SECRET=6d36d4da3c46bad35618586898338ca922fa9a5fab73727223a86da636cfc9c40668574db8f98f125e274e006a5772bdd89a0b68fd8fe3222ad3e49059475e66
JWT_EXPIRES_IN=24h

# Supabase Configuration (keep your existing values)
SUPABASE_URL=https://nnpvazzeomwklugawceg.supabase.co
SUPABASE_KEY=<your-existing-key>
SUPABASE_SERVICE_ROLE_KEY=<your-existing-service-key>
```

---

## 💻 Step 2: Setup the Server Computer (10 minutes)

This is the computer that will stay on at your parking location.

### Option A: Windows Computer

1. **Install Node.js** (if not installed):
   - Download from: https://nodejs.org/
   - Choose LTS version (recommended)
   - Install with default settings

2. **Clone or copy this project** to the computer

3. **Install dependencies:**

   ```cmd
   cd path\to\appestacionamento
   npm install

   cd backend
   npm install
   ```

4. **Start the backend:**

   ```cmd
   cd backend
   npm start
   ```

   You should see:

   ```
   ✅ Connecting to Supabase: https://nnpvazzeomwklugawceg.supabase.co
   Backend running on http://localhost:3000
   ```

5. **Start the frontend** (new terminal window):

   ```cmd
   cd path\to\appestacionamento
   npm run dev
   ```

   You should see:

   ```
   ➜ Local: http://localhost:8080/
   ```

### Option B: Mac/Linux Computer

Same steps, but use Terminal:

```bash
# Install dependencies
cd /path/to/appestacionamento
npm install
cd backend
npm install

# Start backend (Terminal 1)
cd backend
npm start

# Start frontend (Terminal 2)
cd ..
npm run dev
```

---

## 📱 Step 3: Access from Other Devices (5 minutes)

### Find Your Server Computer's IP Address:

**Windows:**

```cmd
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.100`)

**Mac/Linux:**

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

or

```bash
hostname -I
```

**Example IP:** `192.168.1.100`

### Access from Other Devices:

On any device connected to the **same WiFi network**, open a browser:

```
http://192.168.1.100:8080
```

**Replace `192.168.1.100` with your actual server computer's IP**

### Devices You Can Use:

- 📱 Smartphones
- 📱 Tablets (perfect for parking booth!)
- 💻 Other computers
- 🖥️ Desktop PCs

### Save as Home Screen App (Mobile):

**iPhone:**

1. Open Safari
2. Go to `http://YOUR-IP:8080`
3. Tap Share button
4. Tap "Add to Home Screen"
5. Now works like a native app!

**Android:**

1. Open Chrome
2. Go to `http://YOUR-IP:8080`
3. Tap menu (⋮)
4. Tap "Add to Home screen"
5. Icon appears on home screen!

---

## 🔄 Step 4: Keep It Running (Auto-Start)

### Option 1: Manual Start (Simple)

Just start the servers when you arrive:

```cmd
cd backend && npm start
cd .. && npm run dev
```

### Option 2: Auto-Start on Boot (Advanced)

**Windows - Create Startup Scripts:**

1. Create `start-backend.bat`:

```batch
@echo off
cd C:\path\to\appestacionamento\backend
start "TheProParking Backend" cmd /k npm start
```

2. Create `start-frontend.bat`:

```batch
@echo off
cd C:\path\to\appestacionamento
start "TheProParking Frontend" cmd /k npm run dev
```

3. Press `Win + R`, type `shell:startup`, press Enter
4. Copy both .bat files to this folder
5. Servers start automatically when computer boots!

**Mac/Linux - Create Launch Services:**

Create `~/Library/LaunchAgents/com.theproparking.backend.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.theproparking.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/appestacionamento/backend/src/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.theproparking.backend.plist
```

---

## 🔥 Firewall Configuration

### Windows Firewall:

If devices can't connect, allow Node.js:

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Find "Node.js" and check both Private and Public
5. If not listed, click "Allow another app" → Browse to Node.js

### Mac Firewall:

```bash
# Allow Node.js through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

---

## 📊 Daily Usage

### Morning (Opening):

1. **Server computer:** Should auto-start or manually run:

   ```
   cd backend && npm start
   cd .. && npm run dev
   ```

2. **Tablet/Phone:** Open TheProParkingApp from home screen

3. **Login** with your credentials

4. **Open Cash Register** for the day

### During Day:

- Register vehicle entries/exits
- Manage monthly customers
- Process payments

### Evening (Closing):

1. **Close Cash Register**
2. **Generate Daily Report**
3. Can turn off server if desired (data is safe in Supabase)

---

## 💾 Backup Strategy

### Your data is already safe!

- ✅ **Database:** Supabase (cloud-based, auto-backed up)
- ✅ **Code:** GitHub repository

### Optional Local Backup:

**Weekly Database Export:**

1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Click "Download Backup"
4. Save to external drive

---

## 🆘 Troubleshooting

### Problem: Can't access from other devices

**Check:**

1. All devices on same WiFi?
2. Server computer IP address correct?
3. Firewall allowing Node.js?
4. Backend and frontend both running?

**Test:**

```bash
# On server computer
ping 192.168.1.100  # Your IP

# On other device
ping 192.168.1.100  # Server IP
```

### Problem: Backend not starting

**Check:**

1. Port 3000 already in use?

   ```bash
   # Windows
   netstat -ano | findstr :3000

   # Mac/Linux
   lsof -i :3000
   ```

2. .env file configured?
   ```bash
   cat backend/.env
   ```

### Problem: Frontend not starting

**Check:**

1. Port 8080 already in use?
2. Dependencies installed?
   ```bash
   npm install
   ```

---

## 📈 Cost Breakdown

### Your Setup (Local Network):

- **Hardware:** Use existing computer → $0
- **Software:** All free (Node.js, Vite, React) → $0
- **Database:** Supabase FREE tier → $0
- **Domain:** Not needed → $0
- **SSL:** Not needed (local network) → $0

**Total Monthly Cost: $0**

### Requirements:

- ✅ One computer that stays on during work hours
- ✅ WiFi router (you already have)
- ✅ Devices (phones/tablets you already have)
- ✅ Internet connection (for Supabase only)

---

## 🎯 Quick Start Checklist

- [ ] Update `backend/.env` with secure JWT_SECRET
- [ ] Install Node.js on server computer
- [ ] Run `npm install` in root and backend
- [ ] Start backend: `cd backend && npm start`
- [ ] Start frontend: `npm run dev`
- [ ] Find server computer's IP address
- [ ] Access from other device: `http://SERVER-IP:8080`
- [ ] Add to home screen on mobile devices
- [ ] Test entry/exit flow
- [ ] Test monthly customer management
- [ ] Setup auto-start (optional)

---

## 🔒 Security Notes

### You're Protected:

✅ **CORS:** Only local network IPs allowed (192.168.x.x, 10.x.x.x)  
✅ **JWT:** Secure 128-character secret  
✅ **HTTPS:** Not needed (local network is already private)  
✅ **Firewall:** Computer firewall protects from internet  
✅ **Database:** Supabase handles security and encryption

### Not accessible from:

❌ Internet (external hackers)  
❌ Other networks  
❌ Public WiFi

**Only** devices on your parking location's WiFi can access!

---

## 📱 Recommended Setup

**Server Computer:**

- Desktop PC or laptop
- Windows 10/11 or Mac
- Always on during work hours
- Connected via Ethernet (more stable than WiFi)

**Staff Devices:**

- iPad/Android tablet at parking booth (best!)
- Smartphones for mobile checking
- Additional computer at office

**Network:**

- Regular WiFi router
- No special configuration needed
- Same network all devices use now

---

## 🚀 You're Ready!

Your TheProParkingApp is now:

✅ Secure (local network only)  
✅ Free (no hosting costs)  
✅ Fast (local network = instant)  
✅ Reliable (no internet dependency for operation)  
✅ Professional (full featured parking management)

**Next:** Just update the JWT_SECRET and start using it!

Need help? Check the troubleshooting section above or review the main README.md.

---

**Made with ❤️ for TheProParkingApp**
