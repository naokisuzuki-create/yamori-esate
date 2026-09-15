const CONTACT_ENDPOINT = "https://script.google.com/macros/s/AKfycbx_jhrORToigZakIlBxbKX7EuBJOtBL2MDBXNmh5DapORvBSt7kZQK0QtxjswqjBdH9/exec";

function setupSecureContactForm(){
  const form = document.getElementById("contactFormSecure");
  if(!form) return;

  const startedAt = document.getElementById("contactStartedAt");
  const submitButton = document.getElementById("contactSubmit");
  const status = document.getElementById("contactStatus");

  const resetStartedAt = () => {
    if(startedAt) startedAt.value = String(Date.now());
  };

  const setStatus = (message, type = "") => {
    if(!status) return;
    status.textContent = message;
    status.className = `form-status${type ? ` ${type}` : ""}`;
  };

  const resetTurnstile = () => {
    if(window.turnstile && typeof window.turnstile.reset === "function"){
      try{
        window.turnstile.reset();
      }catch(e){
        console.warn("Turnstile reset failed.", e);
      }
    }
  };

  resetStartedAt();

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const turnstileToken = String(formData.get("cf-turnstile-response") || "").trim();

    if(!turnstileToken){
      setStatus("スパム対策の確認が完了していません。少し待ってからもう一度お試しください。", "error");
      return;
    }

    const payload = {
      action: "contact",
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      type: String(formData.get("type") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      started_at: Number(formData.get("started_at") || 0),
      turnstile_token: turnstileToken
    };

    if(submitButton){
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.textContent = "送信中…";
    }
    setStatus("送信しています…", "sending");

    try{
      const response = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: JSON.stringify(payload)
      });

      if(!response.ok){
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if(!result || result.ok !== true){
        const message = result && result.error ? String(result.error) : "送信に失敗しました。";
        throw new Error(message);
      }

      form.reset();
      resetStartedAt();
      resetTurnstile();
      setStatus("お問い合わせを送信しました。ありがとうございます。", "success");
    }catch(error){
      console.error("Contact submit failed.", error);
      resetTurnstile();
      resetStartedAt();
      setStatus("送信できませんでした。時間をおいて、もう一度お試しください。", "error");
    }finally{
      if(submitButton){
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || "✉ 送信する";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", setupSecureContactForm);
