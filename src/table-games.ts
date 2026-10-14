export type PokerCard={rank:number;suit:string};
export function pokerResult(cards:PokerCard[]):{name:string;mult:number}{
  const ranks=cards.map(c=>c.rank).sort((a,b)=>a-b),counts=Object.values(ranks.reduce((a,r)=>{a[r]=(a[r]||0)+1;return a;},{} as Record<number,number>)).sort((a,b)=>b-a);
  const flush=cards.every(c=>c.suit===cards[0].suit),straight=new Set(ranks).size===5&&(ranks[4]-ranks[0]===4||ranks.join(',')==='2,3,4,5,14');
  if(flush&&straight)return {name:ranks[0]===10?'Роял-флеш':'Стріт-флеш',mult:ranks[0]===10?250:50};
  if(counts[0]===4)return {name:'Каре',mult:25};if(counts[0]===3&&counts[1]===2)return {name:'Фул-хаус',mult:9};if(flush)return {name:'Флеш',mult:6};if(straight)return {name:'Стріт',mult:4};if(counts[0]===3)return {name:'Трійка',mult:3};if(counts[0]===2&&counts[1]===2)return {name:'Дві пари',mult:2};
  const highPair=ranks.some(r=>r>=11&&ranks.filter(n=>n===r).length===2);return highPair?{name:'Валети або вище',mult:1}:{name:'Без виграшної комбінації',mult:0};
}
export type CheckerMove={from:number;to:number;captured?:number};
export function initialCheckers(){return Array.from({length:64},(_,i)=>((Math.floor(i/8)+i%8)%2===1?(i<24?-1:i>=40?1:0):0));}
// English draughts: men move and capture forward; kings move one square in either direction.
export function checkerMoves(board:number[],side:number,only?:number):CheckerMove[]{
  const steps:CheckerMove[]=[],captures:CheckerMove[]=[];
  board.forEach((piece,from)=>{if(Math.sign(piece)!==side||(only!==undefined&&from!==only))return;const row=Math.floor(from/8),col=from%8;
    for(const dr of Math.abs(piece)===2?[-1,1]:[-side])for(const dc of [-1,1]){const r=row+dr,c=col+dc;if(r<0||r>7||c<0||c>7)continue;const next=r*8+c;
      if(!board[next])steps.push({from,to:next});else if(Math.sign(board[next])===-side){const r2=r+dr,c2=c+dc;if(r2>=0&&r2<8&&c2>=0&&c2<8&&!board[r2*8+c2])captures.push({from,to:r2*8+c2,captured:next});}
    }
  });return captures.length?captures:only===undefined?steps:[];
}
export function applyChecker(board:number[],move:CheckerMove){const next=[...board];let piece=next[move.from];next[move.from]=0;if(move.captured!==undefined)next[move.captured]=0;const promoted=Math.abs(piece)===1&&((piece>0&&move.to<8)||(piece<0&&move.to>=56));if(promoted)piece*=2;next[move.to]=piece;return {board:next,promoted};}
