# ConePilot Deployment Guide

## Overview
This app has two parts that need to be deployed separately:
1. **Frontend** (React) → GitHub Pages ✅ Already deployed
2. **Backend** (Express + PostgreSQL) → Needs deployment

## Backend Deployment (Render.com - Free Tier)

### Step 1: Create a Render Account
1. Go to [render.com](https://render.com)
2. Sign up/login with your GitHub account

### Step 2: Deploy the Backend
1. Click **"New +"** → **"Blueprint"**
2. Connect your GitHub repository: `KairiOnyuta/conepilot.github.io`
3. Give the blueprint instance a name (e.g., "conepilot")
4. Click **"Apply"**

This will automatically:
- Create a PostgreSQL database
- Deploy your Express backend
- Set up environment variables
- Run database migrations

### Step 3: Get Your Backend URL
After deployment completes:
1. Click on your **"conepilot-backend"** service
2. Copy the URL (it will look like: `https://conepilot-backend-xxxx.onrender.com`)

### Step 4: Configure Frontend to Use Backend
1. Go to your GitHub repository settings
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `VITE_API_URL`
5. Value: `https://YOUR-BACKEND-URL.onrender.com/api` (replace with your actual URL)
6. Save

### Step 5: Redeploy Frontend
1. Go to **Actions** tab in your GitHub repo
2. Click on **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"** button

## Alternative: Manual Render Deployment

If blueprint doesn't work, deploy manually:

### 1. Create PostgreSQL Database
- New → PostgreSQL
- Name: `conepilot-db`
- Free plan
- Copy the "Internal Database URL"

### 2. Create Web Service
- New → Web Service
- Connect your repo
- Root directory: `server`
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm start`
- Free plan

### 3. Add Environment Variables
Add these in the service's **Environment** tab:
- `DATABASE_URL`: (paste the database URL)
- `DIRECT_URL`: (paste the database URL again)
- `JWT_SECRET`: (generate a random string)
- `PORT`: `10000`
- `NODE_ENV`: `production`

## Testing
Once both are deployed:
1. Visit: `https://kairionyuta.github.io/conepilot.github.io/`
2. Try to register/login
3. Check browser console for any errors

## Troubleshooting
- **CORS errors**: Make sure backend is deployed and URL is correct
- **Database errors**: Check Render logs for migration issues
- **Build fails**: Check Node.js version matches (should be 18+)
