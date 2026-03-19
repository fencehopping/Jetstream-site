const form = document.querySelector("#waitlist");
const status = document.querySelector("#form-status");
const submitButton = form?.querySelector(".submit-button");

if (form && status && submitButton) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const company = String(formData.get("company") || "").trim();

    status.textContent = "";
    form.classList.remove("is-error");

    if (!email) {
      form.classList.add("is-error");
      status.textContent = "Enter an email address to join the waitlist.";
      return;
    }

    if (company) {
      status.textContent = "Thanks. You're on the list.";
      form.reset();
      return;
    }

    form.classList.add("is-loading");
    submitButton.textContent = "Joining...";

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: "prelaunch-site",
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Something went wrong. Please try again.");
      }

      status.textContent =
        payload.message ||
        (payload.alreadySignedUp
          ? "You're already on the waitlist. We'll be in touch."
          : "You're on the waitlist. Check your inbox for confirmation.");
      form.reset();
    } catch (error) {
      form.classList.add("is-error");
      status.textContent = error.message || "Unable to join right now. Please try again.";
    } finally {
      form.classList.remove("is-loading");
      submitButton.textContent = "Join pre-launch";
    }
  });
}
