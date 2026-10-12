(() => {
  "use strict";
  const STORAGE = {
    recent: "smartShopping_recent_v1",
    payments: "smartShopping_payments_v1",
    comparison: "smartShopping_comparison_v1"
  };

  // 화면 시연용 예시 데이터입니다. 실제 판매처의 실시간 가격을 가져오지는 않습니다.
  const catalog = {
    "무선 헤드폰": [
      {seller:"판매 옵션 A", detail:"기본 배송 · 2~3일", price:29900, shipping:0, icon:"🎧"},
      {seller:"판매 옵션 B", detail:"무료 배송 · 1~2일", price:24900, shipping:0, icon:"🎧"},
      {seller:"판매 옵션 C", detail:"빠른 배송 · 1일", price:26900, shipping:2500, icon:"🎧"}
    ],
    "텀블러": [
      {seller:"판매 옵션 A", detail:"기본 배송 · 2~3일", price:15900, shipping:2500, icon:"🥤"},
      {seller:"판매 옵션 B", detail:"무료 배송 · 1~2일", price:17900, shipping:0, icon:"🥤"},
      {seller:"판매 옵션 C", detail:"무료 배송 · 2~4일", price:13900, shipping:3000, icon:"🥤"}
    ],
    "키보드": [
      {seller:"판매 옵션 A", detail:"무료 배송 · 1~2일", price:38900, shipping:0, icon:"⌨️"},
      {seller:"판매 옵션 B", detail:"기본 배송 · 2~3일", price:34900, shipping:2500, icon:"⌨️"},
      {seller:"판매 옵션 C", detail:"빠른 배송 · 1일", price:36900, shipping:0, icon:"⌨️"}
    ]
  };

  const $ = (selector) => document.querySelector(selector);
  const money = (value) => new Intl.NumberFormat("ko-KR", {style:"currency", currency:"KRW", maximumFractionDigits:0}).format(value);
  const read = (key, fallback = []) => {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { showToast("저장 공간을 사용할 수 없어요. 브라우저 설정을 확인해 주세요."); return false; }
  };
  let currentProduct = "무선 헤드폰";
  let currentOffers = catalog[currentProduct];
  let toastTimer;

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function normalizeName(name) {
    const input = name.trim();
    return Object.keys(catalog).find(key => key.toLowerCase() === input.toLowerCase()) || input || "무선 헤드폰";
  }
  function getOffers(name) {
    if (catalog[name]) return catalog[name];
    // 지원하지 않는 검색어는 상품을 지어내지 않고 명확한 안내를 표시합니다.
    return null;
  }
  function renderOffers(name) {
    currentProduct = name;
    const offers = getOffers(name);
    const list = $("#offerList");
    $("#resultTitle").textContent = `${name} 비교 결과`;
    if (!offers) {
      currentOffers = [];
      $("#resultSub").textContent = "현재 데모에서 비교할 수 있는 상품은 추천 검색어 3종입니다.";
      $("#resultCount").textContent = "결과 없음";
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">⌕</span><strong>비교 가능한 예시 데이터가 없어요</strong><p>무선 헤드폰, 텀블러, 키보드 중 하나를 검색해 주세요.</p></div>`;
      return;
    }
    currentOffers = offers.map(offer => ({...offer, total: offer.price + offer.shipping}));
    const cheapest = Math.min(...currentOffers.map(offer => offer.total));
    $("#resultSub").textContent = "표시 금액은 상품가와 배송비를 합산한 예시입니다.";
    $("#resultCount").textContent = `${offers.length}개 옵션`;
    list.innerHTML = currentOffers.slice().sort((a,b) => a.total-b.total).map((offer, index) => {
      const originalIndex = offers.findIndex(item => item.seller === offer.seller);
      const isBest = offer.total === cheapest;
      return `<article class="offer ${isBest ? "is-best" : ""}">
        <div class="seller"><span class="seller-icon">${offer.icon}</span><div><span class="seller-name">${isBest ? '<span class="best-label">최저가</span>' : ""}${escapeHTML(offer.seller)}</span><small class="seller-detail">${escapeHTML(offer.detail)} · 배송비 ${money(offer.shipping)}</small></div></div>
        <div class="offer-price"><strong>${money(offer.total)}</strong><small>상품 ${money(offer.price)}</small></div>
        <div class="offer-actions"><button class="save-btn" data-save="${originalIndex}">♡ 다시 보기</button><button class="view-btn" data-view="${originalIndex}">상품 기록</button></div>
      </article>`;
    }).join("");
    list.querySelectorAll("[data-save]").forEach(button => button.addEventListener("click", () => {
      saveRecent(name, offers[Number(button.dataset.save)]);
      button.classList.add("saved"); button.textContent = "♥ 저장됨";
    }));
    list.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
      saveRecent(name, offers[Number(button.dataset.view)]);
      showToast("최근 본 상품에 저장했어요.");
      $("#recent").scrollIntoView({behavior:"smooth", block:"start"});
    }));
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function saveRecent(name, offer) {
    let recent = read(STORAGE.recent);
    const item = {id:`${name}-${offer.seller}`, name, seller:offer.seller, price:offer.price+offer.shipping, icon:offer.icon, viewedAt:Date.now()};
    recent = [item, ...recent.filter(old => old.id !== item.id)].slice(0, 12);
    write(STORAGE.recent, recent);
    renderRecent();
  }
  function renderRecent() {
    const recent = read(STORAGE.recent);
    $("#recentCount").textContent = `저장된 상품 ${recent.length}개`;
    $("#recentEmpty").hidden = recent.length > 0;
    $("#recentList").innerHTML = recent.map(item => `<div class="recent-item">
      <span class="recent-thumb">${escapeHTML(item.icon || "🛍️")}</span>
      <div class="recent-info"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.seller)} · ${money(Number(item.price)||0)}</small></div>
      <button data-reopen="${escapeHTML(item.name)}">다시 보기</button>
      <button data-remove="${escapeHTML(item.id)}" aria-label="기록 삭제">×</button>
    </div>`).join("");
    $("#recentList").querySelectorAll("[data-reopen]").forEach(button => button.addEventListener("click", () => {
      $("#productSearch").value = button.dataset.reopen;
      renderOffers(normalizeName(button.dataset.reopen));
      $("#compare").scrollIntoView({behavior:"smooth", block:"start"});
    }));
    $("#recentList").querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => {
      write(STORAGE.recent, read(STORAGE.recent).filter(item => item.id !== button.dataset.remove));
      renderRecent(); showToast("상품 기록을 삭제했어요.");
    }));
  }
  function renderPayments() {
    const payments = read(STORAGE.payments).sort((a,b) => a.date.localeCompare(b.date));
    $("#monthlyTotal").textContent = money(payments.reduce((sum, item) => sum + Number(item.amount || 0), 0));
    $("#paymentList").innerHTML = payments.map(item => {
      const days = Math.ceil((new Date(item.date+"T00:00:00") - new Date(new Date().toDateString())) / 86400000);
      const dueText = days < 0 ? "결제일 지남" : days === 0 ? "오늘 결제 예정" : `${item.date} · ${days}일 남음`;
      const reminder = item.reminder && days >= 0 && days <= 3 ? " · 알림 확인" : "";
      return `<div class="payment-item"><span class="payment-symbol">₩</span><div class="payment-info"><strong>${escapeHTML(item.name)}</strong><small>${dueText}${reminder}</small></div><div class="payment-amount">${money(Number(item.amount)||0)}<small>예상 금액</small></div><button class="delete-payment" data-delete-payment="${escapeHTML(item.id)}" aria-label="결제 일정 삭제">×</button></div>`;
    }).join("");
    $("#paymentList").querySelectorAll("[data-delete-payment]").forEach(button => button.addEventListener("click", () => {
      write(STORAGE.payments, read(STORAGE.payments).filter(item => item.id !== button.dataset.deletePayment));
      renderPayments(); showToast("결제 일정을 삭제했어요.");
    }));
  }

  $("#compareForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = normalizeName($("#productSearch").value);
    $("#productSearch").value = name;
    renderOffers(name);
  });
  document.querySelectorAll("[data-search]").forEach(button => button.addEventListener("click", () => {
    $("#productSearch").value = button.dataset.search;
    renderOffers(button.dataset.search);
  }));
  $("#clearSearch").addEventListener("click", () => { $("#productSearch").value = ""; $("#productSearch").focus(); });
  $("#saveComparison").addEventListener("click", () => {
    if (!currentOffers.length) return showToast("먼저 비교 가능한 상품을 검색해 주세요.");
    write(STORAGE.comparison, {product:currentProduct, offers:currentOffers, savedAt:Date.now()});
    showToast("현재 비교 결과를 이 브라우저에 저장했어요.");
  });
  $("#clearRecent").addEventListener("click", () => {
    if (!read(STORAGE.recent).length) return showToast("삭제할 상품 기록이 없어요.");
    write(STORAGE.recent, []); renderRecent(); showToast("최근 본 상품 기록을 모두 삭제했어요.");
  });
  $("#paymentForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#serviceName").value.trim();
    const amount = Number($("#serviceAmount").value);
    const date = $("#serviceDate").value;
    if (!name || !date || !Number.isFinite(amount) || amount < 0) return showToast("서비스 이름, 금액, 결제일을 확인해 주세요.");
    const payments = read(STORAGE.payments);
    payments.push({id:`payment-${Date.now()}-${Math.random().toString(16).slice(2,7)}`, name, amount, date, reminder:$("#serviceReminder").checked});
    if (write(STORAGE.payments, payments)) {
      $("#paymentForm").reset();
      $("#serviceReminder").checked = true;
      renderPayments(); showToast("결제 일정을 등록했어요.");
    }
  });
  $("#profileButton").addEventListener("click", () => showToast("상품 기록과 결제 일정은 이 기기의 브라우저에 저장돼요."));
  renderOffers(currentProduct);
  renderRecent();
  renderPayments();
})();