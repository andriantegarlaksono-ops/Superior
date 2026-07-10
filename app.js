// ==========================================================================
// SUPERIOR SLEEP GALLERY - CATALOG ENGINE
// ==========================================================================

// Global Constants
const CONTACT_PHONE = "6285536581733"; // Format Internasional (tanpa +, tanpa 0 di depan)
const ADMIN_USER = "superior";
const ADMIN_PASS = "superior123";
const STORAGE_KEY = "superior_mattress_catalog";

// State
let products = [];
let categories = [];
let selectedProduct = null;
let currentEditingId = null;

const CATEGORIES_KEY = "superior_mattress_categories";

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
        categories = ["Orthopedic", "Natural Latex", "Memory Foam", "Spring Bed"];
      }
    }

    saveToLocalStorage();
    saveCategories();
    updateCategoryFilters();
    renderCatalog();
  } catch (error) {
    console.error("Error loading initial data.json:", error);
    products = [];
    categories = ["Orthopedic", "Natural Latex", "Memory Foam", "Spring Bed"];
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
      categories = ["Orthopedic", "Natural Latex", "Memory Foam", "Spring Bed"];
    }
  } else {
    // Bangun dari kategori produk yang ada atau gunakan bawaan
    const currentCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    categories = currentCats.length > 0 ? currentCats : ["Orthopedic", "Natural Latex", "Memory Foam", "Spring Bed"];
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

  countSpan.innerText = `Menampilkan ${filteredProducts.length} produk`;

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = `
      <div class="loading-state">
        <p>Tidak ada produk kasur yang cocok dengan kriteria filter Anda.</p>
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

    // Determine firmness label
    let firmnessText = "Medium";
    if (product.firmness <= 4) firmnessText = "Soft";
    else if (product.firmness >= 8) firmnessText = "Firm";

    return `
      <div class="product-card" id="prod-${product.id}">
        <span class="product-cat-tag">${product.category}</span>
        <div class="product-img-wrapper">
          <img class="product-img" src="${product.image || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-body">
          <h3 class="product-title">${product.name}</h3>
          
          <div class="product-quick-specs">
            <div class="spec-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              <span>${product.thickness} cm</span>
            </div>
            <div class="spec-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Garansi ${product.warranty} Thn</span>
            </div>
            <div class="spec-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${firmnessText} (${product.firmness}/10)</span>
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

    // Size filter
    let matchesSize = true;
    if (sizeVal !== "all") {
      // Check if product has sizes with width matching filter width (e.g. 90, 120, etc.)
      matchesSize = product.sizes.some(sizeObj => {
        const sizeName = sizeObj.name.toLowerCase();
        // E.g., if filter is "90", matches "90 x 200"
        return sizeName.startsWith(sizeVal) || sizeName.includes(` ${sizeVal} `) || sizeName.includes(`${sizeVal}x`);
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

// 4. CUSTOMER VIEW: PRODUCT DETAILS MODAL
function openDetailModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  selectedProduct = product;

  // Set Images & Text
  document.getElementById("detail-image").src = product.image || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80';
  document.getElementById("detail-image").alt = product.name;
  document.getElementById("detail-category").innerText = product.category;
  document.getElementById("detail-name").innerText = product.name;
  document.getElementById("detail-thickness").innerText = `${product.thickness} cm`;
  document.getElementById("detail-warranty").innerText = `${product.warranty} Tahun`;

  // Firmness Bar
  const firmnessPercentage = product.firmness * 10;
  document.getElementById("detail-firmness-fill").style.width = `${firmnessPercentage}%`;

  let firmnessLabel = "Medium";
  if (product.firmness <= 3) firmnessLabel = "Sangat Empuk (Soft)";
  else if (product.firmness === 4) firmnessLabel = "Empuk (Medium-Soft)";
  else if (product.firmness === 5) firmnessLabel = "Sedang (Medium)";
  else if (product.firmness >= 6 && product.firmness <= 7) firmnessLabel = "Sedang Mantap (Medium-Firm)";
  else if (product.firmness >= 8 && product.firmness <= 9) firmnessLabel = "Keras (Firm)";
  else if (product.firmness === 10) firmnessLabel = "Sangat Keras (Extra Firm)";

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

  const text = `Halo Superior Sleep Gallery, saya tertarik untuk memesan kasur berikut:\n\n` +
    `*Produk:* ${selectedProduct.name}\n` +
    `*Kategori:* ${selectedProduct.category}\n` +
    `*Ukuran:* ${sizeObj.name}\n` +
    `*Ketebalan:* ${selectedProduct.thickness} cm\n` +
    `*Harga:* ${priceFormatted}\n\n` +
    `Apakah stok ukuran tersebut tersedia? Mohon info untuk estimasi pengiriman. Terima kasih.`;

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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Tidak ada produk aktif. Klik Tambah Produk untuk memulai.</td></tr>`;
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
          <img class="admin-thumbnail" src="${product.image || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'}" alt="">
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
  document.getElementById("form-image-preview").src = "";
  document.getElementById("form-image-preview").style.display = "none";
  document.getElementById("form-image-base64").value = "";
  document.getElementById("form-firmness-val").innerText = "5";

  // Populate form categories dropdown
  populateFormCategories();

  // Set Sizes Container empty and add one default empty row
  document.getElementById("form-sizes-container").innerHTML = "";
  addSizeRow("90 x 200 (Single)", 2000000);
  addSizeRow("160 x 200 (Queen)", 3500000);
  addSizeRow("180 x 200 (King)", 4000000);

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

  // Image handling
  const preview = document.getElementById("form-image-preview");
  const base64Input = document.getElementById("form-image-base64");
  const urlInput = document.getElementById("form-image-url");

  base64Input.value = ""; // Clear temporary file
  urlInput.value = "";

  if (product.image) {
    if (product.image.startsWith("data:image")) {
      base64Input.value = product.image;
      preview.src = product.image;
    } else {
      urlInput.value = product.image;
      preview.src = product.image;
    }
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
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
    <input type="text" class="size-name-input" required placeholder="Contoh: 160 x 200 (Queen)" value="${name}">
    <input type="number" class="size-price-input" required placeholder="Harga (Contoh: 3500000)" value="${price}">
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
    alert("Produk kasur harus memiliki setidaknya satu variasi ukuran!");
  }
}

// Image encoder (Base64)
function previewAndConvertImage(fileInput) {
  const file = fileInput.files[0];
  const preview = document.getElementById("form-image-preview");
  const base64Input = document.getElementById("form-image-base64");
  const urlInput = document.getElementById("form-image-url");

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
      base64Input.value = e.target.result; // Save Base64 code
      urlInput.value = ""; // Clear text URL to avoid conflict
    };
    reader.readAsDataURL(file);
  }
}

// Handle URL Input directly
function updateImagePreviewFromUrl(url) {
  const preview = document.getElementById("form-image-preview");
  const base64Input = document.getElementById("form-image-base64");

  if (url.trim()) {
    preview.src = url.trim();
    preview.style.display = "block";
    base64Input.value = ""; // Clear file uploaded to avoid conflict
  } else {
    preview.style.display = "none";
  }
}

// Submit Product (Add/Edit)
function handleProductFormSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("form-name").value.trim();

  // Mengambil kategori produk
  const category = document.getElementById("form-category").value;
  
  if (!category) {
    alert("Harap pilih kategori produk!");
    return;
  }

  const description = document.getElementById("form-description").value.trim();
  const thickness = parseInt(document.getElementById("form-thickness").value);
  const warranty = parseInt(document.getElementById("form-warranty").value);
  const firmness = parseInt(document.getElementById("form-firmness").value);

  // Image priority: Base64 Upload > Text URL
  const base64Img = document.getElementById("form-image-base64").value;
  const urlImg = document.getElementById("form-image-url").value.trim();
  const image = base64Img || urlImg;

  if (!image) {
    alert("Harap pilih berkas foto atau masukkan URL gambar produk!");
    return;
  }

  // Features parsing (split by newline)
  const featuresText = document.getElementById("form-features").value;
  const features = featuresText
    .split("\n")
    .map(f => f.trim())
    .filter(f => f.length > 0);

  if (features.length === 0) {
    alert("Harap masukkan setidaknya satu fitur unggulan produk!");
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
    alert("Harap lengkapi setidaknya satu ukuran dan harga!");
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
        image,
        features,
        sizes
      };
      alert("Produk berhasil diperbarui!");
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
      image,
      features,
      sizes
    };
    products.push(newProduct);
    alert("Produk baru berhasil ditambahkan!");
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

  const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}" dari katalog?`);
  if (confirmDelete) {
    products = products.filter(p => p.id !== id);
    saveToLocalStorage();
    updateCategoryFilters();
    renderCatalog();
    renderAdminTable();
    alert("Produk berhasil dihapus!");
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
