// Configuration
let config = {
  displayName: "Demo User",
  targetEmail: "real-user@onmicrosoft.com",
  replacementTenant: "Demo Tenant",
  iconDataUrl: browser.runtime.getURL("icons/logo.png")
};

function log(msg) {
  console.log(`[Azure Identity Replacer] ${msg}`);
}

function loadSettings() {
  return browser.storage.local.get({
    displayName: "Demo User",
    targetEmail: "real-user@onmicrosoft.com",
    replacementTenant: "Demo Tenant",
    iconDataUrl: "" // Empty means use default or don't replace if we want strictness, but let's fallback
  }).then(result => {
    config.displayName = result.displayName;
    config.targetEmail = result.targetEmail;
    config.replacementTenant = result.replacementTenant;
    if (result.iconDataUrl) {
      config.iconDataUrl = result.iconDataUrl;
    }
    log("Settings loaded");
    replaceIdentity(); // Trigger replacement after settings load
  });
}

// Listen for changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.displayName) config.displayName = changes.displayName.newValue;
    if (changes.targetEmail) config.targetEmail = changes.targetEmail.newValue;
    if (changes.replacementTenant) config.replacementTenant = changes.replacementTenant.newValue;
    if (changes.iconDataUrl) config.iconDataUrl = changes.iconDataUrl.newValue;
    log("Settings updated via storage change");
    replaceIdentity();
  }
});

function isTargetUser() {
  // Check various places where the email might appear
  const potentialElements = document.querySelectorAll(
    '.fxs-avatarmenu-username, .fxs-user-name, .fxs-avatarmenu-tenant-image, .fxs-user-image, .ms-Persona-secondaryText, [title*="@"]'
  );

  for (const el of potentialElements) {
    if (el.textContent.includes(config.targetEmail) || el.title.includes(config.targetEmail)) {
      return true;
    }
  }
  return false;
}

function replaceIdentity() {
  if (!isTargetUser()) {
    // log("Target user not found, skipping replacement."); // Too noisy for repeated calls
    return;
  }

  // Azure Portal & Intune often share similar structures but can vary.
  // Common selectors for the user menu button in the top right.
  // The user button usually has a class like 'fxs-avatarmenu-username' or is inside a button with specific aria-labels.

  // Azure Portal / Intune (React-based)
  // Text
  const paramElements = document.querySelectorAll('.fxs-avatarmenu-username, .fxs-user-name, [data-test-id="user-name"]');
  paramElements.forEach(el => {
    if (el.textContent !== config.displayName) {
      el.textContent = config.displayName;
      log("Replaced username text");
    }
  });

  // Tenant
  const tenantElements = document.querySelectorAll('.fxs-avatarmenu-tenant');
  tenantElements.forEach(el => {
    if (el.textContent !== config.replacementTenant) {
      el.textContent = config.replacementTenant;
      log("Replaced tenant name");
    }
  });


  // Images
  // The user avatar is often an <img> or a <div> with background-image
  const imgElements = document.querySelectorAll('.fxs-avatarmenu-tenant-image, .fxs-user-image, .fxs-avatar-image');
  imgElements.forEach(el => {
    if (el.tagName === 'IMG' && el.src !== config.iconDataUrl) {
      el.src = config.iconDataUrl;
      // Remove srcset to prevent browser from switching back
      el.removeAttribute('srcset');
      log("Replaced avatar image src");
    }
  });

  // Fallback/Generic for Microsoft headers (MeControl)
  // Sometimes it's in an iframe or shadow DOM, but often accessible.
  // Look for elements with the user's email or name.

  // Specific for new Intune/Admin center which might use Fluent UI
  const fluentPersonaTexts = document.querySelectorAll('.ms-Persona-primaryText, .ms-Persona-secondaryText');
  fluentPersonaTexts.forEach(el => {
    if (el.textContent && el.textContent.includes('@') || el.textContent.includes(' ')) {
      // TODO: Consider simple heuristic, if it looks like a name or email, replace it.
    }
  });
}

// Initialize
loadSettings().then(() => {
  // Observe for changes (SPA navigation, lazy loading)
  const observer = new MutationObserver((mutations) => {
    replaceIdentity();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  log("Extension loaded and observer started");
});
