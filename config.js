const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbx5jBJMzP6TcRVZXPUY9UVhUdxrqigE6fU8Y_nv_FzTYmEPVTSunj6Z2miHIGCEi3bYkw/exec"
API_SECRET: "FtOrders_Sec9982Key!x" // Must match the EXPECTED_SECRET string set in your .gs script
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
