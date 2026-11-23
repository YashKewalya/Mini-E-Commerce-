// 1. DATA – prices are numbers; they are formatted only when displayed
var products = [
  { id: 1, name: "Notebook",        price: 120,  category: "Stationery",  image: "📒" },
  { id: 2, name: "Pen pack",        price: 80,   category: "Stationery",  image: "🖊️" },
  { id: 3, name: "Desk lamp",       price: 650,  category: "Home",        image: "💡" },
  { id: 4, name: "Water bottle",    price: 299,  category: "Home",        image: "🧴" },
  { id: 5, name: "Backpack",        price: 1499, category: "Accessories", image: "🎒" },
  { id: 6, name: "Earphones",       price: 799,  category: "Electronics", image: "🎧" },
  { id: 7, name: "Power bank",      price: 1199, category: "Electronics", image: "🔋" },
  { id: 8, name: "Sticky notes",    price: 60,   category: "Stationery",  image: "🗒️" },
  { id: 9, name: "Laptop sleeve",   price: 549,  category: "Accessories", image: "💼" },
  { id: 10, name: "Coffee mug",     price: 199,  category: "Home",        image: "☕" }
];

var DELIVERY_FEE = 40, FREE_DELIVERY_FROM = 500, DISCOUNT_FROM = 2000, DISCOUNT_RATE = 0.10;
var activeCategory = "All";

// 2. STATE – cart object keyed by product id → quantity (safe load)
var cart = {};
try { cart = JSON.parse(localStorage.getItem("cart") || "{}") || {}; } catch (e) { cart = {}; }
// drop ids that no longer exist in the catalogue
Object.keys(cart).forEach(function (id) { if (!findProduct(id)) delete cart[id]; });

function findProduct(id) {
  return products.find(function (p) { return p.id === Number(id); });
}
function money(n) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

// 3. CART ACTIONS
function addToCart(id) { cart[id] = (cart[id] || 0) + 1; save(); }
function changeQuantity(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  save();
}
function removeItem(id) { delete cart[id]; save(); }
function clearCart() { cart = {}; save(); }

// 4. TOTALS
function totals() {
  var subtotal = Object.keys(cart).reduce(function (sum, id) {
    var p = findProduct(id);
    return p ? sum + p.price * cart[id] : sum;
  }, 0);
  var count = Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0);
  var discount = subtotal >= DISCOUNT_FROM ? Math.round(subtotal * DISCOUNT_RATE) : 0;
  var delivery = subtotal > 0 && subtotal < FREE_DELIVERY_FROM ? DELIVERY_FEE : 0;
  return { count: count, subtotal: subtotal, discount: discount, delivery: delivery,
           total: subtotal - discount + delivery };
}

function save() {
  try { localStorage.setItem("cart", JSON.stringify(cart)); } catch (e) {}
  renderCart();
}

// 5. RENDERING
function renderFilters() {
  var cats = ["All"].concat(products.map(function (p) { return p.category; })
    .filter(function (c, i, a) { return a.indexOf(c) === i; }));
  var box = document.getElementById("filters");
  box.innerHTML = "";
  cats.forEach(function (c) {
    var b = document.createElement("button");
    b.className = "chip" + (c === activeCategory ? " active" : "");
    b.textContent = c;
    b.onclick = function () { activeCategory = c; renderFilters(); renderCatalogue(); };
    box.appendChild(b);
  });
}

function renderCatalogue() {
  var list = products.filter(function (p) { return activeCategory === "All" || p.category === activeCategory; });
  document.getElementById("catalogue").innerHTML = list.map(function (p) {
    return '<article class="card">' +
      '<div class="img" aria-hidden="true">' + p.image + '</div>' +
      '<span class="cat">' + p.category + '</span>' +
      '<h3>' + p.name + '</h3>' +
      '<span class="price">' + money(p.price) + '</span>' +
      '<button class="add" data-id="' + p.id + '">Add to cart</button>' +
      '</article>';
  }).join("");
}

function renderCart() {
  var t = totals();
  var ids = Object.keys(cart);
  document.getElementById("count").textContent = t.count;
  document.getElementById("checkoutBtn").disabled = ids.length === 0;
  document.getElementById("clearBtn").hidden = ids.length === 0;

  if (ids.length === 0) {
    document.getElementById("cartBody").innerHTML =
      '<div class="empty">🛍️<br>Your cart is empty.<br>Add something you like!</div>';
    return;
  }
  var rows = ids.map(function (id) {
    var p = findProduct(id);
    return '<tr><td>' + p.image + ' ' + p.name + '<br><span class="note">' + money(p.price) + ' each</span></td>' +
      '<td><span class="qty">' +
      '<button data-act="dec" data-id="' + id + '" aria-label="Decrease quantity">−</button>' + cart[id] +
      '<button data-act="inc" data-id="' + id + '" aria-label="Increase quantity">+</button></span></td>' +
      '<td>' + money(p.price * cart[id]) + '</td>' +
      '<td><button class="rm" data-act="rm" data-id="' + id + '" aria-label="Remove ' + p.name + '">✕</button></td></tr>';
  }).join("");

  var sum = '<div><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
    (t.discount ? '<div><span>Discount (10%)</span><span>− ' + money(t.discount) + '</span></div>' : '') +
    '<div><span>Delivery</span><span>' + (t.delivery ? money(t.delivery) : "Free") + '</span></div>' +
    '<div class="grand"><span>Total</span><span id="total">' + money(t.total) + '</span></div>' +
    '<p class="note">Delivery is free from ' + money(FREE_DELIVERY_FROM) + '. Get 10% off orders of ' + money(DISCOUNT_FROM) + ' or more.</p>';

  document.getElementById("cartBody").innerHTML =
    '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Line</th><th></th></tr></thead><tbody>' +
    rows + '</tbody></table></div><div class="sum">' + sum + '</div>';
}

// 6. CHECKOUT PREVIEW (dialog)
function openCheckout() {
  var t = totals();
  var lines = Object.keys(cart).map(function (id) {
    var p = findProduct(id);
    return '<tr><td>' + p.name + ' × ' + cart[id] + '</td><td style="text-align:right">' + money(p.price * cart[id]) + '</td></tr>';
  }).join("");
  document.getElementById("dlgBody").innerHTML =
    '<table>' + lines + '</table><div class="sum">' +
    '<div><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
    (t.discount ? '<div><span>Discount</span><span>− ' + money(t.discount) + '</span></div>' : '') +
    '<div><span>Delivery</span><span>' + (t.delivery ? money(t.delivery) : "Free") + '</span></div>' +
    '<div class="grand"><span>Total</span><span>' + money(t.total) + '</span></div></div>';
  document.getElementById("dlg").showModal();
}

// 7. EVENTS (delegation)
document.getElementById("catalogue").addEventListener("click", function (e) {
  var b = e.target.closest(".add"); if (b) addToCart(b.dataset.id);
});
document.getElementById("cartBody").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-act]"); if (!b) return;
  var id = b.dataset.id, a = b.dataset.act;
  if (a === "inc") changeQuantity(id, 1);
  else if (a === "dec") changeQuantity(id, -1);
  else removeItem(id);
});
document.getElementById("checkoutBtn").onclick = openCheckout;
document.getElementById("clearBtn").onclick = clearCart;
document.getElementById("dlgClose").onclick = function () { document.getElementById("dlg").close(); };
document.getElementById("dlgDone").onclick = function () {
  document.getElementById("dlg").close();
  clearCart();
  alert("Demo order placed! No payment was taken.");
};
document.getElementById("jump").onclick = function () {
  document.getElementById("cartPanel").scrollIntoView({ behavior: "smooth" });
};

renderFilters();
renderCatalogue();
renderCart();
