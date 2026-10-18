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
   cats=(c.data||[]).filter(x=>x.is_active!==false);products=p.data||[];
   cats.sort((x,y)=>(x.sort_order||0)-(y.sort_order||0));
   $('#productCategory').innerHTML=cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
   $('#adminCategories').innerHTML=cats.map(c=>'<span class="admin-category-chip">'+esc(c.name)+'</span>').join('');
   renderList();
 }
 function renderList(){ $('#adminProductList').innerHTML=products.length?products.map(p=>'<div class="admin-product-row"><div class="admin-product-details"><strong>'+esc(p.name)+'</strong><small>'+'Stock: '+p.stock_quantity+' · '+(p.is_active?'Visible':'Hidden')+'</small></div><button class="clear-button" data-edit="'+p.id+'">تعديل</button><button class="clear-button danger-button" data-delete="'+p.id+'">حذف</button></div>').join(''):'<p>لا توجد منتجات بعد. أضف أول منتج من النموذج أعلاه.</p>'; }
 function resetForm(){editing=null;$('#productForm').reset();$('#productId').value='';$('#productStock').value='0';$('#productActive').checked=true;$('#formTitle').textContent='إضافة منتج جديد';$('#saveProduct').textContent='حفظ المنتج';$('#cancelEdit').classList.add('hidden');say('#formMessage','');}
 $('#cancelEdit').addEventListener('click',resetForm);
 $('#adminProductList').addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');if(edit){const p=products.find(x=>String(x.id)===edit.dataset.edit);if(!p)return;editing=p;$('#productId').value=p.id;$('#productName').value=p.name||'';$('#productBrand').value=p.brand||'';$('#productCategory').value=p.category_id||'';$('#productStock').value=p.stock_quantity??0;$('#productDescription').value=p.description||'';$('#productFeatured').checked=!!p.is_featured;$('#productActive').checked=!!p.is_active;$('#formTitle').textContent='تعديل المنتج';$('#saveProduct').textContent='حفظ التعديلات';$('#cancelEdit').classList.remove('hidden');$('#productForm').scrollIntoView({behavior:'smooth'});}
 const del=e.target.closest('[data-delete]');if(del){const p=products.find(x=>String(x.id)===del.dataset.delete);if(!p||!confirm('متأكد إنك بدك تحذف '+p.name+'؟'))return;const {error}=await db.from('products').delete().eq('id',p.id);if(error){say('#formMessage','تعذّر الحذف: '+error.message);return;}if(p.image_path)await db.storage.from('product-images').remove([p.image_path]);await loadAll();say('#formMessage','تم حذف المنتج.');}});
 $('#productForm').addEventListener('submit',async e=>{e.preventDefault();const button=$('#saveProduct');button.disabled=true;say('#formMessage','جارٍ حفظ المنتج…');try{
 let image_url=editing?.image_url||null, image_path=editing?.image_path||null;const file=$('#productImage').files[0];
 if(file){if(!file.type.startsWith('image/'))throw new Error('اختر ملف صورة صالحًا.');if(file.size>8*1024*1024)throw new Error('حجم الصورة أكبر من 8 ميغابايت.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=Date.now()+'-'+Math.random().toString(36).slice(2,9)+'.'+ext;const {error:uploadError}=await db.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type});if(uploadError)throw uploadError;const {data}=db.storage.from('product-images').getPublicUrl(path);image_url=data.publicUrl;image_path=path;}
 const payload={name:$('#productName').value.trim(),brand:$('#productBrand').value.trim()||null,category_id:$('#productCategory').value?Number($('#productCategory').value):null,price:0,stock_quantity:Number($('#productStock').value),description:$('#productDescription').value.trim()||null,is_featured:$('#productFeatured').checked,is_active:$('#productActive').checked,image_url,image_path,updated_at:new Date().toISOString()};
 const res=editing?await db.from('products').update(payload).eq('id',editing.id):await db.from('products').insert(payload);if(res.error)throw res.error;
 if(file&&editing?.image_path&&editing.image_path!==image_path)await db.storage.from('product-images').remove([editing.image_path]);resetForm();await loadAll();say('#formMessage','تم حفظ المنتج بنجاح.');
 }catch(err){say('#formMessage','لم يتم الحفظ: '+(err.message||'حدث خطأ'));}finally{button.disabled=false;}});

 // Product classification by type/name/tags/description, independent of brand.
 const textKey = value => String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[^a-z0-9\u0600-\u06FF]+/g,' ').trim();
 const categoryLabels={phone_cases:'Phone Cases',screen_protectors:'Screen Protectors',power_banks:'Power Banks',earbuds:'Wireless Earbuds',airpods_cases:'Earbuds Case',chargers:'Chargers',wireless_chargers:'Wireless Chargers',cables:'Charging Cables',car_accessories:'Car Accessories',usb_accessories:'USB-C Hubs / Docking Stations',audio_wired:'Wired Earphones',watch_accessories:'Smart Watches & Accessories',phone_holders_tripods:'Phone Holders & Stands',memory_storage:'Memory Cards & USB Drives',phone_care:'Cleaning & Phone Care',tablet_accessories:'Tablet Accessories & Stylus Pens',lighting:'Lighting & Ring Lights',other:'Other Accessories',needs_review:'Needs Review',audio:'Audio & Sound'};
 function categoryGroup(name){
   const n=textKey(name);
   if(/needs review|غير مصنف|بحاجه لمراجعه/.test(n))return 'needs_review';
   if(/screen protector|tempered glass|privacy glass|camera lens protector|screen guard|لزقات الحمايه|حمايه الشاشه|لزقات شاشه|حمايه عدسه/.test(n))return 'screen_protectors';
   if(/airpods case|earbuds case|case for airpods|كفرات ايربود|كفر ايربود|كفر سماعات/.test(n))return 'airpods_cases';
   if(/phone case|phone cover|mobile case|phone covers|iphone case|كفرات الموبايل|كفر الموبايل|حافظات الموبايل|جرابات الموبايل|كفرات ايفون|كفرات ابل|كفرات سامسونج|^كفرات$|^الكفرات$|^كفر$/.test(n))return 'phone_cases';
   if(/power bank|powerbank|portable power|باور بانك|باوربانك|بطاريات متنقله/.test(n))return 'power_banks';
   if(/car charger|car mount|car holder|car accessories|automobile|car phone|dashboard mount|phone mounts|هولدر سياره|حامل سياره|حوامل السيارات|اكسسوارات السياره|شاحن سياره|شواحن السيارات|مرسل fm|اف ام/.test(n))return 'car_accessories';
   if(/wireless charger|magnetic charger|magsafe charger|شاحن لاسلكي|شواحن لاسلكيه/.test(n))return 'wireless_chargers';
   if(/charger|charging|wall charger|gan charger|power adapter|رؤوس الشحن|راس شحن|شواحن|شاحن|قواعد الشحن|شاحن حائط/.test(n))return 'chargers';
   if(/cable|cables|caple|cabel|wire|wires|charging cable|data cable|usb cable|كيبل|كابل|كوابل|كابلات|اسلاك|كيابل|وصله شحن/.test(n))return 'cables';
   if(/adapter|adapters|converter|dongle|usb hub|usb accessories|hubs and docks|otg|محولات|محول|وصلات ومحولات|ادابتور|ملحقات usb|ملحقات يو اس بي|يو اس بي/.test(n))return 'usb_accessories';
   if(/wired earphone|wired headset|wired headphones|headphone|headphones|headset|over ear|هيدفون|سماعات سلكيه|سماعات الراس|سماعات سلكية/.test(n))return 'audio_wired';
   if(/earbud|airpods|wireless earphone|wireless earbuds|earphones|ايربود|سماعات ابل|سماعات لاسلكيه|سماعات بلوتوث/.test(n))return 'earbuds';
   if(/watch|smartwatch|apple watch|watch band|watch strap|watch charger|ساعات ذكيه|ساعات|الساعات|اكسسوارات الساعات|احزمه الساعات|شاحن ساعه/.test(n))return 'watch_accessories';
   if(/selfie stick|tripod|gimbal|phone holder|phone stand|holders|stands|desktop stand|phone ring holder|عصا سيلفي|ترايبود|ستاند|حوامل الموبايل|حوامل الهاتف|حامل موبايل|حامل هاتف|حوامل/.test(n))return 'phone_holders_tripods';
   if(/ring light|lighting|light accessories|رينج لايت|اضاءه دائريه|اضاءه/.test(n))return 'lighting';
   if(/memory card|flash drive|usb drive|flash memory|storage and data transfer|ذاكره|فلاش ميموري/.test(n))return 'memory_storage';
   if(/cleaning|cleaner|cleaning kit|phone care|phone protection|تنظيف|طقم تنظيف|حمايه الموبايل|حمايه الهاتف/.test(n))return 'phone_care';
   if(/stylus|tablet|ipad|macbook accessories|tablet accessories|قلم لمس|قلم ايباد|اكسسوارات التابلت|اكسسوارات الايباد|ملحقات التابلت/.test(n))return 'tablet_accessories';
   if(/audio|sound|speaker|microphone|audio accessories|سماعات|صوت|سبيكر|مكبر صوت|مايكروفون/.test(n))return 'audio';
   if(/other accessories|miscellaneous|متنوع|اكسسوارات متنوعه|اخرى|ملحقات اخرى/.test(n))return 'other';
   return null;
 }
 function detectProductGroup(product){
   const name=textKey(product.title||product.name||''), desc=textKey(String(product.body_html||product.description||'').replace(/<[^>]*>/g,' '));
   const type=textKey(product.product_type||product.category||''), tags=textKey(Array.isArray(product.tags)?product.tags.join(' '):(product.tags||''));
   const primary=type+' '+tags+' '+name, full=primary+' '+desc;
   const rules=[
    ['screen_protectors',/screen protector|tempered glass|privacy glass|camera lens protector|screen guard|glass protector|لزقه شاشه|لزقات الحمايه|حمايه شاشه|حمايه عدسه/],
    ['airpods_cases',/airpods case|airpods cover|earbuds case|case for airpods|كفر ايربود|كفر سماعات/],
    ['car_accessories',/car charger|car mount|car holder|car phone holder|dashboard mount|windshield mount|car fm transmitter|fm transmitter|automobile accessories|هولدر سياره|حامل سياره|شاحن سياره|مرسل اف ام|اكسسوارات السياره/],
    ['power_banks',/power bank|powerbank|portable power|battery pack|باور بانك|بطاريه متنقله/],
    ['cables',/usb c cable|type c cable|lightning cable|charging cable|data cable|aux cable|audio cable|hdmi cable|ethernet cable|\bcables?\b|\bcaple\b|\bcaples\b|\bcabels?\b|\bwires?\b|كيبل|كابل|وصله شحن|سلك شحن/],
    ['usb_accessories',/adapter|converter|dongle|usb hub|card reader|otg|flash drive|memory card|\bhub\b|محول|محولات|قارئ ذاكره|فلاش ميموري|ملحقات usb/],
    ['wireless_chargers',/wireless charger|magsafe charger|magnetic wireless charger|charging pad|شاحن لاسلكي|شحن لاسلكي/],
    ['chargers',/wall charger|gan charger|power adapter|charging station|\bcharger\b|\bcharging\b|رؤوس الشحن|شاحن|شواحن/],
    ['phone_cases',/phone case|phone cover|mobile case|protective case|silicone case|clear case|shockproof case|\bphone cases?\b|\bcases? for iphone\b|كفر موبايل|كفرات موبايل|جراب موبايل|حافظه موبايل/],
    ['phone_holders_tripods',/selfie stick|tripod|gimbal|phone holder|phone stand|desktop stand|phone ring holder|عصا سيلفي|ترايبود|ستاند|حامل موبايل|حامل هاتف/],
    ['lighting',/ring light|selfie light|lighting|رينج لايت|اضاءه/],
    ['watch_accessories',/smart watch|smartwatch|watch band|watch strap|watch charger|apple watch|ساعه ذكيه|سوار ساعه/],
    ['tablet_accessories',/stylus|touch pen|tablet pen|apple pencil|tablet case|ipad case|tablet stand|ipad accessories|قلم لمس|قلم ايباد|اكسسوارات التابلت/],
    ['memory_storage',/memory card|micro sd|sd card|flash drive|usb drive|pen drive|ذاكره|فلاش ميموري/],
    ['phone_care',/cleaning kit|screen cleaner|cleaning pen|cleaning brush|cleaner kit|طقم تنظيف|ادوات تنظيف/],
    ['audio_wired',/wired earphones|wired earbud|wired headset|wired headphones|over ear headphones|headphones|headset|3 5mm earphone|earphones with wire|سماعات سلكيه|سماعات سلكية|هيدفون/],
    ['earbuds',/airpods|wireless earbuds|true wireless|earbuds|tws|bluetooth earphones|open ear headphones|ايربود|سماعات لاسلكيه/],
    ['audio',/bluetooth speaker|speaker|microphone|audio|sound|مكبر صوت|سبيكر|مايكروفون/]
   ];
   for(const [group,pattern] of rules){if(pattern.test(primary))return group;}
   for(const [group,pattern] of rules){if(pattern.test(full))return group;}
   if(/\p{Script=Arabic}/u.test(String(product.title||product.name||'')))return 'needs_review';
   return null;
 }
 function chooseProductCategory(product,categories){
   const group=detectProductGroup(product);if(!group)return null;
   const found=categories.find(c=>categoryGroup(c.name)===group);if(found)return found.id;
   if(group==='airpods_cases')return categories.find(c=>categoryGroup(c.name)==='phone_cases')?.id||null;
   return null;
 }
 async function importBrand(brand, urls, button, options={}) {
   if(!db||!button)return false;
   if(!options.silent&&!confirm('سيتم جلب المنتجات المتاحة للعامة من '+brand+' مع صورها. متابعة؟'))return false;
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
       const body=String(p.body_html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(); const tags=Array.isArray(p.tags)?p.tags.join(', '):String(p.tags||''); const description=body.slice(0,600);
       rows.push({name,brand,category_id:chooseProductCategory({...p,title:name,body_html:description},catRes.data||[]),price:0,stock_quantity:0,description,image_url:image,is_featured:false,is_active:true});
     }
     if(!rows.length){say('#importMessage','No new products found for '+brand+'.');return true;}
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
     say('#importMessage','Imported '+count+' new products from '+brand+'. Products needing review: '+uncategorized+'.');
     return true;
   }catch(err){say('#importMessage','Could not import '+brand+': '+(err.message||'Unknown error'));return false;}
   finally{if(!options.keepDisabled)button.disabled=false;}
 }
 const syncCatalogsButton=$('#syncAllCatalogs');
 if(syncCatalogsButton)syncCatalogsButton.addEventListener('click',async()=>{
   if(!confirm('Try syncing all publicly available products from JOYROOM, WiWU and Anker? Continue?'))return;
   syncCatalogsButton.disabled=true;
   const feeds=[
     ['JOYROOM',['https://www.joyroom.com/products.json?limit=250','https://www.joyroom.com/collections/all/products.json?limit=250']],
     ['WiWU',['https://www.wiwu.com/products.json?limit=250','https://www.wiwu.com/collections/all/products.json?limit=250']],
     ['Anker',['https://www.anker.com/products.json?limit=250','https://us.anker.com/products.json?limit=250','https://us.anker.com/collections/all/products.json?limit=250']]
   ];
   let success=0;
   for(const [brand,urls] of feeds){
     const ok=await importBrand(brand,urls,syncCatalogsButton,{silent:true,keepDisabled:true});
     if(ok)success++;
   }
   syncCatalogsButton.disabled=false;
   if(success===3)say('#importMessage','All three public catalog feeds responded. This does not guarantee each supplier exposes its entire catalog through the public feed; review the product count before considering the catalog complete.');
   else say('#importMessage','Only '+success+' of 3 catalog feeds responded successfully. Check the message above before assuming imports are complete.');
 });

 async function ensureCategory(group, categories){
   const name=categoryLabels[group]||'Needs Review';
   let existing=categories.find(c=>categoryGroup(c.name)===group);
   if(existing)return existing.id;
   const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   const maxOrder=categories.reduce((m,c)=>Math.max(m,Number(c.sort_order)||0),0);
   const result=await db.from('categories').insert({name,slug,is_active:true,sort_order:maxOrder+10}).select('*').single();
   if(result.error){
     const again=await db.from('categories').select('*').eq('name',name).maybeSingle();
     if(again.data){categories.push(again.data);return again.data.id;}
     throw new Error('Could not create category '+name+': '+result.error.message);
   }
   categories.push(result.data);return result.data.id;
 }
 const fixCatsButton=$('#fixAllCategories');
 if(fixCatsButton) fixCatsButton.addEventListener('click',async()=>{
   if(!confirm('Use supplier-style English category names, merge equivalent categories across brands, and classify every product using its name and description. Products that cannot be identified confidently will move to Needs Review, not be guessed. Continue?'))return;
   fixCatsButton.disabled=true;say('#importMessage','Analyzing products and merging matching categories…');
   try{
     const [cr,pr]=await Promise.all([db.from('categories').select('*'),db.from('products').select('id,name,brand,description,category_id')]);
     if(cr.error)throw cr.error;if(pr.error)throw pr.error;
     let categories=cr.data||[], products=pr.data||[], moved=0,created=0,review=0;
     const ensure=async(group)=>{
       let matching=categories.filter(c=>categoryGroup(c.name)===group);
       if(matching.length)return matching[0].id;
       const label=categoryLabels[group]||'Needs Review';
       const maxOrder=categories.reduce((m,c)=>Math.max(m,Number(c.sort_order)||0),0);
       const slug=label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
       // Reuse a category that already owns this unique slug instead of trying to insert a duplicate.
       const slugMatch=await db.from('categories').select('*').eq('slug',slug).maybeSingle();
       if(slugMatch.error)throw new Error('Could not check existing category '+label+': '+slugMatch.error.message);
       if(slugMatch.data){
         let existing=slugMatch.data;
         if(existing.name!==label||existing.is_active===false){
           const updated=await db.from('categories').update({name:label,is_active:true}).eq('id',existing.id).select('*').single();
           if(updated.error)throw new Error('Could not reuse existing category '+label+': '+updated.error.message);
           existing=updated.data;
         }
         categories.push(existing);return existing.id;
       }
       const result=await db.from('categories').insert({name:label,slug,is_active:true,sort_order:maxOrder+10}).select('*').single();
       if(result.error){
         // A concurrent/previous record may have appeared between the lookup and insert; re-read by slug/name.
         const retry=await db.from('categories').select('*').eq('slug',slug).maybeSingle();
         if(retry.error||!retry.data)throw new Error('Could not create category '+label+': '+result.error.message);
         categories.push(retry.data);return retry.data.id;
       }
       categories.push(result.data);created++;return result.data.id;
     };
     for(const p of products){
       const detected=detectProductGroup({title:p.name,description:p.description});
       const group=detected||'needs_review';
       if(!detected)review++;
       const id=await ensure(group);
       if(String(id)===String(p.category_id||''))continue;
       const result=await db.from('products').update({category_id:id}).eq('id',p.id);
       if(result.error)throw new Error('Stopped after '+moved+' product updates: '+result.error.message);
       moved++;
       if(moved%20===0)say('#importMessage','Classified '+moved+' products…');
     }
     // Merge all duplicate category records into one canonical English category per recognized group.
     const fresh=await db.from('categories').select('*');
     if(fresh.error)throw fresh.error;
     categories=fresh.data||[];
     const groups=new Map();
     for(const c of categories){
       const group=categoryGroup(c.name);
       if(!group)continue;
       if(!groups.has(group))groups.set(group,[]);
       groups.get(group).push(c);
     }
     for(const [group,list] of groups){
       const canonicalName=categoryLabels[group]||'Needs Review';
       let primary=list.find(c=>c.name===canonicalName)||list.find(c=>c.is_active!==false)||list[0];
       if(primary.name!==canonicalName){
         const renamed=await db.from('categories').update({name:canonicalName}).eq('id',primary.id);
         if(renamed.error)throw new Error('Could not rename category '+primary.name+': '+renamed.error.message);
         primary.name=canonicalName;
       }
       for(const duplicate of list){
         if(String(duplicate.id)===String(primary.id))continue;
         const move=await db.from('products').update({category_id:primary.id}).eq('category_id',duplicate.id);
         if(move.error)throw new Error('Could not merge duplicate category '+duplicate.name+': '+move.error.message);
         const deactivate=await db.from('categories').update({is_active:false}).eq('id',duplicate.id);
         if(deactivate.error)throw new Error('Could not deactivate duplicate category '+duplicate.name+': '+deactivate.error.message);
       }
     }
     // Keep unrelated Arabic/unknown category labels out of the public English UI.
     const finalCats=await db.from('categories').select('*');
     if(finalCats.error)throw finalCats.error;
     for(const c of finalCats.data||[]){
       if(c.is_active===false)continue;
       if(!categoryGroup(c.name)){
         const name=String(c.name||'');
         if(/\p{Script=Arabic}/u.test(name)){
           const reviewId=await ensure('needs_review');
           await db.from('products').update({category_id:reviewId}).eq('category_id',c.id);
           await db.from('categories').update({is_active:false}).eq('id',c.id);
         }
       }
     }
     await loadAll();
     say('#importMessage','Finished. Products moved to their best-matched supplier-style category: '+moved+'. New categories: '+created+'. Products needing manual review: '+review+'. Duplicate categories were merged. Only active English categories remain in the admin category list.');
   }catch(err){say('#importMessage','Could not finish safely: '+(err.message||'Unknown error')+'. Please send this exact message before retrying.');}
   finally{fixCatsButton.disabled=false;}
 });

})();