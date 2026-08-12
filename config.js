const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxELSqRHF6SyFq3_XVtbBuk90_NqCj8VoHg0s_vFKrcvNSsmCnpCeuBJJfANgu83Cypng/exec"
};

// Security Utility: Sanitize inputs to prevent XSS attacks
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}
