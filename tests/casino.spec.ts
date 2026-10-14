import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{await page.goto('/');});
test('lobby, topup, persistence, search and history',async({page})=>{
  await expect(page.locator('.game-card')).toHaveCount(11);
  await page.getByRole('button',{name:'Поповнити баланс на 1000 монет'}).click();
  await expect(page.locator('.wallet strong')).toHaveText(/6\s?000/);
  await page.reload();await expect(page.locator('.wallet strong')).toHaveText(/6\s?000/);
  await page.getByRole('button',{name:'Настільні',exact:true}).click();await expect(page.locator('.game-card')).toHaveCount(5);
  await page.getByRole('button',{name:'Усі ігри',exact:true}).click();
  await page.getByRole('textbox',{name:'Пошук ігор'}).fill('кубики');await expect(page.locator('.game-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Історія ігор'}).click();await expect(page.locator('.history-row')).toContainText('Безкоштовне поповнення');
});
test('wheel pays exactly once and prevents repeat spins',async({page})=>{
  const spin=page.getByRole('button',{name:'Крутити безкоштовно'});await spin.click();await expect(page.getByRole('button',{name:'Колесо обертається…'})).toBeDisabled();
  await expect(page.locator('.wheel-result')).toContainText('Твій виграш',{timeout:6000});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lucky-v1')!));expect(saved.history).toHaveLength(1);expect(saved.balance).toBe(5000+saved.history[0].amount);
});
test('all instant games settle and debit once',async({page})=>{
  for(const name of ['Фруктовий джекпот','Рулетка','Щасливі кубики','Орел чи решка','Щаслива сімка']){
    await page.locator('.game-card').filter({hasText:name}).click();
    await page.locator('.play-button').click();await expect(page.locator('.play-button')).toBeDisabled();
    await expect(page.locator('.game-message')).not.toBeEmpty();
    await expect(page.getByRole('button',{name:'Закрити гру'})).toBeEnabled();await page.getByRole('button',{name:'Закрити гру'}).click();
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lucky-v1')!));expect(saved.history.filter((e:any)=>e.amount<0)).toHaveLength(5);
  expect(saved.balance).toBe(5000+saved.history.reduce((a:number,e:any)=>a+e.amount,0));
});
test('blackjack, mines and crash finish rounds',async({page})=>{
  await page.locator('.game-card').filter({hasText:'Блекджек'}).click();await page.locator('.play-button').click();
  await expect.poll(async()=>await page.getByRole('button',{name:'Досить',exact:true}).count()+((await page.locator('.game-message').textContent())?.length?1:0)).toBeGreaterThan(0);
  if(await page.getByRole('button',{name:'Досить',exact:true}).isVisible()){await expect(page.getByRole('button',{name:'Закрити гру'})).toBeDisabled();await page.getByRole('button',{name:'Досить',exact:true}).click();}
  await expect(page.locator('.game-message')).not.toBeEmpty();await page.getByRole('button',{name:'Закрити гру'}).click();
  await page.locator('.game-card').filter({hasText:'Діамантові міни'}).click();await page.locator('.play-button').click();await page.locator('.mine-grid button').first().click();
  await expect(page.locator('.mine-grid button').first()).toHaveText(/[◆✹]/);
  if(await page.locator('.mine-grid button').first().textContent()==='◆')await page.getByRole('button',{name:/Забрати/}).click();
  await expect(page.locator('.game-message')).not.toBeEmpty();await page.getByRole('button',{name:'Закрити гру'}).click();
  await page.evaluate(()=>{crypto.getRandomValues=((a:Uint32Array)=>{a.fill(3865470566);return a;}) as typeof crypto.getRandomValues;});
  await page.locator('.game-card').filter({hasText:'До Місяця'}).click();await page.locator('.play-button').click();await page.getByRole('button',{name:/Забрати/}).click();await expect(page.locator('.game-message')).toContainText('Виграш');
});
test('insufficient funds and invalid input never create negative balance',async({page})=>{
  await page.locator('.game-card').filter({hasText:'Рулетка'}).click();const input=page.getByRole('spinbutton',{name:'Ставка'});await input.fill('10000');await input.blur();await page.locator('.play-button').click();await expect(page.locator('.game-message')).toContainText('Недостатньо');
  await input.fill('-50');await input.blur();await expect(input).toHaveValue('10');await expect(page.locator('.wallet strong')).toHaveText(/5\s?000/);
});
test('screenshots, mobile layout and no runtime errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'docs/screenshots/01-lobby-desktop.png',fullPage:true});
  await page.locator('.game-card').filter({hasText:'Блекджек'}).click();await page.locator('.play-button').click();await page.screenshot({path:'docs/screenshots/02-blackjack.png',fullPage:false});
  await page.reload();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/screenshots/03-lobby-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.locator('.game-card')).toHaveCount(11);expect(errors).toEqual([]);
});
