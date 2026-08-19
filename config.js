const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwqjFYCHsckqTG86dI0qFF50JeCcER4yqo5kJI1BRGnVubQc1I2pj9Q51MjW_KbvNarPA/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
