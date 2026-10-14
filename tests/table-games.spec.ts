import {test,expect} from '@playwright/test';
import {pokerResult,initialCheckers,checkerMoves,applyChecker} from '../src/table-games';
import {Chess} from 'chess.js';

test('poker ranks distinguish royal, low ace straight, pairs and full house',()=>{
  const hand=(ranks:number[],suits=['♠','♥','♦','♣','♠'])=>ranks.map((rank,i)=>({rank,suit:suits[i]}));
  expect(pokerResult(hand([10,11,12,13,14],Array(5).fill('♠'))).mult).toBe(250);
  expect(pokerResult(hand([14,2,3,4,5])).mult).toBe(4);
  expect(pokerResult(hand([11,11,3,7,9])).mult).toBe(1);
  expect(pokerResult(hand([10,10,3,7,9])).mult).toBe(0);
  expect(pokerResult(hand([4,4,4,9,9])).mult).toBe(9);
  expect(pokerResult(hand([2,2,2,2,9])).mult).toBe(25);
});
test('checkers enforce capture, chain capture, promotion and king directions',()=>{
  expect(initialCheckers().filter(n=>n===1)).toHaveLength(12);expect(initialCheckers().filter(n=>n===-1)).toHaveLength(12);
  const b=Array(64).fill(0);b[42]=1;b[33]=-1;b[17]=-1;b[46]=1;
  expect(checkerMoves(b,1)).toEqual([{from:42,to:24,captured:33}]);
  const first=applyChecker(b,checkerMoves(b,1)[0]);expect(first.board[33]).toBe(0);
  expect(checkerMoves(first.board,1,24)).toEqual([{from:24,to:10,captured:17}]);
  const p=Array(64).fill(0);p[10]=1;const crowned=applyChecker(p,{from:10,to:1});expect(crowned.promoted).toBe(true);expect(crowned.board[1]).toBe(2);
  const king=Array(64).fill(0);king[35]=2;expect(checkerMoves(king,1)).toHaveLength(4);
});
test('chess rules cover checkmate, stalemate, castling and promotion',()=>{
  const c=new Chess();for(const m of ['f3','e5','g4','Qh4#'])c.move(m);expect(c.isCheckmate()).toBe(true);
  c.load('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');expect(c.isStalemate()).toBe(true);
  c.load('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');expect(c.moves()).toContain('O-O');
  c.load('7k/P7/8/8/8/8/8/7K w - - 0 1');c.move({from:'a7',to:'a8',promotion:'q'});expect(c.get('a8')?.type).toBe('q');
});
test('video poker holds a card and settles one exchange',async({page})=>{
  await page.goto('/');await page.locator('.game-card').filter({hasText:'Відеопокер'}).click();await page.locator('.play-button').click();await expect(page.locator('.poker-card')).toHaveCount(5);
  const first=await page.locator('.poker-card').first().getAttribute('aria-label');await page.locator('.poker-card').first().click();await expect(page.locator('.poker-card').first()).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'docs/screenshots/04-poker.png',fullPage:false});
  await page.getByRole('button',{name:'Обміняти карти (4)',exact:true}).click();await expect(page.locator('.game-message')).not.toBeEmpty();await expect(page.locator('.poker-card').first()).toHaveAttribute('aria-label',first!);await expect(page.locator('.play-button')).toBeVisible();
});
test('chess legal move, bot reply, resignation and board screenshot',async({page})=>{
  await page.goto('/');await page.locator('.game-card').filter({hasText:'Шахи'}).click();await page.locator('.play-button').click();
  await page.getByRole('button',{name:/^e2 /}).click();await expect(page.locator('.legal-target')).toHaveCount(2);await page.getByRole('button',{name:/^e4(?: |$)/}).click();await expect(page.locator('.game-message')).toContainText('Твій хід. Ти граєш білими.');await expect(page.getByRole('button',{name:/^e4(?: |$)/})).toContainText('♙');
  await page.screenshot({path:'docs/screenshots/05-chess.png',fullPage:false});
  await page.getByRole('button',{name:/Здатися/}).click();await expect(page.locator('.game-message')).toContainText('здався');await expect(page.locator('.wallet strong')).toHaveText(/4\s?900/);
});
test('checkers move, bot reply and mobile board',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('.game-card').filter({hasText:'Шашки'}).click();await page.locator('.play-button').click();
  await page.getByRole('button',{name:'Шашки a3',exact:true}).click();await page.getByRole('button',{name:'Шашки b4',exact:true}).click();await expect(page.locator('.game-message')).toContainText('Твій хід. Ти граєш світлими.');await expect(page.getByRole('button',{name:'Шашки b4',exact:true}).locator('.checker')).toHaveCount(1);
  await page.screenshot({path:'docs/screenshots/06-checkers-mobile.png',fullPage:false});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:/Здатися/}).click();await expect(page.locator('.play-button')).toBeVisible();
});
