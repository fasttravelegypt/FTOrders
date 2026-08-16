const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxjKcjElrDN3_dFIOcxtl2eHCTTgIswFNZtyJQdKbRHb2r_zPHddtW7qA4sGgL2C1isBA/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
