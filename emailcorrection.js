
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://hbudhkyftxdqlwcdyotq.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_xrX2qILCdLyF7fmrlqMGpA_Pv6D7xYG";

const TARGET_USER_ID = 15;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showEmailCorrection() {
  if (document.getElementById("emailCorrectionScreen")) return;

  const overlay = document.createElement("div");
  overlay.id = "emailCorrectionScreen";

  overlay.innerHTML = `
    <form id="emailCorrectionForm">
      <h2>Email Correction Required</h2>
      <p>Your registered email address is invalid.
      Enter a valid email address to continue.</p>

      <label for="correctedEmail">Email address</label>
      <input
        id="correctedEmail"
        type="email"
        placeholder="you@example.com"
        required
      >

      <p id="emailCorrectionError" role="alert"></p>

      <button type="submit">Save Email & Continue</button>
    </form>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const form = document.getElementById("emailCorrectionForm");
  const input = document.getElementById("correctedEmail");
  const errorBox = document.getElementById("emailCorrectionError");
  const button = form.querySelector("button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorBox.textContent = "";
    const email = input.value.trim().toLowerCase();

    if (!isValidEmail(email)) {
      errorBox.textContent = "Please enter a valid email address.";
      return;
    }

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const { data, error } = await supabase
        .from("users")
        .update({ email: email })
        .eq("id", TARGET_USER_ID)
        .select("id,email");

      if (error) throw error;

      if (!data || data.length !== 1) {
        throw new Error(
          "Email was not updated. Check Supabase permissions and RLS."
        );
      }

      overlay.remove();
      document.body.style.overflow = "";
      window.location.reload();

    } catch (error) {
      errorBox.textContent =
        error.message || "Could not save email. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Save Email & Continue";
    }
  });
}

async function checkEmailCorrection() {
  if (localStorage.getItem("loggedIn") !== "true") return;

  // Your login code must set userId after identifying the logged-in user.
  const userId = Number(localStorage.getItem("userId"));

  if (userId !== TARGET_USER_ID) return;

  const { data, error } = await supabase
    .from("users")
    .select("id,email")
    .eq("id", TARGET_USER_ID)
    .maybeSingle();

  if (error) {
    console.error("Email check failed:", error);
    return;
  }

  if (data && !isValidEmail(data.email || "")) {
    showEmailCorrection();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkEmailCorrection);
} else {
  checkEmailCorrection();
}
