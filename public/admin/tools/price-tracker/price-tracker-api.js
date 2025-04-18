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
 * Confirm and save an extracted price after user approval
 * @param {string} machineId - The ID of the machine to update
 * @param {number} newPrice - The confirmed price to save
 * @returns {Promise<object>} - The result of the price confirmation operation
 */
async function confirmPrice(machineId, newPrice) {
  console.log(`[Python API] Confirming price ${newPrice} for machine ${machineId}`);
  
  try {
    const startTime = performance.now();
    
    const response = await fetch(`${API_BASE_URL}/api/v1/update-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        machine_id: machineId,
        confirm: true,
        new_price: newPrice
      })
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
      machineId: machineId,
      confirmedPrice: newPrice
    };
    
    console.log(`[Python API] Price confirmation result for ${machineId}:`, result);
    return result;
  } catch (error) {
    console.error(`[Python API] Error confirming price for ${machineId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to connect to Python API",
      debug: {
        apiUrl: `${API_BASE_URL}/api/v1/update-price`,
        timestamp: new Date().toISOString(),
        errorName: error.name,
        errorStack: error.stack,
        machineId: machineId,
        confirmedPrice: newPrice
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
 * Test connection to the price extractor API
 * @returns {Promise<object>} - The result of the test
 */
async function testConnection() {
  console.log("[Python API] Testing connection");
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const result = await response.json();
    
    console.log("[Python API] Connection test result:", result);
    
    return {
      success: true,
      status: "connected",
      details: result
    };
  } catch (error) {
    console.error("[Python API] Connection test failed:", error);
    
    return {
      success: false,
      status: "disconnected",
      error: error.message || "Failed to connect to Python API"
    };
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

/**
 * Debug price extraction without saving to the database
 * @param {string} machineId - The ID of the machine to debug
 * @returns {Promise<object>} - The detailed debug information
 */
async function debugMachinePrice(machineId) {
  console.log(`[Python API] Debugging price extraction for machine ${machineId}`);
  
  try {
    const startTime = performance.now();
    
    const response = await fetch(`${API_BASE_URL}/api/v1/debug-extraction`, {
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
    if (!result.debug) {
      result.debug = {};
    }
    
    result.debug = {
      ...result.debug,
      apiUrl: `${API_BASE_URL}/api/v1/debug-extraction`,
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
      responseStatus: response.status,
      machineId: machineId,
      isDebugMode: true
    };
    
    console.log(`[Python API] Debug extraction result for ${machineId}:`, result);
    return result;
  } catch (error) {
    console.error(`[Python API] Error debugging extraction for ${machineId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to connect to Python API",
      debug: {
        apiUrl: `${API_BASE_URL}/api/v1/debug-extraction`,
        timestamp: new Date().toISOString(),
        errorName: error.name,
        errorStack: error.stack,
        machineId: machineId,
        isDebugMode: true
      }
    };
  }
}

// Export functions for external use
window.priceTrackerAPI = {
  updateMachinePrice,
  confirmPrice,
  updateAllPrices,
  testConnection,
  debugMachinePrice
}; 