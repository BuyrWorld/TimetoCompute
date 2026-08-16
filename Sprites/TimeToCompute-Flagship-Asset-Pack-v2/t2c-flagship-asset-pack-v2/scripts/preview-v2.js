const stageAssets = [
  ['materials','Materials','The raw ingredients',.88,'0%','2%'],
  ['wafer','Wafers','The discs chips are built on',.92,'0%','0%'],
  ['chips-hbm','Chips + HBM','Compute engines and fast memory',.86,'0%','1%'],
  ['photonics','Photonics','Light-based data connections',.88,'0%','0%'],
  ['ai-factory','AI Factory','The complete computing facility',.82,'0%','3%'],
  ['accepted','Accepted','Customer checked and approved',.84,'0%','0%'],
  ['revenue','Revenue','The sale can be recorded',.84,'0%','0%'],
];

const photonicsAssets = [
  ['inp-substrate','InP substrate','The specialist material lasers are built on'],
  ['cw-laser','CW laser','A steady source of light'],
  ['eml','EML','A laser that encodes data'],
  ['transceiver-1-6t','1.6T transceiver','Turns electrical data into light and back'],
  ['cpo','CPO','Optics placed beside the switch chip'],
  ['optical-fibre','Optical fibre','The glass pathway carrying light'],
];

const assetRegistry = [
  ...stageAssets.map(a => ({ id:a[0], name:a[1], src:`assets/responsive/stage-${a[0]}-1280.png`, scale:a[3], x:a[4], y:a[5] })),
  ...photonicsAssets.map(a => ({ id:a[0], name:a[1], src:`assets/raster/photonics/${a[0]}-master-1254.png`, scale:1, x:'0%', y:'0%' })),
];

function card({ id, name, description, src, base, scale=1, x='0%', y='0%' }) {
  const article=document.createElement('article');
  article.className='asset-card';
  article.dataset.canvas='black';
  article.innerHTML=`<div class="asset-card__visual has-frame"><div class="t2c-cutout-stage" style="--asset-scale:${scale};--asset-x:${x};--asset-y:${y}"><img src="${src}" alt="${name}" loading="lazy"></div></div><strong>${name}</strong><small>${description}</small><button type="button" data-copy="${base}">COPY PATH</button>`;
  return article;
}

const stageRoot=document.querySelector('#stageAssets');
stageAssets.forEach(([id,name,description,scale,x,y])=>stageRoot.append(card({id,name,description,scale,x,y,src:`assets/responsive/stage-${id}-384.webp`,base:`assets/responsive/stage-${id}`})));
const photonicsRoot=document.querySelector('#photonicsAssets');
photonicsAssets.forEach(([id,name,description])=>photonicsRoot.append(card({id,name,description,src:`assets/responsive/photonics/${id}-384.webp`,base:`assets/responsive/photonics/${id}`})));

const finance=[['finance-cash.svg','Cash','money available'],['finance-debt.svg','Debt','money owed'],['finance-revenue.svg','Revenue','sales recognised'],['finance-capex.svg','Capex','money spent building'],['finance-cashflow.svg','Operating cash flow','cash generated or used'],['finance-shares.svg','Shares outstanding','ownership units']];
const financeRoot=document.querySelector('#financeIcons');
finance.forEach(([icon,name,simple])=>financeRoot.insertAdjacentHTML('beforeend',`<article class="finance-icon"><img src="assets/svg/ui/${icon}" alt=""><strong>${name}</strong><small>(${simple})</small></article>`));

const references={
  v2:[['Homepage — centred and clickable','reference-mockups/v2/01-homepage-centered-clickable.png'],['What is Photonics?','reference-mockups/v2/02-what-is-photonics.png'],['AI News','reference-mockups/v2/03-ai-news.png'],['Financials','reference-mockups/v2/04-financials.png']],
  current:[['Current homepage baseline','reference-mockups/current-site/2026-08-16-homepage.png']],
  earlier:[['Original homepage concept','reference-mockups/earlier-concepts/01-original-homepage-concept.png'],['Original chain explorer','reference-mockups/earlier-concepts/02-original-chain-explorer.png'],['Original company passport','reference-mockups/earlier-concepts/03-original-company-passport.png'],['Original mobile concept','reference-mockups/earlier-concepts/04-original-mobile-concept.png']],
};
function renderRefs(rootId, items){const root=document.querySelector(rootId);items.forEach(([name,src])=>root.insertAdjacentHTML('beforeend',`<figure class="reference-card"><a href="${src}" target="_blank" rel="noreferrer"><img src="${src}" alt="${name}" loading="lazy"></a><figcaption><strong>${name}</strong><span>REFERENCE ONLY</span></figcaption></figure>`));}
renderRefs('#v2References',references.v2); renderRefs('#currentReferences',references.current); renderRefs('#earlierReferences',references.earlier);

document.querySelectorAll('.preview-tabs button').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.preview-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
  document.querySelectorAll('.tab-panel').forEach(panel=>{const active=panel.dataset.panel===button.dataset.tab;panel.hidden=!active;panel.classList.toggle('is-active',active);});
}));

const canvasMode=document.querySelector('#canvasMode');
const assetSize=document.querySelector('#assetSize');
const assetGlow=document.querySelector('#assetGlow');
const assetFrame=document.querySelector('#assetFrame');
function updateAssetView(){document.querySelectorAll('.asset-card').forEach(c=>c.dataset.canvas=canvasMode.value);document.querySelectorAll('.asset-grid').forEach(g=>g.style.setProperty('--preview-size',`${assetSize.value}px`));document.querySelectorAll('.asset-card__visual').forEach(v=>{v.classList.toggle('no-glow',!assetGlow.checked);v.classList.toggle('has-frame',assetFrame.checked);});}
[canvasMode,assetSize,assetGlow,assetFrame].forEach(control=>control.addEventListener('input',updateAssetView));

const labAsset=document.querySelector('#labAsset'),labScale=document.querySelector('#labScale'),labX=document.querySelector('#labX'),labY=document.querySelector('#labY'),labImage=document.querySelector('#labImage'),labCutout=document.querySelector('#labCutout'),labCode=document.querySelector('#labCode');
assetRegistry.forEach(a=>labAsset.add(new Option(a.name,a.id)));
function selectedAsset(){return assetRegistry.find(a=>a.id===labAsset.value)||assetRegistry[0];}
function setLabFromAsset(){const a=selectedAsset();labScale.value=Math.round(a.scale*100);labX.value=parseInt(a.x,10)||0;labY.value=parseInt(a.y,10)||0;labImage.src=a.src;labImage.alt=a.name;updateLab();}
function updateLab(){const scale=(Number(labScale.value)/100).toFixed(2),x=`${labX.value}%`,y=`${labY.value}%`;labCutout.style.setProperty('--asset-scale',scale);labCutout.style.setProperty('--asset-x',x);labCutout.style.setProperty('--asset-y',y);document.querySelector('#scaleOut').value=scale;document.querySelector('#xOut').value=x;document.querySelector('#yOut').value=y;labCode.textContent=`optics: { scale: ${scale}, x: '${x}', y: '${y}' }`}
labAsset.addEventListener('change',setLabFromAsset);[labScale,labX,labY].forEach(i=>i.addEventListener('input',updateLab));document.querySelector('#labGuides').addEventListener('change',e=>document.querySelector('#labStage').classList.toggle('has-guides',e.target.checked));document.querySelector('#resetLab').addEventListener('click',setLabFromAsset);setLabFromAsset();

document.querySelector('#replayBars').addEventListener('click',()=>{document.querySelectorAll('.bar-card i').forEach(i=>{i.dataset.animate='false';void i.offsetWidth;i.dataset.animate='true';});});

const toast=document.querySelector('#toast');let toastTimer;
document.addEventListener('click',async event=>{const button=event.target.closest('[data-copy]');if(!button)return;try{await navigator.clipboard.writeText(button.dataset.copy);toast.textContent='Asset path copied';}catch{toast.textContent=button.dataset.copy;}toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),1600);});
