const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycby0ZPSeUXhEhGrvvGxYfn3BvwjOLxpOleReKxApZ1IdbetjZwQk3zEOiiB1HtgLE_xGvg/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
