
const QUESTIONS=[
  'Qui arriverait en retard à son propre anniversaire ?',
  'Qui serait capable de partir en vacances sans valise ?',
  'Qui survivrait le mieux sur une île déserte ?',
  'Qui commanderait une pizza à 3 h du matin ?',
  'Qui se perdrait avec un GPS ?',
  'Qui deviendrait célèbre pour une raison ridicule ?',
  'Qui organiserait une soirée improvisée ?',
  'Qui serait le plus fort dans un escape game ?',
  'Qui pourrait dormir pendant une soirée ?',
  'Qui ferait le meilleur chef de groupe ?',
  'Qui dirait oui à un voyage décidé en cinq minutes ?',
  'Qui serait le premier éliminé dans un jeu de survie ?'
];
const WORDS=['chat','fusée','pizza','château','téléphone','soleil','bateau','licorne','ordinateur','vélo','cactus','dragon','glace','parapluie','robot','montagne','avion','guitare','poulpe','dinosaure','maison','banane','fantôme','volcan','papillon','camion'];
const KIND={shifumi:'Shifumi Arena',bande:'Qui dans la bande ?',dessin:'Dessine & Devine'};
const LABEL={rock:'Pierre',paper:'Feuille',scissors:'Ciseaux'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const date=s=>s?.toDate?.()?.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})||'';
export function openGames(ctx){
 const {fs,db,uid,groupId,members,avatarOf,html,status,setCleanup,goHome}=ctx;
 const groupPath='groups/'+groupId;
 const ref=path=>fs.doc(db,path), col=path=>fs.collection(db,path);
 const gamePath=id=>groupPath+'/games/'+id;
 const name=id=>members[id]?.name||'Un pote';
 const miniAvatar=(id,size=40)=>avatarOf(id,size);
 let cleanup=[],currentId=null,currentGame=null,drawPoints=null,secret=null;
 const stop=()=>{cleanup.forEach(f=>{try{f()}catch{}});cleanup=[]};
 const on=(q,success)=>{const off=fs.onSnapshot(q,success,e=>status('Jeux : '+e.message,true));cleanup.push(off)};
 const screen=markup=>{stop();clearChild();html(markup);setCleanup(()=>{stop();clearChild()})};
 const back='<a href="#group/'+encodeURIComponent(groupId)+'" class="subtle">← Retour au groupe</a>';
 const error=e=>{console.error(e);status('Jeux : '+(e?.message||e),true)};
 const shell=(title,body,sub='')=>back+'<section class="game-hero"><p class="eyebrow">LA RÉCRÉ</p><h1>'+escape(title)+'</h1><p>'+escape(sub)+'</p></section>'+body;
 function openLobby(){
   currentId=null;currentGame=null;secret=null;
   screen(shell('On joue ?', '<section class="game-grid">'+
     '<button class="game-tile" data-type="shifumi"><span class="game-icon">VS</span><strong>Shifumi Arena</strong><small>Affronte un pote. Les choix restent secrets jusqu’au duel.</small><b>Lancer une partie ↗</b></button>'+
     '<button class="game-tile" data-type="bande"><span class="game-icon">?</span><strong>Qui dans la bande ?</strong><small>Vote pour le pote qui correspond à une question déjantée.</small><b>Lancer une partie ↗</b></button>'+
     '<button class="game-tile" data-type="dessin"><span class="game-icon">✎</span><strong>Dessine & Devine</strong><small>Dessine un mot, les autres tentent de le trouver.</small><b>Lancer une partie ↗</b></button>'+
     '</section><section class="panel"><h2>Les parties du groupe</h2><div id="gameList"><p>Chargement...</p></div></section>','Défie ta bande avec tes avatars 2D !'));
   document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>create(b.dataset.type));
   on(fs.query(col(groupPath+'/games'),fs.orderBy('createdAt','desc'),fs.limit(25)),snap=>{
     const el=document.getElementById('gameList');if(!el)return;
     el.innerHTML=snap.empty?'<p class="subtle">Aucune partie pour le moment. Lance la première !</p>':
       snap.docs.map(d=>{const g=d.data();return '<a class="game-session" href="#games/'+groupId+'/'+d.id+'"><span class="game-session-avatar">'+miniAvatar(g.ownerId,42)+'</span><span><strong>'+escape(KIND[g.type]||'Mini-jeu')+'</strong><small>'+escape(name(g.ownerId))+' · '+date(g.createdAt)+(g.revealed?' · Terminé':' · En cours')+'</small></span><b>Jouer ↗</b></a>'}).join('');
   });
 }
 async function create(type){
   if(!KIND[type])return;
   const buttons=[...document.querySelectorAll('[data-type]')];buttons.forEach(b=>b.disabled=true);
   try{
     const game=ref(groupPath+'/games/'+fs.doc(col(groupPath+'/games')).id);
     const data={type,ownerId:uid,title:KIND[type],createdAt:fs.serverTimestamp(),updatedAt:fs.serverTimestamp(),revealed:false,playerIds:[uid],readyIds:[],prompt:type==='bande'?QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)]:''};
     if(type==='dessin'){
       const batch=fs.writeBatch(db);batch.set(game,data);
       batch.set(ref(game.path+'/secret/word'),{word:WORDS[Math.floor(Math.random()*WORDS.length)]});
       await batch.commit();
     }else await fs.setDoc(game,data);
     location.hash='games/'+groupId+'/'+game.id;
   }catch(e){error(e);buttons.forEach(b=>b.disabled=false)}
 }
 async function openSession(id){
   currentId=id;currentGame=null;secret=null;
   screen(shell('Chargement de la partie...', '<section class="panel"><p>Connexion au jeu…</p></section>'));
   on(ref(gamePath(id)),snap=>{
     if(!snap.exists()){status('Cette partie est introuvable.',true);return}
     const game={id,...snap.data()};currentGame=game;
     // Updating the game view replaces only the inside panel so the session listener survives.
     showSession(game);
   });
 }
 let sessionKey='',childStop=[],strokes=[],guesses=[];
 const clearChild=()=>{childStop.forEach(x=>x());childStop=[]};
 const watch=(q,callback)=>{childStop.push(fs.onSnapshot(q,callback,error))};
 function showSession(game){
   if(sessionKey!==game.id){clearChild();sessionKey=game.id;strokes=[];guesses=[]}
   const box=document.getElementById('gamePanel');
   if(!box){
     const wrap=shell(KIND[game.type]||'Mini-jeu','<div class="game-top"><span>'+miniAvatar(game.ownerId,46)+'</span><span>Partie créée par <strong>'+escape(name(game.ownerId))+'</strong></span><a class="btn secondary small" href="#games/'+groupId+'">Toutes les parties</a></div><section class="panel" id="gamePanel"></section>');
     document.getElementById('view').innerHTML=wrap;
   }
   if(game.type==='shifumi')renderShifumi(game);
   if(game.type==='bande')renderBande(game);
   if(game.type==='dessin')renderDessin(game);
 }
 async function joinShifumi(game){
   try{
     await fs.runTransaction(db,async tx=>{
       const r=ref(gamePath(game.id)),snap=await tx.get(r),p=snap.data().playerIds||[];
       if(p.length!==1||p.includes(uid))throw Error('La partie a déjà deux joueurs.');
       tx.update(r,{playerIds:[...p,uid],updatedAt:fs.serverTimestamp()});
     });
   }catch(e){error(e)}
 }
 function renderShifumi(game){
   const p=game.playerIds||[],ready=game.readyIds||[],finished=p.length===2&&p.every(id=>ready.includes(id));
   const role=p.includes(uid),canJoin=!role&&p.length===1;
   const el=document.getElementById('gamePanel');if(!el)return;
   let body='<div class="duel-row">'+p.map(id=>'<div class="duel-player">'+miniAvatar(id,76)+'<strong>'+escape(name(id))+'</strong><small>'+(ready.includes(id)?'Choix verrouillé':'En attente')+'</small></div>').join('<span class="duel-vs">VS</span>')+(p.length===1?'<div class="duel-player ghost-player"><strong>À qui le tour ?</strong></div>':'')+'</div>';
   if(canJoin)body+='<button class="btn" id="joinDuel">Rejoindre le duel</button>';
   else if(p.length===1)body+='<p>Partage le lien de cette partie à un pote du groupe.</p>';
   else if(role&&!ready.includes(uid))body+='<p>Choisis ton coup. Personne ne le verra avant les deux réponses !</p><div class="move-grid">'+Object.entries(LABEL).map(([id,label])=>'<button class="move-btn" data-move="'+id+'">'+label+'</button>').join('')+'</div>';
   else if(finished)body+='<div id="duelResult"><p>Révélation des coups…</p></div>';
   else body+='<p class="game-notice">Choix enregistré. En attente de l’autre joueur…</p>';
   el.innerHTML=body;
   if(canJoin)document.getElementById('joinDuel').onclick=()=>joinShifumi(game);
   el.querySelectorAll('[data-move]').forEach(b=>b.onclick=async()=>{
     el.querySelectorAll('[data-move]').forEach(x=>x.disabled=true);
     try{
       await fs.setDoc(ref(gamePath(game.id)+'/moves/'+uid),{userId:uid,choice:b.dataset.move,createdAt:fs.serverTimestamp()});
       await fs.updateDoc(ref(gamePath(game.id)),{readyIds:fs.arrayUnion(uid),updatedAt:fs.serverTimestamp()});
     }catch(e){error(e);renderShifumi(game)}
   });
   if(finished){
     fs.getDocs(col(gamePath(game.id)+'/moves')).then(snap=>{
       if(currentId!==game.id)return;
       const moves={};snap.forEach(d=>moves[d.id]=d.data().choice);
       const [a,b]=p,win=moves[a]===moves[b]?null:(
         (moves[a]==='rock'&&moves[b]==='scissors')||
         (moves[a]==='paper'&&moves[b]==='rock')||
         (moves[a]==='scissors'&&moves[b]==='paper')?a:b);
       const res=document.getElementById('duelResult');if(!res)return;
       res.innerHTML='<div class="duel-result">'+p.map(id=>'<div>'+miniAvatar(id,62)+'<strong>'+escape(name(id))+'</strong><span>'+escape(LABEL[moves[id]]||'?')+'</span></div>').join('')+'</div><h2>'+(win?'Victoire de '+escape(name(win))+' !':'Égalité parfaite !')+'</h2>';
     }).catch(error);
   }else if(role&&!ready.includes(uid)){
     fs.getDoc(ref(gamePath(game.id)+'/moves/'+uid)).then(snap=>{
       if(snap.exists()&&currentGame?.id===game.id&&!currentGame.readyIds?.includes(uid))fs.updateDoc(ref(gamePath(game.id)),{readyIds:fs.arrayUnion(uid),updatedAt:fs.serverTimestamp()}).catch(error);
     }).catch(error);
   }
 }
 let ownAnswerCache=null,answerWatchId='';
 function renderBande(game){
   const el=document.getElementById('gamePanel');if(!el)return;
   const players=Object.keys(members);
   el.innerHTML='<p class="eyebrow">QUI EST LE PLUS SUSCEPTIBLE DE…</p><h2 class="quiz-prompt">'+escape(game.prompt)+'</h2><div id="quizBody"></div>';
   if(answerWatchId!==game.id){answerWatchId=game.id;ownAnswerCache=null;
     fs.getDoc(ref(gamePath(game.id)+'/answers/'+uid)).then(s=>{if(currentGame?.id===game.id){ownAnswerCache=s.exists()?s.data():null;updateBande(currentGame)}}).catch(error);
   }
   updateBande(game);
 }
 function updateBande(game){
   const box=document.getElementById('quizBody');if(!box)return;
   if(!game.revealed){
     box.innerHTML='<p>'+(ownAnswerCache?'Ton vote est enregistré. Le créateur peut révéler les réponses !':'Choisis le pote qui correspond le mieux :')+'</p><div class="quiz-options">'+Object.keys(members).map(id=>'<button data-person="'+escape(id)+'" class="quiz-person'+(ownAnswerCache?.targetUid===id?' picked':'')+'" '+(ownAnswerCache?'disabled':'')+'>'+miniAvatar(id,51)+'<strong>'+escape(name(id))+'</strong></button>').join('')+'</div>'+(game.ownerId===uid?'<button id="revealQuiz" class="btn">Révéler les votes</button>':'<p class="subtle">En attente de la révélation par le créateur.</p>');
     box.querySelectorAll('[data-person]').forEach(b=>b.onclick=async()=>{box.querySelectorAll('[data-person]').forEach(x=>x.disabled=true);try{
       await fs.setDoc(ref(gamePath(game.id)+'/answers/'+uid),{userId:uid,targetUid:b.dataset.person,createdAt:fs.serverTimestamp()});ownAnswerCache={targetUid:b.dataset.person};updateBande(game);status('Vote enregistré !');
     }catch(e){error(e);updateBande(game)}});
     if(game.ownerId===uid)document.getElementById('revealQuiz').onclick=()=>fs.updateDoc(ref(gamePath(game.id)),{revealed:true,updatedAt:fs.serverTimestamp()}).catch(error);
   }else{
     box.innerHTML='<p>Les résultats sont là !</p><div id="quizResults">Chargement…</div>';
     fs.getDocs(col(gamePath(game.id)+'/answers')).then(s=>{
       if(currentGame?.id!==game.id)return;
       const counts={};s.forEach(x=>{const target=x.data().targetUid;counts[target]=(counts[target]||0)+1});
       const max=Math.max(1,...Object.values(counts));
       const result=document.getElementById('quizResults');if(!result)return;
       result.innerHTML=Object.keys(members).sort((a,b)=>(counts[b]||0)-(counts[a]||0)).map(id=>'<div class="quiz-result">'+miniAvatar(id,42)+'<strong>'+escape(name(id))+'</strong><span class="quiz-bar"><i style="width:'+((counts[id]||0)/max*100)+'%"></i></span><b>'+(counts[id]||0)+'</b></div>').join('');
     }).catch(error);
   }
 }
 function renderDessin(game){
   const el=document.getElementById('gamePanel');if(!el)return;
   const drawer=game.ownerId===uid;
   el.innerHTML='<p>Le dessinateur : <strong>'+escape(name(game.ownerId))+'</strong>. '+(drawer?'Fais deviner ton mot à la bande !':'Devine ce que représente le dessin !')+'</p>'+
     '<div class="drawing-wrap"><canvas id="drawCanvas" width="700" height="440" aria-label="Dessin collaboratif"></canvas></div>'+
     (drawer?'<div class="draw-tools"><label>Ton mot secret : <strong id="secretWord">Chargement…</strong></label><button class="btn secondary small" id="clearDrawing">Effacer le tableau</button><button class="btn" id="endDrawing">Révéler le mot</button></div>':
       '<form id="guessForm" class="guess-form"><label>Ta proposition</label><div class="row"><input name="guess" maxlength="60" placeholder="Je pense que c’est…" autocomplete="off" required '+(game.revealed?'disabled':'')+'><button class="btn" '+(game.revealed?'disabled':'')+'>Envoyer</button></div></form>')+
     '<div id="drawingFinish"></div><h3>Les propositions</h3><div id="guessesList">Chargement…</div>';
   const canvas=document.getElementById('drawCanvas');paint(canvas,strokes);
   if(drawer&&!game.revealed){attachDrawer(canvas,game)}
   else canvas.style.touchAction='auto';
   if(drawer){
     fs.getDoc(ref(gamePath(game.id)+'/secret/word')).then(d=>{secret=d.data()?.word||'';const t=document.getElementById('secretWord');if(t)t.textContent=secret||'Mot indisponible'}).catch(error);
     document.getElementById('clearDrawing').onclick=async()=>{
       if(!confirm('Effacer tous les traits ?'))return;
       try{const docs=await fs.getDocs(col(gamePath(game.id)+'/strokes'));const batch=fs.writeBatch(db);docs.docs.forEach(d=>batch.delete(d.ref));await batch.commit()}catch(e){error(e)}
     };
     document.getElementById('endDrawing').onclick=()=>fs.updateDoc(ref(gamePath(game.id)),{revealed:true,updatedAt:fs.serverTimestamp()}).catch(error);
     document.getElementById('clearDrawing').disabled=!!game.revealed;
     document.getElementById('endDrawing').disabled=!!game.revealed;
   }else if(!game.revealed){
     document.getElementById('guessForm').onsubmit=async e=>{
       e.preventDefault();const input=e.target.elements.guess,value=input.value.trim().slice(0,60);if(!value)return;
       const button=e.submitter;button.disabled=true;
       try{await fs.addDoc(col(gamePath(game.id)+'/guesses'),{userId:uid,text:value,createdAt:fs.serverTimestamp()});input.value=''}
       catch(e){error(e)}finally{button.disabled=false}
     };
   }
   if(!childStop.length){
     watch(col(gamePath(game.id)+'/strokes'),snap=>{strokes=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));const c=document.getElementById('drawCanvas');if(c)paint(c,strokes)});
     watch(fs.query(col(gamePath(game.id)+'/guesses'),fs.orderBy('createdAt','asc'),fs.limit(100)),snap=>{
       guesses=snap.docs.map(d=>d.data());displayGuesses();
       if(secret&&!currentGame?.revealed){
         const winner=guesses.find(g=>norm(g.text)===norm(secret));
         if(winner&&currentGame?.ownerId===uid)fs.updateDoc(ref(gamePath(game.id)),{revealed:true,updatedAt:fs.serverTimestamp()}).catch(error);
       }
     });
   }
   displayGuesses();
   if(game.revealed){
     fs.getDoc(ref(gamePath(game.id)+'/secret/word')).then(d=>{
       if(currentGame?.id!==game.id)return;
       const target=document.getElementById('drawingFinish');if(target)target.innerHTML='<div class="game-notice">Le mot était <strong>'+escape(d.data()?.word||'?')+'</strong> !</div>';
     }).catch(error);
   }
 }
 function displayGuesses(){
   const box=document.getElementById('guessesList');if(!box)return;
   box.innerHTML=guesses.length?guesses.map(g=>'<div class="guess-item">'+miniAvatar(g.userId,31)+'<span><strong>'+escape(name(g.userId))+'</strong> : '+escape(g.text)+'</span></div>').join(''):'<p class="subtle">Personne n’a proposé de mot pour l’instant.</p>';
 }
 function paint(canvas,data){
   const c=canvas.getContext('2d');c.clearRect(0,0,700,440);
   c.fillStyle='#fffdf6';c.fillRect(0,0,700,440);
   c.strokeStyle='#2d2446';c.lineWidth=5;c.lineCap='round';c.lineJoin='round';
   for(const stroke of data){const pts=stroke.points||[];if(!pts.length)continue;
     // Firestore does not support nested arrays: each point is a map {x,y}.
     c.beginPath();c.moveTo(pts[0].x/1000*700,pts[0].y/1000*440);
     for(const {x,y} of pts.slice(1))c.lineTo(x/1000*700,y/1000*440);
     if(pts.length===1)c.lineTo(pts[0].x/1000*700+.1,pts[0].y/1000*440+.1);
     c.stroke();
   }
 }
 function attachDrawer(canvas,game){
   canvas.style.touchAction='none';let drawing=false,points=[];
   const point=e=>{const r=canvas.getBoundingClientRect();return {
     x:Math.max(0,Math.min(1000,Math.round((e.clientX-r.left)/r.width*1000))),
     y:Math.max(0,Math.min(1000,Math.round((e.clientY-r.top)/r.height*1000)))
   }};
   canvas.onpointerdown=e=>{if(currentGame?.revealed)return;drawing=true;points=[point(e)];canvas.setPointerCapture(e.pointerId)};
   canvas.onpointermove=e=>{if(!drawing)return;const p=point(e),prev=points[points.length-1];if(Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y)<3)return;if(points.length<100)points.push(p);paint(canvas,[...strokes,{points}])};
   canvas.onpointerup=async()=>{
     if(!drawing)return;drawing=false;const out=points;points=[];
     if(!out.length)return;
     try{await fs.addDoc(col(gamePath(game.id)+'/strokes'),{userId:uid,points:out,createdAt:fs.serverTimestamp()})}catch(e){error(e);paint(canvas,strokes)}
   };
   canvas.onpointercancel=()=>{drawing=false;points=[];paint(canvas,strokes)};
 }
 // Hash changes call the main router; all active Firestore listeners are released.
 const initial=location.hash.split('/');
 if(initial[2])openSession(decodeURIComponent(initial[2]));
 else openLobby();
 return ()=>{stop();clearChild();sessionKey='';answerWatchId='';};
}
