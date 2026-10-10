/* SCF Africa Connect
   Navigation, Supabase authentication and member approval.
*/

const SCF_CONFIG = {
  supportEmail: "smartcoinlet@gmail.com",
  adminEmail: "smartcoinlet@gmail.com",
  siteUrl: "https://smartcoinletfirm-commits.github.io/SCF-Africa-Connect/"
};

const scfSupabase = window.supabase.createClient(
  "https://nbbzcykapniknsomutgl.supabase.co",
  "sb_publishable_3iVzs0ELCMCX1molmhCxcA_qYgMKy9Y"
);

let currentUser = null;
let currentProfile = null;

function showPage(pageId) {
  const target = document.getElementById(pageId);
  if (!target) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

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
  const message =
    error?.message || "Something went wrong. Please try again.";

  if (/already registered/i.test(message)) {
    return "This email already has an account. Please log in.";
  }

  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Email confirmation is enabled in Supabase. Confirm your email or disable confirmation in Supabase Authentication settings.";
  }

  if (/row-level security|permission denied/i.test(message)) {
    return "Your profile could not be accessed. Please contact SCF support.";
  }

  return message;
}

// LOAD PROFILE
// Email is deliberately omitted because the profiles table
// does not currently have an email column.
async function loadMyProfile() {
  if (!currentUser) return null;

  const { data, error } = await scfSupabase
    .from("profiles")
    .select("id, full_name, referral_code, approval_status, role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Your profile record was not found. Check that Supabase creates a profiles row for new users."
    );
  }

  currentProfile = data;
  return data;
}

// ROUTE USERS AFTER LOGIN OR STATUS CHECK
async function routeSignedInUser() {
  try {
    const profile = await loadMyProfile();

    if (profile.role === "admin") {
      showPage("waiting");
      showMessage(
        "waitingMessage",
        "Administrator signed in. Member approvals are currently managed through Supabase Table Editor.",
        "info"
      );
      return;
    }

    if (profile.approval_status === "approved") {
      // Protected dashboard is not implemented yet.
      showPage("activation");
      showMessage(
        "waitingMessage",
        "Your account is approved. Member dashboard features are being prepared.",
        "success"
      );
      return;
    }

    if (profile.approval_status === "rejected") {
      showPage("waiting");
      showMessage(
        "waitingMessage",
        "Your account was not approved. Contact smartcoinlet@gmail.com for assistance.",
        "error"
      );
      return;
    }

    // Existing pending users see the activation/payment options
    // so they can review their available Payd links.
    showPage("activation");
  } catch (error) {
    console.error("SCF profile loading error:", error);
    showPage("waiting");
    showMessage("waitingMessage", friendlyError(error), "error");
  }
}

// REGISTRATION
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

  if (
    !fullName || !phone || !email || !whatsapp ||
    !country || !education
  ) {
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
        emailRedirectTo: SCF_CONFIG.siteUrl,
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

    if (!data.user) {
      throw new Error("Registration did not return a user. Please try again.");
    }

    currentUser = data.user;

    if (data.session) {
      // Successful signup: show the Payd activation buttons first.
      showPage("activation");
      showMessage(
        "signupMessage",
        "Registration successful. Choose your country and activation level.",
        "success"
      );
    } else {
      // Supabase email confirmation is enabled, so no session exists yet.
      showMessage(
        "signupMessage",
        "Your account was created, but Supabase requires email confirmation before login. Check your email to continue.",
        "info"
      );
    }
  } catch (error) {
    showMessage("signupMessage", friendlyError(error), "error");
  } finally {
    setBusy(signupForm, false);
  }
});

// LOGIN
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

// CHECK ACCOUNT STATUS
async function checkAccountStatus() {
  try {
    const { data, error } = await scfSupabase.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;

    if (!currentUser) {
      showPage("login");
      showMessage("loginMessage", "Please log in to check your account status.", "info");
      return;
    }

    await routeSignedInUser();
  } catch (error) {
    showPage("waiting");
    showMessage("waitingMessage", friendlyError(error), "error");
  }
}

// LOGOUT
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

// CLOSE MENU WHEN CLICKING OUTSIDE IT
document.addEventListener("click", event => {
  const menu = document.getElementById("mainMenu");
  const toggle = document.querySelector(".menu-toggle");

  if (
    menu && toggle &&
    !menu.contains(event.target) &&
    !toggle.contains(event.target)
  ) {
    closeMenu();
  }
});

// RESTORE EXISTING LOGIN SESSION
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { data, error } = await scfSupabase.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;

    if (currentUser) {
      await routeSignedInUser();
    } else {
      showPage("home");
    }
  } catch (error) {
    console.error("SCF session check failed:", error);
    showPage("home");
  }
});

// TRACK AUTHENTICATION CHANGES
scfSupabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
});
