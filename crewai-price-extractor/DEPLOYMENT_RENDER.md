# Deploying CrewAI Price Extractor to Render

This guide explains how to deploy the CrewAI Price Extractor service to Render.com.

## Prerequisites

1. A Render.com account (sign up at https://render.com)
2. A GitHub account with the CrewAI Price Extractor repository
3. API keys for OpenAI/Claude (whichever LLM you're using)
4. Supabase credentials for the database

## Step 1: Push to GitHub

Ensure your code is committed and pushed to a GitHub repository.

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Create a New Web Service on Render

1. Log in to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `crewai-price-extractor`
   - **Runtime**: `Docker`
   - **Region**: Choose the closest to your users
   - **Branch**: `main` (or your preferred branch)
   - **Plan**: Start with "Starter" plan ($7/month) or choose based on your needs

## Step 3: Configure Environment Variables

Add the following environment variables in the Render dashboard:

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
API_SECRET=your_api_secret_for_authentication
PORT=8000
PYTHONUNBUFFERED=true
```

## Step 4: Deploy the Service

1. Click "Create Web Service"
2. Wait for the build and deployment to complete (this may take a few minutes)
3. Once deployed, Render will provide a URL for your service (e.g., `https://crewai-price-extractor.onrender.com`)

## Step 5: Create the HTML Storage Table

After deployment, create the HTML storage table by making a request to the database setup endpoint:

```bash
curl -X POST "https://crewai-price-extractor.onrender.com/database/create-html-table" \
  -H "api-key: your_api_secret"
```

## Step 6: Update Next.js Environment Variables

In your Next.js application, update the following environment variables:

```
CREWAI_SERVICE_URL=https://crewai-price-extractor.onrender.com
CREWAI_API_KEY=your_api_secret
```

## Step 7: Test the Deployment

Test that the service is working by making a request to the health check endpoint:

```bash
curl https://crewai-price-extractor.onrender.com/health
```

You should receive a response like:

```json
{"status":"ok","service":"CrewAI Price Extractor"}
```

## Step 8: Test Price Extraction

Test price extraction for a single machine:

```bash
curl "https://crewai-price-extractor.onrender.com/update-machine-price/your-machine-id?api_key=your_api_secret"
```

## Monitoring and Maintenance

- View logs in the Render dashboard to troubleshoot issues
- Set up Render alerts for service disruptions
- Monitor usage and adjust your plan as needed

## Auto-Scaling (Optional)

For production deployments, consider:

1. Enabling auto-scaling in Render settings
2. Setting up a separate background worker for batch processing
3. Adding monitoring and error tracking with a service like Sentry 