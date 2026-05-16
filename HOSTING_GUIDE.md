# CallLog SaaS — Production Hosting Guide

---

## Option 1: Vercel + Neon.tech (Recommended — Free Tier Available)

### Step 1: Database Setup (Neon.tech)
```
1. https://neon.tech वर जा → Sign Up
2. New Project बनवा → "calllog-db"
3. Dashboard मध्ये Connection String copy करा:
   postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/calllog_db?sslmode=require
4. हा string DATABASE_URL म्हणून save करा
```

### Step 2: prisma/schema.prisma बदला
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 3: GitHub वर Push करा
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/calllog-saas.git
git push -u origin main
```

### Step 4: Vercel Deploy
```
1. https://vercel.com → Sign Up with GitHub
2. New Project → Import your GitHub repo
3. Environment Variables add करा:
   DATABASE_URL      = postgresql://... (Neon string)
   JWT_SECRET        = (openssl rand -base64 32 ने generate करा)
   NEXT_PUBLIC_APP_URL = https://your-project.vercel.app
   NODE_ENV          = production
4. Deploy click करा
5. Deploy झाल्यावर:
   vercel.com → Project → Functions tab → Terminal:
   npx prisma migrate deploy
   npm run db:seed
```

---

## Option 2: Railway (Easiest — PostgreSQL Included)

```
1. https://railway.app → Sign Up
2. New Project → Deploy from GitHub repo
3. + New → Database → PostgreSQL add करा
4. Settings → Environment Variables:
   JWT_SECRET        = (random string)
   NEXT_PUBLIC_APP_URL = https://your-app.railway.app
   NODE_ENV          = production
   (DATABASE_URL automatically set होतो Railway मध्ये)
5. Deploy होईल automatically
6. Railway Shell मध्ये:
   npx prisma migrate deploy
   npm run db:seed
```

---

## Option 3: VPS (Ubuntu 22.04)

### 1. Server Setup
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres psql << SQL
CREATE USER calllog_user WITH PASSWORD 'StrongPassword123';
CREATE DATABASE calllog_db OWNER calllog_user;
SQL
```

### 2. Project Deploy
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/calllog-saas.git calllog
cd calllog
npm install
npm install next-swagger-doc
cp .env.example .env
nano .env
```

### 3. .env values
```env
DATABASE_URL="postgresql://calllog_user:StrongPassword123@localhost:5432/calllog_db"
JWT_SECRET="GENERATE_32_CHAR_RANDOM_STRING_HERE"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV=production
```

### 4. Schema + Build
```bash
# schema.prisma मध्ये provider = "postgresql" करा
npx prisma migrate deploy
npm run db:seed
npm run build
```

### 5. PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start npm --name "calllog" -- start
pm2 startup
pm2 save
```

### 6. Nginx Config
```bash
sudo nano /etc/nginx/sites-available/calllog
```
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    client_max_body_size 25M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/calllog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL — Free HTTPS
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Production Checklist

```
□ DATABASE_URL  → PostgreSQL string (not SQLite)
□ JWT_SECRET    → Min 32 chars random string
□ APP_URL       → https://your-domain.com
□ NODE_ENV      → production
□ schema.prisma → provider = "postgresql"
□ Migrations    → npx prisma migrate deploy
□ HTTPS/SSL     → Certbot या Vercel automatic
□ Uploads       → /uploads folder writable
□ PM2/Docker    → Process always running
```

---

## JWT Secret Generate करायचे कसे

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# K8mP2xR9vQ4nL7wY1jH6uT3eA0bC5dF
```

---

## Maintenance Commands

```bash
# Logs बघा
pm2 logs calllog

# Restart
pm2 restart calllog

# Update deploy
git pull
npm install
npm run build
pm2 restart calllog

# DB Studio (browser मध्ये DB बघा)
npx prisma studio
```
