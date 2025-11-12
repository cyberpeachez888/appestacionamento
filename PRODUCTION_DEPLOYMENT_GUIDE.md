# 🚀 Production Deployment Guide

## Current Status: Development Complete ✅

Your parking management system is feature-complete and ready for production deployment.

---

## 📋 Pre-Deployment Checklist

### 1. Security & Environment (CRITICAL)

#### Backend Environment Variables

- [ ] **Move .env to secure location** - Never commit `.env` to Git
- [ ] **Generate strong JWT secret** - Replace current secret with secure random string
- [ ] **Configure CORS properly** - Change from `*` to your actual domain
- [ ] **Set NODE_ENV=production**
- [ ] **Review Supabase RLS policies** - Ensure Row Level Security is enabled

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 1.1 Verificação automática das variáveis

Antes de qualquer deploy, rode o comando abaixo na pasta `backend` para garantir que todas as variáveis críticas estão definidas (via `.env` ou variáveis do sistema):

```bash
cd backend
npm run verify-env
```

Se alguma estiver ausente, o script lista o nome; configure na Render antes de continuar.

#### Update backend/.env for production:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<your-secure-generated-secret>
JWT_EXPIRES_IN=24h

# Supabase (keep your current values)
SUPABASE_URL=https://nnpvazzeomwklugawceg.supabase.co
SUPABASE_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Email (configure for reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Sistema Estacionamento <noreply@yourparking.com>
```

### 2. Database Final Setup

- [x] ✅ All tables created (business_hours, holidays, monthly_customers, etc.)
- [x] ✅ Analytics dashboard tables created
- [ ] **Backup database** - Create backup before going live
- [ ] **Enable Supabase backups** - Configure automatic daily backups
- [ ] **Review indexes** - Ensure all queries are optimized

#### Supabase Production Settings:

1. Go to Supabase Dashboard → Database → Backups
2. Enable Point-in-Time Recovery (PITR)
3. Set retention period (7-30 days recommended)

### 3. Code Quality & Testing

- [ ] **Test all features** - Complete end-to-end testing
- [ ] **Test with real data** - Use actual vehicle plates, customer info
- [ ] **Test payment flows** - Entry, exit, monthly payments
- [ ] **Test reports** - Generate monthly reports, receipts
- [ ] **Test permissions** - Verify operator vs admin access
- [ ] **Mobile responsive testing** - Test on phones/tablets

### 4. Frontend Optimization

#### Build for Production:

```bash
cd /workspaces/appestacionamento
npm run build
```

#### Performance Optimization:

- [ ] **Minify assets** - Vite does this automatically
- [ ] **Optimize images** - Compress any images/logos
- [ ] **Enable caching** - Configure browser caching
- [ ] **Remove console.logs** - Clean up debug statements

### 5. Backend Production Setup

#### PM2 Process Manager (Recommended):

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd /workspaces/appestacionamento/backend
pm2 start src/server.js --name "parking-backend"

# Configure auto-restart on reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs parking-backend
pm2 monit
```

---

## 🌐 Deployment Options

### Option 1: VPS/Cloud Server (Recommended for Control)

**Best for:** Full control, custom domains, multiple locations

#### Services to Consider:

- **DigitalOcean** - $6-12/month (Droplet)
- **Linode** - $5-10/month
- **AWS Lightsail** - $5-10/month
- **Google Cloud** - $10-20/month
- **Azure** - $10-20/month

#### Deployment Steps:

1. **Create Ubuntu Server** (20.04 or 22.04 LTS)

2. **Install Dependencies:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

3. **Clone Repository:**

```bash
cd /var/www
sudo git clone https://github.com/cyberpeachez888/appestacionamento.git
sudo chown -R $USER:$USER appestacionamento
cd appestacionamento
```

4. **Setup Backend:**

```bash
cd backend
npm install --production
cp .env.example .env
nano .env  # Configure production values
pm2 start src/server.js --name parking-api
pm2 save
pm2 startup
```

5. **Setup Frontend:**

```bash
cd /var/www/appestacionamento
npm install
npm run build

# Serve with Nginx
sudo nano /etc/nginx/sites-available/parking
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/appestacionamento/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/parking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL (HTTPS):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (FREE)
sudo certbot --nginx -d your-domain.com
```

---

### Option 2: Vercel (Frontend) + Railway (Backend)

**Best for:** Easy deployment, automatic scaling

#### Frontend on Vercel (FREE):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd /workspaces/appestacionamento
vercel

# Follow prompts, connect to Git
```

#### Backend on Railway:

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Set environment variables in Railway dashboard
5. Railway will auto-detect Node.js and deploy

**Cost:** ~$5-20/month depending on usage

---

### Option 3: Render (All-in-One)

**Best for:** Simple deployment, managed services

1. Go to https://render.com
2. Create Web Service for backend
3. Create Static Site for frontend
4. Connect GitHub repository
5. Configure environment variables

**Cost:** FREE tier available, $7+/month for production

---

## 🔒 Security Hardening

### Backend Security:

```bash
# Install security packages
cd backend
npm install helmet express-rate-limit cors
```

**Update backend/src/server.js:**

```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// CORS - production domain only
app.use(
  cors({
    origin: 'https://your-domain.com',
    credentials: true,
  })
);
```

### Supabase RLS Policies:

```sql
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- etc...

-- Example policy: Users can only see their own data
CREATE POLICY "Users can view own data"
  ON monthly_customers
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📱 Domain & DNS Setup

### 1. Purchase Domain

- **Registro.br** (for .br domains) - R$40/year
- **Namecheap** - $8-12/year
- **Google Domains** - $12-15/year

### 2. Configure DNS

Point your domain to your server:

```
A Record:    @ → Your-Server-IP
A Record:    www → Your-Server-IP
```

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring:

1. **PM2 Monitoring:**

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

2. **Uptime Monitoring (FREE):**

- https://uptimerobot.com
- https://betterstack.com
- Set up email/SMS alerts

3. **Error Tracking:**

- Sentry.io (FREE tier)
- LogRocket
- Track bugs and crashes

### Regular Maintenance:

```bash
# Weekly updates
sudo apt update && sudo apt upgrade -y
npm update

# Monthly database backup
pg_dump database > backup_$(date +%Y%m%d).sql

# Check logs
pm2 logs
tail -f /var/log/nginx/error.log
```

---

## 💰 Estimated Costs

### Minimal Setup (Small parking lot):

- **Domain:** R$40/year (~$8/year)
- **Server:** DigitalOcean $6/month
- **Supabase:** FREE tier (up to 500MB database)
- **SSL Certificate:** FREE (Let's Encrypt)
- **Total:** ~R$30-40/month (~$6-8/month)

### Recommended Setup (Medium parking):

- **Domain:** R$40/year
- **Server:** DigitalOcean $12/month (2GB RAM)
- **Supabase:** FREE tier
- **Backups:** Included
- **Monitoring:** FREE tier
- **Total:** ~R$60-80/month (~$12-16/month)

### Enterprise Setup (Large parking chain):

- **Domain:** R$100/year
- **Server:** DigitalOcean $24+/month (4GB RAM)
- **Supabase:** Pro $25/month
- **CDN:** Cloudflare FREE
- **Monitoring:** Paid plans
- **Total:** ~R$250-400/month (~$50-80/month)

---

## 📋 Go-Live Checklist

### Week Before Launch:

- [ ] Complete all security steps above
- [ ] Full testing with real scenarios
- [ ] Train staff on system usage
- [ ] Prepare user documentation
- [ ] Set up customer support channel
- [ ] Configure email notifications
- [ ] Test receipt printing

### Launch Day:

- [ ] Deploy to production server
- [ ] Configure domain and SSL
- [ ] Test all features in production
- [ ] Monitor for errors
- [ ] Have rollback plan ready
- [ ] Announce to users

### First Week After Launch:

- [ ] Monitor daily for issues
- [ ] Collect user feedback
- [ ] Track performance metrics
- [ ] Check database growth
- [ ] Review error logs
- [ ] Make quick fixes as needed

---

## 🆘 Support & Help

### If Issues Arise:

1. Check PM2 logs: `pm2 logs parking-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check Supabase logs in dashboard
4. Review browser console for frontend errors

### Backup Strategy:

```bash
# Daily automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump your_database > /backups/db_$DATE.sql
find /backups -name "db_*.sql" -mtime +30 -delete
```

Save as `/usr/local/bin/backup-database.sh` and add to crontab:

```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/backup-database.sh
```

---

## 🎯 Recommended Deployment Path

**For your parking management system, I recommend:**

1. **Start with Option 1 (VPS)** - DigitalOcean $6/month droplet
2. **Use your current Supabase** (FREE tier is sufficient initially)
3. **Deploy with PM2 + Nginx** (stable, proven solution)
4. **Get domain from Registro.br** (professional .br domain)
5. **Use Let's Encrypt SSL** (FREE, auto-renewing)

**Timeline:**

- Setup server: 2-3 hours
- Configure domain: 30 minutes
- Deploy app: 1-2 hours
- Testing: 2-4 hours
- **Total: 1 day to go live**

---

## 📞 Next Immediate Steps

1. **Choose hosting provider** and create account
2. **Purchase domain name**
3. **Create production environment variables**
4. **Run production build locally** to test: `npm run build`
5. **Review this guide** and check off completed items

Once you choose your deployment method, I can provide detailed step-by-step commands specific to that platform!

---

## ✅ You're Ready When:

- [ ] All tests passing
- [ ] Security configured
- [ ] Environment variables set
- [ ] Domain purchased
- [ ] Hosting account created
- [ ] SSL certificate ready
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Staff trained
- [ ] Documentation complete

**Your system is production-ready. Time to launch! 🚀**
