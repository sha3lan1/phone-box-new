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

 // Bulk importer: reads the public Shopify product feed and inserts products without displaying prices.
 const joyroomButton=$('#importJoyroom');
 if(joyroomButton) joyroomButton.addEventListener('click', async()=>{
   if(!confirm('سيتم استيراد المنتجات المتاحة من كتالوج JOYROOM الرسمي مع الصور. سيتم تخزين السعر كصفر ولن يظهر للزبائن. متابعة؟')) return;
   joyroomButton.disabled=true; say('#importMessage','جارٍ جلب كتالوج JOYROOM…');
   try {
     let source=null, failure=null;
     const urls=['https://www.joyroom.com/products.json?limit=250','https://www.joyroom.com/collections/all/products.json?limit=250'];
     for(const url of urls){
       try{
         const response=await fetch(url,{headers:{Accept:'application/json'}});
         if(!response.ok) throw new Error('HTTP '+response.status);
         const json=await response.json();
         if(Array.isArray(json.products)){source=json.products;break;}
         throw new Error('الرد ليس قائمة منتجات');
       }catch(error){failure=error;}
     }
     if(!source) throw new Error('الموقع منع الجلب المباشر من المتصفح. '+(failure?.message||''));
     if(!source.length) throw new Error('لم يرجع الكتالوج أي منتجات.');
     say('#importMessage','وجدنا '+source.length+' منتجًا. جارٍ تجهيز القائمة…');
     const [oldRes,catRes]=await Promise.all([
       db.from('products').select('name,brand'),
       db.from('categories').select('*').eq('is_active',true).order('sort_order')
     ]);
     if(oldRes.error) throw oldRes.error;
     if(catRes.error) throw catRes.error;
     const existing=new Set((oldRes.data||[]).filter(p=>(p.brand||'').toLowerCase()==='joyroom').map(p=>(p.name||'').trim().toLowerCase()));
     const cats=catRes.data||[];
     const getCategory=(p)=>{
       const s=[p.title,p.product_type,Array.isArray(p.tags)?p.tags.join(' '):p.tags].join(' ').toLowerCase();
       const checks=[
         [/power bank|battery|batteries/i,['باور','بطارية','طاقة']],
         [/charger|charging station|adapter/i,['شاحن','شواحن','طاقة','محول']],
         [/cable|data cable/i,['كابل','كيبل','سلك']],
         [/earbud|headphone|earphone|speaker|audio/i,['سماعة','سماعات','صوت']],
         [/holder|mount|stand/i,['حامل','ستاند','حوامل']],
         [/watch|wearable/i,['ساعة','ساعات','ذكية']],
         [/car|fm transmitter|aux/i,['سيارة','سيارات','سيار']]
       ];
       for(const [re,terms] of checks){if(re.test(s)){const found=cats.find(c=>terms.some(t=>(c.name||'').toLowerCase().includes(t)));if(found)return found.id;}}
       return cats[0]?.id||null;
     };
     const rows=[];
     for(const p of source){
       const name=String(p.title||'').trim();
       if(!name||existing.has(name.toLowerCase())) continue;
       const image=(p.images||[]).map(im=>typeof im==='string'?im:im.src).find(Boolean)||p.image?.src||null;
       const description=String(p.body_html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().slice(0,600);
       rows.push({name,brand:'JOYROOM',category_id:getCategory(p),price:0,stock_quantity:999,description,image_url:image,is_featured:false,is_active:true});
     }
     if(!rows.length){say('#importMessage','ما في منتجات جديدة؛ المنتجات الموجودة من JOYROOM تم استيرادها مسبقًا.');return;}
     let inserted=0;
     for(let i=0;i<rows.length;i+=20){
       const part=rows.slice(i,i+20);
       const result=await db.from('products').insert(part).select('id');
       if(result.error) throw new Error('تمت إضافة '+inserted+' منتج قبل الخطأ: '+result.error.message);
       inserted+=(result.data||[]).length;
       say('#importMessage','تمت إضافة '+inserted+' من '+rows.length+' منتج…');
     }
     await loadAll();
     say('#importMessage','تم الاستيراد بنجاح: '+inserted+' منتج جديد. تم حفظ الصور المتاحة، والأسعار غير معروضة.');
   } catch(error) {
     say('#importMessage','لم يكتمل الاستيراد: '+(error?.message||'خطأ غير معروف')+'. أرسل لي نص هذه الرسالة لأجهز طريقة بديلة.');
   } finally {joyroomButton.disabled=false;}
 });


 const fixCatsButton=$('#fixJoyroomCategories');
 if(fixCatsButton) fixCatsButton.addEventListener('click',async()=>{
   if(!confirm('سيتم إعادة تصنيف منتجات JOYROOM الموجودة فقط حسب اسم المنتج ووصفه. المنتجات غير الواضحة ستُنقل إلى إكسسوارات متنوعة إن وُجد هذا التصنيف. متابعة؟'))return;
   fixCatsButton.disabled=true;say('#importMessage','جارٍ فحص أسماء المنتجات والتصنيفات…');
   try{
     const [cr,pr]=await Promise.all([
       db.from('categories').select('*').eq('is_active',true),
       db.from('products').select('id,name,brand,description,category_id').ilike('brand','joyroom')
     ]);
     if(cr.error)throw cr.error;if(pr.error)throw pr.error;
     const categories=cr.data||[], items=pr.data||[];
     const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\u0600-\u06FF]+/g,' ').trim();
     const categoryByTerms=terms=>categories.find(c=>terms.some(t=>norm(c.name).includes(norm(t))));
     const categoryFor=item=>{
       const s=norm((item.name||'')+' '+(item.description||''));
       const rules=[
         {signal:/\\b(car mount|phone holder|desk stand|stand holder|mount|phone stand|tablet stand|tripod|selfie stick)\\b|حامل|ستاند|ترايبود|عصا سيلفي/,terms:['حوامل','حامل','ستاند','حوامل السيارات']},
         {signal:/\\b(usb c cable|type c cable|lightning cable|data cable|charging cable|aux cable|audio cable|cable|wire)\\b|\\b(usb c to|type c to|lightning to|aux to)\\b|كيبل|كابل|وصلة|وصله|سلك/,terms:['كوابل','كابلات','كيبلات','كيبل','كابل','وصلات','وصلة']},
         {signal:/\\b(otg|usb hub|hub adapter|usb adapter|card reader|memory card|flash drive|usb drive)\\b|\\b(adapter|converter|dongle)\\b|محول|محولات|قارئ ذاكرة|فلاش/,terms:['محولات','محول','وصلات','أدابتور','ذاكرة','فلاش','USB']},
         {signal:/\\b(power bank|powerbank|portable charger|battery pack)\\b|باور بانك|باوربانك|بطارية متنقلة/,terms:['باور بانك','باوربانك','بطاريات','شواحن متنقلة']},
         {signal:/\\b(wall charger|car charger|wireless charger|charging station|charger|charging adapter|power adapter)\\b|شاحن|شواحن|قاعدة شحن/,terms:['شواحن','شاحن','محولات الطاقة']},
         {signal:/\\b(earbuds?|earphones?|headphones?|headsets?|speaker|bluetooth audio|wireless audio|microphone)\\b|سماعة|سماعات|هيدفون|هيدسيت|مكبر صوت/,terms:['سماعات','سماعة','سماعات رأس','صوتيات']},
         {signal:/\\b(watch strap|watch band|watch case|smart watch|smartwatch|watch charger)\\b|سوار ساعة|حزام ساعة|ساعة ذكية/,terms:['ساعات','سوار ساعة','إكسسوارات الساعات']},
         {signal:/\\b(screen protector|tempered glass|privacy glass|camera protector)\\b|لزقة شاشة|حماية شاشة|حامي شاشة/,terms:['حماية الشاشة','لزقات','لزقة','حماية']},
         {signal:/\\b(phone case|mobile case|protective case|silicone case|clear case|airpods case|case cover|phone cover|cover)\\b|كفر|كفرات|جراب|حافظة/,terms:['كفرات','كفر','أغطية','حافظات']}
       ];
       for(const rule of rules){
         if(!rule.signal.test(s))continue;
         const c=categoryByTerms(rule.terms);if(c)return c.id;
       }
       const misc=categoryByTerms(['إكسسوارات متنوعة','متنوع','أخرى','other accessories','miscellaneous']);
       return misc?.id||null;
     };
     let updated=0,unclassified=0;
     for(const item of items){
       const category_id=categoryFor(item);
       if(!category_id){unclassified++;continue;}
       if(String(category_id)===String(item.category_id))continue;
       const {error}=await db.from('products').update({category_id}).eq('id',item.id);
       if(error)throw error;updated++;
     }
     await loadAll();
     say('#importMessage','انتهى فحص '+items.length+' منتجًا. تم تصحيح تصنيف '+updated+' منتج. '+(unclassified?'لم يتضح تصنيف '+unclassified+' منتجات فتركت دون نقل تلقائي.':''));
   }catch(error){say('#importMessage','تعذّر إصلاح التصنيفات: '+(error?.message||'خطأ غير معروف'));}
   finally{fixCatsButton.disabled=false;}
 });

})();