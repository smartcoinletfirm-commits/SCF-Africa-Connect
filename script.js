/* SCF Africa Connect
   Navigation, Supabase authentication,
   email verification and member approval.
*/

const SCF_CONFIG = {
  supabaseConnected: true,
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
  const message =
    error?.message || "Something went wrong. Please try again.";

  if (/already registered/i.test(message)) {
    return "This email already has an account. Please log in.";
  }

  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Please verify your email before logging in.";
  }

  if (/row-level security|permission denied/i.test(message)) {
    return "Your account could not access its profile. Please contact SCF support.";
  }

  return message;
}

async function loadMyProfile() {
  if (!currentUser) return null;

  const { data, error } = await scfSupabase
    .from("profiles")
    .select(
      "id, full_name, email, referral_code, approval_status, role"
    )
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Your profile is not ready. Contact smartcoinlet@gmail.com."
    );
  }

  currentProfile = data;
  return data;
}

async function routeSignedInUser() {
  try {
    const profile = await loadMyProfile();

    if (profile.role === "admin") {
      showPage("waiting");

      showMessage(
        "waitingMessage",
        "Administrator signed in. Manage member approvals in Supabase Table Editor. The website admin dashboard has not yet been built.",
        "info"
      );

      return;
    }

    if (profile.approval_status === "approved") {
      // Replace with the dashboard page when it is implemented.
      showPage("activation");
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

    showPage("waiting");

    showMessage(
      "waitingMessage",
      "Your email is verified and your account is awaiting administrator approval.",
      "info"
    );
  } catch (error) {
    showPage("waiting");
    showMessage("waitingMessage", friendlyError(error), "error");
  }
}

// REGISTRATION
const signupForm = document.getElementById("signupForm");

signupForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const fullName =
    document.getElementById("fullName").value.trim();
  const phone =
    document.getElementById("phone").value.trim();
  const email =
    document.getElementById("email").value.trim().toLowerCase();
  const whatsapp =
    document.getElementById("whatsapp").value.trim();
  const country =
    document.getElementById("country").value;
  const education =
    document.getElementById("education").value;
  const referralCode =
    document.getElementById("referralCode").value.trim();
  const password =
    document.getElementById("password").value;
  const confirmPassword =
    document.getElementById("confirmPassword").value;

  if (
    !fullName ||
    !phone ||
    !email ||
    !whatsapp ||
    !country ||
    !education
  ) {
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
      "Password must contain at least 8 characters.",
      "error"
    );
    return;
  }

  if (password !== confirmPassword) {
    showMessage(
      "signupMessage",
      "The passwords do not match.",
      "error"
    );
    return;
  }

  if (!document.getElementById("agreeTerms").checked) {
    showMessage(
      "signupMessage",
      "Please agree to the SCF platform rules.",
      "error"
    );
    return;
  }

  setBusy(signupForm, true);

  try {
    const { data, error } = await scfSupabase.auth.signUp({
      email,
      password,
      options: {
        // Return the verification link to the published website.
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

    if (data.session && data.user) {
      currentUser = data.user;
      await routeSignedInUser();

      showMessage(
        "signupMessage",
        "Registration successful.",
        "success"
      );
    } else {
      showMessage(
        "signupMessage",
        "Registration received. Check your email for a verification link. After verifying, return to this website and log in to check your approval status.",
        "success"
      );
    }
  } catch (error) {
    showMessage(
      "signupMessage",
      friendlyError(error),
      "error"
    );
  } finally {
    setBusy(signupForm, false);
  }
});

// LOGIN
const loginForm = document.getElementById("loginForm");

loginForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const email =
    document.getElementById("loginEmail").value.trim().toLowerCase();
  const password =
    document.getElementById("loginPassword").value;

  if (!email || !password) {
    showMessage(
      "loginMessage",
      "Enter your email and password.",
      "error"
    );
    return;
  }

  setBusy(loginForm, true);

  try {
    const { data, error } =
      await scfSupabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    currentUser = data.user;
    await routeSignedInUser();
  } catch (error) {
    showMessage(
      "loginMessage",
      friendlyError(error),
      "error"
    );
  } finally {
    setBusy(loginForm, false);
  }
});

// CHECK MEMBER APPROVAL STATUS
async function checkAccountStatus() {
  try {
    const { data, error } =
      await scfSupabase.auth.getSession();

    if (error) throw error;

    currentUser = data.session?.user || null;

    if (!currentUser) {
      showMessage(
        "waitingMessage",
        "Please log in to check your account status.",
        "info"
      );

      showPage("login");
      return;
    }

    await routeSignedInUser();
  } catch (error) {
    showMessage(
      "waitingMessage",
      friendlyError(error),
      "error"
    );
  }
}

// LOGOUT
async function logout() {
  const { error } = await scfSupabase.auth.signOut();

  if (error) {
    showMessage(
      "waitingMessage",
      friendlyError(error),
      "error"
    );
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
    menu &&
    toggle &&
    !menu.contains(event.target) &&
    !toggle.contains(event.target)
  ) {
    closeMenu();
  }
});

// INITIAL PAGE AND EXISTING SESSION
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { data, error } =
      await scfSupabase.auth.getSession();

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

// KEEP TRACK OF AUTHENTICATION CHANGES
scfSupabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
});
