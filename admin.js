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
 async function loadAll(){const [c,p]=await Promise.all([db.from('categories').select('*').order('sort_order'),db.from('products').select('*').order('created_at',{ascending:false})]);if(c.error||p.error){say('#formMessage','تعذّر تحميل البيانات. تحقق من صلاحيات الإدارة في Supabase.');return;}cats=c.data||[];products=p.data||[];$('#productCategory').innerHTML=cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');$('#adminCategories').innerHTML=cats.map(c=>'<span class="admin-category-chip">'+esc(c.name)+'</span>').join('');renderList();}
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

 // Bulk import for official brand product feeds; no arbitrary default category.
 const textKey = value => String(value||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9\\u0600-\\u06FF]+/g,' ').trim();
 function chooseProductCategory(product, categories) {
   const title=textKey(product.title||product.name||'');
   const desc=textKey(String(product.body_html||product.description||'').replace(/<[^>]*>/g,' '));
   const type=textKey(product.product_type||product.category||'');
   const tags=textKey(Array.isArray(product.tags)?product.tags.join(' '):(product.tags||''));
   const source=type+' '+tags+' '+title+' '+desc;
   const rules=[
    [/car mount|car holder|dashboard mount|phone holder for car|حامل سيارة/,['حوامل السيارات','هولدر سيارة','حامل سيارة']],
    [/power bank|powerbank|portable power|battery pack|باور بانك|بطارية متنقلة/,['باور بانك','باوربانك','بطاريات متنقلة']],
    [/screen protector|tempered glass|privacy glass|camera lens protector|لزقة شاشة|حماية شاشة/,['لزقات الحماية','حماية الشاشة','لزقات','حماية']],
    [/usb c cable|type c cable|lightning cable|data cable|charging cable|aux cable|audio cable|hdmi cable|\\bcables?\\b|\\bwires?\\b|كيبل|كابل|وصلة شحن|سلك شحن/,['الكوابل','كابلات','كوابل','الأسلاك']],
    [/adapter|converter|dongle|otg|usb hub|card reader|memory card|flash drive|usb drive|محول|قارئ ذاكرة|فلاش ميموري/,['محولات','وصلات ومحولات','أدابتور','ذاكرة وفلاش']],
    [/wall charger|gan charger|wireless charger|charging station|power adapter|\\bcharger\\b|\\bcharging\\b|شاحن|شواحن|قاعدة شحن/,['الشواحن','شواحن','شاحن']],
    [/earbuds|earphones|headphones|headsets|speaker|microphone|\\baudio\\b|\\btws\\b|سماعة|سماعات|هيدفون|مكبر صوت/,['السماعات','سماعات','سماعات الرأس','صوتيات']],
    [/airpods case|earbuds case|phone case|mobile case|protective case|silicone case|clear case|\\bcases?\\b|phone cover|كفر|كفرات|جراب|حافظة موبايل/,['الكفرات','كفرات الموبايل','حافظات الموبايل','كفرات ايربودز']],
    [/airpods|wireless earbuds|true wireless|ايربودز|ايربود/,['AirPods','سماعات','السماعات']],
    [/desktop stand|desk stand|tablet stand|phone stand|selfie stick|tripod|gimbal|\\bholder\\b|\\bmount\\b|ستاند|ترايبود|عصا سيلفي/,['حوامل الموبايل','حوامل','ستاندات']],
    [/smart watch|smartwatch|watch band|watch strap|watch charger|apple watch|ساعة ذكية|سوار ساعة/,['الساعات','إكسسوارات الساعات']]
   ];
   const active=categories.filter(c=>c.is_active!==false);
   for(const [pattern,aliases] of rules){
     if(!pattern.test(source)) continue;
     const found=active.find(c=>aliases.some(alias=>textKey(c.name)===textKey(alias)));
     if(found) return found.id;
   }
   const misc=active.find(c=>['اكسسوارات متنوعة','متنوع','اخرى','other accessories'].includes(textKey(c.name)));
   return misc?misc.id:null;
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

 const fixCatsButton=$('#fixJoyroomCategories');
 if(fixCatsButton) fixCatsButton.addEventListener('click',async()=>{
   if(!confirm('سيتم فحص منتجات JOYROOM وWiWU وAnker. لن نغيّر منتجًا إذا لم يتضح تصنيفه. متابعة؟'))return;
   fixCatsButton.disabled=true;say('#importMessage','جارٍ مراجعة تصنيفات المنتجات…');
   try{
     const [cr,pr]=await Promise.all([
       db.from('categories').select('*').eq('is_active',true),
       db.from('products').select('id,name,brand,description,category_id').in('brand',['JOYROOM','WiWU','Anker'])
     ]);
     if(cr.error)throw cr.error;if(pr.error)throw pr.error;
     let updated=0,unclear=0;
     for(const p of pr.data||[]){
       const category_id=chooseProductCategory({title:p.name,body_html:p.description},cr.data||[]);
       if(!category_id){unclear++;continue;}
       if(String(category_id)===String(p.category_id))continue;
       const result=await db.from('products').update({category_id}).eq('id',p.id);
       if(result.error)throw result.error;
       updated++;
     }
     await loadAll();
     say('#importMessage','انتهى الفحص: تم تصحيح '+updated+' منتجًا، وترك '+unclear+' منتجًا دون تغيير لعدم وضوح التصنيف.');
   }catch(err){say('#importMessage','تعذّر التصحيح: '+(err.message||'خطأ غير معروف'));}
   finally{fixCatsButton.disabled=false;}
 });

})();