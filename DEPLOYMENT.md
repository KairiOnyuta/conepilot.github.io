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

## Manual Render Deployment (Recommended)

### 1. Create PostgreSQL Database
1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"PostgreSQL"**
3. Name: `conepilot-db`
4. Database: `conepilot`
5. User: `conepilot`
6. Region: Choose closest to you
7. Plan: **Free**
8. Click **"Create Database"**
9. **Copy the "Internal Database URL"** (starts with `postgresql://`)

### 2. Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `KairiOnyuta/conepilot.github.io`
3. Configure:
   - **Name**: `conepilot-backend`
   - **Region**: Same as database
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**:
     ```
     npm ci --include=dev && npx prisma generate && npx prisma db push --accept-data-loss && npm run build
     ```
   - **Start Command**: `npm start`
   - **Plan**: **Free**

### 3. Add Environment Variables
Before deploying, click **"Advanced"** and add these environment variables:
- `DATABASE_URL`: (paste the Internal Database URL from step 1)
- `DIRECT_URL`: (paste the same URL again)
- `JWT_SECRET`: `your-super-secret-key-change-this-to-random-string`
- `PORT`: `10000`
- `NODE_ENV`: `production`

4. Click **"Create Web Service"**

### 4. Wait for Deployment
- This takes 3-5 minutes
- Watch the logs for any errors
- When done, you'll see "Your service is live 🎉"

## Testing
Once both are deployed:
1. Visit: `https://kairionyuta.github.io/conepilot.github.io/`
2. Try to register/login
3. Check browser console for any errors

## Troubleshooting
- **CORS errors**: Make sure backend is deployed and URL is correct
- **Database errors**: Check Render logs for migration issues
- **Build fails**: Check Node.js version matches (should be 18+)
