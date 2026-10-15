
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL =
  "https://hbudhkyftxdqlwcdyotq.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_xrX2qILCdLyF7fmrlqMGpA_Pv6D7xYG";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Check email format.
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Read the details saved by login.html.
function getLoginDetails() {
  return {
    loggedIn: localStorage.getItem("loggedIn") === "true",
    name: (localStorage.getItem("userName") || "").trim(),
    email: (localStorage.getItem("userEmail") || "").trim(),
    phone: (localStorage.getItem("userPhone") || "").trim()
  };
}

// Display a required email correction popup.
function showEmailCorrection(userRow) {
  if (document.getElementById("emailCorrectionScreen")) return;

  const overlay = document.createElement("div");
  overlay.id = "emailCorrectionScreen";

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "999999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "rgba(3, 7, 18, 0.94)",
    backdropFilter: "blur(14px)"
  });

  overlay.innerHTML = `
    <form id="emailCorrectionForm" style="
      width:100%;
      max-width:420px;
      box-sizing:border-box;
      padding:30px;
      border-radius:24px;
      background:#0b1224;
      border:1px solid rgba(0,255,255,.3);
      box-shadow:0 0 40px rgba(0,255,255,.12);
      color:#f8fafc;
      font-family:Inter,Arial,sans-serif;
    ">
      <div style="text-align:center;font-size:36px;margin-bottom:12px">
        ✉️
      </div>

      <h2 style="
        margin:0 0 12px;
        color:#00ffff;
        text-align:center;
        font-size:25px;
      ">
        Email Correction Required
      </h2>

      <p style="
        color:#cbd5e1;
        line-height:1.6;
        margin-bottom:22px;
        text-align:center;
      ">
        Please enter a valid email address to continue to your dashboard.
      </p>

      <label for="correctedEmail" style="
        display:block;
        margin-bottom:8px;
        color:#e2e8f0;
      ">
        Email Address
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
          font-size:15px;
        "
      >

      <p id="emailCorrectionError"
         role="alert"
         aria-live="polite"
         style="
           color:#fca5a5;
           min-height:20px;
           font-size:13px;
           margin:0 0 12px;
         ">
      </p>

      <button type="submit" style="
        width:100%;
        padding:15px;
        border:0;
        border-radius:12px;
        cursor:pointer;
        color:#06111c;
        font-size:15px;
        font-weight:700;
        background:linear-gradient(135deg,#00ffff,#8b5cf6);
      ">
        SAVE EMAIL & CONTINUE
      </button>

      <p style="
        margin:16px 0 0;
        text-align:center;
        color:#64748b;
        font-size:12px;
      ">
        Your dashboard will continue after the email is saved.
      </p>
    </form>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  // Do not close the popup when the background is clicked.
  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      event.preventDefault();
    }
  });

  const form = document.getElementById("emailCorrectionForm");
  const input = document.getElementById("correctedEmail");
  const errorBox = document.getElementById("emailCorrectionError");
  const button = form.querySelector("button");

  input.value = userRow.email || "";

  form.addEventListener("submit", async event => {
    event.preventDefault();

    errorBox.textContent = "";

    const email = input.value.trim().toLowerCase();

    if (!isValidEmail(email)) {
      errorBox.textContent =
        "Please enter a correctly formatted email address.";
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "SAVING EMAIL...";

    try {
      const { data, error } = await supabase
        .from("users")
        .update({ email })
        .eq("id", userRow.id)
        .select("id,email")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Email was not updated. Check your Supabase permissions and RLS policies."
        );
      }

      // Update the saved browser details.
      localStorage.setItem("userEmail", data.email);

      // Close only after the database confirms the update.
      overlay.remove();
      document.body.style.overflow = "";

      window.location.reload();

    } catch (error) {
      console.error("Email update failed:", error);

      errorBox.textContent =
        error.message || "Could not save your email. Please try again.";

    } finally {
      button.disabled = false;
      button.textContent = "SAVE EMAIL & CONTINUE";
    }
  });

  input.focus();
}

// Find the database record created by login.html.
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

    // Do not risk updating the wrong record if duplicates exist.
    if (!data || data.length !== 1) {
      console.warn(
        "Email correction skipped: no unique matching user record was found."
      );
      return;
    }

    const userRow = data[0];

    // Show the popup only when the stored email is invalid.
    if (!isValidEmail(userRow.email || "")) {
      showEmailCorrection(userRow);
    }

  } catch (error) {
    console.error("Email correction check failed:", error);
  }
}

// Run after the page is ready.
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    checkEmailCorrection
  );
} else {
  checkEmailCorrection();
}
