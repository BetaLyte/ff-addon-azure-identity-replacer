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

  // 1. Common Azure/Intune header elements
  // Often the email is in the title attribute of the avatar or username
  const potentialElements = document.querySelectorAll(
    '.fxs-avatarmenu-username, .fxs-user-name, .fxs-avatarmenu-tenant-image, .fxs-user-image, .ms-Persona-secondaryText, [title*="@"]'
  );

  for (const el of potentialElements) {
    if (el.textContent.includes(config.targetEmail) || el.title.includes(config.targetEmail)) {
      return true;
    }
  }

  // 2. Check page title (sometimes contains user info, though rare)

  // 3. Deep search in specific containers if needed (e.g. the MeControl)
  // This is a bit expensive so we rely on specific selectors first.

  // If we can't find the email, we might be in a state where it's not loaded yet.
  // But we should be conservative: if we don't see the email, don't replace.
  return false;
}

function replaceIdentity() {
  if (!isTargetUser()) {
    // log("Target user not found, skipping replacement."); // Too noisy for repeated calls
    return;
  }

  // Azure Portal & Intune often share similar structures but can vary.
  // Common selectors for the user menu button in the top right.

  // Strategy 1: Look for the specific button structure in Azure/Intune
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
      // Simple heuristic: if it looks like a name or email, replace it.
      // This is risky, might replace too much. Let's be more specific if possible.
      // For now, let's just target the top bar if we can find it.
      // But only if we are sure it's not the target email we are replacing (though we checked isTargetUser globally)
      // Actually, we want to replace the NAME, not the email.
      // If this element is the email, maybe we leave it or replace it with a fake email?
      // Let's stick to replacing the Name if it matches the pattern of a name.
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
