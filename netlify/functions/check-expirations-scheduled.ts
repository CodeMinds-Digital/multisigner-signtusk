/**
 * Netlify Scheduled Function - Check Signature Expirations
 * 
 * This function runs daily at midnight UTC to check for expired signature requests
 * and send expiration warnings for requests nearing expiration.
 * 
 * Schedule: @daily (runs at 00:00 UTC)
 * 
 * To configure in Netlify:
 * 1. Go to Site Settings > Functions > Scheduled Functions
 * 2. Add a new scheduled function
 * 3. Set the schedule to: 0 0 * * * (daily at midnight)
 * 4. Point to this function
 * 
 * Or use Netlify CLI:
 * netlify functions:create check-expirations-scheduled --schedule "@daily"
 */

import { schedule } from '@netlify/functions';

const CRON_SECRET = process.env.CRON_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// The scheduled handler
const handler = schedule('@daily', async (event) => {
  console.log('Starting scheduled expiration check...');
  
  try {
    // Call our API endpoint that handles expiration checks
    const response = await fetch(`${APP_URL}/api/jobs/check-expirations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        'X-Netlify-Scheduled': 'true',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Expiration check failed:', response.status, errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: 'Expiration check failed',
          details: errorText,
        }),
      };
    }

    const result = await response.json();
    console.log('Expiration check completed:', result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Expiration check completed successfully',
        result,
      }),
    };
  } catch (error) {
    console.error('Error in scheduled expiration check:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
});

export { handler };

