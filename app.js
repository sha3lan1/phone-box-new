(() => {
  const cfg=window.PHONE_BOX_CONFIG||{}, $=s=>document.querySelector(s);
  const state={supabase:null,products:[],categories:[],cart:JSON.parse(localStorage.getItem('pb-cart')||'[]'),category:'',query:'',detail:null};
  const escapeHtml=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[^a-z0-9\u0600-\u06FF]+/g,' ').trim();
  const fallbackImage='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500"><rect width="100%" height="100%" fill="#f0efec"/><g fill="none" stroke="#b6b4ae" stroke-width="5"><rect x="235" y="100" width="130" height="245" rx="24"/></g><text x="300" y="400" text-anchor="middle" fill="#686761" font-family="Arial" font-size="22">PHONE BOX</text></svg>');
  const imageFor=p=>p?.image_url||(Array.isArray(p?.images)&&p.images[0])||'';
  const categoryDisplayName=name=>{
    const n=norm(name);
    const rules=[
      [/screen protector|tempered glass|privacy glass|screen guard|camera lens protector|لزقات الحمايه|حمايه الشاشه/,'Screen Protectors'],
      [/airpods case|earbuds case|كفرات ايربود|كفر ايربود/,'AirPods Cases'],
      [/phone case|phone cover|mobile case|كفرات الموبايل|حافظات الموبايل|جرابات الموبايل|كفرات ايفون|كفرات سامسونج|^كفرات$|^كفر$/,'Phone Cases'],
      [/power bank|powerbank|باور بانك|باوربانك/,'Power Banks'],
      [/car charger|شاحن سياره|شواحن السيارات/,'Car Chargers'],
      [/car mount|car holder|dashboard mount|هولدر سياره|حامل سياره|حوامل السيارات/,'Car Mounts'],
      [/wireless charger|magsafe charger|شاحن لاسلكي/,'Wireless Chargers'],
      [/charger|charging|wall charger|gan charger|شاحن|شواحن/,'Chargers'],
      [/cable|cables|caple|cabel|wire|كيبل|كابل|كوابل|كابلات|اسلاك/,'Cables'],
      [/adapter|converter|dongle|usb hub|otg|محول|محولات|ادابتور/,'Adapters & Hubs'],
      [/headphone|headset|over ear|هيدفون|سماعات الراس/,'Headphones'],
      [/earbud|airpods|earphone|ايربود|سماعات ابل|سماعات لاسلكيه/,'AirPods & Earbuds'],
      [/watch|smartwatch|apple watch|ساعات|اكسسوارات الساعات/,'Watch Accessories'],
      [/selfie stick|tripod|gimbal|عصا سيلفي|ترايبود/,'Selfie Sticks & Tripods'],
      [/ring light|رينج لايت/,'Ring Lights'],
      [/stand|holder|ستاند|حوامل الموبايل/,'Phone Stands'],
      [/memory card|flash drive|usb drive|ذاكره|فلاش ميموري/,'Memory Cards & USB Drives'],
      [/cleaning|cleaner|تنظيف/,'Cleaning Kits'],
      [/stylus|قلم لمس|قلم ايباد/,'Styluses'],
      [/tablet|ipad|تابلت|ايباد/,'Tablet Accessories'],
      [/aux|audio adapter|محول صوت/,'Audio Adapters'],
      [/screen cleaning|cleaning kit/,'Cleaning Kits'],
      [/car accessories|اكسسوارات السياره/,'Car Accessories'],
      [/gaming|gamepad|controller|العاب|يد تحكم/,'Gaming Accessories'],
      [/microphone|mic|مايكروفون|مايك/,'Microphones'],
      [/speaker|bluetooth speaker|سبيكر|مكبر صوت/,'Bluetooth Speakers'],
      [/sim eject|sim pin|دبوس الشريحه/,'SIM Tools']
    ];
    for(const [re,label] of rules)if(re.test(n))return label;
    if(!name)return 'Needs Classification';
    return name;
  };
  const categoryIdForProduct=p=>String(p.category_id||'');
  const categoryName=id=>{const c=state.categories.find(x=>String(x.id)===String(id));return c?categoryDisplayName(c.name):'Needs Classification';};
  const toast=msg=>{const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200);};
  function categoryGroup(name){const label=categoryDisplayName(name);return label;}
  function findMainCategory(keys){
    return state.categories.find(c=>keys.some(k=>norm(categoryDisplayName(c.name)).includes(norm(k))||norm(c.name).includes(norm(k))));
  }
  function renderCategories(){
    const grid=$('#categoryGrid'),filter=$('#categoryFilter');
    const active=state.categories.filter(c=>c.is_active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const specs=[
      {key:'chargers',label:'Chargers',terms:['chargers','wall chargers','شواحن','شاحن']},
      {key:'earbuds',label:'AirPods & Earbuds',terms:['airpods & earbuds','earbuds','airpods','سماعات','ايربود']},
      {key:'powerbanks',label:'Power Banks',terms:['power banks','power bank','باور بانك']},
      {key:'cases',label:'Phone Cases',terms:['phone cases','phone case','phone covers','كفرات','كفر']}
    ];
    const used=new Set(),main=[];
    for(const spec of specs){
      const c=active.find(x=>!used.has(String(x.id))&&spec.terms.some(t=>norm(categoryDisplayName(x.name)).includes(norm(t))||norm(x.name).includes(norm(t))));
      if(c){used.add(String(c.id));const p=state.products.find(p=>String(p.category_id)===String(c.id)&&imageFor(p));main.push({...c,_label:spec.label,_product:p||state.products.find(p=>String(p.category_id)===String(c.id))});}
      else main.push({_label:spec.label,_product:state.products.find(p=>spec.terms.some(t=>norm(p.name+' '+(p.description||'')+' '+(p.brand||'')).includes(norm(t)))&&imageFor(p)),_missing:true});
    }
    if(grid)grid.innerHTML=main.map((c,i)=>{
      const img=imageFor(c._product);
      const inner=img?'<img class="category-photo" loading="lazy" src="'+escapeHtml(img)+'" alt="'+escapeHtml(c._label)+'" onerror="this.style.display=\'none\'">':'<span class="category-symbol">'+['ϟ','◉','▰','◇'][i]+'</span>';
      return '<button type="button" class="category-card '+(String(state.category)===String(c.id)?'selected':'')+'" '+(c.id?'data-category="'+escapeHtml(c.id)+'"':'data-main-category="'+escapeHtml(c._label)+'"')+'><span class="category-photo-wrap">'+inner+'</span><span class="category-card-copy"><strong>'+escapeHtml(c._label)+'</strong><small>View products →</small></span></button>';
    }).join('');
    const other=active.filter(c=>!used.has(String(c.id)));
    const links=$('#otherCategoryLinks');
    if(links)links.innerHTML=other.map(c=>'<button type="button" class="drawer-category-link" data-category="'+escapeHtml(c.id)+'">'+escapeHtml(categoryDisplayName(c.name))+' <span>→</span></button>').join('')||'<p class="drawer-empty">No additional categories yet.</p>';
    if(filter){const old=filter.value;filter.innerHTML='<option value="">All Categories</option>'+active.map(c=>'<option value="'+escapeHtml(c.id)+'">'+escapeHtml(categoryDisplayName(c.name))+'</option>').join('');filter.value=old||state.category||'';}
  }
  function renderProducts(){
    const grid=$('#productGrid');if(!grid)return;
    const filtered=state.products.filter(p=>p.is_active!==false&&(!state.category||String(p.category_id)===String(state.category))&&(!state.query||norm(p.name+' '+(p.brand||'')+' '+(p.description||'')).includes(norm(state.query))));
    $('#resultCount').textContent=filtered.length+' products';
    $('#emptyState').classList.toggle('hidden',filtered.length!==0);
    grid.innerHTML=filtered.map(p=>{
      const img=imageFor(p)||fallbackImage;
      return '<article class="product-card" data-open-product="'+escapeHtml(p.id)+'"><div class="product-image-wrap">'+(p.is_featured?'<span class="product-badge">Featured</span>':'')+'<img class="product-image" loading="lazy" src="'+escapeHtml(img)+'" alt="'+escapeHtml(p.name)+'" onerror="this.onerror=null;this.src=\''+fallbackImage+'\'"></div><div class="product-info"><span class="product-category">'+escapeHtml(categoryName(p.category_id))+'</span><h3>'+escapeHtml(p.name)+'</h3>'+(p.brand?'<p class="product-brand">'+escapeHtml(p.brand)+'</p>':'')+(p.description?'<p class="product-description">'+escapeHtml(p.description.replace(/<[^>]*>/g,' '))+'</p>':'')+'<div class="product-card-bottom"><button type="button" class="add-button" data-details="'+escapeHtml(p.id)+'">View Details</button></div></div></article>';
    }).join('');
  }
  function openProduct(id){
    const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;
    state.detail=p;
    $('#detailImage').src=imageFor(p)||fallbackImage;$('#detailImage').alt=p.name;
    $('#detailCategory').textContent=categoryName(p.category_id);$('#detailName').textContent=p.name;
    $('#detailBrand').textContent=p.brand||'';
    $('#detailDescription').textContent=(p.description||'Product details are not available yet.').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').trim();
    $('#productDetailOverlay').classList.remove('hidden');document.body.classList.add('no-scroll');
  }
  function closeProduct(){ $('#productDetailOverlay').classList.add('hidden');if(!$('#cartOverlay')||$('#cartOverlay').classList.contains('hidden'))document.body.classList.remove('no-scroll');state.detail=null;}
  function saveCart(){localStorage.setItem('pb-cart',JSON.stringify(state.cart));renderCart();}
  function renderCart(){
    $('#cartCount').textContent=state.cart.reduce((n,i)=>n+i.qty,0);
    $('#cartItems').innerHTML=state.cart.length?state.cart.map(i=>'<div class="cart-item"><img src="'+escapeHtml(i.image||fallbackImage)+'" alt=""><div class="cart-item-main"><strong>'+escapeHtml(i.name)+'</strong><small>'+escapeHtml(i.brand||categoryName(i.category_id))+'</small><div class="quantity-control"><button type="button" data-qty="'+escapeHtml(i.id)+'" data-delta="-1" aria-label="Decrease quantity">−</button><span>'+i.qty+'</span><button type="button" data-qty="'+escapeHtml(i.id)+'" data-delta="1" aria-label="Increase quantity">+</button></div></div><button type="button" class="remove-item" data-remove="'+escapeHtml(i.id)+'" aria-label="Remove item">×</button></div>').join(''):'<div class="empty-cart"><span>🛍</span><p>Your cart is empty.</p><button class="button button-dark" id="shopFromCart" type="button">Browse Products</button></div>';
    $('#cartTotal').textContent='Prices are confirmed by WhatsApp';
  }
  function addToCart(p){
    const item=state.cart.find(x=>String(x.id)===String(p.id));
    if(item)item.qty++;else state.cart.push({id:p.id,name:p.name,brand:p.brand||'',category_id:p.category_id,image:imageFor(p),description:p.description||'',qty:1});
    saveCart();toast('Added to cart');closeProduct();
  }
  async function loadData(){
    const grid=$('#productGrid');
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey||cfg.supabaseAnonKey.includes('PASTE_YOUR')){
      grid.innerHTML='<div class="loading-state setup-notice"><strong>Store database is not connected.</strong><p>Check the Supabase publishable key in config.js.</p></div>';$('#categoryGrid').innerHTML='<div class="loading-state">Waiting for database connection.</div>';return;
    }
    state.supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    const [cats,prods]=await Promise.all([state.supabase.from('categories').select('*').eq('is_active',true).order('sort_order'),state.supabase.from('products').select('*').eq('is_active',true).order('sort_order')]);
    if(cats.error||prods.error){grid.innerHTML='<div class="loading-state">Could not load products. Please try again later.</div>';toast('Database connection failed');return;}
    state.categories=cats.data||[];state.products=prods.data||[];
    renderCategories();renderProducts();
  }
  const drawer=$('#sideDrawer'),backdrop=$('#drawerBackdrop'),menuToggle=$('#menuToggle');
  function setDrawer(open){
    if(!drawer)return;drawer.classList.toggle('open',open);backdrop?.classList.toggle('visible',open);drawer.setAttribute('aria-hidden',String(!open));menuToggle?.setAttribute('aria-expanded',String(open));document.body.classList.toggle('drawer-open',open);
    if(!open){const panel=$('#otherProductsMenu'),btn=$('#otherProductsToggle');if(panel)panel.hidden=true;if(btn)btn.setAttribute('aria-expanded','false');}
  }
  menuToggle?.addEventListener('click',()=>setDrawer(!drawer.classList.contains('open')));
  $('#closeDrawer')?.addEventListener('click',()=>setDrawer(false));backdrop?.addEventListener('click',()=>setDrawer(false));
  $('#otherProductsToggle')?.addEventListener('click',()=>{
    const panel=$('#otherProductsMenu'),btn=$('#otherProductsToggle');if(!panel||!btn)return;
    const opening=panel.hidden;panel.hidden=!opening;btn.setAttribute('aria-expanded',String(opening));const sign=btn.querySelector('span');if(sign)sign.textContent=opening?'−':'＋';
  });
  const scrollToProducts=()=>$('#products')?.scrollIntoView({behavior:'smooth',block:'start'});
  document.addEventListener('click',e=>{
    const detail=e.target.closest('[data-details]');if(detail){e.preventDefault();openProduct(detail.dataset.details);return;}
    const add=e.target.closest('[data-add-detail]');if(add&&state.detail){addToCart(state.detail);return;}
    const openCard=e.target.closest('[data-open-product]');if(openCard&&!e.target.closest('button')){openProduct(openCard.dataset.openProduct);return;}
    const cat=e.target.closest('[data-category]');if(cat){e.preventDefault();state.category=cat.dataset.category;$('#categoryFilter').value=state.category;renderCategories();renderProducts();if(drawer?.contains(cat))setDrawer(false);requestAnimationFrame(scrollToProducts);return;}
    const mainCat=e.target.closest('[data-main-category]');if(mainCat){const label=mainCat.dataset.mainCategory;const c=state.categories.find(x=>categoryDisplayName(x.name)===label);if(c){state.category=c.id;$('#categoryFilter').value=state.category;renderCategories();renderProducts();requestAnimationFrame(scrollToProducts);}else toast('No products in this category yet.');return;}
    const addToCartBtn=e.target.closest('[data-add]');if(addToCartBtn){const p=state.products.find(x=>String(x.id)===String(addToCartBtn.dataset.add));if(p)addToCart(p);return;}
    const qty=e.target.closest('[data-qty]');if(qty){const item=state.cart.find(x=>String(x.id)===qty.dataset.qty);if(item){item.qty+=Number(qty.dataset.delta);if(item.qty<=0)state.cart=state.cart.filter(x=>x!==item);saveCart();}return;}
    const remove=e.target.closest('[data-remove]');if(remove){state.cart=state.cart.filter(x=>String(x.id)!==remove.dataset.remove);saveCart();return;}
    if(e.target.closest('#openCart')){$('#cartOverlay').classList.remove('hidden');document.body.classList.add('no-scroll');return;}
    if(e.target.closest('#closeCart')||e.target.id==='cartOverlay'){ $('#cartOverlay').classList.add('hidden');if($('#productDetailOverlay').classList.contains('hidden'))document.body.classList.remove('no-scroll');return;}
    if(e.target.closest('#closeProductDetail')||e.target.id==='productDetailOverlay'){closeProduct();return;}
    if(e.target.closest('#clearFilters')||e.target.closest('#emptyClear')){state.category='';state.query='';$('#searchInput').value='';$('#categoryFilter').value='';renderCategories();renderProducts();return;}
    if(e.target.closest('#shopFromCart')){$('#cartOverlay').classList.add('hidden');document.body.classList.remove('no-scroll');scrollToProducts();return;}
    const nav=e.target.closest('.desktop-nav a[href^="#"],.hero-actions a[href^="#"],.mobile-quick-nav a[href^="#"]');if(nav){const target=document.querySelector(nav.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});if(drawer?.contains(nav))setDrawer(false);}return;}
  });
  $('#quickSearch')?.addEventListener('click',()=>{scrollToProducts();setTimeout(()=>$('#searchInput')?.focus({preventScroll:true}),250);});
  $('#searchInput')?.addEventListener('input',e=>{state.query=e.target.value;renderProducts();});
  $('#categoryFilter')?.addEventListener('change',e=>{state.category=e.target.value;renderCategories();renderProducts();});
  $('#fulfillment')?.addEventListener('change',e=>{const delivery=e.target.value==='delivery';$('#addressWrap').classList.toggle('hidden',!delivery);$('#customerAddress').required=delivery;$('#customerPhone').required=delivery;});
  $('#checkoutForm')?.addEventListener('submit',e=>{
    e.preventDefault();if(!state.cart.length){toast('Your cart is empty');return;}
    const delivery=$('#fulfillment').value==='delivery',name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),address=$('#customerAddress').value.trim();
    if(delivery&&(!phone||!address)){toast('Enter your phone number and delivery location');return;}
    const items=state.cart.map(i=>'• '+i.name+(i.brand?' — '+i.brand:'')+' × '+i.qty).join('\n');
    const msg=delivery?
      ['السلام عليكم، طلبت المنتجات التالية من موقعكم الإلكتروني PHONE BOX وأرغب بتأكيد الطلب:','',items,'','رقم هاتفي: '+phone,'موقعي للتوصيل: '+address,'يرجى تأكيد توفر المنتجات وتكلفة التوصيل قبل الإرسال.'].join('\n'):
      ['السلام عليكم، اخترت المنتجات التالية من موقعكم الإلكتروني PHONE BOX:','',items,'','حاب أستلمها من المحل، ممكن تبعتولي لوكيشن المحل لو تكرمتوا؟',name?'الاسم: '+name:''].filter(Boolean).join('\n');
    window.open('https://wa.me/'+(cfg.whatsappNumber||'962799350131')+'?text='+encodeURIComponent(msg),'_blank','noopener');
  });
  $('#year').textContent=new Date().getFullYear();renderCart();loadData();
})();