/* SCF Africa Connect
   Existing navigation + Supabase authentication.
*/

const SCF_CONFIG = {
  supabaseConnected: true,
  supportEmail: "smartcoinlet@gmail.com",
  adminEmail: "smartcoinlet@gmail.com"
};

const scfSupabase = window.supabase.createClient(
  "https://nbbzcykapniknsomutgl.supabase.co",
  "YOUR_SUPABASE_PUBLISHABLE_KEY"
);

let currentUser = null;
let currentProfile = null;

function showPage(pageId) {
  const target = document.getElementById(pageId);
  if (!target) return;

  document.querySelectorAll(".page").forEach(page =>
    page.classList.remove("active")
  );
  target.classList.add("active");
  closeMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenu() {
  document.getElementById("mainMenu")?.classList.toggle("show");
}

function closeMenu() {
  document.getElementById("mainMenu")?.classList.remove("show");
}

function showMessage(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function setBusy(form, busy) {
  const button = form?.querySelector('button[type="submit"]');
  if (button) button.disabled = busy;
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  if (/already registered/i.test(message)) {
    return "This email already has an account. Please log in.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Please verify your email before logging in.";
  }
  return message;
}

async function loadMyProfile() {
  if (!currentUser) return null;

  const { data, error } = await scfSupabase
    .from("profiles")
    .select("id, full_name, email, referral_code, approval_status, role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Your profile is not ready. Contact SCF support.");

  currentProfile = data;
  return data;
}

async function routeSignedInUser() {
  try {
    const profile = await loadMyProfile();

    if (profile.role === "admin") {
      // No admin dashboard exists in the supplied HTML yet.
      showPage("waiting");
      showMessage(
        "waitingMessage",
        "Administrator account signed in. Use Supabase Table Editor to review member profiles and manage approvals.",
        "info"
      );
      return;
    }

    if (profile.approval_status === "approved") {
      // The supplied HTML has no dashboard page yet.
      showPage("activation");
      return;
    }

    if (profile.approval_status === "rejected") {
      showPage("waiting");
      showMessage(
        "waitingMessage",
        "Your account was not approved. Please contact smartcoinlet@gmail.com.",
        "error"
      );
      return;
    }

    showPage("waiting");
    showMessage(
      "waitingMessage",
      "Your account is awaiting administrator approval.",
      "info"
    );
  } catch (error) {
    showPage("waiting");
    showMessage("waitingMessage", friendlyError(error), "error");
  }
}

// Registration
const signupForm = document.getElementById("signupForm");

signupForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const country = document.getElementById("country").value;
  const education = document.getElementById("education").value;
  const referralCode = document.getElementById("referralCode").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!fullName || !phone || !email || !whatsapp || !country || !education) {
    showMessage("signupMessage", "Please complete all required fields.", "error");
    return;
  }

  if (password.length < 8) {
    showMessage("signupMessage", "Password must contain at least 8 characters.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("signupMessage", "The passwords do not match.", "error");
    return;
  }

  if (!document.getElementById("agreeTerms").checked) {
    showMessage("signupMessage", "Please agree to the SCF platform rules.", "error");
    return;
  }

  setBusy(signupForm, true);

  try {
    const { data, error } = await scfSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          whatsapp,
          country,
          education,
          referral_code: referralCode
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      currentUser = data.user;
      await routeSignedInUser();
      showMessage("signupMessage", "Registration successful.", "success");
    } else {
      showMessage(
        "signupMessage",
        "Registration received. Check your email for a verification link. After verification, log in to check your approval status.",
        "success"
      );
    }
  } catch (error) {
    showMessage("signupMessage", friendlyError(error), "error");
  } finally {
    setBusy(signupForm, false);
  }
});

// Login
const loginForm = document.getElementById("loginForm");

loginForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showMessage("loginMessage", "Enter your email and password.", "error");
    return;
  }

  setBusy(loginForm, true);

  try {
    const { data, error } = await scfSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;
    await routeSignedInUser();
  } catch (error) {
    showMessage("loginMessage", friendlyError(error), "error");
  } finally {
    setBusy(loginForm, false);
  }
});

// Refresh approval status from the database.
async function checkAccountStatus() {
  const { data } = await scfSupabase.auth.getSession();
  currentUser = data.session?.user || null;

  if (!currentUser) {
    showMessage("waitingMessage", "Please log in to check your account status.", "info");
    return;
  }

  await routeSignedInUser();
}

// Real sign-out
async function logout() {
  const { error } = await scfSupabase.auth.signOut();

  if (error) {
    showMessage("waitingMessage", friendlyError(error), "error");
    return;
  }

  currentUser = null;
  currentProfile = null;
  signupForm?.reset();
  loginForm?.reset();
  showPage("home");
}

document.addEventListener("click", event => {
  const menu = document.getElementById("mainMenu");
  const toggle = document.querySelector(".menu-toggle");

  if (menu && toggle && !menu.contains(event.target) &&
      !toggle.contains(event.target)) {
    closeMenu();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await scfSupabase.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    await routeSignedInUser();
  } else {
    showPage("home");
  }
});

scfSupabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
});
