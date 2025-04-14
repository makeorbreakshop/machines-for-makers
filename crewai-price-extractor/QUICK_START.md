# CrewAI Price Extractor - Quick Start Guide

This guide provides step-by-step instructions for implementing and deploying the CrewAI Price Extractor service in a single day.

## Prerequisites

- Python 3.10+ installed
- Docker installed (for containerized deployment)
- Access to your Supabase database
- Claude API key from Anthropic
- Access to a hosting platform (Render, Heroku, etc.)

## Setup Steps

### 1. Clone and Configure the Project (1 hour)

1. Clone this repository to your local machine
2. Copy `.env.example` to `.env` and add your API keys:
   - Add your Supabase URL and service key
   - Add your Anthropic API key
   - Set an API secret for authentication
3. Install dependencies: `pip install -r requirements.txt`
4. Install Playwright browsers: `python -m playwright install chromium`

### 2. Test Locally (1 hour)

1. Start the service locally: `uvicorn app.main:app --reload`
2. Open a browser to `http://localhost:8000/docs` to see the Swagger UI
3. Test the `/health` endpoint to verify the service is running
4. Test the price extraction with a sample machine ID:
   - Use the `/update-machine-price/{machine_id}` endpoint with a real machine ID
   - Check the Supabase database to verify the price was saved

### 3. Prepare for Deployment (1 hour)

1. Build the Docker image: `docker build -t crewai-price-extractor .`
2. Test the Docker container locally:
   ```
   docker run -p 8000:8000 --env-file .env crewai-price-extractor
   ```
3. Create an account on your chosen hosting platform (Render, Heroku, etc.)
4. Set up a new web service on the platform
5. Configure environment variables in the hosting platform settings

### 4. Deploy the Service (1 hour)

#### Option A: Deploy to Render
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Select the repository
4. Configure environment variables from your `.env` file
5. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as the start command
6. Deploy the service

#### Option B: Deploy to Heroku
1. Install the Heroku CLI and log in
2. Create a new Heroku app: `heroku create crewai-price-extractor`
3. Push the Docker image: `heroku container:push web`
4. Release the container: `heroku container:release web`
5. Set environment variables: `heroku config:set SUPABASE_URL=... ANTHROPIC_API_KEY=...`

### 5. Integrate with Next.js Application (2 hours)

1. Add the following environment variables to your Next.js app's `.env.local`:
   ```
   CREWAI_SERVICE_URL=https://your-deployed-service-url
   CREWAI_API_KEY=your-api-secret-key
   ```

2. Create API proxy routes in your Next.js app:
   - Create `/app/api/crewai/update-prices/route.ts` 
   - Create `/app/api/crewai/update-machine-price/[id]/route.ts`

3. Update the admin interface to include CrewAI options in the price tracker tool:
   - Add a toggle switch for using CrewAI
   - Update the update functions to use the CrewAI endpoints when selected

4. Test the integration with a single machine price update
   - Use the admin interface to update a price with CrewAI
   - Verify the price is updated in the database
   - Check the CrewAI service logs for any issues

### 6. Test and Scale (2 hours)

1. Run a small batch test with 5-10 machines
2. Monitor the results and verify prices are correctly extracted
3. Check the database for any errors or issues
4. Gradually increase the batch size to test scaling
5. Analyze results to identify any patterns in successes/failures

### 7. Setup Long-term Monitoring (1 hour)

1. Set up monitoring on your hosting platform
2. Configure alerts for service downtime
3. Add logging to track API usage and extraction success rates
4. Update the Vercel cron job to use the CrewAI service
   - Edit your `vercel.json` to update the cron job URL

## Checklist for Production Readiness

Before considering the implementation complete, verify:

- [ ] API is secured with proper authentication
- [ ] Environment variables are properly set
- [ ] Docker container is deployed and running
- [ ] Next.js integration is working correctly
- [ ] Price extraction is working for a variety of machines
- [ ] Monitoring and logging are in place
- [ ] Regular price updates via cron job are working

## Troubleshooting

If you encounter issues:

1. Check the service logs for error messages
2. Verify all API keys are correctly set
3. Test the service endpoints directly using the Swagger UI
4. Ensure the Supabase connection is working
5. Check that the Claude API is responding correctly
6. Test with a single machine ID to isolate issues 