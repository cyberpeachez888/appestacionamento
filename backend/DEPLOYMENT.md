# Deployment Guide

Guide for deploying the parking management backend API to production.

## Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database migrations run (`001_create_tables.sql` and `002_seed_data.sql`)
- [ ] Environment variables configured
- [ ] Dependencies installed (`npm install`)
- [ ] API tested locally
- [ ] Frontend updated with production backend URL

## Environment Variables for Production

Create a production `.env` file with:

```env
# Server
PORT=3000
NODE_ENV=production

# Supabase (Required for production)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key

# CORS - Add your production frontend URL
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# Currency (Optional)
CURRENCY_CODE=BRL
CURRENCY_LOCALE=pt-BR
```

**Important:** Never commit your `.env` file to version control!

## Deployment Options

### Option 1: Heroku

1. Install Heroku CLI
2. Create a new Heroku app:
```bash
heroku create your-parking-api
```

3. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your-url
heroku config:set SUPABASE_ANON_KEY=your-key
heroku config:set ALLOWED_ORIGINS=your-frontend-url
```

4. Deploy:
```bash
git push heroku main
```

5. Verify:
```bash
heroku open /api/health
```

### Option 2: Railway

1. Install Railway CLI or use the web interface
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables in Railway dashboard
5. Railway will automatically deploy on push

### Option 3: DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create new app from GitHub repository
3. Configure environment variables
4. Set build command: `npm install`
5. Set run command: `npm start`
6. Deploy

### Option 4: VPS (Ubuntu/Debian)

1. SSH into your server
2. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone your repository:
```bash
git clone https://github.com/your-username/appestacionamento.git
cd appestacionamento/backend
```

4. Install dependencies:
```bash
npm install --production
```

5. Create `.env` file with production variables

6. Install PM2 for process management:
```bash
sudo npm install -g pm2
```

7. Start the application:
```bash
pm2 start src/server.js --name parking-api
pm2 save
pm2 startup
```

8. Configure nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

9. Setup SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option 5: Docker

Create a `Dockerfile` in the backend directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

## Supabase Setup for Production

1. **Create Production Project**
   - Go to https://supabase.com
   - Create a new project for production
   - Choose a strong database password

2. **Run Migrations**
   - Go to SQL Editor in Supabase dashboard
   - Run `sql/001_create_tables.sql`
   - Run `sql/002_seed_data.sql`

3. **Configure Row Level Security (Optional)**
   - Add RLS policies for additional security
   - Example: Restrict deletes to admin users only

4. **Set Up Backups**
   - Enable automatic backups in Supabase
   - Configure backup retention period

5. **Get API Keys**
   - Go to Settings > API
   - Copy your `URL` and `anon/public` key
   - Add these to your environment variables

## Post-Deployment

### Monitoring

1. **Health Check**
```bash
curl https://your-api-url.com/api/health
```

2. **Set up monitoring** with services like:
   - UptimeRobot (for uptime monitoring)
   - LogRocket or Sentry (for error tracking)
   - Supabase dashboard (for database monitoring)

### Performance

1. **Enable gzip compression** in your reverse proxy
2. **Set up caching** for frequently accessed endpoints
3. **Monitor Supabase query performance**
4. **Consider adding rate limiting** for public endpoints

### Security

1. **Use HTTPS** (SSL/TLS) - Required for production
2. **Keep dependencies updated**: `npm audit fix`
3. **Set strong Supabase passwords**
4. **Limit CORS origins** to only your frontend domain
5. **Enable Row Level Security** in Supabase for additional protection
6. **Regularly backup** your database

### Scaling

If you need to scale:

1. **Horizontal scaling**: Deploy multiple instances behind a load balancer
2. **Database scaling**: Upgrade your Supabase plan for more resources
3. **Caching**: Add Redis for caching frequently accessed data
4. **CDN**: Use a CDN for static assets if serving any

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      working-directory: ./backend
      run: npm install
    
    - name: Run tests (when available)
      working-directory: ./backend
      run: npm test
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "your-app-name"
        heroku_email: "your-email@example.com"
        appdir: "backend"
```

## Rollback Plan

If something goes wrong:

1. **Heroku**: `heroku rollback`
2. **Railway/DigitalOcean**: Use the platform's rollback feature
3. **VPS with PM2**: 
   ```bash
   git checkout previous-commit
   npm install
   pm2 restart parking-api
   ```
4. **Docker**: 
   ```bash
   docker-compose down
   git checkout previous-commit
   docker-compose up -d
   ```

## Support & Maintenance

### Regular Tasks

- [ ] Monitor error logs weekly
- [ ] Check Supabase storage usage monthly
- [ ] Update dependencies monthly: `npm update`
- [ ] Review and optimize slow queries
- [ ] Backup database regularly (automated via Supabase)

### Common Issues

**High memory usage**: Restart the application or scale up
**Slow queries**: Add database indexes, optimize queries
**CORS errors**: Update ALLOWED_ORIGINS environment variable
**Connection timeouts**: Check Supabase connection limits

## Getting Help

- Backend issues: Check server logs
- Database issues: Check Supabase dashboard
- API documentation: See `README.md`
- Supabase docs: https://supabase.com/docs

## Checklist for Going Live

- [ ] Supabase production database configured
- [ ] All environment variables set
- [ ] HTTPS/SSL enabled
- [ ] CORS properly configured
- [ ] Health check endpoint responding
- [ ] Frontend connected and tested
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Error tracking configured
- [ ] Documentation updated with production URLs
