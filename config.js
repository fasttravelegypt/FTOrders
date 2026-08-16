const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbylca1BO0aJ5nzX6rkGCFwMHJPs76BUe0jWDrq4fz6T_YcXEZ6oAnZ_iwtQ7-OdX8xF_A/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
