const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwBcZrGln-qokiyXCik4NRVXJI5Q4VmKvV3aQOsBDynA7wXLeR8dPVgNASn8_7gfwyVkw/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
