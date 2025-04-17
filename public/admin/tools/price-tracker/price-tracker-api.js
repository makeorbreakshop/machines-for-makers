/**
 * Price Tracker API Integration
 * 
 * This file contains the JavaScript code needed to integrate the price-extractor-python
 * API with the Machines for Makers admin interface.
 */

// Configuration
const API_BASE_URL = 'http://localhost:8000';

/**
 * Update price for a single machine
 * @param {string} machineId - The ID of the machine to update
 * @returns {Promise<object>} - The result of the update operation
 */
async function updateMachinePrice(machineId) {
  console.log(`[Python API] Updating price for machine ${machineId}`);
  
  try {
    const startTime = performance.now();
    
    const response = await fetch(`${API_BASE_URL}/api/v1/update-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ machine_id: machineId })
    });
    
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(2);
    
    const result = await response.json();
    
    // Add response time and API details to the result
    result.debug = {
      ...result.debug,
      apiUrl: `${API_BASE_URL}/api/v1/update-price`,
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
      responseStatus: response.status,
      machineId: machineId
    };
    
    console.log(`[Python API] Price update result for ${machineId}:`, result);
    return result;
  } catch (error) {
    console.error(`[Python API] Error updating price for ${machineId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to connect to Python API",
      debug: {
        apiUrl: `${API_BASE_URL}/api/v1/update-price`,
        timestamp: new Date().toISOString(),
        errorName: error.name,
        errorStack: error.stack,
        machineId: machineId
      }
    };
  }
}

/**
 * Update prices for all machines
 * @param {number} daysThreshold - Minimum days since last update
 * @param {number|null} limit - Maximum number of machines to update, or null for all
 * @param {Array|null} machineIds - Optional array of specific machine IDs to update
 * @returns {Promise<object>} - The result of the batch update operation
 */
async function updateAllPrices(daysThreshold = 7, limit = null, machineIds = null) {
  console.log(`[Python API] Starting batch update with threshold ${daysThreshold} days${limit ? ` and limit ${limit} machines` : ''}${machineIds ? ` for ${machineIds.length} specific machines` : ''}`);
  
  try {
    const startTime = performance.now();
    
    const response = await fetch(`${API_BASE_URL}/api/v1/batch-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        days_threshold: daysThreshold,
        limit: limit,
        machine_ids: machineIds
      })
    });
    
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(2);
    
    const result = await response.json();
    
    // Add response time and API details to the result
    result.debug = {
      apiUrl: `${API_BASE_URL}/api/v1/batch-update`,
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
      responseStatus: response.status,
      daysThreshold: daysThreshold,
      limit: limit,
      machineIdCount: machineIds ? machineIds.length : null
    };
    
    console.log(`[Python API] Batch update result:`, result);
    return result;
  } catch (error) {
    console.error(`[Python API] Error in batch update:`, error);
    return {
      success: false,
      error: error.message || "Failed to connect to Python API",
      debug: {
        apiUrl: `${API_BASE_URL}/api/v1/batch-update`,
        timestamp: new Date().toISOString(),
        errorName: error.name,
        errorStack: error.stack,
        daysThreshold: daysThreshold,
        limit: limit,
        machineIdCount: machineIds ? machineIds.length : null
      }
    };
  }
}

/**
 * Test the connection to the Python API
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
async function testConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`[Python API] Connection test successful:`, result);
      return true;
    }
    
    console.error(`[Python API] Connection test failed with status ${response.status}`);
    return false;
  } catch (error) {
    console.error(`[Python API] Connection test error:`, error);
    return false;
  }
}

// Automatically test connection when the script loads
testConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log(`[Python API] Successfully connected to ${API_BASE_URL}`);
    } else {
      console.error(`[Python API] Failed to connect to ${API_BASE_URL}`);
    }
  });

// Export functions for external use
window.priceTrackerAPI = {
  updateMachinePrice,
  updateAllPrices,
  testConnection
}; 