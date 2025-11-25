function saveOptions(e) {
    e.preventDefault();

    const displayName = document.querySelector("#displayName").value;
    const targetEmail = document.querySelector("#targetEmail").value;
    const replacementTenant = document.querySelector("#replacementTenant").value;
    const iconPreview = document.querySelector("#icon-preview");

    // Get base64 image from preview (which is updated on file select)
    const iconDataUrl = iconPreview.src;

    browser.storage.local.set({
        displayName: displayName,
        targetEmail: targetEmail,
        replacementTenant: replacementTenant,
        iconDataUrl: iconDataUrl
    }).then(() => {
        const status = document.querySelector("#status");
        status.style.display = "block";
        setTimeout(() => {
            status.style.display = "none";
        }, 2000);
    });
}

function restoreOptions() {
    browser.storage.local.get({
        displayName: "Demo User",
        targetEmail: "real-user@onmicrosoft.com",
        replacementTenant: "Demo Tenant",
        iconDataUrl: "icons/logo.png" // Default fallback
    }).then((result) => {
        document.querySelector("#displayName").value = result.displayName;
        document.querySelector("#targetEmail").value = result.targetEmail;
        document.querySelector("#replacementTenant").value = result.replacementTenant;
        document.querySelector("#icon-preview").src = result.iconDataUrl;
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        document.querySelector("#icon-preview").src = event.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("#iconFile").addEventListener("change", handleFileSelect);
