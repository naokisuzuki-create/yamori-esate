const CONTACT_ENDPOINT = "https://script.google.com/macros/s/AKfycbx_jhrORToigZakIlBxbKX7EuBJOtBL2MDBXNmh5DapORvBSt7kZQK0QtxjswqjBdH9/exec";
const CONTACT_FRAME_NAME = "yamoriContactFrame";

function setupSecureContactForm(){
  const form = document.getElementById("contactFormSecure");
  if(!form) return;

  const startedAt = document.getElementById("contactStartedAt");
  const submitButton = document.getElementById("contactSubmit");
  const status = document.getElementById("contactStatus");

  let iframe = document.querySelector(`iframe[name="${CONTACT_FRAME_NAME}"]`);
  if(!iframe){
    iframe = document.createElement("iframe");
    iframe.name = CONTACT_FRAME_NAME;
    iframe.title = "お問い合わせ送信結果";
    iframe.hidden = true;
    document.body.appendChild(iframe);
  }

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

  window.addEventListener("message", event => {
    const data = event.data;
    if(!data || data.type !== "yamori-contact-result") return;

    setSubmitting(false);
    resetTurnstile();
    resetStartedAt();

    if(data.ok === true){
      form.reset();
      resetStartedAt();
      setStatus("お問い合わせを送信しました。ありがとうございます。", "success");
      return;
    }

    setStatus(data.message || "送信できませんでした。時間をおいて、もう一度お試しください。", "error");
  });

  form.addEventListener("submit", event => {
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

    const postForm = document.createElement("form");
    postForm.method = "POST";
    postForm.action = CONTACT_ENDPOINT;
    postForm.target = CONTACT_FRAME_NAME;
    postForm.style.display = "none";

    const fields = {
      action: "contact",
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      type: String(formData.get("type") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      started_at: String(formData.get("started_at") || ""),
      turnstile_token: turnstileToken
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      postForm.appendChild(input);
    });

    document.body.appendChild(postForm);
    setSubmitting(true);
    setStatus("送信しています…", "sending");
    postForm.submit();
    postForm.remove();
  });
}

document.addEventListener("DOMContentLoaded", setupSecureContactForm);
