/* SCF Africa Connect
   Navigation and front-end form checks.
   Supabase authentication will be connected next.
*/

const SCF_CONFIG = {
  supabaseConnected: false,
  supportEmail: "smartcoinlet@gmail.com"
};

// Show one page and hide the others.
function showPage(pageId) {
  const pages = document.querySelectorAll(".page");
  const target = document.getElementById(pageId);

  if (!target) {
    console.warn("SCF page not found:", pageId);
    return;
  }

  pages.forEach(page => page.classList.remove("active"));
  target.classList.add("active");

  closeMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "waiting") {
    checkAccountStatus();
  }
}

// Mobile navigation menu.
function toggleMenu() {
  const menu = document.getElementById("mainMenu");
  if (menu) menu.classList.toggle("show");
}

function closeMenu() {
  const menu = document.getElementById("mainMenu");
  if (menu) menu.classList.remove("show");
}

// Display safe, readable messages inside the forms.
function showMessage(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`;
}

// Do not claim that authentication works before Supabase is configured.
function databaseNotReady(messageElementId) {
  showMessage(
    messageElementId,
    "The secure account system is not connected yet. Please wait while SCF completes setup.",
    "info"
  );
}

// Signup form checks.
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const country = document.getElementById("country").value;
    const education = document.getElementById("education").value;
    const password = document.getElementById("password").value;
    const confirmPassword =
      document.getElementById("confirmPassword").value;
    const agreed = document.getElementById("agreeTerms").checked;

    if (!fullName || !phone || !email || !whatsapp || !country || !education) {
      showMessage(
        "signupMessage",
        "Please complete all required fields.",
        "error"
      );
      return;
    }

    if (password.length < 8) {
      showMessage(
        "signupMessage",
        "Your password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage(
        "signupMessage",
        "The passwords do not match. Please check them.",
        "error"
      );
      return;
    }

    if (!agreed) {
      showMessage(
        "signupMessage",
        "Please agree to the SCF platform rules before continuing.",
        "error"
      );
      return;
    }

    if (!SCF_CONFIG.supabaseConnected) {
      databaseNotReady("signupMessage");
      return;
    }

    // Real Supabase signup will be added after configuration.
  });
}

// Login form checks.
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showMessage(
        "loginMessage",
        "Enter your email address and password.",
        "error"
      );
      return;
    }

    if (!SCF_CONFIG.supabaseConnected) {
      databaseNotReady("loginMessage");
      return;
    }

    // Real Supabase login and approval checks will be added next.
  });
}

// Placeholder only: this does not approve accounts or verify payments.
function checkAccountStatus() {
  const message = document.getElementById("waitingMessage");
  if (!message) return;

  if (!SCF_CONFIG.supabaseConnected) {
    showMessage(
      "waitingMessage",
      "Account-status checking will work after the secure database is connected.",
      "info"
    );
  }
}

// Clear local form fields and return to the home page.
// Supabase sign-out will be added when authentication is connected.
function logout() {
  const signup = document.getElementById("signupForm");
  const login = document.getElementById("loginForm");

  if (signup) signup.reset();
  if (login) login.reset();

  showPage("home");
}

// Close the mobile menu when tapping outside it.
document.addEventListener("click", function (event) {
  const menu = document.getElementById("mainMenu");
  const toggle = document.querySelector(".menu-toggle");

  if (
    menu &&
    toggle &&
    !menu.contains(event.target) &&
    !toggle.contains(event.target)
  ) {
    closeMenu();
  }
});

// Initial page.
document.addEventListener("DOMContentLoaded", function () {
  showPage("home");
});
