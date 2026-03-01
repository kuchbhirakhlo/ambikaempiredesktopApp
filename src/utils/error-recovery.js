/**
 * Utility functions for error recovery in forms
 */

// Function to recover form inputs after an error
function recoverFormInputs(formSelector = null) {
  // If a specific form is provided, only recover inputs in that form
  const selector = formSelector ? `${formSelector} input, ${formSelector} select, ${formSelector} textarea` 
                                : 'input, select, textarea';
  
  const inputFields = document.querySelectorAll(selector);
  inputFields.forEach(field => {
    // Skip fields that should be ignored (can be marked with data-no-recover attribute)
    if (field.getAttribute('data-no-recover') === 'true') return;
    
    // Ensure the field is not disabled or readonly
    field.disabled = false;
    field.readOnly = false;
    
    // Force the field to be interactive by creating a new event and triggering it
    // This helps browsers recognize the field is now editable
    const event = new Event('focus', { bubbles: true });
    field.dispatchEvent(event);
    
    // For select elements, ensure they're clickable
    if (field.tagName === 'SELECT') {
      field.blur();
      field.focus();
    }
  });
}

// Error handler function for API operations
function handleApiError(operation, error, formSelector = null) {
  console.error(`Error during ${operation}:`, error);
  
  // Show the error message to the user
  alert(`An error occurred while ${operation}. ${error.message || error}`);
  
  // Recover form inputs to ensure UI remains responsive
  // Add a slight delay to ensure DOM is stable
  setTimeout(() => {
    recoverFormInputs(formSelector);
  }, 100);
}

// Function to recover a specific form
function recoverForm(formId, submitHandler) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  // Recover the input fields without replacing the form
  recoverFormInputs(`#${formId}`);
  
  // Re-attach the submit event listener if needed
  if (submitHandler && !form._hasReattachedSubmit) {
    form.addEventListener('submit', submitHandler);
    form._hasReattachedSubmit = true;
  }
  
  return form;
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    recoverFormInputs,
    handleApiError,
    recoverForm
  };
} 