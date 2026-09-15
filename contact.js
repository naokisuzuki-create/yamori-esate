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

  const setSubmitting = submitting => {
    if(!submitButton) return;

    if(submitting){
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.textContent = "送信中…";
    }else{
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.originalText || "✉ 送信する";
    }
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

    setSubmitting(true);
    setStatus("送信しています…", "sending");

    try{
      await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        cache: "no-store",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: JSON.stringify(payload)
      });

      form.reset();
      resetStartedAt();
      resetTurnstile();
      setStatus("お問い合わせを受け付けました。ありがとうございます。", "success");
    }catch(error){
      console.error("Contact submit failed.", error);
      resetTurnstile();
      resetStartedAt();
      setStatus("送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。", "error");
    }finally{
      setSubmitting(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", setupSecureContactForm);
