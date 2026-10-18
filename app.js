(() => {
  const cfg = window.PHONE_BOX_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const money = (n) => (Number(n) || 0).toFixed(2) + ' د.أ';
  const state = { supabase: null, products: [], categories: [], cart: JSON.parse(localStorage.getItem('pb-cart') || '[]'), category: '', query: '' };
  const toast = (msg) => { const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
  const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageFor = (p) => p.image_url || (Array.isArray(p.images) && p.images[0]) || '';
  const fallbackImage = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500"><rect width="100%" height="100%" fill="#f0efec"/><g fill="none" stroke="#b6b4ae" stroke-width="5"><rect x="235" y="100" width="130" height="245" rx="24"/><circle cx="300" cy="310" r="5"/></g><text x="300" y="400" text-anchor="middle" fill="#686761" font-family="Arial" font-size="22">PHONE BOX</text></svg>');
  const categoryName = (id) => state.categories.find(c => String(c.id) === String(id))?.name || 'إكسسوارات متنوعة';
  function renderCategories() {
    const grid = $('#categoryGrid'), filter = $('#categoryFilter');
    const active = state.categories.filter(c => c.is_active !== false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const norm = v => String(v||'').toLowerCase().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[^a-z0-9\u0600-\u06FF]+/g,' ').trim();
    const mainRules = [
      {key:'chargers', terms:['شواحن','شاحن','charger','charging'], label:'الشواحن'},
      {key:'airpods', terms:['ايربود','airpods','air pods','سماعات ابل'], label:'AirPods'},
      {key:'powerbank', terms:['باور بانك','باوربانك','power bank','powerbank'], label:'باور بانك'},
      {key:'cases', terms:['كفرات','كفر','cases','phone case','حافظات الموبايل'], label:'الكفرات'}
    ];
    const main = [];
    const used = new Set();
    for (const rule of mainRules) {
      let found = active.find(c => !used.has(String(c.id)) && rule.terms.some(t => norm(c.name).includes(norm(t))));
      if (!found && rule.key==='airpods') found = active.find(c => !used.has(String(c.id)) && /سماعات|سماعه|earbuds|headphones/.test(norm(c.name)));
      if (found) { main.push({...found, _displayLabel:rule.label}); used.add(String(found.id)); }
    }
    if (grid) {
      grid.innerHTML = main.length ? main.map(c => '<button class="category-card '+(String(state.category)===String(c.id)?'selected':'')+'" data-category="'+escapeHtml(c.id)+'"><span class="category-symbol">'+(c._displayLabel==='الشواحن'?'ϟ':c._displayLabel==='AirPods'?'◉':c._displayLabel==='باور بانك'?'▰':'◇')+'</span><strong>'+escapeHtml(c._displayLabel)+'</strong><small>استكشف المنتجات ←</small></button>').join('') : '<div class="loading-state">التصنيفات الرئيسية قيد التجهيز.</div>';
    }
    const other = active.filter(c => !used.has(String(c.id)));
    const otherLinks = $('#otherCategoryLinks');
    if (otherLinks) otherLinks.innerHTML = other.length ? other.map(c=>'<button type="button" class="drawer-category-link" data-category="'+escapeHtml(c.id)+'">'+escapeHtml(c.name)+' <span>←</span></button>').join('') : '<p class="drawer-empty">سيتم إضافة باقي التصنيفات قريبًا.</p>';
    if (filter) {
      const current = filter.value;
      filter.innerHTML = '<option value="">كل التصنيفات</option>' + active.map(c => '<option value="'+escapeHtml(c.id)+'">'+escapeHtml(c.name)+'</option>').join('');
      filter.value = current || state.category || '';
    }
  }
  function renderProducts() {
    const grid = $('#productGrid'); if (!grid) return;
    const products = state.products.filter(p => p.is_active !== false && (!state.category || String(p.category_id)===String(state.category)) && (!state.query || (p.name+' '+(p.brand||'')+' '+(p.description||'')).toLowerCase().includes(state.query.toLowerCase())));
    $('#resultCount').textContent = products.length + ' منتج';
    $('#emptyState').classList.toggle('hidden', products.length !== 0);
    grid.innerHTML = products.map(p => {
      const img = imageFor(p);
      return '<article class="product-card"><div class="product-image-wrap">'+(p.is_featured?'<span class="product-badge">اختيار مميز</span>':'')+'<img class="product-image" loading="lazy" src="'+escapeHtml(img || fallbackImage)+'" alt="'+escapeHtml(p.name)+'" onerror="this.onerror=null;this.src=\''+fallbackImage+'\'"></div><div class="product-info"><span class="product-category">'+escapeHtml(categoryName(p.category_id))+'</span><h3>'+escapeHtml(p.name)+'</h3>'+(p.brand?'<p class="product-brand">'+escapeHtml(p.brand)+'</p>':'')+'<div class="product-card-bottom"><a class="add-button" href="https://wa.me/'+escapeHtml(cfg.whatsappNumber||'962799350131')+'?text='+encodeURIComponent('مرحبًا، بدي أستفسر عن المنتج: '+p.name+(p.brand?' ('+p.brand+')':''))+'" target="_blank" rel="noopener">استفسر عن السعر ↗</a></div></div></article>';
    }).join('');
  }
  function saveCart() { localStorage.setItem('pb-cart', JSON.stringify(state.cart)); renderCart(); }
  function renderCart() {
    const count = state.cart.reduce((n,i)=>n+i.qty,0); $('#cartCount').textContent = count;
    $('#cartItems').innerHTML = state.cart.length ? state.cart.map(i=>'<div class="cart-item"><div class="cart-item-main"><strong>'+escapeHtml(i.name)+'</strong><small>'+money(i.price)+'</small></div><div class="quantity-control"><button data-qty="'+i.id+'" data-delta="-1" aria-label="تقليل">−</button><span>'+i.qty+'</span><button data-qty="'+i.id+'" data-delta="1" aria-label="زيادة">+</button><button class="remove-item" data-remove="'+i.id+'" aria-label="حذف">×</button></div></div>').join('') : '<div class="empty-cart"><span>🛍</span><p>سلتك لسه فاضية.</p><button class="button button-dark" id="shopFromCart">تصفّح المنتجات</button></div>';
    $('#cartTotal').textContent = money(state.cart.reduce((n,i)=>n+i.price*i.qty,0));
  }
  async function loadData() {
    const grid = $('#productGrid');
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey || cfg.supabaseAnonKey.includes('PASTE_YOUR')) {
      if (grid) grid.innerHTML = '<div class="loading-state setup-notice"><strong>المتجر جاهز للربط بقاعدة البيانات.</strong><p>يلزم إضافة مفتاح Supabase Publishable/anon إلى config.js حتى تظهر المنتجات والتصنيفات.</p><a href="https://supabase.com/dashboard/project/aeesxjplfummhkazwjha/settings/api-keys" target="_blank" rel="noopener">افتح إعدادات مفاتيح Supabase ↗</a></div>';
      $('#categoryGrid').innerHTML = '<div class="loading-state">بانتظار إعداد الاتصال بقاعدة البيانات.</div>'; $('#resultCount').textContent=''; return;
    }
    state.supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const [cats, prods] = await Promise.all([
      state.supabase.from('categories').select('*').eq('is_active',true).order('sort_order'),
      state.supabase.from('products').select('*').eq('is_active',true).order('sort_order')
    ]);
    if (cats.error || prods.error) { grid.innerHTML='<div class="loading-state">تعذّر تحميل البيانات. تأكد من مفتاح Supabase وسياسات الوصول.</div>'; toast('تعذّر الاتصال بقاعدة البيانات'); return; }
    state.categories = cats.data || []; state.products = prods.data || [];
    renderCategories(); renderProducts();
  }
  const drawer = $('#sideDrawer'), backdrop = $('#drawerBackdrop'), menuToggle = $('#menuToggle');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    if (backdrop) backdrop.classList.toggle('visible', open);
    drawer.setAttribute('aria-hidden', String(!open));
    if (menuToggle) menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('drawer-open', open);
  }
  if (menuToggle) menuToggle.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  if ($('#closeDrawer')) $('#closeDrawer').addEventListener('click', () => setDrawer(false));
  if (backdrop) backdrop.addEventListener('click', () => setDrawer(false));
  if ($('#otherProductsToggle')) $('#otherProductsToggle').addEventListener('click', () => {
    const panel = $('#otherProductsMenu'), button = $('#otherProductsToggle');
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    const sign = button.querySelector('span');
    if (sign) sign.textContent = open ? '−' : '＋';
  });
  const chooseCategory = (cat) => {
    if (!cat) return;
    state.category = cat.dataset.category;
    const filter = $('#categoryFilter');
    if (filter) filter.value = state.category;
    renderCategories(); renderProducts();
    if (drawer && drawer.contains(cat)) setDrawer(false);
    requestAnimationFrame(() => $('#products')?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  $('#categoryGrid')?.addEventListener('click', e => {
    const cat = e.target.closest('[data-category]');
    if (cat) { e.preventDefault(); chooseCategory(cat); }
  });
  document.querySelectorAll('.desktop-nav a, .hero-actions a[href^="#"], .mobile-quick-nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({behavior:'smooth',block:'start'}); if (drawer?.contains(link)) setDrawer(false); }
    });
  });
  $('#quickSearch')?.addEventListener('click', () => {
    $('#products')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(() => $('#searchInput')?.focus({preventScroll:true}), 350);
  });
  document.addEventListener('click', e => {
    const cat = e.target.closest('[data-category]'); if (cat && !$('#categoryGrid')?.contains(cat)) chooseCategory(cat);
    const add = e.target.closest('[data-add]'); if (add) { const p=state.products.find(x=>String(x.id)===add.dataset.add); if(!p)return; const item=state.cart.find(x=>String(x.id)===String(p.id)); if(item)item.qty++; else state.cart.push({id:p.id,name:p.name,price:Number(p.price)||0,qty:1}); saveCart(); toast('انضاف المنتج للسلة'); }
    const qty = e.target.closest('[data-qty]'); if(qty) { const item=state.cart.find(x=>String(x.id)===qty.dataset.qty); if(item){item.qty+=Number(qty.dataset.delta); if(item.qty<=0)state.cart=state.cart.filter(x=>x!==item);saveCart();} }
    const remove=e.target.closest('[data-remove]'); if(remove){state.cart=state.cart.filter(x=>String(x.id)!==remove.dataset.remove);saveCart();}
    if(e.target.closest('#openCart')) $('#cartOverlay').classList.remove('hidden');
    if(e.target.closest('#closeCart') || e.target.id==='cartOverlay') $('#cartOverlay').classList.add('hidden');
    if(e.target.closest('#clearFilters') || e.target.closest('#emptyClear')) {state.category='';state.query='';$('#searchInput').value='';$('#categoryFilter').value='';renderCategories();renderProducts();}
    if(e.target.closest('#shopFromCart')) {$('#cartOverlay').classList.add('hidden');$('#products').scrollIntoView({behavior:'smooth'});}
  });
  $('#searchInput').addEventListener('input', e=>{state.query=e.target.value;renderProducts();});
  $('#categoryFilter').addEventListener('change',e=>{state.category=e.target.value;renderCategories();renderProducts();});
  $('#fulfillment').addEventListener('change',e=>{$('#addressWrap').classList.toggle('hidden',e.target.value!=='delivery');$('#customerAddress').required=e.target.value==='delivery';});
  $('#checkoutForm').addEventListener('submit',e=>{
    e.preventDefault(); if(!state.cart.length){toast('أضف منتجًا للسلة أولًا');return;}
    const name=$('#customerName').value.trim(), phone=$('#customerPhone').value.trim(), delivery=$('#fulfillment').value==='delivery', address=$('#customerAddress').value.trim();
    if(delivery&&!address){toast('اكتب عنوان التوصيل');return;}
    const lines=state.cart.map(i=>'• '+i.name+' × '+i.qty+' = '+money(i.price*i.qty));
    const total=state.cart.reduce((n,i)=>n+i.price*i.qty,0);
    const msg=['طلب جديد من '+(cfg.storeName||'PHONE BOX'),'الاسم: '+name,'رقم الهاتف: '+phone,'طريقة الاستلام: '+(delivery?'توصيل':'استلام من المحل'),...(delivery?['العنوان: '+address]:[]),'','المنتجات:',...lines,'','المجموع: '+money(total)].join('\n');
    window.open('https://wa.me/'+(cfg.whatsappNumber||'962799350131')+'?text='+encodeURIComponent(msg),'_blank','noopener');
  });
  $('#year').textContent=new Date().getFullYear(); renderCart(); loadData();
})();