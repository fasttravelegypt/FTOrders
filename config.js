const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyZdt3HdR2FkJXTDSfhfIagCX4ppyiB1zidZtoIQfz4p9pFp6RqzOHX4a-v8COstpkPTA/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
