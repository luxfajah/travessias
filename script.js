
// Preloader logic
const PRELOADER_MIN_TIME = 3200; // Slightly more than 3s to be safe
const pageStartTime = Date.now();

window.addEventListener('load', () => {
  const elapsed = Date.now() - pageStartTime;
  const remaining = Math.max(PRELOADER_MIN_TIME - elapsed, 0);
  
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 800);
    }
  }, remaining);
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
    const displayName = (currentUser === 'travessias@duasmaos.com.br') ? 'Travessias' : 'Duas Mãos (Admin)';
    
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
  
  let currentUser = sessionStorage.getItem('authUser') || '';
  let currentToken = sessionStorage.getItem('authToken') || '';

  if (!currentUser || !currentToken) {
    if (loginScreen) loginScreen.classList.remove('hidden');
    document.body.classList.add('locked');
  } else {
    if (loginScreen) loginScreen.classList.add('hidden');
    document.body.classList.remove('locked');
    loadState();
  }

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
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          sessionStorage.removeItem('authUser');
          sessionStorage.removeItem('authToken');
          showToast('❌', 'Sessão expirada. Recarregue a página.');
        } else {
          // Mostra modal de erro detalhado
          const errorModal = document.getElementById('error-modal');
          const errorMsg = document.getElementById('error-message-text');
          if (errorModal && errorMsg) {
            errorMsg.textContent = err.error || 'Erro interno no servidor (500)';
            errorModal.classList.add('open');
          }
          showToast('❌', 'Erro ao salvar.');
        }
        return;
      }
      
      // Feedback visual de sucesso
      showToast('☁️', 'Salvo na nuvem!');
    } catch(e){ 
      console.error('Erro ao salvar:',e); 
      const errorModal = document.getElementById('error-modal');
      const errorMsg = document.getElementById('error-message-text');
      if (errorModal && errorMsg) {
        errorMsg.textContent = `Falha de Conexão: ${e.message}`;
        errorModal.classList.add('open');
      }
      showToast('❌', 'Falha de conexão.');
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

  /* ══ Lightbox module ════════════════════════════════════ */
  let lbPost=null, lbIdx=0;

  const lbSources = {
    '1': ['Posts/WebP/Post 1 - 1.webp', 'Posts/WebP/Post 1 - 2.webp', 'Posts/WebP/Post 1 - 3.webp', 'Posts/WebP/Post 1 - 4.webp', 'Posts/WebP/Post 1 - 5.webp', 'Posts/WebP/Post 1 - 6.webp', 'Posts/WebP/Post 1 - 7.webp', 'Posts/WebP/Post 1 - 8.webp'],
    '2': ['Posts/WebP/Post 2.webp'],
    '3': ['Posts/WebP/Post 3 - 1.webp', 'Posts/WebP/Post 3 - 2.webp', 'Posts/WebP/Post 3 - 3.webp', 'Posts/WebP/Post 3 - 4.webp', 'Posts/WebP/Post 3 - 5.webp', 'Posts/WebP/Post 3 - 6.webp'],
    '4': ['Posts/WebP/Post 4 - 1.webp', 'Posts/WebP/Post 4 - 2.webp', 'Posts/WebP/Post 4 - 3.webp', 'Posts/WebP/Post 4 - 4.webp', 'Posts/WebP/Post 4 - 5.webp', 'Posts/WebP/Post 4 - 6.webp', 'Posts/WebP/Post 4 - 7.webp', 'Posts/WebP/Post 4 - 8.webp'],
    'comece-aqui': ['destaque 1.jpg'],
    'agende': ['destaque 2.jpg']
  };

  const postMeta = {
    '1': {
      caption: 'Essa citação é de Roberto Crema, um grande expoente da abordagem Transpessoal. Ela nos faz refletir sobre algo muito curioso: sobre o encontro, uma das palavras mais bonitas da experiência humana.',
      cards: [
        '“Ninguém transforma ninguém. Ninguém se transforma sozinha. Nós nos transformamos no Encontro”',
        'No Encontro com as nossas emoções, crenças e padrões…',
        'No Encontro com outras pessoas, culturas e visões de mundo…',
        'No Encontro com algo além do ego, com aquilo que dá sentido à vida: a Espiritualidade',
        'Do Encontro da Psicologia Transpessoal com a Intercultural surge uma abordagem que amplia o olhar sobre a pessoa que migra.',
        '…mas como alguém que atravessa questões existenciais profundas de sentido, pertencimento, conexão e transcendência.',
        'Recursos técnicos como a integração simbólica de sonhos, mindfulness e desenho e escrita terapêutica são algumas das ferramentas aplicadas.',
        'Se fez sentido pra você, compartilhe com aquela amiga que transforma cada encontro em travessia <3'
      ]
    },
    '2': {
      caption: 'Os feedbacks de vocês são muito significativos para nós, porque eles mostram exatamente o que acontece quando decidimos não atravessar sozinhas.',
      cards: ['O que a Comunidade Travessias está falando:']
    },
    '3': {
      caption: 'Quando você atravessa países, culturas e versões de si mesma, não é só o pensamento que precisa de espaço, o corpo sente, os sonhos se movem, as emoções ganham outras camadas.',
      cards: [
        '“Entre mundos: nem daqui, nem de lá.” E o que a psicologia transpessoal diz sobre esse lugar…',
        'Os antropólogos o chamam de "entre-lugar", o espaço de quem pertence a dois ou mais mundos, mas não é completamente de nenhum.',
        'Por vezes, pode ser desconfortável, mas nos dá acesso a um dos lugares mais férteis para saber quem você é de verdade.',
        'A Psicologia Transpessoal entende esse espaço como um portal. Ela parte de uma premissa simples: você não é só sua história pessoal.',
        'Quando você migra, todas essas camadas se movem ao mesmo tempo.',
        'O Travessias trabalha nos pensamentos que permeiam sua mente, nas tensões que se manifestam no seu corpo, nos símbolos que surgem dos seus sonhos.'
      ]
    },
    '4': {
      caption: 'Inscrições abertas para a Jornada Travessias até 08 de Maio. Ainda tem dúvidas? Passe para o lado e entenda mais!',
      cards: [
        'Chegou a hora da nossa primeira Jornada Travessias de 2026. Tem dúvidas sobre o processo? Aqui, tudo que você precisa saber!',
        'As inscrições abrem apenas 2x ao ano. O processo é intenso, individual e altamente personalizado.',
        'A Jornada acontece em 8 encontros, online e ao vivo, para você que está em qualquer parte desse mundo.',
        'Então, saiba que a jornada é para você que busca mais clareza sobre onde está e para onde deseja ir.',
        'Quem já participou deixou um recado para você: "Uma jornada deliciosa! Fui guiada a um encontro comigo mesma num momento chave da vida."',
        'Para essa experiência ser adequada à sua travessia, ferramentas que acessam camadas profundas são utilizadas.',
        'Com a Jornada Travessias, você constrói uma relação mais consciente com o que está vivendo.',
        'Inscrições abertas para a Jornada Travessias até 08 de Maio.'
      ]
    }
  };

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
    const prev=document.getElementById('lbPrev');
    const next=document.getElementById('lbNext');
    const dots=document.getElementById('lbDots');

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
      track.style.transition = 'none';
      track.style.transform = `translateX(0%)`;
    }

    setTimeout(()=>{ track.style.transition = 'transform .35s cubic-bezier(0.25, 1, 0.5, 1)'; }, 10);
    track.style.transform = `translateX(-${lbIdx * 100}%)`;

    prev.disabled=lbIdx===0; next.disabled=lbIdx===total-1;
    prev.style.display=next.style.display=total>1?'flex':'none';
    dots.innerHTML='';
    if(total>1){ srcs.forEach((_,i)=>{ const d=document.createElement('div'); d.className='lb-dot-item'+(i===lbIdx?' active':''); d.onclick=()=>lbGo(i); dots.appendChild(d); }); }
  }

  function populateLbRight(postId){
    const meta=postMeta[postId]||{};
    const cap=document.getElementById('lbCaption');
    cap.innerHTML=`<strong>travessiaspsi</strong> ${meta.caption||''}`;
    
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

    const cl=document.getElementById(`comments-${postId}`);
    const lbCL=document.getElementById('lbCommentsList');
    lbCL.innerHTML='';
    if(cl){
      const items=cl.querySelectorAll('.comment-item');
      if(items.length){ items.forEach(it=>{ const d=document.createElement('div'); d.style.cssText='font-size:11px;line-height:1.5;color:#333;margin-bottom:8px;padding:8px;background:#f9f9f9;border-radius:8px;'; d.innerHTML=it.innerHTML; lbCL.appendChild(d); }); }
      else { lbCL.innerHTML='<div style="font-size:11px;color:#aaa;font-style:italic">Nenhum feedback ainda.</div>'; }
    }

    const ar=document.getElementById('lbActionRow');
    const st=statuses[postId]||'none';
    ar.innerHTML=`
      <button class="lb-abtn lb-abtn-ap${st==='approved'?' active':''}" onclick="setStatus('${postId}','approved');populateLbRight('${postId}')">✓ Aprovar</button>
      <button class="lb-abtn lb-abtn-rj${st==='rejected'?' active':''}" onclick="setStatus('${postId}','rejected');populateLbRight('${postId}')">✎ Reprovar</button>
      <button class="lb-abtn lb-abtn-lt${st==='pending'?' active':''}" onclick="setStatus('${postId}','pending');populateLbRight('${postId}')">⏳ Revisar</button>
    `;
    document.getElementById('lbTextarea').value='';
  }

  function lbSendComment(){
    if(!lbPost) return;
    const txt = document.getElementById('lbTextarea').value.trim();
    if(!txt) return;
    addCommentByText(lbPost, txt);
    setTimeout(()=>populateLbRight(lbPost),50);
  }

  function lbGo(idx){ lbIdx=idx; renderLightbox(); }
  function lbSlide(dir){ const newIdx=lbIdx+dir; if(newIdx<0||newIdx>=lbSources[lbPost].length) return; lbGo(newIdx); }
  function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); document.body.style.overflow=''; lbPost=null; }
  document.addEventListener('keydown',(e)=>{ if(!lbPost) return; if(e.key==='Escape') closeLightbox(); if(e.key==='ArrowRight') lbSlide(1); if(e.key==='ArrowLeft') lbSlide(-1); });


/* ══ Project Viewer ════════════════════════════════════════ */
const projectData = {
  '1': {
    title: 'Educacional: Roberto Crema',
    sections: [
      { img: 'Posts/WebP/Post 1 - 1.webp', sub: 'O Encontro', text: '“Ninguém transforma ninguém. Ninguém se transforma sozinha. Nós nos transformamos no Encontro”' },
      { img: 'Posts/WebP/Post 1 - 2.webp', sub: 'Emoções', text: 'No Encontro com as nossas emoções, crenças e padrões…' },
      { img: 'Posts/WebP/Post 1 - 3.webp', sub: 'Culturas', text: 'No Encontro com outras pessoas, culturas e visões de mundo…' },
      { img: 'Posts/WebP/Post 1 - 4.webp', sub: 'Espiritualidade', text: 'No Encontro com algo além do ego, with aquilo que dá sentido à vida: a Espiritualidade' },
      { img: 'Posts/WebP/Post 1 - 5.webp', sub: 'Abordagem', text: 'Do Encontro da Psicologia Transpessoal com a Intercultural surge uma abordagem que amplia o olhar sobre a pessoa que migra.' }
    ]
  },
  '2': {
    title: 'Prova Social',
    sections: [
      { img: 'Posts/WebP/Post 2.webp', sub: 'Comunidade', text: 'Os feedbacks de vocês são muito significativos para nós, porque eles mostram exatamente o que acontece quando decidimos não atravessar sozinhas.' }
    ]
  },
  '3': {
    title: 'Entre mundos',
    sections: [
      { img: 'Posts/WebP/Post 3 - 1.webp', sub: 'Nem daqui, nem de lá', text: '“Entre mundos: nem daqui, nem de lá.” E o que a psicologia transpessoal diz sobre esse lugar…' },
      { img: 'Posts/WebP/Post 3 - 2.webp', sub: 'Entre-lugar', text: 'Os antropólogos o chamam de "entre-lugar", o espaço de quem pertence a dois ou mais mundos.' },
      { img: 'Posts/WebP/Post 3 - 3.webp', sub: 'Fértil', text: 'Por vezes, pode ser desconfortável, mas nos dá acesso a um dos lugares mais férteis para saber quem você é de verdade.' }
    ]
  },
  '4': {
    title: 'Jornada Travessias',
    sections: [
      { img: 'Posts/WebP/Post 4 - 1.webp', sub: 'Inscrições', text: 'Chegou a hora da nossa primeira Jornada Travessias de 2026. Tudo que você precisa saber!' },
      { img: 'Posts/WebP/Post 4 - 2.webp', sub: 'Personalizado', text: 'As inscrições abrem apenas 2x ao ano. O processo é intenso, individual e altamente personalizado.' },
      { img: 'Posts/WebP/Post 4 - 3.webp', sub: 'Encontros', text: 'A Jornada acontece em 8 encontros, online e ao vivo, para você que está em qualquer parte desse mundo.' }
    ]
  },
  'comece-aqui': {
    title: 'Comece Aqui',
    sections: [
      { img: 'destaque 1.jpg', sub: 'Boas-vindas', text: 'Olá! Seja bem-vindo(a) ao meu espaço! Aqui iniciamos nossa travessia.' }
    ]
  },
  'agende': {
    title: 'Agende',
    sections: [
      { img: 'destaque 2.jpg', sub: 'Contato', text: 'Link na Bio para agendamentos! Vamos conversar?' }
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
