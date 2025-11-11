/**
 * Cookie utility functions for temporary form data storage
 * These functions help save and restore form data while navigating between forms
 * Data is cleared when explicitly saved or when the browser is refreshed
 */

// Cookie expiration time - data persists only for the session
const COOKIE_EXPIRY_HOURS = 24; // 24 hours for safety, but will be cleared on refresh

/**
 * Save form data to a cookie with a specific key
 * @param {string} cookieKey - Unique identifier for the cookie
 * @param {Object} formData - Form data object to save
 */
export const saveFormDataToCookie = (cookieKey, formData) => {
  try {
    const dataToSave = {
      ...formData,
      timestamp: Date.now()
    };
    
    const jsonString = JSON.stringify(dataToSave);
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (COOKIE_EXPIRY_HOURS * 60 * 60 * 1000));
    
    document.cookie = `${cookieKey}=${encodeURIComponent(jsonString)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
    
    console.log(`Form data saved to cookie: ${cookieKey}`);
    return true;
  } catch (error) {
    console.error('Error saving form data to cookie:', error);
    return false;
  }
};

/**
 * Load form data from a cookie
 * @param {string} cookieKey - Unique identifier for the cookie
 * @returns {Object|null} - Parsed form data or null if not found
 */
export const loadFormDataFromCookie = (cookieKey) => {
  try {
    const cookies = document.cookie.split(';');
    const targetCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${cookieKey}=`)
    );
    
    if (!targetCookie) {
      console.log(`No cookie found for key: ${cookieKey}`);
      return null;
    }
    
    const cookieValue = targetCookie.split('=')[1];
    const decodedValue = decodeURIComponent(cookieValue);
    const parsedData = JSON.parse(decodedValue);
    
    // Check if data is too old (older than expiry time)
    const timeElapsed = Date.now() - (parsedData.timestamp || 0);
    const maxAge = COOKIE_EXPIRY_HOURS * 60 * 60 * 1000;
    
    if (timeElapsed > maxAge) {
      console.log(`Cookie data too old, removing: ${cookieKey}`);
      removeFormDataFromCookie(cookieKey);
      return null;
    }
    
    console.log(`Form data loaded from cookie: ${cookieKey}`);
    // Remove timestamp before returning
    const { timestamp, ...formData } = parsedData;
    return formData;
  } catch (error) {
    console.error('Error loading form data from cookie:', error);
    return null;
  }
};

/**
 * Remove form data cookie
 * @param {string} cookieKey - Unique identifier for the cookie to remove
 */
export const removeFormDataFromCookie = (cookieKey) => {
  try {
    document.cookie = `${cookieKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log(`Form data cookie removed: ${cookieKey}`);
    return true;
  } catch (error) {
    console.error('Error removing form data cookie:', error);
    return false;
  }
};

/**
 * Check if a form data cookie exists
 * @param {string} cookieKey - Unique identifier for the cookie
 * @returns {boolean} - Whether the cookie exists
 */
export const hasFormDataCookie = (cookieKey) => {
  return document.cookie.split(';').some(cookie => 
    cookie.trim().startsWith(`${cookieKey}=`)
  );
};

/**
 * Generate a unique cookie key for a specific form and form ID
 * @param {string} formName - Name of the form (e.g., 'form1', 'form2', 'form3')
 * @param {string|number} formId - ID of the specific form instance
 * @returns {string} - Unique cookie key
 */
export const generateFormCookieKey = (formName, formId) => {
  return `temp_${formName}_data_${formId}`;
};

/**
 * Clear all temporary form data cookies
 * This is called when form is officially saved or on page refresh
 */
export const clearAllTempFormCookies = () => {
  const cookies = document.cookie.split(';');
  let cleared = 0;
  
  cookies.forEach(cookie => {
    const cookieName = cookie.trim().split('=')[0];
    if (cookieName.startsWith('temp_form') && cookieName.includes('_data_')) {
      removeFormDataFromCookie(cookieName);
      cleared++;
    }
  });
  
  console.log(`Cleared ${cleared} temporary form data cookies`);
  return cleared;
};

/**
 * Save form data with automatic key generation
 * @param {string} formName - Name of the form (e.g., 'form1', 'form2', 'form3')
 * @param {string|number} formId - ID of the specific form instance
 * @param {Object} formData - Form data to save
 */
export const saveFormData = (formName, formId, formData) => {
  if (!formId) {
    console.warn('Cannot save form data to cookie: no form ID provided');
    return false;
  }
  
  console.log(`🍪 Saving ${formName} data for form ID ${formId}:`, {
    title: formData.title,
    division: formData.division,
    processCount: formData.processes?.length || 0
  });
  
  const cookieKey = generateFormCookieKey(formName, formId);
  return saveFormDataToCookie(cookieKey, formData);
};

/**
 * Load form data with automatic key generation
 * @param {string} formName - Name of the form (e.g., 'form1', 'form2', 'form3')
 * @param {string|number} formId - ID of the specific form instance
 * @returns {Object|null} - Loaded form data or null
 */
export const loadFormData = (formName, formId) => {
  if (!formId) {
    console.warn('Cannot load form data from cookie: no form ID provided');
    return null;
  }
  
  const cookieKey = generateFormCookieKey(formName, formId);
  const data = loadFormDataFromCookie(cookieKey);
  
  if (data) {
    console.log(`🍪 Loaded ${formName} data for form ID ${formId}:`, {
      title: data.title,
      division: data.division,
      processCount: data.processes?.length || 0
    });
  } else {
    console.log(`🍪 No saved ${formName} data found for form ID ${formId}`);
  }
  
  return data;
};

/**
 * Clear form data with automatic key generation
 * @param {string} formName - Name of the form (e.g., 'form1', 'form2', 'form3')
 * @param {string|number} formId - ID of the specific form instance
 */
export const clearFormData = (formName, formId) => {
  if (!formId) {
    console.warn('Cannot clear form data cookie: no form ID provided');
    return false;
  }
  
  const cookieKey = generateFormCookieKey(formName, formId);
  return removeFormDataFromCookie(cookieKey);
};

// Clear all temporary cookies on page load/refresh
// This ensures cookies only persist during active navigation, not across browser sessions
if (typeof window !== 'undefined') {
  // Check if this is a page refresh (not just component mount)
  const isPageRefresh = window.performance.navigation?.type === window.performance.navigation?.TYPE_RELOAD ||
                       window.performance.getEntriesByType('navigation')[0]?.type === 'reload';
  
  if (isPageRefresh) {
    // Clear all temp cookies on page refresh
    setTimeout(() => {
      clearAllTempFormCookies();
    }, 100);
  }
}