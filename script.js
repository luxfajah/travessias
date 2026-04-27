
  // Preloader removal
  window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 600); // Clean up DOM
    }
  });

  // Optimized Parallax Effect
  const stickers = document.querySelectorAll('.sticker-wrap');
  let ticking = false;
  let lastScrolled = 0;

  function updateParallax() {
    stickers.forEach(wrap => {
      const speed = parseFloat(wrap.getAttribute('data-speed') || '0.2');
      wrap.style.transform = `translate3d(0, ${lastScrolled * speed}px, 0)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    lastScrolled = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });


  /* ── IG Carousel ─────────────────────────────────────── */
  const ig = {};
  function initIG(id){
    const t = document.getElementById(`itrack-${id}`);
    if(!t) return;
    const n = t.children.length;
    ig[id] = {i:0, n};
    const dc = document.getElementById(`idots-${id}`);
    for(let x=0;x<n;x++){
      const d = document.createElement('div');
      d.className = 'ig-dot'+(x===0?' active':'');
      dc.appendChild(d);
    }
  }
  function igSlide(id,dir){
    const s = ig[id]; if(!s) return;
    const ni = s.i + dir;
    if(ni<0||ni>=s.n) return;
    s.i = ni;
    document.getElementById(`itrack-${id}`).style.transform = `translateX(-${ni*100}%)`;
    const dots = document.getElementById(`idots-${id}`).children;
    [...dots].forEach((d,i)=>d.classList.toggle('active',i===ni));
    const sc = document.getElementById(`sc-${id}`);
    if(sc) sc.textContent = `${ni+1} / ${s.n}`;
  }
  ['1','2','3','4'].forEach(initIG);

  /* ── Status & actions ─────────────────────────────────── */
  const statuses = {1:'none',2:'none',3:'none',4:'none'};
  const smap = {
    approved:{ label:'Aprovado',   sb:'sb-approved' },
    rejected:{ label:'Reprovado',  sb:'sb-rejected' },
    pending: { label:'Em revisão', sb:'sb-pending'  },
    none:    { label:'Aguardando', sb:'sb-none'     },
  };

  function setStatus(id, status){
    if(status==='rejected'){
      const cl = document.getElementById(`comments-${id}`);
      if(cl && cl.querySelector('.c-empty')){
        const ra = document.getElementById(`ralert-${id}`);
        ra.classList.add('show');
        setTimeout(()=>ra.classList.remove('show'),3000);
        return;
      }
    }
    statuses[id] = status;
    const badge = document.getElementById(`badge-${id}`);
    badge.className = `sb ${smap[status].sb}`;
    badge.innerHTML = `<span class="sbp"></span>${smap[status].label}`;
    document.getElementById(`ba-${id}`).classList.toggle('active', status==='approved');
    document.getElementById(`br-${id}`).classList.toggle('active', status==='rejected');
    document.getElementById(`bl-${id}`).classList.toggle('active', status==='pending');
    updateCounts(); saveState(); lockButtons(id, status);
    const toasts={ approved:['✅','Conteúdo aprovado!'], rejected:['✏️','Conteúdo reprovado.'], pending:['⏳','Marcado para revisão.'] };
    showToast(...toasts[status]);
  }

  function lockButtons(id, status){
    const map = { approved:`ba-${id}`, rejected:`br-${id}`, pending:`bl-${id}` };
    Object.entries(map).forEach(([s,btnId])=>{
      const btn = document.getElementById(btnId);
      if(btn) btn.classList.toggle('locked', s !== status);
    });
  }

  function updateCounts(){
    const vals = Object.values(statuses);
    const a = vals.filter(v=>v==='approved').length;
    const r = vals.filter(v=>v==='rejected').length;
    const total = 4;
    const p = total - a - r;
    
    // Header progress
    const pbFill = document.getElementById('pbFill');
    if(pbFill) pbFill.style.width = `${(a/total)*100}%`;
    const pbLabel = document.getElementById('pbLabel');
    if(pbLabel) pbLabel.innerHTML = `<strong>${a}</strong> de ${total} aprovados`;
    
    // Overview progress (if present)
    const infoFill = document.getElementById('infoFill');
    if(infoFill) infoFill.style.width = `${(a/total)*100}%`;
    const infoCount = document.getElementById('infoCount');
    if(infoCount) infoCount.textContent = `${a} de ${total} aprovados`;
    
    // Footer counts
    const fa = document.getElementById('f-approved'); if(fa) fa.textContent = a;
    const fp = document.getElementById('f-pending'); if(fp) fp.textContent = p;
    const fr = document.getElementById('f-rejected'); if(fr) fr.textContent = r;
  }

  /* ── Review Modal Logic ────────────────────────────────── */
  let currentReviewId = null;
  function openReviewModal(id) {
    currentReviewId = id;
    const modal = document.getElementById('reviewModal');
    const textarea = document.getElementById('reviewTextarea');
    textarea.value = '';
    modal.classList.add('open');
    document.getElementById('confirmReviewBtn').onclick = () => confirmReview(id);
  }

  function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('open');
    currentReviewId = null;
  }

  function confirmReview(id) {
    const textarea = document.getElementById('reviewTextarea');
    const text = textarea.value.trim();
    if (!text) {
      alert("Por favor, descreva o que precisa ser revisado.");
      return;
    }
    
    // 1. Add the comment automatically
    addCommentByText(id, text, false); // add without individual toast
    
    // 2. Set status to pending
    setStatus(id, 'pending');
    
    // 3. Close modal
    closeReviewModal();
  }

  /* ── Comments Modal Logic ──────────────────────────────── */
  function openCommentsModal(id) {
    const originalList = document.getElementById(`comments-${id}`);
    const modalList = document.getElementById('modalCommentsList');
    modalList.innerHTML = originalList.innerHTML;
    document.getElementById('commentsModal').classList.add('open');
    document.getElementById('modalCommentInput').value = '';
    document.getElementById('modalSendCommentBtn').onclick = () => {
      const txt = document.getElementById('modalCommentInput').value;
      addCommentByText(id, txt);
      document.getElementById('modalCommentInput').value = '';
      openCommentsModal(id); // refresh list
    }
  }
  function closeCommentsModal() {
    document.getElementById('commentsModal').classList.remove('open');
  }

  /* ── Comments ─────────────────────────────────────────── */
  function addCommentByText(id, text, showT=true) {
    const txt = text.trim(); 
    if(!txt) return;
    const cl = document.getElementById(`comments-${id}`);
    
    // Remove empty if present
    const empty = cl.querySelector('.c-empty'); 
    if(empty) empty.remove();
    
    const now = new Date();
    const ts = now.toLocaleDateString()+' '+now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'comment-item';
    
    // Define o nome de exibição baseado no usuário logado
    const displayName = (currentUser === 'gabriellylima') ? 'Gabrielly Lima' : 'Duas Mãos (Admin)';
    
    div.innerHTML = `<div class="c-meta"><strong>${displayName}</strong> · ${ts}</div><div class="c-text">${txt}</div>`;
    cl.appendChild(div);
    
    // Show history button
    const bc = document.getElementById(`bc-${id}`);
    if(bc) bc.classList.add('visible');
    
    saveState(); 
    if(showT) showToast('💬','Comentário adicionado!');
  }

  function addComment(id, showT=true){
    // Legacy support for calls that might still expect an input field
    const inp = document.getElementById(`input-${id}`);
    if(inp) {
      addCommentByText(id, inp.value, showT);
      inp.value = '';
    }
  }

  function showToast(icon,msg){
    const t=document.getElementById('toast');
    document.getElementById('ti').textContent=icon;
    document.getElementById('tm').textContent=msg;
    t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500);
  }

  /* ── Login Logic ──────────────────────────────────────── */
  const loginScreen = document.getElementById('login-screen');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  
  let currentUser = sessionStorage.getItem('authUser') || 'admin';
  let currentToken = sessionStorage.getItem('authToken') || 'admin_token';

  if(loginScreen) loginScreen.classList.add('hidden');
  document.body.classList.remove('locked');
  loadState();

  if(loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const u = document.getElementById('login-user').value.trim().toLowerCase();
      const p = document.getElementById('login-pass').value.trim();
      if(!u || !p) { loginError.textContent = 'Preencha todos os campos.'; return; }
      
      loginBtn.textContent = 'Aguarde...';
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({username: u, password: p})
        });
        const data = await res.json();
        if(res.ok && data.success) {
          sessionStorage.setItem('authUser', data.username);
          sessionStorage.setItem('authToken', data.token);
          currentUser = data.username;
          currentToken = data.token;
          loginScreen.classList.add('hidden');
          document.body.classList.remove('locked');
          loadState();
        } else {
          loginError.textContent = 'Usuário ou senha incorretos.';
        }
      } catch(e) {
        loginError.textContent = 'Erro ao conectar. Tente novamente.';
      }
      loginBtn.textContent = 'Entrar';
    });
  }

  /* ── Persistence ──────────────────────────────────────── */
  async function saveState(){
    if (!currentUser || !currentToken) return; // Só tenta salvar se estiver logado

    const data = { statuses:{...statuses}, comments:{} };
    ['1','2','3','4'].forEach(id=>{
      const cl=document.getElementById(`comments-${id}`);
      if(cl){
        const items=cl.querySelectorAll('.comment-item');
        data.comments[id]=[...items].map(el=>el.innerHTML);
      }
    });
    try {
      // Feedback visual de salvamento em andamento
      showToast('🔄', 'Salvando dados...');
      
      const res = await fetch('/api/save',{ 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify({ data: data, username: currentUser, token: currentToken }) 
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('authUser');
          sessionStorage.removeItem('authToken');
          showToast('❌', 'Sessão expirada. Recarregue a página.');
        } else {
          showToast('❌', 'Erro ao salvar no servidor.');
        }
        return;
      }
      
      // Feedback visual de sucesso
      showToast('☁️', 'Salvo na nuvem!');
    } catch(e){ 
      console.error('Erro ao salvar:',e); 
      showToast('❌', 'Erro de conexão.');
    }
  }

  function applyStatus(id,status){
    statuses[id]=status;
    const badge=document.getElementById(`badge-${id}`);
    badge.className=`sb ${smap[status].sb}`;
    badge.innerHTML=`<span class="sbp"></span>${smap[status].label}`;
    document.getElementById(`ba-${id}`).classList.toggle('active',status==='approved');
    document.getElementById(`br-${id}`).classList.toggle('active',status==='rejected');
    document.getElementById(`bl-${id}`).classList.toggle('active',status==='pending');
    lockButtons(id,status);
  }

  async function loadState(){
    try {
      const resp=await fetch('/api/load');
      const data=await resp.json();
      if(!data||Object.keys(data).length===0){ updateCounts(); return; }
      ['1','2','3','4'].forEach(id=>{
        const comments=data.comments?.[id]||[];
        const cl=document.getElementById(`comments-${id}`);
        if(cl && comments.length){
          cl.innerHTML = ''; // avoid duplicates
          comments.forEach(html=>{ const div=document.createElement('div'); div.className='comment-item'; div.innerHTML=html; cl.appendChild(div); });
          
          // If has comments, show bubble
          const bc = document.getElementById(`bc-${id}`);
          if(bc) bc.classList.add('visible');
        }
      });
      ['1','2','3','4'].forEach(id=>{ const s=data.statuses?.[id]||'none'; if(s!=='none') applyStatus(id,s); });
    } catch(e){ console.error('Erro ao carregar:',e); }
    updateCounts();
  }

  async function clearState(){
    if(!confirm('Limpar todas as respostas e comentários no sistema?')) return;
    if (!currentUser || !currentToken) return;
    try {
      const res = await fetch('/api/save',{ 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify({ data: {}, username: currentUser, token: currentToken }) 
      });
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('authUser');
          sessionStorage.removeItem('authToken');
          alert('Sessão expirada. Recarregue a página.');
        } else {
          alert('Erro ao limpar dados no servidor.');
        }
        return;
      }
      location.reload();
    } catch(e){ alert('Erro de rede ao limpar dados.'); }
  }

  // A chamada para loadState() agora acontece APÓS o login
  // loadState();

  /* ── Reveal observer ──────────────────────────────────── */
  const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
  },{ threshold:0.1, rootMargin:'0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

  /* ── Removed Lightbox ── */



  let lbPost=null, lbIdx=0;

  function openLightbox(postId){
    lbPost=postId; lbIdx=ig[postId]?ig[postId].i:0;
    renderLightbox();
    populateLbRight(postId);
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow='hidden';
  }

  function renderLightbox(){
    const srcs=lbSources[lbPost]; if(!srcs) return;
    const total=srcs.length;
    const sc=document.getElementById('lbSC');
    const img=document.getElementById('lbImg');
    const prev=document.getElementById('lbPrev');
    const next=document.getElementById('lbNext');
    const dots=document.getElementById('lbDots');

    // Render slides into track if not already rendered
    const track=document.getElementById('lbTrack');
    if(track.getAttribute('data-post') !== lbPost){
      track.innerHTML = '';
      srcs.forEach(src => {
        const div = document.createElement('div');
        div.className = 'lb-track-item';
        div.innerHTML = `<img src="${src}" loading="lazy">`;
        track.appendChild(div);
      });
      track.setAttribute('data-post', lbPost);
      // Wait a tick to ensure no animation on initial load
      track.style.transition = 'none';
      track.style.transform = `translateX(0%)`;
    }

    // Apply translation
    // restore transition if needed
    setTimeout(()=>{ track.style.transition = 'transform .35s cubic-bezier(0.25, 1, 0.5, 1)'; }, 10);
    track.style.transform = `translateX(-${lbIdx * 100}%)`;

    prev.disabled=lbIdx===0; next.disabled=lbIdx===total-1;
    prev.style.display=next.style.display=total>1?'flex':'none';
    dots.innerHTML='';
    if(total>1){ srcs.forEach((_,i)=>{ const d=document.createElement('div'); d.className='lb-dot-item'+(i===lbIdx?' active':''); d.onclick=()=>lbGo(i); dots.appendChild(d); }); }
  }

  function populateLbRight(postId){
    const meta=postMeta[postId]||{};
    // Caption
    const cap=document.getElementById('lbCaption');
    cap.innerHTML=`<strong>gabriellylimapsi</strong> ${meta.caption||''}`;
    // Cards
    const cardsEl=document.getElementById('lbCards');
    if(meta.cards&&meta.cards.length){
      cardsEl.innerHTML='<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;margin-bottom:6px">SLIDES</div>';
      meta.cards.forEach((c,i)=>{
        const d=document.createElement('div');
        d.className='lb-rcard';
        d.innerHTML=`<div class="lb-rcard-num">Card ${i+1}</div>${c}`;
        cardsEl.appendChild(d);
      });
    } else { cardsEl.innerHTML=''; }
    // Comments
    const cl=document.getElementById(`comments-${postId}`);
    const lbCL=document.getElementById('lbCommentsList');
    lbCL.innerHTML='';
    if(cl){
      const items=cl.querySelectorAll('.c-item');
      if(items.length){ items.forEach(it=>{ const d=document.createElement('div'); d.style.cssText='font-size:11px;line-height:1.5;color:#333'; d.innerHTML=it.innerHTML; lbCL.appendChild(d); }); }
      else { lbCL.innerHTML='<div style="font-size:11px;color:#aaa;font-style:italic">Nenhum feedback ainda.</div>'; }
    }
    // Actions
    const ar=document.getElementById('lbActionRow');
    const st=statuses[postId]||'none';
    ar.innerHTML=`
      <button class="lb-abtn lb-abtn-ap${st==='approved'?' active':''}" onclick="setStatus('${postId}','approved');populateLbRight('${postId}')">✓ Aprovar</button>
      <button class="lb-abtn lb-abtn-rj${st==='rejected'?' active':''}" onclick="setStatus('${postId}','rejected');populateLbRight('${postId}')">✎ Reprovar</button>
      <button class="lb-abtn lb-abtn-lt${st==='pending'?' active':''}" onclick="setStatus('${postId}','pending');populateLbRight('${postId}')">⏳ Revisar</button>
    `;
    // Textarea
    document.getElementById('lbTextarea').value='';
  }

  function lbSendComment(){
    if(!lbPost) return;
    addComment(lbPost); // reuse existing addComment
    setTimeout(()=>populateLbRight(lbPost),50);
  }

  function lbGo(idx){
    lbIdx=idx; renderLightbox();
  }
  function lbSlide(dir){ const newIdx=lbIdx+dir; if(newIdx<0||newIdx>=lbSources[lbPost].length) return; lbGo(newIdx); }
  function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); document.body.style.overflow=''; lbPost=null; }
  document.addEventListener('keydown',(e)=>{ if(!lbPost) return; if(e.key==='Escape') closeLightbox(); if(e.key==='ArrowRight') lbSlide(1); if(e.key==='ArrowLeft') lbSlide(-1); });





/* ══ Project Viewer ════════════════════════════════════════ */
const projectData = {
  '1': {
    title: 'Apresentação da Marca Nova',
    sections: [
      { img: 'Posts/Post 1 - 10.webp', sub: 'O Início', text: 'Por muito tempo, existir foi tentar caber: em formas, em vínculos, em expectativas que nunca fizeram sentido.' },
      { img: 'Posts/Post 1 - 20.webp', sub: 'Nova Identidade', text: 'A logo traz referência à "ovelha colorida e gotica" como símbolo de singularidade, de uma forma de existir que não se encaixa em padrões.' },
      { img: 'Posts/Post 1 - 30.webp', sub: 'Singularidade', text: 'Essa é também a base da minha prática clínica: escuta profunda, responsabilidade & respeito pela complexidade de cada pessoa.' },
      { img: 'Posts/Post 1 - 40.webp', sub: 'Caminhada', text: 'Convido você a ficar por aqui e acompanhar os próximos passos dessa caminhada <3' },
      { img: 'Posts/Post 1 - 50.webp', sub: 'Essência', text: 'Um novo momento focado na verdade e na expressão autêntica de quem somos.' }
    ]
  },
  '2': {
    title: 'Quem sou eu?',
    sections: [
      { img: 'Posts/Post 2 - 10.webp', sub: 'Perfil Profissional', text: 'Sou psicóloga clínica com atuação online para todo o Brasil. Meu trabalho é direcionado a pessoas que sempre sentiram que não cabiam nos modelos tradicionais.' },
      { img: 'Posts/Post 2 - 20.webp', sub: 'Prática Clínica', text: 'Minha prática nasce da observação atenta das margens, dos desvios e das subjetividades que escapam das normas invisíveis.' },
      { img: 'Posts/Post 2 - 30.webp', sub: 'Formação Ética', text: 'Com escuta qualificada e ética relacional, busco sustentar processos complexos com calma, lucidez e responsabilidade clínica.' },
      { img: 'Posts/Post 2 - 140.webp', sub: 'Visão de Mundo', text: 'Essa forma que me constituo enquanto profissional também tem origens na forma que eu vejo o mundo e as pessoas.' }
    ]
  },
  '3': {
    title: 'A psicologia que eu acredito',
    sections: [
      { img: 'Posts/Post 3.webp', sub: 'Poder existir!', text: 'Existir parece simples, mas, para muita gente, nunca foi. A psicologia que eu acredito começa na possibilidade de existir com todas as suas nuances.' }
    ]
  },
  '4': {
    title: 'Como ser atendida por mim?',
    sections: [
      { img: 'Posts/Post 4.webp', sub: 'Atendimento Online', text: 'Meu trabalho acontece de forma online, então consigo atender pessoas de qualquer lugar, do Brasil ou de fora. O primeiro passo é simples: você me chama e conversamos.' }
    ]
  },
  '5': {
    title: 'Quebrando objeções da terapia',
    sections: [
      { img: 'Posts/Post 5 - 1.webp', sub: 'O Chamado', text: 'Nem sempre é um "grande problema" que leva alguém pra terapia… Às vezes é só um incômodo que vai ficando.' },
      { img: 'Posts/Post 5 - 2.webp', sub: 'Nomenclaturas', text: 'Às vezes, é só uma sensação difícil de nomear. Um espaço para dar nome ao que dói.' },
      { img: 'Posts/Post 5 - 3.webp', sub: 'Novos Caminhos', text: 'Em momentos que você sente que já mudou tantas vezes de caminho e agora só segue no automático…' },
      { img: 'Posts/Post 5 - 4.webp', sub: 'Entendimento', text: 'Quando você cansa de tentar se explicar e começa a querer se entender de verdade.' },
      { img: 'Posts/Post 5 - 5.webp', sub: 'Espaço Seguro', text: 'A terapia é um espaço seguro para olhar para o que é importante para você, no seu tempo.' }
    ]
  },
  '6': {
    title: 'Coisas que não cabem em caixas',
    sections: [
      { img: 'Posts/Post 6.webp', sub: 'Identidade', text: 'Tem coisas que, por mais que a gente tente, não cabem em uma caixinha. Identidade, relacionamentos, desejos, formas de viver…' }
    ]
  },
  'comece-aqui': {
    title: 'Comece Aqui',
    sections: [
      {
        img: 'Posts/Destaque -comece aqui slide 1.webp',
        sub: '#2026',
        text: 'O meu trabalho não busca te ajustar, mas criar um espaço onde você possa existir com a sua mais completa verdade. Em 2026, iniciamos um novo capítulo focado em autenticidade.'
      },
      {
        img: 'Posts/Destaque -comece aqui slide 2.webp',
        sub: 'Singularidade',
        text: 'Minha atuação é direcionada a pessoas que sempre sentiram que não cabiam nos modelos tradicionais de vínculo, identidade ou relação. Acreditamos na beleza do que é único.'
      },
      {
        img: 'Posts/Destaque -comece aqui slide 3.webp',
        sub: 'Espaço Online',
        text: 'Os atendimentos são online, realizados para todo o Brasil, e acontecem em um espaço contínuo de escuta e acolhimento clínico.'
      },
      {
        img: 'Posts/Destaque -comece aqui slide 4.webp',
        sub: 'Vamos conversar?',
        text: 'Quer saber mais sobre o processo? Vamos agendar a primeira conversa para você entender como funciona a psicoterapia!'
      }
    ]
  },
  'agende': {
    title: 'Agende a sua consulta',
    sections: [
      {
        img: 'Posts/Destaque- agende  slide 1.webp',
        sub: 'Acesso Simples',
        text: 'Para agendar a sua consulta, basta entrar em contato. O processo é simples e focado no seu bem-estar.'
      }
    ]
  }
};

function openProject(key) {
  const data = projectData[key];
  if (!data) return;

  const viewer = document.getElementById('projectViewer');
  const title = document.getElementById('pvTitle');
  const content = document.getElementById('pvContent');

  title.textContent = `Projects: ${data.title}`;
  content.innerHTML = '';

  data.sections.forEach((sec, i) => {
    const row = document.createElement('div');
    row.className = `pv-row ${i % 2 !== 0 ? 'reverse' : ''}`;
    row.innerHTML = `
      <div class="pv-img-wrap reveal">
        <img src="${sec.img}" alt="${sec.sub}" loading="lazy">
      </div>
      <div class="pv-text reveal">
        <h3>${sec.sub}</h3>
        <p>${sec.text}</p>
      </div>
    `;
    content.appendChild(row);
  });

  viewer.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // Re-init reveal observer for new elements
  setTimeout(() => {
    content.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }, 100);
}

function closeProject() {
  const viewer = document.getElementById('projectViewer');
  viewer.classList.remove('open');
  document.body.style.overflow = '';
}

// Map old function calls to new ones for backwards compatibility with HTML if any
function openStory(key) { openProject(key); }
function closeStory() { closeProject(); }


/* ══ Highlights Slider ════════════════════════════════ */
const dsState = { 'comece-aqui': 0, 'agende': 0 };
function dsMove(key, dir) {
  const track = document.getElementById(`dt-${key}`);
  const dots = document.getElementById(`dd-${key}`);
  if (!track) return;
  const slides = track.querySelectorAll(".dest-slide-item");
  const total = slides.length;
  let next = dsState[key] + dir;
  if (next < 0) next = total - 1;
  if (next >= total) next = 0;
  dsState[key] = next;
  track.style.transform = `translateX(-${next * 100}%)`;
  renderDsDots(key, total, next);
}
function renderDsDots(key, total, current) {
  const dots = document.getElementById(`dd-${key}`);
  if (!dots) return;
  dots.innerHTML = "";
  if (total <= 1) return;
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("div");
    dot.className = "dest-dot" + (i === current ? " active" : "");
    dots.appendChild(dot);
  }
}
// Init dots
document.addEventListener("DOMContentLoaded", () => {
  renderDsDots("comece-aqui", 4, 0);
  renderDsDots("agende", 1, 0);
});

/* ══ Snap Scroller Navigation ════════════════════════ */
function snapMove(dir) {
  const scroller = document.getElementById("snapTrack");
  if (!scroller) return;
  const sections = scroller.querySelectorAll(".post-section, .destacados-section");
  let currentIdx = 0;
  const scrollPos = scroller.scrollTop;
  const height = scroller.offsetHeight;
  
  // Find which section we are mostly in
  currentIdx = Math.round(scrollPos / height);
  
  let nextIdx = currentIdx + dir;
  if (nextIdx < 0) nextIdx = 0;
  if (nextIdx >= sections.length) nextIdx = sections.length - 1;
  
  sections[nextIdx].scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ══ Main Posts Carousel ══════════════════════════════ */
function moveMainPosts(dir) {
  const track = document.getElementById("mainPostsTrack");
  if (!track) return;
  
  const slides = track.querySelectorAll(".post-section");
  if (!slides.length) return;

  // Find the exact slide currently in view
  const currentIdx = Math.round(track.scrollLeft / track.offsetWidth);
  let targetIdx = currentIdx + dir;
  
  if (targetIdx >= 0 && targetIdx < slides.length) {
    slides[targetIdx].scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest', 
      inline: 'start' 
    });
  }
}

/* ══ Post Indicator ════════════════════════════════════ */
function goToPost(idx) {
  const track = document.getElementById("mainPostsTrack");
  if (!track) return;
  const slides = track.querySelectorAll(".post-section");
  if (slides[idx]) {
    slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}

function updatePostIndicator(idx) {
  document.querySelectorAll('.pi-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
}

// Attach scroll listener
(function initIndicator() {
  const track = document.getElementById("mainPostsTrack");
  if (!track) { setTimeout(initIndicator, 200); return; }
  track.addEventListener('scroll', () => {
    const idx = Math.round(track.scrollLeft / track.offsetWidth);
    updatePostIndicator(idx);
  }, { passive: true });
})();

/* ══ Mobile Meta Bar ════════════════════════════════════ */
function setupMobileMeta() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    document.querySelectorAll('.post-split').forEach(split => {
      if (split.querySelector('.mobile-meta-bar')) return;

      const eyebrow = split.querySelector('.post-eyebrow');
      const sb = split.querySelector('.sb');

      const bar = document.createElement('div');
      bar.className = 'mobile-meta-bar';

      if (eyebrow) bar.appendChild(eyebrow);
      if (sb) bar.appendChild(sb);

      split.insertBefore(bar, split.firstChild);
    });
  } else {
    document.querySelectorAll('.mobile-meta-bar').forEach(bar => {
      const split = bar.closest('.post-split');
      const head = split.querySelector('.post-head');
      const title = split.querySelector('.post-title');
      const eyebrow = bar.querySelector('.post-eyebrow');
      const sb = bar.querySelector('.sb');

      if (eyebrow) head.insertBefore(eyebrow, head.firstChild);
      if (sb && title) title.insertAdjacentElement('afterend', sb);
      else if (sb) head.appendChild(sb);

      bar.remove();
    });
  }
}

setupMobileMeta();
window.addEventListener('resize', setupMobileMeta);
