import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL =
  "https://hbudhkyftxdqlwcdyotq.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_xrX2qILCdLyF7fmrlqMGpA_Pv6D7xYG";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Validate email format.
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    (email || "").trim()
  );
}

// Get details saved by login.html.
function getLoginDetails() {
  return {
    loggedIn:
      localStorage.getItem("loggedIn") === "true",
    name:
      (localStorage.getItem("userName") || "").trim(),
    email:
      (localStorage.getItem("userEmail") || "")
        .trim()
        .toLowerCase(),
    phone:
      (localStorage.getItem("userPhone") || "").trim()
  };
}

// Show the required email correction popup.
function showEmailCorrection(userRow) {
  if (document.getElementById("emailCorrectionScreen")) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "emailCorrectionScreen";

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px",
    background: "rgba(3, 7, 18, 0.96)",
    backdropFilter: "blur(14px)"
  });

  overlay.innerHTML = `
    <form id="emailCorrectionForm" style="
      width:100%;
      max-width:420px;
      box-sizing:border-box;
      padding:28px;
      border-radius:22px;
      background:#0b1224;
      border:1px solid rgba(0,255,255,.35);
      box-shadow:0 0 40px rgba(0,255,255,.15);
      color:#f8fafc;
      font-family:Inter,Arial,sans-serif;
    ">

      <div style="
        text-align:center;
        font-size:38px;
        margin-bottom:12px;
      ">✉️</div>

      <h2 style="
        margin:0 0 12px;
        color:#00ffff;
        text-align:center;
        font-size:24px;
      ">
        Correct Your Email
      </h2>

      <p style="
        color:#cbd5e1;
        line-height:1.6;
        margin:0 0 22px;
        text-align:center;
      ">
        The email address you entered is invalid.
        Please enter your correct email address
        to continue to your dashboard.
      </p>

      <label for="correctedEmail" style="
        display:block;
        margin-bottom:8px;
        color:#e2e8f0;
      ">
        Correct Email Address
      </label>

      <input
        id="correctedEmail"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        required
        style="
          width:100%;
          box-sizing:border-box;
          padding:14px;
          border-radius:12px;
          border:1px solid #334155;
          background:#111c31;
          color:white;
          outline:none;
          margin-bottom:12px;
          font-size:16px;
        "
      >

      <p
        id="emailCorrectionError"
        role="alert"
        aria-live="polite"
        style="
          color:#fca5a5;
          min-height:20px;
          font-size:13px;
          margin:0 0 12px;
          overflow-wrap:anywhere;
        "
      ></p>

      <button type="submit" style="
        width:100%;
        padding:15px;
        border:0;
        border-radius:12px;
        cursor:pointer;
        color:#06111c;
        font-size:15px;
        font-weight:700;
        background:linear-gradient(
          135deg,#00ffff,#8b5cf6
        );
      ">
        SAVE EMAIL & CONTINUE
      </button>

      <p style="
        margin:16px 0 0;
        text-align:center;
        color:#94a3b8;
        font-size:12px;
        line-height:1.5;
      ">
        Your email will be saved before the dashboard opens.
      </p>

    </form>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const form =
    document.getElementById("emailCorrectionForm");

  const input =
    document.getElementById("correctedEmail");

  const errorBox =
    document.getElementById("emailCorrectionError");

  const button = form.querySelector("button");

  // Show the currently stored email for correction.
  input.value = userRow.email || "";

  // Prevent dismissing the required popup by clicking outside.
  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      event.preventDefault();
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    errorBox.textContent = "";

    const email = input.value.trim().toLowerCase();

    // Reject an invalid email.
    if (!isValidEmail(email)) {
      errorBox.textContent =
        "Please enter a valid email, such as name@example.com.";

      input.focus();
      return;
    }

    // Don't save if the email has not actually changed.
    if (
      email ===
      (userRow.email || "").trim().toLowerCase()
    ) {
      errorBox.textContent =
        "Please enter your corrected email address.";

      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "SAVING EMAIL...";

    try {
      // Update only the matched database record.
      const { data, error } = await supabase
        .from("users")
        .update({ email: email })
        .eq("id", userRow.id)
        .select("id,email")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "The email was not updated. Check your Supabase permissions and RLS policies."
        );
      }

      // Update browser details after database confirmation.
      localStorage.setItem("userEmail", data.email);

      errorBox.style.color = "#86efac";
      errorBox.textContent =
        "Email saved successfully. Opening dashboard...";

      // Remove popup only after the update succeeds.
      overlay.remove();
      document.body.style.overflow = "";

      window.location.reload();

    } catch (error) {
      console.error("Email update failed:", error);

      errorBox.textContent =
        error.message ||
        "Unable to save the email. Please try again.";

    } finally {
      if (document.body.contains(form)) {
        button.disabled = false;
        button.textContent = "SAVE EMAIL & CONTINUE";
      }
    }
  });

  input.focus();
}

// Find the database record belonging to this login.
async function checkEmailCorrection() {
  const login = getLoginDetails();

  if (
    !login.loggedIn ||
    !login.name ||
    !login.email ||
    !login.phone
  ) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,phone")
      .eq("name", login.name)
      .eq("email", login.email)
      .eq("phone", login.phone)
      .limit(2);

    if (error) {
      throw error;
    }

    // Never guess which record to update.
    if (!data || data.length !== 1) {
      console.warn(
        "Email correction: no unique matching user found.",
        data
      );
      return;
    }

    const userRow = data[0];

    // Show popup only if the saved email is invalid.
    if (!isValidEmail(userRow.email)) {
      showEmailCorrection(userRow);
    }

  } catch (error) {
    console.error(
      "Email correction check failed:",
      error
    );
  }
}

// Run after the dashboard page loads.
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    checkEmailCorrection
  );
} else {
  checkEmailCorrection();
}