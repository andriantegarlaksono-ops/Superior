// ==========================================================================
// SUPERIOR SLEEP GALLERY - CATALOG ENGINE
// ==========================================================================

// Global Constants
const CONTACT_PHONE = "6285536581733"; // Format Internasional (tanpa +, tanpa 0 di depan)
const ADMIN_USER = "villaab";
const ADMIN_PASS = "villaab123";
const STORAGE_KEY = "villa_ab_catalog";

// State
let products = [];
let categories = [];
let selectedProduct = null;
let currentEditingId = null;

const CATEGORIES_KEY = "villa_ab_categories";

// Initialize App
window.addEventListener("DOMContentLoaded", () => {
  initData();
  checkLoginStatus();
});

// 1. DATA INITIALIZATION
async function initData() {
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    try {
      products = JSON.parse(localData);
      initCategories();
      updateCategoryFilters();
      renderCatalog();
    } catch (e) {
      console.error("Error parsing local storage data, resetting...", e);
      fetchDefaultData();
    }
  } else {
    fetchDefaultData();
  }
}

async function fetchDefaultData() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Gagal memuat data.json");
    const data = await response.json();

    // Mendukung format baru (objek berisi produk & kategori) dan format lama (array produk saja)
    if (data.products && data.categories) {
      products = data.products;
      categories = data.categories;
    } else {
      products = Array.isArray(data) ? data : [];
      categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      if (categories.length === 0) {
        categories = ["Deluxe Room", "Suite Room", "Family Suite", "Standard Room", "Glamping"];
      }
    }

    saveToLocalStorage();
    saveCategories();
    updateCategoryFilters();
    renderCatalog();
  } catch (error) {
    console.error("Error loading initial data.json:", error);
    products = [];
    categories = ["Deluxe Room", "Suite Room", "Family Suite", "Standard Room", "Glamping"];
    updateCategoryFilters();
    renderCatalog();
  }
}

function initCategories() {
  const localCats = localStorage.getItem(CATEGORIES_KEY);
  if (localCats) {
    try {
      categories = JSON.parse(localCats);
    } catch (e) {
      categories = ["Deluxe Room", "Suite Room", "Family Suite", "Standard Room", "Glamping"];
    }
  } else {
    // Bangun dari kategori produk yang ada atau gunakan bawaan
    const currentCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    categories = currentCats.length > 0 ? currentCats : ["Deluxe Room", "Suite Room", "Family Suite", "Standard Room", "Glamping"];
    saveCategories();
  }
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// Helper to Format Currency IDR
function formatIDR(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

// 2. CLIENT-SIDE RENDERING
function renderCatalog(filteredProducts = products) {
  const productGrid = document.getElementById("product-grid");
  const countSpan = document.getElementById("product-count");

  countSpan.innerText = `Menampilkan ${filteredProducts.length} kamar`;

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = `
      <div class="loading-state">
        <p>Tidak ada kamar villa yang cocok dengan kriteria filter Anda.</p>
        <button class="btn btn-outline" style="margin-top: 16px;" onclick="resetFilters()">Reset Filter</button>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = filteredProducts.map(product => {
    // Determine price range
    const prices = product.sizes.map(s => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceDisplay = prices.length > 1
      ? `${formatIDR(minPrice)} - ${formatIDR(maxPrice)}`
      : formatIDR(minPrice);

    // Determine rating label
    let ratingText = "Baik";
    if (product.firmness === 10) ratingText = "Sempurna";
    else if (product.firmness === 9) ratingText = "Sangat Baik";
    else if (product.firmness === 8) ratingText = "Baik";
    else ratingText = "Standar";

    // Support both images[] array and legacy image string
    const firstImage = getFirstImage(product);
    const imageCount = getImages(product).length;

    return `
      <div class="product-card" id="prod-${product.id}">
        <span class="product-cat-tag">${product.category}</span>
        <div class="product-img-wrapper">
          <img class="product-img" src="${firstImage}" alt="${product.name}" loading="lazy">
          ${imageCount > 1 ? `<span class="photo-count-badge">📷 ${imageCount} Foto</span>` : ''}
        </div>
        <div class="product-body">
          <h3 class="product-title">${product.name}</h3>
          
          <div class="product-quick-specs">
            <div class="spec-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>${product.thickness} Orang</span>
            </div>
            <div class="spec-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16M2 8h20M2 12h20M2 16h20M22 4v16M18 8H6v4h12V8z"/></svg>
              <span>${product.warranty} Ranjang</span>
            </div>
            <div class="spec-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>${ratingText} (${product.firmness}/10)</span>
            </div>
          </div>
          
          <p class="product-summary">${product.description}</p>
          
          <div class="product-footer">
            <div class="product-price-range">
              <span class="price-range-label">Harga Mulai</span>
              <span class="price-range-val">${priceDisplay}</span>
            </div>
            <button class="btn btn-outline-warning btn-full" onclick="openDetailModal('${product.id}')">Lihat Detail</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 3. SEARCH & FILTERS LOGIC
function applyFilters() {
  const searchVal = document.getElementById("search-input").value.toLowerCase();
  const categoryVal = document.getElementById("category-filter").value;
  const firmnessVal = document.getElementById("firmness-filter").value;
  const sizeVal = document.getElementById("size-filter").value;

  const filtered = products.filter(product => {
    // Search keyword
    const matchesSearch =
      product.name.toLowerCase().includes(searchVal) ||
      product.description.toLowerCase().includes(searchVal) ||
      product.category.toLowerCase().includes(searchVal) ||
      product.features.some(f => f.toLowerCase().includes(searchVal));

    // Category filter
    const matchesCategory = categoryVal === "all" || product.category === categoryVal;

    // Firmness filter
    let matchesFirmness = true;
    if (firmnessVal === "soft") matchesFirmness = product.firmness <= 4;
    else if (firmnessVal === "medium") matchesFirmness = product.firmness >= 5 && product.firmness <= 7;
    else if (firmnessVal === "firm") matchesFirmness = product.firmness >= 8;

    // Size filter (mapped to booking packages)
    let matchesSize = true;
    if (sizeVal !== "all") {
      matchesSize = product.sizes.some(sizeObj => {
        const sizeName = sizeObj.name.toLowerCase();
        if (sizeVal === "transit") {
          return sizeName.includes("transit");
        } else if (sizeVal === "menginap") {
          return sizeName.includes("menginap");
        }
        return true;
      });
    }

    return matchesSearch && matchesCategory && matchesFirmness && matchesSize;
  });

  renderCatalog(filtered);
}

function resetFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("category-filter").value = "all";
  document.getElementById("firmness-filter").value = "all";
  document.getElementById("size-filter").value = "all";
  renderCatalog();
}

// 3.5. DYNAMIC CATEGORY UPDATER
function updateCategoryFilters() {
  const categoryFilter = document.getElementById("category-filter");
  if (!categoryFilter) return;

  // Simpan filter terpilih saat ini
  const currentFilterVal = categoryFilter.value;

  // Perbarui dropdown filter kategori dari variabel categories global
  categoryFilter.innerHTML = `<option value="all">Semua Kategori</option>` +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");

  // Kembalikan ke pilihan filter semula jika kategori tersebut masih ada
  if (categories.includes(currentFilterVal)) {
    categoryFilter.value = currentFilterVal;
  } else {
    categoryFilter.value = "all";
  }
}

// // 3.6. ADMIN PANEL CATEGORIES INLINE HANDLER
function toggleInlineCategoryInput(show) {
  const wrap = document.getElementById("inline-category-wrap");
  const input = document.getElementById("inline-category-input");
  if (!wrap || !input) return;
  
  if (show) {
    wrap.style.display = "block";
    input.value = "";
    input.focus();
  } else {
    wrap.style.display = "none";
    input.value = "";
  }
}

function saveInlineCategory() {
  const input = document.getElementById("inline-category-input");
  if (!input) return;
  
  const newCat = input.value.trim();
  if (!newCat) {
    alert("Harap masukkan nama kategori!");
    return;
  }
  
  // Cek duplikasi
  const existCat = categories.find(cat => cat.toLowerCase() === newCat.toLowerCase());
  if (existCat) {
    alert(`Kategori "${existCat}" sudah ada! Otomatis terpilih.`);
    document.getElementById("form-category").value = existCat;
    toggleInlineCategoryInput(false);
    return;
  }
  
  // Tambah kategori baru ke global list
  categories.push(newCat);
  saveCategories();
  updateCategoryFilters();
  
  // Refresh select dropdown dan langsung set terpilih
  populateFormCategories(newCat);
  toggleInlineCategoryInput(false);
  alert(`Kategori "${newCat}" berhasil ditambahkan!`);
}

function populateFormCategories(selectedVal = "") {
  const categorySelect = document.getElementById("form-category");
  if (!categorySelect) return;
  
  // Sembunyikan inline creator input
  toggleInlineCategoryInput(false);
  
  // Bentuk opsi-opsi select dari array categories global
  let optionsHtml = categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
  categorySelect.innerHTML = optionsHtml;
  
  if (selectedVal) {
    if (categories.includes(selectedVal)) {
      categorySelect.value = selectedVal;
    } else {
      // Jika produk memiliki kategori kustom yang tidak ada di daftar
      const opt = document.createElement("option");
      opt.value = selectedVal;
      opt.innerText = selectedVal;
      categorySelect.appendChild(opt);
      categorySelect.value = selectedVal;
    }
  } else {
    // Default form tambah produk: gunakan opsi pertama jika ada
    if (categories.length > 0) {
      categorySelect.value = categories[0];
    }
  }
}

// 3.7. ADMIN TAB NAVIGATION & CATEGORY CRUD
function switchAdminTab(tab) {
  const productsTab = document.getElementById("admin-products-tab");
  const categoriesTab = document.getElementById("admin-categories-tab");
  const productsBtn = document.getElementById("tab-products-btn");
  const categoriesBtn = document.getElementById("tab-categories-btn");

  if (!productsTab || !categoriesTab) return;

  if (tab === "products") {
    productsTab.style.display = "block";
    categoriesTab.style.display = "none";
    productsBtn.classList.add("active");
    categoriesBtn.classList.remove("active");
    renderAdminTable();
  } else {
    productsTab.style.display = "none";
    categoriesTab.style.display = "block";
    productsBtn.classList.remove("active");
    categoriesBtn.classList.add("active");
    renderAdminCategories();
  }
}

function renderAdminCategories() {
  const tbody = document.getElementById("admin-category-table-body");
  if (!tbody) return;

  if (categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 24px 0; color: var(--color-text-secondary);">Belum ada kategori yang ditambahkan. Silakan isi form di atas untuk menambah.</td></tr>`;
    return;
  }

  tbody.innerHTML = categories.map(cat => `
    <tr>
      <td style="font-weight: 600; font-size: 15px; padding: 16px 20px;">${cat}</td>
      <td style="text-align: right; padding-right: 24px; padding-top: 8px; padding-bottom: 8px;">
        <button type="button" class="btn-remove-row" onclick="deleteCategory('${cat}')" style="font-size: 24px; line-height: 1;">&times;</button>
      </td>
    </tr>
  `).join("");
}

function handleAddCategorySubmit(event) {
  event.preventDefault();
  const input = document.getElementById("new-category-input");
  const newCatName = input.value.trim();

  if (!newCatName) return;

  // Cek duplikasi
  if (categories.some(cat => cat.toLowerCase() === newCatName.toLowerCase())) {
    alert("Kategori dengan nama ini sudah ada!");
    return;
  }

  categories.push(newCatName);
  saveCategories();
  updateCategoryFilters();
  renderAdminCategories();

  input.value = "";
  alert(`Kategori "${newCatName}" berhasil ditambahkan!`);
}

function deleteCategory(catName) {
  // Cek apakah ada produk aktif yang masih menggunakan kategori ini
  const usedCount = products.filter(p => p.category === catName).length;

  let confirmMsg = `Apakah Anda yakin ingin menghapus kategori "${catName}"?`;
  if (usedCount > 0) {
    confirmMsg += `\n\n⚠️ Peringatan: Ada ${usedCount} produk yang menggunakan kategori ini. Menghapus kategori ini akan memindahkan kategori produk tersebut menjadi "Lainnya".`;
  }

  if (confirm(confirmMsg)) {
    // Hapus kategori dari array global
    categories = categories.filter(c => c !== catName);
    saveCategories();

    // Perbarui kategori produk yang terdampak
    if (usedCount > 0) {
      products = products.map(p => {
        if (p.category === catName) {
          return { ...p, category: "Lainnya" };
        }
        return p;
      });
      saveToLocalStorage();

      // Tambahkan "Lainnya" ke daftar kategori jika belum terdaftar
      if (!categories.includes("Lainnya")) {
        categories.push("Lainnya");
        saveCategories();
      }
    }

    updateCategoryFilters();
    renderAdminCategories();
    renderCatalog();
    if (sessionStorage.getItem("adminLoggedIn") === "true") {
      renderAdminTable();
    }
    alert(`Kategori "${catName}" berhasil dihapus.`);
  }
}

// Helper: get images array from product (supports both old image string and new images[])
function getImages(product) {
  if (product.images && product.images.length > 0) return product.images;
  if (product.image) return [product.image];
  return ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'];
}

function getFirstImage(product) {
  return getImages(product)[0];
}

// Gallery state
let currentGalleryIndex = 0;
let currentGalleryImages = [];

function showGalleryImage(index) {
  if (currentGalleryImages.length === 0) return;
  // Wrap around
  if (index < 0) index = currentGalleryImages.length - 1;
  if (index >= currentGalleryImages.length) index = 0;
  currentGalleryIndex = index;

  const mainImg = document.getElementById("detail-image");
  mainImg.style.opacity = '0';
  setTimeout(() => {
    mainImg.src = currentGalleryImages[currentGalleryIndex];
    mainImg.style.opacity = '1';
  }, 150);

  // Update thumbnails
  const thumbs = document.querySelectorAll('.gallery-thumb');
  thumbs.forEach((t, i) => {
    t.classList.toggle('active', i === currentGalleryIndex);
  });

  // Update counter
  const counter = document.getElementById('gallery-counter');
  if (counter) counter.innerText = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;
}

function prevGalleryImage() { showGalleryImage(currentGalleryIndex - 1); }
function nextGalleryImage() { showGalleryImage(currentGalleryIndex + 1); }

// 4. CUSTOMER VIEW: PRODUCT DETAILS MODAL
function openDetailModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  selectedProduct = product;
  currentGalleryImages = getImages(product);
  currentGalleryIndex = 0;

  // Set Main Image
  const mainImg = document.getElementById("detail-image");
  mainImg.src = currentGalleryImages[0];
  mainImg.alt = product.name;
  mainImg.style.opacity = '1';

  // Build gallery controls
  const galleryEl = document.getElementById('modal-gallery-container');
  const hasMultiple = currentGalleryImages.length > 1;

  // Thumbnail strip
  const thumbStrip = document.getElementById('gallery-thumb-strip');
  if (thumbStrip) {
    if (hasMultiple) {
      thumbStrip.innerHTML = currentGalleryImages.map((src, i) =>
        `<img class="gallery-thumb ${i === 0 ? 'active' : ''}" src="${src}" onclick="showGalleryImage(${i})" alt="Foto ${i+1}">`
      ).join('');
      thumbStrip.style.display = 'flex';
    } else {
      thumbStrip.innerHTML = '';
      thumbStrip.style.display = 'none';
    }
  }

  // Show/hide navigation controls row (panah + counter) sebagai satu unit
  const controlsRow = document.getElementById('gallery-controls-row');
  const counter = document.getElementById('gallery-counter');
  if (controlsRow) controlsRow.style.display = hasMultiple ? 'flex' : 'none';
  if (counter) counter.innerText = `1 / ${currentGalleryImages.length}`;
  document.getElementById("detail-category").innerText = product.category;
  document.getElementById("detail-name").innerText = product.name;
  document.getElementById("detail-thickness").innerText = `${product.thickness} Orang`;
  document.getElementById("detail-warranty").innerText = `${product.warranty} Ranjang`;

  // Firmness Bar (Rating Bar)
  const firmnessPercentage = product.firmness * 10;
  document.getElementById("detail-firmness-fill").style.width = `${firmnessPercentage}%`;

  let firmnessLabel = "Sempurna";
  if (product.firmness <= 4) firmnessLabel = "Standar (Standard)";
  else if (product.firmness >= 5 && product.firmness <= 7) firmnessLabel = "Baik (Good)";
  else if (product.firmness >= 8 && product.firmness <= 9) firmnessLabel = "Sangat Baik (Very Good)";
  else if (product.firmness === 10) firmnessLabel = "Sempurna (Excellent)";

  document.getElementById("detail-firmness-text").innerText = `${firmnessLabel} (${product.firmness}/10)`;
  document.getElementById("detail-description").innerText = product.description;

  // Features List
  const featuresList = document.getElementById("detail-features");
  featuresList.innerHTML = product.features.map(f => `<li>${f}</li>`).join("");

  // Size Options Dropdown
  const sizeSelect = document.getElementById("detail-size-select");
  sizeSelect.innerHTML = product.sizes.map((s, idx) => `
    <option value="${idx}">${s.name} - ${formatIDR(s.price)}</option>
  `).join("");

  updateDetailPrice();

  // Display Modal
  document.getElementById("detail-modal").style.display = "block";
  document.body.style.overflow = "hidden"; // disable body scrolling
}

function closeDetailModal() {
  document.getElementById("detail-modal").style.display = "none";
  document.body.style.overflow = "auto";
  selectedProduct = null;
}

function updateDetailPrice() {
  if (!selectedProduct) return;
  const sizeIdx = document.getElementById("detail-size-select").value;
  const selectedSize = selectedProduct.sizes[sizeIdx];

  if (selectedSize) {
    document.getElementById("detail-price").innerText = formatIDR(selectedSize.price);
  }
}

// Order Via WhatsApp
function orderViaWhatsApp() {
  if (!selectedProduct) return;

  const sizeIdx = document.getElementById("detail-size-select").value;
  const sizeObj = selectedProduct.sizes[sizeIdx];
  const priceFormatted = formatIDR(sizeObj.price);

  const text = `Halo Villa AB Cozy Resort, saya tertarik untuk memesan/booking kamar berikut:\n\n` +
    `*Kamar:* ${selectedProduct.name}\n` +
    `*Kategori:* ${selectedProduct.category}\n` +
    `*Paket:* ${sizeObj.name}\n` +
    `*Kapasitas:* ${selectedProduct.thickness} Orang\n` +
    `*Jumlah Ranjang:* ${selectedProduct.warranty} Ranjang\n` +
    `*Rating Kamar:* ${selectedProduct.firmness}/10\n` +
    `*Harga:* ${priceFormatted}\n\n` +
    `Apakah kamar tersebut tersedia untuk dipesan? Mohon info kelanjutannya. Terima kasih.`;

  const encodedText = encodeURIComponent(text);
  const waUrl = `https://wa.me/${CONTACT_PHONE}?text=${encodedText}`;

  window.open(waUrl, "_blank");
}

// 5. ADMIN AUTHENTICATION
function openLoginModal() {
  if (sessionStorage.getItem("adminLoggedIn") === "true") {
    // If already logged in, show admin dashboard directly
    openAdminModal();
  } else {
    document.getElementById("login-modal").style.display = "block";
    document.body.style.overflow = "hidden";
  }
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("login-form").reset();
  document.getElementById("login-error-msg").style.display = "none";
  document.body.style.overflow = "auto";
}

function handleLogin(event) {
  event.preventDefault();
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error-msg");

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem("adminLoggedIn", "true");
    checkLoginStatus();
    closeLoginModal();
    openAdminModal();
  } else {
    errorMsg.innerText = "Username atau password salah!";
    errorMsg.style.display = "block";
  }
}

function handleLogout() {
  sessionStorage.removeItem("adminLoggedIn");
  checkLoginStatus();
  closeAdminModal();
  alert("Anda telah keluar dari mode admin.");
}

function checkLoginStatus() {
  const adminNavBtn = document.getElementById("admin-nav-btn");
  const adminBtnText = document.getElementById("admin-btn-text");

  if (sessionStorage.getItem("adminLoggedIn") === "true") {
    adminNavBtn.classList.remove("btn-outline");
    adminNavBtn.classList.add("btn-primary");
    adminBtnText.innerText = "Dashboard Admin";
  } else {
    adminNavBtn.classList.remove("btn-primary");
    adminNavBtn.classList.add("btn-outline");
    adminBtnText.innerText = "Admin Login";
  }
}

// 6. ADMIN DASHBOARD MODAL
function openAdminModal() {
  if (sessionStorage.getItem("adminLoggedIn") !== "true") return;

  switchAdminTab('products');
  document.getElementById("admin-modal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeAdminModal() {
  document.getElementById("admin-modal").style.display = "none";
  document.body.style.overflow = "auto";
}

function renderAdminTable() {
  const tbody = document.getElementById("admin-product-table-body");

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Tidak ada kamar aktif. Klik Tambah Kamar untuk memulai.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(product => {
    const prices = product.sizes.map(s => s.price);
    const minPrice = formatIDR(Math.min(...prices));
    const maxPrice = formatIDR(Math.max(...prices));
    const priceText = product.sizes.length > 1 ? `${minPrice} - ${maxPrice}` : minPrice;
    const sizesSummary = `${product.sizes.length} ukuran (${priceText})`;

    return `
      <tr>
        <td>
          <img class="admin-thumbnail" src="${getFirstImage(product)}" alt="">
        </td>
        <td><strong>${product.name}</strong></td>
        <td><span class="detail-category-badge">${product.category}</span></td>
        <td>${sizesSummary}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline-info btn-small" onclick="openEditProductForm('${product.id}')">Edit</button>
            <button class="btn btn-danger btn-small" onclick="deleteProduct('${product.id}')">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// 7. CRUD OPERATIONS: PRODUCT FORM
function openAddProductForm() {
  currentEditingId = null;
  document.getElementById("form-modal-title").innerText = "Tambah Produk Baru";
  document.getElementById("product-form").reset();

  // Clear file uploads and previews
  document.getElementById("form-product-id").value = "";
  document.getElementById("form-firmness-val").innerText = "5";
  clearAllFormImages();

  // Populate form categories dropdown
  populateFormCategories();

  // Set Sizes Container empty and add default room booking packages
  document.getElementById("form-sizes-container").innerHTML = "";
  addSizeRow("Transit 3 Jam", 150000);
  addSizeRow("Menginap 1 Hari (Weekday)", 450000);
  addSizeRow("Menginap 1 Hari (Weekend)", 550000);

  document.getElementById("product-form-modal").style.display = "block";
}

function openEditProductForm(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  currentEditingId = id;
  document.getElementById("form-modal-title").innerText = "Edit Detail Produk";

  // Populate general info
  document.getElementById("form-product-id").value = product.id;
  document.getElementById("form-name").value = product.name;

  // Populate category select list
  populateFormCategories(product.category);

  document.getElementById("form-description").value = product.description;
  document.getElementById("form-thickness").value = product.thickness;
  document.getElementById("form-warranty").value = product.warranty;
  document.getElementById("form-firmness").value = product.firmness;
  document.getElementById("form-firmness-val").innerText = product.firmness;

  // Image handling - multi-image
  clearAllFormImages();
  const imagesToLoad = getImages(product);
  // Load first image into main slot, rest as extra
  if (imagesToLoad.length > 0) {
    // Load all images into gallery slots
    imagesToLoad.forEach((imgSrc, idx) => {
      addImageToFormGallery(imgSrc);
    });
  }

  // Features List (newline-separated)
  document.getElementById("form-features").value = product.features.join("\n");

  // Sizes list
  const container = document.getElementById("form-sizes-container");
  container.innerHTML = "";
  product.sizes.forEach(s => {
    addSizeRow(s.name, s.price);
  });

  document.getElementById("product-form-modal").style.display = "block";
}

function closeProductFormModal() {
  document.getElementById("product-form-modal").style.display = "none";
}

// Add Size & Price inputs dynamically
function addSizeRow(name = "", price = "") {
  const container = document.getElementById("form-sizes-container");
  const rowId = `size-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const div = document.createElement("div");
  div.className = "size-row";
  div.id = rowId;
  div.innerHTML = `
    <input type="text" class="size-name-input" required placeholder="Contoh: Menginap 1 Hari (Weekday)" value="${name}">
    <input type="number" class="size-price-input" required placeholder="Harga (Contoh: 450000)" value="${price}">
    <button type="button" class="btn-remove-row" onclick="removeSizeRow('${rowId}')">&times;</button>
  `;
  container.appendChild(div);
}

function removeSizeRow(rowId) {
  const row = document.getElementById(rowId);
  const container = document.getElementById("form-sizes-container");
  if (container.children.length > 1) {
    row.remove();
  } else {
    alert("Kamar harus memiliki setidaknya satu pilihan paket booking!");
  }
}

// ============================================================
// MULTI-IMAGE GALLERY MANAGEMENT (ADMIN FORM)
// ============================================================

// formImageList: array of image src strings currently in the form
let formImageList = [];

function clearAllFormImages() {
  formImageList = [];
  renderFormGallery();
  // Clear file input
  const fi = document.getElementById("form-image-file");
  if (fi) fi.value = "";
  document.getElementById("form-image-url").value = "";
}

function addImageToFormGallery(src) {
  if (!src || !src.trim()) return;
  formImageList.push(src.trim());
  renderFormGallery();
}

function removeFormImage(index) {
  formImageList.splice(index, 1);
  renderFormGallery();
}

function renderFormGallery() {
  const container = document.getElementById("form-gallery-list");
  if (!container) return;

  if (formImageList.length === 0) {
    container.innerHTML = `<p class="gallery-empty-hint">Belum ada foto. Tambahkan foto di bawah.</p>`;
    return;
  }

  container.innerHTML = formImageList.map((src, i) => `
    <div class="form-gallery-item">
      <img src="${src}" alt="Foto ${i+1}" onerror="this.src='https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=200&q=60'">
      <div class="form-gallery-overlay">
        <span class="form-gallery-num">${i+1}</span>
        <button type="button" class="btn-remove-gallery-img" onclick="removeFormImage(${i})" title="Hapus foto">&times;</button>
      </div>
      ${i === 0 ? '<span class="form-gallery-main-badge">Utama</span>' : ''}
    </div>
  `).join('');
}

// File upload handler - adds to gallery
function previewAndConvertImage(fileInput) {
  const files = fileInput.files;
  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      addImageToFormGallery(e.target.result);
    };
    reader.readAsDataURL(file);
  });

  // Reset file input so same file can be re-added if needed
  fileInput.value = "";
}

// Handle URL Input - add URL to gallery
function addImageUrlToGallery() {
  const urlInput = document.getElementById("form-image-url");
  const url = urlInput.value.trim();
  if (!url) {
    alert("Masukkan URL foto terlebih dahulu!");
    return;
  }
  addImageToFormGallery(url);
  urlInput.value = "";
}

// Legacy stub - not used but kept for safety
function updateImagePreviewFromUrl(url) {
  // No-op, replaced by addImageUrlToGallery
}

// Submit Product (Add/Edit)
function handleProductFormSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("form-name").value.trim();

  // Mengambil kategori produk
  const category = document.getElementById("form-category").value;
  
  if (!category) {
    alert("Harap pilih kategori kamar!");
    return;
  }

  const description = document.getElementById("form-description").value.trim();
  const thickness = parseInt(document.getElementById("form-thickness").value);
  const warranty = parseInt(document.getElementById("form-warranty").value);
  const firmness = parseInt(document.getElementById("form-firmness").value);

  // Images: collect from formImageList
  const images = [...formImageList];

  if (images.length === 0) {
    alert("Harap tambahkan setidaknya satu foto kamar!");
    return;
  }

  // Features parsing (split by newline)
  const featuresText = document.getElementById("form-features").value;
  const features = featuresText
    .split("\n")
    .map(f => f.trim())
    .filter(f => f.length > 0);

  if (features.length === 0) {
    alert("Harap masukkan setidaknya satu fitur/fasilitas utama kamar!");
    return;
  }

  // Sizes & Prices parsing
  const sizeRows = document.querySelectorAll("#form-sizes-container .size-row");
  const sizes = [];

  sizeRows.forEach(row => {
    const sizeName = row.querySelector(".size-name-input").value.trim();
    const sizePrice = parseInt(row.querySelector(".size-price-input").value);
    if (sizeName && !isNaN(sizePrice)) {
      sizes.push({ name: sizeName, price: sizePrice });
    }
  });

  if (sizes.length === 0) {
    alert("Harap lengkapi setidaknya satu pilihan paket dan harga!");
    return;
  }

  // Add or Edit execution
  if (currentEditingId) {
    // Edit
    const index = products.findIndex(p => p.id === currentEditingId);
    if (index !== -1) {
      products[index] = {
        id: currentEditingId,
        name,
        category,
        description,
        thickness,
        firmness,
        warranty,
        images,
        image: images[0], // backward compat
        features,
        sizes
      };
      alert("Detail kamar berhasil diperbarui!");
    }
  } else {
    // Add
    const newId = (Math.max(0, ...products.map(p => parseInt(p.id))) + 1).toString();
    const newProduct = {
      id: newId,
      name,
      category,
      description,
      thickness,
      firmness,
      warranty,
      images,
      image: images[0], // backward compat
      features,
      sizes
    };
    products.push(newProduct);
    alert("Kamar baru berhasil ditambahkan!");
  }

  // Save, render and close modals
  saveToLocalStorage();
  updateCategoryFilters();
  renderCatalog();
  renderAdminTable();
  closeProductFormModal();
}

// Delete Product
function deleteProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus kamar "${product.name}" dari katalog?`);
  if (confirmDelete) {
    products = products.filter(p => p.id !== id);
    saveToLocalStorage();
    updateCategoryFilters();
    renderCatalog();
    renderAdminTable();
    alert("Kamar berhasil dihapus!");
  }
}

// 8. DATABASE EXPORT FOR DEPLOYMENT
function downloadDatabase() {
  const dbPayload = {
    categories: categories,
    products: products
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbPayload, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Global modal background click dismissals
window.onclick = function (event) {
  const detailModal = document.getElementById("detail-modal");
  const loginModal = document.getElementById("login-modal");
  const adminModal = document.getElementById("admin-modal");
  const productFormModal = document.getElementById("product-form-modal");

  if (event.target === detailModal) {
    closeDetailModal();
  }
  if (event.target === loginModal) {
    closeLoginModal();
  }
  if (event.target === adminModal) {
    closeAdminModal();
  }
  if (event.target === productFormModal) {
    closeProductFormModal();
  }
};
