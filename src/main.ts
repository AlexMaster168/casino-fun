import { bootstrapApplication } from '@angular/platform-browser';
import { Component, signal, computed, HostListener } from '@angular/core';
import { Chess, Square } from 'chess.js';
import { PokerCard, pokerResult, initialCheckers, checkerMoves, applyChecker, CheckerMove } from './table-games';

type Game = { id: string; name: string; label: string; icon: string; color: string; category: string; badge?: string };
type Entry = { name: string; amount: number; time: string };
@Component({selector:'app-root',standalone:true,templateUrl:'./app.html'})
class App {
  Math=Math;
  balance = signal(5000); history = signal<Entry[]>([]); tab = signal('Усі ігри'); query = signal(''); active = signal<Game|null>(null);
  bet = signal(100); busy = signal(false); message = signal(''); toast = signal(''); rotation = signal(0); wheelResult = signal('Твоя удача вже на старті'); showHistory = signal(false);
  choice = signal('Червоне'); reels = signal(['🍒','🍋','7']); dice = signal([3,5]); player = signal<number[]>([]); dealer = signal<number[]>([]); round = signal(false);
  opened = signal<number[]>([]); mines: number[] = []; cells = Array.from({length:16},(_,i)=>i); mineLost = signal(false); crash = signal(1); crashTimer?: ReturnType<typeof setInterval>; crashPoint = 1; toastTimer?: ReturnType<typeof setTimeout>;
  games: Game[] = [
    {id:'slots',name:'Фруктовий джекпот',label:'КЛАСИЧНІ СЛОТИ',icon:'🍒',color:'pink',category:'Слоти',badge:'ХІТ'},
    {id:'roulette',name:'Рулетка',label:'ЗРОБИ СВІЙ ВИБІР',icon:'◉',color:'green',category:'Настільні'},
    {id:'blackjack',name:'Блекджек',label:'БЛИЖЧЕ ДО 21',icon:'♠',color:'blue',category:'Настільні'},
    {id:'dice',name:'Щасливі кубики',label:'КИДАЙ ТА ПЕРЕМАГАЙ',icon:'⚄',color:'orange',category:'Швидкі'},
    {id:'mines',name:'Діамантові міни',label:'ЗНАЙДИ СВІЙ СКАРБ',icon:'◆',color:'purple',category:'Швидкі',badge:'НОВЕ'},
    {id:'crash',name:'До Місяця',label:'ВСТИГНИ ЗАБРАТИ',icon:'↗',color:'lime',category:'Швидкі'},
    {id:'coin',name:'Орел чи решка',label:'ОДИН КИДОК. ДВА ШАНСИ.',icon:'◎',color:'gold',category:'Швидкі'},
    {id:'seven',name:'Щаслива сімка',label:'ВПІЙМАЙ СІМКУ',icon:'7',color:'red',category:'Слоти'},
    {id:'poker',name:'Відеопокер',label:'ЗБЕРИ СВОЮ КОМБІНАЦІЮ',icon:'♥',color:'purple',category:'Настільні',badge:'НОВЕ'},
    {id:'chess',name:'Шахи',label:'ТВІЙ ХІД — ТВОЯ ПЕРЕМОГА',icon:'♞',color:'blue',category:'Настільні',badge:'НОВЕ'},
    {id:'checkers',name:'Шашки',label:'ДУМАЙ НА КРОК УПЕРЕД',icon:'◉',color:'orange',category:'Настільні',badge:'НОВЕ'}
  ];
  filtered = computed(()=>this.games.filter(g=>(this.tab()==='Усі ігри'||g.category===this.tab())&&g.name.toLowerCase().includes(this.query().toLowerCase())));
  poker=signal<PokerCard[]>([]);held=signal<number[]>([]);deck:PokerCard[]=[];
  chess=new Chess();chessPosition=signal(this.chess.fen());selected=signal<number|null>(null);targets=signal<number[]>([]);boardCells=Array.from({length:64},(_,i)=>i);
  checkers=signal<number[]>(initialCheckers());chain:number|undefined;quietMoves=0;
  square(i:number){return ('abcdefgh'[i%8]+(8-Math.floor(i/8))) as Square;}
  chessPiece(i:number){this.chessPosition();const p=this.chess.get(this.square(i));return p?({w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}}[p.color][p.type]):'';}
  rankLabel(r:number){return ({11:'J',12:'Q',13:'K',14:'A'} as Record<number,string>)[r]||r;}
  hold(i:number){if(this.round())this.held.update(h=>h.includes(i)?h.filter(v=>v!==i):[...h,i]);}
  dealPoker(){this.deck=[];for(const suit of ['♠','♥','♦','♣'])for(let rank=2;rank<=14;rank++)this.deck.push({rank,suit});for(let i=this.deck.length-1;i>0;i--){const j=this.random(i+1);[this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]];}this.poker.set(this.deck.splice(0,5));this.held.set([]);this.round.set(true);}
  drawPoker(){if(!this.round())return;this.poker.update(cards=>cards.map((c,i)=>this.held().includes(i)?c:this.deck.pop()!));const result=pokerResult(this.poker());this.pay(this.bet()*result.mult,result.name+'.');}
  chessEnd(){if(!this.chess.isGameOver())return false;this.pay(this.chess.isCheckmate()?(this.chess.turn()==='b'?this.bet()*2:0):this.bet(),this.chess.isCheckmate()?(this.chess.turn()==='b'?'Мат! Твоя перемога.':'Комп’ютер поставив мат.'):'Нічия. Ставку повернуто.');return true;}
  boardClick(i:number){if(!this.round()||this.busy())return;if(this.active()?.id==='checkers'){this.checkerClick(i);return;}
    if(this.selected()!==null&&this.targets().includes(i)){this.chess.move({from:this.square(this.selected()!),to:this.square(i),promotion:'q'});this.selected.set(null);this.targets.set([]);this.chessPosition.set(this.chess.fen());if(this.chessEnd())return;this.busy.set(true);this.message.set('Комп’ютер обмірковує хід…');setTimeout(()=>{const values:Record<string,number>={p:1,n:3,b:3,r:5,q:9,k:100};const moves=this.chess.moves({verbose:true});const scored=moves.map(m=>({m,score:(m.captured?values[m.captured]*10:0)+(m.san.includes('#')?10000:m.san.includes('+')?2:0)+this.random(10)})).sort((a,b)=>b.score-a.score);this.chess.move(scored[0].m);this.chessPosition.set(this.chess.fen());this.busy.set(false);if(!this.chessEnd())this.message.set(this.chess.isCheck()?'Шах! Захисти короля.':'Твій хід. Ти граєш білими.');},400);
    }else {const piece=this.chess.get(this.square(i));if(piece?.color!=='w')return;this.selected.set(i);this.targets.set(this.chess.moves({square:this.square(i),verbose:true}).map(m=>(8-Number(m.to[1]))*8+'abcdefgh'.indexOf(m.to[0])));}
  }
  checkerClick(i:number){const moves=checkerMoves(this.checkers(),1,this.chain);const move=moves.find(m=>m.from===this.selected()&&m.to===i);if(move){this.executeChecker(move,1);return;}if(this.chain!==undefined)return;this.selected.set(i);this.targets.set(moves.filter(m=>m.from===i).map(m=>m.to));}
  executeChecker(move:CheckerMove,side:number){const result=applyChecker(this.checkers(),move);this.checkers.set(result.board);this.quietMoves=move.captured!==undefined||result.promoted?0:this.quietMoves+1;const follow=move.captured!==undefined&&!result.promoted?checkerMoves(result.board,side,move.to):[];
    if(follow.length){if(side===1){this.chain=move.to;this.selected.set(move.to);this.targets.set(follow.map(m=>m.to));this.message.set('Продовжуй обов’язкове взяття цією шашкою.');}else this.executeChecker(follow[this.random(follow.length)],-1);return;}
    this.chain=undefined;this.selected.set(null);this.targets.set([]);if(!checkerMoves(result.board,-side).length){this.pay(side===1?this.bet()*2:0,side===1?'Твоя перемога!':'Комп’ютер переміг.');return;}if(this.quietMoves>=80){this.pay(this.bet(),'Нічия після 80 ходів без взяття або перетворення.');return;}
    if(side===1){this.busy.set(true);this.message.set('Хід комп’ютера…');setTimeout(()=>{const options=checkerMoves(this.checkers(),-1);this.executeChecker(options[this.random(options.length)],-1);},350);}else{this.busy.set(false);this.message.set('Твій хід. Ти граєш світлими.');}
  }
  resign(){if(!this.round()||this.busy())return;this.pay(0,'Партію завершено: ти здався.');}
  constructor(){try {const saved=JSON.parse(localStorage.getItem('lucky-v1')||'null');if(saved && Number.isFinite(saved.balance) && saved.balance>=0){this.balance.set(Math.min(saved.balance,1e12));this.history.set(Array.isArray(saved.history)?saved.history.filter((e:any)=>typeof e.name==='string'&&Number.isFinite(e.amount)&&typeof e.time==='string').slice(0,30):[]);}}catch{}}
  fmt(n:number){return new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(n);}
  random(n:number){const a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*n);}
  save(){try{localStorage.setItem('lucky-v1',JSON.stringify({balance:this.balance(),history:this.history()}));}catch{this.notify('Збереження недоступне. Баланс діє до закриття сторінки.');}}
  record(name:string,amount:number){this.history.update(h=>[{name,amount,time:new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})},...h].slice(0,30));this.save();}
  notify(s:string){this.toast.set(s);clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.set(''),3500);}
  topup(){this.balance.update(v=>v+1000);this.record('Безкоштовне поповнення',1000);this.notify('+1 000 монет. Гарної гри!');}
  setBet(value:string){this.bet.set(Math.max(10,Math.min(10000,Math.floor(Number(value)||10))));}
  charge(){if(this.balance()<this.bet()){this.message.set('Недостатньо монет. Поповни баланс безкоштовно.');return false;}this.balance.update(v=>v-this.bet());this.record(this.active()?.name||'Колесо фортуни',-this.bet());return true;}
  pay(amount:number,text:string){amount=Math.round(amount);this.balance.update(v=>v+amount);if(amount)this.record(this.active()?.name||'Колесо фортуни',amount);this.message.set(text+(amount?' +'+this.fmt(amount)+' монет':''));this.busy.set(false);this.round.set(false);}
  previousFocus: HTMLElement|null=null;
  open(g:Game){if(this.busy())return;this.previousFocus=document.activeElement as HTMLElement;this.active.set(g);this.message.set('');this.choice.set(g.id==='coin'?'Орел':'Червоне');this.opened.set([]);this.mineLost.set(false);this.player.set([]);this.dealer.set([]);this.crash.set(1);this.chess.reset();this.chessPosition.set(this.chess.fen());this.checkers.set(initialCheckers());this.selected.set(null);this.targets.set([]);this.chain=undefined;this.quietMoves=0;this.poker.set([]);this.held.set([]);if(g.id==='seven')this.reels.set(['7','★','7']);if(g.id==='slots')this.reels.set(['🍒','🍋','🍇']);document.body.style.overflow='hidden';setTimeout(()=>document.querySelector<HTMLButtonElement>('.close')?.focus());}
  close(){if(this.busy()||this.round())return;this.active.set(null);document.body.style.overflow='';this.previousFocus?.focus();}
  @HostListener('document:keydown',['$event']) keyboard(e:KeyboardEvent){if(!this.active())return;if(e.key==='Escape')this.close();if(e.key==='Tab'){const items=Array.from(document.querySelectorAll<HTMLElement>('.game-modal button:not(:disabled), .game-modal input:not(:disabled)'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
  spin(){if(this.busy()||this.active())return;this.busy.set(true);const index=this.random(8);const prizes=[100,250,50,500,100,1000,50,250];const target=(360-index*45)%360;this.rotation.update(r=>r+1800+((target-r%360+360)%360));this.wheelResult.set('Нехай пощастить…');setTimeout(()=>{const win=prizes[index];this.balance.update(v=>v+win);this.record('Колесо фортуни',win);this.wheelResult.set('Твій виграш: +'+this.fmt(win)+' монет!');this.busy.set(false);this.notify('Колесо подарувало '+win+' монет ✨');},3800);}
  play(){if(this.busy()||this.round()||!this.charge())return;this.message.set('');const id=this.active()!.id;
    if(id==='poker'){this.dealPoker();return;}
    if(id==='chess'||id==='checkers'){this.chess.reset();this.chessPosition.set(this.chess.fen());this.checkers.set(initialCheckers());this.selected.set(null);this.targets.set([]);this.chain=undefined;this.quietMoves=0;this.round.set(true);this.message.set('Твій хід. Обери фігуру, потім підсвічену клітинку.');return;}
    if(id==='blackjack'){this.player.set([this.card(),this.card()]);this.dealer.set([this.card()]);this.round.set(true);if(this.total(this.player())===21)this.stand();return;}
    if(id==='mines'){this.mines=[];while(this.mines.length<3){const n=this.random(16);if(!this.mines.includes(n))this.mines.push(n);}this.opened.set([]);this.mineLost.set(false);this.round.set(true);return;}
    if(id==='crash'){this.round.set(true);this.crash.set(1);this.crashPoint=1+this.random(400)/100;this.crashTimer=setInterval(()=>{this.crash.update(n=>+(n+0.05).toFixed(2));if(this.crash()>=this.crashPoint){clearInterval(this.crashTimer);this.pay(0,'Політ завершено. Спробуй ще!');}},120);return;}
    this.busy.set(true);setTimeout(()=>{
      if(id==='slots'||id==='seven'){const symbols=id==='seven'?['7','★','◆']:['🍒','🍋','🍇'];const r=[0,0,0].map(()=>symbols[this.random(3)]);this.reels.set(r);const mult=r.every(v=>v===r[0])?5:new Set(r).size===2?1.2:0;this.pay(this.bet()*mult,mult?'Є комбінація!':'Цього разу без комбінації.');}
      if(id==='roulette'){const n=this.random(37);const color=n===0?'Зелене':n%2?'Червоне':'Чорне';this.pay(color===this.choice()?this.bet()*(n===0?36:2):0,'Випало '+n+' · '+color+'.');}
      if(id==='dice'){const d=[this.random(6)+1,this.random(6)+1];this.dice.set(d);this.pay(d[0]+d[1]>=8?this.bet()*2:0,'Сума: '+(d[0]+d[1])+'.');}
      if(id==='coin'){const result=this.random(2)?'Орел':'Решка';this.pay(result===this.choice()?this.bet()*2:0,'Випало: '+result+'.');}
    },650);
  }
  card(){return Math.min(10,this.random(13)+1);}
  total(cards:number[]){let sum=cards.reduce((a,b)=>a+b,0);if(cards.includes(1)&&sum+10<=21)sum+=10;return sum;}
  hit(){this.player.update(p=>[...p,this.card()]);if(this.total(this.player())>21)this.pay(0,'Перебір. Цього разу переміг дилер.');else if(this.total(this.player())===21)this.stand();}
  stand(){const d=[...this.dealer()];while(this.total(d)<17)d.push(this.card());this.dealer.set(d);const p=this.total(this.player()),v=this.total(d);this.pay(v>21||p>v?this.bet()*2:p===v?this.bet():0,v>21||p>v?'Ти переміг!':p===v?'Нічия. Ставку повернуто.':'Дилер переміг.');}
  reveal(i:number){if(!this.round()||this.opened().includes(i))return;if(this.mines.includes(i)){this.mineLost.set(true);this.pay(0,'Міна! Скарб залишиться на наступний раз.');return;}this.opened.update(v=>[...v,i]);if(this.opened().length===13)this.cashout();}
  mineMultiplier(){let value=1;for(let i=0;i<this.opened().length;i++)value*=(16-i)/(13-i);return Math.floor(value*100)/100;}
  cashout(){if(!this.round())return;clearInterval(this.crashTimer);this.pay(this.bet()*(this.active()?.id==='crash'?this.crash():this.mineMultiplier()),'Виграш у кишені!');}
}
bootstrapApplication(App).catch(console.error);
