document.addEventListener('DOMContentLoaded', function () {

  // ─── 1. Smooth Scroll for Anchor Links ───────────────────────────────────────
  document.body.addEventListener('click', function (e) {
    const target = e.target.closest('a[href^="#"]');
    if (!target) return;

    const hash = target.getAttribute('href');
    if (!hash || hash === '#') return;

    const destination = document.querySelector(hash);
    if (!destination) return;

    e.preventDefault();

    const navbarEl = document.querySelector('.navbar, header, nav');
    const offset = navbarEl ? navbarEl.offsetHeight : 0;
    const top = destination.getBoundingClientRect().top + window.pageYOffset - offset;

    window.scrollTo({ top: top, behavior: 'smooth' });

    if (history.pushState) {
      history.pushState(null, null, hash);
    }
  });

  // ─── 2. Navbar Scroll Effect ─────────────────────────────────────────────────
  const navbar = document.querySelector('.navbar, header');

  if (navbar) {
    const SCROLL_THRESHOLD = 50;

    function handleNavbarScroll() {
      if (window.pageYOffset > SCROLL_THRESHOLD) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    let navbarTicking = false;
    window.addEventListener('scroll', function () {
      if (!navbarTicking) {
        window.requestAnimationFrame(function () {
          handleNavbarScroll();
          navbarTicking = false;
        });
        navbarTicking = true;
      }
    }, { passive: true });

    handleNavbarScroll();
  }

  // ─── 3. Contact Form Validation ──────────────────────────────────────────────
  const contactForm = document.querySelector('.contact-form');

  if (contactForm) {
    const validators = {
      required: function (value) {
        return value.trim() !== '';
      },
      email: function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
      },
      minLength: function (value, length) {
        return value.trim().length >= parseInt(length, 10);
      },
      phone: function (value) {
        return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(value.trim());
      }
    };

    function getErrorMessage(field, rule) {
      const label = field.labels && field.labels[0]
        ? field.labels[0].textContent.trim()
        : field.getAttribute('placeholder') || field.name || 'This field';

      const messages = {
        required: label + ' is required.',
        email: 'Please enter a valid email address.',
        minLength: label + ' must be at least ' + field.dataset.minLength + ' characters.',
        phone: 'Please enter a valid phone number.'
      };

      return messages[rule] || label + ' is invalid.';
    }

    function showError(field, message) {
      field.classList.add('field-error');
      field.classList.remove('field-success');
      field.setAttribute('aria-invalid', 'true');

      let errorEl = field.parentElement.querySelector('.form-error-message');
      if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'form-error-message';
        errorEl.setAttribute('role', 'alert');
        errorEl.setAttribute('aria-live', 'polite');
        field.parentElement.appendChild(errorEl);
      }
      errorEl.textContent = message;
    }

    function clearError(field) {
      field.classList.remove('field-error');
      field.classList.add('field-success');
      field.setAttribute('aria-invalid', 'false');

      const errorEl = field.parentElement.querySelector('.form-error-message');
      if (errorEl) {
        errorEl.textContent = '';
      }
    }

    function validateField(field) {
      const value = field.value;
      const type = field.type;
      const dataset = field.dataset;

      if (dataset.required !== undefined || field.required) {
        if (!validators.required(value)) {
          showError(field, getErrorMessage(field, 'required'));
          return false;
        }
      }

      if (value.trim() === '') {
        clearError(field);
        return true;
      }

      if (type === 'email' || dataset.validate === 'email') {
        if (!validators.email(value)) {
          showError(field, getErrorMessage(field, 'email'));
          return false;
        }
      }

      if (type === 'tel' || dataset.validate === 'phone') {
        if (!validators.phone(value)) {
          showError(field, getErrorMessage(field, 'phone'));
          return false;
        }
      }

      if (dataset.minLength) {
        if (!validators.minLength(value, dataset.minLength)) {
          showError(field, getErrorMessage(field, 'minLength'));
          return false;
        }
      }

      clearError(field);
      return true;
    }

    function getValidatableFields() {
      return Array.from(contactForm.querySelectorAll('input, textarea, select')).filter(function (field) {
        return field.type !== 'submit' && field.type !== 'button' && field.type !== 'reset' && field.type !== 'hidden';
      });
    }

    contactForm.addEventListener('blur', function (e) {
      const field = e.target;
      if (field.matches('input, textarea, select') && field.type !== 'submit') {
        validateField(field);
      }
    }, true);

    contactForm.addEventListener('input', function (e) {
      const field = e.target;
      if (field.classList.contains('field-error')) {
        validateField(field);
      }
    });

    contactForm.addEventListener('submit', function (e) {
      const fields = getValidatableFields();
      let isValid = true;
      let firstInvalidField = null;

      fields.forEach(function (field) {
        const fieldValid = validateField(field);
        if (!fieldValid) {
          isValid = false;
          if (!firstInvalidField) {
            firstInvalidField = field;
          }
        }
      });

      if (!isValid) {
        e.preventDefault();
        if (firstInvalidField) {
          firstInvalidField.focus();
          firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const submitBtn = contactForm.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';

        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }, 5000);
      }
    });
  }

  // ─── 4. Scroll Animations (Fade-in on Scroll) ────────────────────────────────
  const ANIMATION_CLASS = 'fade-in-visible';
  const OBSERVE_SELECTOR = '.fade-in, .animate-on-scroll, [data-animate]';
  const OBSERVER_THRESHOLD = 0.15;
  const OBSERVER_ROOT_MARGIN = '0px 0px -60px 0px';

  function initScrollAnimations() {
    const elements = document.querySelectorAll(OBSERVE_SELECTOR);
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.classList.add(ANIMATION_CLASS);
      });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset.delay || '0';

          setTimeout(function () {
            el.classList.add(ANIMATION_CLASS);
          }, parseInt(delay, 10));

          observer.unobserve(el);
        }
      });
    }, {
      threshold: OBSERVER_THRESHOLD,
      rootMargin: OBSERVER_ROOT_MARGIN
    });

    elements.forEach(function (el, index) {
      if (!el.dataset.delay) {
        const siblings = Array.from(el.parentElement.children).filter(function (child) {
          return child.matches(OBSERVE_SELECTOR);
        });
        const siblingIndex = siblings.indexOf(el);
        if (siblingIndex > 0) {
          el.dataset.delay = String(siblingIndex * 100);
        }
      }
      observer.observe(el);
    });
  }

  initScrollAnimations();

});
;
/* ==ZAPPY E-COMMERCE JS START== */
// E-commerce functionality
(function() {
  // Mark this document as an e-commerce site for cross-cutting helpers (e.g. multiLanguageService CSS).
  // This lets them avoid injecting non-ecommerce UI like the phone header button.
  try {
    document.documentElement.setAttribute('data-zappy-site-type', 'ecommerce');
  } catch (e) {}
  try {
    document.body && document.body.setAttribute('data-zappy-site-type', 'ecommerce');
  } catch (e) {}

  const websiteId = window.ZAPPY_WEBSITE_ID;
  const isCatalogMode = false; // true = catalog only (no cart), false = full e-commerce
  
  // Set up fixed header heights - NO GAP between header and catalog menu
  function setupFixedHeaders() {
    const announcementBar = document.querySelector('.zappy-announcement-bar');
    const catalogMenu = document.querySelector('.zappy-catalog-menu');
    const announcementBarHeight = announcementBar ? Math.ceil(announcementBar.getBoundingClientRect().height) : 0;
    
    const findPrimaryHeader = function() {
      // Prioritize nav elements over generic header to avoid matching content headers
      // (e.g., .lookbook-gallery-header which is inside a section, not the navbar)
      const candidates = [
        'nav#navbar',
        'nav.navbar',
        '.navbar:not(.zappy-catalog-menu)',
        'nav[class*="nav"]',
        'header.navbar',
        'header:not([class*="gallery"]):not([class*="hero"]):not([class*="section"])'
      ];
      for (const selector of candidates) {
        const el = document.querySelector(selector);
        if (!el) continue;
        if (el.classList && el.classList.contains('zappy-catalog-menu')) continue;
        if (el.id === 'zappy-catalog-menu') continue;
        if (el.classList && el.classList.contains('mobile-search-panel')) continue;
        // Skip content headers that are inside sections (not navigation)
        if (el.tagName === 'HEADER' && el.closest('section')) continue;
        // Skip headers with content-related classes
        if (el.classList && (
          el.classList.contains('lookbook-gallery-header') ||
          el.classList.contains('hero-header') ||
          el.classList.contains('section-header') ||
          el.classList.contains('page-header')
        )) continue;
        return el;
      }
      return null;
    };
    
    const header = findPrimaryHeader();
    
    if (header) {
      // Preserve header padding so height is accurate
      header.style.marginBottom = '0';
      
      // Ensure header is fixed and sits below announcement bar
      header.style.setProperty('position', 'fixed', 'important');
      header.style.setProperty('top', announcementBarHeight + 'px', 'important');
      header.style.setProperty('left', '0', 'important');
      header.style.setProperty('right', '0', 'important');
      header.style.setProperty('z-index', '100000', 'important');
      
      const headerHeight = Math.ceil(header.getBoundingClientRect().height || header.offsetHeight || 0);
      let totalHeight = announcementBarHeight + headerHeight;
      
      if (catalogMenu && catalogMenu.style.display !== 'none') {
        // Remove extra spacing from catalog menu
        catalogMenu.style.marginTop = '0';
        // Position exactly at header bottom - no gap
        const catalogTop = announcementBarHeight + headerHeight;
        catalogMenu.style.setProperty('top', catalogTop + 'px', 'important');
        const catalogHeight = Math.ceil(catalogMenu.getBoundingClientRect().height || catalogMenu.offsetHeight || 0);
        totalHeight = catalogTop + catalogHeight;
      }
      
      document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
      document.documentElement.style.setProperty('--total-header-height', totalHeight + 'px');
      document.body.style.setProperty('padding-top', totalHeight + 'px', 'important');

      // When the navbar is transparent, the hero must extend BEHIND the fixed
      // navbar+catalog so the dark hero image shows through — otherwise the
      // transparent navbar reveals the light body background (#bg-light).
      var navBgValue = getComputedStyle(document.documentElement).getPropertyValue('--nav-bg').trim();
      var isTransparentNav = !navBgValue || navBgValue === 'transparent';
      if (isTransparentNav) {
        var heroSection = document.querySelector('section[class*="hero"], [data-hero-type], main > section:first-child');
        if (heroSection) {
          heroSection.style.setProperty('margin-top', '-' + totalHeight + 'px', 'important');
          heroSection.style.setProperty('padding-top', totalHeight + 'px', 'important');
        }
      }
    } else if (announcementBarHeight > 0) {
      document.body.style.setProperty('padding-top', announcementBarHeight + 'px', 'important');
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFixedHeaders);
  } else {
    setupFixedHeaders();
  }
  window.addEventListener('resize', setupFixedHeaders);
  setTimeout(setupFixedHeaders, 50);
  setTimeout(setupFixedHeaders, 200);
  setTimeout(setupFixedHeaders, 500);
  const getApiBase = function() {
    const explicitBase = (window.ZAPPY_API_BASE || '').replace(/\/$/, '');
    const path = window.location ? window.location.pathname : '';
    if (path.indexOf('/preview') !== -1 || path.indexOf('/preview-fullscreen') !== -1) {
      return window.location.origin;
    }
    return explicitBase;
  };
  const buildApiUrl = function(path) {
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    const apiBase = getApiBase();
    return apiBase ? apiBase + path : path;
  };
  if (!websiteId) return;
  
  // Translations
  const t = {"products":"Products","ourProducts":"Our Products","featuredProducts":"Featured Products","noFeaturedProducts":"No featured products yet. Check out all our products!","featuredCategories":"Shop by Category","all":"All","featured":"Featured","new":"New","sale":"Sale","loadingProducts":"Loading products...","cart":"Cart","yourCart":"Your Cart","emptyCart":"Cart is empty","total":"Total","proceedToCheckout":"Proceed to Checkout","checkout":"Checkout","customerInfo":"Customer Info","fullName":"Full Name","email":"Email","phone":"Phone","shippingAddress":"Shipping Address","street":"Street Address","streetAndNumber":"Street and Number","apartment":"Apt, Floor, Unit","apartmentExt":"Apt, Floor, Building Code, Notes, Etc.","city":"City","zip":"ZIP Code","zipPostal":"Zip / Postal Code","countryRegion":"Country / Region","stateProvince":"State / Province","stateRequired":"Please select a state / province","saveAddressForNextTime":"Save this address for next time","shippingMethod":"Shipping Method","loadingShipping":"Loading shipping methods...","payment":"Payment","loadingPayment":"Loading payment options...","orderSummary":"Order Summary","subtotal":"Subtotal","vat":"VAT","vatIncluded":"VAT Included","shipping":"Shipping","discount":"Discount","totalToPay":"Total","placeOrder":"Place Order","login":"Login","customerLogin":"Customer Login","enterEmail":"Enter your email and we'll send you a login code","emailAddress":"Email Address","sendCode":"Send Code","enterCode":"Enter the code sent to your email","verificationCode":"Verification Code","verify":"Verify","returnPolicy":"Return Policy","addToCart":"Add to Cart","startingAt":"Starting at","addedToCart":"Product added to cart!","remove":"Remove","noProducts":"No products to display","errorLoading":"Error loading","days":"days","currency":"$","free":"FREE","freeAbove":"Free above","noShippingMethods":"No shipping options available","viewAllResults":"View all results","searchProducts":"Search products","productDetails":"Product Details","viewDetails":"View Details","inStock":"In Stock","outOfStock":"Out of Stock","pleaseSelect":"Please select","sku":"SKU","category":"Category","relatedProducts":"Related Products","frequentlyBoughtTogether":"Frequently bought together","frequentlyBoughtTogetherSubtitle":"Save time and get everything you need","bundleTotal":"Bundle total","addBundleToCart":"Add {count} items to cart","upsellFree":"Free","productNotFound":"Product not found","backToProducts":"Back to Products","home":"Home","quantity":"Quantity","unitLabels":{"piece":"pcs","kg":"kg","gram":"g","liter":"L","ml":"ml"},"perUnit":"/","couponCode":"Coupon Code","enterCouponCode":"Enter coupon code","applyCoupon":"Apply","removeCoupon":"Remove","couponApplied":"Coupon applied successfully!","invalidCoupon":"Invalid coupon code","couponExpired":"Coupon has expired","couponMinOrder":"Minimum order amount","alreadyHaveAccount":"Already have an account?","loginHere":"Login here","signInHere":"Sign in here","mobileNumber":"Mobile Number","loggedInAs":"Logged in as:","logout":"Logout","haveCouponCode":"I have a coupon code","agreeToTerms":"I agree to the","termsAndConditions":"Terms and Conditions","pleaseAcceptTerms":"Please accept the terms and conditions","nameRequired":"Please enter your full name","emailRequired":"Please enter your email address","emailInvalid":"Please enter a valid email address","phoneRequired":"Please enter your phone number","shippingRequired":"Please select a shipping method","streetRequired":"Please enter your street address","cityRequired":"Please enter your city","cartEmpty":"Your cart is empty","paymentNotConfigured":"Online payment not configured","orderSuccess":"Order Received!","thankYouOrder":"Thank you for your order","orderNumber":"Order Number","orderConfirmation":"A confirmation email has been sent to you","orderProcessing":"Your order is being processed. We'll notify you when it ships.","continueShopping":"Continue Shopping","next":"Next","contactInformation":"Contact Information","items":"Items","continueToHomePage":"Continue to Home Page","transactionDate":"Transaction Date","paymentMethod":"Payment Method","orderDetails":"Order Details","loadingOrder":"Loading order details...","orderNotFound":"Order not found","orderItems":"Order Items","paidAmount":"Amount Paid","myAccount":"My Account","accountWelcome":"Welcome","yourOrders":"Your Orders","noOrders":"No orders yet","orderDate":"Date","orderStatus":"Status","orderTotal":"Total","viewOrder":"View Order","statusPending":"Pending Payment","statusPaid":"Paid","statusProcessing":"Processing","statusShipped":"Shipped","statusDelivered":"Delivered","statusCancelled":"Cancelled","notLoggedIn":"Not Logged In","pleaseLogin":"Please login to view your account","personalDetails":"Personal Details","editProfile":"Edit Profile","name":"Name","saveChanges":"Save Changes","cancel":"Cancel","addresses":"Addresses","addAddress":"Add Address","editAddress":"Edit Address","deleteAddress":"Delete Address","setAsDefault":"Set as Default","defaultAddress":"Default Address","addressLabel":"Address Label","work":"Work","other":"Other","noAddresses":"No saved addresses","confirmDelete":"Are you sure you want to delete?","profileUpdated":"Profile updated successfully","addressSaved":"Address saved successfully","addressDeleted":"Address deleted","saving":"Saving...","saveToFavorites":"Save to Favorites","removeFromFavorites":"Remove from Favorites","shareProduct":"Share Product","linkCopied":"Link copied!","myFavorites":"My Favorites","noFavorites":"No favorites yet","addedToFavorites":"Added to favorites","removedFromFavorites":"Removed from favorites","loginToFavorite":"Log in to save favorites","browseFavorites":"Discover all our products","selectVariant":"Select option","variantUnavailable":"Unavailable","color":"Color","size":"Size","material":"Material","style":"Style","weight":"Weight","capacity":"Capacity","length":"Length","inquiryAbout":"Inquiry about","sendInquiry":"Send Inquiry","callNow":"Call Now","specifications":"Specifications","storeNote":"Additional Information","businessPhone":"[business_phone]","businessEmail":"[business_email]"};
  
  // Helper to get localized e-commerce UI text
  // Tries zappyI18n first for multilingual support, falls back to static t object
  function getEcomText(key, fallback) {
    if (typeof zappyI18n !== 'undefined' && typeof zappyI18n.t === 'function') {
      var translated = zappyI18n.t('ecom_' + key);
      if (translated && translated !== 'ecom_' + key) {
        return translated;
      }
    }
    return fallback;
  }
  
  
// Helper to strip HTML tags and convert rich text to plain text for card previews
function stripHtmlToText(html) {
  if (!html) return '';
  // Create a temporary element to parse HTML
  var temp = document.createElement('div');
  temp.innerHTML = html;
  // Replace block-level elements' closing tags with space to preserve word boundaries
  // This handles </p>, </div>, </li>, <br>, etc. from rich text editors
  temp.innerHTML = temp.innerHTML
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/li>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/h[1-6]>/gi, ' ');
  // Get text content (strips remaining HTML tags)
  var text = temp.textContent || temp.innerText || '';
  // Normalize whitespace (replace multiple spaces/newlines with single space)
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

  
  // RTL detection (based on HTML lang attribute or document direction)
  const htmlLang = document.documentElement.lang || '';
  const isRTL = ['he', 'ar', 'iw'].includes(htmlLang.toLowerCase().substring(0, 2)) || document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
  
  // Cart state
  let cart = JSON.parse(localStorage.getItem('zappy_cart_' + websiteId) || '[]');
  
  // VAT rate - fetched from store settings, with fallback to default
  let vatRate = 0.18; // Default fallback (Israel VAT rate as of January 2025)
  let productLayout = 'standard'; // Default product card layout
  let storeSettingsFetched = false;
  let sidebarFiltersConfig = {};
  let sortingConfig = {};
  let viewToggleEnabled = true;
  let currentSortKey = 'popularity';
  let currentViewMode = localStorage.getItem('zappy_view_mode_' + websiteId) || 'grid';
  let activeSidebarFilters = { categories: [], brands: [], tags: [], priceMin: null, priceMax: null, sale: false };
  let storeCountry = null;
  
  // Fetch store settings (including tax rate and product layout) from API
  async function fetchStoreSettings() {
    if (storeSettingsFetched) return;
    try {
      const res = await fetch(buildApiUrl('/api/ecommerce/storefront/settings?websiteId=' + websiteId));
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.taxRate && data.data.taxRate > 0) {
          vatRate = data.data.taxRate;
        }
        if (data.data.productLayout) {
          productLayout = data.data.productLayout;
        }
        if (data.data.sidebarFiltersConfig) {
          sidebarFiltersConfig = data.data.sidebarFiltersConfig;
        }
        if (data.data.sortingConfig) {
          sortingConfig = data.data.sortingConfig;
        }
        if (data.data.viewToggleEnabled != null) {
          viewToggleEnabled = data.data.viewToggleEnabled;
        }
        if (data.data.country) {
          storeCountry = data.data.country;
        }
        var catalogMenu = document.getElementById('zappy-catalog-menu');
        if (catalogMenu) {
          if (data.data.catalogMenuEnabled === true) {
            catalogMenu.style.removeProperty('display');
          } else {
            catalogMenu.style.setProperty('display', 'none', 'important');
          }
          if (typeof setupFixedHeaders === 'function') {
            setTimeout(setupFixedHeaders, 50);
          }
        }
        storeSettingsFetched = true;
      }
    } catch (e) {
      console.warn('Failed to fetch store settings, using defaults:', e);
    }
  }
  
  // Fetch settings on page load
  fetchStoreSettings();
  
  
  var ZAPPY_STATE_MAP = {"US":[["AL","Alabama"],["AK","Alaska"],["AS","American Samoa"],["AZ","Arizona"],["AR","Arkansas"],["UM-81","Baker Island"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["GU","Guam"],["HI","Hawaii"],["UM-84","Howland Island"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["UM-86","Jarvis Island"],["UM-67","Johnston Atoll"],["KS","Kansas"],["KY","Kentucky"],["UM-89","Kingman Reef"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["UM-71","Midway Atoll"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["UM-76","Navassa Island"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["MP","Northern Mariana Islands"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["UM-95","Palmyra Atoll"],["PA","Pennsylvania"],["PR","Puerto Rico"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UM","United States Minor Outlying Islands"],["VI","United States Virgin Islands"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["UM-79","Wake Island"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]],"CA":[["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],["NL","Newfoundland and Labrador"],["NT","Northwest Territories"],["NS","Nova Scotia"],["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],["SK","Saskatchewan"],["YT","Yukon"]],"AU":[["ACT","Australian Capital Territory"],["NSW","New South Wales"],["NT","Northern Territory"],["QLD","Queensland"],["SA","South Australia"],["TAS","Tasmania"],["VIC","Victoria"],["WA","Western Australia"]],"IN":[["AN","Andaman and Nicobar Islands"],["AP","Andhra Pradesh"],["AR","Arunachal Pradesh"],["AS","Assam"],["BR","Bihar"],["CH","Chandigarh"],["CT","Chhattisgarh"],["DH","Dadra and Nagar Haveli and Daman and Diu"],["DL","Delhi"],["GA","Goa"],["GJ","Gujarat"],["HR","Haryana"],["HP","Himachal Pradesh"],["JK","Jammu and Kashmir"],["JH","Jharkhand"],["KA","Karnataka"],["KL","Kerala"],["LA","Ladakh"],["LD","Lakshadweep"],["MP","Madhya Pradesh"],["MH","Maharashtra"],["MN","Manipur"],["ML","Meghalaya"],["MZ","Mizoram"],["NL","Nagaland"],["OR","Odisha"],["PY","Puducherry"],["PB","Punjab"],["RJ","Rajasthan"],["SK","Sikkim"],["TN","Tamil Nadu"],["TG","Telangana"],["TR","Tripura"],["UP","Uttar Pradesh"],["UT","Uttarakhand"],["WB","West Bengal"]],"BR":[["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],["PR","Paraná"],["PB","Paraíba"],["PA","Pará"],["PE","Pernambuco"],["PI","Piauí"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],["RJ","Rio de Janeiro"],["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SE","Sergipe"],["SP","São Paulo"],["TO","Tocantins"]],"MX":[["AGU","Aguascalientes"],["BCN","Baja California"],["BCS","Baja California Sur"],["CAM","Campeche"],["CHP","Chiapas"],["CHH","Chihuahua"],["CDMX","Ciudad de México"],["COA","Coahuila de Zaragoza"],["COL","Colima"],["DUR","Durango"],["MEX","Estado de México"],["GUA","Guanajuato"],["GRO","Guerrero"],["HID","Hidalgo"],["JAL","Jalisco"],["MIC","Michoacán de Ocampo"],["MOR","Morelos"],["NAY","Nayarit"],["NLE","Nuevo León"],["OAX","Oaxaca"],["PUE","Puebla"],["QUE","Querétaro"],["ROO","Quintana Roo"],["SLP","San Luis Potosí"],["SIN","Sinaloa"],["SON","Sonora"],["TAB","Tabasco"],["TAM","Tamaulipas"],["TLA","Tlaxcala"],["VER","Veracruz de Ignacio de la Llave"],["YUC","Yucatán"],["ZAC","Zacatecas"]],"CN":[["AH","Anhui"],["BJ","Beijing"],["CQ","Chongqing"],["FJ","Fujian"],["GS","Gansu"],["GD","Guangdong"],["GX","Guangxi Zhuang"],["GZ","Guizhou"],["HI","Hainan"],["HE","Hebei"],["HL","Heilongjiang"],["HA","Henan"],["HK","Hong Kong SAR"],["HB","Hubei"],["HN","Hunan"],["NM","Inner Mongolia"],["JS","Jiangsu"],["JX","Jiangxi"],["JL","Jilin"],["LN","Liaoning"],["MO","Macau SAR"],["NX","Ningxia Huizu"],["QH","Qinghai"],["SN","Shaanxi"],["SD","Shandong"],["SH","Shanghai"],["SX","Shanxi"],["SC","Sichuan"],["TW","Taiwan"],["TJ","Tianjin"],["XJ","Xinjiang"],["XZ","Xizang"],["YN","Yunnan"],["ZJ","Zhejiang"]],"JP":[["23","Aichi Prefecture"],["05","Akita Prefecture"],["02","Aomori Prefecture"],["12","Chiba Prefecture"],["38","Ehime Prefecture"],["18","Fukui Prefecture"],["40","Fukuoka Prefecture"],["07","Fukushima Prefecture"],["21","Gifu Prefecture"],["10","Gunma Prefecture"],["34","Hiroshima Prefecture"],["01","Hokkaidō Prefecture"],["28","Hyōgo Prefecture"],["08","Ibaraki Prefecture"],["17","Ishikawa Prefecture"],["03","Iwate Prefecture"],["37","Kagawa Prefecture"],["46","Kagoshima Prefecture"],["14","Kanagawa Prefecture"],["43","Kumamoto Prefecture"],["26","Kyōto Prefecture"],["39","Kōchi Prefecture"],["24","Mie Prefecture"],["04","Miyagi Prefecture"],["45","Miyazaki Prefecture"],["20","Nagano Prefecture"],["42","Nagasaki Prefecture"],["29","Nara Prefecture"],["15","Niigata Prefecture"],["33","Okayama Prefecture"],["47","Okinawa Prefecture"],["41","Saga Prefecture"],["11","Saitama Prefecture"],["25","Shiga Prefecture"],["32","Shimane Prefecture"],["22","Shizuoka Prefecture"],["09","Tochigi Prefecture"],["36","Tokushima Prefecture"],["13","Tokyo"],["31","Tottori Prefecture"],["16","Toyama Prefecture"],["30","Wakayama Prefecture"],["06","Yamagata Prefecture"],["35","Yamaguchi Prefecture"],["19","Yamanashi Prefecture"],["44","Ōita Prefecture"],["27","Ōsaka Prefecture"]],"ID":[["AC","Aceh"],["BA","Bali"],["BT","Banten"],["BE","Bengkulu"],["YO","DI Yogyakarta"],["JK","DKI Jakarta"],["GO","Gorontalo"],["JA","Jambi"],["JB","Jawa Barat"],["JT","Jawa Tengah"],["JI","Jawa Timur"],["KA","Kalimantan Barat"],["KS","Kalimantan Selatan"],["KT","Kalimantan Tengah"],["KI","Kalimantan Timur"],["KU","Kalimantan Utara"],["BB","Kepulauan Bangka Belitung"],["KR","Kepulauan Riau"],["LA","Lampung"],["MA","Maluku"],["MU","Maluku Utara"],["NB","Nusa Tenggara Barat"],["NT","Nusa Tenggara Timur"],["PA","Papua"],["PB","Papua Barat"],["RI","Riau"],["SR","Sulawesi Barat"],["SN","Sulawesi Selatan"],["ST","Sulawesi Tengah"],["SG","Sulawesi Tenggara"],["SA","Sulawesi Utara"],["SB","Sumatera Barat"],["SS","Sumatera Selatan"],["SU","Sumatera Utara"]],"MY":[["01","Johor"],["02","Kedah"],["03","Kelantan"],["14","Kuala Lumpur"],["15","Labuan"],["04","Malacca"],["05","Negeri Sembilan"],["06","Pahang"],["07","Penang"],["08","Perak"],["09","Perlis"],["16","Putrajaya"],["12","Sabah"],["13","Sarawak"],["10","Selangor"],["11","Terengganu"]],"NG":[["AB","Abia"],["FC","Abuja Federal Capital Territory"],["AD","Adamawa"],["AK","Akwa Ibom"],["AN","Anambra"],["BA","Bauchi"],["BY","Bayelsa"],["BE","Benue"],["BO","Borno"],["CR","Cross River"],["DE","Delta"],["EB","Ebonyi"],["ED","Edo"],["EK","Ekiti"],["EN","Enugu"],["GO","Gombe"],["IM","Imo"],["JI","Jigawa"],["KD","Kaduna"],["KN","Kano"],["KT","Katsina"],["KE","Kebbi"],["KO","Kogi"],["KW","Kwara"],["LA","Lagos"],["NA","Nasarawa"],["NI","Niger"],["OG","Ogun"],["ON","Ondo"],["OS","Osun"],["OY","Oyo"],["PL","Plateau"],["RI","Rivers"],["SO","Sokoto"],["TA","Taraba"],["YO","Yobe"],["ZA","Zamfara"]],"PH":[["ABR","Abra"],["AGN","Agusan del Norte"],["AGS","Agusan del Sur"],["AKL","Aklan"],["ALB","Albay"],["ANT","Antique"],["APA","Apayao"],["AUR","Aurora"],["14","Autonomous Region in Muslim Mindanao"],["BAS","Basilan"],["BAN","Bataan"],["BTN","Batanes"],["BTG","Batangas"],["BEN","Benguet"],["05","Bicol Region"],["BIL","Biliran"],["BOH","Bohol"],["BUK","Bukidnon"],["BUL","Bulacan"],["CAG","Cagayan"],["02","Cagayan Valley"],["40","Calabarzon"],["CAN","Camarines Norte"],["CAS","Camarines Sur"],["CAM","Camiguin"],["CAP","Capiz"],["13","Caraga"],["CAT","Catanduanes"],["CAV","Cavite"],["CEB","Cebu"],["03","Central Luzon"],["07","Central Visayas"],["COM","Compostela Valley"],["15","Cordillera Administrative Region"],["NCO","Cotabato"],["DVO","Davao Occidental"],["DAO","Davao Oriental"],["11","Davao Region"],["DAV","Davao del Norte"],["DAS","Davao del Sur"],["DIN","Dinagat Islands"],["EAS","Eastern Samar"],["08","Eastern Visayas"],["GUI","Guimaras"],["IFU","Ifugao"],["ILN","Ilocos Norte"],["01","Ilocos Region"],["ILS","Ilocos Sur"],["ILI","Iloilo"],["ISA","Isabela"],["KAL","Kalinga"],["LUN","La Union"],["LAG","Laguna"],["LAN","Lanao del Norte"],["LAS","Lanao del Sur"],["LEY","Leyte"],["MAG","Maguindanao"],["MAD","Marinduque"],["MAS","Masbate"],["NCR","Metro Manila"],["41","Mimaropa"],["MSC","Misamis Occidental"],["MSR","Misamis Oriental"],["MOU","Mountain Province"],["NEC","Negros Occidental"],["NER","Negros Oriental"],["10","Northern Mindanao"],["NSA","Northern Samar"],["NUE","Nueva Ecija"],["NUV","Nueva Vizcaya"],["MDC","Occidental Mindoro"],["MDR","Oriental Mindoro"],["PLW","Palawan"],["PAM","Pampanga"],["PAN","Pangasinan"],["QUE","Quezon"],["QUI","Quirino"],["RIZ","Rizal"],["ROM","Romblon"],["SAR","Sarangani"],["SIG","Siquijor"],["12","Soccsksargen"],["SOR","Sorsogon"],["SCO","South Cotabato"],["SLE","Southern Leyte"],["SUK","Sultan Kudarat"],["SLU","Sulu"],["SUN","Surigao del Norte"],["SUR","Surigao del Sur"],["TAR","Tarlac"],["TAW","Tawi-Tawi"],["06","Western Visayas"],["ZMB","Zambales"],["09","Zamboanga Peninsula"],["ZSI","Zamboanga Sibugay"],["ZAN","Zamboanga del Norte"],["ZAS","Zamboanga del Sur"]],"TH":[["37","Amnat Charoen"],["15","Ang Thong"],["10","Bangkok"],["38","Bueng Kan"],["31","Buri Ram"],["24","Chachoengsao"],["18","Chai Nat"],["36","Chaiyaphum"],["22","Chanthaburi"],["50","Chiang Mai"],["57","Chiang Rai"],["20","Chon Buri"],["86","Chumphon"],["46","Kalasin"],["62","Kamphaeng Phet"],["71","Kanchanaburi"],["40","Khon Kaen"],["81","Krabi"],["52","Lampang"],["51","Lamphun"],["42","Loei"],["16","Lop Buri"],["58","Mae Hong Son"],["44","Maha Sarakham"],["49","Mukdahan"],["26","Nakhon Nayok"],["73","Nakhon Pathom"],["48","Nakhon Phanom"],["30","Nakhon Ratchasima"],["60","Nakhon Sawan"],["80","Nakhon Si Thammarat"],["55","Nan"],["96","Narathiwat"],["39","Nong Bua Lam Phu"],["43","Nong Khai"],["12","Nonthaburi"],["13","Pathum Thani"],["94","Pattani"],["S","Pattaya"],["82","Phangnga"],["93","Phatthalung"],["56","Phayao"],["67","Phetchabun"],["76","Phetchaburi"],["66","Phichit"],["65","Phitsanulok"],["14","Phra Nakhon Si Ayutthaya"],["54","Phrae"],["83","Phuket"],["25","Prachin Buri"],["77","Prachuap Khiri Khan"],["85","Ranong"],["70","Ratchaburi"],["21","Rayong"],["45","Roi Et"],["27","Sa Kaeo"],["47","Sakon Nakhon"],["11","Samut Prakan"],["74","Samut Sakhon"],["75","Samut Songkhram"],["19","Saraburi"],["91","Satun"],["33","Si Sa Ket"],["17","Sing Buri"],["90","Songkhla"],["64","Sukhothai"],["72","Suphan Buri"],["84","Surat Thani"],["32","Surin"],["63","Tak"],["92","Trang"],["23","Trat"],["34","Ubon Ratchathani"],["41","Udon Thani"],["61","Uthai Thani"],["53","Uttaradit"],["95","Yala"],["35","Yasothon"]],"DE":[["BW","Baden-Württemberg"],["BY","Bavaria"],["BE","Berlin"],["BB","Brandenburg"],["HB","Bremen"],["HH","Hamburg"],["HE","Hesse"],["NI","Lower Saxony"],["MV","Mecklenburg-Vorpommern"],["NW","North Rhine-Westphalia"],["RP","Rhineland-Palatinate"],["SL","Saarland"],["SN","Saxony"],["ST","Saxony-Anhalt"],["SH","Schleswig-Holstein"],["TH","Thuringia"]],"IT":[["65","Abruzzo"],["23","Aosta Valley"],["75","Apulia"],["77","Basilicata"],["BN","Benevento Province"],["78","Calabria"],["72","Campania"],["45","Emilia-Romagna"],["36","Friuli–Venezia Giulia"],["62","Lazio"],["AG","Libero consorzio comunale di Agrigento"],["CL","Libero consorzio comunale di Caltanissetta"],["EN","Libero consorzio comunale di Enna"],["RG","Libero consorzio comunale di Ragusa"],["SR","Libero consorzio comunale di Siracusa"],["TP","Libero consorzio comunale di Trapani"],["42","Liguria"],["25","Lombardy"],["57","Marche"],["BA","Metropolitan City of Bari"],["BO","Metropolitan City of Bologna"],["CA","Metropolitan City of Cagliari"],["CT","Metropolitan City of Catania"],["FI","Metropolitan City of Florence"],["GE","Metropolitan City of Genoa"],["ME","Metropolitan City of Messina"],["MI","Metropolitan City of Milan"],["NA","Metropolitan City of Naples"],["PA","Metropolitan City of Palermo"],["RC","Metropolitan City of Reggio Calabria"],["RM","Metropolitan City of Rome"],["TO","Metropolitan City of Turin"],["VE","Metropolitan City of Venice"],["67","Molise"],["PU","Pesaro and Urbino Province"],["21","Piedmont"],["AL","Province of Alessandria"],["AN","Province of Ancona"],["AP","Province of Ascoli Piceno"],["AT","Province of Asti"],["AV","Province of Avellino"],["BT","Province of Barletta-Andria-Trani"],["BL","Province of Belluno"],["BG","Province of Bergamo"],["BI","Province of Biella"],["BS","Province of Brescia"],["BR","Province of Brindisi"],["CB","Province of Campobasso"],["CI","Province of Carbonia-Iglesias"],["CE","Province of Caserta"],["CZ","Province of Catanzaro"],["CH","Province of Chieti"],["CO","Province of Como"],["CS","Province of Cosenza"],["CR","Province of Cremona"],["KR","Province of Crotone"],["CN","Province of Cuneo"],["FM","Province of Fermo"],["FE","Province of Ferrara"],["FG","Province of Foggia"],["FC","Province of Forlì-Cesena"],["FR","Province of Frosinone"],["GO","Province of Gorizia"],["GR","Province of Grosseto"],["IM","Province of Imperia"],["IS","Province of Isernia"],["AQ","Province of L'Aquila"],["SP","Province of La Spezia"],["LT","Province of Latina"],["LE","Province of Lecce"],["LC","Province of Lecco"],["LI","Province of Livorno"],["LO","Province of Lodi"],["LU","Province of Lucca"],["MC","Province of Macerata"],["MN","Province of Mantua"],["MS","Province of Massa and Carrara"],["MT","Province of Matera"],["VS","Province of Medio Campidano"],["MO","Province of Modena"],["MB","Province of Monza and Brianza"],["NO","Province of Novara"],["NU","Province of Nuoro"],["OG","Province of Ogliastra"],["OT","Province of Olbia-Tempio"],["OR","Province of Oristano"],["PD","Province of Padua"],["PR","Province of Parma"],["PV","Province of Pavia"],["PG","Province of Perugia"],["PE","Province of Pescara"],["PC","Province of Piacenza"],["PI","Province of Pisa"],["PT","Province of Pistoia"],["PN","Province of Pordenone"],["PZ","Province of Potenza"],["PO","Province of Prato"],["RA","Province of Ravenna"],["RE","Province of Reggio Emilia"],["RI","Province of Rieti"],["RN","Province of Rimini"],["RO","Province of Rovigo"],["SA","Province of Salerno"],["SS","Province of Sassari"],["SV","Province of Savona"],["SI","Province of Siena"],["SO","Province of Sondrio"],["TA","Province of Taranto"],["TE","Province of Teramo"],["TR","Province of Terni"],["TV","Province of Treviso"],["TS","Province of Trieste"],["UD","Province of Udine"],["VA","Province of Varese"],["VB","Province of Verbano-Cusio-Ossola"],["VC","Province of Vercelli"],["VR","Province of Verona"],["VV","Province of Vibo Valentia"],["VI","Province of Vicenza"],["VT","Province of Viterbo"],["88","Sardinia"],["82","Sicily"],["BZ","South Tyrol"],["TN","Trentino"],["32","Trentino-South Tyrol"],["52","Tuscany"],["55","Umbria"],["34","Veneto"]],"ES":[["AN","Andalusia"],["AR","Aragon"],["AS","Asturias"],["PM","Balearic Islands"],["PV","Basque Country"],["BU","Burgos Province"],["CN","Canary Islands"],["CB","Cantabria"],["CL","Castile and León"],["CM","Castilla La Mancha"],["CT","Catalonia"],["CE","Ceuta"],["EX","Extremadura"],["GA","Galicia"],["RI","La Rioja"],["LE","Léon"],["MD","Madrid"],["ML","Melilla"],["MC","Murcia"],["NC","Navarra"],["P","Palencia Province"],["SA","Salamanca Province"],["SG","Segovia Province"],["SO","Soria Province"],["VC","Valencia"],["VA","Valladolid Province"],["ZA","Zamora Province"],["AV","Ávila"]],"AR":[["B","Buenos Aires"],["K","Catamarca"],["H","Chaco"],["U","Chubut"],["C","Ciudad Autónoma de Buenos Aires"],["W","Corrientes"],["X","Córdoba"],["E","Entre Ríos"],["P","Formosa"],["Y","Jujuy"],["L","La Pampa"],["F","La Rioja"],["M","Mendoza"],["N","Misiones"],["Q","Neuquén"],["R","Río Negro"],["A","Salta"],["J","San Juan"],["D","San Luis"],["Z","Santa Cruz"],["S","Santa Fe"],["G","Santiago del Estero"],["V","Tierra del Fuego"],["T","Tucumán"]],"CL":[["AI","Aisén del General Carlos Ibañez del Campo"],["AN","Antofagasta"],["AP","Arica y Parinacota"],["AT","Atacama"],["BI","Biobío"],["CO","Coquimbo"],["AR","La Araucanía"],["LI","Libertador General Bernardo O'Higgins"],["LL","Los Lagos"],["LR","Los Ríos"],["MA","Magallanes y de la Antártica Chilena"],["ML","Maule"],["RM","Región Metropolitana de Santiago"],["TA","Tarapacá"],["VS","Valparaíso"],["NB","Ñuble"]],"CO":[["AMA","Amazonas"],["ANT","Antioquia"],["ARA","Arauca"],["SAP","Archipiélago de San Andrés, Providencia y Santa Catalina"],["ATL","Atlántico"],["DC","Bogotá D.C."],["BOL","Bolívar"],["BOY","Boyacá"],["CAL","Caldas"],["CAQ","Caquetá"],["CAS","Casanare"],["CAU","Cauca"],["CES","Cesar"],["CHO","Chocó"],["CUN","Cundinamarca"],["COR","Córdoba"],["GUA","Guainía"],["GUV","Guaviare"],["HUI","Huila"],["LAG","La Guajira"],["MAG","Magdalena"],["MET","Meta"],["NAR","Nariño"],["NSA","Norte de Santander"],["PUT","Putumayo"],["QUI","Quindío"],["RIS","Risaralda"],["SAN","Santander"],["SUC","Sucre"],["TOL","Tolima"],["VAC","Valle del Cauca"],["VAU","Vaupés"],["VID","Vichada"]],"PE":[["AMA","Amazonas"],["APU","Apurímac"],["ARE","Arequipa"],["AYA","Ayacucho"],["CAJ","Cajamarca"],["CAL","Callao"],["CUS","Cusco"],["HUV","Huancavelica"],["HUC","Huanuco"],["ICA","Ica"],["JUN","Junín"],["LAL","La Libertad"],["LAM","Lambayeque"],["LIM","Lima"],["LOR","Loreto"],["MDD","Madre de Dios"],["MOQ","Moquegua"],["PAS","Pasco"],["PIU","Piura"],["PUN","Puno"],["SAM","San Martín"],["TAC","Tacna"],["TUM","Tumbes"],["UCA","Ucayali"],["ANC","Áncash"]],"VE":[["Z","Amazonas"],["B","Anzoátegui"],["C","Apure"],["D","Aragua"],["E","Barinas"],["F","Bolívar"],["G","Carabobo"],["H","Cojedes"],["Y","Delta Amacuro"],["A","Distrito Capital"],["I","Falcón"],["W","Federal Dependencies of Venezuela"],["J","Guárico"],["X","La Guaira"],["K","Lara"],["M","Miranda"],["N","Monagas"],["L","Mérida"],["O","Nueva Esparta"],["P","Portuguesa"],["R","Sucre"],["T","Trujillo"],["S","Táchira"],["U","Yaracuy"],["V","Zulia"]]};
  var ZAPPY_NAME_TO_CODE = {"afghanistan":"AF","aland islands":"AX","albania":"AL","algeria":"DZ","american samoa":"AS","andorra":"AD","angola":"AO","anguilla":"AI","antarctica":"AQ","antigua and barbuda":"AG","argentina":"AR","armenia":"AM","aruba":"AW","australia":"AU","austria":"AT","azerbaijan":"AZ","the bahamas":"BS","bahrain":"BH","bangladesh":"BD","barbados":"BB","belarus":"BY","belgium":"BE","belize":"BZ","benin":"BJ","bermuda":"BM","bhutan":"BT","bolivia":"BO","bosnia and herzegovina":"BA","botswana":"BW","bouvet island":"BV","brazil":"BR","british indian ocean territory":"IO","brunei":"BN","bulgaria":"BG","burkina faso":"BF","burundi":"BI","cambodia":"KH","cameroon":"CM","canada":"CA","cape verde":"CV","cayman islands":"KY","central african republic":"CF","chad":"TD","chile":"CL","china":"CN","christmas island":"CX","cocos (keeling) islands":"CC","colombia":"CO","comoros":"KM","congo":"CG","democratic republic of the congo":"CD","cook islands":"CK","costa rica":"CR","cote d'ivoire (ivory coast)":"CI","croatia":"HR","cuba":"CU","cyprus":"CY","czech republic":"CZ","denmark":"DK","djibouti":"DJ","dominica":"DM","dominican republic":"DO","east timor":"TL","ecuador":"EC","egypt":"EG","el salvador":"SV","equatorial guinea":"GQ","eritrea":"ER","estonia":"EE","ethiopia":"ET","falkland islands":"FK","faroe islands":"FO","fiji islands":"FJ","finland":"FI","france":"FR","french guiana":"GF","french polynesia":"PF","french southern territories":"TF","gabon":"GA","the gambia":"GM","georgia":"GE","germany":"DE","ghana":"GH","gibraltar":"GI","greece":"GR","greenland":"GL","grenada":"GD","guadeloupe":"GP","guam":"GU","guatemala":"GT","guernsey and alderney":"GG","guinea":"GN","guinea-bissau":"GW","guyana":"GY","haiti":"HT","heard island and mcdonald islands":"HM","honduras":"HN","hong kong s.a.r.":"HK","hungary":"HU","iceland":"IS","india":"IN","indonesia":"ID","iran":"IR","iraq":"IQ","ireland":"IE","israel":"IL","italy":"IT","jamaica":"JM","japan":"JP","jersey":"JE","jordan":"JO","kazakhstan":"KZ","kenya":"KE","kiribati":"KI","north korea":"KP","south korea":"KR","kuwait":"KW","kyrgyzstan":"KG","laos":"LA","latvia":"LV","lebanon":"LB","lesotho":"LS","liberia":"LR","libya":"LY","liechtenstein":"LI","lithuania":"LT","luxembourg":"LU","macau s.a.r.":"MO","macedonia":"MK","madagascar":"MG","malawi":"MW","malaysia":"MY","maldives":"MV","mali":"ML","malta":"MT","man (isle of)":"IM","marshall islands":"MH","martinique":"MQ","mauritania":"MR","mauritius":"MU","mayotte":"YT","mexico":"MX","micronesia":"FM","moldova":"MD","monaco":"MC","mongolia":"MN","montenegro":"ME","montserrat":"MS","morocco":"MA","mozambique":"MZ","myanmar":"MM","namibia":"NA","nauru":"NR","nepal":"NP","bonaire, sint eustatius and saba":"BQ","netherlands":"NL","new caledonia":"NC","new zealand":"NZ","nicaragua":"NI","niger":"NE","nigeria":"NG","niue":"NU","norfolk island":"NF","northern mariana islands":"MP","norway":"NO","oman":"OM","pakistan":"PK","palau":"PW","palestinian territory occupied":"PS","panama":"PA","papua new guinea":"PG","paraguay":"PY","peru":"PE","philippines":"PH","pitcairn island":"PN","poland":"PL","portugal":"PT","puerto rico":"PR","qatar":"QA","reunion":"RE","romania":"RO","russia":"RU","rwanda":"RW","saint helena":"SH","saint kitts and nevis":"KN","saint lucia":"LC","saint pierre and miquelon":"PM","saint vincent and the grenadines":"VC","saint-barthelemy":"BL","saint-martin (french part)":"MF","samoa":"WS","san marino":"SM","sao tome and principe":"ST","saudi arabia":"SA","senegal":"SN","serbia":"RS","seychelles":"SC","sierra leone":"SL","singapore":"SG","slovakia":"SK","slovenia":"SI","solomon islands":"SB","somalia":"SO","south africa":"ZA","south georgia":"GS","south sudan":"SS","spain":"ES","sri lanka":"LK","sudan":"SD","suriname":"SR","svalbard and jan mayen islands":"SJ","swaziland":"SZ","sweden":"SE","switzerland":"CH","syria":"SY","taiwan":"TW","tajikistan":"TJ","tanzania":"TZ","thailand":"TH","togo":"TG","tokelau":"TK","tonga":"TO","trinidad and tobago":"TT","tunisia":"TN","turkey":"TR","turkmenistan":"TM","turks and caicos islands":"TC","tuvalu":"TV","uganda":"UG","ukraine":"UA","united arab emirates":"AE","united kingdom":"GB","united states":"US","united states minor outlying islands":"UM","uruguay":"UY","uzbekistan":"UZ","vanuatu":"VU","vatican city state (holy see)":"VA","venezuela":"VE","vietnam":"VN","virgin islands (british)":"VG","virgin islands (us)":"VI","wallis and futuna islands":"WF","western sahara":"EH","yemen":"YE","zambia":"ZM","zimbabwe":"ZW","kosovo":"XK","curaçao":"CW","sint maarten (dutch part)":"SX"};

  function initShippingCountry() {
    var input = document.getElementById('shipping-country');
    if (!input) return;

    fetchStoreSettings().then(function() {
      if (storeCountry) {
        var code = resolveStoreCountry(storeCountry);
        if (code) {
          input.value = code;
          onCountryChange(code);
        }
      }
    });
  }

  function resolveStoreCountry(val) {
    if (!val) return null;
    var upper = val.trim().toUpperCase();
    if (ZAPPY_STATE_MAP[upper] || upper.length === 2) return upper;
    var lower = val.trim().toLowerCase();
    if (ZAPPY_NAME_TO_CODE[lower]) return ZAPPY_NAME_TO_CODE[lower];
    var keys = Object.keys(ZAPPY_NAME_TO_CODE);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(lower) !== -1) return ZAPPY_NAME_TO_CODE[keys[i]];
    }
    return null;
  }

  function onCountryChange(countryCode) {
    var stateWrapper = document.getElementById('state-wrapper');
    var stateSel = document.getElementById('shipping-state');
    if (!stateWrapper || !stateSel) return;

    var states = ZAPPY_STATE_MAP[countryCode];
    if (states && states.length > 0) {
      stateSel.innerHTML = '<option value="">' + (t.stateProvince || 'State / Province') + '</option>';
      states.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s[0];
        opt.textContent = s[1];
        stateSel.appendChild(opt);
      });
      stateWrapper.style.display = 'block';
    } else {
      stateSel.innerHTML = '';
      stateWrapper.style.display = 'none';
    }
  }

  if (document.getElementById('shipping-country')) {
    initShippingCountry();
  }

  
  // Helper to strip RTL/LTR control characters that browsers may insert in RTL interfaces
  function sanitizeEmail(str) {
    return (str || '').replace(/[‎‏‪-‮⁦-⁩​-‍﻿]/g, '').trim();
  }
  
  
  function saveCart() {
    cart = getCartPayload();
    localStorage.setItem('zappy_cart_' + websiteId, JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer(); // Keep drawer in sync
  }
  
  function updateCartCount() {
    // Count distinct cart entries (not sum of quantities) so unit-based items count as 1 each
    const count = cart.length;
    // Update all cart count badges (our injected one and any existing ones)
    const countElements = document.querySelectorAll('.cart-count');
    countElements.forEach(function(el) { el.textContent = count; });
  }
  
  // Get the display label for a quantity unit
  function getUnitLabel(item) {
    var unit = item.quantityUnit || item.quantity_unit || 'piece';
    if (unit === 'piece') return '';
    if (unit === 'custom') return item.customUnitLabel || item.custom_unit_label || '';
    var labels = t.unitLabels || {};
    return labels[unit] || unit;
  }
  
  // Format quantity with unit label for display
  function formatQtyDisplay(item) {
    var label = getUnitLabel(item);
    return label ? item.quantity + ' ' + label : item.quantity;
  }
  
  // Compute "price per reference unit" HTML for product cards/detail page
  // For gram → per 100g, for ml → per 100ml, for kg/liter → per kg/L
  // For piece-based products with piece_unit_type/value → compute from piece weight
  function getPricePerUnitHtml(p) {
    if (!p.show_price_per_unit) return '';
    var unit = p.quantity_unit || 'piece';
    
    // Check if product uses variant-driven pricing
    var vCount = parseInt(p.variant_count || 0, 10);
    var vPriceCount = parseInt(p.variant_price_count || 0, 10);
    var vMinPrice = parseFloat(p.variant_min_price);
    var vMaxPrice = parseFloat(p.variant_max_price);
    var hasVarRange = vCount > 1 && vPriceCount > 1 && Number.isFinite(vMinPrice) && Number.isFinite(vMaxPrice) && vMinPrice !== vMaxPrice;
    
    // Use variant min price when the card shows "Starting at" pricing, otherwise use sale/base price
    var price = hasVarRange
      ? vMinPrice
      : (parseFloat(p.sale_price) && parseFloat(p.sale_price) < parseFloat(p.price) ? parseFloat(p.sale_price) : parseFloat(p.price));
    if (!price) return '';
    
    var refAmount, refLabel, pricePerRef;
    
    if (unit === 'piece') {
      // Piece-based product: use piece_unit_type and piece_unit_value
      var pieceUnit = p.piece_unit_type;
      var pieceValue = parseFloat(p.piece_unit_value);
      if (!pieceUnit || !pieceValue) return '';
      // Normalize to a reference amount based on the piece unit type
      if (pieceUnit === 'gram') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.gram) || 'g'); }
      else if (pieceUnit === 'ml') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.ml) || 'ml'); }
      else if (pieceUnit === 'kg') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.kg) || 'kg'; }
      else if (pieceUnit === 'liter') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.liter) || 'L'; }
      else return '';
      // price is for 1 piece which contains pieceValue of pieceUnit
      pricePerRef = (price / pieceValue) * refAmount;
    } else {
      var step = parseFloat(p.quantity_step) || 1;
      if (!step) return '';
      if (unit === 'gram') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.gram) || 'g'); }
      else if (unit === 'ml') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.ml) || 'ml'); }
      else if (unit === 'kg') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.kg) || 'kg'; }
      else if (unit === 'liter') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.liter) || 'L'; }
      else if (unit === 'custom') { refAmount = 1; refLabel = p.custom_unit_label || ''; }
      else return '';
      // price is per step amount of unit
      pricePerRef = (price / step) * refAmount;
    }
    
    return '<div class="price-per-unit-info">' + t.currency + pricePerRef.toFixed(2) + ' / ' + refLabel + '</div>';
  }
  
  // Get effective price (sale_price if available and less than price, otherwise price)
  function getItemPrice(item) {
    var variantPrice = item && item.selectedVariant && item.selectedVariant.price;
    if (variantPrice !== null && variantPrice !== undefined && variantPrice !== '') {
      var parsedVariantPrice = parseFloat(variantPrice);
      if (Number.isFinite(parsedVariantPrice)) return parsedVariantPrice;
    }
    if (item.displayPrice !== null && item.displayPrice !== undefined && item.displayPrice !== '') {
      var parsedDisplayPrice = parseFloat(item.displayPrice);
      if (Number.isFinite(parsedDisplayPrice)) return parsedDisplayPrice;
    }
    var regularPrice = parseFloat(item.price);
    var salePrice = parseFloat(item.sale_price);
    if (Number.isFinite(salePrice) && Number.isFinite(regularPrice) && salePrice < regularPrice) {
      return salePrice;
    }
    return Number.isFinite(regularPrice) ? regularPrice : 0;
  }
  
  // Get cart line total: price is per step, so total = price * (quantity / step)
  function getCartLineTotal(item) {
    var price = getItemPrice(item);
    var step = parseFloat(item.quantityStep) || 1;
    var unit = item.quantityUnit || item.quantity_unit || 'piece';
    if (unit === 'piece') return price * item.quantity;
    return price * (item.quantity / step);
  }

  function buildCartItemVariantMetadata(item) {
    var selectedVariant = item && item.selectedVariant;
    if (!selectedVariant || !selectedVariant.attributes || typeof selectedVariant.attributes !== 'object') {
      return { labels: {}, colorSwatches: {} };
    }

    var attrLabels = getVariantAttributeLabels(item, t);
    var labels = {};
    var colorSwatches = {};

    Object.entries(selectedVariant.attributes).forEach(function(entry) {
      var key = entry[0], value = entry[1];
      if (!key || value == null || String(value).trim() === '') return;

      labels[key] = attrLabels[key] || attrLabels[String(key).toLowerCase()] || key;

      var isColor = String(key).toLowerCase() === 'color' || String(key).toLowerCase().includes('color');
      if (isColor && typeof window.getConfiguredColorSwatchHex === 'function') {
        if (!colorSwatches[key]) colorSwatches[key] = {};
        colorSwatches[key][String(value)] = window.getConfiguredColorSwatchHex(item, key, value);
      }
    });

    return { labels: labels, colorSwatches: colorSwatches };
  }

  function stripCartItemVariantConfig(item) {
    if (!item || typeof item !== 'object') return item;

    var compact = { ...item };
    var metadata = buildCartItemVariantMetadata(compact);
    if (Object.keys(metadata.labels).length > 0) {
      compact.variantAttributeLabels = {
        ...(compact.variantAttributeLabels || {}),
        ...metadata.labels
      };
    }
    if (Object.keys(metadata.colorSwatches).length > 0) {
      compact.variantColorSwatches = {
        ...(compact.variantColorSwatches || {}),
        ...metadata.colorSwatches
      };
    }

    delete compact.variant_config;
    delete compact.variantConfig;
    delete compact.variants;
    return compact;
  }

  function getCartPayload() {
    return cart.map(stripCartItemVariantConfig);
  }
  
  function addToCart(product) {
    // Create a unique cart item ID that includes variant info
    const variantId = product.selectedVariant ? product.selectedVariant.id : null;
    const cartItemId = variantId ? product.id + '-' + variantId : product.id;
    
    // Find existing item with same product AND variant
    const existing = cart.find(item => {
      const existingVariantId = item.selectedVariant ? item.selectedVariant.id : null;
      const existingCartId = existingVariantId ? item.id + '-' + existingVariantId : item.id;
      return existingCartId === cartItemId;
    });
    
    const step = parseFloat(product.quantityStep || product.quantity_step) || 1;
    const qty = product.quantity || step;
    
    if (existing) {
      existing.quantity += qty;
      // Round to avoid floating point issues
      var decimals = (step.toString().split('.')[1] || '').length;
      existing.quantity = parseFloat(existing.quantity.toFixed(decimals));
    } else {
      cart.push(stripCartItemVariantConfig({ ...product, quantity: qty, quantityUnit: product.quantityUnit || product.quantity_unit || 'piece', quantityStep: step, customUnitLabel: product.customUnitLabel || product.custom_unit_label || null }));
    }
    saveCart();
    openCartDrawer(); // Open cart drawer instead of alert
  }
  
  // Store loaded products for filtering
  var productsCache = [];
  var currentFilter = 'all'; // kept for legacy compat, not used with sidebar filters
  
  // Load products on products page (uses public storefront API)
  // This is called on page load - delegates to loadProductsWithFilter
  async function loadProducts() {
    const grid = document.getElementById('zappy-product-grid');
    if (!grid) return;
    
    // Ensure store settings are loaded first (for productLayout)
    await fetchStoreSettings();
    
    // Update page title if viewing a specific category
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    let categoryId = urlParams.get('category');
    if (pageParam) {
      const pageUrl = new URL(pageParam, window.location.origin);
      categoryId = pageUrl.searchParams.get('category') || categoryId;
    }
    
    if (categoryId) {
      try {
        const catRes = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/categories?websiteId=' + websiteId));
        const catData = await catRes.json();
        if (catData.success && catData.data) {
          const category = catData.data.find(function(c) { return c.id === categoryId; });
          if (category) {
            const productsSection = document.querySelector('.products-section');
            const titleEl = productsSection ? productsSection.querySelector('h1') : null;
            if (titleEl) {
              titleEl.textContent = category.name;
            }
            document.title = category.name + ' - ' + document.title.split(' - ').pop();
          }
        }
      } catch (catErr) {
        console.warn('Failed to fetch category name', catErr);
      }
    }
    
    // Load products with default filter
    loadProductsWithFilter('all');
  }
  
  // Load products with optional filter (all, featured, new, sale)
  async function loadProductsWithFilter(filter) {
    const grid = document.getElementById('zappy-product-grid');
    if (!grid) return;
    
    currentFilter = filter || 'all';
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.getAttribute('data-category') === currentFilter) {
        btn.classList.add('active');
      }
    });
    
    try {
      // Get category filter from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      // Search query can exist either on the real URL (?search=) or inside the preview page param (page=/products?search=)
      let searchQuery = (urlParams.get('search') || '').trim();
      let categoryId = urlParams.get('category');
      if (pageParam) {
        const pageUrl = new URL(pageParam, window.location.origin);
        categoryId = pageUrl.searchParams.get('category') || categoryId;
        if (!searchQuery) {
          searchQuery = (pageUrl.searchParams.get('search') || '').trim();
        }
      }
      
      // Build API URL with language support for translations
      let apiUrl = buildApiUrlWithLang('/api/ecommerce/storefront/products?websiteId=' + websiteId);
      if (categoryId) {
        apiUrl += '&categoryId=' + categoryId;
      }
      if (searchQuery && searchQuery.length >= 2) {
        apiUrl += '&search=' + encodeURIComponent(searchQuery);
      }
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      if (!data.success || !data.data?.length) {
        grid.innerHTML = '<div class="empty-cart">' + t.noProducts + '</div>';
        productsCache = [];
        return;
      }
      
      // Store all products for client-side filtering
      productsCache = data.data;

      // Initialize toolbar, sidebar, sorting, and view toggle on first load
      if (!window._zappyToolbarInitialized) {
        window._zappyToolbarInitialized = true;
        initProductsToolbar('products-toolbar', 'product-sidebar', 'sort-select', 'sort-control', 'view-toggle', 'sidebar-toggle-btn', 'products-count');
      }

      applyAllFiltersAndRender(grid);
      if (typeof _syncCardFavorites === 'function') _syncCardFavorites();
    } catch (e) {
      console.error('Failed to load products', e);
      grid.innerHTML = '<div class="empty-cart">' + t.errorLoading + '</div>';
    }
  }
  
  // Central filtering + sorting + render pipeline
  function applyAllFiltersAndRender(grid) {
    if (!grid) grid = document.getElementById('zappy-product-grid');
    if (!grid) return;
    
    var productsToShow = productsCache.slice();
    
    // Apply sidebar filters
    if (sidebarFiltersConfig.enabled) {
      if (activeSidebarFilters.categories.length > 0) {
        productsToShow = productsToShow.filter(function(p) {
          return activeSidebarFilters.categories.includes(p.category_id);
        });
      }
      if (activeSidebarFilters.brands && activeSidebarFilters.brands.length > 0) {
        productsToShow = productsToShow.filter(function(p) {
          return p.brand && activeSidebarFilters.brands.includes(p.brand);
        });
      }
      if (activeSidebarFilters.tags.length > 0) {
        productsToShow = productsToShow.filter(function(p) {
          return p.tags && p.tags.some(function(tag) {
            return activeSidebarFilters.tags.includes(tag);
          });
        });
      }
      if (activeSidebarFilters.priceMin != null) {
        productsToShow = productsToShow.filter(function(p) {
          return parseFloat(p.price) >= activeSidebarFilters.priceMin;
        });
      }
      if (activeSidebarFilters.priceMax != null) {
        productsToShow = productsToShow.filter(function(p) {
          return parseFloat(p.price) <= activeSidebarFilters.priceMax;
        });
      }
      if (activeSidebarFilters.sale) {
        productsToShow = productsToShow.filter(function(p) {
          return p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price);
        });
      }
    }
    
    // Step 3: Apply sorting
    if (currentSortKey && currentSortKey !== 'default') {
      productsToShow = productsToShow.slice().sort(function(a, b) {
        switch (currentSortKey) {
          case 'popularity': return (parseInt(b.purchase_count) || 0) - (parseInt(a.purchase_count) || 0);
          case 'price_asc': return parseFloat(a.price) - parseFloat(b.price);
          case 'price_desc': return parseFloat(b.price) - parseFloat(a.price);
          case 'name_asc': return (a.name || '').localeCompare(b.name || '');
          case 'name_desc': return (b.name || '').localeCompare(a.name || '');
          case 'newest': return new Date(b.created_at) - new Date(a.created_at);
          default: return 0;
        }
      });
    }
    
    // Update count
    var countEl = document.getElementById('products-count');
    if (countEl) {
      var countLabel = isRTL ? (productsToShow.length + ' מוצרים') : ('Showing ' + productsToShow.length + ' products');
      countEl.textContent = countLabel;
    }
    
    if (productsToShow.length === 0) {
      grid.innerHTML = '<div class="empty-cart">' + t.noProducts + '</div>';
      return;
    }
    
    renderProductsToGrid(grid, productsToShow);
  }
  
  // Initialize toolbar (sorting, view toggle, sidebar toggle, count)
  function initProductsToolbar(toolbarId, sidebarId, sortSelectId, sortControlId, viewToggleId, sidebarToggleBtnId, countId) {
    var toolbar = document.getElementById(toolbarId);
    if (!toolbar) return;
    
    var hasAnyFeature = false;
    
    // Sorting
    if (sortingConfig.enabled && sortingConfig.options && sortingConfig.options.length > 0) {
      hasAnyFeature = true;
      var sortControl = document.getElementById(sortControlId);
      var sortSelect = document.getElementById(sortSelectId);
      if (sortControl && sortSelect) {
        sortControl.style.display = '';
        var sortLabels = {
          popularity: isRTL ? 'פופולריות' : 'Popularity',
          price_asc: isRTL ? 'מחיר: נמוך לגבוה' : 'Price: Low to High',
          price_desc: isRTL ? 'מחיר: גבוה לנמוך' : 'Price: High to Low',
          name_asc: isRTL ? 'שם: א-ת' : 'Name: A to Z',
          name_desc: isRTL ? 'שם: ת-א' : 'Name: Z to A',
          newest: isRTL ? 'חדש ביותר' : 'Newest First'
        };
        var sortOrder = ['popularity', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'];
        sortOrder.forEach(function(opt) {
          if (sortingConfig.options.includes(opt) && sortLabels[opt]) {
            var option = document.createElement('option');
            option.value = opt;
            option.textContent = sortLabels[opt];
            sortSelect.appendChild(option);
          }
        });
        sortSelect.value = currentSortKey;
        sortSelect.addEventListener('change', function() {
          currentSortKey = sortSelect.value;
          applyAllFiltersAndRender();
        });
      }
    }
    
    // View toggle
    if (viewToggleEnabled) {
      hasAnyFeature = true;
      var viewToggle = document.getElementById(viewToggleId);
      if (viewToggle) {
        viewToggle.style.display = '';
        var viewBtns = viewToggle.querySelectorAll('.view-btn');
        viewBtns.forEach(function(btn) {
          btn.classList.toggle('active', btn.getAttribute('data-view') === currentViewMode);
          btn.addEventListener('click', function() {
            currentViewMode = btn.getAttribute('data-view');
            localStorage.setItem('zappy_view_mode_' + websiteId, currentViewMode);
            viewBtns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-view') === currentViewMode); });
            applyAllFiltersAndRender();
          });
        });
      }
    }
    
    // Sidebar filters
    if (sidebarFiltersConfig.enabled && sidebarFiltersConfig.filters && sidebarFiltersConfig.filters.length > 0) {
      hasAnyFeature = true;
      initSidebarFilters(sidebarId, sidebarToggleBtnId);
    }
    
    if (hasAnyFeature) {
      toolbar.style.display = '';
    }
  }
  
  function buildPriceRanges(prices) {
    if (!prices || prices.length === 0) return [];
    var minP = Math.min.apply(null, prices);
    var maxP = Math.max.apply(null, prices);
    if (minP === maxP) return [];
    var range = maxP - minP;
    var step;
    if (range <= 50) step = 10;
    else if (range <= 200) step = 25;
    else if (range <= 500) step = 50;
    else if (range <= 1000) step = 100;
    else if (range <= 5000) step = 500;
    else step = 1000;
    var bucketStart = Math.floor(minP / step) * step;
    var buckets = [];
    while (bucketStart < maxP) {
      var bucketEnd = bucketStart + step;
      var count = prices.filter(function(p) { return p >= bucketStart && p < bucketEnd; }).length;
      if (bucketStart + step >= maxP) {
        count = prices.filter(function(p) { return p >= bucketStart; }).length;
      }
      if (count > 0) {
        buckets.push({ min: bucketStart, max: bucketEnd, count: count });
      }
      bucketStart = bucketEnd;
    }
    return buckets;
  }

  function formatPrice(val) {
    return val % 1 === 0 ? val.toString() : val.toFixed(2);
  }

  // Build and initialize the sidebar filters
  function initSidebarFilters(sidebarId, toggleBtnId) {
    var sidebar = document.getElementById(sidebarId);
    if (!sidebar) return;
    
    var filters = sidebarFiltersConfig.filters || [];
    var html = '';
    var currency = isRTL ? '₪' : '$';
    
    // Sidebar header with title, clear button, and mobile close button
    html += '<div class="sidebar-header"><span class="sidebar-title">' + (isRTL ? 'סינון' : 'Filters') + '</span>';
    html += '<div class="sidebar-header-actions">';
    html += '<button class="sidebar-clear-btn" id="' + sidebarId + '-clear" title="' + (isRTL ? 'נקה הכל' : 'Clear all') + '">' + (isRTL ? 'נקה הכל' : 'Clear all') + '</button>';
    html += '<button class="sidebar-mobile-close" id="' + sidebarId + '-mobile-close" title="' + (isRTL ? 'סגור' : 'Close') + '">&times;</button>';
    html += '</div></div>';
    
    // Category filter
    if (filters.includes('category')) {
      var categories = {};
      productsCache.forEach(function(p) {
        if (p.category_id && p.category_name) {
          if (!categories[p.category_id]) categories[p.category_id] = { name: p.category_name, count: 0 };
          categories[p.category_id].count++;
        }
      });
      var catKeys = Object.keys(categories);
      if (catKeys.length > 0) {
        html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'קטגוריות' : 'Categories') + '</div>';
        catKeys.forEach(function(catId) {
          html += '<label class="sidebar-item"><input type="checkbox" data-filter="category" value="' + catId + '"> ' + categories[catId].name + ' <span class="count">(' + categories[catId].count + ')</span></label>';
        });
        html += '</div>';
      }
    }
    
    // Brand filter
    if (filters.includes('brand')) {
      var brandCounts = {};
      productsCache.forEach(function(p) {
        if (p.brand) {
          brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        }
      });
      var brandKeys = Object.keys(brandCounts);
      if (brandKeys.length > 0) {
        brandKeys.sort();
        html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'מותג' : 'Brand') + '</div>';
        brandKeys.forEach(function(brand) {
          html += '<label class="sidebar-item"><input type="checkbox" data-filter="brand" value="' + brand + '"> ' + brand + ' <span class="count">(' + brandCounts[brand] + ')</span></label>';
        });
        html += '</div>';
      }
    }
    
    // Tags filter
    if (filters.includes('tags')) {
      var tagCounts = {};
      productsCache.forEach(function(p) {
        if (p.tags && p.tags.length) {
          p.tags.forEach(function(tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      var tagKeys = Object.keys(tagCounts);
      if (tagKeys.length > 0) {
        tagKeys.sort();
        html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'תגיות' : 'Tags') + '</div>';
        tagKeys.forEach(function(tag) {
          html += '<label class="sidebar-item"><input type="checkbox" data-filter="tag" value="' + tag + '"> ' + tag + ' <span class="count">(' + tagCounts[tag] + ')</span></label>';
        });
        html += '</div>';
      }
    }
    
    // Price range filter (dynamic buckets)
    if (filters.includes('price')) {
      var prices = productsCache.map(function(p) { return parseFloat(p.price) || 0; }).filter(function(v) { return v > 0; });
      var buckets = buildPriceRanges(prices);
      if (buckets.length > 0) {
        html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'טווח מחירים' : 'Price Range') + '</div>';
        buckets.forEach(function(b, i) {
          var label = currency + formatPrice(b.min) + ' – ' + currency + formatPrice(b.max);
          html += '<label class="sidebar-item"><input type="radio" name="' + sidebarId + '-price-range" data-filter="price-range" data-min="' + b.min + '" data-max="' + b.max + '" value="' + i + '"> ' + label + ' <span class="count">(' + b.count + ')</span></label>';
        });
        html += '</div>';
      }
    }
    
    // Sale filter
    if (filters.includes('sale')) {
      var saleCount = productsCache.filter(function(p) { return p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price); }).length;
      if (saleCount > 0) {
        html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'מבצעים' : 'On Sale') + '</div>';
        html += '<label class="sidebar-item"><input type="checkbox" data-filter="sale"> ' + (isRTL ? 'הצג מוצרים במבצע' : 'Show sale items') + ' <span class="count">(' + saleCount + ')</span></label>';
        html += '</div>';
      }
    }
    
    sidebar.innerHTML = html;
    sidebar.style.display = '';
    
    // Mobile toggle
    var toggleBtn = document.getElementById(toggleBtnId);
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = sidebarId + '-overlay';
    sidebar.parentNode.insertBefore(overlay, sidebar);
    
    if (toggleBtn) {
      toggleBtn.style.display = '';
      toggleBtn.addEventListener('click', function() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
      });
    }
    
    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }
    overlay.addEventListener('click', closeSidebar);
    var mobileCloseBtn = document.getElementById(sidebarId + '-mobile-close');
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeSidebar);
    
    // Category/tag checkbox handlers
    sidebar.querySelectorAll('input[data-filter="category"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        activeSidebarFilters.categories = Array.from(sidebar.querySelectorAll('input[data-filter="category"]:checked')).map(function(el) { return el.value; });
        applyAllFiltersAndRender();
      });
    });
    sidebar.querySelectorAll('input[data-filter="brand"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        activeSidebarFilters.brands = Array.from(sidebar.querySelectorAll('input[data-filter="brand"]:checked')).map(function(el) { return el.value; });
        applyAllFiltersAndRender();
      });
    });
    sidebar.querySelectorAll('input[data-filter="tag"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        activeSidebarFilters.tags = Array.from(sidebar.querySelectorAll('input[data-filter="tag"]:checked')).map(function(el) { return el.value; });
        applyAllFiltersAndRender();
      });
    });
    sidebar.querySelectorAll('input[data-filter="sale"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        activeSidebarFilters.sale = cb.checked;
        applyAllFiltersAndRender();
      });
    });
    
    // Price range radio handlers
    sidebar.querySelectorAll('input[data-filter="price-range"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        activeSidebarFilters.priceMin = parseFloat(radio.getAttribute('data-min'));
        activeSidebarFilters.priceMax = parseFloat(radio.getAttribute('data-max'));
        applyAllFiltersAndRender();
      });
    });
    
    // Clear all
    var clearEl = document.getElementById(sidebarId + '-clear');
    if (clearEl) {
      clearEl.addEventListener('click', function() {
        activeSidebarFilters = { categories: [], brands: [], tags: [], priceMin: null, priceMax: null, sale: false };
        sidebar.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
        sidebar.querySelectorAll('input[type="radio"]').forEach(function(rb) { rb.checked = false; });
        applyAllFiltersAndRender();
      });
    }
  }
  
  // Helper: resolve product image URL for preview + live
  function getPreviewAssetBase() {
    var websiteId = window.ZAPPY_WEBSITE_ID || (window.ZAPPY_CONFIG && window.ZAPPY_CONFIG.websiteId);
    var path = window.location && window.location.pathname ? window.location.pathname : '';
    if (!websiteId || !path) return '';
    if (path.indexOf('/api/website/preview-fullscreen/') !== -1) return '/api/website/preview-fullscreen/' + websiteId + '/assets/';
    if (path.indexOf('/api/website/preview/') !== -1) return '/api/website/preview/' + websiteId + '/assets/';
    if (path.indexOf('/preview-fullscreen/') !== -1) return '/api/website/preview-fullscreen/' + websiteId + '/assets/';
    if (path.indexOf('/preview/') !== -1) return '/api/website/preview/' + websiteId + '/assets/';
    return '';
  }

  function resolveProductImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    if (url.startsWith('/api/website/preview')) {
      return url;
    }
    if (url.startsWith('/preview-fullscreen/')) {
      return '/api/website' + url;
    }
    if (url.startsWith('/preview/')) {
      return '/api/website' + url;
    }
    var previewBase = getPreviewAssetBase();
    var normalized = url.replace(/^\/?assets\//, '');
    if (previewBase) {
      return previewBase + normalized;
    }
    if (url.startsWith('/')) {
      return url;
    }
    return '/' + url;
  }
  // Expose helpers for functions outside this IIFE
  window.resolveProductImageUrl = resolveProductImageUrl;
  window.getPricePerUnitHtml = getPricePerUnitHtml;
  
  // Render products to grid
  function renderProductsToGrid(grid, products) {
    // Update grid class based on layout + view mode
    var viewClass = currentViewMode === 'list' ? ' view-list' : '';
    grid.className = 'product-grid layout-' + productLayout + viewClass;
    grid.setAttribute('data-zappy-auto-grid', 'true');
    
    grid.innerHTML = products.map(function(p) {
      // Check if price should be displayed (default to true if not set)
      var showPrice = p.custom_fields?.showPrice !== false;
      var hasSalePrice = p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price);
      var variantCount = parseInt(p.variant_count || 0, 10);
      var variantPriceCount = parseInt(p.variant_price_count || 0, 10);
      var variantMinPrice = parseFloat(p.variant_min_price);
      var variantMaxPrice = parseFloat(p.variant_max_price);
      var hasVariantPriceRange = variantCount > 1 && variantPriceCount > 1 && Number.isFinite(variantMinPrice) && Number.isFinite(variantMaxPrice) && variantMinPrice !== variantMaxPrice;
      var startingAtLabel = getEcomText('startingAt', t.startingAt || 'Starting at');
      var displayPrice = showPrice 
        ? (hasVariantPriceRange
          ? startingAtLabel + ' ' + t.currency + variantMinPrice.toFixed(2)
          : (hasSalePrice 
            ? t.currency + parseFloat(p.sale_price).toFixed(2) + ' <span class="original-price">' + t.currency + parseFloat(p.price).toFixed(2) + '</span>'
            : t.currency + parseFloat(p.price).toFixed(2)))
        : '';
      
      // Get first image with correct URL in preview/live
      var imageUrl = p.images && p.images[0] ? resolveProductImageUrl(p.images[0]) : '';
      
      // Build tag badges (manual only - all tags come from product.tags array)
      var tagBadges = [];
      if (p.tags && p.tags.length) {
        p.tags.forEach(function(tag) {
          var tagLower = tag.toLowerCase();
          // Apply special styling for known tag types
          if (tagLower === 'sale' || tagLower === 'מבצע') {
            tagBadges.push('<span class="product-tag tag-sale">' + tag + '</span>');
          } else if (tagLower === 'new' || tagLower === 'חדש') {
            tagBadges.push('<span class="product-tag tag-new">' + tag + '</span>');
          } else if (tagLower === 'featured' || tagLower === 'מומלץ') {
            tagBadges.push('<span class="product-tag tag-featured">' + tag + '</span>');
          } else {
            tagBadges.push('<span class="product-tag">' + tag + '</span>');
          }
        });
      }
      var tagsHtml = tagBadges.length > 0 ? '<div class="product-tags">' + tagBadges.join('') + '</div>' : '';
      
      // Build card content based on layout
      var cardContent = '';
      var imageHtml = imageUrl ? '<img src="' + imageUrl + '" alt="' + p.name + '">' : '<div class="no-image-placeholder">📦</div>';
      
      // Get localized button text based on mode
      var localizedAddToCart = getEcomText('addToCart', t.addToCart);
      var localizedViewDetails = getEcomText('viewDetails', t.viewDetails);
      
      // Only include price div if showPrice is true
      var pricePerUnitHtml = getPricePerUnitHtml(p);
      var priceHtml = showPrice ? '<div class="price">' + displayPrice + '</div>' + pricePerUnitHtml : '';
      
      var favBtnHtml = isCatalogMode ? '' : '<button type="button" class="card-favorite-btn" data-product-id="' + p.id + '" onclick="event.preventDefault(); event.stopPropagation(); toggleCardFavorite(this, \'' + p.id + '\')" title="Save to favorites" aria-pressed="false"><svg class="heart-outline" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M14.7917 0.833C12.705 0.833 10.811 2.376 10 4.462C9.189 2.375 7.295 0.833 5.208 0.833C2.337 0.833 0 3.17 0 6.042C0 11.675 8.128 17.767 9.758 18.93L10 19.104L10.243 18.93C11.873 17.767 20 11.674 20 6.042C20 3.17 17.663 0.833 14.792 0.833ZM10 18.078C5.716 14.965 0.833 10.019 0.833 6.042C0.833 3.629 2.796 1.667 5.208 1.667C7.498 1.667 9.583 4.05 9.583 6.667H10.417C10.417 4.05 12.502 1.667 14.792 1.667C17.204 1.667 19.167 3.629 19.167 6.042C19.167 10.019 14.284 14.965 10 18.078Z" fill="currentColor"/></svg><svg class="heart-filled" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path d="M14.7917 0.833C12.705 0.833 10.811 2.376 10 4.462C9.189 2.375 7.295 0.833 5.208 0.833C2.337 0.833 0 3.17 0 6.042C0 11.675 8.128 17.767 9.758 18.93L10 19.104L10.243 18.93C11.873 17.767 20 11.674 20 6.042C20 3.17 17.663 0.833 14.792 0.833Z" fill="#e74c3c"/></svg></button>';
      var productHref = '/product/' + (p.slug || p.id);
      var productCardMediaHtml = '<div class="product-card-media"><a href="' + productHref + '" class="product-card-image-link">' + imageHtml + '</a>' + tagsHtml + favBtnHtml + '</div>';

      if (productLayout === 'compact') {
        cardContent =
          '<div class="product-card-inner">' +
            productCardMediaHtml +
            '<a href="' + productHref + '" class="product-card-body-link">' +
              '<div class="card-content">' +
                '<h3>' + p.name + '</h3>' +
                priceHtml +
              '</div>' +
            '</a>' +
          '</div>';
      } else if (productLayout === 'detailed') {
        var detailedDesc = stripHtmlToText(p.description || '');
        var actionButton = isCatalogMode
          ? '<a href="' + productHref + '" class="add-to-cart view-details-btn">' + localizedViewDetails + '</a>'
          : '<button class="add-to-cart" onclick="event.stopPropagation(); window.zappyHandleAddToCart(' + JSON.stringify(p).replace(/"/g, '&quot;') + ')">' + localizedAddToCart + '</button>';
        cardContent =
          '<div class="product-card-inner">' +
            productCardMediaHtml +
            '<a href="' + productHref + '" class="product-card-body-link">' +
              '<div class="card-content">' +
                '<h3>' + p.name + '</h3>' +
                '<p>' + detailedDesc + '</p>' +
                priceHtml +
              '</div>' +
            '</a>' +
          '</div>' +
          actionButton;
      } else {
        var standardDesc = stripHtmlToText(p.description || '');
        cardContent =
          '<div class="product-card-inner">' +
            productCardMediaHtml +
            '<a href="' + productHref + '" class="product-card-body-link">' +
              '<div class="card-content">' +
                '<h3>' + p.name + '</h3>' +
                '<p>' + standardDesc + '</p>' +
                priceHtml +
              '</div>' +
            '</a>' +
          '</div>';
      }
      
      return '<div class="product-card ' + productLayout + '" data-product-id="' + p.id + '">' + cardContent + '</div>';
    }).join('');
  }
  
  function initFilterButtons() {
    // Legacy filter buttons removed - sidebar filters handle all filtering
  }
  
  window.getLegacyColorSwatchHex = function getLegacyColorSwatchHex(colorValue) {
    var bgColor = String(colorValue || '').trim();
    if (!/^#[0-9A-Fa-f]{3,8}$/.test(bgColor)) {
      var lc = bgColor.toLowerCase();
      var _clr = {'dark grey':'#555','dark gray':'#555','light grey':'#d3d3d3','light gray':'#d3d3d3','light blue':'lightblue','dark blue':'darkblue','light green':'lightgreen','dark green':'darkgreen','dark red':'darkred','light pink':'lightpink','dark orange':'darkorange','sky blue':'skyblue','royal blue':'royalblue','navy blue':'navy','forest green':'forestgreen','olive green':'olivedrab','sea green':'seagreen','hot pink':'hotpink','deep pink':'deeppink','dark violet':'darkviolet','slate grey':'slategrey','slate gray':'slategray','dim grey':'dimgrey','dim gray':'dimgray','steel blue':'steelblue','pale green':'palegreen','off white':'#f5f5f0','burgundy':'#800020','charcoal':'#36454f','champagne':'#f7e7ce','sand':'#c2b280','taupe':'#483c32','wine':'#722f37','rust':'#b7410e','sage':'#bcb88a','mint':'#98ff98','peach':'#ffcba4','cream':'#fffdd0','mauve':'#e0b0ff'};
      bgColor = _clr[lc] || lc;
    }
    if (typeof CSS !== 'undefined' && CSS && typeof CSS.supports === 'function' && !CSS.supports('color', bgColor)) {
      return '#94a3b8';
    }
    return bgColor;
  };

  window.getConfiguredColorSwatchHex = function getConfiguredColorSwatchHex(source, attrKey, colorValue) {
    if (!colorValue) return '';
    if (/^#[0-9A-Fa-f]{3,8}$/.test(String(colorValue).trim())) return String(colorValue).trim();

    var compactSwatches = source && source.variantColorSwatches;
    if (compactSwatches && typeof compactSwatches === 'object') {
      var swatchKey = Object.keys(compactSwatches).find(function(key) {
        return String(key).toLowerCase() === String(attrKey || '').toLowerCase();
      });
      var swatchesForKey = swatchKey && compactSwatches[swatchKey];
      var normalizedCompactValue = String(colorValue).trim().replace(/s+/g, ' ').toLowerCase();
      if (swatchesForKey && typeof swatchesForKey === 'object') {
        var valueKey = Object.keys(swatchesForKey).find(function(key) {
          return String(key).trim().replace(/s+/g, ' ').toLowerCase() === normalizedCompactValue;
        });
        if (valueKey && swatchesForKey[valueKey]) return swatchesForKey[valueKey];
      }
    }

    var variantConfig = source && (source.variant_config || source.variantConfig);
    if (typeof variantConfig === 'string') {
      try { variantConfig = JSON.parse(variantConfig); } catch (e) { variantConfig = null; }
    }
    var selections = variantConfig && variantConfig.selections && typeof variantConfig.selections === 'object'
      ? variantConfig.selections
      : null;
    if (selections) {
      var selectionKey = Object.keys(selections).find(function(key) {
        return String(key).toLowerCase() === String(attrKey || '').toLowerCase();
      });
      var values = selectionKey && Array.isArray(selections[selectionKey] && selections[selectionKey].values)
        ? selections[selectionKey].values
        : [];
      var normalizedValue = String(colorValue).trim().replace(/s+/g, ' ').toLowerCase();
      var match = values.find(function(value) {
        var label = typeof value === 'string' ? value : value && value.label;
        return label && String(label).trim().replace(/s+/g, ' ').toLowerCase() === normalizedValue && value && value.hex;
      });
      if (match && match.hex) return match.hex;
    }

    return window.getLegacyColorSwatchHex(colorValue);
  };

  function getVariantConfig(source) {
    var variantConfig = source && (source.variant_config || source.variantConfig);
    if (typeof variantConfig === 'string') {
      try { variantConfig = JSON.parse(variantConfig); } catch (e) { variantConfig = null; }
    }
    return variantConfig && typeof variantConfig === 'object' ? variantConfig : null;
  }

  function getVariantAttributeLabels(source, t) {
    var labels = {
      color: (t && t.color) || 'Color',
      size: (t && t.size) || 'Size',
      material: (t && t.material) || 'Material',
      style: (t && t.style) || 'Style',
      weight: (t && t.weight) || 'Weight',
      capacity: (t && t.capacity) || 'Capacity',
      length: (t && t.length) || 'Length'
    };
    var compactLabels = source && source.variantAttributeLabels;
    if (compactLabels && typeof compactLabels === 'object') {
      Object.entries(compactLabels).forEach(function(entry) {
        var key = entry[0], label = entry[1];
        if (!key || !label) return;
        labels[String(key)] = String(label);
        labels[String(key).toLowerCase()] = String(label);
      });
    }
    var variantConfig = getVariantConfig(source);
    var customOptions = Array.isArray(variantConfig && variantConfig.customOptions)
      ? variantConfig.customOptions
      : [];
    customOptions.forEach(function(option) {
      if (!option || !option.key || !option.label) return;
      labels[String(option.key)] = String(option.label);
      labels[String(option.key).toLowerCase()] = String(option.label);
    });
    return labels;
  }
  window.getVariantAttributeLabels = getVariantAttributeLabels;

  // Render cart drawer (slide-out panel)
  function renderCartDrawer() {
    const drawerItems = document.getElementById('cart-drawer-items');
    const drawerTotal = document.getElementById('cart-drawer-total');
    if (!drawerItems) return;
    
    if (cart.length === 0) {
      drawerItems.innerHTML = '<div class="empty-cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>' + t.emptyCart + '</p></div>';
      if (drawerTotal) drawerTotal.textContent = t.currency + '0';
      return;
    }
    
    let total = 0;
    drawerItems.innerHTML = cart.map(item => {
      const lineTotal = getCartLineTotal(item);
      total += lineTotal;
      // Build human-readable variant info from attributes (e.g., "Size: 45 • Color: Green")
      var variantInfo = '';
      if (item.selectedVariant && item.selectedVariant.attributes && typeof item.selectedVariant.attributes === 'object') {
        var attrLabels = getVariantAttributeLabels(item, t);
        var parts = [];
        Object.entries(item.selectedVariant.attributes).forEach(function(entry) {
          var key = entry[0], value = entry[1];
          var displayValue =
            item.selectedVariant.attributes_display &&
            Object.prototype.hasOwnProperty.call(item.selectedVariant.attributes_display, key)
              ? item.selectedVariant.attributes_display[key]
              : value;
          if (value) {
            var label = attrLabels[key] || attrLabels[key.toLowerCase()] || key;
            var isColor = key.toLowerCase() === 'color' || key.toLowerCase().includes('color');
            if (isColor) {
              var bgColor = window.getConfiguredColorSwatchHex(item, key, value);
              parts.push('<span class="cart-item-attr"><span class="cart-item-attr-label">' + label + ':</span> <span class="cart-item-color-swatch" title="' + displayValue + '" style="display:inline-block;width:14px;height:14px;border-radius:50%;background-color:' + bgColor + ';border:1px solid rgba(0,0,0,0.15);vertical-align:middle;margin-' + (document.documentElement.dir === 'rtl' ? 'right' : 'left') + ':4px;"></span></span>');
            } else {
              parts.push('<span class="cart-item-attr"><span class="cart-item-attr-label">' + label + ':</span> ' + displayValue + '</span>');
            }
          }
        });
        if (parts.length > 0) {
          variantInfo = '<div class="cart-item-variant">' + parts.join(' <span class="cart-item-attr-sep">•</span> ') + '</div>';
        }
      } else if (item.variantName) {
        variantInfo = '<div class="cart-item-variant">' + item.variantName + '</div>';
      }
      var cartItemKey = item.id + (item.selectedVariant ? '-' + item.selectedVariant.id : '');
      return '<div class="cart-item" data-item-id="' + cartItemKey + '">' +
        '<img src="' + (resolveProductImageUrl(item.images?.[0]) || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2270%22 height=%2270%22 viewBox=%220 0 70 70%22%3E%3Crect fill=%22%23f3f4f6%22 width=%2270%22 height=%2270%22/%3E%3Cpath fill=%22%239ca3af%22 d=%22M28 25h14v14H28z%22/%3E%3C/svg%3E') + '" alt="' + item.name + '">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + item.name + '</div>' +
          variantInfo +
          '<div class="cart-item-price">' + t.currency + lineTotal.toFixed(2) + '</div>' +
          '<div class="cart-item-qty">' +
            '<button onclick="window.zappyUpdateQty(\'' + cartItemKey + '\', -1)">−</button>' +
            '<span>' + formatQtyDisplay(item) + '</span>' +
            '<button onclick="window.zappyUpdateQty(\'' + cartItemKey + '\', 1)">+</button>' +
          '</div>' +
        '</div>' +
        '<button class="cart-item-remove" onclick="window.zappyRemoveFromCart(\'' + cartItemKey + '\')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' +
      '</div>';
    }).join('');
    if (drawerTotal) drawerTotal.textContent = t.currency + total.toFixed(2);
  }
  
  // Open/close cart drawer
  function openCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-drawer-overlay');
    
    // If drawer doesn't exist, create it dynamically
    if (!drawer) {
      var drawerHtml = '<div class="cart-drawer-overlay" id="cart-drawer-overlay"></div>' +
        '<aside class="cart-drawer" id="cart-drawer">' +
        '<div class="cart-drawer-header"><h2>' + t.yourCart + '</h2>' +
        '<button type="button" class="cart-drawer-close" id="cart-drawer-close">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="cart-drawer-body" id="cart-drawer-items"><div class="empty-cart">' + t.emptyCart + '</div></div>' +
        '<div class="cart-drawer-footer"><div class="cart-drawer-total"><span>' + t.total + ':</span><span id="cart-drawer-total">' + t.currency + '0</span></div>' +
        '<a href="/checkout" class="cart-drawer-checkout">' + t.proceedToCheckout + '</a></div></aside>';
      document.body.insertAdjacentHTML('beforeend', drawerHtml);
      drawer = document.getElementById('cart-drawer');
      overlay = document.getElementById('cart-drawer-overlay');
      
      // Add close handlers for newly created elements
      var closeBtn = document.getElementById('cart-drawer-close');
      if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
      if (overlay) overlay.addEventListener('click', closeCartDrawer);
    }
    
    if (drawer) { 
      drawer.classList.add('active'); 
      document.body.style.overflow = 'hidden';
    }
    if (overlay) {
      overlay.classList.add('active');
    }
    renderCartDrawer();
  }
  
  function closeCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-drawer-overlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // Update quantity (handles variant IDs in format "productId-variantId")
  window.zappyUpdateQty = function(compositeId, delta) {
    // Find item by composite ID (product + variant)
    const item = cart.find(i => {
      const variantId = i.selectedVariant ? i.selectedVariant.id : null;
      const itemCompositeId = variantId ? i.id + '-' + variantId : i.id;
      return itemCompositeId === compositeId;
    });
    if (item) {
      const step = parseFloat(item.quantityStep) || 1;
      item.quantity += delta * step;
      // Round to avoid floating point issues
      var decimals = (step.toString().split('.')[1] || '').length;
      item.quantity = parseFloat(item.quantity.toFixed(decimals));
      if (item.quantity <= 0) {
        cart = cart.filter(i => {
          const variantId = i.selectedVariant ? i.selectedVariant.id : null;
          const itemCompositeId = variantId ? i.id + '-' + variantId : i.id;
          return itemCompositeId !== compositeId;
        });
      }
      saveCart();
      renderCartDrawer();
    }
  };
  
  // Render cart on cart page (legacy full page)
  function renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!itemsEl) return;
    
    if (cart.length === 0) {
      itemsEl.innerHTML = '<div class="empty-cart">' + t.emptyCart + '</div>';
      if (totalEl) totalEl.textContent = t.currency + '0';
      return;
    }
    
    let total = 0;
    itemsEl.innerHTML = cart.map(item => {
      const lineTotal = getCartLineTotal(item);
      total += lineTotal;
      const itemPrice = getItemPrice(item);
      const variantInfo = item.variantName ? '<br><span style="font-size:12px;color:#6b7280;">' + item.variantName + '</span>' : '';
      const compositeId = item.selectedVariant ? item.id + '-' + item.selectedVariant.id : item.id;
      return '<div class="cart-item">' +
        '<img src="' + (resolveProductImageUrl(item.images?.[0]) || '') + '" alt="' + item.name + '">' +
        '<div><strong>' + item.name + '</strong>' + variantInfo + '<br>' + t.currency + itemPrice.toFixed(2) + ' x ' + formatQtyDisplay(item) + '</div>' +
        '<button onclick="window.zappyRemoveFromCart(\'' + compositeId + '\')">' + t.remove + '</button>' +
      '</div>';
    }).join('');
    if (totalEl) totalEl.textContent = t.currency + total.toFixed(2);
  }
  
  // Checkout state
  let selectedShipping = null;
  let shippingMethods = [];
  
  function positionAddressSection(method) {
    var addressSection = document.getElementById('shipping-address-section');
    if (!addressSection) return;
    if (method && !method.is_pickup) {
      var block = document.querySelector('.shipping-method-block[data-method-id="' + method.id + '"]');
      if (block) {
        block.appendChild(addressSection);
        addressSection.style.display = 'block';
      }
    } else {
      addressSection.style.display = 'none';
    }
  }

  // Load shipping methods on checkout page
  async function loadShippingMethods() {
    const container = document.getElementById('shipping-methods');
    if (!container) return;
    
    try {
      const res = await fetch(buildApiUrl('/api/ecommerce/storefront/shipping?websiteId=' + websiteId));
      const data = await res.json();
      shippingMethods = data.data || [];
      
      if (!shippingMethods.length) {
        container.innerHTML = '<div class="no-shipping">' + (t.noShippingMethods || 'No shipping options available') + '</div>';
        return;
      }
      
      var svgDelivery = '<svg class="shipping-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
      var svgPickupPoint = '<svg class="shipping-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
      var svgStorePickup = '<svg class="shipping-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-4h16l1 4"/><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M9 21v-6h6v6"/><path d="M3 9h18"/></svg>';

      container.innerHTML = shippingMethods.map((method, idx) => {
        const isPickup = method.is_pickup;
        const isFree = parseFloat(method.price) === 0;
        const hasFreeAbove = method.conditions?.freeAbove && getCartSubtotal() >= method.conditions.freeAbove;
        const priceDisplay = isFree || hasFreeAbove ? (t.free || 'FREE') : t.currency + method.price;
        const daysText = method.estimated_days ? ' (' + method.estimated_days + ' ' + t.days + ')' : '';
        var methodIcon;
        if (!isPickup) {
          methodIcon = svgDelivery;
        } else if (method.pickup_address?.street) {
          methodIcon = svgStorePickup;
        } else {
          methodIcon = svgPickupPoint;
        }
        const pickupAddress = isPickup && method.pickup_address?.street ? '<div class="shipping-address">' + method.pickup_address.street + ', ' + (method.pickup_address.city || '') + '</div>' : '';
        const freeAboveNote = method.conditions?.freeAbove && !hasFreeAbove ? '<div class="shipping-free-note">' + (t.freeAbove || 'Free above') + ' ' + t.currency + method.conditions.freeAbove + '</div>' : '';
        
        return '<div class="shipping-method-block" data-method-id="' + method.id + '">' +
          '<label class="shipping-option' + (idx === 0 ? ' selected' : '') + '" data-method-id="' + method.id + '">' +
            '<input type="radio" name="shipping" value="' + method.id + '"' + (idx === 0 ? ' checked' : '') + ' onchange="window.zappySelectShipping(this.value)">' +
            '<div class="shipping-info">' +
              '<div class="shipping-name-row">' +
                '<span class="shipping-name">' + method.name + '</span>' +
                methodIcon +
              '</div>' +
              (method.description ? '<div class="shipping-desc">' + method.description + daysText + '</div>' : (daysText ? '<div class="shipping-desc">' + daysText.replace(/^ \(/, '').replace(/\)$/, '') + '</div>' : '')) +
              pickupAddress +
              freeAboveNote +
            '</div>' +
            '<div class="shipping-price' + (isFree || hasFreeAbove ? ' free' : '') + '">' + priceDisplay + '</div>' +
          '</label>' +
        '</div>';
      }).join('');
      
      // Auto-select first option and position address form inline
      if (shippingMethods.length > 0) {
        selectedShipping = shippingMethods[0];
        positionAddressSection(shippingMethods[0]);
        updateOrderTotals();
        updatePlaceOrderState();
      }
    } catch (e) {
      console.error('Failed to load shipping methods', e);
      container.innerHTML = '<div class="error">' + (t.errorLoading || 'Error loading options') + '</div>';
    }
  }
  
  // Payment state
  let selectedPaymentMethod = null;
  let paymentMethods = [];
  let isPaymentConfigured = false;
  
  // Load payment methods on checkout page
  async function loadPaymentMethods() {
    const container = document.getElementById('payment-container');
    if (!container) return;
    
    try {
      const res = await fetch(buildApiUrl('/api/ecommerce/storefront/payment-status?websiteId=' + websiteId));
      const data = await res.json();
      
      isPaymentConfigured = data.data?.isConfigured || false;
      paymentMethods = data.data?.methods || [];
      
      if (!isPaymentConfigured || !paymentMethods.length) {
        container.innerHTML = '<div class="payment-not-configured">' + 
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
          '<span>' + (isRTL ? 'תשלום מקוון לא מוגדר. צרו קשר עם בעל האתר.' : 'Online payment not configured. Please contact the store owner.') + '</span>' +
        '</div>';
        return;
      }
      
      var paymentIcons = {
        'credit-card': '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none"><g clip-path="url(#clip0_1335_1776)"><path d="M46.7578 41.9921H3.24216C1.45505 41.9921 0 40.5371 0 38.7402V11.2597C0 9.47262 1.45505 8.01758 3.24216 8.01758H46.748C48.5449 8.01758 49.9999 9.47262 49.9999 11.2597V38.7402C50 40.5371 48.545 41.9921 46.7578 41.9921Z" fill="#505278"/><path d="M46.7579 8.01758H25V41.9921H46.7578C48.5547 41.9921 50 40.5371 50 38.75V11.2597C50 9.47262 48.545 8.01758 46.7579 8.01758Z" fill="#424566"/><path d="M26.084 8.01757C25.7519 18.0469 17.4902 26.0937 7.3828 26.0937C4.76559 26.0937 2.26563 25.5566 0 24.5703V20.2051C2.17773 21.4648 4.69729 22.1777 7.3828 22.1777C15.332 22.1777 21.8359 15.8789 22.1679 8.00781H26.0839V8.01757H26.084Z" fill="#575982"/><path d="M25 8.01758V13.6914C25.6348 11.9043 26.0156 10 26.0839 8.01758H25Z" fill="#505278"/><path d="M50.0001 27.8806V31.8454C47.6563 31.3962 45.3712 31.2009 43.1056 31.4256C39.0138 31.8357 35.2149 33.7498 31.1427 37.451C30.4883 38.0467 29.8243 38.6619 29.1895 39.2576C28.213 40.1658 27.2363 41.0838 26.2109 41.9822H19.8828C22.2266 40.4197 24.3262 38.4569 26.5234 36.4061C27.1777 35.8006 27.8418 35.1658 28.5156 34.5603C33.2422 30.2732 37.7539 28.0369 42.7148 27.5389C45.1661 27.2947 47.6466 27.49 50.0001 27.8806Z" fill="#505278"/><path d="M19.8828 41.9917H25V37.8218C23.3301 39.355 21.6797 40.7906 19.8828 41.9917Z" fill="#575982"/><path d="M10.4688 24.5508H5.67382C4.94138 24.5508 4.3457 23.9551 4.3457 23.2227V20.0391C4.3457 19.3066 4.94138 18.7109 5.67382 18.7109H10.4688C11.2012 18.7109 11.7969 19.3066 11.7969 20.0391V23.2227C11.7871 23.9649 11.2011 24.5508 10.4688 24.5508Z" fill="#424566"/><path d="M10.4688 24.4727H5.66405C4.98048 24.4727 4.42383 23.916 4.42383 23.2324V20.0391C4.42383 19.3555 4.98048 18.7988 5.66405 18.7988H10.4688C11.1523 18.7988 11.709 19.3555 11.709 20.0391V23.2324C11.709 23.916 11.1523 24.4727 10.4688 24.4727Z" fill="#FEBD55"/><path d="M11.709 21.7383V21.543H9.1699V20.6836L9.82421 20.0293H11.709C11.709 19.9609 11.6992 19.8926 11.6895 19.834H9.77542C9.74615 19.834 9.72655 19.8438 9.70704 19.8633L9.02347 20.5468H8.16402V18.8086H7.96871V20.5468H7.1191L6.43552 19.8633C6.41601 19.8438 6.38666 19.834 6.36714 19.834H4.44334C4.43359 19.8926 4.42383 19.9609 4.42383 20.0293H6.32811L6.97266 20.6738V21.543H4.42383V21.7383H6.97266V22.6074L6.32811 23.252H4.42383C4.42383 23.3203 4.43359 23.3886 4.44334 23.4473H6.36714C6.39641 23.4473 6.41601 23.4375 6.43552 23.418L7.1191 22.7344H7.96871V24.4727H8.16402V22.7344H9.02338L9.70696 23.418C9.72647 23.4375 9.74599 23.4473 9.77534 23.4473H11.6894C11.6991 23.3886 11.7089 23.3203 11.7089 23.252H9.82413L9.16982 22.5976V21.7383H11.709ZM8.9746 22.539H7.16797V20.7324H8.9746V22.539Z" fill="#B5613C"/><path d="M44.7658 24.4139C44.7169 24.4139 44.6779 24.4041 44.6388 24.3846C44.4923 24.3162 44.4338 24.1404 44.5119 23.994C45.2639 22.4998 45.2639 20.7909 44.5119 19.2967C44.4435 19.1502 44.5022 18.9745 44.6388 18.9061C44.7854 18.8377 44.9611 18.8963 45.0294 19.033C45.8693 20.6932 45.8693 22.5975 45.0294 24.2576C44.9708 24.3553 44.8732 24.4139 44.7658 24.4139ZM43.7599 23.8572C44.5509 22.451 44.5509 20.8299 43.7599 19.4236C43.6817 19.2869 43.5059 19.2283 43.3595 19.3162C43.2228 19.3944 43.1642 19.5702 43.2521 19.7166C43.9454 20.9471 43.9454 22.3533 43.2521 23.574C43.1739 23.7107 43.2228 23.8963 43.3595 23.9744C43.4084 24.0037 43.4572 24.0134 43.506 24.0134C43.6036 24.0038 43.7012 23.9451 43.7599 23.8572ZM42.5099 23.4569C43.2814 22.3338 43.2814 20.9373 42.5099 19.8045C42.422 19.6678 42.2364 19.6385 42.0998 19.7263C41.9631 19.8142 41.9337 19.9998 42.0216 20.1365C42.6467 21.0545 42.6467 22.2068 42.0216 23.1248C41.9337 23.2615 41.963 23.4373 42.0998 23.5349C42.1486 23.5739 42.2072 23.5837 42.2658 23.5837C42.3634 23.5936 42.4513 23.5448 42.5099 23.4569ZM41.1915 23.0858C41.6212 22.6951 41.8556 22.1775 41.8556 21.6405C41.8556 21.1034 41.6212 20.5858 41.1915 20.1952C41.0744 20.0878 40.8888 20.0878 40.7814 20.2147C40.674 20.3319 40.674 20.5174 40.8009 20.6248C41.1036 20.908 41.2697 21.2694 41.2697 21.6405C41.2697 22.0116 41.1036 22.3729 40.8009 22.6561C40.6837 22.7635 40.674 22.9491 40.7814 23.0662C40.84 23.1249 40.9181 23.1639 40.9962 23.1639C41.0645 23.1639 41.1329 23.1346 41.1915 23.0858Z" fill="#CAD4FF"/><path d="M24.5996 37.0703H4.71679C4.55075 37.0703 4.42383 36.9434 4.42383 36.7773C4.42383 36.6113 4.55075 36.4844 4.71679 36.4844H24.5996C24.7656 36.4844 24.8925 36.6113 24.8925 36.7773C24.8925 36.9434 24.7558 37.0703 24.5996 37.0703Z" fill="#E6EAFF"/><path d="M45.3613 37.0703H41.5918C41.4258 37.0703 41.2988 36.9434 41.2988 36.7773C41.2988 36.6113 41.4258 36.4844 41.5918 36.4844H45.3613C45.5274 36.4844 45.6543 36.6113 45.6543 36.7773C45.6543 36.9434 45.5176 37.0703 45.3613 37.0703ZM39.9902 36.7773C39.9902 36.6113 39.8633 36.4844 39.6973 36.4844H35.9277C35.7617 36.4844 35.6348 36.6113 35.6348 36.7773C35.6348 36.9434 35.7617 37.0703 35.9277 37.0703H39.6973C39.8633 37.0703 39.9902 36.9336 39.9902 36.7773Z" fill="#CAD4FF"/><path d="M4.71679 14.6777C4.55075 14.6777 4.42383 14.5508 4.42383 14.3847V13.2324C4.42383 13.0664 4.55075 12.9395 4.71679 12.9395C4.88282 12.9395 5.00975 13.0664 5.00975 13.2324V14.375C5.00975 14.541 4.88282 14.6777 4.71679 14.6777ZM6.60156 14.3847V13.2324C6.60156 13.0664 6.47463 12.9395 6.3086 12.9395C6.14256 12.9395 6.01564 13.0664 6.01564 13.2324V14.375C6.01564 14.541 6.14256 14.6679 6.3086 14.6679C6.47455 14.6777 6.60156 14.541 6.60156 14.3847ZM8.20313 14.3847V13.2324C8.20313 13.0664 8.0762 12.9395 7.91017 12.9395C7.74413 12.9395 7.6172 13.0664 7.6172 13.2324V14.375C7.6172 14.541 7.74413 14.6679 7.91017 14.6679C8.06636 14.6777 8.20313 14.541 8.20313 14.3847ZM9.79494 14.3847V13.2324C9.79494 13.0664 9.66801 12.9395 9.50198 12.9395C9.33594 12.9395 9.20901 13.0664 9.20901 13.2324V14.375C9.20901 14.541 9.33594 14.6679 9.50198 14.6679C9.66793 14.6777 9.79494 14.541 9.79494 14.3847Z" fill="#E6EAFF"/><path d="M5.32227 32.0996H5.2734C4.78514 32.0996 4.38477 31.6992 4.38477 31.2109V29.8242C4.38477 29.3359 4.78514 28.9355 5.2734 28.9355H5.32227C5.81054 28.9355 6.21091 29.3359 6.21091 29.8242V31.2109C6.21099 31.6991 5.82038 32.0996 5.32227 32.0996ZM5.27349 29.5214C5.10745 29.5214 4.97077 29.6581 4.97077 29.8241V31.2108C4.97077 31.3769 5.10745 31.5136 5.27349 31.5136H5.32235C5.48839 31.5136 5.62507 31.3769 5.62507 31.2108V29.8241C5.62507 29.6581 5.48839 29.5214 5.32235 29.5214H5.27349Z" fill="#E6EAFF"/><path d="M7.69532 32.0996H7.64645C7.15818 32.0996 6.75781 31.6992 6.75781 31.2109V29.8242C6.75781 29.3359 7.15818 28.9355 7.64645 28.9355H7.69532C8.18359 28.9355 8.58396 29.3359 8.58396 29.8242V31.2109C8.58404 31.6991 8.19343 32.0996 7.69532 32.0996ZM7.64653 29.5214C7.4805 29.5214 7.34382 29.6581 7.34382 29.8241V31.2108C7.34382 31.3769 7.4805 31.5136 7.64653 31.5136H7.6954C7.86144 31.5136 7.99812 31.3769 7.99812 31.2108V29.8241C7.99812 29.6581 7.86144 29.5214 7.6954 29.5214H7.64653Z" fill="#E6EAFF"/><path d="M10.0684 32.0996H10.0195C9.53123 32.0996 9.13086 31.6992 9.13086 31.2109V29.8242C9.13086 29.3359 9.53123 28.9355 10.0195 28.9355H10.0684C10.5566 28.9355 10.957 29.3359 10.957 29.8242V31.2109C10.957 31.6991 10.5566 32.0996 10.0684 32.0996ZM10.0195 29.5214C9.85346 29.5214 9.71678 29.6581 9.71678 29.8241V31.2108C9.71678 31.3769 9.85346 31.5136 10.0195 31.5136H10.0684C10.2344 31.5136 10.3711 31.3769 10.3711 31.2108V29.8241C10.3711 29.6581 10.2344 29.5214 10.0684 29.5214H10.0195Z" fill="#E6EAFF"/><path d="M12.4414 32.0996H12.3925C11.9043 32.0996 11.5039 31.6992 11.5039 31.2109V29.8242C11.5039 29.3359 11.9043 28.9355 12.3925 28.9355H12.4414C12.9297 28.9355 13.3301 29.3359 13.3301 29.8242V31.2109C13.3301 31.6991 12.9297 32.0996 12.4414 32.0996ZM12.3925 29.5214C12.2265 29.5214 12.0898 29.6581 12.0898 29.8241V31.2108C12.0898 31.3769 12.2265 31.5136 12.3925 31.5136H12.4414C12.6074 31.5136 12.7441 31.3769 12.7441 31.2108V29.8241C12.7441 29.6581 12.6074 29.5214 12.4414 29.5214H12.3925Z" fill="#E6EAFF"/><path d="M16.084 32.0996H16.0351C15.5469 32.0996 15.1465 31.6992 15.1465 31.2109V29.8242C15.1465 29.3359 15.5469 28.9355 16.0351 28.9355H16.084C16.5723 28.9355 16.9726 29.3359 16.9726 29.8242V31.2109C16.9727 31.6991 16.5723 32.0996 16.084 32.0996ZM16.0352 29.5214C15.8692 29.5214 15.7325 29.6581 15.7325 29.8241V31.2108C15.7325 31.3769 15.8692 31.5136 16.0352 31.5136H16.0841C16.2501 31.5136 16.3868 31.3769 16.3868 31.2108V29.8241C16.3868 29.6581 16.2501 29.5214 16.0841 29.5214H16.0352Z" fill="#E6EAFF"/><path d="M18.457 32.0996H18.4082C17.9199 32.0996 17.5195 31.6992 17.5195 31.2109V29.8242C17.5195 29.3359 17.9199 28.9355 18.4082 28.9355H18.457C18.9453 28.9355 19.3457 29.3359 19.3457 29.8242V31.2109C19.3458 31.6991 18.9453 32.0996 18.457 32.0996ZM18.4083 29.5214C18.2422 29.5214 18.1055 29.6581 18.1055 29.8241V31.2108C18.1055 31.3769 18.2422 31.5136 18.4083 31.5136H18.4571C18.6232 31.5136 18.7598 31.3769 18.7598 31.2108V29.8241C18.7598 29.6581 18.6232 29.5214 18.4571 29.5214H18.4083Z" fill="#E6EAFF"/><path d="M20.8301 32.0996H20.7812C20.2929 32.0996 19.8926 31.6992 19.8926 31.2109V29.8242C19.8926 29.3359 20.2929 28.9355 20.7812 28.9355H20.8301C21.3184 28.9355 21.7187 29.3359 21.7187 29.8242V31.2109C21.7188 31.6991 21.3184 32.0996 20.8301 32.0996ZM20.7813 29.5214C20.6153 29.5214 20.4786 29.6581 20.4786 29.8241V31.2108C20.4786 31.3769 20.6153 31.5136 20.7813 31.5136H20.8302C20.9962 31.5136 21.1329 31.3769 21.1329 31.2108V29.8241C21.1329 29.6581 20.9962 29.5214 20.8302 29.5214H20.7813Z" fill="#E6EAFF"/><path d="M23.2031 32.0996H23.1543C22.666 32.0996 22.2656 31.6992 22.2656 31.2109V29.8242C22.2656 29.3359 22.666 28.9355 23.1543 28.9355H23.2031C23.6914 28.9355 24.0918 29.3359 24.0918 29.8242V31.2109C24.0919 31.6991 23.6915 32.0996 23.2031 32.0996ZM23.1543 29.5214C22.9883 29.5214 22.8516 29.6581 22.8516 29.8241V31.2108C22.8516 31.3769 22.9883 31.5136 23.1543 31.5136H23.2032C23.3692 31.5136 23.5059 31.3769 23.5059 31.2108V29.8241C23.5059 29.6581 23.3692 29.5214 23.2032 29.5214H23.1543Z" fill="#E6EAFF"/><path d="M26.8457 32.0996H26.7968C26.3086 32.0996 25.9082 31.6992 25.9082 31.2109V29.8242C25.9082 29.3359 26.3086 28.9355 26.7968 28.9355H26.8457C27.334 28.9355 27.7343 29.3359 27.7343 29.8242V31.2109C27.7343 31.6991 27.334 32.0996 26.8457 32.0996ZM26.7968 29.5214C26.6308 29.5214 26.4941 29.6581 26.4941 29.8241V31.2108C26.4941 31.3769 26.6308 31.5136 26.7968 31.5136H26.8457C27.0117 31.5136 27.1484 31.3769 27.1484 31.2108V29.8241C27.1484 29.6581 27.0117 29.5214 26.8457 29.5214H26.7968Z" fill="#CAD4FF"/><path d="M29.2187 32.0996H29.1699C28.6816 32.0996 28.2812 31.6992 28.2812 31.2109V29.8242C28.2812 29.3359 28.6816 28.9355 29.1699 28.9355H29.2187C29.7069 28.9355 30.1073 29.3359 30.1073 29.8242V31.2109C30.1073 31.6991 29.7069 32.0996 29.2187 32.0996ZM29.1699 29.5214C29.0039 29.5214 28.8672 29.6581 28.8672 29.8241V31.2108C28.8672 31.3769 29.0039 31.5136 29.1699 31.5136H29.2187C29.3847 31.5136 29.5214 31.3769 29.5214 31.2108V29.8241C29.5214 29.6581 29.3847 29.5214 29.2187 29.5214H29.1699Z" fill="#CAD4FF"/><path d="M31.5918 32.0996H31.5429C31.0547 32.0996 30.6543 31.6992 30.6543 31.2109V29.8242C30.6543 29.3359 31.0547 28.9355 31.5429 28.9355H31.5918C32.0801 28.9355 32.4804 29.3359 32.4804 29.8242V31.2109C32.4805 31.6991 32.0801 32.0996 31.5918 32.0996ZM31.543 29.5214C31.377 29.5214 31.2403 29.6581 31.2403 29.8241V31.2108C31.2403 31.3769 31.377 31.5136 31.543 31.5136H31.5919C31.7579 31.5136 31.8946 31.3769 31.8946 31.2108V29.8241C31.8946 29.6581 31.7579 29.5214 31.5919 29.5214H31.543Z" fill="#CAD4FF"/><path d="M33.9648 32.0996H33.916C33.4277 32.0996 33.0273 31.6992 33.0273 31.2109V29.8242C33.0273 29.3359 33.4277 28.9355 33.916 28.9355H33.9648C34.4531 28.9355 34.8535 29.3359 34.8535 29.8242V31.2109C34.8536 31.6991 34.4531 32.0996 33.9648 32.0996ZM33.9161 29.5214C33.75 29.5214 33.6133 29.6581 33.6133 29.8241V31.2108C33.6133 31.3769 33.75 31.5136 33.9161 31.5136H33.9649C34.131 31.5136 34.2676 31.3769 34.2676 31.2108V29.8241C34.2676 29.6581 34.131 29.5214 33.9649 29.5214H33.9161Z" fill="#CAD4FF"/><path d="M37.6074 32.0996H37.5586C37.0703 32.0996 36.6699 31.6992 36.6699 31.2109V29.8242C36.6699 29.3359 37.0703 28.9355 37.5586 28.9355H37.6074C38.0957 28.9355 38.4961 29.3359 38.4961 29.8242V31.2109C38.4961 31.6991 38.0957 32.0996 37.6074 32.0996ZM37.5586 29.5214C37.3925 29.5214 37.2558 29.6581 37.2558 29.8241V31.2108C37.2558 31.3769 37.3925 31.5136 37.5586 31.5136H37.6074C37.7735 31.5136 37.9101 31.3769 37.9101 31.2108V29.8241C37.9101 29.6581 37.7735 29.5214 37.6074 29.5214H37.5586Z" fill="#CAD4FF"/><path d="M39.9804 32.0996H39.9316C39.4433 32.0996 39.043 31.6992 39.043 31.2109V29.8242C39.043 29.3359 39.4433 28.9355 39.9316 28.9355H39.9804C40.4687 28.9355 40.869 29.3359 40.869 29.8242V31.2109C40.869 31.6991 40.4687 32.0996 39.9804 32.0996ZM39.9315 29.5214C39.7655 29.5214 39.6288 29.6581 39.6288 29.8241V31.2108C39.6288 31.3769 39.7655 31.5136 39.9315 31.5136H39.9803C40.1463 31.5136 40.283 31.3769 40.283 31.2108V29.8241C40.283 29.6581 40.1463 29.5214 39.9803 29.5214H39.9315Z" fill="#CAD4FF"/><path d="M42.3535 32.0996H42.3047C41.8164 32.0996 41.416 31.6992 41.416 31.2109V29.8242C41.416 29.3359 41.8164 28.9355 42.3047 28.9355H42.3535C42.8418 28.9355 43.2422 29.3359 43.2422 29.8242V31.2109C43.2422 31.6991 42.8418 32.0996 42.3535 32.0996ZM42.3047 29.5214C42.1387 29.5214 42.002 29.6581 42.002 29.8241V31.2108C42.002 31.3769 42.1387 31.5136 42.3047 31.5136H42.3536C42.5196 31.5136 42.6563 31.3769 42.6563 31.2108V29.8241C42.6563 29.6581 42.5196 29.5214 42.3536 29.5214H42.3047Z" fill="#CAD4FF"/><path d="M44.7266 32.0996H44.6777C44.1894 32.0996 43.7891 31.6992 43.7891 31.2109V29.8242C43.7891 29.3359 44.1894 28.9355 44.6777 28.9355H44.7266C45.2148 28.9355 45.6152 29.3359 45.6152 29.8242V31.2109C45.6153 31.6991 45.2148 32.0996 44.7266 32.0996ZM44.6778 29.5214C44.5117 29.5214 44.3751 29.6581 44.3751 29.8241V31.2108C44.3751 31.3769 44.5117 31.5136 44.6778 31.5136H44.7267C44.8927 31.5136 45.0294 31.3769 45.0294 31.2108V29.8241C45.0294 29.6581 44.8927 29.5214 44.7267 29.5214H44.6778Z" fill="#CAD4FF"/></g><defs><clipPath id="clip0_1335_1776"><rect width="50" height="50" fill="white"/></clipPath></defs></svg>',
        'paypal': '<svg width="36" height="36" viewBox="0 0 30.55 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M27.5 9.15s-.85.45-.89.68c-1.44 7.57-5.73 9.65-12.17 9.65h-3.29c-.81 0-1.92 1.13-2.05 1.9l-1.7 9.9.47.78-.45 3.06c-.09.45.22.9.72.95h5.81c.68 0 1.26-.5 1.4-1.17l.04-.32s1.08-6.93 1.08-6.94c.13-.81.58-1.53 1.49-1.53h.86c5.63 0 10.05-2.3 11.35-8.92.54-2.75.27-5.09-1.17-6.71a6.5 6.5 0 0 0-1.45-1.29Z" fill="#009BD9"/><path d="M26.08 7.68a15.8 15.8 0 0 0-4.44-.52h-8.79c-.68 0-1.86.89-1.99 1.57L8.87 20.95l.7.36c.13-.77.81-1.35 1.58-1.35h3.29c6.44 0 11.46-2.6 12.95-10.17.04-.23.07-.39.12-.64 0 0-.47-1.06-.86-1.26-.18-.08-.37-.15-.56-.2Z" fill="#192A67"/><path d="M11.5 9.19c.09-.68.68-1.17 1.4-1.17h8.74c1.04 0 2.03.09 2.88.23.59.09 1.17.23 1.76.41.45.14.86.32 1.22.5.45-2.79 0-4.69-1.53-6.44C24.34.81 21.33 0 17.45 0H6.28c-.77 0-1.44.59-1.58 1.35L.01 30.91c-.09.54.28 1.04.82 1.08h6.84l1.76-11.01L11.5 9.2Z" fill="#0A3B82"/></svg>',
        'phone': '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none"><path d="M49.1957 26.8205C49.273 28.6665 48.6149 30.4678 47.3657 31.8291C46.1166 33.1905 44.3785 34.0008 42.5326 34.0822C42.4247 34.0872 42.317 34.0897 42.2094 34.0897C41.719 34.0894 41.23 34.0363 40.7509 33.9314C39.3294 36.1262 37.4654 38.0002 35.2783 39.4334C33.0911 40.8666 30.6288 41.8275 28.049 42.2547C27.7439 43.1511 27.1352 43.9128 26.328 44.408C25.5209 44.9032 24.5661 45.1008 23.6287 44.9667C22.6913 44.8326 21.8303 44.3752 21.1943 43.6736C20.5584 42.972 20.1876 42.0702 20.146 41.1242C20.1044 40.1782 20.3947 39.2474 20.9666 38.4926C21.5385 37.7379 22.3561 37.2067 23.2781 36.9909C24.2001 36.7751 25.1686 36.8882 26.016 37.3106C26.8635 37.7331 27.5367 38.4384 27.9194 39.3046C31.5514 38.6329 34.8325 36.708 37.1909 33.8653C39.5493 31.0227 40.8354 27.4426 40.8251 23.749C40.8251 15.0229 33.726 7.92383 24.9999 7.92383C16.2739 7.92383 9.17473 15.0229 9.17473 23.749C9.17426 26.4473 9.86384 29.1008 11.178 31.4574C11.2225 31.5352 11.2559 31.6188 11.2773 31.7059C11.4042 32.0587 11.3906 32.4467 11.2394 32.7898C11.0881 33.1329 10.8107 33.4047 10.4647 33.5489C9.61726 33.9056 8.70711 34.0892 7.78772 34.0891C7.67951 34.0891 7.57108 34.0866 7.46242 34.0815C5.61739 33.9991 3.88035 33.1883 2.6322 31.827C1.38404 30.4658 0.726632 28.6651 0.804124 26.8198C0.835277 26.084 0.817894 25.4274 0.800902 24.7926C0.785081 24.1948 0.768577 23.5767 0.795726 22.9316C0.876749 21.1299 1.65177 19.4295 2.95847 18.1864C4.26517 16.9433 6.00218 16.2541 7.80569 16.263C10.7018 9.63682 17.3183 4.99414 24.9999 4.99414C32.6816 4.99414 39.2982 9.63682 42.1943 16.2631C43.9979 16.2528 45.7355 16.9415 47.0424 18.1846C48.3494 19.4277 49.1241 21.1286 49.204 22.9306C49.2313 23.5766 49.2149 24.1946 49.1989 24.7924C49.1821 25.4273 49.1646 26.0842 49.1957 26.8205ZM37.2856 23.749C37.2849 25.6312 36.8519 27.4881 36.02 29.1764C35.1881 30.8648 33.9796 32.3395 32.4876 33.4869C30.9956 34.6343 29.26 35.4237 27.4147 35.7943C25.5693 36.1648 23.6635 36.1066 21.8443 35.624L16.8715 38.4958C16.6206 38.6407 16.3324 38.7079 16.0432 38.689C15.7541 38.6701 15.4771 38.5658 15.2472 38.3894C15.0174 38.2131 14.845 37.9725 14.7518 37.6981C14.6587 37.4237 14.649 37.1279 14.724 36.848L15.9949 32.107C13.8903 29.8321 12.7192 26.8482 12.7148 23.749C12.7148 16.9729 18.2256 11.4605 24.9999 11.4605C31.7742 11.4605 37.2856 16.9729 37.2856 23.749ZM21.5844 23.749C21.5844 23.3605 21.4301 22.9879 21.1554 22.7132C20.8806 22.4385 20.5081 22.2842 20.1196 22.2842H20.1171C19.8275 22.2847 19.5446 22.3711 19.304 22.5324C19.0635 22.6937 18.8762 22.9226 18.7657 23.1903C18.6553 23.4581 18.6267 23.7525 18.6835 24.0365C18.7403 24.3204 18.88 24.5812 19.085 24.7858C19.29 24.9904 19.551 25.1296 19.8351 25.1859C20.1192 25.2422 20.4135 25.213 20.681 25.1021C20.9486 24.9911 21.1772 24.8034 21.338 24.5626C21.4988 24.3217 21.5847 24.0386 21.5847 23.749H21.5844ZM26.4651 23.749C26.4649 23.7011 26.4623 23.6532 26.4573 23.6055C26.4526 23.5576 26.4455 23.51 26.4359 23.4629C26.4271 23.416 26.4153 23.3696 26.4006 23.3242C26.387 23.2783 26.3704 23.2334 26.3529 23.1885C26.3353 23.1436 26.3138 23.1016 26.2913 23.0596C26.269 23.0173 26.2446 22.9763 26.2181 22.9365C26.1914 22.8964 26.1627 22.8576 26.1321 22.8203C26.102 22.783 26.0697 22.7474 26.0355 22.7139C26.0023 22.6797 25.9661 22.6475 25.929 22.6162C25.8918 22.5869 25.8528 22.5576 25.8127 22.5312C25.773 22.5048 25.732 22.4803 25.6898 22.458C25.6477 22.4355 25.6038 22.415 25.5598 22.3965C25.5158 22.3781 25.4709 22.3621 25.4251 22.3486C25.3338 22.3193 25.2394 22.3003 25.1439 22.292C25.0004 22.2782 24.8557 22.2851 24.7142 22.3125C24.6671 22.3221 24.6205 22.3342 24.5746 22.3486C24.5289 22.3621 24.4839 22.378 24.4399 22.3965C24.3959 22.415 24.352 22.4355 24.31 22.458C24.268 22.4805 24.227 22.5049 24.1868 22.5312C24.1467 22.5576 24.1077 22.5869 24.0717 22.6162C24.0336 22.6475 23.9985 22.6797 23.9643 22.7139C23.93 22.7475 23.8977 22.783 23.8675 22.8203C23.8373 22.8576 23.8089 22.8964 23.7826 22.9365C23.7558 22.9762 23.731 23.0173 23.7084 23.0596C23.6859 23.1014 23.6656 23.1444 23.6478 23.1885C23.6292 23.2329 23.6129 23.2782 23.5989 23.3242C23.5854 23.3691 23.5737 23.416 23.5639 23.4629C23.5542 23.51 23.547 23.5576 23.5423 23.6055C23.5375 23.6533 23.5355 23.7012 23.5355 23.749C23.5355 23.7969 23.5375 23.8457 23.5423 23.8936C23.5471 23.9411 23.5543 23.9883 23.5639 24.0352C23.5737 24.082 23.5854 24.1289 23.5989 24.1748C23.6129 24.2205 23.6292 24.2655 23.6478 24.3096C23.6656 24.3539 23.6859 24.3973 23.7084 24.4395C23.7308 24.4814 23.7563 24.5225 23.7826 24.5625C23.8089 24.6023 23.8373 24.6408 23.8675 24.6777C23.8979 24.7151 23.9302 24.751 23.9643 24.7852C23.9985 24.8184 24.0336 24.8516 24.0717 24.8818C24.1084 24.9123 24.1469 24.9407 24.1868 24.9668C24.227 24.9932 24.2679 25.0186 24.31 25.041C24.3948 25.0852 24.4834 25.1218 24.5746 25.1504C24.6204 25.1641 24.6673 25.1758 24.7142 25.1855C24.8083 25.2048 24.9042 25.2143 25.0003 25.2139C25.3884 25.2128 25.7603 25.0588 26.0355 24.7852C26.103 24.7166 26.1641 24.6421 26.2181 24.5625C26.2445 24.5225 26.2689 24.4814 26.2913 24.4395C26.3138 24.3975 26.3343 24.3535 26.3529 24.3096C26.3714 24.2656 26.387 24.2197 26.4006 24.1748C26.4152 24.129 26.427 24.0824 26.4359 24.0352C26.4454 23.9884 26.4526 23.9411 26.4573 23.8936C26.4622 23.8455 26.4648 23.7972 26.4648 23.7488L26.4651 23.749ZM31.3479 23.749C31.3479 23.3605 31.1935 22.9879 30.9188 22.7132C30.6441 22.4385 30.2715 22.2842 29.883 22.2842H29.8802C29.5906 22.2847 29.3077 22.3711 29.0672 22.5324C28.8266 22.6937 28.6393 22.9227 28.5289 23.1904C28.4184 23.4581 28.3898 23.7526 28.4467 24.0365C28.5035 24.3205 28.6433 24.5812 28.8482 24.7858C29.0532 24.9904 29.3142 25.1296 29.5983 25.1859C29.8824 25.2422 30.1768 25.213 30.4443 25.1021C30.7118 24.9911 30.9404 24.8034 31.1012 24.5626C31.262 24.3217 31.3479 24.0386 31.3479 23.749Z" fill="#4A4A4A"/></svg>',
        'apple-pay': '<svg width="50" height="21" viewBox="0 0 50 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.37 2.78A3.14 3.14 0 0 0 10.1.65 3.2 3.2 0 0 0 7.97 1.75a3 3 0 0 0-.76 2.06c.81.06 1.56-.37 2.16-1.03Zm.72 1.08c-1.2-.07-2.22.68-2.78.68-.57 0-1.43-.64-2.37-.62A3.5 3.5 0 0 0 2 5.55c-1.27 2.2-.33 5.46.9 7.25.61.88 1.33 1.87 2.28 1.83.9-.04 1.26-.58 2.35-.58s1.42.58 2.37.56c.99-.02 1.6-.88 2.2-1.77a7.8 7.8 0 0 0 1-2.05 3.2 3.2 0 0 1-1.92-2.93 3.24 3.24 0 0 1 1.54-2.72 3.33 3.33 0 0 0-2.63-1.28Zm8.15-1.5v12.2h1.89V10h2.61c2.38 0 4.05-1.64 4.05-4.07s-1.64-4.03-3.98-4.03h-4.57v2.46Zm1.89 1.56h2.17c1.64 0 2.57.87 2.57 2.4s-.93 2.41-2.58 2.41h-2.16V3.92Zm10.92 10.9c1.19 0 2.29-.6 2.79-1.56h.04v1.46h1.75V9.01c0-1.75-1.4-2.88-3.56-2.88-2 0-3.46 1.15-3.52 2.72h1.7c.14-.75.83-1.24 1.75-1.24 1.13 0 1.76.52 1.76 1.49v.65l-2.3.14c-2.14.13-3.3 1.01-3.3 2.53 0 1.54 1.19 2.57 2.89 2.57Zm.5-1.42c-.98 0-1.61-.47-1.61-1.2 0-.75.6-1.18 1.75-1.25l2.05-.13v.67c0 1.12-.95 1.91-2.19 1.91Zm5.37 4.56c1.84 0 2.71-.7 3.47-2.84l3.32-9.33h-1.93l-2.23 7.17h-.04l-2.23-7.17h-1.98l3.2 8.85-.17.54c-.29.92-.76 1.27-1.6 1.27-.15 0-.44-.02-.56-.03v1.48c.11.04.48.06.75.06Z" fill="#000"/></svg>',
        'google-pay': '<svg width="50" height="20" viewBox="0 0 50 19.62" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.34 9.54V15.32H21.5V1.04h4.87c1.23 0 2.28.41 3.14 1.23.88.82 1.32 1.83 1.32 3.01 0 1.21-.44 2.22-1.32 3.03-.85.81-1.9 1.21-3.14 1.21h-3.03v.02Zm0-6.74v4.98h3.07c.73 0 1.34-.25 1.82-.74.49-.49.74-1.08.74-1.74 0-.66-.25-1.24-.74-1.73-.48-.5-1.08-.75-1.82-.75h-3.07v-.02Z" fill="#383E41"/><path d="M35.63 5.23c1.36 0 2.43.36 3.21 1.09.78.73 1.18 1.72 1.18 2.98v6.02h-1.75v-1.36h-.08c-.76 1.12-1.77 1.67-3.03 1.67-1.08 0-1.98-.32-2.7-.96-.73-.64-1.1-1.43-1.1-2.39 0-1.01.38-1.82 1.15-2.41.76-.6 1.79-.9 3.06-.9 1.09 0 1.99.2 2.69.6v-.42c0-.64-.25-1.18-.76-1.63-.5-.45-1.1-.67-1.77-.67-1.02 0-1.84.43-2.43 1.3l-1.62-1.01c.89-1.29 2.21-1.93 3.95-1.93Zm-2.37 7.09c0 .48.2.88.61 1.2.4.31.88.48 1.43.48.77 0 1.46-.29 2.06-.86.6-.57.91-1.24.91-2.02-.57-.45-1.36-.68-2.39-.68-.75 0-1.37.18-1.87.54-.49.37-.75.82-.75 1.34Z" fill="#383E41"/><path d="M50 5.54l-6.12 14.07h-1.99l2.28-4.92-4.03-9.15h2l2.91 7.02h.04l2.83-7.02H50Z" fill="#383E41"/><path d="M15.88 6.65H8.19v3.16h4.43c-.18 1.05-.76 1.95-1.64 2.54l2.64.16c1.54-1.43 2.42-3.53 2.42-6.02 0-.6-.05-1.17-.16-1.72Z" fill="#0085F7"/><path d="M10.98 12.35c-.74.5-1.68.78-2.79.78-2.14 0-3.95-1.44-4.6-3.38l2.27-.36.45 2.47c1.35 2.68 4.12 4.51 7.32 4.51 2.21 0 4.07-.73 5.42-1.98l-2.65-2.04h-.04Z" fill="#00A94B"/><path d="M3.34 8.19c0-.55.09-1.07.26-1.57L.87 4.51A8.19 8.19 0 0 0 0 8.19c0 1.32.31 2.57.87 3.68l2.72-2.11c-.17-.5-.25-1.02-.25-1.57Z" fill="#FFBB00"/><path d="M8.19 0C4.99 0 2.22 1.84.87 4.51l2.72 2.11C4.24 4.68 6.05 3.24 8.19 3.24c1.21 0 2.29.42 3.14 1.23l2.34-2.34C12.25.81 10.4 0 8.19 0Z" fill="#FF4031"/></svg>'
      };
      
      container.innerHTML = paymentMethods.map((method, idx) => {
        const name = isRTL ? method.name : method.nameEn;
        var iconKey = (method.icon || '').toLowerCase().replace(/[\s_]+/g, '-');
        var icon = paymentIcons[iconKey] || '';
        
        return '<label class="payment-option' + (idx === 0 ? ' selected' : '') + '" data-method-id="' + method.id + '">' +
          '<input type="radio" name="payment" value="' + method.id + '"' + (idx === 0 ? ' checked' : '') + ' onchange="window.zappySelectPayment(this.value)">' +
          '<div class="payment-name">' + name + '</div>' +
          (icon ? '<div class="payment-icon">' + icon + '</div>' : '') +
        '</label>';
      }).join('');
      
      // Auto-select first option
      if (paymentMethods.length > 0) {
        selectedPaymentMethod = paymentMethods[0];
        updatePlaceOrderState();
      }
    } catch (e) {
      console.error('Failed to load payment methods', e);
      container.innerHTML = '<div class="error">' + (t.errorLoading || 'Error loading options') + '</div>';
    }
  }
  
  // Select payment method
  window.zappySelectPayment = function(methodId) {
    selectedPaymentMethod = paymentMethods.find(m => m.id === methodId);
    document.querySelectorAll('.payment-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.methodId === methodId);
    });
    updatePlaceOrderState();
  };
  
  // Inline validation helper functions
  function showFieldError(inputId, errorId, message) {
    var input = document.getElementById(inputId);
    var errorEl = document.getElementById(errorId);
    if (input) {
      input.classList.add('input-error');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }
  
  function clearFieldError(inputId, errorId) {
    var input = document.getElementById(inputId);
    var errorEl = document.getElementById(errorId);
    if (input) {
      input.classList.remove('input-error');
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }
  
  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(el) {
      el.textContent = '';
      el.classList.remove('visible');
    });
    document.querySelectorAll('.input-error').forEach(function(el) {
      el.classList.remove('input-error');
    });
    document.querySelectorAll('.has-error').forEach(function(el) {
      el.classList.remove('has-error');
    });
  }
  
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  // Initialize checkout / place order button
  function initCheckout() {
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (!placeOrderBtn) return;
    
    // Add real-time validation - clear errors when user types and update Place Order state
    var fieldsToWatch = ['customer-name', 'customer-email', 'customer-phone', 'shipping-street', 'shipping-city'];
    fieldsToWatch.forEach(function(fieldId) {
      var field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', function() {
          clearFieldError(fieldId, fieldId + '-error');
          updatePlaceOrderState();
        });
      }
    });
    
    // Check first-order discount when email is entered
    var emailFieldForFirstOrder = document.getElementById('customer-email');
    if (emailFieldForFirstOrder) {
      emailFieldForFirstOrder.addEventListener('blur', function() {
        var em = emailFieldForFirstOrder.value.trim();
        if (em && isValidEmail(em)) {
          checkFirstOrderDiscount(em);
        }
      });
    }

    // shipping-state is a <select>, so use 'change' instead of 'input'
    var stateSelect = document.getElementById('shipping-state');
    if (stateSelect) {
      stateSelect.addEventListener('change', function() {
        clearFieldError('shipping-state', 'shipping-state-error');
        updatePlaceOrderState();
      });
    }
    
    // Clear terms error when checkbox changes and update Place Order state
    var termsCheckbox = document.getElementById('terms-checkbox');
    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', function() {
        var wrapper = document.querySelector('.terms-checkbox-wrapper');
        if (wrapper) wrapper.classList.remove('has-error');
        clearFieldError('', 'terms-checkbox-error');
        updatePlaceOrderState();
      });
    }
    
    updatePlaceOrderState();
    
    placeOrderBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      // Clear all previous errors first
      clearAllFieldErrors();
      
      var hasErrors = false;
      var firstErrorField = null;
      
      // Validate cart
      if (!cart || cart.length === 0) {
        alert(t.cartEmpty || (isRTL ? 'העגלה ריקה' : 'Your cart is empty'));
        return;
      }
      
      // Get customer info
      const customerName = document.getElementById('customer-name')?.value?.trim() || '';
      const customerEmailRaw = document.getElementById('customer-email')?.value || '';
      const customerEmail = sanitizeEmail(customerEmailRaw);
      const customerPhone = document.getElementById('customer-phone')?.value?.trim() || '';
      
      // Validate customer name
      if (!customerName) {
        showFieldError('customer-name', 'customer-name-error', getEcomText('nameRequired', t.nameRequired || (isRTL ? 'נא להזין שם מלא' : 'Please enter your full name')));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-name';
      }
      
      // Validate customer email
      if (!customerEmailRaw.trim()) {
        showFieldError('customer-email', 'customer-email-error', getEcomText('emailRequired', t.emailRequired || (isRTL ? 'נא להזין כתובת אימייל' : 'Please enter your email address')));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-email';
      } else if (!isValidEmail(customerEmailRaw.trim())) {
        showFieldError('customer-email', 'customer-email-error', getEcomText('emailInvalid', t.emailInvalid || (isRTL ? 'כתובת אימייל לא תקינה' : 'Please enter a valid email address')));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-email';
      }
      
      // Validate customer phone
      if (!customerPhone) {
        showFieldError('customer-phone', 'customer-phone-error', getEcomText('phoneRequired', t.phoneRequired || (isRTL ? 'נא להזין מספר טלפון' : 'Please enter your phone number')));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-phone';
      }
      
      // Validate shipping method
      if (!selectedShipping) {
        var shippingError = document.getElementById('shipping-method-error');
        if (shippingError) {
          shippingError.textContent = getEcomText('shippingRequired', t.shippingRequired || (isRTL ? 'נא לבחור שיטת משלוח' : 'Please select a shipping method'));
          shippingError.classList.add('visible');
        }
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'shipping-methods';
      }
      
      // Get shipping address
      const shippingCountry = document.getElementById('shipping-country')?.value?.trim() || '';
      const shippingState = document.getElementById('shipping-state')?.value?.trim() || '';
      const shippingStreet = document.getElementById('shipping-street')?.value?.trim() || '';
      const shippingApartment = document.getElementById('shipping-apartment')?.value?.trim() || '';
      const shippingCity = document.getElementById('shipping-city')?.value?.trim() || '';
      const shippingZip = document.getElementById('shipping-zip')?.value?.trim() || '';
      
      // Validate shipping address (unless it's pickup)
      if (selectedShipping && !selectedShipping.is_pickup) {
        if (!shippingStreet) {
          showFieldError('shipping-street', 'shipping-street-error', getEcomText('streetRequired', t.streetRequired || (isRTL ? 'נא להזין רחוב ומספר' : 'Please enter your street address')));
          hasErrors = true;
          if (!firstErrorField) firstErrorField = 'shipping-street';
        }
        if (!shippingCity) {
          showFieldError('shipping-city', 'shipping-city-error', getEcomText('cityRequired', t.cityRequired || (isRTL ? 'נא להזין עיר' : 'Please enter your city')));
          hasErrors = true;
          if (!firstErrorField) firstErrorField = 'shipping-city';
        }
        var stateWrapperEl = document.getElementById('state-wrapper');
        if (stateWrapperEl && stateWrapperEl.style.display !== 'none' && !shippingState) {
          showFieldError('shipping-state', 'shipping-state-error', getEcomText('stateRequired', t.stateRequired || (isRTL ? 'נא לבחור מדינה / מחוז' : 'Please select a state / province')));
          hasErrors = true;
          if (!firstErrorField) firstErrorField = 'shipping-state';
        }
      }
      
      // Validate payment is configured
      if (!isPaymentConfigured || !selectedPaymentMethod) {
        alert(t.paymentNotConfigured || (isRTL ? 'תשלום מקוון לא מוגדר. צרו קשר עם בעל האתר.' : 'Online payment not configured. Please contact the store owner.'));
        return;
      }
      
      // Validate terms and conditions checkbox - MUST be checked to proceed
      var termsBox = document.getElementById('terms-checkbox');
      if (!termsBox || !termsBox.checked) {
        var termsWrapper = document.querySelector('.terms-checkbox-wrapper');
        if (termsWrapper) termsWrapper.classList.add('has-error');
        var termsErrorEl = document.getElementById('terms-checkbox-error');
        if (termsErrorEl) {
          termsErrorEl.textContent = getEcomText('pleaseAcceptTerms', t.pleaseAcceptTerms || (isRTL ? 'נא לאשר את תנאי השימוש' : 'Please accept the terms and conditions'));
          termsErrorEl.classList.add('visible');
        }
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'terms-checkbox';
      }
      
      // If there are errors, scroll to first error and stop
      if (hasErrors) {
        if (firstErrorField) {
          var errorElement = document.getElementById(firstErrorField);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (errorElement.focus) errorElement.focus();
          }
        }
        console.log('[E-COMMERCE] Validation failed, stopping checkout');
        return;
      }
      
      // Disable button and show loading
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML = isRTL ? 'מעבד...' : 'Processing...';
      
      // Save address if checkbox is checked and user is logged in
      const saveAddressCheckbox = document.getElementById('save-address-checkbox');
      const tokenKey = 'zappy_customer_token_' + websiteId;
      const customerToken = localStorage.getItem(tokenKey);
      
      if (saveAddressCheckbox && saveAddressCheckbox.checked && customerToken && shippingStreet && shippingCity) {
        try {
          // First get the current customer data to preserve existing addresses
          const customerRes = await fetch(buildApiUrl('/api/ecommerce/customers/me?websiteId=' + encodeURIComponent(websiteId)), {
            headers: { 'Authorization': 'Bearer ' + customerToken }
          });
          
          if (customerRes.ok) {
            const customerData = await customerRes.json();
            if (customerData.success && customerData.data) {
              const existingAddresses = customerData.data.addresses || [];
              
              // Create new address object
              const newAddress = {
                id: 'addr_' + Date.now(),
                label: 'home',
                country: shippingCountry || '',
                state: shippingState || '',
                street: shippingStreet,
                apartment: shippingApartment || '',
                city: shippingCity,
                zip: shippingZip || '',
                isDefault: true
              };
              
              // Mark all existing addresses as not default
              const updatedAddresses = existingAddresses.map(function(addr) {
                return Object.assign({}, addr, { isDefault: false });
              });
              
              // Check if an address with the same street and city already exists
              const existingIndex = updatedAddresses.findIndex(function(addr) {
                return addr.street === newAddress.street && addr.city === newAddress.city;
              });
              
              if (existingIndex >= 0) {
                // Update existing address and set as default
                updatedAddresses[existingIndex] = Object.assign({}, updatedAddresses[existingIndex], {
                  country: newAddress.country,
                  state: newAddress.state,
                  apartment: newAddress.apartment,
                  zip: newAddress.zip,
                  isDefault: true
                });
              } else {
                // Add new address at the beginning
                updatedAddresses.unshift(newAddress);
              }
              
              // Save updated addresses
              await fetch(buildApiUrl('/api/ecommerce/customers/me'), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + customerToken
                },
                body: JSON.stringify({
                  websiteId: websiteId,
                  addresses: updatedAddresses
                })
              });
              console.log('[E-COMMERCE] Address saved for next time');
            }
          }
        } catch (saveErr) {
          // Don't block checkout if address save fails
          console.warn('[E-COMMERCE] Failed to save address:', saveErr);
        }
      }
      
      try {
        // Get or create session ID for cart
        let sessionId = localStorage.getItem('zappy_session_id');
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
          localStorage.setItem('zappy_session_id', sessionId);
        }
        const checkoutCart = getCartPayload();
        
        // Initialize checkout
        const res = await fetch(buildApiUrl('/api/ecommerce/checkout/init'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId: websiteId,
            sessionId: sessionId,
            customerEmail: customerEmail,
            customerName: customerName,
            customerPhone: customerPhone,
            shippingAddress: {
              country: shippingCountry,
              state: shippingState,
              street: shippingStreet,
              apartment: shippingApartment,
              city: shippingCity,
              zip: shippingZip
            },
            shippingMethodId: selectedShipping.id,
            shippingCost: selectedShipping.price || 0,
            shippingMethodName: selectedShipping.name || 'משלוח',
            cart: checkoutCart,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            couponDiscount: couponDiscount + seasonalDiscount + firstOrderDiscount,
            paymentMethodId: selectedPaymentMethod ? selectedPaymentMethod.id : null
          })
        });
        
        const data = await res.json();
        
        if (!data.success || !data.data?.checkoutUrl) {
          throw new Error(data.error || 'Checkout initialization failed');
        }
        
        // Store pending order data in localStorage for order success page
        const reference = data.data.reference;
        if (reference) {
          // Ensure numeric values are properly parsed (shipping.price may be string from DB)
          const subtotalNum = getCartSubtotal();
          const shippingCostNum = parseFloat(selectedShipping.price) || 0;
          const discountNum = parseFloat(couponDiscount + seasonalDiscount + firstOrderDiscount) || 0;
          const pendingOrderData = {
            cartItems: checkoutCart,
            subtotal: subtotalNum,
            shippingCost: shippingCostNum,
            discount: discountNum,
            total: subtotalNum + shippingCostNum - discountNum,
            shippingMethodName: selectedShipping.name || '',
            shippingIsPickup: selectedShipping.is_pickup || false,
            paymentMethodName: selectedPaymentMethod ? (isRTL ? selectedPaymentMethod.name : selectedPaymentMethod.nameEn) : '',
            paymentStatus: data.data.paymentStatus || (data.data.provider === 'phone_payment' ? 'pending' : 'processing'),
            customerName: customerName,
            customerEmail: customerEmail,
            orderDate: new Date().toISOString()
          };
          localStorage.setItem('zappy_pending_order_' + reference, JSON.stringify(pendingOrderData));
        }
        
        // Check if provider is Green Invoice - show iframe instead of redirect
        if (data.data.provider === 'greeninvoice') {
          // Animate out the payment section and button
          const paymentSection = document.getElementById('checkout-payment-section');
          const iframeContainer = document.getElementById('greeninvoice-iframe-container');
          const iframe = document.getElementById('greeninvoice-iframe');
          
          if (paymentSection && iframeContainer && iframe) {
            // Add fade-out animation to payment section
            paymentSection.classList.add('fade-out');
            
            // Show loading state in iframe container
            iframeContainer.style.display = 'block';
            iframeContainer.querySelector('.greeninvoice-iframe-wrapper').innerHTML = '<div class="greeninvoice-loading"><div class="greeninvoice-loading-spinner"></div><span>' + (isRTL ? 'טוען עמוד תשלום...' : 'Loading payment page...') + '</span></div>';
            
            // Listen for postMessage from iframe in case direct redirect fails
            window.addEventListener('message', function(event) {
              if (event.data && event.data.type === 'zappy_order_success' && event.data.url) {
                window.location.href = event.data.url;
              }
            });
            
            // After animation, hide payment section and show iframe
            setTimeout(function() {
              paymentSection.style.display = 'none';
              
              // Create and show the iframe
              iframeContainer.querySelector('.greeninvoice-iframe-wrapper').innerHTML = '<iframe id="greeninvoice-iframe" src="' + data.data.checkoutUrl + '" frameborder="0" allowpaymentrequest="true" style="width: 100%; height: 600px; border: none;"></iframe>';
            }, 300);
            
            return; // Don't redirect
          }
        }
        
        // Redirect to payment page (iCount or fallback)
        window.location.href = data.data.checkoutUrl;
        
      } catch (error) {
        console.error('Checkout failed:', error);
        alert(isRTL ? 'שגיאה בתהליך התשלום. נסו שוב.' : 'Checkout failed. Please try again.');
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = t.placeOrder || (isRTL ? 'בצע הזמנה' : 'Place Order');
      }
    });
    
    initCheckoutCustomer();
    initCheckoutAccordion();
  }

  function initCheckoutCustomer() {
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    const phoneInput = document.getElementById('customer-phone');
    if (!nameInput || !emailInput) return;
    
    // Use site-specific localStorage keys for session isolation
    const tokenKey = 'zappy_customer_token_' + websiteId;
    const emailKey = 'zappy_customer_email_' + websiteId;
    const token = localStorage.getItem(tokenKey);
    const savedEmail = localStorage.getItem(emailKey);
    const loginPrompt = document.getElementById('checkout-login-prompt');
    const loginLink = document.getElementById('checkout-login-link');
    const loggedInEl = document.getElementById('checkout-logged-in');
    const loggedInNameEl = document.getElementById('checkout-logged-in-name');
    const loggedInEmailEl = document.getElementById('checkout-logged-in-email');
    const logoutBtn = document.getElementById('checkout-logout-btn');
    
    if (loginLink) {
      loginLink.addEventListener('click', function() {
        sessionStorage.setItem('zappy_login_return', '/checkout');
      });
    }
    
    const showLoggedIn = (name, email) => {
      if (loginPrompt) loginPrompt.style.display = 'none';
      if (loggedInEl) loggedInEl.style.display = 'flex';
      if (loggedInNameEl) loggedInNameEl.textContent = name || '';
      if (loggedInEmailEl) loggedInEmailEl.textContent = email ? '(' + email + ')' : '';
    };
    
    const showLoggedOut = () => {
      if (loggedInEl) loggedInEl.style.display = 'none';
      if (loginPrompt) loginPrompt.style.display = 'flex';
      if (loggedInNameEl) loggedInNameEl.textContent = '';
      if (loggedInEmailEl) loggedInEmailEl.textContent = '';
    };
    
    if (savedEmail && !emailInput.value) {
      emailInput.value = savedEmail;
    }
    
    if (!token) {
      showLoggedOut();
      return;
    }
    
    // Include websiteId for session isolation validation
    fetch(buildApiUrl('/api/ecommerce/customers/me?websiteId=' + encodeURIComponent(websiteId)), {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(function(data) {
        if (!data.success || !data.data) throw new Error('Invalid response');
        const customer = data.data;
        const displayName = customer.name || customer.email || savedEmail || '';
        showLoggedIn(displayName, customer.email || savedEmail || '');
        
        if (customer.name && !nameInput.value) nameInput.value = customer.name;
        if (customer.email && !emailInput.value) emailInput.value = customer.email;
        if (customer.phone && phoneInput && !phoneInput.value) phoneInput.value = customer.phone;
        
        // Auto-fill shipping address from customer's default address
        if (customer.addresses && customer.addresses.length > 0) {
          // Find default address, or use the first one
          const defaultAddress = customer.addresses.find(function(addr) { return addr.isDefault; }) || customer.addresses[0];

          const countryInput = document.getElementById('shipping-country');
          const stateInput = document.getElementById('shipping-state');
          const streetInput = document.getElementById('shipping-street');
          const apartmentInput = document.getElementById('shipping-apartment');
          const cityInput = document.getElementById('shipping-city');
          const zipInput = document.getElementById('shipping-zip');

          if (defaultAddress.country && countryInput && !countryInput.value) {
            countryInput.value = defaultAddress.country;
            if (typeof onCountryChange === 'function') onCountryChange(defaultAddress.country);
          }
          if (defaultAddress.state && stateInput) {
            setTimeout(function() { if (!stateInput.value) stateInput.value = defaultAddress.state; }, 50);
          }
          if (defaultAddress.street && streetInput && !streetInput.value) {
            streetInput.value = defaultAddress.street;
          }
          if (defaultAddress.apartment && apartmentInput && !apartmentInput.value) {
            apartmentInput.value = defaultAddress.apartment;
          }
          if (defaultAddress.city && cityInput && !cityInput.value) {
            cityInput.value = defaultAddress.city;
          }
          if (defaultAddress.zip && zipInput && !zipInput.value) {
            zipInput.value = defaultAddress.zip;
          }
        }
        updatePlaceOrderState();
      })
      .catch(function() {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(emailKey);
        showLoggedOut();
      });
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(emailKey);
        showLoggedOut();
      });
    }
  }
  
  // ── Checkout Accordion ──────────────────────────────────────────────────
  var checkoutStepsCompleted = { contact: false, shipping: false, payment: false };

  window.zappyToggleAccordion = function(step) {
    var panels = document.querySelectorAll('.checkout-accordion-panel');
    var targetPanel = document.querySelector('.checkout-accordion-panel[data-step="' + step + '"]');
    if (!targetPanel) return;
    var isExpanded = targetPanel.classList.contains('expanded');
    // Items can toggle independently; other panels are mutually exclusive
    if (step !== 'items') {
      panels.forEach(function(p) {
        if (p.dataset.step !== 'items') p.classList.remove('expanded');
      });
    }
    if (!isExpanded) {
      targetPanel.classList.add('expanded');
    } else if (step === 'items') {
      targetPanel.classList.remove('expanded');
    }
  };

  function initCheckoutAccordion() {
    var nextBtns = document.querySelectorAll('.checkout-next-btn');
    nextBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var panel = btn.closest('.checkout-accordion-panel');
        if (!panel) return;
        var currentStep = panel.dataset.step;
        var nextStep = btn.dataset.next;

        // Validate current step
        if (!validateAccordionStep(currentStep)) return;

        // Mark completed
        checkoutStepsCompleted[currentStep] = true;
        panel.classList.add('completed');
        panel.classList.remove('expanded');

        if (nextStep === 'done') {
          // All required steps done
          updatePlaceOrderState();
        } else {
          var nextPanel = document.querySelector('.checkout-accordion-panel[data-step="' + nextStep + '"]');
          if (nextPanel) {
            // Close others (except items)
            document.querySelectorAll('.checkout-accordion-panel').forEach(function(p) {
              if (p.dataset.step !== 'items') p.classList.remove('expanded');
            });
            nextPanel.classList.add('expanded');
            setTimeout(function() {
              nextPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        }
        updatePlaceOrderState();
      });
    });
    updateCheckoutItemsCount();
  }

  function validateAccordionStep(step) {
    clearAllFieldErrors();
    var hasErrors = false;
    var firstErrorField = null;

    if (step === 'contact') {
      var nameVal = (document.getElementById('customer-name') || {}).value || '';
      var emailVal = (document.getElementById('customer-email') || {}).value || '';
      var phoneVal = (document.getElementById('customer-phone') || {}).value || '';
      if (!nameVal.trim()) {
        showFieldError('customer-name', 'customer-name-error', getEcomText('nameRequired', t.nameRequired));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-name';
      }
      if (!emailVal.trim()) {
        showFieldError('customer-email', 'customer-email-error', getEcomText('emailRequired', t.emailRequired));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-email';
      } else if (!isValidEmail(emailVal.trim())) {
        showFieldError('customer-email', 'customer-email-error', getEcomText('emailInvalid', t.emailInvalid));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-email';
      }
      if (!phoneVal.trim()) {
        showFieldError('customer-phone', 'customer-phone-error', getEcomText('phoneRequired', t.phoneRequired));
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'customer-phone';
      }
    }

    if (step === 'shipping') {
      if (!selectedShipping) {
        var se = document.getElementById('shipping-method-error');
        if (se) { se.textContent = getEcomText('shippingRequired', t.shippingRequired); se.classList.add('visible'); }
        hasErrors = true;
        if (!firstErrorField) firstErrorField = 'shipping-methods';
      }
      if (selectedShipping && !selectedShipping.is_pickup) {
        var st = (document.getElementById('shipping-street') || {}).value || '';
        var ci = (document.getElementById('shipping-city') || {}).value || '';
        if (!st.trim()) {
          showFieldError('shipping-street', 'shipping-street-error', getEcomText('streetRequired', t.streetRequired));
          hasErrors = true;
          if (!firstErrorField) firstErrorField = 'shipping-street';
        }
        if (!ci.trim()) {
          showFieldError('shipping-city', 'shipping-city-error', getEcomText('cityRequired', t.cityRequired));
          hasErrors = true;
          if (!firstErrorField) firstErrorField = 'shipping-city';
        }
        var stW = document.getElementById('state-wrapper');
        var stV = (document.getElementById('shipping-state') || {}).value || '';
        if (stW && stW.style.display !== 'none' && !stV.trim()) {
          showFieldError('shipping-state', 'shipping-state-error', getEcomText('stateRequired', t.stateRequired));
          hasErrors = true;
          if (!firstErrorField) firstErrorField = 'shipping-state';
        }
      }
    }

    if (step === 'payment') {
      if (!isPaymentConfigured || !selectedPaymentMethod) {
        alert(t.paymentNotConfigured || 'Online payment not configured');
        return false;
      }
    }

    if (hasErrors && firstErrorField) {
      var el = document.getElementById(firstErrorField);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus(); }
    }
    return !hasErrors;
  }

  function updatePlaceOrderState() {
    var btn = document.getElementById('place-order-btn');
    if (!btn) return;

    var nameVal = (document.getElementById('customer-name') || {}).value || '';
    var emailVal = (document.getElementById('customer-email') || {}).value || '';
    var phoneVal = (document.getElementById('customer-phone') || {}).value || '';
    var contactOk = nameVal.trim() && emailVal.trim() && isValidEmail(emailVal.trim()) && phoneVal.trim();

    var shippingOk = !!selectedShipping;
    if (selectedShipping && !selectedShipping.is_pickup) {
      var streetVal = (document.getElementById('shipping-street') || {}).value || '';
      var cityVal = (document.getElementById('shipping-city') || {}).value || '';
      shippingOk = shippingOk && !!streetVal.trim() && !!cityVal.trim();
      var stateWrapper = document.getElementById('state-wrapper');
      var stateVal = (document.getElementById('shipping-state') || {}).value || '';
      if (stateWrapper && stateWrapper.style.display !== 'none') {
        shippingOk = shippingOk && !!stateVal.trim();
      }
    }

    var paymentOk = isPaymentConfigured && !!selectedPaymentMethod;

    var termsBox = document.getElementById('terms-checkbox');
    var termsOk = termsBox && termsBox.checked;

    btn.disabled = !(contactOk && shippingOk && paymentOk && termsOk);
  }

  function updateCheckoutItemsCount() {
    var countEl = document.getElementById('checkout-items-count');
    if (countEl && cart) {
      var total = cart.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
      countEl.textContent = '(' + total + ')';
    }
    var thumbs = document.getElementById('checkout-items-thumbs');
    if (thumbs && cart && cart.length > 0) {
      thumbs.innerHTML = cart.slice(0, 5).map(function(item) {
        var img = item.image || (item.images && item.images[0]) || '';
        return '<div class="checkout-thumb-item">' + (img ? '<img src="' + img + '" alt="' + (item.name || '') + '">' : '<div class="checkout-thumb-placeholder"></div>') + '</div>';
      }).join('') + (cart.length > 5 ? '<div class="checkout-thumb-more">+' + (cart.length - 5) + '</div>' : '');
    }
  }

  // Checkout item quantity change
  window.zappyCheckoutQty = function(idx, delta) {
    if (!cart || !cart[idx]) return;
    cart[idx].quantity = Math.max(1, (cart[idx].quantity || 1) + delta);
    saveCart();
    updateCartCount();
    updateOrderTotals();
    updateCheckoutItemsCount();
  };

  // Checkout item remove
  window.zappyCheckoutRemove = function(idx) {
    if (!cart) return;
    cart.splice(idx, 1);
    saveCart();
    updateCartCount();
    updateOrderTotals();
    updateCheckoutItemsCount();
  };

  // Coupon state
  let appliedCoupon = null;
  let couponDiscount = 0;

  // Seasonal discount state
  let seasonalDiscounts = [];
  let seasonalDiscount = 0;
  let seasonalFreeShipping = false;

  // First-order discount state
  let firstOrderDiscount = 0;
  let firstOrderFreeShipping = false;
  let firstOrderApplied = null;
  let firstOrderCheckedEmail = '';

  async function checkFirstOrderDiscount(email) {
    if (!email || email === firstOrderCheckedEmail) return;
    firstOrderCheckedEmail = email;
    firstOrderDiscount = 0;
    firstOrderFreeShipping = false;
    firstOrderApplied = null;
    try {
      var subtotal = getCartSubtotal();
      var res = await fetch(buildApiUrl('/api/ecommerce/storefront/first-order-discount'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId: websiteId, customerEmail: email, orderSubtotal: subtotal })
      });
      var data = await res.json();
      if (data.success && data.data) {
        firstOrderDiscount = data.data.totalDiscount || 0;
        firstOrderFreeShipping = data.data.freeShipping || false;
        firstOrderApplied = data.data.appliedDiscount || null;
      }
    } catch (e) {
      console.warn('[E-COMMERCE] Failed to check first-order discount', e);
    }
    updateOrderTotals();
  }

  async function fetchSeasonalDiscounts() {
    try {
      const res = await fetch(buildApiUrl('/api/ecommerce/storefront/seasonal-discounts?websiteId=' + websiteId));
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        seasonalDiscounts = data.data;
        updateOrderTotals();
      }
    } catch (e) {
      console.warn('[E-COMMERCE] Failed to load seasonal discounts', e);
    }
  }

  function getSeasonalDiscountForProduct(productId) {
    for (var i = 0; i < seasonalDiscounts.length; i++) {
      var d = seasonalDiscounts[i];
      var ids = Array.isArray(d.product_ids) ? d.product_ids : [];
      if (d.applies_to === 'all' || ids.length === 0 || ids.indexOf(productId) !== -1) {
        return d;
      }
    }
    return null;
  }

  function calcSeasonalCartDiscount() {
    seasonalDiscount = 0;
    seasonalFreeShipping = false;
    if (!seasonalDiscounts.length || !cart || !cart.length) return;

    for (var i = 0; i < seasonalDiscounts.length; i++) {
      var d = seasonalDiscounts[i];
      var ids = Array.isArray(d.product_ids) ? d.product_ids : [];
      var appliesToAll = d.applies_to === 'all' || ids.length === 0;

      var eligibleSubtotal = 0;
      for (var j = 0; j < cart.length; j++) {
        var item = cart[j];
        if (appliesToAll || ids.indexOf(item.id) !== -1) {
          eligibleSubtotal += getCartLineTotal(item);
        }
      }

      if (d.type === 'percentage' && eligibleSubtotal > 0) {
        seasonalDiscount += (eligibleSubtotal * parseFloat(d.value)) / 100;
      } else if (d.type === 'fixed' && eligibleSubtotal > 0) {
        seasonalDiscount += Math.min(parseFloat(d.value), eligibleSubtotal);
      } else if (d.type === 'free_shipping') {
        seasonalFreeShipping = true;
      }
    }
  }

  // Initialize coupon functionality
  function initCoupon() {
    const toggleBtn = document.getElementById('coupon-toggle-btn');
    const inputWrapper = document.getElementById('coupon-input-wrapper');
    const closeBtn = document.getElementById('coupon-close-btn');
    const applyBtn = document.getElementById('apply-coupon-btn');
    const removeBtn = document.getElementById('remove-coupon-btn');
    const couponInput = document.getElementById('coupon-code-input');
    const appliedRow = document.getElementById('coupon-applied-row');
    
    if (!toggleBtn || !inputWrapper) return;
    
    // Toggle coupon input visibility
    toggleBtn.addEventListener('click', function() {
      if (inputWrapper.style.display === 'none') {
        inputWrapper.style.display = 'block';
        toggleBtn.style.display = 'none';
        if (couponInput) couponInput.focus();
      }
    });
    
    // Close coupon input
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        inputWrapper.style.display = 'none';
        toggleBtn.style.display = 'flex';
        if (couponInput) couponInput.value = '';
        const errorEl = document.getElementById('coupon-error');
        if (errorEl) errorEl.style.display = 'none';
      });
    }
    
    if (!applyBtn || !couponInput) return;
    
    // Apply coupon on button click
    applyBtn.addEventListener('click', async function() {
      const code = couponInput.value.trim();
      if (!code) return;
      
      applyBtn.disabled = true;
      applyBtn.textContent = isRTL ? '...' : '...';
      
      try {
        const subtotal = getCartSubtotal();
        const emailInput = document.getElementById('customer-email');
        const customerEmail = emailInput ? emailInput.value.trim() : '';
        const res = await fetch(buildApiUrl('/api/ecommerce/storefront/validate-coupon'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId: websiteId,
            code: code,
            subtotal: subtotal,
            customerEmail: customerEmail || null
          })
        });
        
        const data = await res.json();
        
        if (!data.success || !data.data?.valid) {
          // Show error
          const errorEl = document.getElementById('coupon-error');
          let errorMsg = t.invalidCoupon || 'Invalid coupon code';
          
          if (data.data?.error === 'expired') {
            errorMsg = t.couponExpired || 'Coupon has expired';
          } else if (data.data?.error === 'min_order') {
            errorMsg = (t.couponMinOrder || 'Minimum order amount') + ': ' + t.currency + data.data.minOrderAmount;
          } else if (data.data?.error === 'not_first_order') {
            errorMsg = t.couponFirstOrderOnly || (isRTL ? 'קופון זה מיועד להזמנה ראשונה בלבד' : 'This coupon is for first-time customers only');
          } else if (data.data?.error === 'email_required') {
            errorMsg = t.couponEmailRequired || (isRTL ? 'נא להזין אימייל כדי להשתמש בקופון זה' : 'Please enter your email to use this coupon');
          }
          
          if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = 'block';
            setTimeout(function() { errorEl.style.display = 'none'; }, 5000);
          }
          return;
        }
        
        // Apply coupon
        appliedCoupon = data.data.coupon;
        couponDiscount = appliedCoupon.discountAmount || 0;
        
        // Update UI - hide input, show applied badge
        inputWrapper.style.display = 'none';
        toggleBtn.style.display = 'none';
        appliedRow.style.display = 'flex';
        document.getElementById('applied-coupon-code').textContent = appliedCoupon.code;
        document.getElementById('coupon-error').style.display = 'none';
        
        updateOrderTotals();
        
      } catch (e) {
        console.error('Failed to validate coupon', e);
        const errorEl = document.getElementById('coupon-error');
        if (errorEl) {
          errorEl.textContent = t.errorLoading || 'Error';
          errorEl.style.display = 'block';
        }
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = t.applyCoupon || 'Apply';
      }
    });
    
    // Apply coupon on Enter key
    couponInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyBtn.click();
      }
    });
    
    // Remove coupon
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        appliedCoupon = null;
        couponDiscount = 0;
        
        // Update UI - show toggle button again
        appliedRow.style.display = 'none';
        toggleBtn.style.display = 'flex';
        if (couponInput) couponInput.value = '';
        
        updateOrderTotals();
      });
    }
  }
  
  // Get cart subtotal
  function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + getCartLineTotal(item), 0);
  }
  
  // Calculate shipping cost
  function getShippingCost() {
    if (!selectedShipping) return 0;
    const subtotal = getCartSubtotal();
    // Check free shipping condition
    if (selectedShipping.conditions?.freeAbove && subtotal >= selectedShipping.conditions.freeAbove) {
      return 0;
    }
    return parseFloat(selectedShipping.price) || 0;
  }
  
  // Update order totals on checkout page
  function updateOrderTotals() {
    const subtotalEl = document.getElementById('subtotal');
    const vatAmountEl = document.getElementById('vat-amount');
    const shippingCostEl = document.getElementById('shipping-cost');
    const discountEl = document.getElementById('discount');
    const discountRow = document.getElementById('discount-row');
    const orderTotalEl = document.getElementById('order-total');
    const orderItemsEl = document.getElementById('order-items');
    
    const subtotal = getCartSubtotal();
    let shippingCost = getShippingCost();
    
    // Recalculate coupon discount based on current subtotal
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        couponDiscount = (subtotal * appliedCoupon.value) / 100;
      } else if (appliedCoupon.type === 'fixed') {
        couponDiscount = appliedCoupon.value;
      } else if (appliedCoupon.type === 'free_shipping') {
        couponDiscount = 0;
        shippingCost = 0; // Free shipping coupon
      }
      // Cap discount at subtotal
      if (couponDiscount > subtotal) {
        couponDiscount = subtotal;
      }
    }

    // Calculate seasonal discounts
    calcSeasonalCartDiscount();
    if (seasonalFreeShipping || firstOrderFreeShipping) {
      shippingCost = 0;
    }
    var totalDiscount = couponDiscount + seasonalDiscount + firstOrderDiscount;
    if (totalDiscount > subtotal) totalDiscount = subtotal;
    
    const total = subtotal + shippingCost - totalDiscount;
    
    // Calculate VAT - prices include VAT
    // VAT rate is fetched from store settings (defaults to 18% for Israel)
    // VAT = total * rate / (1 + rate) (extracting VAT from VAT-inclusive price)
    const vatAmount = total * vatRate / (1 + vatRate);
    
    if (subtotalEl) subtotalEl.textContent = t.currency + subtotal.toFixed(2);
    if (vatAmountEl) vatAmountEl.textContent = t.currency + vatAmount.toFixed(2);
    if (shippingCostEl) shippingCostEl.textContent = shippingCost === 0 ? (t.free || 'FREE') : t.currency + shippingCost.toFixed(2);
    
    // Show/hide discount row (coupon + seasonal combined)
    if (discountRow && discountEl) {
      if (totalDiscount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = '-' + t.currency + totalDiscount.toFixed(2);
      } else {
        discountRow.style.display = 'none';
      }
    }
    
    if (orderTotalEl) orderTotalEl.textContent = t.currency + total.toFixed(2);
    
    // Render order items (rich format for checkout accordion)
    if (orderItemsEl) {
      orderItemsEl.innerHTML = cart.map(function(item, idx) {
        var lineTotal = getCartLineTotal(item);
        var variantLabel = item.variantName ? '<span class="checkout-item-variant">' + item.variantName + '</span>' : '';
        var imgSrc = item.image || (item.images && item.images[0]) || '';
        return '<div class="order-item checkout-cart-item" data-item-index="' + idx + '">' +
          (imgSrc ? '<img class="checkout-item-thumb" src="' + imgSrc + '" alt="' + (item.name || '') + '">' : '<div class="checkout-item-thumb checkout-item-thumb-empty"></div>') +
          '<div class="checkout-item-info">' +
            '<div class="checkout-item-name">' + item.name + '</div>' +
            variantLabel +
            '<div class="checkout-item-qty-control">' +
              '<button type="button" class="checkout-qty-btn" onclick="window.zappyCheckoutQty(' + idx + ', -1)">−</button>' +
              '<span class="checkout-qty-value">' + formatQtyDisplay(item) + '</span>' +
              '<button type="button" class="checkout-qty-btn" onclick="window.zappyCheckoutQty(' + idx + ', 1)">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="checkout-item-price">' + t.currency + lineTotal.toFixed(2) + '</div>' +
          '<button type="button" class="checkout-item-remove" onclick="window.zappyCheckoutRemove(' + idx + ')" title="' + (t.remove || 'Remove') + '">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
          '</button>' +
        '</div>';
      }).join('');
    }
    // Keep items count & thumbs in sync
    updateCheckoutItemsCount();
  }
  
  // Select shipping method
  window.zappySelectShipping = function(methodId) {
    selectedShipping = shippingMethods.find(m => m.id === methodId);
    document.querySelectorAll('.shipping-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.methodId === methodId);
    });
    var shippingError = document.getElementById('shipping-method-error');
    if (shippingError) {
      shippingError.textContent = '';
      shippingError.classList.remove('visible');
    }
    positionAddressSection(selectedShipping);
    updateOrderTotals();
    updatePlaceOrderState();
  };
  
  window.zappyAddToCart = addToCart;
  
  // Handle add to cart from product cards - redirect to product page if has variants
  window.zappyHandleAddToCart = function(product) {
    // Check if product has variants that need to be selected
    const variantCount = parseInt(product.variant_count || 0);
    if (variantCount > 0) {
      // Redirect to product detail page to select variant
      const productPath = '/product/' + (product.slug || product.id);
      
      // Check if we're in preview mode
      const currentUrl = window.location.href;
      if (currentUrl.includes('/api/website/preview')) {
        // In preview mode, reconstruct URL with page parameter
        const isFullscreen = currentUrl.includes('preview-fullscreen');
        const previewType = isFullscreen ? 'preview-fullscreen' : 'preview';
        window.location.href = '/api/website/' + previewType + '/' + websiteId + '?page=' + encodeURIComponent(productPath);
      } else {
        // In published site, use direct path
        window.location.href = productPath;
      }
    } else {
      // No variants, add directly to cart
      addToCart(product);
    }
  };
  
  window.zappyRemoveFromCart = function(compositeId) {
    // Remove by composite ID (product + variant)
    cart = cart.filter(item => {
      const variantId = item.selectedVariant ? item.selectedVariant.id : null;
      const itemCompositeId = variantId ? item.id + '-' + variantId : item.id;
      return itemCompositeId !== compositeId;
    });
    saveCart();
    renderCart();
    renderCartDrawer();
  };
  
  // ══════════════════════════════════════════════════════════════════════
  // SEARCH FUNCTIONALITY
  // ══════════════════════════════════════════════════════════════════════
  let allProducts = [];
  let searchTimeout = null;
  
  async function loadAllProductsForSearch() {
    try {
      const res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/products?websiteId=' + websiteId));
      const data = await res.json();
      if (data.success && data.data) {
        allProducts = data.data;
      }
    } catch (e) {
      console.error('Failed to load products for search', e);
    }
  }
  
  function searchProducts(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return allProducts.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.description?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.tags?.some(tag => tag.toLowerCase().includes(q))
    ).slice(0, 6); // Limit to 6 results
  }
  
  function renderSearchResults(results, query) {
    const container = document.getElementById('nav-search-results');
    if (!container) return;
    
    if (results.length === 0) {
      container.innerHTML = '<div class="search-no-results">' + (t.noProducts || 'No products found') + '</div>';
      container.classList.add('active');
      return;
    }
    
    // Check if we're in preview mode for generating product URLs
    var isPreviewMode = window.location.pathname.includes('preview-fullscreen');
    
    let html = results.map(function(p) {
      var productUrl;
      if (isPreviewMode) {
        var urlObj = new URL(window.location.href);
        urlObj.searchParams.set('page', '/product/' + (p.slug || p.id));
        urlObj.searchParams.delete('search');
        productUrl = urlObj.toString();
      } else {
        productUrl = '/product/' + (p.slug || p.id);
      }
      return '<a href="' + productUrl + '" class="search-result-item">' +
        (p.images?.[0] ? '<img src="' + resolveProductImageUrl(p.images[0]) + '" alt="' + p.name + '" class="search-result-img">' : '<div class="search-result-img"></div>') +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + p.name + '</div>' +
          '<div class="search-result-price">' + t.currency + p.price + '</div>' +
        '</div>' +
      '</a>';
    }).join('');
    
    // Add "View all results" link
    if (allProducts.filter(p => p.name?.toLowerCase().includes(query.toLowerCase())).length > 6) {
      // Check if we're in preview mode
      var isPreview = window.location.pathname.includes('preview-fullscreen');
      var viewAllUrl;
      if (isPreview) {
        var urlObj = new URL(window.location.href);
        urlObj.searchParams.set('page', '/products');
        urlObj.searchParams.set('search', query);
        viewAllUrl = urlObj.toString();
      } else {
        viewAllUrl = '/products?search=' + encodeURIComponent(query);
      }
      html += '<a href="' + viewAllUrl + '" class="search-view-all">' + 
        (t.viewAllResults || 'View all results') + ' →</a>';
    }
    
    container.innerHTML = html;
    container.classList.add('active');
  }
  
  function initSearch() {
    const input = document.getElementById('nav-search-input');
    const btn = document.getElementById('nav-search-btn');
    const results = document.getElementById('nav-search-results');
    
    if (!input) return;
    
    // Load products for search
    loadAllProductsForSearch();
    
    // Handle input
    input.addEventListener('input', function() {
      const query = this.value.trim();
      
      // Debounce search
      clearTimeout(searchTimeout);
      
      if (query.length < 2) {
        if (results) results.classList.remove('active');
        return;
      }
      
      searchTimeout = setTimeout(function() {
        const matches = searchProducts(query);
        renderSearchResults(matches, query);
      }, 200);
    });
    
    // Handle search button click
    if (btn) {
      btn.addEventListener('click', function() {
        const query = input.value.trim();
        if (query.length >= 2) {
          // Check if we're in preview mode
          const isPreview = window.location.pathname.includes('preview-fullscreen');
          if (isPreview) {
            const url = new URL(window.location.href);
            url.searchParams.set('page', '/products');
            url.searchParams.set('search', query);
            window.location.href = url.toString();
          } else {
            window.location.href = '/products?search=' + encodeURIComponent(query);
          }
        }
      });
    }
    
    // Handle Enter key
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query.length >= 2) {
          // Check if we're in preview mode
          const isPreview = window.location.pathname.includes('preview-fullscreen');
          if (isPreview) {
            const url = new URL(window.location.href);
            url.searchParams.set('page', '/products');
            url.searchParams.set('search', query);
            window.location.href = url.toString();
          } else {
            window.location.href = '/products?search=' + encodeURIComponent(query);
          }
        }
      }
    });
    
    // Close results when clicking outside
    document.addEventListener('click', function(e) {
      if (results && !e.target.closest('.nav-search-box')) {
        results.classList.remove('active');
      }
    });
    
    // Handle search query from URL on products page
    if (window.location.pathname === '/products') {
      const urlParams = new URLSearchParams(window.location.search);
      const searchQuery = urlParams.get('search');
      if (searchQuery) {
        input.value = searchQuery;
        // Filter products grid based on search
        filterProductsGrid(searchQuery);
      }
    }
  }
  
  function filterProductsGrid(query) {
    const grid = document.getElementById('zappy-product-grid');
    if (!grid) return;
    
    // Wait for products to load, then filter
    setTimeout(function() {
      const cards = grid.querySelectorAll('.product-card');
      const q = query.toLowerCase();
      let visibleCount = 0;
      
      cards.forEach(function(card) {
        const name = card.querySelector('h3')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('p')?.textContent?.toLowerCase() || '';
        const matches = name.includes(q) || desc.includes(q);
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      
      // Show message if no results
      if (visibleCount === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'empty-cart';
        noResults.textContent = t.noProducts || 'No products found';
        noResults.id = 'search-no-results';
        grid.appendChild(noResults);
      }
    }, 500);
  }
  
  // Mobile menu handling - close menu when clicking items
  function initMobileMenuHandling() {
    // Common selectors for mobile menu elements
    const menuSelectors = [
      '.nav-menu', '.mobile-menu', '.mobile-nav', '[class*="mobile-menu"]',
      '[class*="nav-menu"]', '.menu-items', '.nav-links', 'nav ul'
    ];
    const toggleSelectors = [
      '.hamburger', '.menu-toggle', '.nav-toggle', '.mobile-toggle',
      '[class*="hamburger"]', '[class*="menu-toggle"]', '.menu-btn',
      'button[aria-label*="menu"]', '.mobile-menu-btn'
    ];
    
    // Find menu and toggle elements
    let menuEl = null;
    let toggleEl = null;
    
    for (const sel of menuSelectors) {
      menuEl = document.querySelector(sel);
      if (menuEl) break;
    }
    for (const sel of toggleSelectors) {
      toggleEl = document.querySelector(sel);
      if (toggleEl) break;
    }
    
    
    // Check if menu is currently open
    function isMenuOpen() {
      if (!menuEl) return false;
      return menuEl.classList.contains('active') || 
             menuEl.classList.contains('open') || 
             menuEl.classList.contains('show') ||
             menuEl.classList.contains('visible') ||
             menuEl.classList.contains('is-open');
    }
    
    
    // Function to close mobile menu
    function closeMobileMenu() {
      if (!menuEl) return;
      
      // Remove common "open" classes
      menuEl.classList.remove('active', 'open', 'show', 'visible', 'is-open', 'menu-open');
      document.body.classList.remove('menu-open', 'nav-open', 'mobile-menu-open');
      
      // Also check parent nav
      const nav = menuEl.closest('nav') || menuEl.closest('header');
      if (nav) {
        nav.classList.remove('active', 'open', 'show', 'menu-open', 'is-open');
      }
      
      // Update toggle button state
      if (toggleEl) {
        toggleEl.classList.remove('active', 'open', 'is-active');
        toggleEl.setAttribute('aria-expanded', 'false');
      }
      
      // Remove overlay if it exists
      const overlay = document.querySelector('.mobile-menu-overlay');
      if (overlay) overlay.remove();
    }
    
    // Function to open mobile menu
    function openMobileMenu() {
      if (!menuEl) return;
      
      // Add open class
      menuEl.classList.add('active', 'open');
      document.body.classList.add('menu-open');
      
      // Update toggle button state
      if (toggleEl) {
        toggleEl.classList.add('active', 'open');
        toggleEl.setAttribute('aria-expanded', 'true');
      }
      
      // Add overlay for closing
      if (!document.querySelector('.mobile-menu-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:998;';
        overlay.addEventListener('click', closeMobileMenu);
        document.body.appendChild(overlay);
      }
    }
    
    // Toggle menu
    function toggleMobileMenu(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isMenuOpen()) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    }
    
    // DON'T replace the toggle - site's own handler works
    // Instead, just ensure we can close via overlay and other methods
    
    // Monitor menu state changes and add overlay when open
    let lastMenuState = isMenuOpen();
    setInterval(function() {
      const currentState = isMenuOpen();
      if (currentState !== lastMenuState) {
        lastMenuState = currentState;
        if (currentState) {
          document.body.classList.add('menu-open');
          // Menu just opened - add overlay
          if (!document.querySelector('.mobile-menu-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'mobile-menu-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:998;';
            overlay.addEventListener('click', function() {
              // Simulate click on toggle to close via site's own handler
              if (toggleEl) toggleEl.click();
              else closeMobileMenu();
            });
            document.body.appendChild(overlay);
          }
        } else {
          document.body.classList.remove('menu-open');
          // Menu just closed - remove overlay
          const overlay = document.querySelector('.mobile-menu-overlay');
          if (overlay) overlay.remove();
        }
      }
    }, 100);
    
    // Close menu when clicking on nav items
    document.querySelectorAll('nav a, .nav-menu a, .mobile-menu a').forEach(function(link) {
      link.addEventListener('click', function() {
        setTimeout(closeMobileMenu, 100);
      });
    });
    
    // Close menu when clicking on e-commerce icons
    document.querySelectorAll('.nav-ecommerce-icons a, .cart-link, .login-link').forEach(function(el) {
      el.addEventListener('click', function() {
        closeMobileMenu();
      });
    });
    
    // Close menu when clicking outside (backup)
    document.addEventListener('click', function(e) {
      if (!menuEl || !toggleEl) return;
      
      if (isMenuOpen()) {
        const clickedInMenu = menuEl.contains(e.target);
        const clickedOnToggle = toggleEl.contains(e.target);
        
        if (!clickedInMenu && !clickedOnToggle) {
          closeMobileMenu();
        }
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });
    
    // Make close function globally available
    window.zappyCloseMobileMenu = closeMobileMenu;
  }

  // Some templates toggle the menu but don't toggle the button icon state.
  // Keep #mobileToggle in sync with #navMenu so hamburger ↔ X works.
  function syncMobileToggleWithMenu() {
    try {
      const toggle = document.getElementById('mobileToggle') || document.querySelector('.mobile-toggle');
      const menu = document.getElementById('navMenu') || document.querySelector('.nav-menu');
      if (!toggle || !menu) return;

      const apply = function() {
        const menuOpen = menu.classList.contains('active') || menu.classList.contains('open') || menu.classList.contains('show');
        if (menuOpen) {
          toggle.classList.add('active');
          document.body.classList.add('menu-open');
        } else {
          toggle.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
      };

      apply();

      const obs = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'class') {
            apply();
            break;
          }
        }
      });
      obs.observe(menu, { attributes: true });
    } catch (e) {
      // no-op
    }
  }
  
  // Initialize cart drawer events
  function initCartDrawer() {
    // Handle all cart links/buttons that should open the drawer
    var cartElements = document.querySelectorAll('#cart-drawer-toggle, [data-cart-toggle], .cart-link.nav-cart, a.nav-cart');
    
    cartElements.forEach(function(el) {
      // Skip if already initialized
      if (el.hasAttribute('data-cart-init')) return;
      el.setAttribute('data-cart-init', 'true');
      el.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openCartDrawer();
      });
    });
    
    // Close button
    var closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCartDrawer);
    }
    
    // Overlay click
    var overlay = document.getElementById('cart-drawer-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeCartDrawer);
    }
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeCartDrawer();
      }
    });
    
    // Initial render
    renderCartDrawer();
  }
  
  // Initialize everything
  // Mobile search panel handling
  function initMobileSearch() {
    const toggleBtn = document.getElementById('mobile-search-toggle') || document.querySelector('.nav-search-toggle');
    const panel = document.getElementById('mobile-search-panel');
    const closeBtn = document.getElementById('close-mobile-search');
    const input = document.getElementById('mobile-search-input');
    const results = document.getElementById('mobile-search-results');
    
    if (!toggleBtn || !panel) return;

    function computeTotalHeaderHeightPx() {
      try {
        // Prefer CSS var set by setupFixedHeaders()
        const totalVar = getComputedStyle(document.documentElement).getPropertyValue('--total-header-height').trim();
        if (totalVar) {
          const n = parseFloat(totalVar);
          if (Number.isFinite(n) && n > 0) return Math.ceil(n);
        }
      } catch (e) {}

      // Fallback: compute from DOM
      const announcementBar = document.querySelector('.zappy-announcement-bar');
      const navbar = document.querySelector('nav.navbar, .navbar');
      const barH = announcementBar ? Math.ceil(announcementBar.getBoundingClientRect().height) : 0;
      const navH = navbar ? Math.ceil(navbar.getBoundingClientRect().height) : 0;
      const total = barH + navH;
      return total > 0 ? total : 112;
    }

    // Ensure the mobile search panel has a submit button (older pages may only have input + close)
    (function ensureSearchSubmitButton() {
      try {
        const wrapper = panel.querySelector('.search-wrapper');
        if (!wrapper) return;
        if (wrapper.querySelector('#mobile-search-submit, .search-submit')) return;

        const isRTL = (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
        const submitBtn = document.createElement('button');
        submitBtn.className = 'search-submit';
        submitBtn.id = 'mobile-search-submit';
        submitBtn.title = isRTL ? 'חיפוש' : 'Search';
        submitBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>';

        const close = wrapper.querySelector('#close-mobile-search, .close-search');
        if (close) wrapper.insertBefore(submitBtn, close);
        else wrapper.appendChild(submitBtn);
      } catch (e) {
        // Fail silently; this is a progressive enhancement only
      }
    })();
    
    // Open mobile search panel
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Ensure panel is positioned below announcement+navbar even if CSS forces --header-height
      try {
        const topPx = computeTotalHeaderHeightPx();
        panel.style.setProperty('top', topPx + 'px', 'important');
      } catch (e2) {}
      panel.classList.add('active');
      setTimeout(function() {
        if (input) input.focus();
      }, 100);
    });
    
    // Close mobile search panel
    function closeMobileSearchPanel() {
      panel.classList.remove('active');
      if (input) input.value = '';
      if (results) results.innerHTML = '';
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeMobileSearchPanel);
    }
    
    // Close search panel on outside click (blur)
    document.addEventListener('click', function(e) {
      if (!panel.classList.contains('active')) return;
      // If click is inside the panel or on the toggle button, don't close
      if (panel.contains(e.target) || toggleBtn.contains(e.target)) return;
      closeMobileSearchPanel();
    });
    
    // Close search panel when hamburger menu is clicked
    var menuToggle = document.querySelector('.nav-menu-toggle, .hamburger, .menu-toggle, .mobile-toggle, #mobileToggle, [aria-label="תפריט"], [aria-label="Menu"]');
    if (menuToggle) {
      menuToggle.addEventListener('click', function() {
        if (panel.classList.contains('active')) {
          closeMobileSearchPanel();
        }
      });
    }
    
    // Also close search when mobile menu overlay is opened
    var mobileMenuOverlay = document.querySelector('.mobile-menu-overlay, .nav-mobile-menu, .mobile-nav');
    if (mobileMenuOverlay) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.attributeName === 'class' && 
              (mobileMenuOverlay.classList.contains('active') || mobileMenuOverlay.classList.contains('open'))) {
            closeMobileSearchPanel();
          }
        });
      });
      observer.observe(mobileMenuOverlay, { attributes: true });
    }
    
    // Handle mobile search input
    if (input) {
      input.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
          if (results) results.innerHTML = '';
          return;
        }
        
        searchTimeout = setTimeout(async function() {
          try {
            // Prefer server-side search for mobile suggestions (more reliable than relying on cached allProducts)
            const websiteId = window.ZAPPY_WEBSITE_ID;
            if (!websiteId) throw new Error('Missing websiteId');

            let apiUrl = buildApiUrlWithLang(
              '/api/ecommerce/storefront/products?websiteId=' +
                websiteId +
                '&search=' +
                encodeURIComponent(query) +
                '&limit=8'
            );

            const res = await fetch(apiUrl);
            const data = await res.json();
            const matches = (data && data.success && Array.isArray(data.data)) ? data.data : [];
            renderMobileSearchResults(matches, query);
          } catch (e) {
            // Fallback to local cached search if available
            try {
              const matches = typeof searchProducts === 'function' ? searchProducts(query) : [];
              renderMobileSearchResults(matches, query);
            } catch (e2) {
              renderMobileSearchResults([], query);
            }
          }
        }, 200);
      });
      
      // Handle Enter key on mobile
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          const query = this.value.trim();
          if (query.length >= 2) {
            // Check if we're in preview mode
            const isPreview = window.location.pathname.includes('preview-fullscreen');
            if (isPreview) {
              const url = new URL(window.location.href);
              url.searchParams.set('page', '/products');
              url.searchParams.set('search', query);
              window.location.href = url.toString();
            } else {
              window.location.href = '/products?search=' + encodeURIComponent(query);
            }
          }
        }
      });
      
      // Handle mobile search submit button click
      const submitBtn = document.getElementById('mobile-search-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
          e.preventDefault();
          const query = input.value.trim();
          if (query.length >= 2) {
            // Check if we're in preview mode
            const isPreview = window.location.pathname.includes('preview-fullscreen');
            if (isPreview) {
              const url = new URL(window.location.href);
              url.searchParams.set('page', '/products');
              url.searchParams.set('search', query);
              window.location.href = url.toString();
            } else {
              window.location.href = '/products?search=' + encodeURIComponent(query);
            }
          }
        });
      }
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
      if (panel.classList.contains('active') && 
          !e.target.closest('#mobile-search-panel') && 
          !e.target.closest('#mobile-search-toggle')) {
        panel.classList.remove('active');
      }
    });
  }
  
  function renderMobileSearchResults(matches, query) {
    const results = document.getElementById('mobile-search-results');
    if (!results) return;
    
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-no-results">' + (t.noProducts || 'No products found') + '</div>';
      return;
    }

    // Local safe formatter (do NOT rely on formatPrice being in scope)
    function formatSearchPrice(value) {
      const currency = (t && t.currency) ? t.currency : '₪';
      const n = parseFloat(value);
      if (!Number.isFinite(n)) return '';
      return currency + n.toFixed(2);
    }
    
    // Check if we're in preview mode for generating product URLs
    var isPreviewMode = window.location.pathname.includes('preview-fullscreen');
    
    let html = matches.slice(0, 8).map(function(p) {
      const price = formatSearchPrice(p && p.price);
      const img = p.images && p.images[0] ? resolveProductImageUrl(p.images[0]) : '';
      var productUrl;
      if (isPreviewMode) {
        var urlObj = new URL(window.location.href);
        urlObj.searchParams.set('page', '/product/' + (p.slug || p.id));
        urlObj.searchParams.delete('search');
        productUrl = urlObj.toString();
      } else {
        productUrl = '/product/' + (p.slug || p.id);
      }
      return '<a href="' + productUrl + '" class="search-result-item">' +
        (img ? '<img src="' + img + '" alt="' + p.name + '" class="search-result-img">' : '') +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + p.name + '</div>' +
          (price ? '<div class="search-result-price">' + price + '</div>' : '') +
        '</div>' +
      '</a>';
    }).join('');
    
    // Always offer a "view all" link for mobile search
    if (query && query.length >= 2) {
      // Check if we're in preview mode
      var isPreview = window.location.pathname.includes('preview-fullscreen');
      var viewAllUrl;
      if (isPreview) {
        var urlObj = new URL(window.location.href);
        urlObj.searchParams.set('page', '/products');
        urlObj.searchParams.set('search', query);
        viewAllUrl = urlObj.toString();
      } else {
        viewAllUrl = '/products?search=' + encodeURIComponent(query);
      }
      html += '<a href="' + viewAllUrl + '" class="search-view-all">' + 
        (t.viewAllResults || 'View all results') + '</a>';
    }
    
    results.innerHTML = html;
  }
  
  // Initialize order success page
  async function initOrderSuccess() {
    // Only run on order-success page
    const pagePath = window.location.pathname;
    const isPreview = window.location.search.includes('page=');
    const previewPage = new URLSearchParams(window.location.search).get('page');
    
    const isOrderSuccessPage = pagePath === '/order-success' || 
                               pagePath.endsWith('/order-success') || 
                               previewPage === '/order-success' ||
                               previewPage === 'order-success';
    
    if (!isOrderSuccessPage) return;
    
    // Check if we're inside an iframe (e.g., Green Invoice payment iframe)
    // If so, redirect the parent window to this success page
    try {
      if (window.self !== window.top) {
        // We're inside an iframe - redirect parent to this URL
        window.top.location.href = window.location.href;
        return; // Stop execution in iframe
      }
    } catch (e) {
      // Cross-origin iframe access error - try postMessage as fallback
      try {
        window.parent.postMessage({ type: 'zappy_order_success', url: window.location.href }, '*');
      } catch (e2) {
        console.warn('Could not communicate with parent frame:', e2);
      }
    }
    
    const orderNumberEl = document.getElementById('order-number-value');
    const orderDetailsSection = document.getElementById('order-details-section');
    const orderItemsList = document.getElementById('order-items-list');
    const orderTotalsSummary = document.getElementById('order-totals-summary');
    
    if (!orderNumberEl) return;
    
    // Get reference from URL
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('ref');
    
    if (!reference) {
      orderNumberEl.textContent = t.orderNotFound || 'Order not found';
      return;
    }
    
    // Extract order number from reference (format: zappy_websiteId_timestamp)
    const parts = reference.split('_');
    const orderDisplay = parts.length >= 3 ? parts[2] : reference;
    orderNumberEl.textContent = '#' + orderDisplay;
    
    // Confirm/create the order on the server (in case webhook didn't fire)
    const websiteId = window.ZAPPY_WEBSITE_ID;
    if (websiteId) {
      try {
        const confirmRes = await fetch(buildApiUrl('/api/ecommerce/confirm-order/' + encodeURIComponent(reference)), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const confirmData = await confirmRes.json();
        if (confirmData.success) {
          console.log('✅ Order confirmed:', confirmData.data);
          // Update order number to the official one if available
          if (confirmData.data.orderNumber) {
            orderNumberEl.textContent = '#' + confirmData.data.orderNumber;
          }
        } else {
          console.warn('Order confirmation response:', confirmData);
        }
      } catch (e) {
        console.error('Failed to confirm order:', e);
        // Continue anyway - order might have been created by webhook
      }
    }
    
    // Try to fetch order details from the API
    if (websiteId && orderDetailsSection && orderItemsList) {
      // First try localStorage (same-domain checkout)
      const pendingOrderKey = 'zappy_pending_order_' + reference;
      let pendingOrderData = localStorage.getItem(pendingOrderKey);
      
      // If not in localStorage, fetch from API (cross-domain checkout)
      if (!pendingOrderData) {
        try {
          const res = await fetch(buildApiUrl('/api/ecommerce/pending-order/' + encodeURIComponent(reference)));
          const apiData = await res.json();
          if (apiData.success && apiData.data) {
            pendingOrderData = JSON.stringify(apiData.data);
          }
        } catch (e) {
          console.error('Failed to fetch pending order from API:', e);
        }
      }
      
      if (pendingOrderData) {
        try {
          const orderData = JSON.parse(pendingOrderData);
          
          // Populate Thank You page transaction details
          var dateEl = document.getElementById('order-date-value');
          var paymentEl = document.getElementById('order-payment-value');
          var shippingEl = document.getElementById('order-shipping-value');
          var emailEl = document.getElementById('order-confirmation-email');
          
          if (dateEl) {
            var d = orderData.orderDate ? new Date(orderData.orderDate) : new Date();
            var days = isRTL ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            dateEl.textContent = days[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
          }
          if (paymentEl && orderData.paymentMethodName) {
            paymentEl.textContent = orderData.paymentMethodName;
          }
          if (shippingEl && orderData.shippingMethodName) {
            var shippingText = orderData.shippingMethodName;
            if (orderData.shippingIsPickup) {
              shippingText += '. ' + (isRTL ? 'איסוף עצמי' : 'Store pickup');
            }
            shippingEl.textContent = shippingText;
          }
          if (emailEl && orderData.customerEmail) {
            emailEl.textContent = (t.orderConfirmation || 'A confirmation email has been sent to') + ' ' + orderData.customerEmail;
          }
          
          // Show order details
          if (orderDetailsSection) orderDetailsSection.style.display = 'block';
          
          // Render items
          if (orderItemsList && orderData.cartItems && orderData.cartItems.length > 0) {
            orderItemsList.innerHTML = orderData.cartItems.map(function(item) {
              var lineTotal = getCartLineTotal(item);
              var variantLabel = item.variantName ? ' (' + item.variantName + ')' : '';
              return '<div class="order-success-item">' +
                '<span>' + item.name + variantLabel + ' x ' + formatQtyDisplay(item) + '</span>' +
                '<span>' + t.currency + lineTotal.toFixed(2) + '</span>' +
                '</div>';
            }).join('');
          }
          
          // Render totals
          if (orderTotalsSummary) {
            let totalsHtml = '<div><span>' + (t.subtotal || 'Subtotal') + ':</span><span>' + t.currency + parseFloat(orderData.subtotal || 0).toFixed(2) + '</span></div>';
            if (orderData.shippingCost > 0) {
              totalsHtml += '<div><span>' + (t.shipping || 'Shipping') + ':</span><span>' + t.currency + parseFloat(orderData.shippingCost).toFixed(2) + '</span></div>';
            }
            if (orderData.discount > 0) {
              totalsHtml += '<div><span>' + (t.discount || 'Discount') + ':</span><span>-' + t.currency + parseFloat(orderData.discount).toFixed(2) + '</span></div>';
            }
            var totalLabel = orderData.paymentStatus === 'pending'
              ? (t.totalToPay || 'Total to pay')
              : (t.paidAmount || 'Amount Paid');
            totalsHtml += '<div class="order-total-final"><span>' + totalLabel + ':</span><span>' + t.currency + parseFloat(orderData.total || 0).toFixed(2) + '</span></div>';
            orderTotalsSummary.innerHTML = totalsHtml;
          }
          
          // Clean up localStorage after displaying
          localStorage.removeItem(pendingOrderKey);
        } catch (e) {
          console.error('Error parsing pending order data:', e);
        }
      }
    }
    
    // Clear the cart on successful order
    cart = [];
    saveCart();
    updateCartCount();
  }
  
  // Initialize login page
  function initLogin() {
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const loginEmailInput = document.getElementById('login-email');
    const otpCodeInput = document.getElementById('otp-code');
    const loginForm = document.querySelector('.login-form');
    const otpForm = document.querySelector('.otp-form');
    
    if (!sendOtpBtn || !loginEmailInput) return;
    
    let currentEmail = '';
    
    // Send OTP
    sendOtpBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      const email = sanitizeEmail(loginEmailInput.value);
      
      if (!email) {
        alert(isRTL ? 'נא להזין כתובת אימייל' : 'Please enter an email address');
        return;
      }
      
      // Basic email validation
      // Note: Using \s instead of s because the backslash gets consumed during JSON serialization
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert(isRTL ? 'נא להזין כתובת אימייל תקינה' : 'Please enter a valid email address');
        return;
      }
      
      sendOtpBtn.disabled = true;
      sendOtpBtn.textContent = isRTL ? 'שולח...' : 'Sending...';
      
      try {
        const res = await fetch(buildApiUrl('/api/ecommerce/customers/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId: websiteId,
            email: email
          })
        });
        
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to send code');
        }
        
        // Save email for verification step
        currentEmail = email;
        
        // Show OTP form
        if (loginForm) loginForm.style.display = 'none';
        if (otpForm) otpForm.style.display = 'block';
        
        alert(isRTL ? 'קוד אימות נשלח לאימייל שלך' : 'Verification code sent to your email');
        
      } catch (error) {
        console.error('Send OTP failed:', error);
        alert(isRTL ? 'שגיאה בשליחת הקוד. נסה שוב.' : 'Failed to send code. Please try again.');
      } finally {
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = t.sendCode || (isRTL ? 'שלח קוד' : 'Send Code');
      }
    });
    
    // Verify OTP
    if (verifyOtpBtn && otpCodeInput) {
      verifyOtpBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        const code = otpCodeInput.value.trim();
        
        if (!code) {
          alert(isRTL ? 'נא להזין את קוד האימות' : 'Please enter the verification code');
          return;
        }
        
        if (code.length !== 6) {
          alert(isRTL ? 'הקוד חייב להיות 6 ספרות' : 'Code must be 6 digits');
          return;
        }
        
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = isRTL ? 'מאמת...' : 'Verifying...';
        
        try {
          const res = await fetch(buildApiUrl('/api/ecommerce/customers/verify-otp'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              websiteId: websiteId,
              email: currentEmail,
              code: code
            })
          });
          
          const data = await res.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Invalid code');
          }
          
          // Store the auth token with site-specific key for session isolation
          localStorage.setItem('zappy_customer_token_' + websiteId, data.token);
          localStorage.setItem('zappy_customer_email_' + websiteId, currentEmail);
          
          // Show success message
          alert(isRTL ? 'התחברת בהצלחה!' : 'Successfully logged in!');
          
          // Redirect to previous page or products
          const returnUrl = sessionStorage.getItem('zappy_login_return');
          sessionStorage.removeItem('zappy_login_return');
          
          // Determine target page
          let targetPath = (returnUrl && returnUrl !== '/login') ? returnUrl : '/products';
          
          // Check if we're in preview mode and construct proper URL
          const currentUrl = window.location.href;
          if (currentUrl.includes('/api/website/preview')) {
            // In preview mode - construct proper preview URL
            const isFullscreen = currentUrl.includes('preview-fullscreen');
            const previewType = isFullscreen ? 'preview-fullscreen' : 'preview';
            const newUrl = '/api/website/' + previewType + '/' + websiteId + '?page=' + encodeURIComponent(targetPath);
            window.location.href = newUrl;
          } else {
            // Deployed site - use simple path
            window.location.href = targetPath;
          }
          
        } catch (error) {
          console.error('Verify OTP failed:', error);
          alert(isRTL ? 'קוד שגוי או פג תוקף. נסה שוב.' : 'Invalid or expired code. Please try again.');
        } finally {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.textContent = t.verify || (isRTL ? 'אמת' : 'Verify');
        }
      });
    }
  }
  
  // Initialize account page
  function initAccount() {
    const notLoggedInEl = document.getElementById('account-not-logged-in');
    const loggedInEl = document.getElementById('account-logged-in');
    const accountEmailEl = document.getElementById('account-email');
    const logoutBtn = document.getElementById('logout-btn');
    const ordersLoading = document.getElementById('orders-loading');
    const ordersEmpty = document.getElementById('orders-empty');
    const ordersList = document.getElementById('orders-list');
    
    // Profile elements
    const profileDisplay = document.getElementById('profile-display');
    const profileForm = document.getElementById('profile-form');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');
    const profileNameEl = document.getElementById('profile-name');
    const profilePhoneEl = document.getElementById('profile-phone');
    const editNameInput = document.getElementById('edit-name');
    const editPhoneInput = document.getElementById('edit-phone');
    
    // Address elements
    const addressesList = document.getElementById('addresses-list');
    const addressesEmpty = document.getElementById('addresses-empty');
    const addAddressBtn = document.getElementById('add-address-btn');
    const addressModalOverlay = document.getElementById('address-modal-overlay');
    const addressModalTitle = document.getElementById('address-modal-title');
    const addressModalClose = document.getElementById('address-modal-close');
    const saveAddressBtn = document.getElementById('save-address-btn');
    const cancelAddressBtn = document.getElementById('cancel-address-btn');
    const addressEditId = document.getElementById('address-edit-id');
    const addressLabelSelect = document.getElementById('address-label');
    const addressStreetInput = document.getElementById('address-street');
    const addressApartmentInput = document.getElementById('address-apartment');
    const addressCityInput = document.getElementById('address-city');
    const addressZipInput = document.getElementById('address-zip');
    const addressDefaultCheckbox = document.getElementById('address-default');
    
    if (!notLoggedInEl || !loggedInEl) return;
    
    // Use site-specific localStorage keys for session isolation
    const tokenKey = 'zappy_customer_token_' + websiteId;
    const emailKey = 'zappy_customer_email_' + websiteId;
    const token = localStorage.getItem(tokenKey);
    const email = localStorage.getItem(emailKey);
    
    // Customer data storage
    let customerData = { name: '', phone: '', addresses: [] };
    
    if (!token) {
      // Not logged in
      notLoggedInEl.style.display = 'block';
      loggedInEl.style.display = 'none';
      return;
    }
    
    // Show logged in state
    notLoggedInEl.style.display = 'none';
    loggedInEl.style.display = 'block';
    
    if (accountEmailEl && email) {
      accountEmailEl.textContent = email;
    }
    
    // Toast notification helper
    function showToast(message, type) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + (type || '');
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(function() { toast.classList.add('show'); }, 10);
      setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
      }, 3000);
    }
    
    // Logout handler
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(emailKey);
        
        // Navigate to home page
        const currentUrl = window.location.href;
        if (currentUrl.includes('/api/website/preview')) {
          const isFullscreen = currentUrl.includes('preview-fullscreen');
          const previewType = isFullscreen ? 'preview-fullscreen' : 'preview';
          window.location.href = '/api/website/' + previewType + '/' + websiteId + '?page=' + encodeURIComponent('/');
        } else {
          window.location.href = '/';
        }
      });
    }
    
    // Load customer profile
    loadCustomerProfile();
    
    async function loadCustomerProfile() {
      try {
        // Include websiteId for session isolation validation
        const res = await fetch(buildApiUrl('/api/ecommerce/customers/me?websiteId=' + encodeURIComponent(websiteId)), {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await res.json();
        
        if (data.success && data.data) {
          customerData = {
            name: data.data.name || '',
            phone: data.data.phone || '',
            addresses: data.data.addresses || []
          };
          
          // Update profile display - fall back to email if name is not set
          if (profileNameEl) profileNameEl.textContent = customerData.name || data.data.email || '-';
          if (profilePhoneEl) profilePhoneEl.textContent = customerData.phone || '-';
          
          // Update welcome message - show name if available, otherwise email
          if (accountEmailEl) {
            accountEmailEl.textContent = customerData.name || data.data.email || '';
          }
          
          // Render addresses
          renderAddresses();
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
    
    // Profile editing
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', function() {
        if (editNameInput) editNameInput.value = customerData.name || '';
        if (editPhoneInput) editPhoneInput.value = customerData.phone || '';
        if (profileDisplay) profileDisplay.style.display = 'none';
        if (profileForm) profileForm.style.display = 'flex';
        if (editProfileBtn) editProfileBtn.style.display = 'none';
      });
    }
    
    if (cancelProfileBtn) {
      cancelProfileBtn.addEventListener('click', function() {
        if (profileDisplay) profileDisplay.style.display = 'flex';
        if (profileForm) profileForm.style.display = 'none';
        if (editProfileBtn) editProfileBtn.style.display = 'inline-flex';
      });
    }
    
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', async function() {
        const newName = editNameInput ? editNameInput.value.trim() : '';
        const newPhone = editPhoneInput ? editPhoneInput.value.trim() : '';
        
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = t.saving || 'Saving...';
        
        try {
          // Include websiteId for session isolation validation
          const res = await fetch(buildApiUrl('/api/ecommerce/customers/me'), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              websiteId: websiteId,
              name: newName,
              phone: newPhone
            })
          });
          
          const data = await res.json();
          
          if (data.success) {
            customerData.name = newName;
            customerData.phone = newPhone;
            
            if (profileNameEl) profileNameEl.textContent = newName || '-';
            if (profilePhoneEl) profilePhoneEl.textContent = newPhone || '-';
            
            if (profileDisplay) profileDisplay.style.display = 'flex';
            if (profileForm) profileForm.style.display = 'none';
            if (editProfileBtn) editProfileBtn.style.display = 'inline-flex';
            
            showToast(t.profileUpdated || 'Profile updated successfully', 'success');
          } else {
            throw new Error(data.error || 'Failed to update profile');
          }
        } catch (error) {
          console.error('Failed to save profile:', error);
          showToast(error.message || 'Error saving profile', 'error');
        } finally {
          saveProfileBtn.disabled = false;
          saveProfileBtn.textContent = t.saveChanges || 'Save Changes';
        }
      });
    }
    
    // Address management
    function renderAddresses() {
      if (!addressesList) return;
      
      if (!customerData.addresses || customerData.addresses.length === 0) {
        addressesList.innerHTML = '<div class="addresses-empty" id="addresses-empty"><p>' + (t.noAddresses || 'No saved addresses') + '</p></div>';
        return;
      }
      
      const labelNames = {
        home: t.home || 'Home',
        work: t.work || 'Work',
        other: t.other || 'Other'
      };
      
      addressesList.innerHTML = customerData.addresses.map(function(addr) {
        const labelText = labelNames[addr.label] || addr.label || t.other || 'Other';
        const isDefault = addr.isDefault;
        
        return '<div class="address-card' + (isDefault ? ' default' : '') + '" data-id="' + addr.id + '">' +
          '<div class="address-card-header">' +
            '<span class="address-label-tag">' + labelText + '</span>' +
            (isDefault ? '<span class="address-default-badge">' + (t.defaultAddress || 'Default') + '</span>' : '') +
          '</div>' +
          '<div class="address-card-body">' +
            '<div>' + (addr.street || '') + (addr.apartment ? ', ' + addr.apartment : '') + '</div>' +
            '<div>' + (addr.city || '') + (addr.zip ? ' ' + addr.zip : '') + '</div>' +
          '</div>' +
          '<div class="address-card-actions">' +
            '<button class="btn-icon btn-edit-address" data-id="' + addr.id + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
              '<span>' + (t.editAddress || 'Edit') + '</span>' +
            '</button>' +
            (!isDefault ? '<button class="btn-icon btn-default-address" data-id="' + addr.id + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
              '<span>' + (t.setAsDefault || 'Set as Default') + '</span>' +
            '</button>' : '') +
            '<button class="btn-icon btn-delete btn-delete-address" data-id="' + addr.id + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
              '<span>' + (t.deleteAddress || 'Delete') + '</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');
      
      // Attach event listeners
      addressesList.querySelectorAll('.btn-edit-address').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          openAddressModal(id);
        });
      });
      
      addressesList.querySelectorAll('.btn-default-address').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          setDefaultAddress(id);
        });
      });
      
      addressesList.querySelectorAll('.btn-delete-address').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          deleteAddress(id);
        });
      });
    }
    
    function openAddressModal(editId) {
      const isEdit = !!editId;
      
      if (addressModalTitle) {
        addressModalTitle.textContent = isEdit ? (t.editAddress || 'Edit Address') : (t.addAddress || 'Add Address');
      }
      
      // Reset form
      if (addressEditId) addressEditId.value = editId || '';
      if (addressLabelSelect) addressLabelSelect.value = 'home';
      if (addressStreetInput) addressStreetInput.value = '';
      if (addressApartmentInput) addressApartmentInput.value = '';
      if (addressCityInput) addressCityInput.value = '';
      if (addressZipInput) addressZipInput.value = '';
      if (addressDefaultCheckbox) addressDefaultCheckbox.checked = false;
      
      // Fill form if editing
      if (isEdit && customerData.addresses) {
        const addr = customerData.addresses.find(function(a) { return a.id === editId; });
        if (addr) {
          if (addressLabelSelect) addressLabelSelect.value = addr.label || 'home';
          if (addressStreetInput) addressStreetInput.value = addr.street || '';
          if (addressApartmentInput) addressApartmentInput.value = addr.apartment || '';
          if (addressCityInput) addressCityInput.value = addr.city || '';
          if (addressZipInput) addressZipInput.value = addr.zip || '';
          if (addressDefaultCheckbox) addressDefaultCheckbox.checked = !!addr.isDefault;
        }
      }
      
      if (addressModalOverlay) addressModalOverlay.style.display = 'flex';
    }
    
    function closeAddressModal() {
      if (addressModalOverlay) addressModalOverlay.style.display = 'none';
    }
    
    // Add address button
    if (addAddressBtn) {
      addAddressBtn.addEventListener('click', function() {
        openAddressModal(null);
      });
    }
    
    // Modal close buttons
    if (addressModalClose) {
      addressModalClose.addEventListener('click', closeAddressModal);
    }
    if (cancelAddressBtn) {
      cancelAddressBtn.addEventListener('click', closeAddressModal);
    }
    if (addressModalOverlay) {
      addressModalOverlay.addEventListener('click', function(e) {
        if (e.target === addressModalOverlay) closeAddressModal();
      });
    }
    
    // Save address
    if (saveAddressBtn) {
      saveAddressBtn.addEventListener('click', async function() {
        const street = addressStreetInput ? addressStreetInput.value.trim() : '';
        const city = addressCityInput ? addressCityInput.value.trim() : '';
        
        if (!street || !city) {
          showToast(isRTL ? 'נא למלא רחוב ועיר' : 'Please fill in street and city', 'error');
          return;
        }
        
        const editId = addressEditId ? addressEditId.value : '';
        const isEdit = !!editId;
        const isDefault = addressDefaultCheckbox ? addressDefaultCheckbox.checked : false;
        
        const addressData = {
          id: isEdit ? editId : 'addr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          label: addressLabelSelect ? addressLabelSelect.value : 'home',
          street: street,
          apartment: addressApartmentInput ? addressApartmentInput.value.trim() : '',
          city: city,
          zip: addressZipInput ? addressZipInput.value.trim() : '',
          isDefault: isDefault
        };
        
        // Update local addresses array
        let newAddresses = customerData.addresses ? customerData.addresses.slice() : [];
        
        if (isEdit) {
          newAddresses = newAddresses.map(function(a) {
            if (a.id === editId) return addressData;
            return a;
          });
        } else {
          newAddresses.push(addressData);
        }
        
        // If setting as default, unset others
        if (isDefault) {
          newAddresses = newAddresses.map(function(a) {
            if (a.id !== addressData.id) {
              return Object.assign({}, a, { isDefault: false });
            }
            return a;
          });
        }
        
        saveAddressBtn.disabled = true;
        saveAddressBtn.textContent = t.saving || 'Saving...';
        
        try {
          // Include websiteId for session isolation validation
          const res = await fetch(buildApiUrl('/api/ecommerce/customers/me'), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ websiteId: websiteId, addresses: newAddresses })
          });
          
          const data = await res.json();
          
          if (data.success) {
            customerData.addresses = newAddresses;
            renderAddresses();
            closeAddressModal();
            showToast(t.addressSaved || 'Address saved successfully', 'success');
          } else {
            throw new Error(data.error || 'Failed to save address');
          }
        } catch (error) {
          console.error('Failed to save address:', error);
          showToast(error.message || 'Error saving address', 'error');
        } finally {
          saveAddressBtn.disabled = false;
          saveAddressBtn.textContent = t.saveChanges || 'Save Changes';
        }
      });
    }
    
    async function setDefaultAddress(id) {
      const newAddresses = customerData.addresses.map(function(a) {
        return Object.assign({}, a, { isDefault: a.id === id });
      });
      
      try {
        // Include websiteId for session isolation validation
        const res = await fetch(buildApiUrl('/api/ecommerce/customers/me'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ websiteId: websiteId, addresses: newAddresses })
        });
        
        const data = await res.json();
        
        if (data.success) {
          customerData.addresses = newAddresses;
          renderAddresses();
          showToast(t.addressSaved || 'Default address updated', 'success');
        }
      } catch (error) {
        console.error('Failed to set default address:', error);
        showToast('Error updating default address', 'error');
      }
    }
    
    async function deleteAddress(id) {
      if (!confirm(t.confirmDelete || 'Are you sure you want to delete this address?')) {
        return;
      }
      
      const newAddresses = customerData.addresses.filter(function(a) {
        return a.id !== id;
      });
      
      try {
        // Include websiteId for session isolation validation
        const res = await fetch(buildApiUrl('/api/ecommerce/customers/me'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ websiteId: websiteId, addresses: newAddresses })
        });
        
        const data = await res.json();
        
        if (data.success) {
          customerData.addresses = newAddresses;
          renderAddresses();
          showToast(t.addressDeleted || 'Address deleted', 'success');
        }
      } catch (error) {
        console.error('Failed to delete address:', error);
        showToast('Error deleting address', 'error');
      }
    }
    
    // Load favorites
    loadCustomerFavorites();

    async function loadCustomerFavorites() {
      var favLoading = document.getElementById('favorites-loading');
      var favEmpty = document.getElementById('favorites-empty');
      var favGrid = document.getElementById('favorites-grid');
      if (!favLoading || !favGrid) return;

      try {
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
        var res = await fetch(buildApiUrl('/api/ecommerce/customers/me/favorites?websiteId=' + encodeURIComponent(websiteId)), {
          headers: { 'Authorization': 'Bearer ' + token },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        favLoading.style.display = 'none';

        if (!data.success || !data.data || data.data.length === 0) {
          if (favEmpty) favEmpty.style.display = 'block';
          return;
        }

        favGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;';
        favGrid.innerHTML = data.data.map(function(p) {
          var imgSrc = '';
          if (p.images) {
            try {
              var imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
              imgSrc = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : '';
            } catch(e) {}
          }
          var displayPrice = p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price)
            ? t.currency + parseFloat(p.sale_price).toFixed(2) + ' <span style="text-decoration:line-through;color:var(--text-secondary,#6b7280);font-weight:400;font-size:0.8em;">' + t.currency + parseFloat(p.price).toFixed(2) + '</span>'
            : t.currency + parseFloat(p.price).toFixed(2);

          return '<div class="favorite-card" style="background:transparent;border:1px solid var(--border-color,rgba(128,128,128,0.2));border-radius:12px;overflow:hidden;position:relative;transition:box-shadow 0.2s;" data-product-id="' + p.id + '">' +
            '<button class="favorite-remove-btn" style="position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(128,128,128,0.3);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;z-index:2;line-height:1;" onclick="removeFavoriteFromAccount(\'' + p.id + '\', this)" title="' + (t.removeFromFavorites || 'Remove') + '">&times;</button>' +
            '<a href="/product/' + (p.slug || p.id) + '" style="text-decoration:none;color:inherit;display:block;">' +
              (imgSrc ? '<img src="' + imgSrc + '" alt="' + (p.name || '').replace(/'/g, '&apos;') + '" style="width:100%;aspect-ratio:1;object-fit:contain;display:block;border-radius:8px 8px 0 0;">' : '<div style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#999;font-size:32px;">📦</div>') +
              '<div style="padding:12px;">' +
                '<h4 style="font-size:0.875rem;font-weight:500;color:var(--text-color,var(--text,inherit));margin:0 0 6px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (p.name || '') + '</h4>' +
                '<div style="font-weight:600;color:var(--primary-color,var(--primary,inherit));font-size:0.9rem;">' + displayPrice + '</div>' +
              '</div>' +
            '</a>' +
          '</div>';
        }).join('');
      } catch (error) {
        console.error('Failed to load favorites:', error);
        favLoading.style.display = 'none';
        if (favEmpty) favEmpty.style.display = 'block';
      }
    }

    // Load orders
    loadCustomerOrders();
    
    async function loadCustomerOrders() {
      if (!ordersLoading || !ordersList) return;
      
      try {
        // Include websiteId for session isolation validation
        const res = await fetch(buildApiUrl('/api/ecommerce/customers/me/orders?websiteId=' + encodeURIComponent(websiteId)), {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        
        const data = await res.json();
        
        ordersLoading.style.display = 'none';
        
        if (!data.success || !data.data || data.data.length === 0) {
          if (ordersEmpty) ordersEmpty.style.display = 'block';
          return;
        }
        
        ordersList.style.display = 'block';
        ordersList.innerHTML = data.data.map(function(order) {
          const statusKey = 'status' + (order.payment_status || order.status || 'pending').charAt(0).toUpperCase() + (order.payment_status || order.status || 'pending').slice(1);
          const statusText = t[statusKey] || order.payment_status || order.status || 'pending';
          const orderDate = new Date(order.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US');
          
          // Parse items if it's a JSON string
          let orderItems = order.items;
          if (typeof orderItems === 'string') {
            try { orderItems = JSON.parse(orderItems); } catch(e) { orderItems = []; }
          }
          orderItems = orderItems || [];
          
          // Get total - try different field names
          const orderTotal = parseFloat(order.total || order.total_amount || 0);
          
          return '<div class="order-card">' +
            '<div class="order-card-header">' +
              '<span class="order-number">#' + (order.order_number || order.id.slice(0, 8)) + '</span>' +
              '<span class="order-status status-' + (order.payment_status || order.status) + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="order-card-body">' +
              '<div class="order-info-row">' +
                '<span class="order-label">' + (t.orderDate || 'Date') + ':</span>' +
                '<span class="order-value">' + orderDate + '</span>' +
              '</div>' +
              '<div class="order-info-row">' +
                '<span class="order-label">' + (t.orderTotal || 'Total') + ':</span>' +
                '<span class="order-value">' + t.currency + orderTotal.toFixed(2) + '</span>' +
              '</div>' +
              (orderItems.length > 0 ? '<div class="order-items-summary">' +
                orderItems.slice(0, 3).map(function(item) {
                  const itemName = item.name || item.productName || 'Item';
                  var qtyLabel = item.quantity > 1 || (item.quantityUnit && item.quantityUnit !== 'piece') ? ' x' + item.quantity : '';
                  if (qtyLabel && item.quantityUnit && item.quantityUnit !== 'piece') {
                    var uLabel = item.customUnitLabel || (t.unitLabels && t.unitLabels[item.quantityUnit]) || item.quantityUnit;
                    qtyLabel += ' ' + uLabel;
                  }
                  return '<span class="order-item-name">' + itemName + qtyLabel + '</span>';
                }).join(', ') +
                (orderItems.length > 3 ? '...' : '') +
              '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('');
        
      } catch (error) {
        console.error('Failed to load orders:', error);
        ordersLoading.style.display = 'none';
        if (ordersEmpty) {
          ordersEmpty.querySelector('p').textContent = t.errorLoading || 'Error loading orders';
          ordersEmpty.style.display = 'block';
        }
      }
    }
  }

  window.removeFavoriteFromAccount = function(productId, btnEl) {
    var tokenKey = 'zappy_customer_token_' + websiteId;
    var tkn = localStorage.getItem(tokenKey);
    if (!tkn) return;
    var card = btnEl.closest('.favorite-card');
    if (card) card.style.opacity = '0.5';

    fetch(buildApiUrl('/api/ecommerce/customers/me/favorites/' + productId + '?websiteId=' + encodeURIComponent(websiteId)), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + tkn }
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.success && card) {
        card.remove();
        var grid = document.getElementById('favorites-grid');
        if (grid && grid.children.length === 0) {
          grid.style.display = 'none';
          var empty = document.getElementById('favorites-empty');
          if (empty) empty.style.display = 'block';
        }
      }
    }).catch(function() {
      if (card) card.style.opacity = '1';
    });
  };
  
  // Update header auth state
  function updateHeaderAuthState() {
    // Use site-specific localStorage key for session isolation
    const token = localStorage.getItem('zappy_customer_token_' + websiteId);
    
    // Find login links and account links
    const loginLinks = document.querySelectorAll('a[href="/login"]');
    const accountLinks = document.querySelectorAll('a[href="/account"]');
    
    if (token) {
      // User is logged in - redirect login links to account page
      loginLinks.forEach(function(link) {
        link.href = '/account';
      });
    } else {
      // User is not logged in - redirect account links to login page
      accountLinks.forEach(function(link) {
        link.href = '/login';
        link.addEventListener('click', function() {
          var currentPath = window.location.pathname + window.location.search;
          var currentUrl = window.location.href;
          if (currentUrl.includes('/api/website/preview')) {
            var pageParam = new URLSearchParams(window.location.search).get('page') || '/';
            sessionStorage.setItem('zappy_login_return', pageParam);
          } else if (currentPath !== '/login') {
            sessionStorage.setItem('zappy_login_return', currentPath);
          }
        });
      });
    }
  }
  
  function initAll() {
    updateCartCount();
    loadProducts();
    initFilterButtons();
    renderCart();
    loadShippingMethods();
    loadPaymentMethods();
    updateOrderTotals();
    initSearch();
    initMobileSearch();
    initMobileMenuHandling();
    syncMobileToggleWithMenu();
    initMobileCategoriesSubmenu();
    initCartDrawer();
    initCheckout();
    initCoupon();
    fetchSeasonalDiscounts();
    initOrderSuccess();
    initLogin();
    initAccount();
    updateHeaderAuthState();
  }
  
  // Add categories submenu to Products link in mobile menu
  function initMobileCategoriesSubmenu() {
    // Only run on mobile
    if (window.innerWidth > 768) return;
    
    // Find the Products link in the mobile menu
    const productsLinks = document.querySelectorAll('a[href="/products"], a[href*="/products"]');
    if (!productsLinks.length) return;
    
    // Get categories from the catalog menu or fetch them
    const catalogMenu = document.getElementById('zappy-category-links');
    let categories = [];
    
    if (catalogMenu) {
      const categoryLinks = catalogMenu.querySelectorAll('a');
      categoryLinks.forEach(function(link) {
        categories.push({ name: link.textContent.trim(), href: link.href });
      });
    }
    
    // If no categories from DOM, try to fetch them
    if (categories.length === 0) {
      const websiteId = window.ZAPPY_WEBSITE_ID;
      if (websiteId) {
        fetch(buildApiUrl('/api/ecommerce/' + websiteId + '/categories'))
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.categories && data.categories.length > 0) {
              categories = data.categories.map(function(c) {
                // Use SEO-friendly slug URL, fallback to id for backward compatibility
                return { name: c.name, href: '/category/' + (c.slug || c.id) };
              });
              addSubmenuToProductsLinks(productsLinks, categories);
            }
          })
          .catch(function() {});
      }
    } else {
      addSubmenuToProductsLinks(productsLinks, categories);
    }
  }
  
  function addSubmenuToProductsLinks(links, categories) {
    if (!categories.length) return;
    
    links.forEach(function(link) {
      // Skip if already has submenu
      if (link.parentElement.querySelector('.mobile-categories-submenu')) return;
      
      // Only process links in mobile menu context
      const parent = link.closest('.nav-menu, .mobile-menu, .mobile-nav, [class*="mobile"], [class*="nav-menu"]');
      if (!parent) return;
      
      // Create submenu container
      const submenu = document.createElement('div');
      submenu.className = 'mobile-categories-submenu';
      submenu.innerHTML = categories.map(function(cat) {
        return '<a href="' + cat.href + '">' + cat.name + '</a>';
      }).join('');
      
      // Wrap the link content for toggle
      const originalText = link.innerHTML;
      link.innerHTML = '<span class="products-menu-toggle">' + originalText + '</span>';
      link.classList.add('products-menu-item');
      
      // Insert submenu after the link
      link.parentElement.insertBefore(submenu, link.nextSibling);
      
      // Toggle submenu on click
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const toggle = link.querySelector('.products-menu-toggle');
        if (toggle) toggle.classList.toggle('active');
        submenu.classList.toggle('active');
      });
    });
  }
  
  // Handle both cases: DOM already loaded or not yet loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    // DOM already loaded, run immediately
    initAll();
  }
  
  // Register language change callback to refresh products when language changes
  // This ensures translated product names, descriptions, etc. are displayed
  if (typeof zappyI18n !== 'undefined' && typeof zappyI18n.onLanguageChange === 'function') {
    zappyI18n.onLanguageChange(function(newLang, oldLang) {
      console.log('[E-COMMERCE MAIN] Language changed from ' + oldLang + ' to ' + newLang + ', refreshing products...');
      
      // Refresh products listing with translated content
      loadProducts();
      
      // Also refresh search results if any products were loaded for search
      if (typeof loadAllProductsForSearch === 'function') {
        loadAllProductsForSearch();
      }
    });
    console.log('[E-COMMERCE MAIN] Registered language change callback for products refresh');
  }
})();

;
// Catalog mode flag - set at generation time
const isCatalogMode = false; // true = catalog only (no cart/checkout), false = full e-commerce

// API base helper for additional JS
function getApiBase() {
  var explicitBase = (window.ZAPPY_API_BASE || '').replace(/\/$/, '');
  var path = window.location ? window.location.pathname : '';
  if (path.indexOf('/preview') !== -1 || path.indexOf('/preview-fullscreen') !== -1) {
    return window.location.origin;
  }
  return explicitBase;
}
function buildApiUrl(path) {
  if (path.charAt(0) !== '/') {
    path = '/' + path;
  }
  var apiBase = getApiBase();
  return apiBase ? apiBase + path : path;
}

// Get current language for API calls (uses i18next if available, falls back to HTML lang attribute)
function getCurrentLanguage() {
  // Try i18next first (if multilingual site)
  if (typeof i18next !== 'undefined' && i18next.language) {
    return i18next.language;
  }
  // Fall back to HTML lang attribute
  var htmlLang = document.documentElement.getAttribute('lang');
  if (htmlLang) {
    return htmlLang;
  }
  return null;
}

// Build API URL with language parameter for e-commerce translations
function buildApiUrlWithLang(path) {
  var url = buildApiUrl(path);
  var lang = getCurrentLanguage();
  if (lang) {
    // Add lang parameter to URL
    url += (url.indexOf('?') === -1 ? '?' : '&') + 'lang=' + encodeURIComponent(lang);
  }
  return url;
}

// Store settings for this section
let additionalJsProductLayout = 'standard';
let additionalJsSettingsFetched = false;
let additionalJsAllProductsLabel = null;
let additionalJsProductsMenuLabel = null;
let additionalJsShowAllProductsSubmenu = true;
let additionalJsShowStockStatus = true;
let additionalJsSidebarFiltersConfig = {};
let additionalJsSortingConfig = {};
let additionalJsViewToggleEnabled = true;
let additionalJsProductPageNote = null;
let catCurrentSortKey = 'popularity';
let catCurrentViewMode = localStorage.getItem('zappy_view_mode_' + (window.ZAPPY_WEBSITE_ID || '')) || 'grid';
let catActiveSidebarFilters = { categories: [], brands: [], tags: [], priceMin: null, priceMax: null, sale: false };
let catCurrentFilter = 'all';
let catProductsCache = [];

// Fetch store settings (announcement bar, product layout, etc.)
// Pass force=true to bypass the cache and re-fetch (e.g., when language changes)
async function fetchAdditionalJsSettings(force) {
  if (additionalJsSettingsFetched && !force) return;
  const websiteId = window.ZAPPY_WEBSITE_ID;
  if (!websiteId) return;
  try {
    const res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/settings?websiteId=' + websiteId));
    const data = await res.json();
    if (data.success && data.data) {
      if (data.data.productLayout) {
        additionalJsProductLayout = data.data.productLayout;
      }
      // Handle custom "All Products" label (catalog menu bar + nav dropdown first item)
      if (data.data.allProductsLabel) {
        additionalJsAllProductsLabel = data.data.allProductsLabel;
        // Update the catalog menu "All Products" link text
        var allProductsLink = document.querySelector('.catalog-menu-all');
        if (allProductsLink) {
          allProductsLink.textContent = data.data.allProductsLabel;
        }
        // Update the nav dropdown "All Products" link text (first item)
        var navList = document.getElementById('zappy-nav-category-links');
        if (navList) {
          var firstNavLink = navList.querySelector('li:first-child a');
          var firstNavHref = firstNavLink ? firstNavLink.getAttribute('href') : '';
          if (firstNavLink && (firstNavHref === '/products' || firstNavHref.indexOf('/products') !== -1 || firstNavHref.indexOf('%2Fproducts') !== -1)) {
            firstNavLink.textContent = data.data.allProductsLabel;
          }
        }
      }
      // Handle custom "Products" nav menu trigger label
      if (data.data.productsMenuLabel) {
        additionalJsProductsMenuLabel = data.data.productsMenuLabel;
        var productsDropdown = document.querySelector('.zappy-products-dropdown > a');
        if (productsDropdown) {
          // Preserve the dropdown arrow SVG, only replace the text node
          var arrowSvg = productsDropdown.querySelector('svg');
          productsDropdown.textContent = '';
          productsDropdown.appendChild(document.createTextNode(data.data.productsMenuLabel + ' '));
          if (arrowSvg) productsDropdown.appendChild(arrowSvg);
        }
        // Update search placeholders to use custom label
        var isRTLPage = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'he' || document.documentElement.lang === 'ar';
        var searchPlaceholder = isRTLPage
          ? ('חיפוש ' + data.data.productsMenuLabel + '...')
          : ('Search ' + data.data.productsMenuLabel.toLowerCase() + '...');
        var navSearchInput = document.getElementById('nav-search-input');
        if (navSearchInput) navSearchInput.placeholder = searchPlaceholder;
        var mobileSearchInput = document.getElementById('mobile-search-input');
        if (mobileSearchInput) mobileSearchInput.placeholder = searchPlaceholder;
        // Update products page title
        var pageTitle = document.getElementById('products-page-title');
        if (pageTitle) pageTitle.textContent = data.data.productsMenuLabel;
      }
      // Handle show/hide "All Products" submenu item
      if (data.data.showAllProductsSubmenu === false) {
        additionalJsShowAllProductsSubmenu = false;
        // Hide the "All Products" item in nav dropdown
        var navList = document.getElementById('zappy-nav-category-links');
        if (navList) {
          var firstItem = navList.querySelector('li:first-child');
          if (firstItem) {
            var firstLink = firstItem.querySelector('a');
            var href = firstLink ? firstLink.getAttribute('href') : '';
            if (href === '/products' || href.indexOf('/products') !== -1 || href.indexOf('%2Fproducts') !== -1) {
              firstItem.style.display = 'none';
            }
          }
        }
        // Hide the "All Products" link in catalog bar
        var allProdLink = document.querySelector('.catalog-menu-all');
        if (allProdLink) allProdLink.style.display = 'none';
        collapseEmptyProductsDropdown();
      }
      // Handle show/hide stock status label
      if (data.data.showStockStatus === false) {
        additionalJsShowStockStatus = false;
        var stockEl = document.getElementById('product-stock-display');
        if (stockEl) stockEl.style.display = 'none';
      }
      if (data.data.sidebarFiltersConfig) {
        additionalJsSidebarFiltersConfig = data.data.sidebarFiltersConfig;
      }
      if (data.data.sortingConfig) {
        additionalJsSortingConfig = data.data.sortingConfig;
      }
      if (data.data.viewToggleEnabled != null) {
        additionalJsViewToggleEnabled = data.data.viewToggleEnabled;
      }
      additionalJsProductPageNote = data.data.productPageNote || null;
      // Show/hide catalog menu based on store settings
      var catalogMenu = document.getElementById('zappy-catalog-menu');
      if (catalogMenu) {
        if (data.data.catalogMenuEnabled === true) {
          catalogMenu.style.removeProperty('display');
        } else {
          catalogMenu.style.setProperty('display', 'none', 'important');
        }
        if (typeof setupFixedHeaders === 'function') {
          setTimeout(setupFixedHeaders, 50);
        }
      }
      // Hide/show featured sections based on store settings
      var hiddenSections = data.data.hiddenHomeSections || [];
      var homePageSections = ['featured-products', 'featured-categories'];
      for (var hi = 0; hi < homePageSections.length; hi++) {
        var sec = document.getElementById(homePageSections[hi]);
        if (sec) {
          if (hiddenSections.indexOf(homePageSections[hi]) !== -1) {
            sec.style.setProperty('display', 'none', 'important');
          } else {
            sec.style.removeProperty('display');
          }
        }
      }
      // Handle dynamic announcement bar
      handleDynamicAnnouncementBar(data.data.announcementBar);
      additionalJsSettingsFetched = true;
    }
  } catch (e) {
    console.warn('Failed to fetch store settings:', e);
  }
}

// Dynamically create/update/remove announcement bar based on settings
function handleDynamicAnnouncementBar(settings) {
  // On focused pages (product/checkout/order), skip creating/showing announcement bar
  if (document.body.classList.contains('zappy-focused-page')) return;

  var existingBar = document.querySelector('.zappy-announcement-bar');
  
  // If disabled or no messages, remove existing bar
  if (!settings) {
    if (existingBar) {
      existingBar.remove();
      var styleTag = document.getElementById('zappy-announcement-bar-style');
      if (styleTag) styleTag.remove();
    }
    return;
  }
  if (!settings.enabled) {
    if (existingBar) {
      existingBar.remove();
      var styleTag2 = document.getElementById('zappy-announcement-bar-style');
      if (styleTag2) styleTag2.remove();
    }
    return;
  }
  if (!settings.messages) {
    if (existingBar) {
      existingBar.remove();
      var styleTag3 = document.getElementById('zappy-announcement-bar-style');
      if (styleTag3) styleTag3.remove();
    }
    return;
  }
  if (settings.messages.length === 0) {
    if (existingBar) {
      existingBar.remove();
      var styleTag4 = document.getElementById('zappy-announcement-bar-style');
      if (styleTag4) styleTag4.remove();
    }
    return;
  }
  
  // Filter out empty messages
  var messages = [];
  for (var i = 0; i < settings.messages.length; i++) {
    var m = settings.messages[i];
    if (m) {
      var trimmed = m.trim();
      if (trimmed !== '') {
        messages.push(m);
      }
    }
  }
  if (messages.length === 0) {
    if (existingBar) existingBar.remove();
    return;
  }
  
  var bgColor = settings.bgColor || '#000000';
  var textColor = settings.textColor || '#ffffff';
  var interval = settings.interval || 4000;
  
  // Create or update announcement bar
  if (!existingBar) {
    // Add CSS if not already present
    if (!document.getElementById('zappy-announcement-bar-style')) {
      var style = document.createElement('style');
      style.id = 'zappy-announcement-bar-style';
      style.textContent = '.zappy-announcement-bar { ' +
        'background-color: ' + bgColor + '; ' +
        'color: ' + textColor + '; ' +
        'position: fixed; top: 0; left: 0; right: 0; width: 100%; ' +
        'text-align: center; padding: 10px 20px; font-size: 14px; ' +
        'font-weight: 500; line-height: 1.4; box-sizing: border-box; ' +
        'z-index: 1001; min-height: 40px; display: flex; ' +
        'align-items: center; justify-content: center; ' +
      '} ' +
      '.zappy-announcement-bar .zappy-announcement-message { ' +
        'position: absolute; opacity: 0; transition: opacity 0.5s ease-in-out; ' +
        'width: 100%; left: 0; right: 0; padding: 0 20px; box-sizing: border-box; ' +
      '} ' +
      '.zappy-announcement-bar .zappy-announcement-message.active { opacity: 1; }';
      document.head.appendChild(style);
    }
    
    // Create announcement bar HTML
    var bar = document.createElement('div');
    bar.className = 'zappy-announcement-bar';
    var messagesHtml = '';
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      var escapedMsg = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var activeClass = (j === 0) ? ' active' : '';
      messagesHtml += '<span class="zappy-announcement-message' + activeClass + '">' + escapedMsg + '</span>';
    }
    bar.innerHTML = messagesHtml;
    
    // Insert at start of body
    document.body.insertBefore(bar, document.body.firstChild);
    
    // Set up rotation if multiple messages
    if (messages.length > 1) {
      var currentIndex = 0;
      setInterval(function() {
        var allMsgs = bar.querySelectorAll('.zappy-announcement-message');
        allMsgs[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % allMsgs.length;
        allMsgs[currentIndex].classList.add('active');
      }, interval);
    }
    
    // Trigger layout recalculation for fixed headers
    if (typeof setupFixedHeaders === 'function') {
      setTimeout(setupFixedHeaders, 100);
    }
  } else {
    // Update existing bar colors and messages
    existingBar.style.backgroundColor = bgColor;
    existingBar.style.color = textColor;
  }
}

// Load featured products on home page (uses public storefront API)
// Only shows products marked as "featured" - no fallback to all products
async function loadFeaturedProducts() {
  const grid = document.getElementById('zappy-featured-products');
  if (!grid) return;
  const websiteId = window.ZAPPY_WEBSITE_ID;
  if (!websiteId) return;
  
  // Ensure store settings are loaded first (for productLayout)
  await fetchAdditionalJsSettings();
  
  const t = {"products":"Products","ourProducts":"Our Products","featuredProducts":"Featured Products","noFeaturedProducts":"No featured products yet. Check out all our products!","featuredCategories":"Shop by Category","all":"All","featured":"Featured","new":"New","sale":"Sale","loadingProducts":"Loading products...","cart":"Cart","yourCart":"Your Cart","emptyCart":"Cart is empty","total":"Total","proceedToCheckout":"Proceed to Checkout","checkout":"Checkout","customerInfo":"Customer Info","fullName":"Full Name","email":"Email","phone":"Phone","shippingAddress":"Shipping Address","street":"Street Address","streetAndNumber":"Street and Number","apartment":"Apt, Floor, Unit","apartmentExt":"Apt, Floor, Building Code, Notes, Etc.","city":"City","zip":"ZIP Code","zipPostal":"Zip / Postal Code","countryRegion":"Country / Region","stateProvince":"State / Province","stateRequired":"Please select a state / province","saveAddressForNextTime":"Save this address for next time","shippingMethod":"Shipping Method","loadingShipping":"Loading shipping methods...","payment":"Payment","loadingPayment":"Loading payment options...","orderSummary":"Order Summary","subtotal":"Subtotal","vat":"VAT","vatIncluded":"VAT Included","shipping":"Shipping","discount":"Discount","totalToPay":"Total","placeOrder":"Place Order","login":"Login","customerLogin":"Customer Login","enterEmail":"Enter your email and we'll send you a login code","emailAddress":"Email Address","sendCode":"Send Code","enterCode":"Enter the code sent to your email","verificationCode":"Verification Code","verify":"Verify","returnPolicy":"Return Policy","addToCart":"Add to Cart","startingAt":"Starting at","addedToCart":"Product added to cart!","remove":"Remove","noProducts":"No products to display","errorLoading":"Error loading","days":"days","currency":"$","free":"FREE","freeAbove":"Free above","noShippingMethods":"No shipping options available","viewAllResults":"View all results","searchProducts":"Search products","productDetails":"Product Details","viewDetails":"View Details","inStock":"In Stock","outOfStock":"Out of Stock","pleaseSelect":"Please select","sku":"SKU","category":"Category","relatedProducts":"Related Products","frequentlyBoughtTogether":"Frequently bought together","frequentlyBoughtTogetherSubtitle":"Save time and get everything you need","bundleTotal":"Bundle total","addBundleToCart":"Add {count} items to cart","upsellFree":"Free","productNotFound":"Product not found","backToProducts":"Back to Products","home":"Home","quantity":"Quantity","unitLabels":{"piece":"pcs","kg":"kg","gram":"g","liter":"L","ml":"ml"},"perUnit":"/","couponCode":"Coupon Code","enterCouponCode":"Enter coupon code","applyCoupon":"Apply","removeCoupon":"Remove","couponApplied":"Coupon applied successfully!","invalidCoupon":"Invalid coupon code","couponExpired":"Coupon has expired","couponMinOrder":"Minimum order amount","alreadyHaveAccount":"Already have an account?","loginHere":"Login here","signInHere":"Sign in here","mobileNumber":"Mobile Number","loggedInAs":"Logged in as:","logout":"Logout","haveCouponCode":"I have a coupon code","agreeToTerms":"I agree to the","termsAndConditions":"Terms and Conditions","pleaseAcceptTerms":"Please accept the terms and conditions","nameRequired":"Please enter your full name","emailRequired":"Please enter your email address","emailInvalid":"Please enter a valid email address","phoneRequired":"Please enter your phone number","shippingRequired":"Please select a shipping method","streetRequired":"Please enter your street address","cityRequired":"Please enter your city","cartEmpty":"Your cart is empty","paymentNotConfigured":"Online payment not configured","orderSuccess":"Order Received!","thankYouOrder":"Thank you for your order","orderNumber":"Order Number","orderConfirmation":"A confirmation email has been sent to you","orderProcessing":"Your order is being processed. We'll notify you when it ships.","continueShopping":"Continue Shopping","next":"Next","contactInformation":"Contact Information","items":"Items","continueToHomePage":"Continue to Home Page","transactionDate":"Transaction Date","paymentMethod":"Payment Method","orderDetails":"Order Details","loadingOrder":"Loading order details...","orderNotFound":"Order not found","orderItems":"Order Items","paidAmount":"Amount Paid","myAccount":"My Account","accountWelcome":"Welcome","yourOrders":"Your Orders","noOrders":"No orders yet","orderDate":"Date","orderStatus":"Status","orderTotal":"Total","viewOrder":"View Order","statusPending":"Pending Payment","statusPaid":"Paid","statusProcessing":"Processing","statusShipped":"Shipped","statusDelivered":"Delivered","statusCancelled":"Cancelled","notLoggedIn":"Not Logged In","pleaseLogin":"Please login to view your account","personalDetails":"Personal Details","editProfile":"Edit Profile","name":"Name","saveChanges":"Save Changes","cancel":"Cancel","addresses":"Addresses","addAddress":"Add Address","editAddress":"Edit Address","deleteAddress":"Delete Address","setAsDefault":"Set as Default","defaultAddress":"Default Address","addressLabel":"Address Label","work":"Work","other":"Other","noAddresses":"No saved addresses","confirmDelete":"Are you sure you want to delete?","profileUpdated":"Profile updated successfully","addressSaved":"Address saved successfully","addressDeleted":"Address deleted","saving":"Saving...","saveToFavorites":"Save to Favorites","removeFromFavorites":"Remove from Favorites","shareProduct":"Share Product","linkCopied":"Link copied!","myFavorites":"My Favorites","noFavorites":"No favorites yet","addedToFavorites":"Added to favorites","removedFromFavorites":"Removed from favorites","loginToFavorite":"Log in to save favorites","browseFavorites":"Discover all our products","selectVariant":"Select option","variantUnavailable":"Unavailable","color":"Color","size":"Size","material":"Material","style":"Style","weight":"Weight","capacity":"Capacity","length":"Length","inquiryAbout":"Inquiry about","sendInquiry":"Send Inquiry","callNow":"Call Now","specifications":"Specifications","storeNote":"Additional Information","businessPhone":"[business_phone]","businessEmail":"[business_email]"};
  
  try {
    // Only fetch featured products - no fallback, with language support
    const res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/products?websiteId=' + websiteId + '&featured=true'));
    const data = await res.json();
    if (!data.success || !data.data?.length) {
      // Show a friendly message when no featured products
      grid.innerHTML = '<div class="no-featured-products">' + (t.noFeaturedProducts || 'No featured products yet. Check out all our products!') + '</div>';
      return;
    }
    renderProductGrid(grid, data.data, t, true);
  } catch (e) {
    console.error('Failed to load featured products', e);
    grid.innerHTML = '<div class="empty-cart">' + t.errorLoading + '</div>';
  }
}

// Load featured categories on home page (uses public storefront API)
// Only shows categories marked as "featured" with images
async function loadFeaturedCategories() {
  const container = document.getElementById('zappy-featured-categories');
  if (!container) return;
  const websiteId = window.ZAPPY_WEBSITE_ID;
  if (!websiteId) return;
  
  try {
    const res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/featured-categories?websiteId=' + websiteId));
    const data = await res.json();
    if (!data.success || !data.data?.length) {
      // Remove the entire section if no featured categories
      const section = document.getElementById('featured-categories');
      if (section) section.remove();
      return;
    }
    
    // Render category blocks with SEO-friendly slug URLs
    container.innerHTML = data.data.map(function(cat) {
      const imageUrl = resolveProductImageUrl(cat.image) || '';
      // Use SEO-friendly slug URL, fallback to id for backward compatibility
      const categoryUrl = '/category/' + (cat.slug || cat.id);
      return '<a href="' + categoryUrl + '" class="category-block" data-category-id="' + cat.id + '" data-category-slug="' + (cat.slug || '') + '">' +
        '<div class="category-block-bg" style="background-image: url(\'' + imageUrl + '\')"></div>' +
        '<div class="category-block-overlay"></div>' +
        '<div class="category-block-content">' +
          '<span class="category-block-name">' + cat.name + '</span>' +
        '</div>' +
      '</a>';
    }).join('');
  } catch (e) {
    console.error('Failed to load featured categories', e);
    // Remove section on error
    const section = document.getElementById('featured-categories');
    if (section) section.remove();
  }
}

// Helper to get localized e-commerce UI text
// Tries zappyI18n first for multilingual support, falls back to static t object
function getEcomText(key, fallback) {
  if (typeof zappyI18n !== 'undefined' && typeof zappyI18n.t === 'function') {
    var translated = zappyI18n.t('ecom_' + key);
    // If translation exists and is not just the key, use it
    if (translated && translated !== 'ecom_' + key) {
      return translated;
    }
  }
  return fallback;
}

// Helper to strip HTML tags - defined here since ecommerceJs uses an IIFE and its scope is not accessible

// Helper to strip HTML tags and convert rich text to plain text for card previews
function stripHtmlToText(html) {
  if (!html) return '';
  // Create a temporary element to parse HTML
  var temp = document.createElement('div');
  temp.innerHTML = html;
  // Replace block-level elements' closing tags with space to preserve word boundaries
  // This handles </p>, </div>, </li>, <br>, etc. from rich text editors
  temp.innerHTML = temp.innerHTML
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/li>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/h[1-6]>/gi, ' ');
  // Get text content (strips remaining HTML tags)
  var text = temp.textContent || temp.innerText || '';
  // Normalize whitespace (replace multiple spaces/newlines with single space)
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}


function renderProductGrid(grid, products, t, isFeaturedSection, viewMode) {
  // Update grid class based on layout (only for product grids, not featured section which has its own styling)
  var layout = additionalJsProductLayout || 'standard';
  if (!isFeaturedSection) {
    var viewClass = (viewMode === 'list') ? ' view-list' : '';
    grid.className = 'product-grid layout-' + layout + viewClass;
    grid.setAttribute('data-zappy-auto-grid', 'true');
  }
  
  // Get localized text for UI elements
  var localizedAddToCart = getEcomText('addToCart', t.addToCart);
  var localizedViewDetails = getEcomText('viewDetails', t.viewDetails);
  
  grid.innerHTML = products.map(p => {
    // Check if price should be displayed (default to true if not set)
    const showPrice = p.custom_fields?.showPrice !== false;
    const hasSalePrice = p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price);
    const variantCount = parseInt(p.variant_count || 0, 10);
    const variantPriceCount = parseInt(p.variant_price_count || 0, 10);
    const variantMinPrice = parseFloat(p.variant_min_price);
    const variantMaxPrice = parseFloat(p.variant_max_price);
    const hasVariantPriceRange = variantCount > 1 && variantPriceCount > 1 && Number.isFinite(variantMinPrice) && Number.isFinite(variantMaxPrice) && variantMinPrice !== variantMaxPrice;
    const startingAtLabel = getEcomText('startingAt', t.startingAt || 'Starting at');

    // Check for seasonal discount on this product
    var seasonalD = typeof getSeasonalDiscountForProduct === 'function' ? getSeasonalDiscountForProduct(p.id) : null;
    var effectivePrice = parseFloat(p.price);
    var effectiveSalePrice = hasSalePrice ? parseFloat(p.sale_price) : null;
    var seasonalApplied = false;

    if (seasonalD && !hasVariantPriceRange) {
      var basePrice = effectiveSalePrice !== null ? effectiveSalePrice : effectivePrice;
      var discountedPrice = basePrice;
      if (seasonalD.type === 'percentage') {
        discountedPrice = basePrice - (basePrice * parseFloat(seasonalD.value) / 100);
      } else if (seasonalD.type === 'fixed') {
        discountedPrice = Math.max(0, basePrice - parseFloat(seasonalD.value));
      }
      if (discountedPrice < basePrice) {
        seasonalApplied = true;
        effectiveSalePrice = discountedPrice;
      }
    }

    var displayPrice;
    if (!showPrice) {
      displayPrice = '';
    } else if (hasVariantPriceRange) {
      displayPrice = startingAtLabel + ' ' + t.currency + variantMinPrice.toFixed(2);
    } else if (seasonalApplied && effectiveSalePrice !== null) {
      displayPrice = t.currency + effectiveSalePrice.toFixed(2) + ' <span class="original-price">' + t.currency + effectivePrice.toFixed(2) + '</span>';
    } else if (hasSalePrice) {
      displayPrice = t.currency + parseFloat(p.sale_price).toFixed(2) + ' <span class="original-price">' + t.currency + parseFloat(p.price).toFixed(2) + '</span>';
    } else {
      displayPrice = t.currency + parseFloat(p.price).toFixed(2);
    }
    
    // Get first image with correct URL in preview/live
    var imageUrl = p.images && p.images[0]
      ? (window.resolveProductImageUrl ? window.resolveProductImageUrl(p.images[0]) : p.images[0])
      : '';
    
    // Build tag badges (manual only - all tags come from product.tags array)
    var tagBadges = [];
    if (p.tags && p.tags.length) {
      p.tags.forEach(function(tag) {
        var tagLower = tag.toLowerCase();
        // Apply special styling for known tag types
        if (tagLower === 'sale' || tagLower === 'מבצע') {
          tagBadges.push('<span class="product-tag tag-sale">' + tag + '</span>');
        } else if (tagLower === 'new' || tagLower === 'חדש') {
          tagBadges.push('<span class="product-tag tag-new">' + tag + '</span>');
        } else if (tagLower === 'featured' || tagLower === 'מומלץ') {
          tagBadges.push('<span class="product-tag tag-featured">' + tag + '</span>');
        } else {
          tagBadges.push('<span class="product-tag">' + tag + '</span>');
        }
      });
    }
    var tagsHtml = tagBadges.length > 0 ? '<div class="product-tags">' + tagBadges.join('') + '</div>' : '';
    
    // Build card content based on layout
    var cardContent = '';
    var imageHtml = imageUrl ? '<img src="' + imageUrl + '" alt="' + p.name + '">' : '<div class="no-image-placeholder">📦</div>';
    var layout = additionalJsProductLayout || 'standard';
    
    // Only include price div if showPrice is true
    var pricePerUnitHtml = getPricePerUnitHtml(p);
    var priceHtml = showPrice ? '<div class="price">' + displayPrice + '</div>' + pricePerUnitHtml : '';
    
    var favBtnHtml = isCatalogMode ? '' : '<button type="button" class="card-favorite-btn" data-product-id="' + p.id + '" onclick="event.preventDefault(); event.stopPropagation(); toggleCardFavorite(this, \'' + p.id + '\')" title="Save to favorites" aria-pressed="false"><svg class="heart-outline" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M14.7917 0.833C12.705 0.833 10.811 2.376 10 4.462C9.189 2.375 7.295 0.833 5.208 0.833C2.337 0.833 0 3.17 0 6.042C0 11.675 8.128 17.767 9.758 18.93L10 19.104L10.243 18.93C11.873 17.767 20 11.674 20 6.042C20 3.17 17.663 0.833 14.792 0.833ZM10 18.078C5.716 14.965 0.833 10.019 0.833 6.042C0.833 3.629 2.796 1.667 5.208 1.667C7.498 1.667 9.583 4.05 9.583 6.667H10.417C10.417 4.05 12.502 1.667 14.792 1.667C17.204 1.667 19.167 3.629 19.167 6.042C19.167 10.019 14.284 14.965 10 18.078Z" fill="currentColor"/></svg><svg class="heart-filled" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path d="M14.7917 0.833C12.705 0.833 10.811 2.376 10 4.462C9.189 2.375 7.295 0.833 5.208 0.833C2.337 0.833 0 3.17 0 6.042C0 11.675 8.128 17.767 9.758 18.93L10 19.104L10.243 18.93C11.873 17.767 20 11.674 20 6.042C20 3.17 17.663 0.833 14.792 0.833Z" fill="#e74c3c"/></svg></button>';
    var productHref = '/product/' + (p.slug || p.id);
    var productCardMediaHtml = '<div class="product-card-media"><a href="' + productHref + '" class="product-card-image-link">' + imageHtml + '</a>' + tagsHtml + favBtnHtml + '</div>';

    if (layout === 'compact') {
      cardContent =
        '<div class="product-card-inner">' +
          productCardMediaHtml +
          '<a href="' + productHref + '" class="product-card-body-link">' +
            '<div class="card-content">' +
              '<h3>' + p.name + '</h3>' +
              priceHtml +
            '</div>' +
          '</a>' +
        '</div>';
    } else if (layout === 'detailed') {
      var detailedDesc = stripHtmlToText(p.description || '');
      var actionButton = isCatalogMode
        ? '<a href="' + productHref + '" class="add-to-cart view-details-btn">' + localizedViewDetails + '</a>'
        : '<button class="add-to-cart" onclick="event.stopPropagation(); window.zappyHandleAddToCart(' + JSON.stringify(p).replace(/"/g, '&quot;') + ')">' + localizedAddToCart + '</button>';
      cardContent =
        '<div class="product-card-inner">' +
          productCardMediaHtml +
          '<a href="' + productHref + '" class="product-card-body-link">' +
            '<div class="card-content">' +
              '<h3>' + p.name + '</h3>' +
              '<p>' + detailedDesc + '</p>' +
              priceHtml +
            '</div>' +
          '</a>' +
        '</div>' +
        actionButton;
    } else {
      var standardDesc = stripHtmlToText(p.description || '');
      cardContent =
        '<div class="product-card-inner">' +
          productCardMediaHtml +
          '<a href="' + productHref + '" class="product-card-body-link">' +
            '<div class="card-content">' +
              '<h3>' + p.name + '</h3>' +
              '<p>' + standardDesc + '</p>' +
              priceHtml +
            '</div>' +
          '</a>' +
        '</div>';
    }
    
    return '<div class="product-card ' + layout + '" data-product-id="' + p.id + '">' + cardContent + '</div>';
  }).join('');
}

// Load categories into catalog dropdown, respecting parent/child hierarchy
async function loadCatalogCategories() {
    const list = document.getElementById('zappy-category-links');
    const navList = document.getElementById('zappy-nav-category-links');
    if (!list && !navList) return;
  var websiteId = window.ZAPPY_WEBSITE_ID;
  if (!websiteId) return;
  
  try {
    var res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/categories?websiteId=' + websiteId));
    var data = await res.json();
    if (!data.success || !data.data?.length) {
      collapseEmptyProductsDropdown();
      return;
    }

    var allCats = data.data;
    var childrenMap = {};
    var topLevel = [];
    allCats.forEach(function(cat) {
      if (cat.parent_id) {
        if (!childrenMap[cat.parent_id]) childrenMap[cat.parent_id] = [];
        childrenMap[cat.parent_id].push(cat);
      } else {
        topLevel.push(cat);
      }
    });

    // Flatten descendants so grandchildren+ appear under their top-level ancestor
    function collectDescendants(parentId) {
      var result = [];
      var direct = childrenMap[parentId] || [];
      direct.forEach(function(child) {
        result.push(child);
        result = result.concat(collectDescendants(child.id));
      });
      return result;
    }
    topLevel.forEach(function(cat) {
      childrenMap[cat.id] = collectDescendants(cat.id);
    });

    function catUrl(cat) { return '/category/' + (cat.slug || cat.id); }
    var chevronSvg = '<svg class="catalog-menu-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    // Build HTML for the main nav dropdown (flat list with parent/child classes)
    var dropdownItemsHtml = topLevel.map(function(cat) {
      var children = childrenMap[cat.id] || [];
      if (children.length === 0) {
        return '<li data-category-id="' + cat.id + '" data-category-slug="' + (cat.slug || '') + '"><a href="' + catUrl(cat) + '">' + cat.name + '</a></li>';
      }
      var items = '<li class="zappy-nav-parent" data-category-id="' + cat.id + '" data-category-slug="' + (cat.slug || '') + '"><a href="' + catUrl(cat) + '">' + cat.name + '</a></li>';
      children.forEach(function(child) {
        items += '<li class="zappy-nav-child" data-category-id="' + child.id + '" data-category-slug="' + (child.slug || '') + '"><a href="' + catUrl(child) + '">' + child.name + '</a></li>';
      });
      return items;
    }).join('');

    // Build HTML for the secondary catalog bar (flat links / dropdowns)
    var barItemsHtml = topLevel.map(function(cat) {
      var children = childrenMap[cat.id] || [];
      if (children.length === 0) {
        return '<a href="' + catUrl(cat) + '" class="catalog-menu-item" data-category-id="' + cat.id + '" data-category-slug="' + (cat.slug || '') + '">' + cat.name + '</a>';
      }
      var subLinks = children.map(function(child) {
        return '<a href="' + catUrl(child) + '" class="catalog-menu-item" data-category-id="' + child.id + '" data-category-slug="' + (child.slug || '') + '">' + child.name + '</a>';
      }).join('');
      return '<div class="catalog-menu-parent" data-category-id="' + cat.id + '" data-category-slug="' + (cat.slug || '') + '">' +
        '<a href="' + catUrl(cat) + '" class="catalog-menu-item catalog-menu-trigger">' + cat.name + ' ' + chevronSvg + '</a>' +
        '<div class="sub-menu">' + subLinks + '</div>' +
      '</div>';
    }).join('');

    if (navList) {
      navList.querySelectorAll('li[data-category-id]').forEach(function(node) { node.remove(); });
      navList.insertAdjacentHTML('beforeend', dropdownItemsHtml);
    }

    if (list) {
      list.querySelectorAll('[data-category-id]').forEach(function(node) { node.remove(); });
      list.insertAdjacentHTML('beforeend', barItemsHtml);
    }
  } catch (e) {
    console.error('Failed to load categories', e);
  }
  collapseEmptyProductsDropdown();
}

// When the nav dropdown has zero visible items (showAllProducts hidden + no categories),
// convert it from a dropdown into a plain link so it doesn't render as an empty menu.
function collapseEmptyProductsDropdown() {
  var dropdown = document.querySelector('.zappy-products-dropdown');
  var collapsed = document.querySelector('[data-zappy-products-collapsed]');
  var el = dropdown || collapsed;
  if (!el) return;
  var navList = el.querySelector('#zappy-nav-category-links') || document.getElementById('zappy-nav-category-links');
  if (!navList) return;

  var items = navList.querySelectorAll('li');
  var hasVisible = false;
  for (var i = 0; i < items.length; i++) {
    if (items[i].style.display !== 'none') { hasVisible = true; break; }
  }

  if (!hasVisible && dropdown) {
    dropdown.classList.remove('menu-item-has-children', 'zappy-products-dropdown');
    el.setAttribute('data-zappy-products-collapsed', 'true');
    var arrow = el.querySelector('.dropdown-arrow');
    if (arrow) arrow.style.display = 'none';
    var subMenu = el.querySelector('.sub-menu, #zappy-nav-category-links');
    if (subMenu) subMenu.style.setProperty('display', 'none', 'important');
  } else if (hasVisible && collapsed) {
    collapsed.classList.add('menu-item-has-children', 'zappy-products-dropdown');
    collapsed.removeAttribute('data-zappy-products-collapsed');
    var arrow2 = collapsed.querySelector('.dropdown-arrow');
    if (arrow2) arrow2.style.display = '';
    var subMenu2 = collapsed.querySelector('.sub-menu, #zappy-nav-category-links');
    if (subMenu2) subMenu2.style.removeProperty('display');
  }
}

// Hide sub-navbars (catalog menu & announcement bar) on focused pages
// Product detail, checkout, and order pages hide these so the user can focus on the task
function handleSubNavbarVisibility() {
  var pagePath = window.location.pathname;
  var urlParams = new URLSearchParams(window.location.search);
  var pageParam = urlParams.get('page');
  if (pageParam) pagePath = pageParam;
  pagePath = pagePath.toLowerCase();

  var isFocusedPage = (
    pagePath.indexOf('/product/') !== -1 ||
    pagePath === '/product' ||
    pagePath.indexOf('/cart') !== -1 ||
    pagePath.indexOf('/checkout') !== -1 ||
    pagePath.indexOf('/order-success') !== -1 ||
    pagePath.indexOf('/order') !== -1
  );

  if (isFocusedPage) {
    var catalogMenu = document.getElementById('zappy-catalog-menu');
    var announcementBar = document.querySelector('.zappy-announcement-bar');
    if (catalogMenu) catalogMenu.style.setProperty('display', 'none', 'important');
    if (announcementBar) announcementBar.style.setProperty('display', 'none', 'important');

    // Mark body so other functions (e.g. handleDynamicAnnouncementBar) know to skip
    document.body.classList.add('zappy-focused-page');

    // Recalculate header positioning since hidden bars have 0 height now
    if (typeof setupFixedHeaders === 'function') {
      setTimeout(setupFixedHeaders, 50);
    }
  }
}

// Transparent navbar scroll effect — frosted glass on scroll
// Activates only when --nav-bg is 'transparent' (set by navbar customization)
function initTransparentNavbarScrollEffect() {
  var nb = document.querySelector('nav.navbar, .navbar:not(.zappy-catalog-menu)');
  if (!nb) return;
  var cs = getComputedStyle(nb);
  var bgc = cs.backgroundColor;
  // Check if navbar background is transparent (rgba(0,0,0,0) or 'transparent')
  var isTransparent = bgc === 'transparent' || bgc === 'rgba(0, 0, 0, 0)';
  if (!isTransparent) return;

  var cm = document.querySelector('.zappy-catalog-menu');
  // Determine frosted glass color from the page background
  var bodyBg = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  var m = bodyBg.match(/\d+/g);
  var r = m ? parseInt(m[0]) : 0, g = m ? parseInt(m[1]) : 0, b = m ? parseInt(m[2]) : 0;
  var frostedBg = 'rgba(' + r + ',' + g + ',' + b + ',0.85)';
  var threshold = 60;

  // Determine correct text color for the frosted glass background via luminance
  var sR = r / 255, sG = g / 255, sB = b / 255;
  sR = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  sG = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  sB = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);
  var frostedLum = 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
  var frostedIsLight = frostedLum > 0.4;
  var rootStyle = getComputedStyle(document.documentElement);
  var textDark = rootStyle.getPropertyValue('--text-dark').trim() || '#1a1a1a';
  var textLight = rootStyle.getPropertyValue('--text-light').trim() || '#ffffff';
  var scrolledTextColor = frostedIsLight ? textDark : textLight;

  nb.style.transition = 'background 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease, box-shadow 0.3s ease';
  if (cm) cm.style.transition = 'background 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease';

  var navElSelector = 'a, .navbar-brand, .navbar-brand a, .dropdown-toggle, .mobile-toggle, .phone-header-btn, .mobile-hamburger-btn, .mobile-close-btn, .mobile-submenu-toggle, .nav-link';
  var skipClasses = ['cart-link', 'login-link', 'nav-search-toggle', 'search-toggle'];

  function setScrolledColors(container, color) {
    var els = container.querySelectorAll(navElSelector);
    for (var i = 0; i < els.length; i++) {
      var skip = false;
      for (var j = 0; j < skipClasses.length; j++) {
        if (els[i].classList.contains(skipClasses[j])) { skip = true; break; }
      }
      if (!skip) els[i].style.setProperty('color', color, 'important');
    }
  }

  function clearScrolledColors(container) {
    var els = container.querySelectorAll(navElSelector);
    for (var i = 0; i < els.length; i++) els[i].style.removeProperty('color');
  }

  function onScroll() {
    if (window._zappyNavOverrideActive) return;
    if (window.innerWidth <= 768) {
      nb.style.removeProperty('background');
      nb.style.removeProperty('background-color');
      nb.style.removeProperty('background-image');
      nb.style.removeProperty('--frosted-text');
      nb.style.backdropFilter = '';
      nb.style.webkitBackdropFilter = '';
      nb.style.boxShadow = '';
      nb.classList.remove('scrolled');
      clearScrolledColors(nb);
      if (cm) {
        cm.style.removeProperty('background');
        cm.style.removeProperty('background-color');
        cm.style.removeProperty('backdrop-filter');
        cm.style.removeProperty('-webkit-backdrop-filter');
        cm.classList.remove('scrolled');
        clearScrolledColors(cm);
      }
      return;
    }
    var y = window.scrollY || window.pageYOffset;
    if (y > threshold) {
      nb.classList.add('scrolled');
      nb.style.setProperty('background-color', frostedBg, 'important');
      nb.style.setProperty('background-image', 'none', 'important');
      nb.style.setProperty('--frosted-text', scrolledTextColor);
      nb.style.backdropFilter = 'blur(12px)';
      nb.style.webkitBackdropFilter = 'blur(12px)';
      nb.style.boxShadow = '0 2px 16px rgba(0,0,0,0.12)';
      setScrolledColors(nb, scrolledTextColor);
      if (cm) {
        cm.classList.add('scrolled');
        cm.style.setProperty('background', frostedBg, 'important');
        cm.style.setProperty('backdrop-filter', 'blur(12px)', 'important');
        cm.style.setProperty('-webkit-backdrop-filter', 'blur(12px)', 'important');
        setScrolledColors(cm, scrolledTextColor);
      }
    } else {
      nb.classList.remove('scrolled');
      nb.style.setProperty('background-color', 'transparent', 'important');
      nb.style.removeProperty('background-image');
      nb.style.removeProperty('--frosted-text');
      nb.style.backdropFilter = 'none';
      nb.style.webkitBackdropFilter = 'none';
      nb.style.boxShadow = 'none';
      clearScrolledColors(nb);
      if (cm) {
        cm.classList.remove('scrolled');
        cm.style.setProperty('background', 'transparent', 'important');
        cm.style.setProperty('backdrop-filter', 'none', 'important');
        cm.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
        clearScrolledColors(cm);
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window._zappyNavScrollCleanup = function() { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  onScroll();

  // On pages without a dark hero, the transparent navbar shows light text on
  // a light background — invisible. Detect this and lock the frosted state.
  function srgbLuminance(rv, gv, bv) {
    rv /= 255; gv /= 255; bv /= 255;
    rv = rv <= 0.03928 ? rv / 12.92 : Math.pow((rv + 0.055) / 1.055, 2.4);
    gv = gv <= 0.03928 ? gv / 12.92 : Math.pow((gv + 0.055) / 1.055, 2.4);
    bv = bv <= 0.03928 ? bv / 12.92 : Math.pow((bv + 0.055) / 1.055, 2.4);
    return 0.2126 * rv + 0.7152 * gv + 0.0722 * bv;
  }
  var heroEl = document.querySelector('section[class*="hero"], [data-hero-type], main > section:first-child');
  var pageHasDarkHero = false;
  if (heroEl) {
    var hCs = getComputedStyle(heroEl);
    var heroBgImg = hCs.backgroundImage;
    if (heroBgImg && heroBgImg !== 'none') {
      if (heroBgImg.indexOf('url(') !== -1) {
        // Photo background — assume dark (typically has dark overlay)
        pageHasDarkHero = true;
      } else if (heroBgImg.indexOf('gradient') !== -1) {
        // CSS gradient — parse RGB stops and calculate average luminance
        var colorMatches = heroBgImg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g);
        if (colorMatches && colorMatches.length > 0) {
          var totalLum = 0;
          for (var ci = 0; ci < colorMatches.length; ci++) {
            var parts = colorMatches[ci].match(/\d+/g);
            totalLum += srgbLuminance(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
          }
          pageHasDarkHero = (totalLum / colorMatches.length) < 0.4;
        } else {
          pageHasDarkHero = true;
        }
      } else {
        pageHasDarkHero = true;
      }
    } else {
      var hBgM = hCs.backgroundColor.match(/\d+/g);
      if (hBgM && hBgM.length >= 3) {
        pageHasDarkHero = srgbLuminance(parseInt(hBgM[0]), parseInt(hBgM[1]), parseInt(hBgM[2])) < 0.4;
      }
    }
  }
  if (!pageHasDarkHero) {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    nb.classList.add('scrolled');
    nb.style.setProperty('--frosted-text', scrolledTextColor);
    nb.style.setProperty('background-image', 'none', 'important');
    nb.style.backdropFilter = 'blur(12px)';
    nb.style.webkitBackdropFilter = 'blur(12px)';
    nb.style.boxShadow = '0 2px 16px rgba(0,0,0,0.12)';
    setScrolledColors(nb, scrolledTextColor);
    if (window.innerWidth > 768) nb.style.setProperty('background-color', frostedBg, 'important');
    if (cm) {
      cm.classList.add('scrolled');
      cm.style.setProperty('background', frostedBg, 'important');
      cm.style.setProperty('backdrop-filter', 'blur(12px)', 'important');
      cm.style.setProperty('-webkit-backdrop-filter', 'blur(12px)', 'important');
      setScrolledColors(cm, scrolledTextColor);
    }
  }
}

// Initialize featured products, categories, and product/category page details on load
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu is handled by the main navbar script - no separate e-commerce handler needed
  
  // Hide sub-navbars on product/checkout/order pages
  handleSubNavbarVisibility();

  // Activate frosted glass scroll effect for transparent navbars
  initTransparentNavbarScrollEffect();

  // Fetch store settings first (handles announcement bar, product layout, etc.)
  fetchAdditionalJsSettings();
  loadFeaturedProducts();
  loadFeaturedCategories();
  loadCatalogCategories();
  loadProductDetailPage();
  loadCategoryPage();
  
  // Register language change callback to refresh e-commerce content
  // This ensures translated product names, categories, etc. are displayed when switching languages
  if (typeof zappyI18n !== 'undefined' && typeof zappyI18n.onLanguageChange === 'function') {
    zappyI18n.onLanguageChange(function(newLang, oldLang) {
      console.log('[E-COMMERCE] Language changed from ' + oldLang + ' to ' + newLang + ', refreshing content...');
      
      // Refresh all e-commerce content with the new language
      // Each function uses buildApiUrlWithLang which will now include the new language
      fetchAdditionalJsSettings(true);  // Force refresh announcement bar with translated messages
      loadFeaturedProducts();           // Refresh featured products section
      loadFeaturedCategories();         // Refresh featured categories section
      loadCatalogCategories();          // Refresh navigation category menu
      
      // If we're on a product detail page, refresh it
      var detailSection = document.getElementById('product-detail');
      if (detailSection) {
        loadProductDetailPage();
      }
      
      // If we're on a category page, refresh it
      var categorySection = document.getElementById('category-products');
      if (categorySection) {
        loadCategoryPage();
      }
      
      // If we're on the products listing page, refresh it
      var productsGrid = document.getElementById('zappy-product-grid');
      if (productsGrid && typeof loadProducts === 'function') {
        loadProducts();
      }
      
      // Update static e-commerce UI elements that are rendered at page generation time
      // These need to be manually updated when language changes
      updateStaticEcommerceUI();
    });
    console.log('[E-COMMERCE] Registered language change callback for content refresh');
  }
  
  // Update static e-commerce UI elements with translated text
  function updateStaticEcommerceUI() {
    // Update "Add to Cart" button on product detail page
    var addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.textContent = getEcomText('addToCart', 'Add to Cart');
    }
    
    // Update all other "Add to Cart" buttons in product grids
    document.querySelectorAll('button.add-to-cart:not(#add-to-cart-btn)').forEach(function(btn) {
      // Only update text content, preserve onclick handler
      btn.textContent = getEcomText('addToCart', 'Add to Cart');
    });
    
    // Update filter buttons text (All, Featured, New, Sale)
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      var category = btn.getAttribute('data-category');
      if (category === 'all') {
        btn.textContent = getEcomText('all', 'All');
      } else if (category === 'featured') {
        btn.textContent = getEcomText('featured', 'Featured');
      } else if (category === 'new') {
        btn.textContent = getEcomText('new', 'New');
      } else if (category === 'sale') {
        btn.textContent = getEcomText('sale', 'Sale');
      }
    });
    
    // Update cart drawer empty message
    var emptyCartMsg = document.querySelector('.empty-cart p');
    if (emptyCartMsg) {
      emptyCartMsg.textContent = getEcomText('emptyCart', 'Your cart is empty');
    }
    
    // Update checkout button text
    var checkoutBtn = document.querySelector('.checkout-btn, #checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.textContent = getEcomText('proceedToCheckout', 'Proceed to Checkout');
    }
    
    console.log('[E-COMMERCE] Static UI elements updated for language change');
  }
});

// Load product detail page
async function loadProductDetailPage() {
  const detailSection = document.getElementById('product-detail');
  if (!detailSection) return; // Not on product detail page
  
  const websiteId = window.ZAPPY_WEBSITE_ID;
  if (!websiteId) return;
  
  const t = {"products":"Products","ourProducts":"Our Products","featuredProducts":"Featured Products","noFeaturedProducts":"No featured products yet. Check out all our products!","featuredCategories":"Shop by Category","all":"All","featured":"Featured","new":"New","sale":"Sale","loadingProducts":"Loading products...","cart":"Cart","yourCart":"Your Cart","emptyCart":"Cart is empty","total":"Total","proceedToCheckout":"Proceed to Checkout","checkout":"Checkout","customerInfo":"Customer Info","fullName":"Full Name","email":"Email","phone":"Phone","shippingAddress":"Shipping Address","street":"Street Address","streetAndNumber":"Street and Number","apartment":"Apt, Floor, Unit","apartmentExt":"Apt, Floor, Building Code, Notes, Etc.","city":"City","zip":"ZIP Code","zipPostal":"Zip / Postal Code","countryRegion":"Country / Region","stateProvince":"State / Province","stateRequired":"Please select a state / province","saveAddressForNextTime":"Save this address for next time","shippingMethod":"Shipping Method","loadingShipping":"Loading shipping methods...","payment":"Payment","loadingPayment":"Loading payment options...","orderSummary":"Order Summary","subtotal":"Subtotal","vat":"VAT","vatIncluded":"VAT Included","shipping":"Shipping","discount":"Discount","totalToPay":"Total","placeOrder":"Place Order","login":"Login","customerLogin":"Customer Login","enterEmail":"Enter your email and we'll send you a login code","emailAddress":"Email Address","sendCode":"Send Code","enterCode":"Enter the code sent to your email","verificationCode":"Verification Code","verify":"Verify","returnPolicy":"Return Policy","addToCart":"Add to Cart","startingAt":"Starting at","addedToCart":"Product added to cart!","remove":"Remove","noProducts":"No products to display","errorLoading":"Error loading","days":"days","currency":"$","free":"FREE","freeAbove":"Free above","noShippingMethods":"No shipping options available","viewAllResults":"View all results","searchProducts":"Search products","productDetails":"Product Details","viewDetails":"View Details","inStock":"In Stock","outOfStock":"Out of Stock","pleaseSelect":"Please select","sku":"SKU","category":"Category","relatedProducts":"Related Products","frequentlyBoughtTogether":"Frequently bought together","frequentlyBoughtTogetherSubtitle":"Save time and get everything you need","bundleTotal":"Bundle total","addBundleToCart":"Add {count} items to cart","upsellFree":"Free","productNotFound":"Product not found","backToProducts":"Back to Products","home":"Home","quantity":"Quantity","unitLabels":{"piece":"pcs","kg":"kg","gram":"g","liter":"L","ml":"ml"},"perUnit":"/","couponCode":"Coupon Code","enterCouponCode":"Enter coupon code","applyCoupon":"Apply","removeCoupon":"Remove","couponApplied":"Coupon applied successfully!","invalidCoupon":"Invalid coupon code","couponExpired":"Coupon has expired","couponMinOrder":"Minimum order amount","alreadyHaveAccount":"Already have an account?","loginHere":"Login here","signInHere":"Sign in here","mobileNumber":"Mobile Number","loggedInAs":"Logged in as:","logout":"Logout","haveCouponCode":"I have a coupon code","agreeToTerms":"I agree to the","termsAndConditions":"Terms and Conditions","pleaseAcceptTerms":"Please accept the terms and conditions","nameRequired":"Please enter your full name","emailRequired":"Please enter your email address","emailInvalid":"Please enter a valid email address","phoneRequired":"Please enter your phone number","shippingRequired":"Please select a shipping method","streetRequired":"Please enter your street address","cityRequired":"Please enter your city","cartEmpty":"Your cart is empty","paymentNotConfigured":"Online payment not configured","orderSuccess":"Order Received!","thankYouOrder":"Thank you for your order","orderNumber":"Order Number","orderConfirmation":"A confirmation email has been sent to you","orderProcessing":"Your order is being processed. We'll notify you when it ships.","continueShopping":"Continue Shopping","next":"Next","contactInformation":"Contact Information","items":"Items","continueToHomePage":"Continue to Home Page","transactionDate":"Transaction Date","paymentMethod":"Payment Method","orderDetails":"Order Details","loadingOrder":"Loading order details...","orderNotFound":"Order not found","orderItems":"Order Items","paidAmount":"Amount Paid","myAccount":"My Account","accountWelcome":"Welcome","yourOrders":"Your Orders","noOrders":"No orders yet","orderDate":"Date","orderStatus":"Status","orderTotal":"Total","viewOrder":"View Order","statusPending":"Pending Payment","statusPaid":"Paid","statusProcessing":"Processing","statusShipped":"Shipped","statusDelivered":"Delivered","statusCancelled":"Cancelled","notLoggedIn":"Not Logged In","pleaseLogin":"Please login to view your account","personalDetails":"Personal Details","editProfile":"Edit Profile","name":"Name","saveChanges":"Save Changes","cancel":"Cancel","addresses":"Addresses","addAddress":"Add Address","editAddress":"Edit Address","deleteAddress":"Delete Address","setAsDefault":"Set as Default","defaultAddress":"Default Address","addressLabel":"Address Label","work":"Work","other":"Other","noAddresses":"No saved addresses","confirmDelete":"Are you sure you want to delete?","profileUpdated":"Profile updated successfully","addressSaved":"Address saved successfully","addressDeleted":"Address deleted","saving":"Saving...","saveToFavorites":"Save to Favorites","removeFromFavorites":"Remove from Favorites","shareProduct":"Share Product","linkCopied":"Link copied!","myFavorites":"My Favorites","noFavorites":"No favorites yet","addedToFavorites":"Added to favorites","removedFromFavorites":"Removed from favorites","loginToFavorite":"Log in to save favorites","browseFavorites":"Discover all our products","selectVariant":"Select option","variantUnavailable":"Unavailable","color":"Color","size":"Size","material":"Material","style":"Style","weight":"Weight","capacity":"Capacity","length":"Length","inquiryAbout":"Inquiry about","sendInquiry":"Send Inquiry","callNow":"Call Now","specifications":"Specifications","storeNote":"Additional Information","businessPhone":"[business_phone]","businessEmail":"[business_email]"};
  
  // Get slug from URL - check both pathname and query parameter (preview mode)
  let pagePath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  if (pageParam) {
    pagePath = pageParam;
  }
  
  // Extract slug from path like /product/slug-name
  const pathParts = pagePath.split('/');
  const slug = pathParts[pathParts.length - 1];
  
  if (!slug || slug === 'product') {
    showProductNotFound(detailSection, t);
    return;
  }
  
  console.log('Loading product with slug:', slug);
  
  try {
    const res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/products/' + encodeURIComponent(slug) + '?websiteId=' + websiteId));
    const data = await res.json();
    
    if (!data.success || !data.data) {
      showProductNotFound(detailSection, t);
      return;
    }
    
    const product = data.data;
    renderProductDetail(detailSection, product, t);
    
    // Update page title and meta
    document.title = product.name + ' - ' + (document.title.split(' - ').pop() || '');
    
    // Load related products
    loadRelatedProducts(product, t);
    
  } catch (e) {
    console.error('Failed to load product', e);
    showProductNotFound(detailSection, t);
  }
}

// Load category page (similar to product detail page but for categories)
async function loadCategoryPage() {
  const categorySection = document.getElementById('category-page');
  if (!categorySection) return; // Not on category page
  
  const websiteId = window.ZAPPY_WEBSITE_ID;
  if (!websiteId) return;
  
  const t = {"products":"Products","ourProducts":"Our Products","featuredProducts":"Featured Products","noFeaturedProducts":"No featured products yet. Check out all our products!","featuredCategories":"Shop by Category","all":"All","featured":"Featured","new":"New","sale":"Sale","loadingProducts":"Loading products...","cart":"Cart","yourCart":"Your Cart","emptyCart":"Cart is empty","total":"Total","proceedToCheckout":"Proceed to Checkout","checkout":"Checkout","customerInfo":"Customer Info","fullName":"Full Name","email":"Email","phone":"Phone","shippingAddress":"Shipping Address","street":"Street Address","streetAndNumber":"Street and Number","apartment":"Apt, Floor, Unit","apartmentExt":"Apt, Floor, Building Code, Notes, Etc.","city":"City","zip":"ZIP Code","zipPostal":"Zip / Postal Code","countryRegion":"Country / Region","stateProvince":"State / Province","stateRequired":"Please select a state / province","saveAddressForNextTime":"Save this address for next time","shippingMethod":"Shipping Method","loadingShipping":"Loading shipping methods...","payment":"Payment","loadingPayment":"Loading payment options...","orderSummary":"Order Summary","subtotal":"Subtotal","vat":"VAT","vatIncluded":"VAT Included","shipping":"Shipping","discount":"Discount","totalToPay":"Total","placeOrder":"Place Order","login":"Login","customerLogin":"Customer Login","enterEmail":"Enter your email and we'll send you a login code","emailAddress":"Email Address","sendCode":"Send Code","enterCode":"Enter the code sent to your email","verificationCode":"Verification Code","verify":"Verify","returnPolicy":"Return Policy","addToCart":"Add to Cart","startingAt":"Starting at","addedToCart":"Product added to cart!","remove":"Remove","noProducts":"No products to display","errorLoading":"Error loading","days":"days","currency":"$","free":"FREE","freeAbove":"Free above","noShippingMethods":"No shipping options available","viewAllResults":"View all results","searchProducts":"Search products","productDetails":"Product Details","viewDetails":"View Details","inStock":"In Stock","outOfStock":"Out of Stock","pleaseSelect":"Please select","sku":"SKU","category":"Category","relatedProducts":"Related Products","frequentlyBoughtTogether":"Frequently bought together","frequentlyBoughtTogetherSubtitle":"Save time and get everything you need","bundleTotal":"Bundle total","addBundleToCart":"Add {count} items to cart","upsellFree":"Free","productNotFound":"Product not found","backToProducts":"Back to Products","home":"Home","quantity":"Quantity","unitLabels":{"piece":"pcs","kg":"kg","gram":"g","liter":"L","ml":"ml"},"perUnit":"/","couponCode":"Coupon Code","enterCouponCode":"Enter coupon code","applyCoupon":"Apply","removeCoupon":"Remove","couponApplied":"Coupon applied successfully!","invalidCoupon":"Invalid coupon code","couponExpired":"Coupon has expired","couponMinOrder":"Minimum order amount","alreadyHaveAccount":"Already have an account?","loginHere":"Login here","signInHere":"Sign in here","mobileNumber":"Mobile Number","loggedInAs":"Logged in as:","logout":"Logout","haveCouponCode":"I have a coupon code","agreeToTerms":"I agree to the","termsAndConditions":"Terms and Conditions","pleaseAcceptTerms":"Please accept the terms and conditions","nameRequired":"Please enter your full name","emailRequired":"Please enter your email address","emailInvalid":"Please enter a valid email address","phoneRequired":"Please enter your phone number","shippingRequired":"Please select a shipping method","streetRequired":"Please enter your street address","cityRequired":"Please enter your city","cartEmpty":"Your cart is empty","paymentNotConfigured":"Online payment not configured","orderSuccess":"Order Received!","thankYouOrder":"Thank you for your order","orderNumber":"Order Number","orderConfirmation":"A confirmation email has been sent to you","orderProcessing":"Your order is being processed. We'll notify you when it ships.","continueShopping":"Continue Shopping","next":"Next","contactInformation":"Contact Information","items":"Items","continueToHomePage":"Continue to Home Page","transactionDate":"Transaction Date","paymentMethod":"Payment Method","orderDetails":"Order Details","loadingOrder":"Loading order details...","orderNotFound":"Order not found","orderItems":"Order Items","paidAmount":"Amount Paid","myAccount":"My Account","accountWelcome":"Welcome","yourOrders":"Your Orders","noOrders":"No orders yet","orderDate":"Date","orderStatus":"Status","orderTotal":"Total","viewOrder":"View Order","statusPending":"Pending Payment","statusPaid":"Paid","statusProcessing":"Processing","statusShipped":"Shipped","statusDelivered":"Delivered","statusCancelled":"Cancelled","notLoggedIn":"Not Logged In","pleaseLogin":"Please login to view your account","personalDetails":"Personal Details","editProfile":"Edit Profile","name":"Name","saveChanges":"Save Changes","cancel":"Cancel","addresses":"Addresses","addAddress":"Add Address","editAddress":"Edit Address","deleteAddress":"Delete Address","setAsDefault":"Set as Default","defaultAddress":"Default Address","addressLabel":"Address Label","work":"Work","other":"Other","noAddresses":"No saved addresses","confirmDelete":"Are you sure you want to delete?","profileUpdated":"Profile updated successfully","addressSaved":"Address saved successfully","addressDeleted":"Address deleted","saving":"Saving...","saveToFavorites":"Save to Favorites","removeFromFavorites":"Remove from Favorites","shareProduct":"Share Product","linkCopied":"Link copied!","myFavorites":"My Favorites","noFavorites":"No favorites yet","addedToFavorites":"Added to favorites","removedFromFavorites":"Removed from favorites","loginToFavorite":"Log in to save favorites","browseFavorites":"Discover all our products","selectVariant":"Select option","variantUnavailable":"Unavailable","color":"Color","size":"Size","material":"Material","style":"Style","weight":"Weight","capacity":"Capacity","length":"Length","inquiryAbout":"Inquiry about","sendInquiry":"Send Inquiry","callNow":"Call Now","specifications":"Specifications","storeNote":"Additional Information","businessPhone":"[business_phone]","businessEmail":"[business_email]"};
  
  // Get slug from URL - check both pathname and query parameter (preview mode)
  let pagePath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  if (pageParam) {
    pagePath = pageParam;
  }
  
  // Extract slug from path like /category/slug-name
  const pathParts = pagePath.split('/');
  const slug = pathParts[pathParts.length - 1];
  
  if (!slug || slug === 'category') {
    showCategoryNotFound(categorySection, t);
    return;
  }
  
  console.log('Loading category with slug:', slug);
  
  try {
    // Prefer the dedicated category endpoint (includes products), but fall back to:
    // 1) GET /storefront/categories and match by slug/id
    // 2) GET /storefront/products?categoryId=...
    // This makes deployed sites work even if the API server is older and lacks /categories/:slug.
    let category = null;

    try {
      const res = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/categories/' + encodeURIComponent(slug) + '?websiteId=' + websiteId));
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.success && data.data) {
          category = data.data;
        }
      }
    } catch (e1) {
      // ignore - will fall back
    }

    if (!category) {
      const listRes = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/categories?websiteId=' + websiteId));
      if (!listRes || !listRes.ok) {
        showCategoryNotFound(categorySection, t);
        return;
      }
      const listData = await listRes.json();
      const categories = (listData && listData.success && Array.isArray(listData.data)) ? listData.data : [];
      category = categories.find(function(c) {
        return c && (c.slug === slug || c.id === slug);
      }) || null;

      if (!category) {
        showCategoryNotFound(categorySection, t);
        return;
      }

      // Fetch products for this category
      try {
        const prodRes = await fetch(buildApiUrlWithLang('/api/ecommerce/storefront/products?websiteId=' + websiteId + '&categoryId=' + encodeURIComponent(category.id)));
        if (prodRes && prodRes.ok) {
          const prodData = await prodRes.json();
          const products = (prodData && prodData.success && Array.isArray(prodData.data)) ? prodData.data : [];
          category = { ...category, products };
        }
      } catch (e2) {
        category = { ...category, products: [] };
      }
    }

    renderCategoryPage(categorySection, category, t);
    
    // Update page title and meta
    document.title = category.name + ' - ' + (document.title.split(' - ').pop() || '');
    
  } catch (e) {
    console.error('Failed to load category', e);
    showCategoryNotFound(categorySection, t);
  }
}

function showCategoryNotFound(container, t) {
  container.innerHTML = `
    <div class="category-not-found">
      <h2>${t.categoryNotFound || 'Category not found'}</h2>
      <a href="/products" class="btn btn-primary">${t.backToProducts}</a>
    </div>
  `;
}

function renderCategoryPage(container, category, t) {
  const headerContainer = document.getElementById('category-header');
  const productGrid = document.getElementById('zappy-category-products');
  const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
  
  // Build breadcrumb
  var productsLabel = (typeof additionalJsProductsMenuLabel === 'string' && additionalJsProductsMenuLabel) ? additionalJsProductsMenuLabel : t.products;
  var breadcrumbHtml = '<nav class="product-breadcrumb">';
  breadcrumbHtml += '<a href="/">' + t.home + '</a>';
  breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
  breadcrumbHtml += '<a href="/products">' + productsLabel + '</a>';
  if (category.parentCategory) {
    breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
    var parentUrl = '/category/' + (category.parentCategory.slug || category.parentCategory.id);
    breadcrumbHtml += '<a href="' + parentUrl + '">' + category.parentCategory.name + '</a>';
  }
  breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
  breadcrumbHtml += '<span class="breadcrumb-current">' + category.name + '</span>';
  breadcrumbHtml += '</nav>';

  // Render category header
  if (headerContainer) {
    const categoryImage = category.image ? '<div class="category-banner" style="background-image: url(\'' + resolveProductImageUrl(category.image) + '\')"></div>' : '';
    var subcatHtml = '';
    if (category.subcategories && category.subcategories.length > 0) {
      var allLabel = t.all || (isRTL ? 'הכל' : 'All');
      var catSlug = category.slug || category.id;
      subcatHtml = '<div class="subcategory-nav">';
      var parentImg = category.image ? resolveProductImageUrl(category.image) : '';
      function subcatBg(imgUrl) {
        return imgUrl ? '<div class="subcategory-card-bg" style="background-image: url(\''+imgUrl+'\')"></div>' : '<div class="subcategory-card-bg subcategory-card-bg-empty"></div>';
      }
      subcatHtml += '<a href="/category/' + catSlug + '" class="subcategory-card active">' +
        subcatBg(parentImg) +
        '<div class="subcategory-card-overlay"></div>' +
        '<span class="subcategory-card-name">' + allLabel + '</span></a>';
      category.subcategories.forEach(function(sub) {
        var subSlug = sub.slug || sub.id;
        var subImg = sub.image ? resolveProductImageUrl(sub.image) : '';
        subcatHtml += '<a href="/category/' + subSlug + '" class="subcategory-card">' +
          subcatBg(subImg) +
          '<div class="subcategory-card-overlay"></div>' +
          '<span class="subcategory-card-name">' + sub.name + '</span></a>';
      });
      subcatHtml += '</div>';
    }
    headerContainer.innerHTML = breadcrumbHtml + categoryImage + '<div class="category-info"><h1>' + category.name + '</h1>' + 
      (category.description ? '<p class="category-description">' + category.description + '</p>' : '') + 
      '</div>' + subcatHtml;
  }
  
  // Store category products for filtering
  catProductsCache = category.products || [];
  
  // Initialize category toolbar
  initCategoryToolbar(isRTL, t);

  applyCategoryFiltersAndRender(productGrid, t);
  if (typeof _syncCardFavorites === 'function') _syncCardFavorites();
}

function applyCategoryFiltersAndRender(productGrid, t) {
  if (!productGrid) productGrid = document.getElementById('zappy-category-products');
  if (!productGrid) return;
  
  var productsToShow = catProductsCache.slice();
  
  // Apply sidebar filters
  if (additionalJsSidebarFiltersConfig.enabled) {
    if (catActiveSidebarFilters.brands && catActiveSidebarFilters.brands.length > 0) {
      productsToShow = productsToShow.filter(function(p) {
        return p.brand && catActiveSidebarFilters.brands.includes(p.brand);
      });
    }
    if (catActiveSidebarFilters.tags.length > 0) {
      productsToShow = productsToShow.filter(function(p) {
        return p.tags && p.tags.some(function(tag) { return catActiveSidebarFilters.tags.includes(tag); });
      });
    }
    if (catActiveSidebarFilters.priceMin != null) {
      productsToShow = productsToShow.filter(function(p) { return parseFloat(p.price) >= catActiveSidebarFilters.priceMin; });
    }
    if (catActiveSidebarFilters.priceMax != null) {
      productsToShow = productsToShow.filter(function(p) { return parseFloat(p.price) <= catActiveSidebarFilters.priceMax; });
    }
    if (catActiveSidebarFilters.sale) {
      productsToShow = productsToShow.filter(function(p) { return p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price); });
    }
  }
  
  // Apply sorting
  if (catCurrentSortKey && catCurrentSortKey !== 'default') {
    productsToShow = productsToShow.slice().sort(function(a, b) {
      switch (catCurrentSortKey) {
        case 'popularity': return (parseInt(b.purchase_count) || 0) - (parseInt(a.purchase_count) || 0);
        case 'price_asc': return parseFloat(a.price) - parseFloat(b.price);
        case 'price_desc': return parseFloat(b.price) - parseFloat(a.price);
        case 'name_asc': return (a.name || '').localeCompare(b.name || '');
        case 'name_desc': return (b.name || '').localeCompare(a.name || '');
        case 'newest': return new Date(b.created_at) - new Date(a.created_at);
        default: return 0;
      }
    });
  }
  
  // Update count
  var countEl = document.getElementById('category-products-count');
  var isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
  if (countEl) {
    countEl.textContent = isRTL ? (productsToShow.length + ' מוצרים') : ('Showing ' + productsToShow.length + ' products');
  }
  
  if (productsToShow.length === 0) {
    productGrid.innerHTML = '<div class="no-products">' + (t.noProducts || 'No products found.') + '</div>';
    return;
  }
  
  renderProductGrid(productGrid, productsToShow, t, false, catCurrentViewMode);
}

function initCategoryToolbar(isRTL, t) {
  var toolbar = document.getElementById('category-toolbar');
  if (!toolbar) return;
  
  var hasAnyFeature = false;
  
  // Sorting
  if (additionalJsSortingConfig.enabled && additionalJsSortingConfig.options && additionalJsSortingConfig.options.length > 0) {
    hasAnyFeature = true;
    var sortControl = document.getElementById('cat-sort-control');
    var sortSelect = document.getElementById('cat-sort-select');
    if (sortControl && sortSelect) {
      sortControl.style.display = '';
      var sortLabels = {
        popularity: isRTL ? 'פופולריות' : 'Popularity',
        price_asc: isRTL ? 'מחיר: נמוך לגבוה' : 'Price: Low to High',
        price_desc: isRTL ? 'מחיר: גבוה לנמוך' : 'Price: High to Low',
        name_asc: isRTL ? 'שם: א-ת' : 'Name: A to Z',
        name_desc: isRTL ? 'שם: ת-א' : 'Name: Z to A',
        newest: isRTL ? 'חדש ביותר' : 'Newest First'
      };
      var catSortOrder = ['popularity', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'];
      catSortOrder.forEach(function(opt) {
        if (additionalJsSortingConfig.options.includes(opt) && sortLabels[opt]) {
          var option = document.createElement('option');
          option.value = opt;
          option.textContent = sortLabels[opt];
          sortSelect.appendChild(option);
        }
      });
      sortSelect.addEventListener('change', function() {
        catCurrentSortKey = sortSelect.value;
        applyCategoryFiltersAndRender(null, t);
      });
    }
  }
  
  // View toggle
  if (additionalJsViewToggleEnabled) {
    hasAnyFeature = true;
    var viewToggle = document.getElementById('cat-view-toggle');
    if (viewToggle) {
      viewToggle.style.display = '';
      var viewBtns = viewToggle.querySelectorAll('.view-btn');
      viewBtns.forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-view') === catCurrentViewMode);
        btn.addEventListener('click', function() {
          catCurrentViewMode = btn.getAttribute('data-view');
          localStorage.setItem('zappy_view_mode_' + (window.ZAPPY_WEBSITE_ID || ''), catCurrentViewMode);
          viewBtns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-view') === catCurrentViewMode); });
          applyCategoryFiltersAndRender(null, t);
        });
      });
    }
  }
  
  // Sidebar filters (tags, price, sale - not categories since we're already in a category)
  if (additionalJsSidebarFiltersConfig.enabled && additionalJsSidebarFiltersConfig.filters && additionalJsSidebarFiltersConfig.filters.length > 0) {
    hasAnyFeature = true;
    initCategorySidebarFilters(isRTL, t);
  }
  
  if (hasAnyFeature) {
    toolbar.style.display = '';
  }
}

function catBuildPriceRanges(prices) {
  if (!prices || prices.length === 0) return [];
  var minP = Math.min.apply(null, prices);
  var maxP = Math.max.apply(null, prices);
  if (minP === maxP) return [];
  var range = maxP - minP;
  var step;
  if (range <= 50) step = 10;
  else if (range <= 200) step = 25;
  else if (range <= 500) step = 50;
  else if (range <= 1000) step = 100;
  else if (range <= 5000) step = 500;
  else step = 1000;
  var bucketStart = Math.floor(minP / step) * step;
  var buckets = [];
  while (bucketStart < maxP) {
    var bucketEnd = bucketStart + step;
    var count = prices.filter(function(p) { return p >= bucketStart && p < bucketEnd; }).length;
    if (bucketStart + step >= maxP) {
      count = prices.filter(function(p) { return p >= bucketStart; }).length;
    }
    if (count > 0) {
      buckets.push({ min: bucketStart, max: bucketEnd, count: count });
    }
    bucketStart = bucketEnd;
  }
  return buckets;
}

function catFormatPrice(val) {
  return val % 1 === 0 ? val.toString() : val.toFixed(2);
}

function initCategorySidebarFilters(isRTL, t) {
  var sidebar = document.getElementById('category-sidebar');
  if (!sidebar) return;
  
  var filters = (additionalJsSidebarFiltersConfig.filters || []).filter(function(f) { return f !== 'category'; });
  if (filters.length === 0) return;
  var currency = isRTL ? '₪' : '$';
  
  var html = '';

  // Sidebar header with title, clear button, and mobile close button
  html += '<div class="sidebar-header"><span class="sidebar-title">' + (isRTL ? 'סינון' : 'Filters') + '</span>';
  html += '<div class="sidebar-header-actions">';
  html += '<button class="sidebar-clear-btn" id="category-sidebar-clear" title="' + (isRTL ? 'נקה הכל' : 'Clear all') + '">' + (isRTL ? 'נקה הכל' : 'Clear all') + '</button>';
  html += '<button class="sidebar-mobile-close" id="category-sidebar-mobile-close" title="' + (isRTL ? 'סגור' : 'Close') + '">&times;</button>';
  html += '</div></div>';
  
  // Brand filter
  if (filters.includes('brand')) {
    var brandCounts = {};
    catProductsCache.forEach(function(p) {
      if (p.brand) { brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1; }
    });
    var brandKeys = Object.keys(brandCounts);
    if (brandKeys.length > 0) {
      brandKeys.sort();
      html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'מותג' : 'Brand') + '</div>';
      brandKeys.forEach(function(brand) {
        html += '<label class="sidebar-item"><input type="checkbox" data-filter="brand" value="' + brand + '"> ' + brand + ' <span class="count">(' + brandCounts[brand] + ')</span></label>';
      });
      html += '</div>';
    }
  }
  
  // Tags filter
  if (filters.includes('tags')) {
    var tagCounts = {};
    catProductsCache.forEach(function(p) {
      if (p.tags && p.tags.length) {
        p.tags.forEach(function(tag) { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
      }
    });
    var tagKeys = Object.keys(tagCounts);
    if (tagKeys.length > 0) {
      tagKeys.sort();
      html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'תגיות' : 'Tags') + '</div>';
      tagKeys.forEach(function(tag) {
        html += '<label class="sidebar-item"><input type="checkbox" data-filter="tag" value="' + tag + '"> ' + tag + ' <span class="count">(' + tagCounts[tag] + ')</span></label>';
      });
      html += '</div>';
    }
  }
  
  // Price range filter (dynamic buckets)
  if (filters.includes('price')) {
    var prices = catProductsCache.map(function(p) { return parseFloat(p.price) || 0; }).filter(function(v) { return v > 0; });
    var buckets = catBuildPriceRanges(prices);
    if (buckets.length > 0) {
      html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'טווח מחירים' : 'Price Range') + '</div>';
      buckets.forEach(function(b, i) {
        var label = currency + catFormatPrice(b.min) + ' – ' + currency + catFormatPrice(b.max);
        html += '<label class="sidebar-item"><input type="radio" name="cat-sidebar-price-range" data-filter="price-range" data-min="' + b.min + '" data-max="' + b.max + '" value="' + i + '"> ' + label + ' <span class="count">(' + b.count + ')</span></label>';
      });
      html += '</div>';
    }
  }
  
  // Sale filter
  if (filters.includes('sale')) {
    var saleCount = catProductsCache.filter(function(p) { return p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price); }).length;
    if (saleCount > 0) {
      html += '<div class="sidebar-section"><div class="sidebar-section-title">' + (isRTL ? 'מבצעים' : 'On Sale') + '</div>';
      html += '<label class="sidebar-item"><input type="checkbox" data-filter="sale"> ' + (isRTL ? 'הצג מוצרים במבצע' : 'Show sale items') + ' <span class="count">(' + saleCount + ')</span></label>';
      html += '</div>';
    }
  }
  
  sidebar.innerHTML = html;
  sidebar.style.display = '';
  
  // Mobile toggle
  var toggleBtn = document.getElementById('cat-sidebar-toggle-btn');
  var overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'category-sidebar-overlay';
  sidebar.parentNode.insertBefore(overlay, sidebar);
  
  if (toggleBtn) {
    toggleBtn.style.display = '';
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.add('open');
      overlay.classList.add('active');
    });
  }
  
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }
  overlay.addEventListener('click', closeSidebar);
  var catMobileCloseBtn = document.getElementById('category-sidebar-mobile-close');
  if (catMobileCloseBtn) catMobileCloseBtn.addEventListener('click', closeSidebar);
  
  // Event handlers
  sidebar.querySelectorAll('input[data-filter="brand"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      catActiveSidebarFilters.brands = Array.from(sidebar.querySelectorAll('input[data-filter="brand"]:checked')).map(function(el) { return el.value; });
      applyCategoryFiltersAndRender(null, t);
    });
  });
  sidebar.querySelectorAll('input[data-filter="tag"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      catActiveSidebarFilters.tags = Array.from(sidebar.querySelectorAll('input[data-filter="tag"]:checked')).map(function(el) { return el.value; });
      applyCategoryFiltersAndRender(null, t);
    });
  });
  sidebar.querySelectorAll('input[data-filter="sale"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      catActiveSidebarFilters.sale = cb.checked;
      applyCategoryFiltersAndRender(null, t);
    });
  });
  
  // Price range radio handlers
  sidebar.querySelectorAll('input[data-filter="price-range"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      catActiveSidebarFilters.priceMin = parseFloat(radio.getAttribute('data-min'));
      catActiveSidebarFilters.priceMax = parseFloat(radio.getAttribute('data-max'));
      applyCategoryFiltersAndRender(null, t);
    });
  });
  
  var clearEl = document.getElementById('category-sidebar-clear');
  if (clearEl) {
    clearEl.addEventListener('click', function() {
      catActiveSidebarFilters = { categories: [], brands: [], tags: [], priceMin: null, priceMax: null, sale: false };
      sidebar.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
      sidebar.querySelectorAll('input[type="radio"]').forEach(function(rb) { rb.checked = false; });
      applyCategoryFiltersAndRender(null, t);
    });
  }
}

function showProductNotFound(container, t) {
  container.innerHTML = `
    <div class="product-not-found">
      <h2>${t.productNotFound}</h2>
      <a href="/products" class="btn btn-primary">${t.backToProducts}</a>
    </div>
  `;
}

function renderProductDetail(container, product, t) {
  // Variant attribute values may legitimately contain characters that are
  // unsafe inside HTML attributes or text (e.g. Hebrew size "מ\"מ" with a
  // double quote, sizes like 5'10", names with & < >). Without escaping,
  // data-attr/data-value get truncated by the browser parser, the runtime
  // selection matcher fails to find the variant, and every option appears
  // disabled / images stop swapping.
  function _eA(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Ensure image paths work in preview + live
  const images = (product.images || []).map(function(img) {
    if (window.resolveProductImageUrl) {
      return window.resolveProductImageUrl(img);
    }
    return img;
  }).filter(Boolean);
  const mainImage = images[0] || '';

  // Resolve product videos
  const videos = (product.videos || []).map(function(v) {
    var resolved = Object.assign({}, v);
    if (v.type === 'upload' && v.url && window.resolveProductImageUrl) {
      resolved.url = window.resolveProductImageUrl(v.url);
    }
    if (v.type === 'upload' && v.thumbnail && window.resolveProductImageUrl) {
      resolved.thumbnail = window.resolveProductImageUrl(v.thumbnail);
    }
    return resolved;
  });
  const hasMedia = images.length > 1 || videos.length > 0;
  const baseInStock = product.stock_status !== 'out_of_stock';
  const hasSalePrice = product.sale_price && parseFloat(product.sale_price) < parseFloat(product.price);
  const basePrice = hasSalePrice ? parseFloat(product.sale_price) : parseFloat(product.price);
  const originalPrice = parseFloat(product.price);
  // Check if price should be displayed (default to true if not set)
  const showPrice = product.custom_fields?.showPrice !== false;
  
  // Check if product has variants
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const activeVariants = variants.filter(variant => variant.is_active !== false);
  const variantPrices = activeVariants
    .map(variant => {
      if (variant.price !== null && variant.price !== undefined) {
        return parseFloat(variant.price);
      }
      return basePrice;
    })
    .filter(price => Number.isFinite(price));
  const uniqueVariantPrices = Array.from(new Set(variantPrices));
  const hasVariantPriceRange = activeVariants.length > 1 && uniqueVariantPrices.length > 1;
  const minVariantPrice = hasVariantPriceRange ? Math.min(...uniqueVariantPrices) : null;
  const startingAtLabel = getEcomText('startingAt', t.startingAt || 'Starting at');
  
  // Build variant selector HTML if product has variants
  let variantSelectorHtml = '';
  if (hasVariants) {
    // Group variants by attribute type to create selection options
    const attributeGroups = {};
    const attributeDisplayMap = {};
    variants.forEach(variant => {
      if (variant.attributes && variant.is_active !== false) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!attributeGroups[key]) {
            attributeGroups[key] = new Set();
          }
          attributeGroups[key].add(value);
          if (!attributeDisplayMap[key]) {
            attributeDisplayMap[key] = {};
          }
          const displayValue =
            variant.attributes_display && Object.prototype.hasOwnProperty.call(variant.attributes_display, key)
              ? variant.attributes_display[key]
              : value;
          if (!attributeDisplayMap[key][value]) {
            attributeDisplayMap[key][value] = displayValue;
          }
        });
      }
    });
    
    // Attribute label translations, including saved labels for custom options.
    const attrLabels = window.getVariantAttributeLabels
      ? window.getVariantAttributeLabels(product, t)
      : {};
    const getAttrLabel = (attrKey) =>
      attrLabels[attrKey] ||
      attrLabels[String(attrKey).toLowerCase()] ||
      String(attrKey).charAt(0).toUpperCase() + String(attrKey).slice(1);
    
    const hasAttributeGroups = Object.keys(attributeGroups).length > 0;
    
    // Build variant groups HTML
    const groupsHtml = hasAttributeGroups
      ? Object.entries(attributeGroups).map(([attrKey, values]) => {
        const label = getAttrLabel(attrKey);
        const sizeOrder = {'xxxs':0,'xxs':1,'xs':2,'s':3,'m':4,'l':5,'xl':6,'xxl':7,'2xl':7,'xxxl':8,'3xl':8,'4xl':9,'5xl':10};
        const valuesArray = Array.from(values).sort((a, b) => {
          const sa = sizeOrder[String(a).toLowerCase()], sb = sizeOrder[String(b).toLowerCase()];
          const numA = sa === undefined ? parseFloat(a) : NaN;
          const numB = sb === undefined ? parseFloat(b) : NaN;
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          if (sa !== undefined && sb !== undefined) return sa - sb;
          const ca = !isNaN(numA) ? 0 : sa !== undefined ? 1 : 2;
          const cb = !isNaN(numB) ? 0 : sb !== undefined ? 1 : 2;
          if (ca !== cb) return ca - cb;
          return String(a).localeCompare(String(b));
        });
        const isColorAttr = attrKey.toLowerCase() === 'color' || attrKey.toLowerCase().includes('color');
        
        const optionsHtml = valuesArray.map(value => {
          const displayValue =
            (attributeDisplayMap[attrKey] && attributeDisplayMap[attrKey][value]) || value;
          // For color attribute, prefer configured hex and fall back for older sites.
          if (isColorAttr) {
            var bgColor = window.getConfiguredColorSwatchHex(product, attrKey, value);
            return '<button type="button" class="variant-option color-swatch" data-attr="' + _eA(attrKey) + '" data-value="' + _eA(value) + '" data-display-value="' + _eA(displayValue) + '" data-color-hex="' + _eA(bgColor) + '" style="background-color: ' + _eA(bgColor) + ';" title="' + _eA(displayValue) + '"></button>';
          }
          return '<button type="button" class="variant-option" data-attr="' + _eA(attrKey) + '" data-value="' + _eA(value) + '" data-display-value="' + _eA(displayValue) + '">' + _eA(displayValue) + '</button>';
        }).join('');
        
        return '<div class="variant-group" data-group="' + _eA(attrKey) + '"><label class="variant-group-label">' + _eA(label) + ': <span class="variant-selected-value"></span></label><div class="variant-options">' + optionsHtml + '</div></div>';
      }).join('')
      : (() => {
        const label = t.selectVariant || 'Select option';
        const optionsHtml = activeVariants.map(variant => {
          const variantLabel = variant.name || variant.sku || label;
          return '<button type="button" class="variant-option" data-attr="variant" data-value="' + _eA(variant.id) + '" data-variant-id="' + _eA(variant.id) + '">' + _eA(variantLabel) + '</button>';
        }).join('');
        return '<div class="variant-group" data-group="variant"><label class="variant-group-label">' + _eA(label) + ': <span class="variant-selected-value"></span></label><div class="variant-options">' + optionsHtml + '</div></div>';
      })();
    
    variantSelectorHtml = '<div class="product-variants" id="product-variants">' + groupsHtml + '</div>';
  }
  
  // Build breadcrumb (use custom products label if set via store settings)
  var productsLabel = (typeof additionalJsProductsMenuLabel === 'string' && additionalJsProductsMenuLabel) ? additionalJsProductsMenuLabel : t.products;
  var breadcrumbHtml = '<nav class="product-breadcrumb">';
  breadcrumbHtml += '<a href="/">' + t.home + '</a>';
  breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
  breadcrumbHtml += '<a href="/products">' + productsLabel + '</a>';
  if (product.category_name) {
    breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
    if (product.category_id) {
      breadcrumbHtml += '<a href="/products?category=' + product.category_id + '">' + product.category_name + '</a>';
    } else {
      breadcrumbHtml += '<span class="breadcrumb-current">' + product.category_name + '</span>';
    }
  }
  breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
  breadcrumbHtml += '<span class="breadcrumb-current">' + product.name + '</span>';
  breadcrumbHtml += '</nav>';
  
  // Build video thumbnails HTML
  var videoThumbsHtml = videos.map(function(v, i) {
    var thumb = '';
    if (v.type === 'youtube') {
      var ytId = v.videoId || '';
      if (!ytId && v.url) {
        var _yp = v.url.split('v='); if (_yp[1]) ytId = _yp[1].split('&')[0].substring(0,11);
        if (!ytId) { _yp = v.url.split('youtu.be/'); if (_yp[1]) ytId = _yp[1].split('?')[0].substring(0,11); }
      }
      thumb = 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg';
    } else if (v.type === 'vimeo') {
      thumb = v.thumbnail || '';
    } else if (v.type === 'upload') {
      thumb = v.thumbnail || '';
    }
    var dataAttr = 'data-video-index="' + i + '"';
    var thumbContent = thumb
      ? '<img src="' + thumb + '" alt="Video" style="width:100%;height:100%;object-fit:cover;" />'
      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#fff;font-size:20px;">▶</div>';
    return '<div class="product-gallery-thumb product-video-thumb" ' + dataAttr + ' onclick="openVideoModal(' + i + ')" style="position:relative;cursor:pointer;">'
      + thumbContent
      + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">'
      + '<div style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>'
      + '</div></div></div>';
  }).join('');

  container.innerHTML = `
    ${breadcrumbHtml}
    <div class="product-detail-container">
      <div class="product-gallery">
        ${mainImage 
          ? '<img src="' + mainImage + '" alt="' + product.name + '" class="product-gallery-main" id="product-main-image">'
          : '<div class="product-gallery-main" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:64px;">📦</div>'
        }
        ${hasMedia ? `
          <div class="product-gallery-thumbs">
            ${images.map((img, i) => `
              <img src="${img}" alt="${product.name}" class="product-gallery-thumb ${i === 0 ? 'active' : ''}" onclick="changeMainImage(this, '${img}')" />
            `).join('')}
            ${videoThumbsHtml}
          </div>
        ` : ''}
      </div>
    <!-- Video Modal -->
    <div id="product-video-modal" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;" onclick="closeVideoModal()">
      <div style="position:relative;width:90%;max-width:800px;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;" onclick="event.stopPropagation();">
        <div id="product-video-modal-content" style="width:100%;height:100%;"></div>
        <button onclick="closeVideoModal()" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);z-index:1;">✕</button>
      </div>
    </div>
      <div class="product-info">
        <div class="product-title-row">
          <h1>${product.name}</h1>
          <div class="product-icon-actions">
            ${!isCatalogMode ? `<button class="icon-btn favorite-btn" id="favorite-btn" onclick="toggleFavorite('${product.id}')" title="${t.saveToFavorites}">
              <svg class="heart-outline" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><g clip-path="url(#clip0_fav)"><path d="M14.7917 0.833496C12.705 0.833496 10.8108 2.376 10 4.46183C9.18917 2.37516 7.295 0.833496 5.20833 0.833496C2.33667 0.833496 0 3.17016 0 6.04183C0 11.6752 8.12833 17.7668 9.7575 18.9302L10 19.1035L10.2425 18.9302C11.8725 17.7668 20 11.6743 20 6.04183C20 3.17016 17.6633 0.833496 14.7917 0.833496ZM10 18.0777C5.71583 14.9652 0.833333 10.0185 0.833333 6.04183C0.833333 3.62933 2.79583 1.66683 5.20833 1.66683C7.49833 1.66683 9.58333 4.05016 9.58333 6.66683H10.4167C10.4167 4.05016 12.5017 1.66683 14.7917 1.66683C17.2042 1.66683 19.1667 3.62933 19.1667 6.04183C19.1667 10.0185 14.2842 14.9652 10 18.0777Z" fill="currentColor"/></g><defs><clipPath id="clip0_fav"><rect width="20" height="20" fill="white"/></clipPath></defs></svg>
              <svg class="heart-filled" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><g clip-path="url(#clip1_fav)"><path d="M14.7917 0.833496C12.705 0.833496 10.8108 2.376 10 4.46183C9.18917 2.37516 7.295 0.833496 5.20833 0.833496C2.33667 0.833496 0 3.17016 0 6.04183C0 11.6752 8.12833 17.7668 9.7575 18.9302L10 19.1035L10.2425 18.9302C11.8725 17.7668 20 11.6743 20 6.04183C20 3.17016 17.6633 0.833496 14.7917 0.833496Z" fill="#e74c3c"/></g><defs><clipPath id="clip1_fav"><rect width="20" height="20" fill="white"/></clipPath></defs></svg>
            </button>` : ''}
            <button class="icon-btn share-btn" onclick="shareProduct()" title="${t.shareProduct}">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15.625 12.25C14.383 12.25 13.3075 12.9318 12.721 13.9338L7.348 11.563C7.59625 11.0935 7.75 10.567 7.75 9.99925C7.75 9.4315 7.59625 8.90575 7.348 8.4355L12.721 6.06475C13.3068 7.06675 14.3822 7.7485 15.625 7.7485C17.4858 7.7485 19 6.23425 19 4.3735C19 2.51275 17.4858 1 15.625 1C13.7642 1 12.25 2.51425 12.25 4.375C12.25 4.72675 12.319 5.05975 12.4195 5.37925L6.91825 7.80625C6.29875 7.08925 5.39425 6.625 4.375 6.625C2.51425 6.625 1 8.13925 1 10C1 11.8608 2.51425 13.375 4.375 13.375C5.395 13.375 6.2995 12.9108 6.91825 12.1938L12.4195 14.6207C12.319 14.9402 12.25 15.2732 12.25 15.625C12.25 17.4858 13.7642 19 15.625 19C17.4858 19 19 17.4858 19 15.625C19 13.7642 17.4858 12.25 15.625 12.25ZM15.625 1.75C17.0725 1.75 18.25 2.9275 18.25 4.375C18.25 5.8225 17.0725 7 15.625 7C14.1775 7 13 5.8225 13 4.375C13 2.9275 14.1775 1.75 15.625 1.75ZM4.375 12.625C2.9275 12.625 1.75 11.4475 1.75 10C1.75 8.5525 2.9275 7.375 4.375 7.375C5.8225 7.375 7 8.5525 7 10C7 11.4475 5.8225 12.625 4.375 12.625ZM15.625 18.25C14.1775 18.25 13 17.0725 13 15.625C13 14.1775 14.1775 13 15.625 13C17.0725 13 18.25 14.1775 18.25 15.625C18.25 17.0725 17.0725 18.25 15.625 18.25Z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>
        ${product.brand ? '<div class="product-brand">' + product.brand + '</div>' : ''}
        ${showPrice ? `
        <div class="product-price" id="product-price-display">
          ${hasVariantPriceRange
            ? startingAtLabel + ' ' + t.currency + minVariantPrice.toFixed(2)
            : (hasSalePrice 
              ? t.currency + product.sale_price + ' <span class="original-price">' + t.currency + product.price + '</span>'
              : t.currency + product.price)
          }${(() => {
            const unit = product.quantity_unit || 'piece';
            if (unit !== 'piece') {
              const step = parseFloat(product.quantity_step) || 1;
              const unitLabel = product.custom_unit_label || (t.unitLabels && t.unitLabels[unit]) || unit;
              const stepPrefix = step !== 1 ? step + ' ' : '';
              return ' <span class="price-per-unit">' + t.perUnit + ' ' + stepPrefix + unitLabel + '</span>';
            }
            return '';
          })()}
        </div>
        ${(() => {
          if (!product.show_price_per_unit) return '';
          const unit = product.quantity_unit || 'piece';
          // Use variant min price when the detail page shows "Starting at" pricing
          const effectivePrice = hasVariantPriceRange
            ? minVariantPrice
            : (product.sale_price && parseFloat(product.sale_price) < parseFloat(product.price) ? parseFloat(product.sale_price) : parseFloat(product.price));
          if (!effectivePrice) return '';
          let refAmount, refLabel, pricePerRef;
          if (unit === 'piece') {
            // Piece-based: use piece_unit_type and piece_unit_value
            const pieceUnit = product.piece_unit_type;
            const pieceValue = parseFloat(product.piece_unit_value);
            if (!pieceUnit || !pieceValue) return '';
            if (pieceUnit === 'gram') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.gram) || 'g'); }
            else if (pieceUnit === 'ml') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.ml) || 'ml'); }
            else if (pieceUnit === 'kg') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.kg) || 'kg'; }
            else if (pieceUnit === 'liter') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.liter) || 'L'; }
            else return '';
            pricePerRef = (effectivePrice / pieceValue) * refAmount;
          } else {
            const step = parseFloat(product.quantity_step) || 1;
            if (!step) return '';
            if (unit === 'gram') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.gram) || 'g'); }
            else if (unit === 'ml') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.ml) || 'ml'); }
            else if (unit === 'kg') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.kg) || 'kg'; }
            else if (unit === 'liter') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.liter) || 'L'; }
            else if (unit === 'custom') { refAmount = 1; refLabel = product.custom_unit_label || ''; }
            else return '';
            pricePerRef = (effectivePrice / step) * refAmount;
          }
          return '<div class="price-per-unit-info" id="product-price-per-unit">' + t.currency + pricePerRef.toFixed(2) + ' / ' + refLabel + '</div>';
        })()}
        ` : ''}
        ${product.short_description ? '<div class="product-short-description">' + product.short_description + '</div>' : ''}
        ${product.sku ? '<div class="product-sku" id="product-sku-display">' + t.sku + ': ' + product.sku + '</div>' : ''}
        ${variantSelectorHtml}
        <div class="product-stock ${baseInStock ? 'in-stock' : 'out-of-stock'}" id="product-stock-display">
          ${baseInStock 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' + t.inStock
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' + t.outOfStock
          }
        </div>
        ${(() => {
          const upsellsArr = (product.upsells || []).filter(u => u && u.is_active !== false);
          if (upsellsArr.length === 0 || isCatalogMode) return '';
          const tFreqTitle = getEcomText('frequentlyBoughtTogether', t.frequentlyBoughtTogether || 'Frequently bought together');
          const tFreqSub = getEcomText('frequentlyBoughtTogetherSubtitle', t.frequentlyBoughtTogetherSubtitle || 'Save time and get everything you need');
          const tBundleTotalLabel = getEcomText('bundleTotal', t.bundleTotal || 'Bundle total');
          const tOutOfStockLabel = getEcomText('outOfStock', t.outOfStock || 'Out of stock');
          // Resolve the additive price for an upsell row. Merchants can set a
          // per-link price_override that wins over the product/variant price:
          //   price_override === 0           → free add-on
          //   price_override > 0             → custom add-on price
          //   price_override null/undefined  → fall back to default variant
          //                                    price → sale price → base price
          const tFreeLabel = getEcomText('upsellFree', t.upsellFree || 'Free');
          function _upsellPrice(u) {
            if (u.price_override !== null && u.price_override !== undefined && u.price_override !== '') {
              const op = parseFloat(u.price_override);
              if (Number.isFinite(op) && op >= 0) return op;
            }
            const v = u.default_variant;
            if (v && v.price !== null && v.price !== undefined && v.price !== '') {
              const vp = parseFloat(v.price);
              if (!isNaN(vp)) return vp;
            }
            const sale = parseFloat(u.sale_price);
            const reg = parseFloat(u.price);
            if (Number.isFinite(sale) && Number.isFinite(reg) && sale < reg) return sale;
            return Number.isFinite(reg) ? reg : 0;
          }
          const rowsHtml = upsellsArr.map(u => {
            const p = _upsellPrice(u);
            const inStock = u.stock_status !== 'out_of_stock';
            const preChecked = inStock && (u.pre_checked !== false);
            const slug = u.slug || u.id;
            const priceLabel = p === 0
              ? '<span class="upsell-price upsell-price-free">' + tFreeLabel + '</span>'
              : '<span class="upsell-price">+' + t.currency + p.toFixed(2) + '</span>';
            // The whole <li> is a click target via toggleUpsellRow — clicking
            // anywhere on the row (incl. padding / empty space) toggles the
            // checkbox. The .upsell-name <a> stops propagation so it can
            // navigate to the product page without also flipping the
            // selection. The <input>'s native change handler still works
            // when users click the checkbox directly or use the keyboard.
            // Keyboard activation (Space / Enter) is handled by
            // handleUpsellRowKey to keep the inline attribute free of
            // nested quotes (which break when this script body is itself
            // emitted from a JS template literal).
            return '<li class="upsell-row ' + (inStock ? '' : 'is-out-of-stock') + '" data-upsell-id="' + _eA(u.id) + '" data-upsell-price="' + p + '"' +
              (inStock ? ' onclick="toggleUpsellRow(event, this)"' : '') +
              ' role="button" tabindex="' + (inStock ? '0' : '-1') + '"' +
              ' onkeydown="handleUpsellRowKey(event, this)">' +
              '<input type="checkbox" class="upsell-checkbox"' +
                (preChecked ? ' checked' : '') +
                (!inStock ? ' disabled' : '') +
                ' onclick="event.stopPropagation()"' +
                ' onchange="recomputeBundleTotal()" />' +
              '<span class="upsell-row-text">' +
                '<a class="upsell-name" href="/product/' + _eA(slug) + '" onclick="event.stopPropagation()">' + _eA(u.name || '') + '</a>' +
                (!inStock ? '<span class="upsell-stock-badge">' + tOutOfStockLabel + '</span>' : '') +
              '</span>' +
              priceLabel +
            '</li>';
          }).join('');
          return '<div class="product-upsells" id="product-upsells">' +
            '<div class="upsells-header">' +
              '<h3 class="upsells-title">' + tFreqTitle + '</h3>' +
              '<p class="upsells-subtitle">' + tFreqSub + '</p>' +
            '</div>' +
            '<ul class="upsells-list">' + rowsHtml + '</ul>' +
            '<div class="upsells-total" id="upsells-total">' +
              '<span class="upsells-total-label">' + tBundleTotalLabel + ':</span>' +
              ' <strong class="upsells-total-amount" id="upsells-total-amount">' + t.currency + '0.00</strong>' +
            '</div>' +
          '</div>';
        })()}
        <div class="product-add-row">
          ${(() => {
          if (isCatalogMode) return '';
          const qStep = parseFloat(product.quantity_step) || 1;
          const qUnit = product.quantity_unit || 'piece';
          const unitLabel = qUnit !== 'piece' ? (' (' + (product.custom_unit_label || (t.unitLabels && t.unitLabels[qUnit]) || qUnit) + ')') : '';
          return '<div class="product-quantity">' +
            '<label>' + t.quantity + unitLabel + ':</label>' +
            '<div class="quantity-selector">' +
              '<button type="button" onclick="adjustQuantity(-1)">−</button>' +
              '<input type="number" id="product-quantity" value="' + qStep + '" min="' + qStep + '" max="9999" step="' + qStep + '" data-unit="' + qUnit + '" data-step="' + qStep + '">' +
              '<button type="button" onclick="adjustQuantity(1)">+</button>' +
            '</div>' +
          '</div>';
        })()}
          <div class="product-actions ${isCatalogMode ? 'catalog-mode' : ''}">
            ${isCatalogMode ? `
              <a href="mailto:${encodeURIComponent(t.businessEmail)}?subject=${encodeURIComponent(t.inquiryAbout + ' ' + product.name)}" class="btn btn-primary inquiry-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                ${t.sendInquiry}
              </a>
              <a href="tel:${t.businessPhone.replace(/[\s\-()]/g, '')}" class="btn btn-secondary call-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                ${t.callNow}
              </a>
            ` : `
            <button class="add-to-cart" id="add-to-cart-btn" onclick="addProductToCart()" ${!baseInStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
              ${t.addToCart}
            </button>
            `}
          </div>
        </div>
        ${product.description ? `
        <div class="product-details-accordion">
          <div class="product-details-divider"></div>
          <button type="button" class="product-details-header" onclick="toggleProductDetails(this)">
            <span>${t.productDetails || 'Product Details'}</span>
            <span class="product-details-toggle">−</span>
          </button>
          <div class="product-details-body">
            <div class="product-description">${product.description}</div>
          </div>
        </div>
        ` : ''}
        ${(product.custom_fields?.specifications?.length > 0) ? `
        <div class="product-details-accordion collapsed">
          <div class="product-details-divider"></div>
          <button type="button" class="product-details-header" onclick="toggleProductDetails(this)">
            <span>${t.specifications || 'Specifications'}</span>
            <span class="product-details-toggle">+</span>
          </button>
          <div class="product-details-body">
            <div class="product-specifications">
              <table class="specs-table">
                ${product.custom_fields.specifications.map(spec => `
                  <tr>
                    <th dir="auto">${spec.key}</th>
                    <td dir="auto">${(spec.value || '').replace(/\\,/g, ',')}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </div>
        </div>
        ` : ''}
        ${additionalJsProductPageNote ? `
        <div class="product-details-accordion collapsed">
          <div class="product-details-divider"></div>
          <button type="button" class="product-details-header" onclick="toggleProductDetails(this)">
            <span>${t.storeNote || 'Additional Information'}</span>
            <span class="product-details-toggle">+</span>
          </button>
          <div class="product-details-body">
            <div class="product-description">${additionalJsProductPageNote}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Hide stock status label if disabled in store settings
  if (!additionalJsShowStockStatus) {
    var stockEl = document.getElementById('product-stock-display');
    if (stockEl) stockEl.style.display = 'none';
  }

  // Store product data for add to cart
  window.currentProduct = product;
  window.selectedVariant = null;
  window.productBasePrice = basePrice;
  window.productOriginalPrice = originalPrice;
  window.productHasSalePrice = hasSalePrice;
  window.productHasVariantPriceRange = hasVariantPriceRange;
  window.productVariantMinPrice = minVariantPrice;
  window.productShowPricePerUnit = product.show_price_per_unit;
  window.productTranslations = t;
  
  // Initialize variant selection if product has variants
  if (hasVariants) {
    initVariantSelection(product, t);
  }

  // Wire up quantity input changes so the bundle total stays in sync when
  // the customer types directly into the quantity field.
  var _qtyInputEl = document.getElementById('product-quantity');
  if (_qtyInputEl) {
    _qtyInputEl.addEventListener('input', function () {
      if (typeof recomputeBundleTotal === 'function') recomputeBundleTotal();
    });
  }

  // Compute the initial bundle total (no-op if there are no upsells).
  if (typeof recomputeBundleTotal === 'function') recomputeBundleTotal();

  // Check if product is already favorited
  checkFavoriteStatus(product.id);
}

function changeMainImage(thumb, src) {
  const mainImg = document.getElementById('product-main-image');
  if (mainImg) mainImg.src = src;

  document.querySelectorAll('.product-gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function openVideoModal(videoIndex) {
  var videos = (window.currentProduct && window.currentProduct.videos) || [];
  var v = videos[videoIndex];
  if (!v) return;
  var modal = document.getElementById('product-video-modal');
  var content = document.getElementById('product-video-modal-content');
  if (!modal || !content) return;

  var html = '';
  if (v.type === 'youtube') {
    var ytId = v.videoId || '';
    if (!ytId && v.url) {
      var ytParts = v.url.split('v='); if (ytParts[1]) ytId = ytParts[1].split('&')[0].substring(0,11);
      if (!ytId) { ytParts = v.url.split('youtu.be/'); if (ytParts[1]) ytId = ytParts[1].split('?')[0].substring(0,11); }
    }
    html = '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0" style="width:100%;height:100%;border:none;" allow="autoplay;fullscreen;encrypted-media" allowfullscreen></iframe>';
  } else if (v.type === 'vimeo') {
    var vimeoId = v.videoId || '';
    if (!vimeoId && v.url) {
      var vmParts = v.url.split('vimeo.com/'); if (vmParts[1]) vimeoId = vmParts[1].split('?')[0].split('/')[0];
    }
    html = '<iframe src="https://player.vimeo.com/video/' + vimeoId + '?autoplay=1" style="width:100%;height:100%;border:none;" allow="autoplay;fullscreen" allowfullscreen></iframe>';
  } else if (v.type === 'upload') {
    var src = v.url;
    if (window.resolveProductImageUrl) src = window.resolveProductImageUrl(v.url);
    html = '<video src="' + src + '" style="width:100%;height:100%;object-fit:contain;" controls autoplay></video>';
  }
  content.innerHTML = html;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', _videoModalEscHandler);
}

function _videoModalEscHandler(e) {
  if (e.key === 'Escape') closeVideoModal();
}

function closeVideoModal() {
  var modal = document.getElementById('product-video-modal');
  var content = document.getElementById('product-video-modal-content');
  if (modal) modal.style.display = 'none';
  if (content) content.innerHTML = '';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', _videoModalEscHandler);
}

function _zappyProductToast(message) {
  var existing = document.querySelector('.zappy-product-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'zappy-product-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:10000;font-size:14px;opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = '1'; }, 10);
  setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 3000);
}

function toggleFavorite(productId) {
  var wId = window.ZAPPY_WEBSITE_ID;
  var tokenKey = 'zappy_customer_token_' + wId;
  var token = localStorage.getItem(tokenKey);
  var btn = document.getElementById('favorite-btn');
  if (!btn) return;

  if (!token) {
    var loginUrl = '/login';
    var currentUrl = window.location.href;
    var currentPath = window.location.pathname + window.location.search;
    if (currentUrl.includes('/api/website/preview')) {
      var isFullscreen = currentUrl.includes('preview-fullscreen');
      var previewType = isFullscreen ? 'preview-fullscreen' : 'preview';
      var pageParam = new URLSearchParams(window.location.search).get('page') || '/';
      sessionStorage.setItem('zappy_login_return', pageParam);
      loginUrl = '/api/website/' + previewType + '/' + wId + '?page=' + encodeURIComponent('/login');
    } else {
      sessionStorage.setItem('zappy_login_return', currentPath);
    }
    _zappyProductToast('Log in to save favorites');
    setTimeout(function() { window.location.href = loginUrl; }, 1200);
    return;
  }

  var isActive = btn.classList.contains('active');
  var apiBase = window.ZAPPY_API_BASE || '';

  if (isActive) {
    btn.classList.remove('active');
    fetch(apiBase + '/api/ecommerce/customers/me/favorites/' + productId + '?websiteId=' + wId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(r) {
      if (r.ok) _zappyProductToast('Removed from favorites');
    }).catch(function() {
      btn.classList.add('active');
    });
  } else {
    btn.classList.add('active');
    fetch(apiBase + '/api/ecommerce/customers/me/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ websiteId: wId, productId: productId })
    }).then(function(r) {
      if (r.ok) _zappyProductToast('Added to favorites');
    }).catch(function() {
      btn.classList.remove('active');
    });
  }
}

function toggleCardFavorite(btn, productId) {
  var wId = window.ZAPPY_WEBSITE_ID;
  var tokenKey = 'zappy_customer_token_' + wId;
  var token = localStorage.getItem(tokenKey);

  if (!token) {
    _zappyProductToast('Log in to save favorites');
    var loginUrl = '/login';
    var currentUrl = window.location.href;
    if (currentUrl.includes('/api/website/preview')) {
      var isFullscreen = currentUrl.includes('preview-fullscreen');
      var previewType = isFullscreen ? 'preview-fullscreen' : 'preview';
      loginUrl = '/api/website/' + previewType + '/' + wId + '?page=' + encodeURIComponent('/login');
    }
    setTimeout(function() { window.location.href = loginUrl; }, 1200);
    return;
  }

  var isActive = btn.classList.contains('active');
  var apiBase = window.ZAPPY_API_BASE || '';

  if (isActive) {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    fetch(apiBase + '/api/ecommerce/customers/me/favorites/' + productId + '?websiteId=' + wId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(r) {
      if (r.ok) {
        _zappyProductToast('Removed from favorites');
        document.querySelectorAll('.card-favorite-btn[data-product-id="' + productId + '"]').forEach(function(b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        var detailBtn = document.getElementById('favorite-btn');
        if (detailBtn) detailBtn.classList.remove('active');
      }
    }).catch(function() { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); });
  } else {
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    fetch(apiBase + '/api/ecommerce/customers/me/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ websiteId: wId, productId: productId })
    }).then(function(r) {
      if (r.ok) {
        _zappyProductToast('Added to favorites');
        document.querySelectorAll('.card-favorite-btn[data-product-id="' + productId + '"]').forEach(function(b) {
          b.classList.add('active');
          b.setAttribute('aria-pressed', 'true');
        });
        var detailBtn = document.getElementById('favorite-btn');
        if (detailBtn) detailBtn.classList.add('active');
      }
    }).catch(function() { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); });
  }
}

function _syncCardFavorites() {
  var wId = window.ZAPPY_WEBSITE_ID;
  var tokenKey = 'zappy_customer_token_' + wId;
  var token = localStorage.getItem(tokenKey);
  if (!token) return;
  var apiBase = window.ZAPPY_API_BASE || '';
  fetch(apiBase + '/api/ecommerce/customers/me/favorites?websiteId=' + wId, {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function(r) { return r.json(); })
    .then(function(data) {
      var favIds = (data.favorites || data || []).map(function(f) { return f.product_id || f.productId || f.id; });
      document.querySelectorAll('.card-favorite-btn').forEach(function(btn) {
        var pid = btn.getAttribute('data-product-id');
        if (favIds.indexOf(pid) !== -1) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    }).catch(function() {});
}

function shareProduct() {
  var url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      _zappyProductToast('Link copied!');
    });
  } else {
    var input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    _zappyProductToast('Link copied!');
  }
}

function checkFavoriteStatus(productId) {
  var wId = window.ZAPPY_WEBSITE_ID;
  var tokenKey = 'zappy_customer_token_' + wId;
  var token = localStorage.getItem(tokenKey);
  if (!token) return;

  var btn = document.getElementById('favorite-btn');
  if (!btn) return;

  var apiBase = window.ZAPPY_API_BASE || '';
  fetch(apiBase + '/api/ecommerce/customers/me/favorites/' + productId + '?websiteId=' + wId, {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success && data.data && data.data.isFavorited) {
        btn.classList.add('active');
      }
    }).catch(function() {});
}

function adjustQuantity(delta) {
  const input = document.getElementById('product-quantity');
  if (!input) return;
  const step = parseFloat(input.dataset.step) || 1;
  const minVal = step;
  const current = parseFloat(input.value) || step;
  const newVal = Math.max(minVal, Math.min(9999, current + delta * step));
  // Round to avoid floating point issues
  const decimals = (step.toString().split('.')[1] || '').length;
  input.value = parseFloat(newVal.toFixed(decimals));
  if (typeof recomputeBundleTotal === 'function') recomputeBundleTotal();
}

function toggleProductDetails(header) {
  var accordion = header.closest('.product-details-accordion');
  if (!accordion) return;
  accordion.classList.toggle('collapsed');
  var toggle = header.querySelector('.product-details-toggle');
  if (toggle) {
    toggle.textContent = accordion.classList.contains('collapsed') ? '+' : '−';
  }
}

// Initialize variant selection functionality
function initVariantSelection(product, t) {
  const variants = product.variants || [];
  let selectedAttributes = {};
  
  // Inject variant disabled/out-of-stock CSS (ensures it works even for pre-existing sites)
  if (!document.getElementById('zappy-variant-state-css')) {
    var vstyle = document.createElement('style');
    vstyle.id = 'zappy-variant-state-css';
    vstyle.textContent =
      '.variant-option.disabled { opacity: 0.3; position: relative; }' +
      '.variant-option.disabled:not(.color-swatch)::after { content: ""; position: absolute; top: 50%; left: 4px; right: 4px; height: 1px; background: currentColor; transform: rotate(-12deg); pointer-events: none; }' +
      '.variant-option.color-swatch.disabled::before { content: ""; position: absolute; top: 50%; left: 2px; right: 2px; height: 1.5px; background: currentColor; transform: rotate(-45deg); pointer-events: none; z-index: 1; }' +
      '.variant-option.out-of-stock { opacity: 0.6; position: relative; }' +
      '.variant-option.out-of-stock:not(.color-swatch)::after { content: ""; position: absolute; top: 50%; left: 4px; right: 4px; height: 1px; background: currentColor; transform: rotate(-12deg); pointer-events: none; }' +
      '.variant-option.color-swatch.out-of-stock::before { content: ""; position: absolute; top: 50%; left: 2px; right: 2px; height: 1.5px; background: currentColor; transform: rotate(-45deg); pointer-events: none; z-index: 1; }';
    document.head.appendChild(vstyle);
  }
  
  // Sort variant options within each group (numeric values small→big)
  document.querySelectorAll('.variant-options').forEach(function(container) {
    var btns = Array.from(container.querySelectorAll('.variant-option'));
    if (btns.length < 2) return;
    btns.sort(function(a, b) {
      var va = a.getAttribute('data-value') || '';
      var vb = b.getAttribute('data-value') || '';
      var na = parseFloat(va), nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return va.localeCompare(vb);
    });
    btns.forEach(function(btn) { container.appendChild(btn); });
  });
  
  // Get all variant option buttons
  const variantButtons = document.querySelectorAll('.variant-option');
  
  // Get all attribute keys from the buttons
  function getAttributeKeys() {
    const keys = new Set();
    variantButtons.forEach(btn => keys.add(btn.getAttribute('data-attr')));
    return Array.from(keys);
  }
  
  // Check if a variant exists with the given attribute combination (any stock status)
  // If a variant doesn't define a particular attribute, treat it as compatible (wildcard)
  function variantExistsWith(attrKey, attrValue, otherSelections) {
    return variants.some(variant => {
      if (!variant.attributes || variant.is_active === false) return false;
      // If variant defines this attribute, it must match; if not defined, treat as wildcard
      if (variant.attributes.hasOwnProperty(attrKey) && variant.attributes[attrKey] !== attrValue) return false;
      // Check all other selections match (skip if variant doesn't define the attribute)
      for (var k in otherSelections) {
        if (k === attrKey) continue;
        if (variant.attributes.hasOwnProperty(k) && variant.attributes[k] !== otherSelections[k]) return false;
      }
      return true;
    });
  }
  
  // Check if a variant with the given attributes is out of stock
  function isVariantOutOfStock(attrKey, attrValue, otherSelections) {
    var matched = variants.filter(variant => {
      if (!variant.attributes || variant.is_active === false) return false;
      if (variant.attributes.hasOwnProperty(attrKey) && variant.attributes[attrKey] !== attrValue) return false;
      for (var k in otherSelections) {
        if (k === attrKey) continue;
        if (variant.attributes.hasOwnProperty(k) && variant.attributes[k] !== otherSelections[k]) return false;
      }
      return true;
    });
    // If all matching variants are out of stock, it's out of stock
    return matched.length > 0 && matched.every(v => v.stock_status === 'out_of_stock');
  }
  
  // Update visibility and stock styling of options in other groups based on current selections
  function updateAvailableOptions() {
    var attrKeys = getAttributeKeys();
    
    attrKeys.forEach(function(groupKey) {
      // Build "other selections" = all selections EXCEPT this group
      var otherSelections = {};
      for (var k in selectedAttributes) {
        if (k !== groupKey) otherSelections[k] = selectedAttributes[k];
      }
      
      // For each button in this group, check if a variant exists with this value + other selections
      var groupBtns = document.querySelectorAll('.variant-option[data-attr="' + groupKey + '"]');
      groupBtns.forEach(function(btn) {
        var val = btn.getAttribute('data-value');
        var exists = variantExistsWith(groupKey, val, otherSelections);
        var outOfStock = exists && isVariantOutOfStock(groupKey, val, otherSelections);
        
        // Hide options that don't exist as a combination
        if (exists) {
          btn.classList.remove('disabled');
        } else {
          btn.classList.add('disabled');
          btn.classList.remove('selected', 'out-of-stock');
        }
        
        // Mark out-of-stock options with strikethrough
        if (outOfStock) {
          btn.classList.add('out-of-stock');
        } else {
          btn.classList.remove('out-of-stock');
        }
      });
    });
  }
  
  variantButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const variantId = this.getAttribute('data-variant-id');
      const attrKey = this.getAttribute('data-attr');
      const attrValue = this.getAttribute('data-value');
      
      if (variantId) {
        // Simple variant selection (no attributes)
        variantButtons.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        const matchedVariant = variants.find(variant => variant.id === variantId);
        updateVariantUI(matchedVariant || null, product, t, {});
        return;
      }
      
      // Select the clicked option within its attribute group
      const groupButtons = document.querySelectorAll('.variant-option[data-attr="' + attrKey + '"]');
      groupButtons.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      
      // Update selected attributes
      selectedAttributes[attrKey] = attrValue;
      
      // Update the variant label to show selected value inline
      var selectedValueSpan = document.querySelector('.variant-group[data-group="' + attrKey + '"] .variant-selected-value');
      if (selectedValueSpan) {
        selectedValueSpan.textContent = this.getAttribute('data-display-value') || attrValue;
      }
      
      // Update visibility/stock of options in other groups
      updateAvailableOptions();
      
      // Check if other groups' selected option got hidden; if so, auto-select first visible
      var attrKeys = getAttributeKeys();
      var anyAutoSelected = false;
      attrKeys.forEach(function(otherKey) {
        if (otherKey === attrKey) return;
        var currentSelected = document.querySelector('.variant-option[data-attr="' + otherKey + '"].selected');
        if (!currentSelected || currentSelected.classList.contains('disabled')) {
          // Selection got hidden or doesn't exist - auto-select first visible
          var firstVisible = document.querySelector('.variant-option[data-attr="' + otherKey + '"]:not(.disabled)');
          if (firstVisible) {
            document.querySelectorAll('.variant-option[data-attr="' + otherKey + '"]').forEach(function(b) { b.classList.remove('selected'); });
            firstVisible.classList.add('selected');
            selectedAttributes[otherKey] = firstVisible.getAttribute('data-value');
            var otherValueSpan = document.querySelector('.variant-group[data-group="' + otherKey + '"] .variant-selected-value');
            if (otherValueSpan) otherValueSpan.textContent = firstVisible.getAttribute('data-display-value') || firstVisible.getAttribute('data-value');
            anyAutoSelected = true;
          } else {
            delete selectedAttributes[otherKey];
            var clearedSpan = document.querySelector('.variant-group[data-group="' + otherKey + '"] .variant-selected-value');
            if (clearedSpan) clearedSpan.textContent = '';
          }
        }
      });
      
      // If other groups changed, recalculate availability & re-ensure clicked option stays selected
      if (anyAutoSelected) {
        updateAvailableOptions();
        btn.classList.add('selected');
        selectedAttributes[attrKey] = attrValue;
        var selectedValueSpanRefresh = document.querySelector('.variant-group[data-group="' + attrKey + '"] .variant-selected-value');
        if (selectedValueSpanRefresh) selectedValueSpanRefresh.textContent = btn.getAttribute('data-display-value') || attrValue;
      }
      
      // Find matching variant and update UI
      const matchedVariant = findMatchingVariant(variants, selectedAttributes);
      updateVariantUI(matchedVariant, product, t, selectedAttributes);
    });
  });
  
  // Auto-select the first option in each variant group on page load
  var variantGroups = document.querySelectorAll('.variant-group');
  var groupArray = Array.from(variantGroups);
  if (groupArray.length > 0) {
    // Select first option in the first group
    var firstBtn = groupArray[0].querySelector('.variant-option');
    if (firstBtn && !firstBtn.getAttribute('data-variant-id')) {
      firstBtn.click();
    }
    // For remaining groups, select first visible (non-hidden) option
    for (var gi = 1; gi < groupArray.length; gi++) {
      var availBtn = groupArray[gi].querySelector('.variant-option:not(.disabled)');
      if (availBtn && !availBtn.getAttribute('data-variant-id')) {
        availBtn.click();
      }
    }
  }
}

// Find variant that matches all selected attributes
// If a variant doesn't define a particular attribute, treat it as compatible (wildcard)
function findMatchingVariant(variants, selectedAttributes) {
  const selectedKeys = Object.keys(selectedAttributes);
  if (selectedKeys.length === 0) return null;
  
  return variants.find(variant => {
    if (!variant.attributes || variant.is_active === false) return false;
    
    // Check if variant matches all selected attributes
    // Skip attributes the variant doesn't define (treat as wildcard)
    return selectedKeys.every(key => {
      return !variant.attributes.hasOwnProperty(key) || variant.attributes[key] === selectedAttributes[key];
    });
  });
}

// Recompute and update the price-per-unit info element on the detail page
function updatePricePerUnitDisplay(effectivePrice, product, t) {
  const perUnitEl = document.getElementById('product-price-per-unit');
  if (!perUnitEl || !window.productShowPricePerUnit) return;
  if (!effectivePrice) { perUnitEl.textContent = ''; return; }
  
  const unit = product.quantity_unit || 'piece';
  let refAmount, refLabel, pricePerRef;
  
  if (unit === 'piece') {
    const pieceUnit = product.piece_unit_type;
    const pieceValue = parseFloat(product.piece_unit_value);
    if (!pieceUnit || !pieceValue) { perUnitEl.textContent = ''; return; }
    if (pieceUnit === 'gram') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.gram) || 'g'); }
    else if (pieceUnit === 'ml') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.ml) || 'ml'); }
    else if (pieceUnit === 'kg') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.kg) || 'kg'; }
    else if (pieceUnit === 'liter') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.liter) || 'L'; }
    else { perUnitEl.textContent = ''; return; }
    pricePerRef = (effectivePrice / pieceValue) * refAmount;
  } else {
    const step = parseFloat(product.quantity_step) || 1;
    if (!step) { perUnitEl.textContent = ''; return; }
    if (unit === 'gram') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.gram) || 'g'); }
    else if (unit === 'ml') { refAmount = 100; refLabel = '100' + ((t.unitLabels && t.unitLabels.ml) || 'ml'); }
    else if (unit === 'kg') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.kg) || 'kg'; }
    else if (unit === 'liter') { refAmount = 1; refLabel = (t.unitLabels && t.unitLabels.liter) || 'L'; }
    else if (unit === 'custom') { refAmount = 1; refLabel = product.custom_unit_label || ''; }
    else { perUnitEl.textContent = ''; return; }
    pricePerRef = (effectivePrice / step) * refAmount;
  }
  
  perUnitEl.textContent = t.currency + pricePerRef.toFixed(2) + ' / ' + refLabel;
}

// Update UI when variant selection changes
function updateVariantUI(variant, product, t, selectedAttributes) {
  const priceDisplay = document.getElementById('product-price-display');
  const stockDisplay = document.getElementById('product-stock-display');
  const skuDisplay = document.getElementById('product-sku-display');
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const mainImage = document.getElementById('product-main-image');
  
  const basePrice = window.productBasePrice;
  const originalPrice = window.productOriginalPrice;
  const hasSalePrice = window.productHasSalePrice;
  const hasVariantPriceRange = window.productHasVariantPriceRange;
  const variantMinPrice = window.productVariantMinPrice;
  const startingAtLabel = getEcomText('startingAt', t.startingAt || 'Starting at');
  
  // Store original main image on first call
  if (mainImage && !window._originalMainImageSrc) {
    window._originalMainImageSrc = mainImage.src;
  }
  
  if (variant) {
    // Use variant's own price if set, otherwise fall back to base price
    const variantPrice = variant.price ? parseFloat(variant.price) : null;
    const finalPrice = variantPrice !== null ? variantPrice : basePrice;
    let displayedFinalPrice = finalPrice;
    let displayOriginalPrice = variantPrice !== null ? finalPrice : originalPrice;

    const seasonalD = typeof getSeasonalDiscountForProduct === 'function'
      ? getSeasonalDiscountForProduct(product.id)
      : null;
    if (seasonalD && finalPrice > 0) {
      if (seasonalD.type === 'percentage') {
        displayedFinalPrice = finalPrice - (finalPrice * parseFloat(seasonalD.value) / 100);
      } else if (seasonalD.type === 'fixed') {
        displayedFinalPrice = Math.max(0, finalPrice - parseFloat(seasonalD.value));
      }
      if (!Number.isFinite(displayedFinalPrice) || displayedFinalPrice >= finalPrice) {
        displayedFinalPrice = finalPrice;
      } else {
        displayOriginalPrice = finalPrice;
      }
    }
    
    if (priceDisplay) {
      if (displayedFinalPrice < finalPrice) {
        priceDisplay.innerHTML = t.currency + displayedFinalPrice.toFixed(2) + ' <span class="original-price">' + t.currency + displayOriginalPrice.toFixed(2) + '</span>';
      } else if (variantPrice === null && hasSalePrice) {
        priceDisplay.innerHTML = t.currency + finalPrice.toFixed(2) + ' <span class="original-price">' + t.currency + originalPrice.toFixed(2) + '</span>';
      } else {
        priceDisplay.textContent = t.currency + finalPrice.toFixed(2);
      }
    }
    
    // Update price-per-unit info to match the variant's effective price
    updatePricePerUnitDisplay(displayedFinalPrice, product, t);
    
    // Update stock status
    const variantInStock = variant.stock_status !== 'out_of_stock';
    if (stockDisplay) {
      if (!additionalJsShowStockStatus) { stockDisplay.style.display = 'none'; }
      else {
        stockDisplay.style.display = '';
        stockDisplay.className = 'product-stock ' + (variantInStock ? 'in-stock' : 'out-of-stock');
        stockDisplay.innerHTML = variantInStock 
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' + t.inStock
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' + t.outOfStock;
      }
    }
    
    // Update SKU: prefer variant SKU, fall back to base product SKU
    if (skuDisplay) {
      if (variant.sku) {
        skuDisplay.textContent = t.sku + ': ' + variant.sku;
      } else if (product.sku) {
        skuDisplay.textContent = t.sku + ': ' + product.sku;
      }
    }
    
    // Update add to cart button
    if (addToCartBtn) {
      addToCartBtn.disabled = !variantInStock;
      addToCartBtn.style.opacity = variantInStock ? '1' : '0.5';
      addToCartBtn.style.cursor = variantInStock ? 'pointer' : 'not-allowed';
    }
    
    // Update main image if variant has a specific image
    if (mainImage && variant.image) {
      var variantImgSrc = variant.image;
      if (window.resolveProductImageUrl) {
        variantImgSrc = window.resolveProductImageUrl(variant.image);
      }
      mainImage.src = variantImgSrc;
    } else if (mainImage && window._originalMainImageSrc) {
      mainImage.src = window._originalMainImageSrc;
    }
    
    // Store selected variant
    window.selectedVariant = variant;
    if (typeof recomputeBundleTotal === 'function') recomputeBundleTotal();
  } else {
    // No matching variant found
    // Reset SKU to base product SKU
    if (skuDisplay && product.sku) {
      skuDisplay.textContent = t.sku + ': ' + product.sku;
    }
    // Restore original image when no variant is matched
    if (mainImage && window._originalMainImageSrc) {
      mainImage.src = window._originalMainImageSrc;
    }
    // Check if all attribute groups have a selection - if so, this is an unavailable combination
    var allGroupsSelected = false;
    var variantGroups = document.querySelectorAll('.variant-group');
    if (variantGroups.length > 0) {
      var totalGroups = variantGroups.length;
      var selectedCount = Object.keys(selectedAttributes).length;
      allGroupsSelected = selectedCount >= totalGroups;
    }
    
    if (allGroupsSelected) {
      // All groups selected but no variant matches - treat as out of stock / unavailable
      if (stockDisplay) {
        if (!additionalJsShowStockStatus) { stockDisplay.style.display = 'none'; }
        else {
          stockDisplay.style.display = '';
          stockDisplay.className = 'product-stock out-of-stock';
          stockDisplay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' + (t.outOfStock || 'Out of Stock');
        }
      }
      
      if (addToCartBtn) {
        addToCartBtn.disabled = true;
        addToCartBtn.style.opacity = '0.5';
        addToCartBtn.style.cursor = 'not-allowed';
      }
    } else {
      // Partial selection - show base product info
      if (priceDisplay) {
        if (hasVariantPriceRange && Number.isFinite(variantMinPrice)) {
          priceDisplay.textContent = startingAtLabel + ' ' + t.currency + variantMinPrice.toFixed(2);
        } else if (hasSalePrice) {
          priceDisplay.innerHTML = t.currency + basePrice.toFixed(2) + ' <span class="original-price">' + t.currency + originalPrice.toFixed(2) + '</span>';
        } else {
          priceDisplay.textContent = t.currency + basePrice.toFixed(2);
        }
      }
      
      // Reset to base product stock
      const baseInStock = product.stock_status !== 'out_of_stock';
      if (stockDisplay) {
        if (!additionalJsShowStockStatus) { stockDisplay.style.display = 'none'; }
        else {
          stockDisplay.style.display = '';
          stockDisplay.className = 'product-stock ' + (baseInStock ? 'in-stock' : 'out-of-stock');
          stockDisplay.innerHTML = baseInStock 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' + t.inStock
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' + t.outOfStock;
        }
      }
      
      if (addToCartBtn) {
        addToCartBtn.disabled = !baseInStock;
        addToCartBtn.style.opacity = baseInStock ? '1' : '0.5';
        addToCartBtn.style.cursor = baseInStock ? 'pointer' : 'not-allowed';
      }
    }
    
    // Reset price-per-unit to match the base display price
    var resetPrice = hasVariantPriceRange && Number.isFinite(variantMinPrice) ? variantMinPrice : basePrice;
    updatePricePerUnitDisplay(resetPrice, product, t);
    
    window.selectedVariant = null;
    if (typeof recomputeBundleTotal === 'function') recomputeBundleTotal();
  }
}

function addProductToCart() {
  const product = window.currentProduct;
  if (!product) return;
  
  const qtyInput = document.getElementById('product-quantity');
  const quantity = parseFloat(qtyInput?.value || 1);
  const selectedVariant = window.selectedVariant;
  const t = window.productTranslations || {};
  
  // Validate stock status
  var hasVariants = (product.variants && product.variants.length > 0);
  if (selectedVariant) {
    if (selectedVariant.stock_status === 'out_of_stock') {
      alert(t.outOfStock || 'This item is out of stock');
      return;
    }
  } else if (hasVariants) {
    // Product has variants but no variant is selected (invalid combination)
    alert(t.outOfStock || 'This combination is unavailable');
    return;
  } else if (product.stock_status === 'out_of_stock') {
    alert(t.outOfStock || 'This item is out of stock');
    return;
  }
  
  // Get quantity unit info from the product
  const quantityUnit = product.quantity_unit || 'piece';
  const quantityStep = parseFloat(product.quantity_step) || 1;
  const customUnitLabel = product.custom_unit_label || null;
  
  // Create cart item with variant info if selected
  const cartItem = {
    ...product,
    quantity: quantity,
    quantityUnit: quantityUnit,
    quantityStep: quantityStep,
    customUnitLabel: customUnitLabel
  };
  
  if (selectedVariant) {
    // Use variant's own price if set, otherwise use base price
    const basePrice = window.productBasePrice;
    const variantPrice = selectedVariant.price ? parseFloat(selectedVariant.price) : null;
    const finalPrice = variantPrice !== null ? variantPrice : basePrice;
    
    // Add variant info to cart item
    cartItem.selectedVariant = {
      id: selectedVariant.id,
      name: selectedVariant.name,
      sku: selectedVariant.sku,
      attributes: selectedVariant.attributes,
      attributes_display: selectedVariant.attributes_display || selectedVariant.attributes,
      price: variantPrice
    };
    cartItem.variantName = selectedVariant.name;
    cartItem.displayPrice = finalPrice;
    // Override price for cart calculations
    cartItem.price = finalPrice.toString();
    cartItem.sale_price = null; // Clear sale price when variant has its own price
    // Use variant SKU if available
    if (selectedVariant.sku) {
      cartItem.variantSku = selectedVariant.sku;
    }
  }
  
  // Add to cart (addToCart handles merging with existing items)
  window.zappyAddToCart(cartItem);

  // Also add any checked upsell items (frequently bought together).
  // Each upsell uses its default variant (selected server-side) and is added as
  // its own cart line so prices, taxes and stock work like any normal product.
  addCheckedUpsellsToCart();
}

// Add every checked upsell on the product detail page as its own cart line,
// using the upsell's default variant (already resolved by the storefront API).
function addCheckedUpsellsToCart() {
  const product = window.currentProduct;
  if (!product || !Array.isArray(product.upsells) || product.upsells.length === 0) return;

  const checkedBoxes = document.querySelectorAll('.upsell-checkbox:checked');
  if (!checkedBoxes || checkedBoxes.length === 0) return;

  const byId = {};
  product.upsells.forEach(function (u) { if (u && u.id) byId[u.id] = u; });

  checkedBoxes.forEach(function (cb) {
    const row = cb.closest('.upsell-row');
    if (!row) return;
    const upsellId = row.getAttribute('data-upsell-id');
    const upsell = byId[upsellId];
    if (!upsell) return;
    if (upsell.stock_status === 'out_of_stock') return;

    // Per-link price override (set by the merchant on the parent product).
    // null / undefined → fall back to variant/sale/base price.
    // 0 → free upsell line.
    const overrideRaw = upsell.price_override;
    const overridePrice = overrideRaw !== null && overrideRaw !== undefined && overrideRaw !== ''
      ? parseFloat(overrideRaw)
      : null;
    const hasOverride = overridePrice !== null && Number.isFinite(overridePrice) && overridePrice >= 0;

    const v = upsell.default_variant;
    const variantPrice = v && v.price !== null && v.price !== undefined && v.price !== ''
      ? parseFloat(v.price)
      : null;

    const upsellCartItem = {
      ...upsell,
      quantity: 1,
      quantityUnit: upsell.quantity_unit || 'piece',
      quantityStep: parseFloat(upsell.quantity_step) || 1,
      customUnitLabel: upsell.custom_unit_label || null
    };
    // Don't keep the upsells array on the cart line itself (it was joined for the PDP).
    delete upsellCartItem.upsells;
    delete upsellCartItem.default_variant;
    delete upsellCartItem.price_override;

    const fallbackPrice = variantPrice !== null
      ? variantPrice
      : (upsell.sale_price && parseFloat(upsell.sale_price) < parseFloat(upsell.price)
        ? parseFloat(upsell.sale_price)
        : parseFloat(upsell.price));
    const finalPrice = hasOverride ? overridePrice : fallbackPrice;

    if (v) {
      upsellCartItem.selectedVariant = {
        id: v.id,
        name: v.name,
        sku: v.sku,
        attributes: v.attributes || {},
        attributes_display: v.attributes_display || v.attributes || {},
        // Pin the variant's effective price so the cart/checkout line uses it
        // verbatim (matches the 'getCartItemUnitPrice' lookup order).
        price: hasOverride ? overridePrice : variantPrice
      };
      upsellCartItem.variantName = v.name;
      if (v.sku) upsellCartItem.variantSku = v.sku;
    }

    if (Number.isFinite(finalPrice)) {
      upsellCartItem.displayPrice = finalPrice;
      // Pin price/sale on the cart line when we have a definitive value (variant
      // or override) so subsequent reads from cart pricing helpers and order
      // creation see the same number the customer saw on the PDP.
      if (hasOverride || variantPrice !== null) {
        upsellCartItem.price = finalPrice.toString();
        upsellCartItem.sale_price = null;
      }
    }

    window.zappyAddToCart(upsellCartItem);
  });
}

// Recompute the bundle total label and the Add-to-Cart button text whenever
// upsell checkboxes, the main quantity, or the selected variant change.
function recomputeBundleTotal() {
  const amountEl = document.getElementById('upsells-total-amount');
  if (!amountEl) return;

  const product = window.currentProduct;
  if (!product) return;
  const t = window.productTranslations || {};
  const currency = t.currency || '$';

  let mainPrice = window.productBasePrice || 0;
  const sv = window.selectedVariant;
  if (sv && sv.price !== null && sv.price !== undefined && sv.price !== '') {
    const vp = parseFloat(sv.price);
    if (Number.isFinite(vp)) mainPrice = vp;
  }

  const qtyInput = document.getElementById('product-quantity');
  const qty = qtyInput ? (parseFloat(qtyInput.value) || 1) : 1;

  let total = mainPrice * qty;
  let checkedCount = 0;
  const checkedBoxes = document.querySelectorAll('.upsell-checkbox:checked');
  checkedBoxes.forEach(function (cb) {
    const row = cb.closest('.upsell-row');
    if (!row) return;
    const p = parseFloat(row.getAttribute('data-upsell-price')) || 0;
    total += p;
    checkedCount += 1;
  });

  amountEl.textContent = currency + total.toFixed(2);

  const btn = document.getElementById('add-to-cart-btn');
  if (btn) {
    const baseLabel = (typeof getEcomText === 'function')
      ? getEcomText('addToCart', t.addToCart || 'Add to Cart')
      : (t.addToCart || 'Add to Cart');
    if (checkedCount > 0) {
      const totalCount = checkedCount + 1;
      let bundleLabel = (typeof getEcomText === 'function')
        ? getEcomText('addBundleToCart', t.addBundleToCart || ('Add ' + totalCount + ' items to cart'))
        : (t.addBundleToCart || ('Add ' + totalCount + ' items to cart'));
      bundleLabel = String(bundleLabel).replace(/\{count\}/g, String(totalCount));
      btn.textContent = bundleLabel;
    } else {
      btn.textContent = baseLabel;
    }
  }
}
window.recomputeBundleTotal = recomputeBundleTotal;

// Toggle the upsell row's checkbox when the user clicks anywhere on the row
// EXCEPT the embedded product link (which stops propagation so it can
// navigate). The native <input> click also stops propagation so we don't
// double-toggle. Out-of-stock rows have no onclick wired up at all.
function toggleUpsellRow(event, row) {
  if (!row || row.classList.contains('is-out-of-stock')) return;
  const cb = row.querySelector('.upsell-checkbox');
  if (!cb || cb.disabled) return;
  cb.checked = !cb.checked;
  if (typeof window.recomputeBundleTotal === 'function') {
    window.recomputeBundleTotal();
  }
}
window.toggleUpsellRow = toggleUpsellRow;

// Keyboard activation for the upsell row (role="button"). Space/Enter
// toggle the selection just like a click. Lives in a named function so
// the inline onkeydown attribute can stay quote-free — this whole script
// body is emitted from a JS template literal, so nested single quotes in
// inline handlers would otherwise break the surrounding JS string.
function handleUpsellRowKey(event, row) {
  if (!event) return;
  if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
    event.preventDefault();
    toggleUpsellRow(event, row);
  }
}
window.handleUpsellRowKey = handleUpsellRowKey;

async function loadRelatedProducts(currentProduct, t) {
  const section = document.getElementById('related-products-section');
  const grid = document.getElementById('related-products-grid');
  if (!section || !grid) return;
  
  const websiteId = window.ZAPPY_WEBSITE_ID;
  try {
    // Fetch products from same category or random products, with language support
    let url = buildApiUrlWithLang('/api/ecommerce/storefront/products?websiteId=' + websiteId + '&limit=4');
    if (currentProduct.category_id) {
      url += '&categoryId=' + currentProduct.category_id;
    }
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.success || !data.data?.length) return;
    
    // Filter out current product and limit to 4
    const related = data.data.filter(p => p.id !== currentProduct.id).slice(0, 4);
    if (related.length === 0) return;
    
    renderProductGrid(grid, related, t);
    section.style.display = 'block';
  } catch (e) {
    console.error('Failed to load related products', e);
  }
}
/* ==ZAPPY E-COMMERCE JS END== */

/* Cookie Consent */

// Helper function to check cookie consent
function hasConsentFor(category) {
  if (typeof window.CookieConsent === 'undefined') {
    return false; // Default to no consent if cookie consent not loaded
  }
  
  return window.CookieConsent.validConsent(category);
}

// Helper function to execute code only with consent
function withConsent(category, callback) {
  if (hasConsentFor(category)) {
    callback();
  } else {
    console.log(`[WARNING] Skipping ${category} code - no user consent`);
  }
}

// Cookie Consent Initialization

(function() {
  'use strict';
  
  let initAttempts = 0;
  const maxAttempts = 50; // 5 seconds max wait
  
  // Wait for DOM and vanilla-cookieconsent to be ready
  function initCookieConsent() {
    initAttempts++;
    
    
    if (typeof window.CookieConsent === 'undefined') {
      if (initAttempts < maxAttempts) {
        setTimeout(initCookieConsent, 100);
      } else {
      }
      return;
    }

    const cc = window.CookieConsent;
    
    
    // Initialize cookie consent
    try {
      cc.run({
  "autoShow": true,
  "mode": "opt-in",
  "revision": 0,
  "categories": {
    "necessary": {
      "enabled": true,
      "readOnly": true
    },
    "analytics": {
      "enabled": false,
      "readOnly": false,
      "autoClear": {
        "cookies": [
          {
            "name": "_ga"
          },
          {
            "name": "_ga_*"
          },
          {
            "name": "_gid"
          },
          {
            "name": "_gat"
          }
        ]
      }
    },
    "marketing": {
      "enabled": false,
      "readOnly": false,
      "autoClear": {
        "cookies": [
          {
            "name": "_fbp"
          },
          {
            "name": "_fbc"
          },
          {
            "name": "fr"
          }
        ]
      }
    }
  },
  "language": {
    "default": "en",
    "translations": {
      "en": {
        "consentModal": {
          "title": "We use cookies 🍪",
          "description": "Cortisol Wear uses cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. You can manage your preferences anytime.",
          "acceptAllBtn": "Accept All",
          "acceptNecessaryBtn": "Accept Necessary",
          "showPreferencesBtn": "Manage Preferences",
          "footer": "<a href=\"#privacy-policy\">Privacy Policy</a> | <a href=\"#terms-conditions\">Terms & Conditions</a>"
        },
        "preferencesModal": {
          "title": "Cookie Preferences",
          "acceptAllBtn": "Accept All",
          "acceptNecessaryBtn": "Accept Necessary",
          "savePreferencesBtn": "Save Preferences",
          "closeIconLabel": "Close",
          "sections": [
            {
              "title": "Essential Cookies",
              "description": "These cookies are necessary for the website to function and cannot be disabled.",
              "linkedCategory": "necessary"
            },
            {
              "title": "Analytics Cookies",
              "description": "These cookies help us understand how visitors interact with our website.",
              "linkedCategory": "analytics"
            },
            {
              "title": "Marketing Cookies",
              "description": "These cookies are used to deliver personalized advertisements.",
              "linkedCategory": "marketing"
            }
          ]
        }
      }
    }
  },
  "guiOptions": {
    "consentModal": {
      "layout": "box",
      "position": "bottom right",
      "equalWeightButtons": true,
      "flipButtons": false
    },
    "preferencesModal": {
      "layout": "box",
      "equalWeightButtons": true,
      "flipButtons": false
    }
  }
});
      
      // Google Consent Mode v2 integration
      // Update consent state based on accepted cookie categories
      function updateGoogleConsentMode() {
        if (typeof gtag !== 'function') {
          // Define gtag if not already defined (needed for consent updates)
          window.dataLayer = window.dataLayer || [];
          window.gtag = function(){dataLayer.push(arguments);};
        }
        
        var analyticsAccepted = cc.acceptedCategory('analytics');
        var marketingAccepted = cc.acceptedCategory('marketing');
        
        gtag('consent', 'update', {
          'analytics_storage': analyticsAccepted ? 'granted' : 'denied',
          'ad_storage': marketingAccepted ? 'granted' : 'denied',
          'ad_user_data': marketingAccepted ? 'granted' : 'denied',
          'ad_personalization': marketingAccepted ? 'granted' : 'denied'
        });
      }
      
      // Update consent on initial load (if user previously accepted)
      updateGoogleConsentMode();
      
      // Handle consent changes via onChange callback
      if (typeof cc.onChange === 'function') {
        cc.onChange(function(cookie, changed_preferences) {
          updateGoogleConsentMode();
        });
      }

      // Note: Cookie Preferences button removed per marketing guidelines
      // Footer should be clean and minimal - users can manage cookies via banner
    } catch (error) {
    }
  }

  // Initialize when DOM is ready - multiple approaches for reliability
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieConsent);
    // Backup timeout in case DOMContentLoaded doesn't fire
    setTimeout(initCookieConsent, 1000);
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initCookieConsent();
  } else {
    // Fallback - try after a short delay
    setTimeout(initCookieConsent, 500);
  }
  
  // Additional fallback - try after page load
  if (typeof window !== 'undefined') {
    if (window.addEventListener) {
      window.addEventListener('load', initCookieConsent, { once: true });
    }
  }
})();

/* Accessibility Features */

/* Mickidum Accessibility Toolbar Initialization - Zappy Style */

window.onload = function() {
    
    try {
        window.micAccessTool = new MicAccessTool({
            buttonPosition: 'left', // Position on left side
            forceLang: 'en-US', // Force language
            icon: {
                position: {
                    bottom: { size: 50, units: 'px' },
                    left: { size: 20, units: 'px' },
                    type: 'fixed'
                },
                backgroundColor: 'transparent', // Transparent to allow CSS styling
                color: 'transparent', // Let CSS handle coloring
                img: 'accessible',
                circular: false // Square button for consistent styling
            },
            menu: {
                dimensions: {
                    width: { size: 300, units: 'px' },
                    height: { size: 'auto', units: 'px' }
                }
            }
        });
        
    } catch (error) {
    }
    
    // Keyboard shortcut handler: ALT+A (Option+A on Mac) to toggle accessibility widget visibility (desktop only)
    document.addEventListener('keydown', function(event) {
        // Check if ALT+A is pressed (ALT on Windows/Linux, Option on Mac)
        var isAltOrOption = event.altKey;
        // Use event.code for reliable physical key detection (works regardless of Option key character output)
        var isAKey = event.code === 'KeyA' || event.keyCode === 65 || event.which === 65 || 
                      (event.key && (event.key.toLowerCase() === 'a' || event.key === 'å' || event.key === 'Å'));
        
        if (isAltOrOption && isAKey) {
            // Only work on desktop (screen width > 768px)
            if (window.innerWidth > 768) {
                event.preventDefault();
                event.stopPropagation();
                
                // Toggle visibility class on body
                var isVisible = document.body.classList.contains('accessibility-widget-visible');
                
                if (isVisible) {
                    // Hide the widget
                    document.body.classList.remove('accessibility-widget-visible');
                } else {
                    // Show the widget
                    document.body.classList.add('accessibility-widget-visible');
                    
                    // After a short delay, click the button to open the menu
                    setTimeout(function() {
                        var accessButton = document.getElementById('mic-access-tool-general-button');
                        if (accessButton) {
                            accessButton.click();
                        }
                    }, 200);
                }
            }
        }
    }, true);
};


// Zappy Contact Form API Integration (Fallback)
(function() {
    if (window.zappyContactFormLoaded) {
        console.log('📧 Zappy contact form already loaded');
        return;
    }
    window.zappyContactFormLoaded = true;

    function zappyNotify(message, type) {
        var existing = document.querySelectorAll('.zappy-notification');
        existing.forEach(function(el) { el.remove(); });
        var el = document.createElement('div');
        el.className = 'zappy-notification';
        var bg = type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1';
        var fg = type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460';
        var border = type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb';
        var icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        el.style.cssText = 'position:fixed;top:20px;right:20px;max-width:400px;padding:16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.4;animation:slideInRight .3s ease-out;background:' + bg + ';color:' + fg + ';border:1px solid ' + border;
        el.innerHTML = '<span style="margin-right:8px">' + icon + '</span>' + message + '<button onclick="this.parentElement.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;float:right;opacity:.7;padding:0 0 0 12px">&times;</button>';
        if (!document.getElementById('zappy-notify-anim')) {
            var s = document.createElement('style');
            s.id = 'zappy-notify-anim';
            s.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(el);
        setTimeout(function() { if (el.parentElement) el.remove(); }, type === 'error' ? 8000 : 5000);
    }

    function initContactFormIntegration() {
        console.log('📧 Zappy: Initializing contact form API integration...');

        // Exclude newsletter popup form (data-zappy-newsletter / #znl-form /
        // forms inside .znl-overlay) — they have their own submit handler that
        // posts to /api/newsletter/public/.../subscribe and must not be hijacked
        // by the contact-form integration.
        function isNewsletterPopupForm(f) {
            if (!f) return false;
            if (f.hasAttribute && f.hasAttribute('data-zappy-newsletter')) return true;
            if (f.id === 'znl-form' || (f.classList && f.classList.contains('znl-form'))) return true;
            if (f.closest && f.closest('.znl-overlay, [data-zappy-newsletter]')) return true;
            return false;
        }
        function pickContactForm() {
            var candidates = [
                document.querySelector('.contact-form'),
                document.querySelector('form[action*="contact"]'),
                document.querySelector('form#contact'),
                document.querySelector('form#contactForm'),
                document.getElementById('contactForm'),
                document.querySelector('section.contact form'),
                document.querySelector('section#contact form')
            ];
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i] && !isNewsletterPopupForm(candidates[i])) return candidates[i];
            }
            // Last-resort fallback: first <form> that isn't a newsletter popup form.
            var all = document.querySelectorAll('form');
            for (var j = 0; j < all.length; j++) {
                if (!isNewsletterPopupForm(all[j])) return all[j];
            }
            return null;
        }
        var contactForm = pickContactForm();

        if (!contactForm) {
            console.log('⚠️ Zappy: No contact form found on page');
            return;
        }
        
        console.log('✅ Zappy: Contact form found:', contactForm.className || contactForm.id || 'unnamed form');

    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate privacy consent checkbox if present (required for GDPR)
        var privacyCheckbox = this.querySelector('.privacy-consent-checkbox');
        if (privacyCheckbox && !privacyCheckbox.checked) {
            zappyNotify('Please accept the Terms & Conditions and Privacy Policy to continue', 'error');
            privacyCheckbox.focus();
            return;
        }

        // Collect form data with multi-value support (checkboxes, multi-selects)
        var formData = new FormData(this);
        var data = {};
        for (var pair of formData.entries()) {
            if (data[pair[0]] !== undefined) {
                if (Array.isArray(data[pair[0]])) data[pair[0]].push(pair[1]);
                else data[pair[0]] = [data[pair[0]], pair[1]];
            } else {
                data[pair[0]] = pair[1];
            }
        }

        // Smart field mapping
        var _coreNameFields = ['name','firstName','first_name','fname','lastName','last_name','lname'];
        var _coreEmailFields = ['email','emailAddress','mail','e-mail'];
        var _corePhoneFields = ['phone','tel','telephone','mobile','cellphone'];
        var _coreMsgFields = ['message','msg','comments','comment','description','details','notes','body','text','inquiry'];
        var _coreSubjectFields = ['subject','topic','regarding','re'];
        var _allCoreFields = [].concat(_coreNameFields, _coreEmailFields, _corePhoneFields, _coreMsgFields, _coreSubjectFields);

        var resolvedName = (data.name || '').trim()
            || [data.firstName || data.first_name || data.fname || '', data.lastName || data.last_name || data.lname || ''].filter(Boolean).join(' ').trim()
            || (data.email || data.emailAddress || data.mail || '').trim()
            || 'Anonymous';
        var resolvedEmail = (data.email || data.emailAddress || data.mail || data['e-mail'] || '').trim();
        var resolvedPhone = data.phone || data.tel || data.telephone || data.mobile || data.cellphone || null;
        var resolvedSubject = data.subject || data.topic || data.regarding || data.re || 'Contact Form Submission';
        var resolvedMessage = (data.message || data.msg || data.comments || data.comment || data.description || data.details || data.body || data.text || data.inquiry || '').trim();
        if (!resolvedMessage) {
            var extraEntries = Object.entries(data).filter(function(e) { return _allCoreFields.indexOf(e[0]) === -1; });
            if (extraEntries.length > 0) {
                resolvedMessage = extraEntries.map(function(e) {
                    var label = e[0].replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
                    var val = Array.isArray(e[1]) ? e[1].join(', ') : e[1];
                    return label + ': ' + val;
                }).join('\n');
            } else {
                resolvedMessage = 'Form submission from ' + window.location.pathname;
            }
        }

        var extraFields = {};
        for (var k of Object.keys(data)) {
            if (_allCoreFields.indexOf(k) === -1 && data[k] !== '' && data[k] !== null && data[k] !== undefined) {
                extraFields[k] = data[k];
            }
        }

        // Loading state
        var submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
        var originalText = submitBtn ? (submitBtn.value || submitBtn.textContent) : '';
        if (submitBtn) {
            if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Sending...';
            else submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        }

        var currentPagePath = window.location.pathname;
        if (window.ZAPPY_CONFIG && window.ZAPPY_CONFIG.currentPagePath) {
            currentPagePath = window.ZAPPY_CONFIG.currentPagePath;
        } else {
            try {
                var p = new URLSearchParams(window.location.search).get('page');
                if (p) currentPagePath = p;
            } catch (ignored) {}
        }

        var theForm = this;
        try {
            console.log('📧 Zappy: Sending contact form to backend API...');
            var apiBase = (window.ZAPPY_API_BASE || 'https://api.zappy5.com').replace(/\/$/, '');
            var payload = {
                websiteId: 'fcc949ef-8dcd-4311-b76c-3bc705835599',
                name: resolvedName,
                email: resolvedEmail,
                subject: resolvedSubject,
                message: resolvedMessage,
                phone: resolvedPhone,
                currentPagePath: currentPagePath
            };
            if (Object.keys(extraFields).length > 0) {
                payload.extraFields = extraFields;
            }
            var response = await fetch(apiBase + '/api/email/contact-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var result = await response.json();
            
            if (result.success) {
                console.log('✅ Zappy: Contact form data sent successfully to backend');

                // Thank-you page redirect
                if (result.thankYouPagePath && result.ticketNumber) {
                    var ticketParam = 'ticket=' + encodeURIComponent(result.ticketNumber);
                    var isPreview = window.location.pathname.indexOf('/preview') !== -1;
                    var thankYouUrl;
                    if (isPreview && window.ZAPPY_CONFIG) {
                        var wid = window.ZAPPY_CONFIG.websiteId || 'fcc949ef-8dcd-4311-b76c-3bc705835599';
                        var pt = window.location.pathname.indexOf('fullscreen') !== -1 ? 'preview-fullscreen' : 'preview';
                        thankYouUrl = window.location.origin + '/api/website/' + pt + '/' + wid + '?page=' + encodeURIComponent(result.thankYouPagePath) + '&' + ticketParam;
                        if (window.ZAPPY_CONFIG.authToken) thankYouUrl += '&auth_token=' + encodeURIComponent(window.ZAPPY_CONFIG.authToken);
                    } else {
                        thankYouUrl = result.thankYouPagePath + '?' + ticketParam;
                    }
                    window.location.href = thankYouUrl;
                    return;
                }

                var _siteLang = document.documentElement.lang || '';
                var _isHeSite = _siteLang === 'he' || (_siteLang !== 'ar' && document.documentElement.dir === 'rtl');
                var _isArSite = _siteLang === 'ar';
                var _successFallback = _isHeSite ? 'ההודעה שלך נשלחה בהצלחה! נחזור אליך בהקדם.' : _isArSite ? 'تم إرسال رسالتك بنجاح! سنرد عليك قريبًا.' : 'Thank you for your message! We\'ll get back to you soon.';
                zappyNotify(result.message || _successFallback, 'success');
                theForm.reset();
            } else {
                console.log('⚠️ Zappy: Backend returned error:', result.error);
                var _isHeSiteErr = _siteLang === 'he' || (_siteLang !== 'ar' && document.documentElement.dir === 'rtl');
                var _isArSiteErr = _siteLang === 'ar';
                var _errFallback = _isHeSiteErr ? 'שליחת ההודעה נכשלה. אנא נסו שוב.' : _isArSiteErr ? 'فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى.' : 'Failed to send message. Please try again.';
                zappyNotify(result.error || _errFallback, 'error');
            }
        } catch (error) {
            console.error('❌ Zappy: Failed to send to backend API:', error);
            var _isHeSiteNet = _siteLang === 'he' || (_siteLang !== 'ar' && document.documentElement.dir === 'rtl');
            var _isArSiteNet = _siteLang === 'ar';
            var _netFallback = _isHeSiteNet ? 'לא ניתן לשלוח הודעה כרגע. אנא נסו שוב מאוחר יותר.' : _isArSiteNet ? 'لا يمكن إرسال الرسالة الآن. يرجى المحاولة مرة أخرى لاحقًا.' : 'Unable to send message right now. Please try again later.';
            zappyNotify(_netFallback, 'error');
        } finally {
            if (submitBtn) {
                if (submitBtn.tagName === 'INPUT') submitBtn.value = originalText;
                else submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
        }, true);

        console.log('✅ Zappy: Contact form API integration initialized');
    } // End of initContactFormIntegration
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContactFormIntegration);
    } else {
        initContactFormIntegration();
    }
})();


/* ZAPPY_PUBLISHED_LIGHTBOX_RUNTIME */
(function(){
  try {
    if (window.__zappyPublishedLightboxInit) return;
    window.__zappyPublishedLightboxInit = true;

    function safeText(s){ try { return String(s || '').replace(/"/g,'&quot;'); } catch(e){ return ''; } }

    function ensureOverlayForToggle(toggle){
      try {
        if (!toggle || !toggle.id) return;
        if (toggle.id.indexOf('zappy-lightbox-toggle-') !== 0) return;
        var elementId = toggle.id.replace('zappy-lightbox-toggle-','');
        var label = document.querySelector('label.zappy-lightbox-trigger[for="' + toggle.id + '"]');
        if (!label) return;

        // If toggle is inside the label (corrupted), move it before the label so the for attribute works consistently.
        try {
          if (label.contains(toggle) && label.parentNode) {
            label.parentNode.insertBefore(toggle, label);
          }
        } catch (e0) {}

        var lightboxId = 'zappy-lightbox-' + elementId;
        var lb = document.getElementById(lightboxId);
        if (lb && lb.parentNode !== document.body) {
          try { document.body.appendChild(lb); } catch (eMove) {}
        }

        if (!lb) {
          var img = null;
          try { img = label.querySelector('img'); } catch (eImg0) {}
          if (!img) {
            try { img = document.querySelector('img[data-element-id="' + elementId + '"]'); } catch (eImg1) {}
          }
          if (!img) return;

          lb = document.createElement('div');
          lb.id = lightboxId;
          lb.className = 'zappy-lightbox';
          lb.setAttribute('data-zappy-image-lightbox','true');
          lb.style.display = 'none';
          lb.innerHTML =
            '<label class="zappy-lightbox-backdrop" for="' + toggle.id + '" aria-label="Close"></label>' +
            '<div class="zappy-lightbox-content">' +
              '<label class="zappy-lightbox-close" for="' + toggle.id + '" aria-label="Close">×</label>' +
              '<img class="zappy-lightbox-image" src="' + safeText(img.currentSrc || img.src || img.getAttribute('src')) + '" alt="' + safeText(img.getAttribute('alt') || 'Image') + '">' +
            '</div>';
          document.body.appendChild(lb);
        }

        // Keep overlay image in sync at open time (in case src changed / responsive currentSrc)
        function syncOverlayImage(){
          try {
            var imgCur = label.querySelector('img');
            var imgLb = lb.querySelector('img');
            if (imgCur && imgLb) {
              imgLb.src = imgCur.currentSrc || imgCur.src || imgLb.src;
              imgLb.alt = imgCur.alt || imgLb.alt;
            }
          } catch (eSync) {}
        }

        if (!toggle.__zappyLbBound) {
          toggle.addEventListener('change', function(){
            if (toggle.checked) syncOverlayImage();
            lb.style.display = toggle.checked ? 'flex' : 'none';
          });
          toggle.__zappyLbBound = true;
        }

        if (!lb.__zappyLbBound) {
          lb.addEventListener('click', function(ev){
            try {
              var t = ev.target;
              if (!t) return;
              if (t.classList && (t.classList.contains('zappy-lightbox-backdrop') || t.classList.contains('zappy-lightbox-close'))) {
                ev.preventDefault();
                toggle.checked = false;
                lb.style.display = 'none';
              }
            } catch (e2) {}
          });
          lb.__zappyLbBound = true;
        }

        if (!label.__zappyLbClick) {
          label.addEventListener('click', function(ev){
            try {
              if (document.body && document.body.classList && document.body.classList.contains('zappy-edit-mode')) return;
              if (ev && ev.target && ev.target.closest && ev.target.closest('a[href],button,input,select,textarea')) return;
              ev.preventDefault();
              ev.stopPropagation();
              toggle.checked = true;
              syncOverlayImage();
              lb.style.display = 'flex';
            } catch (e3) {}
          }, true);
          label.__zappyLbClick = true;
        }
      } catch (e) {}
    }

    function ensureLightboxCss(){
      try {
        var head = document.head || document.querySelector('head');
        if (!head || head.querySelector('style[data-zappy-image-lightbox="true"]')) return;
        var s = document.createElement('style');
        s.setAttribute('data-zappy-image-lightbox','true');
        s.textContent =
          '.zappy-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;z-index:9999;padding:24px;}'+
          '.zappy-lightbox-content{position:relative;max-width:min(1100px,92vw);max-height:92vh;}'+
          '.zappy-lightbox-content img{max-width:92vw;max-height:92vh;display:block;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.45);}'+
          '.zappy-lightbox-close{position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:999px;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;}'+
          '.zappy-lightbox-backdrop{position:absolute;inset:0;display:block;cursor:pointer;}'+
          'input.zappy-lightbox-toggle{position:absolute;opacity:0;pointer-events:none;}'+
          'label.zappy-lightbox-trigger{display:contents;}'+
          'label.zappy-lightbox-trigger{cursor:zoom-in;}'+
          'label.zappy-lightbox-trigger [data-zappy-zoom-wrapper="true"],'+
          'label.zappy-lightbox-trigger img{cursor:zoom-in !important;}'+
          'input.zappy-lightbox-toggle:checked + label.zappy-lightbox-trigger + .zappy-lightbox{display:flex;}';
        head.appendChild(s);
      } catch(e){}
    }

    function initZappyPublishedLightboxes(){
      try {
        ensureLightboxCss();
        // Repair orphaned labels (label has for=toggleId but input is missing)
        var orphanLabels = document.querySelectorAll('label.zappy-lightbox-trigger[for^="zappy-lightbox-toggle-"]');
        for (var i=0;i<orphanLabels.length;i++){
          var lbl = orphanLabels[i];
          var forId = lbl && lbl.getAttribute ? lbl.getAttribute('for') : null;
          if (!forId) continue;
          if (!document.getElementById(forId)) {
            var t = document.createElement('input');
            t.type = 'checkbox';
            t.id = forId;
            t.className = 'zappy-lightbox-toggle';
            t.setAttribute('data-zappy-image-lightbox','true');
            if (lbl.parentNode) lbl.parentNode.insertBefore(t, lbl);
          }
        }

        var toggles = document.querySelectorAll('input.zappy-lightbox-toggle[id^="zappy-lightbox-toggle-"]');
        for (var j=0;j<toggles.length;j++){
          ensureOverlayForToggle(toggles[j]);
        }

        // Close on ESC if any lightbox is open
        if (!document.__zappyLbEscBound) {
          document.addEventListener('keydown', function(ev){
            try {
              if (!ev || ev.key !== 'Escape') return;
              var openLb = document.querySelector('.zappy-lightbox[style*="display: flex"]');
              if (openLb) {
                var openToggle = null;
                try {
                  var id = openLb.id || '';
                  if (id.indexOf('zappy-lightbox-') === 0) {
                    openToggle = document.getElementById('zappy-lightbox-toggle-' + id.replace('zappy-lightbox-',''));
                  }
                } catch (e4) {}
                if (openToggle) openToggle.checked = false;
                openLb.style.display = 'none';
              }
            } catch (e5) {}
          });
          document.__zappyLbEscBound = true;
        }
      } catch (eInit) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initZappyPublishedLightboxes, { once: true });
    } else {
      initZappyPublishedLightboxes();
    }
  } catch (eOuter) {}
})();
/* END ZAPPY_PUBLISHED_LIGHTBOX_RUNTIME */


/* ZAPPY_PUBLISHED_ZOOM_WRAPPER_RUNTIME */
(function(){
  try {
    if (window.__zappyPublishedZoomInit) return;
    window.__zappyPublishedZoomInit = true;

    function isHeroBgWrapper(wrapper) {
      var img = wrapper.querySelector('img');
      if (img && (img.getAttribute('data-hero-bg') === 'true' || img.getAttribute('data-hero-background') === 'true')) return true;
      var pos = (wrapper.style.position || '').replace(/\s*!important\s*/g, '').trim();
      var w = (wrapper.style.width || '').replace(/\s*!important\s*/g, '').trim();
      var h = (wrapper.style.height || '').replace(/\s*!important\s*/g, '').trim();
      if (pos === 'absolute' && w === '100%' && h === '100%') return true;
      return false;
    }

    // SYNC: These helpers must match sharedZoomCropMath.js
    function parseObjPos(op) {
      var x = 50, y = 50;
      try {
        if (typeof op === 'string') {
          var m = op.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
          if (m) { x = parseFloat(m[1]); y = parseFloat(m[2]); }
        }
      } catch (e) {}
      if (!isFinite(x)) x = 50; if (!isFinite(y)) y = 50;
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }

    function coverPercents(imgA, contA) {
      if (!isFinite(imgA) || imgA <= 0 || !isFinite(contA) || contA <= 0)
        return { w: 100, h: 100 };
      if (imgA >= contA) return { w: (imgA / contA) * 100, h: 100 };
      return { w: 100, h: (contA / imgA) * 100 };
    }

    function applyZoom(wrapper, img) {
      var zoom = parseFloat(img.getAttribute('data-zappy-zoom')) || 1;
      if (!(zoom > 0)) zoom = 1;

      var widthMode = wrapper.getAttribute('data-zappy-zoom-wrapper-width-mode');
      if (widthMode === 'full') return;
      if (isHeroBgWrapper(wrapper)) return;

      var isMobile = window.innerWidth <= 768;
      if (isMobile) {
        var mSrc = img.getAttribute('data-zappy-mobile-src');
        var mPos = img.getAttribute('data-zappy-mobile-object-position');
        var mZoomStr = img.getAttribute('data-zappy-mobile-zoom');
        var mZoom = parseFloat(mZoomStr);
        if (mSrc) img.src = mSrc;

        wrapper.style.setProperty('width', '100%', 'important');
        wrapper.style.setProperty('max-width', '100%', 'important');
        wrapper.style.setProperty('overflow', 'hidden', 'important');
        wrapper.style.setProperty('position', 'relative', 'important');

        var _sW = parseFloat(wrapper.getAttribute('data-zappy-zoom-wrapper-width')) || 0;
        var _sH = parseFloat(wrapper.getAttribute('data-zappy-zoom-wrapper-height')) || 0;
        if (_sW > 0 && _sH > 0) {
          wrapper.style.setProperty('padding-bottom', '0', 'important');
          wrapper.style.setProperty('aspect-ratio', _sW + '/' + _sH, 'important');
          wrapper.style.setProperty('height', 'auto', 'important');
        }

        function applyMobileZoomCrop(_img, _wrapper, _effPos, _effZoom) {
          var rect = _wrapper.getBoundingClientRect();
          if (!rect || !rect.width || !rect.height) return;
          var nW = _img.naturalWidth || 0, nH = _img.naturalHeight || 0;
          if (!(nW > 0 && nH > 0)) return;
          var imgA = nW / nH;
          var contA = rect.width / rect.height;
          var cover = coverPercents(imgA, contA);
          var wP = 100, hP = 100;
          if (_effZoom >= 1) { wP = cover.w * _effZoom; hP = cover.h * _effZoom; }
          else { var t2 = (_effZoom - 0.5) / 0.5; if (!isFinite(t2)) t2 = 0; t2 = Math.max(0, Math.min(1, t2)); wP = 100 + t2 * (cover.w - 100); hP = 100 + t2 * (cover.h - 100); }
          var p2 = parseObjPos(_effPos);
          var lP = (100 - wP) * (p2.x / 100);
          var tP = (100 - hP) * (p2.y / 100);
          _img.style.setProperty('position', 'absolute', 'important');
          _img.style.setProperty('left', lP + '%', 'important');
          _img.style.setProperty('top', tP + '%', 'important');
          _img.style.setProperty('width', wP + '%', 'important');
          _img.style.setProperty('height', hP + '%', 'important');
          _img.style.setProperty('max-width', 'none', 'important');
          _img.style.setProperty('max-height', 'none', 'important');
          _img.style.setProperty('display', 'block', 'important');
          _img.style.setProperty('object-fit', _effZoom < 1 ? 'fill' : 'cover', 'important');
          _img.style.setProperty('margin', '0', 'important');
        }

        var effZoom = (isFinite(mZoom) && mZoom > 0) ? mZoom : zoom;
        var effPos = mPos || img.getAttribute('data-zappy-object-position') || img.style.objectPosition || '50% 50%';
        if (_sW > 0 && _sH > 0) {
          applyMobileZoomCrop(img, wrapper, effPos, effZoom);
          if (!(img.complete && img.naturalWidth > 0)) {
            img.addEventListener('load', function _onLoad() {
              img.removeEventListener('load', _onLoad);
              try { applyMobileZoomCrop(img, wrapper, effPos, effZoom); } catch(e) {}
            });
          }
        } else {
          img.style.setProperty('position', 'relative', 'important');
          img.style.setProperty('width', '100%', 'important');
          img.style.setProperty('height', 'auto', 'important');
          img.style.setProperty('max-width', '100%', 'important');
          img.style.setProperty('display', 'block', 'important');
          img.style.setProperty('object-fit', 'cover', 'important');
          img.style.removeProperty('left');
          img.style.removeProperty('top');
          img.style.setProperty('margin', '0', 'important');
        }
        return;
      }

      // Desktop zoom === 1: image fills the wrapper exactly — no crop math
      // needed. Always set 100%/100% to override any stale inline styles
      // that may have been baked in with incorrect values.
      if (zoom === 1) {
        wrapper.style.setProperty('overflow', 'hidden', 'important');
        wrapper.style.setProperty('position', 'relative', 'important');
        img.style.setProperty('position', 'absolute', 'important');
        img.style.setProperty('width', '100%', 'important');
        img.style.setProperty('height', '100%', 'important');
        img.style.setProperty('left', '0%', 'important');
        img.style.setProperty('top', '0%', 'important');
        img.style.setProperty('max-width', 'none', 'important');
        img.style.setProperty('max-height', 'none', 'important');
        img.style.setProperty('object-fit', 'cover', 'important');
        img.style.setProperty('display', 'block', 'important');
        img.style.setProperty('margin', '0', 'important');
        return;
      }

      // Desktop zoom > 1: if the image already has zoom styles saved from
      // the editor (position:absolute + percentage-based width), trust
      // them.  Sites published before the zoom-out fix had wrong values
      // baked in for zoom < 1 (used cover*zoom instead of the
      // interpolation formula), so those must always be recalculated.
      var existingPos = (img.style.position || '').replace(/s*!importants*/g, '').trim();
      var existingW = (img.style.width || '').replace(/s*!importants*/g, '').trim();
      if (existingPos === 'absolute' && existingW.indexOf('%') !== -1 && zoom > 1) {
        wrapper.style.setProperty('overflow', 'hidden', 'important');
        wrapper.style.setProperty('position', 'relative', 'important');
        return;
      }

      // Image lacks saved zoom styles — calculate from scratch
      var rect = wrapper.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return;

      var nW = img.naturalWidth || 0, nH = img.naturalHeight || 0;
      if (!(nW > 0 && nH > 0)) return;

      var imgA = nW / nH;
      var contA = rect.width / rect.height;
      var cover = coverPercents(imgA, contA);

      var wPct = 100, hPct = 100;
      if (zoom >= 1) {
        wPct = cover.w * zoom;
        hPct = cover.h * zoom;
      } else {
        var t = (zoom - 0.5) / 0.5;
        if (!isFinite(t)) t = 0;
        t = Math.max(0, Math.min(1, t));
        wPct = 100 + t * (cover.w - 100);
        hPct = 100 + t * (cover.h - 100);
      }

      var op = img.getAttribute('data-zappy-object-position') || img.style.objectPosition || window.getComputedStyle(img).objectPosition || '50% 50%';
      var pos = parseObjPos(op);
      var leftPct = (100 - wPct) * (pos.x / 100);
      var topPct = (100 - hPct) * (pos.y / 100);

      img.style.setProperty('position', 'absolute', 'important');
      img.style.setProperty('left', leftPct + '%', 'important');
      img.style.setProperty('top', topPct + '%', 'important');
      img.style.setProperty('width', wPct + '%', 'important');
      img.style.setProperty('height', hPct + '%', 'important');
      img.style.setProperty('max-width', 'none', 'important');
      img.style.setProperty('max-height', 'none', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('object-fit', zoom < 1 ? 'fill' : 'cover', 'important');
      img.style.setProperty('margin', '0', 'important');
    }

    function fixOrphanedZoomImages() {
      if (window.innerWidth > 768) return;
      var zoomImgs = document.querySelectorAll('img[data-zappy-zoom]');
      for (var j = 0; j < zoomImgs.length; j++) {
        var img = zoomImgs[j];
        if (img.closest && img.closest('[data-zappy-zoom-wrapper="true"]')) continue;
        img.style.setProperty('position', 'relative', 'important');
        img.style.setProperty('width', '100%', 'important');
        img.style.setProperty('height', 'auto', 'important');
        img.style.setProperty('max-width', '100%', 'important');
        img.style.setProperty('max-height', '300px', 'important');
        img.style.setProperty('object-fit', 'cover', 'important');
        img.style.removeProperty('left');
        img.style.removeProperty('top');
      }
    }

    function restoreWrapperDimensions(wrapper) {
      var widthMode = wrapper.getAttribute('data-zappy-zoom-wrapper-width-mode') || 'px';
      if (widthMode === 'full' || widthMode === 'grid-responsive') return;
      if (isHeroBgWrapper(wrapper)) return;

      var storedW = wrapper.getAttribute('data-zappy-zoom-wrapper-width');
      var storedH = wrapper.getAttribute('data-zappy-zoom-wrapper-height');
      if (!storedW && !storedH) return;

      if (widthMode === 'px' && storedW) {
        var curW = (wrapper.style.width || '').replace(/s*!importants*/g, '').trim();
        var storedWNorm = storedW.replace(/s*!importants*/g, '').trim();
        if (!curW || curW === '100%' || curW.indexOf('%') !== -1 || curW !== storedWNorm) {
          wrapper.style.setProperty('width', storedW, 'important');
          wrapper.style.setProperty('max-width', '100%', 'important');
        }
      }
      if (storedH) {
        var curH = (wrapper.style.height || '').replace(/s*!importants*/g, '').trim();
        var storedHNorm = storedH.replace(/s*!importants*/g, '').trim();
        if (!curH || curH === 'auto' || curH === '100%' || curH.indexOf('%') !== -1 || curH !== storedHNorm) {
          wrapper.style.setProperty('height', storedH, 'important');
        }
      }
      wrapper.style.setProperty('overflow', 'hidden', 'important');
      wrapper.style.setProperty('position', 'relative', 'important');
    }

    function fixHeroBgWrapperStyles(wrapper) {
      if (!isHeroBgWrapper(wrapper)) return;
      wrapper.style.setProperty('position', 'absolute', 'important');
      wrapper.style.setProperty('top', '0', 'important');
      wrapper.style.setProperty('left', '0', 'important');
      wrapper.style.setProperty('width', '100%', 'important');
      wrapper.style.setProperty('height', '100%', 'important');
      wrapper.style.setProperty('max-width', 'none', 'important');
      wrapper.style.setProperty('overflow', 'hidden', 'important');
      wrapper.setAttribute('data-zappy-zoom-wrapper-width-mode', 'full');
      var img = wrapper.querySelector('img');
      if (img) {
        img.style.setProperty('width', '100%', 'important');
        img.style.setProperty('height', '100%', 'important');
        img.style.setProperty('object-fit', 'cover', 'important');
        img.style.setProperty('position', 'relative', 'important');
        img.style.setProperty('top', '0', 'important');
        img.style.setProperty('left', '0', 'important');
        img.style.setProperty('max-width', 'none', 'important');
        img.style.setProperty('max-height', 'none', 'important');
        img.style.setProperty('display', 'block', 'important');
        if (window.innerWidth <= 768) {
          var mSrc = img.getAttribute('data-zappy-mobile-src');
          var mPos = img.getAttribute('data-zappy-mobile-object-position');
          var mZoom = parseFloat(img.getAttribute('data-zappy-mobile-zoom'));
          if (mSrc) img.src = mSrc;
          if (mPos) img.style.setProperty('object-position', mPos, 'important');
          if (mZoom > 1) {
            img.style.setProperty('transform', 'scale(' + mZoom + ')', 'important');
            img.style.setProperty('transform-origin', mPos || '50% 50%', 'important');
          }
        }
      }
    }

    function initZoomWrappers() {
      var wrappers = document.querySelectorAll('[data-zappy-zoom-wrapper="true"]');
      for (var i = 0; i < wrappers.length; i++) {
        (function(wrapper) {
          var img = wrapper.querySelector('img');
          if (!img) return;
          if (wrapper.closest && wrapper.closest('.zappy-carousel-js-init, .zappy-carousel-active')) return;
          fixHeroBgWrapperStyles(wrapper);
          if (window.innerWidth > 768) restoreWrapperDimensions(wrapper);
          if (img.complete && img.naturalWidth > 0) {
            setTimeout(function() { applyZoom(wrapper, img); }, 0);
          } else {
            img.addEventListener('load', function onLoad() {
              img.removeEventListener('load', onLoad);
              applyZoom(wrapper, img);
            }, { once: true });
          }
        })(wrappers[i]);
      }
      fixOrphanedZoomImages();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initZoomWrappers, { once: true });
    } else {
      setTimeout(initZoomWrappers, 50);
    }
  } catch (eOuter) {}
})();
/* END ZAPPY_PUBLISHED_ZOOM_WRAPPER_RUNTIME */


/* ZAPPY_MOBILE_MENU_TOGGLE */
(function(){
  try {
    if (window.__zappyMobileMenuToggleInit) return;
    window.__zappyMobileMenuToggleInit = true;

    function initMobileToggle() {
      var toggle = document.querySelector('.mobile-toggle, #mobileToggle');
      var navMenu = document.querySelector('#navMenu, .nav-menu, .navbar-menu');
      if (!toggle || !navMenu) return;

      // Skip if this toggle already has a click handler from the site's own JS
      if (toggle.__zappyMobileToggleBound) return;
      toggle.__zappyMobileToggleBound = true;

      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var hamburgerIcon = toggle.querySelector('.hamburger-icon');
        var closeIcon = toggle.querySelector('.close-icon');
        var isOpen = navMenu.classList.contains('active') || navMenu.style.display === 'block';

        if (isOpen) {
          navMenu.classList.remove('active');
          navMenu.style.display = '';
          if (hamburgerIcon) hamburgerIcon.style.setProperty('display', 'block', 'important');
          if (closeIcon) closeIcon.style.setProperty('display', 'none', 'important');
          document.body.style.overflow = '';
        } else {
          navMenu.classList.add('active');
          navMenu.style.display = 'block';
          if (hamburgerIcon) hamburgerIcon.style.setProperty('display', 'none', 'important');
          if (closeIcon) closeIcon.style.setProperty('display', 'block', 'important');
          document.body.style.overflow = 'hidden';
        }
      }, true);

      // Close on clicking outside
      document.addEventListener('click', function(e) {
        if (!navMenu.classList.contains('active')) return;
        if (toggle.contains(e.target) || navMenu.contains(e.target)) return;
        navMenu.classList.remove('active');
        navMenu.style.display = '';
        var hi = toggle.querySelector('.hamburger-icon');
        var ci = toggle.querySelector('.close-icon');
        if (hi) hi.style.setProperty('display', 'block', 'important');
        if (ci) ci.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = '';
      });

      // Close on Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          navMenu.style.display = '';
          var hi = toggle.querySelector('.hamburger-icon');
          var ci = toggle.querySelector('.close-icon');
          if (hi) hi.style.setProperty('display', 'block', 'important');
          if (ci) ci.style.setProperty('display', 'none', 'important');
          document.body.style.overflow = '';
        }
      });

      // Close when clicking a nav link (navigating)
      navMenu.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          navMenu.classList.remove('active');
          navMenu.style.display = '';
          var hi = toggle.querySelector('.hamburger-icon');
          var ci = toggle.querySelector('.close-icon');
          if (hi) hi.style.setProperty('display', 'block', 'important');
          if (ci) ci.style.setProperty('display', 'none', 'important');
          document.body.style.overflow = '';
        });
      });
    }

    function initPhoneButton() {
      var phoneBtn = document.querySelector('.phone-header-btn');
      if (!phoneBtn || phoneBtn.__zappyPhoneBound) return;
      phoneBtn.__zappyPhoneBound = true;

      phoneBtn.addEventListener('click', function() {
        var phoneNumber = phoneBtn.getAttribute('data-phone') || null;

        if (!phoneNumber) {
          var telLinks = document.querySelectorAll('a[href^="tel:"]');
          if (telLinks.length > 0) {
            phoneNumber = telLinks[0].getAttribute('href').replace('tel:', '');
          }
        }

        if (!phoneNumber) {
          var allLinks = document.querySelectorAll('a[href]');
          for (var i = 0; i < allLinks.length; i++) {
            var h = allLinks[i].getAttribute('href') || '';
            var cleaned = h.replace(/[-\s()]/g, '');
            if (/^(\+?\d{9,15}|0\d{8,9})$/.test(cleaned)) {
              phoneNumber = cleaned;
              break;
            }
          }
        }

        if (phoneNumber && phoneNumber.indexOf('[') === -1) {
          window.location.href = 'tel:' + phoneNumber;
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { initMobileToggle(); initPhoneButton(); }, { once: true });
    } else {
      initMobileToggle();
      initPhoneButton();
    }
  } catch (e) {}
})();
/* END ZAPPY_MOBILE_MENU_TOGGLE */


/* ZAPPY_FAQ_ACCORDION_TOGGLE */
(function(){
  try {
    if (window.__zappyFaqToggleInit) return;
    window.__zappyFaqToggleInit = true;

    var answerSel = '[class*="faq-answer"], [class*="faq-content"], [class*="faq-body"], .accordion-content, .accordion-body';

    function initFaqToggle() {
      var items = document.querySelectorAll('[class*="faq-item"], .accordion-item');
      if (!items.length) return;

      items.forEach(function(item) {
        var question = item.querySelector(
          '[class*="faq-question"], [class*="faq-header"], .accordion-header, .accordion-toggle'
        );
        if (!question) return;
        if (question.__zappyFaqBound) return;
        question.__zappyFaqBound = true;
        question.style.cursor = 'pointer';

        question.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          var parent = item.parentElement;
          if (parent) {
            var siblings = parent.querySelectorAll('[class*="faq-item"], .accordion-item');
            siblings.forEach(function(sib) {
              if (sib !== item && sib.classList.contains('active')) {
                sib.classList.remove('active');
                var sibQ = sib.querySelector('[class*="faq-question"], [class*="faq-header"], .accordion-header');
                if (sibQ) sibQ.setAttribute('aria-expanded', 'false');
                var sibA = sib.querySelector(answerSel);
                if (sibA) {
                  sibA.style.maxHeight = '0';
                  sibA.style.overflow = 'hidden';
                  sibA.style.opacity = '0';
                  sibA.style.paddingTop = '0';
                  sibA.style.paddingBottom = '0';
                }
              }
            });
          }

          var isActive = item.classList.toggle('active');
          question.setAttribute('aria-expanded', isActive ? 'true' : 'false');

          var answer = item.querySelector(answerSel);
          if (answer) {
            answer.style.transition = 'max-height 0.35s ease, opacity 0.25s ease, padding 0.25s ease';
            if (isActive) {
              answer.style.display = '';
              answer.style.maxHeight = answer.scrollHeight + 'px';
              answer.style.overflow = 'hidden';
              answer.style.opacity = '1';
              answer.style.paddingTop = '';
              answer.style.paddingBottom = '';
            } else {
              answer.style.maxHeight = '0';
              answer.style.overflow = 'hidden';
              answer.style.opacity = '0';
              answer.style.paddingTop = '0';
              answer.style.paddingBottom = '0';
            }
          }

          var chevron = question.querySelector('[class*="chevron"], [class*="icon"], svg');
          if (chevron) {
            chevron.style.transform = isActive ? 'rotate(180deg)' : 'rotate(0deg)';
            chevron.style.transition = 'transform 0.3s ease';
          }
        });
      });

      items.forEach(function(item) {
        if (item.classList.contains('active')) return;
        var answer = item.querySelector(answerSel);
        if (answer) {
          answer.style.maxHeight = '0';
          answer.style.overflow = 'hidden';
          answer.style.opacity = '0';
          answer.style.paddingTop = '0';
          answer.style.paddingBottom = '0';
          answer.style.transition = 'max-height 0.35s ease, opacity 0.25s ease, padding 0.25s ease';
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFaqToggle, { once: true });
    } else {
      initFaqToggle();
    }
  } catch (e) {}
})();
/* END ZAPPY_FAQ_ACCORDION_TOGGLE */


/* ZAPPY_NAV_SCROLL_PADDING */
(function(){
  try {
    if (window.__zappyNavScrollPaddingInit) return;
    window.__zappyNavScrollPaddingInit = true;
    function updateScrollPadding() {
      var nav = document.querySelector('nav.navbar') || document.querySelector('nav') || document.querySelector('header');
      if (!nav) return;
      var s = window.getComputedStyle(nav);
      if (s.position !== 'fixed' && s.position !== 'sticky') return;
      var h = nav.offsetHeight;
      if (h > 0) document.documentElement.style.scrollPaddingTop = h + 'px';
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateScrollPadding, { once: true });
    } else {
      updateScrollPadding();
    }
    window.addEventListener('resize', updateScrollPadding, { passive: true });
  } catch (e) {}
})();
/* END ZAPPY_NAV_SCROLL_PADDING */


/* ZAPPY_CONTACT_FORM_PREVENT_DEFAULT */
(function(){
  try {
    var _kw=['contact','booking','inquiry','enquiry','register','signup','sign-up','order','request','apply'];
    function isContactForm(form) {
      var cls=(form.className||'').toLowerCase();
      var id=(form.id||'').toLowerCase();
      var act=(form.getAttribute('action')||'').toLowerCase();
      if(_kw.some(function(k){return cls.indexOf(k)!==-1||id.indexOf(k)!==-1||act.indexOf(k)!==-1;})) return true;
      var sec=form.closest&&form.closest('section');
      if(sec){
        var sc=(sec.className||'').toLowerCase();
        var si=(sec.id||'').toLowerCase();
        if(_kw.some(function(k){return sc.indexOf(k)!==-1||si.indexOf(k)!==-1;})) return true;
        if(sc.indexOf('form-section')!==-1||sc.indexOf('form_section')!==-1) return true;
      }
      if(window.zappyContactFormLoaded){
        var inputs=form.querySelectorAll('input,textarea,select');
        var hasEmail=false,hasPassword=false,visibleCount=0;
        for(var i=0;i<inputs.length;i++){
          var inp=inputs[i];
          var t=(inp.type||'').toLowerCase();
          var n=(inp.name||'').toLowerCase();
          if(t==='hidden'||t==='submit'||t==='button'||t==='reset') continue;
          visibleCount++;
          if(t==='email'||n.indexOf('email')!==-1||n.indexOf('mail')!==-1) hasEmail=true;
          if(t==='password') hasPassword=true;
        }
        if(hasEmail&&visibleCount>=2&&!hasPassword) return true;
      }
      return false;
    }

    function showFormFeedback(form, msg, type) {
      var old = form.querySelector('.zappy-form-feedback');
      if (old) old.remove();

      var bg = type==='success'?'#d4edda':type==='error'?'#f8d7da':'#d1ecf1';
      var fg = type==='success'?'#155724':type==='error'?'#721c24':'#0c5460';
      var bd = type==='success'?'#c3e6cb':type==='error'?'#f5c6cb':'#bee5eb';
      var ic = type==='success'?'\u2705':type==='error'?'\u274C':'\u2139\uFE0F';

      var el = document.createElement('div');
      el.className = 'zappy-form-feedback';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'padding:14px 18px;border-radius:8px;margin:12px 0 0;font-size:14px;line-height:1.5;background:'+bg+';color:'+fg+';border:1px solid '+bd+';text-align:center;font-family:inherit;';
      el.innerHTML = '<span style="margin-inline-end:6px">'+ic+'</span>'+msg;

      if (type === 'success') {
        form.reset();
        var formChildren = form.children;
        for (var i = 0; i < formChildren.length; i++) {
          if (formChildren[i] !== el) formChildren[i].style.display = 'none';
        }
        form.appendChild(el);
        el.style.cssText += 'padding:32px 24px;font-size:16px;';
      } else {
        var btn = form.querySelector('button[type="submit"],input[type="submit"]');
        if (btn) btn.parentNode.insertBefore(el, btn.nextSibling);
        else form.appendChild(el);
        setTimeout(function(){ if(el.parentElement) el.remove(); }, 8000);
      }
    }

    var _coreNameFields=['name','firstName','first_name','fname','lastName','last_name','lname'];
    var _coreEmailFields=['email','emailAddress','mail','e-mail'];
    var _corePhoneFields=['phone','tel','telephone','mobile','cellphone'];
    var _coreMsgFields=['message','msg','comments','comment','description','details','notes','body','text','inquiry'];
    var _coreSubjectFields=['subject','topic','regarding','re'];
    var _allCoreFields=[].concat(_coreNameFields,_coreEmailFields,_corePhoneFields,_coreMsgFields,_coreSubjectFields);

    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM' || !isContactForm(form)) return;
      e.preventDefault();
      e.stopPropagation();

      var origSubmit = form.submit;
      form.submit = function(){ };

      if (form.__zappySubmitting) return;
      form.__zappySubmitting = true;

      var oldFeedback = form.querySelector('.zappy-form-feedback');
      if (oldFeedback) oldFeedback.remove();

      var btn = form.querySelector('button[type="submit"],input[type="submit"]');
      var origText = btn ? (btn.value || btn.textContent) : '';
      if (btn) {
        if (btn.tagName === 'INPUT') btn.value = 'Sending...';
        else btn.textContent = 'Sending...';
        btn.disabled = true;
      }

      var fd = new FormData(form);
      var data = {};
      for(var pair of fd.entries()){
        if(data[pair[0]]!==undefined){
          if(Array.isArray(data[pair[0]])) data[pair[0]].push(pair[1]);
          else data[pair[0]]=[data[pair[0]],pair[1]];
        } else data[pair[0]]=pair[1];
      }

      var resolvedName=(data.name||'').trim()
        ||[data.firstName||data.first_name||data.fname||'',data.lastName||data.last_name||data.lname||''].filter(Boolean).join(' ').trim()
        ||(data.email||data.emailAddress||data.mail||'').trim()
        ||'Anonymous';
      var resolvedEmail=(data.email||data.emailAddress||data.mail||data['e-mail']||'').trim();
      var resolvedPhone=data.phone||data.tel||data.telephone||data.mobile||data.cellphone||null;
      var resolvedSubject=data.subject||data.topic||data.regarding||data.re||'Contact Form Submission';
      var resolvedMsg=(data.message||data.msg||data.comments||data.comment||data.description||data.details||data.notes||data.body||data.text||data.inquiry||'').trim();
      if(!resolvedMsg){
        var _extra=Object.entries(data).filter(function(e){return _allCoreFields.indexOf(e[0])===-1;});
        if(_extra.length>0) resolvedMsg=_extra.map(function(e){var l=e[0].replace(/([A-Z])/g,' $1').replace(/[_-]/g,' ').trim();var v=Array.isArray(e[1])?e[1].join(', '):e[1];return l+': '+v;}).join('\n');
        else resolvedMsg='Form submission from '+window.location.pathname;
      }

      var extraFields={};
      Object.keys(data).forEach(function(k){if(_allCoreFields.indexOf(k)===-1&&data[k]!==''&&data[k]!=null) extraFields[k]=data[k];});

      var currentPath = window.location.pathname;
      try { var pg=new URLSearchParams(window.location.search).get('page'); if(pg) currentPath=pg; } catch(x){}

      var wid = 'fcc949ef-8dcd-4311-b76c-3bc705835599';

      var apiBase = (window.ZAPPY_API_BASE || 'https://api.zappy5.com').replace(/\/$/,'');
      apiBase = apiBase + '/api/email/contact-form';

      var payload={
        websiteId: wid,
        name: resolvedName,
        email: resolvedEmail,
        subject: resolvedSubject,
        message: resolvedMsg,
        phone: resolvedPhone,
        currentPagePath: currentPath
      };
      if(Object.keys(extraFields).length>0) payload.extraFields=extraFields;

      fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(r){ return r.json(); }).then(function(result){
        if (result.success) {
          if (result.thankYouPagePath && result.ticketNumber) {
            window.location.href = result.thankYouPagePath + '?ticket=' + encodeURIComponent(result.ticketNumber);
            return;
          }
          showFormFeedback(form, result.message || 'Thank you! We will get back to you soon.', 'success');
        } else {
          showFormFeedback(form, result.error || 'Failed to send. Please try again.', 'error');
        }
      }).catch(function(){
        showFormFeedback(form, 'Unable to send message right now. Please try again later.', 'error');
      }).finally(function(){
        form.__zappySubmitting = false;
        form.submit = origSubmit;
        if (btn) {
          if (btn.tagName === 'INPUT') btn.value = origText;
          else btn.textContent = origText;
          btn.disabled = false;
        }
      });
    }, true);
  } catch (e) {}
})();
/* END ZAPPY_CONTACT_FORM_PREVENT_DEFAULT */


/* ZAPPY_PUBLISHED_GRID_CENTERING */
(function(){
  try {
    if (window.__zappyGridCenteringInit) return;
    window.__zappyGridCenteringInit = true;

    function centerPartialGridRows() {
      var grids = document.querySelectorAll('[data-zappy-explicit-columns="true"], [data-zappy-auto-grid="true"]');
      for (var g = 0; g < grids.length; g++) {
        try {
          var container = grids[g];

          // Clear previous centering so we can recalculate (e.g. after i18n direction change)
          if (container.getAttribute('data-zappy-grid-centered') === 'true') {
            var prevItems = Array.from(container.children);
            for (var p = 0; p < prevItems.length; p++) {
              if (prevItems[p].getAttribute && prevItems[p].getAttribute('data-zappy-gc') === '1') {
                prevItems[p].style.transform = prevItems[p].getAttribute('data-zappy-gc-orig') || '';
                prevItems[p].removeAttribute('data-zappy-gc');
                prevItems[p].removeAttribute('data-zappy-gc-orig');
              }
            }
            container.removeAttribute('data-zappy-grid-centered');
          }

          var items = [];
          for (var c = 0; c < container.children.length; c++) {
            var ch = container.children[c];
            if (!ch || !ch.tagName) continue;
            var tag = ch.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style') continue;
            if (ch.getAttribute('aria-hidden') === 'true') continue;
            if (ch.getAttribute('data-zappy-internal') === 'true') continue;
            var pos = window.getComputedStyle(ch).position;
            if (pos === 'absolute' || pos === 'fixed') continue;
            items.push(ch);
          }
          var totalItems = items.length;
          if (totalItems === 0) continue;

          var cs = window.getComputedStyle(container);
          if (cs.display !== 'grid') continue;
          var gta = (cs.gridTemplateAreas || '').trim();
          if (gta && gta !== 'none') continue;
          var gtc = (cs.gridTemplateColumns || '').trim();
          if (!gtc || gtc === 'none') continue;
          var colWidths = gtc.split(' ').filter(function(v) { return v && parseFloat(v) > 0; });
          var colCount = colWidths.length;
          if (colCount <= 1) continue;

          var itemsInLastRow = totalItems % colCount;
          if (itemsInLastRow === 0) continue;

          var colWidth = parseFloat(colWidths[0]) || 0;
          var gap = parseFloat(cs.columnGap);
          if (isNaN(gap)) gap = parseFloat(cs.gap) || 0;

          var missingCols = colCount - itemsInLastRow;
          var offset = missingCols * (colWidth + gap) / 2;

          // Detect RTL — use the computed direction which already accounts for
          // CSS cascade, html[dir], and inheritance. Do NOT walk up checking inline
          // styles because multi-language sites may have stale direction:rtl on
          // parent elements from the primary language while serving an LTR page.
          var dir = cs.direction || 'ltr';
          var translateValue = dir === 'rtl' ? -offset : offset;

          var startIndex = totalItems - itemsInLastRow;
          var savedTransitions = [];
          for (var i = startIndex; i < totalItems; i++) {
            var item = items[i];
            savedTransitions.push(item.style.transition);
            item.style.transition = 'none';
            var existingTransform = item.style.transform || '';
            item.setAttribute('data-zappy-gc-orig', existingTransform);
            var newTransform = existingTransform
              ? existingTransform + ' translateX(' + translateValue + 'px)'
              : 'translateX(' + translateValue + 'px)';
            item.style.transform = newTransform;
            item.setAttribute('data-zappy-gc', '1');
          }

          void container.offsetHeight;

          for (var j = startIndex; j < totalItems; j++) {
            items[j].style.transition = savedTransitions[j - startIndex];
          }

          container.setAttribute('data-zappy-grid-centered', 'true');
        } catch(e) {}
      }
    }

    if (document.readyState === 'complete') {
      centerPartialGridRows();
    } else {
      window.addEventListener('load', centerPartialGridRows);
    }

    // Re-center when i18n script changes the page direction
    try {
      var dirObs = new MutationObserver(function() { centerPartialGridRows(); });
      dirObs.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    } catch(e) {}
  } catch(e) {}
})();


/* ZAPPY_CONTENT_ALIGNMENT_RUNTIME */
(function(){
  try {
    if (window.__zappyContentAlignInit) return;
    window.__zappyContentAlignInit = true;

    var vShiftMap = { top: -0.5, upper: -0.25, center: 0, lower: 0.25, bottom: 0.5 };
    var hShiftMap = { left: -0.5, 'mid-left': -0.25, center: 0, 'mid-right': 0.25, right: 0.5 };

    function restoreContentAlignments() {
      var sections = document.querySelectorAll('[data-zappy-content-align]');
      for (var i = 0; i < sections.length; i++) {
        try { applyAlignment(sections[i]); } catch(e) {}
      }
    }

    function applyAlignment(section) {
      var target = section.querySelector('[data-zappy-align-target]');
      if (!target) return;

      var align = section.getAttribute('data-zappy-content-align') || 'center-center';
      var idx = align.indexOf('-');
      if (idx === -1) return;
      var vAlign = align.substring(0, idx) || 'center';
      var hAlign = align.substring(idx + 1) || 'center';

      if (!section.id) {
        section.id = 'zappy-section-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      }
      var sel = '#' + section.id;

      var old = section.querySelector('style[data-zappy-align-style]');
      if (old) old.remove();

      var ts = window.getComputedStyle(target);
      var isFlex = (ts.display === 'flex' || ts.display === 'inline-flex');
      var isColumn = (ts.flexDirection === 'column' || ts.flexDirection === 'column-reverse');

      var sectionRect = section.getBoundingClientRect();
      var sW = sectionRect.width || section.offsetWidth || 0;
      var sH = sectionRect.height || section.offsetHeight || 0;

      var orig = target.style.cssText;
      target.style.setProperty('width', 'fit-content', 'important');
      target.style.setProperty('height', 'auto', 'important');
      target.style.setProperty('min-height', '0', 'important');
      target.style.setProperty('max-height', 'none', 'important');
      target.style.setProperty('align-self', 'flex-start', 'important');
      target.style.setProperty('flex', 'none', 'important');
      var tRect = target.getBoundingClientRect();
      var tW = tRect.width || 0;
      var tH = tRect.height || 0;
      target.style.cssText = orig;

      var freeH = Math.max(0, sW - tW);
      var freeV = Math.max(0, sH - tH);
      var hPx = Math.round((hShiftMap[hAlign] || 0) * freeH);
      var vPx = Math.round((vShiftMap[vAlign] || 0) * freeV);

      var t = [];
      t.push('margin:auto!important');
      if (hPx !== 0 || vPx !== 0) {
        t.push('transform:translate(' + hPx + 'px,' + vPx + 'px)!important');
      }
      if (isFlex) {
        t.push('align-items:center!important');
        t.push('justify-content:center!important');
      } else {
        t.push('display:flex!important');
        t.push('flex-direction:column!important');
        t.push('align-items:center!important');
      }

      var c = ['justify-content:center!important'];
      if (!isFlex && hAlign !== 'center') {
        c.push('min-width:33.33%!important');
        c.push('text-align:start!important');
      }

      var css = '';
      if (hPx !== 0 || vPx !== 0) css += sel + '{overflow:hidden!important}';
      css += sel + '>[data-zappy-align-target]{' + t.join(';') + '}';
      css += sel + '>[data-zappy-align-target]>*{' + c.join(';') + '}';
      css += '@media(max-width:768px){' +
        sel + '>[data-zappy-align-target]{align-items:center!important;margin-left:auto!important;margin-right:auto!important;' +
        (vPx !== 0 ? 'transform:translateY(' + vPx + 'px)!important' : 'transform:none!important') +
        '}' + sel + '>[data-zappy-align-target]>*{margin-left:auto!important;margin-right:auto!important}}';

      var s = document.createElement('style');
      s.setAttribute('data-zappy-align-style', 'true');
      s.textContent = css;
      section.insertBefore(s, section.firstChild);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', restoreContentAlignments);
    } else {
      restoreContentAlignments();
    }

    var _timer = null;
    window.addEventListener('resize', function() {
      clearTimeout(_timer);
      _timer = setTimeout(restoreContentAlignments, 200);
    });
    window.addEventListener('orientationchange', function() {
      clearTimeout(_timer);
      _timer = setTimeout(restoreContentAlignments, 200);
    });
  } catch(e) {}
})();


/* ZAPPY_VARIANT_SELECTION_FIX */
(function(){
  try {
    if (window.__zappyVariantFixInit) return;
    window.__zappyVariantFixInit = true;

    // Inject CSS for disabled/OOS variant styling
    if (!document.getElementById('zappy-variant-fix-css')) {
      var s = document.createElement('style');
      s.id = 'zappy-variant-fix-css';
      s.textContent = '.variant-option.disabled{opacity:0.4!important;cursor:pointer!important;text-decoration:line-through!important}.variant-option.disabled::after,.variant-option.disabled::before{content:none!important}.variant-option.color-swatch.disabled{text-decoration:none!important}.variant-option.out-of-stock{opacity:0.4!important;cursor:pointer!important;text-decoration:line-through!important}.variant-option.out-of-stock::after,.variant-option.out-of-stock::before{content:none!important}.variant-option.color-swatch.out-of-stock{text-decoration:none!important}';
      document.head.appendChild(s);
    }

    var selectedAttributes = {};
    var _vProduct = null;
    var _vT = {};
    var _initOvr = false;
    // Late-product safety: the page may call initVariantSelection AFTER our
    // setTimeout(fixVariantSelection, 2000) has already fired (e.g. when the
    // product API is slow on cold starts or large catalogs). In that case both
    // scheduled calls bailed at the !product guard and never ran _repBtns or
    // _autoSelectSingles. Re-trigger fixVariantSelection from inside the wrapper
    // so the runtime fix runs once data finally arrives. Deferred via setTimeout
    // so the page's own renderProductDetail finishes mutating the DOM first.
    function _oivs(){if(_initOvr)return;if(typeof window.initVariantSelection==='function')_initOvr=true;window.initVariantSelection=function(p,t){if(p&&p.variants&&p.variants.length>0){_vProduct=p;var tr=t||{};if(!tr.pleaseSelect){var rtl=document.documentElement.getAttribute('dir')==='rtl'||document.body.getAttribute('dir')==='rtl';tr.pleaseSelect=rtl?'נא לבחור':'Please select'}_vT=tr;setTimeout(function(){try{fixVariantSelection()}catch(e){}},0)}}}
    _oivs();

    function _gv() { return _vProduct ? (_vProduct.variants||[]).filter(function(v){return v.is_active!==false}) : []; }
    function _gak() { var k=[],s={}; document.querySelectorAll('.variant-option').forEach(function(b){var a=b.getAttribute('data-attr');if(a&&!s[a]){s[a]=true;k.push(a)}}); return k; }
    function _ce(sel) { return _gv().some(function(v){if(!v.attributes)return false;for(var k in sel){if(!sel.hasOwnProperty(k))continue;if(v.attributes[k]!==sel[k])return false}return true}); }
    function _fm(sel) { return _gv().filter(function(v){if(!v.attributes)return false;for(var k in sel){if(!sel.hasOwnProperty(k))continue;if(v.attributes[k]!==sel[k])return false}return true}); }
    function _oos(v) { return v.stock_status==='out_of_stock'||(v.stock_quantity!=null&&v.stock_quantity<=0); }

    function _uv() {
      if(_gv().length===0)return;
      document.querySelectorAll('.variant-option').forEach(function(btn){
        var ak=btn.getAttribute('data-attr'),av=btn.getAttribute('data-value');
        var t={};for(var k in selectedAttributes){if(selectedAttributes.hasOwnProperty(k)&&k!==ak)t[k]=selectedAttributes[k]}t[ak]=av;
        var m=_fm(t);btn.classList.remove('disabled','out-of-stock');btn.disabled=false;
        if(m.length===0){btn.classList.add('disabled')}else if(m.every(function(v){return _oos(v)})){btn.classList.add('disabled');btn.classList.add('out-of-stock')}
      });
    }

    function _updImg(v) {
      var mi=document.getElementById('product-main-image');if(!mi)return;
      if(!window._originalMainImageSrc)window._originalMainImageSrc=mi.src;
      if(v&&v.image){var s=v.image;if(typeof window.resolveProductImageUrl==='function')s=window.resolveProductImageUrl(v.image);mi.src=s}
      else if(window._originalMainImageSrc){mi.src=window._originalMainImageSrc}
    }

    function _upd() {
      var t=_vT,product=_vProduct;if(!product)return;
      var keys=_gak(),allSel=keys.every(function(k){return selectedAttributes.hasOwnProperty(k)});
      var sd=document.getElementById('product-stock-display'),ab=document.getElementById('add-to-cart-btn');
      keys.forEach(function(k){var sp=document.querySelector('.variant-group[data-group="'+k+'"] .variant-selected-value');if(sp){var sb=document.querySelector('.variant-option[data-attr="'+k+'"].selected');sp.textContent=(sb&&sb.getAttribute('data-display-value'))||selectedAttributes[k]||''}});
      if(allSel){
        var m=_fm(selectedAttributes);if(m.length>0){var v=m[0];window.selectedVariant=v;
          if(_oos(v)){if(sd){sd.className='product-stock out-of-stock';sd.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'+(t.outOfStock||'Out of Stock')}if(ab){ab.disabled=true;ab.style.opacity='0.5';ab.style.cursor='not-allowed'}}
          else{if(sd){sd.className='product-stock in-stock';sd.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'+(t.inStock||'In Stock')}if(ab){ab.disabled=false;ab.style.opacity='';ab.style.cursor=''}}
          var skd=document.getElementById('product-sku-display');if(skd&&v.sku){skd.textContent=(t.sku||'SKU')+': '+v.sku}else if(skd&&product.sku){skd.textContent=(t.sku||'SKU')+': '+product.sku}
          var pd=document.getElementById('product-price-display');if(pd){var c=product.currency||t.currency||String.fromCharCode(8362),bP=window.productBasePrice||parseFloat(product.price)||0,oP=window.productOriginalPrice||parseFloat(product.compare_at_price||product.original_price||0),hS=window.productHasSalePrice,fP=(v.price!=null)?parseFloat(v.price):bP,h=c+fP.toFixed(2);if(v.price!=null){if(oP&&oP>fP)h+=' <span class="original-price">'+c+oP.toFixed(2)+'</span>'}else if(hS&&oP>fP){h+=' <span class="original-price">'+c+oP.toFixed(2)+'</span>'}pd.innerHTML=h}if(typeof updatePricePerUnitDisplay==='function'){var eP=(v.price!=null)?parseFloat(v.price):(window.productBasePrice||parseFloat(product.price)||0);updatePricePerUnitDisplay(eP,product,t)}
          _updImg(v);
        }
      } else {
        window.selectedVariant=null;
        if(sd){sd.className='product-stock in-stock';sd.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'+(t.inStock||'In Stock')}
        if(ab){ab.disabled=false;ab.style.opacity='';ab.style.cursor=''}
        var skd2=document.getElementById('product-sku-display');if(skd2&&product.sku){skd2.textContent=(t.sku||'SKU')+': '+product.sku}
        var pd=document.getElementById('product-price-display');if(pd){var c=product.currency||t.currency||String.fromCharCode(8362),bP=window.productBasePrice||parseFloat(product.price)||0,oP=window.productOriginalPrice||parseFloat(product.compare_at_price||product.original_price||0),hS=window.productHasSalePrice,hR=window.productHasVariantPriceRange,mP=window.productVariantMinPrice;if(hR&&mP!=null&&isFinite(mP)){var sL=(typeof getEcomText==='function')?getEcomText('startingAt',t.startingAt||'Starting at'):(t.startingAt||'Starting at');pd.textContent=sL+' '+c+mP.toFixed(2)}else if(hS&&oP>bP){pd.innerHTML=c+bP.toFixed(2)+' <span class="original-price">'+c+oP.toFixed(2)+'</span>'}else{pd.textContent=c+bP.toFixed(2)}}
        if(typeof updatePricePerUnitDisplay==='function'){var hR2=window.productHasVariantPriceRange,mP2=window.productVariantMinPrice,bP2=window.productBasePrice||parseFloat(product.price)||0,rP=(hR2&&mP2!=null&&isFinite(mP2))?mP2:bP2;updatePricePerUnitDisplay(rP,product,t)}
        _updImg(null);
      }
    }

    // Document-level capture handler
    document.addEventListener('click',function(e){
      var btn=e.target.closest?e.target.closest('.variant-option'):null;if(!btn)return;
      if(!_vProduct||_gv().length===0)return;
      e.preventDefault();e.stopImmediatePropagation();
      var ak=btn.getAttribute('data-attr'),av=btn.getAttribute('data-value');if(!ak||!av)return;
      if(selectedAttributes[ak]===av)return;
      document.querySelectorAll('.variant-option[data-attr="'+ak+'"]').forEach(function(b){b.classList.remove('selected')});selectedAttributes[ak]=av;btn.classList.add('selected');
      if(Object.keys(selectedAttributes).length>1){if(!_ce(selectedAttributes)){document.querySelectorAll('.variant-option').forEach(function(b){b.classList.remove('selected')});selectedAttributes={};selectedAttributes[ak]=av;btn.classList.add('selected')}}
      _uv();_upd();
    },true);

    // Document-level add-to-cart interceptor (capture phase) to prevent original alert()
    document.addEventListener('click',function(e){
      var ab=e.target.closest?e.target.closest('.add-to-cart-btn,.add-to-cart,#add-to-cart-btn,[onclick*="addProductToCart"]'):null;if(!ab)return;
      if(!_vProduct||_gv().length===0)return;
      var t=_vT||{},keys=_gak();
      for(var i=0;i<keys.length;i++){if(!selectedAttributes.hasOwnProperty(keys[i])){
        e.preventDefault();e.stopImmediatePropagation();
        var grp=document.querySelector('.variant-group[data-group="'+keys[i]+'"]'),lbl=grp?grp.querySelector('.variant-group-label'):null,name=lbl?lbl.textContent.replace(/[:\s]+$/,'').trim():keys[i];
        var sd=document.getElementById('product-stock-display');if(sd){sd.className='product-stock out-of-stock';sd.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'+(t.pleaseSelect||'Please select')+' '+name}
        if(grp){grp.style.transition='background 0.3s';grp.style.background='rgba(255,0,0,0.05)';grp.style.borderRadius='8px';setTimeout(function(){grp.style.background=''},2000)}return}}
      var m=_fm(selectedAttributes);if(m.length>0&&m.every(function(v){return _oos(v)})){e.preventDefault();e.stopImmediatePropagation();return}
    },true);

    // Repair variant button attributes that were truncated by the browser
    // when the (pre-fix) renderProductDetail serialized values containing "
    // (e.g. Hebrew "12  מ\"מ", US sizes 5'10") into data-value/data-display-value
    // without HTML escaping. We rebuild data-value, data-display-value, and the
    // visible text from _vProduct.variants[*].attributes (which is the unbroken
    // source of truth from the API). Pairs buttons to values by index after
    // applying the same sort renderProductDetail uses. Honors per-variant
    // attributes_display (translated/aliased labels) the same way
    // renderProductDetail's attributeDisplayMap does, so we don't replace a
    // localized "12 inches" label with the raw value 12".
    function _repBtns() {
      if(!_vProduct||!_vProduct.variants)return;
      var vs=_gv();if(vs.length===0)return;
      var _so={'xxxs':0,'xxs':1,'xs':2,'s':3,'m':4,'l':5,'xl':6,'xxl':7,'2xl':7,'xxxl':8,'3xl':8,'4xl':9,'5xl':10};
      function _cmp(a,b){var sa=_so[String(a).toLowerCase()],sb=_so[String(b).toLowerCase()];var na=sa===undefined?parseFloat(a):NaN,nb=sb===undefined?parseFloat(b):NaN;if(!isNaN(na)&&!isNaN(nb))return na-nb;if(sa!==undefined&&sb!==undefined)return sa-sb;var ca=!isNaN(na)?0:sa!==undefined?1:2,cb=!isNaN(nb)?0:sb!==undefined?1:2;if(ca!==cb)return ca-cb;return String(a).localeCompare(String(b));}
      var dispMap={};
      vs.forEach(function(v){
        if(!v.attributes)return;
        Object.keys(v.attributes).forEach(function(k){
          var raw=v.attributes[k];
          if(raw==null)return;
          if(!dispMap[k])dispMap[k]={};
          if(dispMap[k][raw]==null){
            dispMap[k][raw]=(v.attributes_display&&Object.prototype.hasOwnProperty.call(v.attributes_display,k))?v.attributes_display[k]:raw;
          }
        });
      });
      document.querySelectorAll('.variant-group').forEach(function(grp){
        var ak=grp.getAttribute('data-group');
        if(!ak||ak==='variant')return;
        var btns=Array.prototype.slice.call(grp.querySelectorAll('.variant-option'));
        if(btns.length===0)return;
        var seen={},vals=[];
        vs.forEach(function(v){if(v.attributes&&Object.prototype.hasOwnProperty.call(v.attributes,ak)){var val=v.attributes[ak];if(val!=null&&!seen[val]){seen[val]=true;vals.push(val);}}});
        if(vals.length===0||vals.length!==btns.length)return;
        vals.sort(_cmp);
        btns.forEach(function(btn,i){
          var correct=String(vals[i]);
          var current=btn.getAttribute('data-value')||'';
          if(current===correct)return;
          var disp=(dispMap[ak]&&dispMap[ak][vals[i]]!=null)?String(dispMap[ak][vals[i]]):correct;
          btn.setAttribute('data-value',correct);
          btn.setAttribute('data-display-value',disp);
          if(!btn.classList.contains('color-swatch')){btn.textContent=disp;}
          if(btn.title){btn.title=disp;}
        });
      });
    }

    function fixVariantSelection() {
      _oivs();
      var product=_vProduct||window.currentProduct,t=_vT||window.productTranslations||{};
      if(!product||!product.variants||product.variants.length===0)return;
      if(document.querySelectorAll('.variant-option').length===0)return;
      if(window._zappyVariantFixed)return;window._zappyVariantFixed=true;
      _vProduct=product;if(!t.pleaseSelect){var isRTL=document.documentElement.getAttribute('dir')==='rtl'||document.body.getAttribute('dir')==='rtl';t.pleaseSelect=isRTL?'נא לבחור':'Please select'}_vT=t;
      var old=document.getElementById('zappy-variant-state-css');if(old)old.remove();
      document.querySelectorAll('.variant-option').forEach(function(b){b.style.display='';b.disabled=false});
      _repBtns();
      var _so={'xxxs':0,'xxs':1,'xs':2,'s':3,'m':4,'l':5,'xl':6,'xxl':7,'2xl':7,'xxxl':8,'3xl':8,'4xl':9,'5xl':10};
      document.querySelectorAll('.variant-options').forEach(function(c){var b=Array.from(c.querySelectorAll('.variant-option'));if(b.length<2)return;b.sort(function(a,b){var va=a.getAttribute('data-value')||'',vb=b.getAttribute('data-value')||'';var sa=_so[va.toLowerCase()],sb=_so[vb.toLowerCase()];var na=sa===undefined?parseFloat(va):NaN,nb=sb===undefined?parseFloat(vb):NaN;if(!isNaN(na)&&!isNaN(nb))return na-nb;if(sa!==undefined&&sb!==undefined)return sa-sb;var ca=!isNaN(na)?0:sa!==undefined?1:2,cb=!isNaN(nb)?0:sb!==undefined?1:2;if(ca!==cb)return ca-cb;return va.localeCompare(vb)});b.forEach(function(x){c.appendChild(x)})});
      var origATC=window.addProductToCart;
      window.addProductToCart=function(){
        var keys=_gak();for(var i=0;i<keys.length;i++){if(!selectedAttributes.hasOwnProperty(keys[i])){
          var grp=document.querySelector('.variant-group[data-group="'+keys[i]+'"]'),lbl=grp?grp.querySelector('.variant-group-label'):null,name=lbl?lbl.textContent.replace(/[:\s]+$/,'').trim():keys[i];
          var sd=document.getElementById('product-stock-display');if(sd){sd.className='product-stock out-of-stock';sd.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'+(t.pleaseSelect||'Please select')+' '+name}
          if(grp){grp.style.transition='background 0.3s';grp.style.background='rgba(255,0,0,0.05)';grp.style.borderRadius='8px';setTimeout(function(){grp.style.background=''},2000)}return}}
        var m=_fm(selectedAttributes);if(m.length>0&&m.every(function(v){return _oos(v)}))return;
        if(origATC)origATC.apply(this,arguments);
      };
      selectedAttributes={};document.querySelectorAll('.variant-option').forEach(function(b){b.classList.remove('selected','disabled','out-of-stock');b.disabled=false});
      // Auto-select any variant group that only has one possible value, so a
      // shopper choosing the remaining options gets a fully-matched variant
      // (image/SKU/price update) instead of being silently blocked because a
      // single-option dimension was left implicitly unselected.
      function _autoSelectSingles(){
        document.querySelectorAll('.variant-group').forEach(function(grp){
          var ak=grp.getAttribute('data-group');
          if(!ak||ak==='variant')return;
          if(grp.querySelector('.variant-option.selected'))return;
          var btns=Array.prototype.slice.call(grp.querySelectorAll('.variant-option')).filter(function(b){
            return b.getAttribute('data-attr')&&b.getAttribute('data-value')&&!b.classList.contains('disabled')&&!b.classList.contains('out-of-stock');
          });
          if(btns.length!==1)return;
          var btn=btns[0],av=btn.getAttribute('data-value');
          btn.classList.add('selected');
          selectedAttributes[ak]=av;
          var sp=grp.querySelector('.variant-selected-value');
          if(sp)sp.textContent=btn.getAttribute('data-display-value')||av;
        });
      }
      _autoSelectSingles();
      _uv();
      // Re-run after availability has been recomputed: a multi-option group may
      // have collapsed to a single non-disabled choice once cross-group stock
      // constraints were applied.
      _autoSelectSingles();
      _upd();
    }

    if(document.readyState==='complete'){setTimeout(fixVariantSelection,100)}else{window.addEventListener('load',function(){setTimeout(fixVariantSelection,100)})}
    setTimeout(fixVariantSelection,2000);
  } catch(e) {}
})();

/* CHECKOUT TERMS CHECKBOX FIX */
(function(){
  if(document.getElementById('zappy-terms-checkbox-css'))return;
  var s=document.createElement('style');s.id='zappy-terms-checkbox-css';
  s.textContent='.terms-checkbox-wrapper{margin:16px 0;padding:12px;background:var(--surface-color,var(--surface,#f9fafb));border-radius:8px}.terms-checkbox-label{display:flex!important;align-items:center!important;gap:10px!important;cursor:pointer;font-size:14px;color:var(--text-color,var(--text,#374151))}.terms-checkbox{width:18px;height:18px;cursor:pointer;accent-color:var(--primary-color,var(--primary,#ff0083));flex-shrink:0}.terms-link{color:var(--primary-color,var(--primary,#ff0083));text-decoration:underline;font-weight:500}';
  document.head.appendChild(s);
})();

/* CART COLOR SWATCH PATCH */
(function(){
  function patchCartColorSwatches(container) {
    if (!container) return;
    var attrs = container.querySelectorAll('.cart-item-attr');
    attrs.forEach(function(span) {
      if (span.querySelector('.cart-item-color-swatch')) return;
      var labelEl = span.querySelector('.cart-item-attr-label');
      if (!labelEl) return;
      var labelText = (labelEl.textContent || '').replace(/[:\s]+$/, '').toLowerCase();
      var colorLabels = ['color','colour','צבע','لون','farbe','couleur','colore'];
      if (colorLabels.indexOf(labelText) === -1) return;
      var fullText = span.textContent || '';
      var colorValue = fullText.replace(labelEl.textContent || '', '').trim();
      if (!colorValue) return;
      var bgColor = colorValue;
      if (!/^#[0-9A-Fa-f]{3,6}$/.test(colorValue)) {
        var lc = colorValue.toLowerCase();
        var _clr = {'dark grey':'#555','dark gray':'#555','light grey':'#d3d3d3','light gray':'#d3d3d3','light blue':'lightblue','dark blue':'darkblue','light green':'lightgreen','dark green':'darkgreen','dark red':'darkred','light pink':'lightpink','dark orange':'darkorange','sky blue':'skyblue','royal blue':'royalblue','navy blue':'navy','forest green':'forestgreen','olive green':'olivedrab','hot pink':'hotpink','deep pink':'deeppink','dark violet':'darkviolet','slate grey':'slategrey','slate gray':'slategray','dim grey':'dimgrey','dim gray':'dimgray','off white':'#f5f5f0','burgundy':'#800020','charcoal':'#36454f','champagne':'#f7e7ce','sand':'#c2b280','taupe':'#483c32','wine':'#722f37','rust':'#b7410e','sage':'#bcb88a','mint':'#98ff98','peach':'#ffcba4','cream':'#fffdd0','mauve':'#e0b0ff'};
        bgColor = _clr[lc] || lc;
      }
      var swatch = document.createElement('span');
      swatch.className = 'cart-item-color-swatch';
      swatch.title = colorValue;
      swatch.style.cssText = 'display:inline-block;width:14px;height:14px;border-radius:50%;background-color:' + bgColor + ';border:1px solid rgba(0,0,0,0.15);vertical-align:middle;margin-inline-start:4px;';
      span.textContent = '';
      span.appendChild(labelEl.cloneNode(true));
      span.appendChild(document.createTextNode(' '));
      span.appendChild(swatch);
    });
  }
  function observeCartDrawer() {
    var drawer = document.getElementById('cart-drawer') || document.getElementById('cart-drawer-items');
    if (!drawer) return;
    patchCartColorSwatches(drawer);
    var observer = new MutationObserver(function() { patchCartColorSwatches(drawer); });
    observer.observe(drawer, { childList: true, subtree: true });
  }
  if (document.readyState === 'complete') { setTimeout(observeCartDrawer, 200); }
  else { window.addEventListener('load', function() { setTimeout(observeCartDrawer, 200); }); }
  var bodyObs = new MutationObserver(function() {
    if (document.getElementById('cart-drawer')) { observeCartDrawer(); bodyObs.disconnect(); }
  });
  if (document.body) bodyObs.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', function() { bodyObs.observe(document.body, { childList: true, subtree: true }); });
})();


/* ZAPPY_SECTION_ID_FROM_CLASS */
(function(){
  function assignIds(){
    document.querySelectorAll('section').forEach(function(s){
      if(s.id)return;
      var cls=(s.className||'').split(/\s+/)[0];
      if(cls && !document.getElementById(cls)){s.id=cls;}
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',assignIds,{once:true});}
  else{assignIds();}
})();
/* END ZAPPY_SECTION_ID_FROM_CLASS */


/* ZAPPY_EMPTY_SUBMENU_HIDDEN */
(function(){
  function markEmpty(){
    document.querySelectorAll('.sub-menu, .dropdown-menu').forEach(function(ul){
      var hasVisible=false;
      for(var i=0;i<ul.children.length;i++){
        if(window.getComputedStyle(ul.children[i]).display!=='none'){hasVisible=true;break;}
      }
      ul.classList.toggle('zappy-empty-submenu',!hasVisible);
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',markEmpty,{once:true});}
  else{markEmpty();}
})();
/* END ZAPPY_EMPTY_SUBMENU_HIDDEN */


/* ZAPPY_INTERNAL_LINKS_NO_NEW_TAB */
(function(){
  try {
    function fixLinks(){
      var docRe=/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|ods|odp)(\?|$)/i;
      document.querySelectorAll('a[target="_blank"]').forEach(function(a){
        var h=a.getAttribute('href');
        if(!h)return;
        if(h.indexOf('://')!==-1||h.indexOf('mailto:')===0||h.indexOf('tel:')===0)return;
        if(docRe.test(h))return;
        a.removeAttribute('target');
        a.removeAttribute('rel');
      });
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fixLinks)}
    else{fixLinks()}
  }catch(e){}
})();


/* ZAPPY_IOS_VIEWPORT_GAP_FIX */
(function(){
  try {
    if (window.__zappyIosViewportGapInit) return;
    window.__zappyIosViewportGapInit = true;

    function update() {
      try {
        var visual = window.innerWidth;
        var layout = document.documentElement.clientWidth;
        var gap = Math.max(0, (visual || 0) - (layout || 0));
        document.documentElement.style.setProperty('--ios-viewport-gap', gap + 'px');

        // Also publish the navbar height so the mobile dropdown menu CSS can
        // anchor `top` to the navbar's bottom edge. This is needed because
        // older v2 patches set `top: 100% !important` on .nav-menu, which
        // with position:fixed resolves against the viewport (=height of
        // screen) instead of the navbar. --zappy-navbar-bottom gives the
        // v3 CSS something concrete to override that with.
        var nav = document.querySelector('nav.navbar, .navbar, header nav, header.navbar');
        if (nav) {
          var h = Math.round(nav.getBoundingClientRect().height);
          if (h > 0) {
            document.documentElement.style.setProperty('--zappy-navbar-bottom', h + 'px');
          }
        }
      } catch (e) {}
    }

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
    }
    document.addEventListener('DOMContentLoaded', update);
    window.addEventListener('load', update);
    // Re-measure after the navbar layout settles (fonts, images, logo load).
    setTimeout(update, 250);
    setTimeout(update, 1000);
  } catch (e) {}
})();
