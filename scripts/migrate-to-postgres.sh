#!/bin/bash
# Migration script to switch from SQLite to PostgreSQL

echo "=========================================="
echo "Vercel Postgres Migration Helper"
echo "=========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set."
    echo ""
    echo "Please set your Vercel Postgres connection string:"
    echo "  export DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require'"
    exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL:0:30}..."

# Step 1: Create initial migration (if not exists)
echo ""
echo "Step 1: Creating Prisma migration..."
npx prisma migrate dev --name init_postgres --create-only

# Step 2: Push schema to database
echo ""
echo "Step 2: Pushing schema to database..."
npx prisma db push

# Step 3: Generate Prisma client
echo ""
echo "Step 3: Generating Prisma client..."
npx prisma generate

# Step 4: Seed the database
echo ""
echo "Step 4: Seeding database with test users..."
npm run db:seed

echo ""
echo "=========================================="
echo "Migration complete!"
echo "=========================================="
echo ""
echo "Test credentials created:"
echo "  - Founder: founder@fuelpro.com / Founder@2024"
echo "  - Demo: demo@fuelpro.com / Demo123456"