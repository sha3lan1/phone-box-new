(() => {
 const cfg=window.PHONE_BOX_CONFIG||{}, $=s=>document.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>(Number(n)||0).toFixed(2)+' د.أ';
 let db=null, cats=[], products=[], editing=null;
 const say=(id,msg)=>{const el=$(id);if(el)el.textContent=msg;};
 if(!window.supabase||!cfg.supabaseAnonKey||cfg.supabaseAnonKey.includes('PASTE_YOUR')){$('#configNotice').classList.remove('hidden');}
 else { $('#configNotice').classList.add('hidden'); $('#loginPanel').classList.remove('hidden'); db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey); init(); }
 async function init(){const {data:{session}}=await db.auth.getSession(); if(session) await showDashboard(); db.auth.onAuthStateChange((_event,session)=>{if(session)showDashboard();else {$('#dashboard').classList.add('hidden');$('#loginPanel').classList.remove('hidden');}});}
 $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();say('#loginMessage','جارٍ تسجيل الدخول…');const {error}=await db.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});say('#loginMessage',error?'تعذّر تسجيل الدخول: '+error.message:'تم تسجيل الدخول.');if(!error)await showDashboard();});
 $('#logoutButton').addEventListener('click',async()=>{await db.auth.signOut();});
 async function showDashboard(){ $('#loginPanel').classList.add('hidden');$('#dashboard').classList.remove('hidden'); await loadAll();}
 async function loadAll(){
   let [c,p]=await Promise.all([db.from('categories').select('*').order('sort_order'),db.from('products').select('*').order('created_at',{ascending:false})]);
   if(c.error||p.error){say('#formMessage','Could not load data. Check Supabase admin permissions.');return;}
   cats=c.data||[];products=p.data||[];
   for(const category of cats){
     const group=categoryGroup(category.name), english=group?categoryLabels[group]:null;
     if(english&&category.name!==english){
       const result=await db.from('categories').update({name:english}).eq('id',category.id);
       if(!result.error)category.name=english;
     }
   }
   cats.sort((x,y)=>(x.sort_order||0)-(y.sort_order||0));
   $('#productCategory').innerHTML=cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
   $('#adminCategories').innerHTML=cats.map(c=>'<span class="admin-category-chip">'+esc(c.name)+'</span>').join('');
   renderList();
 }
 function renderList(){ $('#adminProductList').innerHTML=products.length?products.map(p=>'<div class="admin-product-row"><div class="admin-product-details"><strong>'+esc(p.name)+'</strong><small>'+money(p.price)+' · المخزون: '+p.stock_quantity+' · '+(p.is_active?'ظاهر':'مخفي')+'</small></div><button class="clear-button" data-edit="'+p.id+'">تعديل</button><button class="clear-button danger-button" data-delete="'+p.id+'">حذف</button></div>').join(''):'<p>لا توجد منتجات بعد. أضف أول منتج من النموذج أعلاه.</p>'; }
 function resetForm(){editing=null;$('#productForm').reset();$('#productId').value='';$('#productStock').value='0';$('#productActive').checked=true;$('#formTitle').textContent='إضافة منتج جديد';$('#saveProduct').textContent='حفظ المنتج';$('#cancelEdit').classList.add('hidden');say('#formMessage','');}
 $('#cancelEdit').addEventListener('click',resetForm);
 $('#adminProductList').addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');if(edit){const p=products.find(x=>String(x.id)===edit.dataset.edit);if(!p)return;editing=p;$('#productId').value=p.id;$('#productName').value=p.name||'';$('#productBrand').value=p.brand||'';$('#productCategory').value=p.category_id||'';$('#productPrice').value=p.price??0;$('#productStock').value=p.stock_quantity??0;$('#productDescription').value=p.description||'';$('#productFeatured').checked=!!p.is_featured;$('#productActive').checked=!!p.is_active;$('#formTitle').textContent='تعديل المنتج';$('#saveProduct').textContent='حفظ التعديلات';$('#cancelEdit').classList.remove('hidden');$('#productForm').scrollIntoView({behavior:'smooth'});}
 const del=e.target.closest('[data-delete]');if(del){const p=products.find(x=>String(x.id)===del.dataset.delete);if(!p||!confirm('متأكد إنك بدك تحذف '+p.name+'؟'))return;const {error}=await db.from('products').delete().eq('id',p.id);if(error){say('#formMessage','تعذّر الحذف: '+error.message);return;}if(p.image_path)await db.storage.from('product-images').remove([p.image_path]);await loadAll();say('#formMessage','تم حذف المنتج.');}});
 $('#productForm').addEventListener('submit',async e=>{e.preventDefault();const button=$('#saveProduct');button.disabled=true;say('#formMessage','جارٍ حفظ المنتج…');try{
 let image_url=editing?.image_url||null, image_path=editing?.image_path||null;const file=$('#productImage').files[0];
 if(file){if(!file.type.startsWith('image/'))throw new Error('اختر ملف صورة صالحًا.');if(file.size>8*1024*1024)throw new Error('حجم الصورة أكبر من 8 ميغابايت.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=Date.now()+'-'+Math.random().toString(36).slice(2,9)+'.'+ext;const {error:uploadError}=await db.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type});if(uploadError)throw uploadError;const {data}=db.storage.from('product-images').getPublicUrl(path);image_url=data.publicUrl;image_path=path;}
 const payload={name:$('#productName').value.trim(),brand:$('#productBrand').value.trim()||null,category_id:$('#productCategory').value?Number($('#productCategory').value):null,price:Number($('#productPrice').value),stock_quantity:Number($('#productStock').value),description:$('#productDescription').value.trim()||null,is_featured:$('#productFeatured').checked,is_active:$('#productActive').checked,image_url,image_path,updated_at:new Date().toISOString()};
 const res=editing?await db.from('products').update(payload).eq('id',editing.id):await db.from('products').insert(payload);if(res.error)throw res.error;
 if(file&&editing?.image_path&&editing.image_path!==image_path)await db.storage.from('product-images').remove([editing.image_path]);resetForm();await loadAll();say('#formMessage','تم حفظ المنتج بنجاح.');
 }catch(err){say('#formMessage','لم يتم الحفظ: '+(err.message||'حدث خطأ'));}finally{button.disabled=false;}});

 // Product classification by type/name/tags/description, independent of brand.
 const textKey = value => String(value||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[^a-z0-9\\u0600-\\u06FF]+/g,' ').trim();
 const categoryLabels={phone_cases:'Phone Cases',screen_protectors:'Screen Protectors',power_banks:'Power Banks',earbuds:'AirPods & Earbuds',airpods_cases:'AirPods Cases',chargers:'Chargers',wireless_chargers:'Wireless Chargers',cables:'Cables',car_mounts:'Car Mounts',car_chargers:'Car Chargers',adapters:'Adapters & Hubs',headphones:'Headphones',watch_accessories:'Watch Accessories',stands:'Phone Stands',memory_storage:'Memory Cards & USB Drives',cleaning:'Cleaning Kits',selfie_tripods:'Selfie Sticks & Tripods',tablet_accessories:'Tablet Accessories',ring_lights:'Ring Lights',styluses:'Styluses',audio_adapters:'Audio Adapters',wired_earphones:'Wired Earphones',other:'Other Accessories'};
 function categoryGroup(name){
   const n=textKey(name);
   if(/screen protector|tempered glass|privacy glass|camera lens protector|لزقات الحمايه|حمايه الشاشه|لزقات شاشه/.test(n))return 'screen_protectors';
   if(/airpods case|earbuds case|كفرات ايربود|كفر ايربود/.test(n))return 'airpods_cases';
   if(/phone case|phone cover|mobile case|phone covers|كفرات الموبايل|كفر الموبايل|حافظات الموبايل|جرابات الموبايل|^كفرات$|^الكفرات$|^كفر$/.test(n))return 'phone_cases';
   if(/power bank|powerbank|باور بانك|باوربانك|بطاريات متنقله/.test(n))return 'power_banks';
   if(/car charger|شاحن سياره|شواحن السيارات/.test(n))return 'car_chargers';
   if(/car mount|car holder|car mounts|حوامل السيارات|هولدر سياره|حامل سياره/.test(n))return 'car_mounts';
   if(/wireless charger|magnetic charger|magsafe charger|شاحن لاسلكي|شواحن لاسلكيه/.test(n))return 'wireless_chargers';
   if(/charger|charging|wall charger|gan charger|شواحن|شاحن|قواعد الشحن/.test(n))return 'chargers';
   if(/cable|cables|caple|wire|wires|كيبل|كابلات|كوابل|اسلاك|وصله شحن/.test(n))return 'cables';
   if(/adapter|adapters|converter|dongle|usb hub|hubs|otg|محولات|محول|وصلات ومحولات|ادابتور/.test(n))return 'adapters';
   if(/headphone|headphones|headset|over ear|هيدفون|سماعات الراس/.test(n))return 'headphones';
   if(/earbud|airpods|earphone|wired earphones|ايربود|سماعات ابل|سماعات/.test(n))return 'earbuds';
   if(/watch|smartwatch|apple watch|ساعات|الساعات|اكسسوارات الساعات/.test(n))return 'watch_accessories';
   if(/selfie stick|tripod|gimbal|عصا سيلفي|ترايبود/.test(n))return 'selfie_tripods';
   if(/ring light|رينج لايت|اضاءه دائريه/.test(n))return 'ring_lights';
   if(/stand|stands|holder|desktop stand|phone stand|ستاند|حوامل الموبايل|حوامل/.test(n))return 'stands';
   if(/memory card|flash drive|usb drive|flash memory|ذاكره|فلاش ميموري/.test(n))return 'memory_storage';
   if(/cleaning|cleaner|cleaning kit|تنظيف|طقم تنظيف/.test(n))return 'cleaning';
   if(/stylus|pen for tablet|قلم لمس|قلم ايباد/.test(n))return 'styluses';
   if(/tablet|ipad accessories|اكسسوارات التابلت|اكسسوارات الايباد/.test(n))return 'tablet_accessories';
   if(/audio adapter|aux adapter|aux cable|audio cable|محول صوت|وصله aux/.test(n))return 'audio_adapters';
   if(/wired earphone|wired headset|سماعات سلكيه/.test(n))return 'wired_earphones';
   if(/other accessories|miscellaneous|متنوع|اكسسوارات متنوعه|اخرى/.test(n))return 'other';
   return null;
 }
 function detectProductGroup(product){
   const name=textKey(product.title||product.name||''), desc=textKey(String(product.body_html||product.description||'').replace(/<[^>]*>/g,' '));
   const type=textKey(product.product_type||product.category||''), tags=textKey(Array.isArray(product.tags)?product.tags.join(' '):(product.tags||''));
   const primary=type+' '+tags+' '+name;
   const rules=[
    ['screen_protectors',/screen protector|tempered glass|privacy glass|camera lens protector|screen guard|glass protector|لزقه شاشه|حمايه شاشه|حمايه عدسه/],
    ['car_chargers',/car charger|car charging adapter|شاحن سياره|شواحن السيارات/],
    ['car_mounts',/car mount|car holder|dashboard mount|windshield mount|phone holder for car|magnetic car mount|هولدر سياره|حامل سياره/],
    ['power_banks',/power bank|powerbank|portable power|battery pack|باور بانك|بطاريه متنقله/],
    ['cables',/usb c cable|type c cable|lightning cable|charging cable|data cable|aux cable|audio cable|hdmi cable|ethernet cable|\\bcables?\\b|\\bcaple\\b|\\bcaples\\b|\\bcabels?\\b|\\bwires?\\b|كيبل|كابل|وصله شحن|سلك شحن/],
    ['adapters',/adapter|converter|dongle|usb hub|card reader|otg|flash drive|memory card|\\bhub\\b|محول|محولات|قارئ ذاكره|فلاش ميموري/],
    ['wireless_chargers',/wireless charger|magsafe charger|magnetic wireless charger|charging pad|شاحن لاسلكي|شحن لاسلكي/],
    ['chargers',/wall charger|gan charger|power adapter|charging station|\\bcharger\\b|\\bcharging\\b|شاحن|شواحن/],
    ['airpods_cases',/airpods case|airpods cover|earbuds case|case for airpods|كفر ايربود|كفر سماعات/],
    ['phone_cases',/phone case|phone cover|mobile case|protective case|silicone case|clear case|shockproof case|\\bphone cases?\\b|\\bcases? for iphone\\b|كفر موبايل|كفرات موبايل|جراب موبايل|حافظه موبايل/],
    ['selfie_tripods',/selfie stick|tripod|gimbal|عصا سيلفي|ترايبود/],
    ['ring_lights',/ring light|selfie light|رينج لايت/],
    ['watch_accessories',/smart watch|smartwatch|watch band|watch strap|watch charger|apple watch|ساعه ذكيه|سوار ساعه/],
    ['styluses',/stylus|touch pen|tablet pen|apple pencil|قلم لمس|قلم ايباد/],
    ['tablet_accessories',/tablet case|ipad case|tablet stand|ipad accessories|اكسسوارات التابلت|اكسسوارات الايباد/],
    ['memory_storage',/memory card|micro sd|sd card|flash drive|usb drive|pen drive|ذاكره|فلاش ميموري/],
    ['cleaning',/cleaning kit|screen cleaner|cleaning pen|cleaning brush|cleaner kit|طقم تنظيف|ادوات تنظيف/],
    ['stands',/desktop stand|desk stand|phone stand|tablet stand|phone holder|desktop holder|\\bstand\\b|\\bstands\\b|ستاند|حامل موبايل|حامل هاتف/],
    ['headphones',/over ear headphones|headphones|headset|gaming headset|هيدفون|سماعات الراس/],
    ['wired_earphones',/wired earphones|wired earbud|3 5mm earphone|earphones with wire|سماعات سلكيه/],
    ['earbuds',/airpods|wireless earbuds|true wireless|earbuds|tws|bluetooth earphones|ايربود|سماعات لاسلكيه/],
    ['audio_adapters',/aux adapter|audio adapter|headphone adapter|lightning to 3 5mm|usb c to 3 5mm|محول صوت|وصله aux/]
   ];
   for(const [group,pattern] of rules){if(pattern.test(primary))return group;}
   for(const [group,pattern] of rules){if(pattern.test(desc))return group;}
   return null;
 }
 function chooseProductCategory(product,categories){
   const group=detectProductGroup(product);if(!group)return null;
   const found=categories.find(c=>categoryGroup(c.name)===group);if(found)return found.id;
   if(group==='airpods_cases')return categories.find(c=>categoryGroup(c.name)==='phone_cases')?.id||null;
   if(group==='wired_earphones')return categories.find(c=>categoryGroup(c.name)==='earbuds')?.id||null;
   if(group==='audio_adapters')return categories.find(c=>categoryGroup(c.name)==='adapters')?.id||null;
   return null;
 }
 async function importBrand(brand, urls, button) {
   if(!db||!button)return;
   if(!confirm('سيتم جلب المنتجات التي يتيحها '+brand+' للعامة مع صورها. لن تظهر الأسعار للزبائن. متابعة؟'))return;
   button.disabled=true;say('#importMessage','جارٍ جلب منتجات '+brand+'…');
   try{
     let products=null,lastError=null;
     for(const url of urls){
       try{
         const response=await fetch(url,{headers:{Accept:'application/json'}});
         if(!response.ok)throw new Error('HTTP '+response.status);
         const data=await response.json();
         if(Array.isArray(data.products)){products=data.products;break;}
         throw new Error('الكتالوج لا يوفر قائمة JSON بهذا المسار');
       }catch(err){lastError=err;}
     }
     if(!products)throw new Error('الموقع لم يسمح بجلب القائمة مباشرة. '+(lastError?.message||''));
     const [oldRes,catRes]=await Promise.all([db.from('products').select('name,brand'),db.from('categories').select('*').eq('is_active',true)]);
     if(oldRes.error)throw oldRes.error;if(catRes.error)throw catRes.error;
     const old=new Set((oldRes.data||[]).filter(p=>textKey(p.brand)===textKey(brand)).map(p=>textKey(p.name)));
     const rows=[];
     for(const p of products){
       const name=String(p.title||'').trim();if(!name||old.has(textKey(name)))continue;
       const image=(p.images||[]).map(i=>typeof i==='string'?i:i.src).find(Boolean)||p.image?.src||null;
       const description=String(p.body_html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\\s+/g,' ').trim().slice(0,600);
       rows.push({name,brand,category_id:chooseProductCategory({...p,title:name,body_html:description},catRes.data||[]),price:0,stock_quantity:0,description,image_url:image,is_featured:false,is_active:true});
     }
     if(!rows.length){say('#importMessage','لا توجد منتجات جديدة من '+brand+'.');return;}
     let count=0,uncategorized=0;
     for(let i=0;i<rows.length;i+=15){
       const batch=rows.slice(i,i+15);
       const result=await db.from('products').insert(batch).select('id');
       if(result.error)throw new Error('أُضيف '+count+' منتج قبل الخطأ: '+result.error.message);
       count+=(result.data||[]).length;
       uncategorized+=batch.filter(p=>!p.category_id).length;
       say('#importMessage','تمت إضافة '+count+' من '+rows.length+' منتج…');
     }
     await loadAll();
     say('#importMessage','اكتمل استيراد '+brand+': '+count+' منتج. منتجات بلا تصنيف واضح: '+uncategorized+'؛ تُركت دون تصنيف تخميني.');
   }catch(err){say('#importMessage','تعذّر استيراد '+brand+': '+(err.message||'خطأ غير معروف'));}
   finally{button.disabled=false;}
 }
 $('#importJoyroom')?.addEventListener('click',()=>importBrand('JOYROOM',['https://www.joyroom.com/products.json?limit=250','https://www.joyroom.com/collections/all/products.json?limit=250'],$('#importJoyroom')));
 $('#importWiwu')?.addEventListener('click',()=>importBrand('WiWU',['https://www.wiwu.com/products.json?limit=250','https://www.wiwu.com/collections/all/products.json?limit=250'],$('#importWiwu')));
 $('#importAnker')?.addEventListener('click',()=>importBrand('Anker',['https://www.anker.com/products.json?limit=250','https://us.anker.com/products.json?limit=250','https://us.anker.com/collections/all/products.json?limit=250'],$('#importAnker')));

 const fixCatsButton=$('#fixAllCategories');
 if(fixCatsButton) fixCatsButton.addEventListener('click',async()=>{
   if(!confirm('Reclassify ALL products from every brand using product names and descriptions? Products with no clear match will be removed from the incorrect category instead of being placed in Phone Cases. Continue?'))return;
   fixCatsButton.disabled=true;say('#importMessage','Reviewing product descriptions and categories…');
   try{
     const [cr,pr]=await Promise.all([db.from('categories').select('*').eq('is_active',true),db.from('products').select('id,name,brand,description,category_id')]);
     if(cr.error)throw cr.error;if(pr.error)throw pr.error;
     let moved=0,cleared=0,unchanged=0;
     for(const p of pr.data||[]){
       const category_id=chooseProductCategory({title:p.name,description:p.description},cr.data||[]);
       const next=category_id||null;
       if(String(next||'')===String(p.category_id||'')){unchanged++;continue;}
       const result=await db.from('products').update({category_id:next}).eq('id',p.id);
       if(result.error)throw new Error('Stopped after '+moved+' changes: '+result.error.message);
       if(next)moved++;else cleared++;
     }
     await loadAll();
     say('#importMessage','Finished. Correctly classified/moved: '+moved+'. Removed from an incorrect category because the type was unclear: '+cleared+'. Already matched: '+unchanged+'.');
   }catch(err){say('#importMessage','Could not finish reclassification: '+(err.message||'Unknown error'));}
   finally{fixCatsButton.disabled=false;}
 });

})();