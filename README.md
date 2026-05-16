# CallLog SaaS — Production Ready

## Quick Start
```bash
npm install && npm install next-swagger-doc
cp .env.example .env
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Demo: admin@demo.com / Admin1234

## Hosting Options
1. Vercel + Neon.tech (easiest)
2. Railway (PostgreSQL included)
3. VPS Ubuntu + PM2 + Nginx
4. Docker Compose

## Production Checklist
- DATABASE_URL = PostgreSQL
- JWT_SECRET = 32+ chars
- NODE_ENV = production
- HTTPS enabled
- prisma/schema.prisma → provider = "postgresql"

## Mobile API: /api/mobile/
## Swagger Docs: /docs
## See ANDROID_DEVELOPER_GUIDE.md for mobile integration
